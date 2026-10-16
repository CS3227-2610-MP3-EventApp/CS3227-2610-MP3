# EventApp developer guide

## Shared development agents

Open the repository root in Codex and follow [AGENTS.md](../AGENTS.md). All teammates use [the same six roles and workflow](../workflow/agents/README.md); assignments differ by story, approved scope, and file ownership. Start a new session after fetching configuration changes and verify actual role discovery/delegation. Do not mistake role files for evidence that agents ran.

Read [project context](../workflow/sdd/project.md), [security rules](../workflow/sdd/security.md), and the relevant feature specification. Resolve blockers before dependent development. Use independently reviewed test cases and the approved immutable baseline; developers cannot weaken them. See the workflow for dispute handling and baseline checks.

## Evidence and assignment logs

Maintain [logs/](../logs/README.md) for summaries of all development prompts/interactions, including corrections, delegated work, checks and limitations. AI drafts are fact-checked against available evidence and then verified by their human owner. Pending human verification stays explicit. Historical backfills do not claim unavailable conversations.

## Current implementation status

The repository contains planning and coordination setup. Application startup, application tests, database migration, and deployment commands remain to be documented when implemented. Do not use workflow validation as evidence that product requirements are implemented.
