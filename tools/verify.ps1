[CmdletBinding()]
param(
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$originalNodeOptions = $env:NODE_OPTIONS
$originalDatabaseUrl = $env:DATABASE_URL
$originalTestDatabaseUrl = $env:TEST_DATABASE_URL
$originalResetPermission = $env:EVENTAPP_ALLOW_TEST_DB_RESET
$originalLocation = Get-Location
$verificationFailed = $false

function Restore-Environment {
    $env:NODE_OPTIONS = $originalNodeOptions
    $env:DATABASE_URL = $originalDatabaseUrl
    $env:TEST_DATABASE_URL = $originalTestDatabaseUrl
    $env:EVENTAPP_ALLOW_TEST_DB_RESET = $originalResetPermission
}

try {
    if (-not $FrontendOnly) {
        Set-Location $repositoryRoot
        docker compose --profile test up -d test-db
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Desktop must be running to start the disposable test database."
        }
        for ($attempt = 1; $attempt -le 30; $attempt++) {
            docker compose --profile test exec -T test-db pg_isready -U eventapp_test -d eventapp_test
            if ($LASTEXITCODE -eq 0) { break }
            if ($attempt -eq 30) { throw "The disposable test database did not become ready." }
            Start-Sleep -Seconds 1
        }

        $env:DATABASE_URL = "postgresql+psycopg://eventapp:eventapp@127.0.0.1:5432/eventapp"
        $env:TEST_DATABASE_URL = "postgresql+psycopg://eventapp_test:eventapp_test@127.0.0.1:5433/eventapp_test"
        $env:EVENTAPP_ALLOW_TEST_DB_RESET = "true"
        Push-Location (Join-Path $repositoryRoot "backend")
        try {
            uv run pytest
            if ($LASTEXITCODE -ne 0) { $verificationFailed = $true }
        } finally { Pop-Location }
    }

    # Node 26's host storage is experimental; jsdom owns browser storage here.
    $supportsStorageFlag = & node -p "process.allowedNodeEnvironmentFlags.has('--no-experimental-webstorage')"
    if ($LASTEXITCODE -ne 0) { throw "Node.js could not be started." }
    if ($supportsStorageFlag -eq 'true') {
        $env:NODE_OPTIONS = "$originalNodeOptions --no-experimental-webstorage".Trim()
    }
    Push-Location (Join-Path $repositoryRoot "frontend")
    try {
        npm test
        if ($LASTEXITCODE -ne 0) { $verificationFailed = $true }
        npm run build
        if ($LASTEXITCODE -ne 0) { $verificationFailed = $true }
    } finally { Pop-Location }
} finally {
    Restore-Environment
    Set-Location $originalLocation
}
if ($verificationFailed) { throw "Verification failed. Review the backend, frontend and build results above." }
Write-Host "All verification stages passed."
