# Organiser AI analysis session — 2026-10-21

Human verification: Pending (Dylan).

## Requests and decisions

Dylan requested implementation of the organiser application-analysis plan using SoCLaaS after supplying its access/API/model/quickstart/usage documentation. He requested the cheapest available configured Codex agents at low effort temporarily and explicitly said not to commit those configuration changes. The working branch is `feat/organiser-ai-analysis`, created from current local master `ec63082`.

Dylan confirmed duplicate comparison should include all same-event frozen submitted applications, including accepted/rejected records, and permitted a proposed deterministic similarity cutoff. Root proposed normalized word-set Jaccard >= 0.50 with top-five bounded coverage. This is a text-overlap review signal. Dylan believes synthetic data is acceptable for the real-provider demonstration and asked what it means. Root explained realistic invented applications without real people, contacts or businesses; the provider itself remains real. Lecturer confirmation is not recorded.

Dylan started Docker and instructed continuation. Existing development PostgreSQL is on port 5434; disposable tests use port 5433. Tests never reset the development database.

## Work and corrections

Actual specification, test-design, behaviour-review and security-review agents refined analysis/task r2 Drafts and prepared pre-implementation scenarios. Root documented exact routine API schemas, mechanical quote validation, quotas, cancellation/revocation, retention and retry semantics under the existing implementation authorisation. Separate exact-written-revision human approval is not claimed.

Draft review exposed semantic-grounding overclaims, incomplete JSON contracts, outdated comparison eligibility, dispatch races, synthetic-data gating and provider-wide rate limits. These prompted concrete contract refinements. The agent run record contains actual identities, permitted files and results. No developer can edit the protected test baseline.

## Evidence and limitations

Existing regression baselines passed 217 frontend and 235 backend tests after disposable-schema migration history was restored. The combined implementation run passed 271 backend tests and 225 frontend tests; the production frontend build passed with a large-chunk warning. Final targeted recovery/provider regression results are recorded in the run record.

Implemented versioned event rubrics, durable analysis jobs, a bounded SoCLaaS adapter/doctor, a separate worker, mechanically validated evidence reports, cancellation/history/staleness and organiser UI integration. Independent behaviour/security reviews found and prompted fixes for inconsistent concurrent job reads, transient polling failures, deadline budgeting and dispatch timestamps. The independent test owner strengthened crash-after-dispatch recovery coverage; protected-baseline history is in the run record.

No live provider call, manual browser journey, actual process-restart survival, broad multi-process stress, deployed verification or production readiness is claimed. Production real-data processing remains disabled. Separate written-revision approval, teammate review and human session verification remain pending. Temporary Luna/low agent settings are excluded from commits. No API key appears in this log.

Startup, synthetic test data and manual flows: [AI analysis testing guide](../../docs/AIAnalysisTesting.md).

See the [run record](../../workflow/agents/runs/2026-10-21-organiser-ai-analysis.md), [analysis Draft](../../specs/applications/analyse-applications-with-ai.md) and [job Draft](../../specs/shared/monitor-and-recover-ai-tasks.md).

Agent factual verification: based on visible chat, Git status, delegated messages and command output. Human review pending.

## Manual testing follow-up

Dylan followed the local startup flow. Diagnostics found development PostgreSQL on 5434 rather than 5432, then a historical revision-ID collision: programme tables existed under the revision now assigned to missing business tables. Root inspected schema definitions read-only and supplied a backup-first, targeted stamp/upgrade sequence; execution was performed by Dylan, not independently observed. No database reset was recommended.

Subsequent safe configuration inspection found an empty synthetic-event allowlist and no persisted analysis jobs. After instructions to allowlist the invented-data event and restart API/worker, Dylan reported that analysis works and requested committing relevant files. This is user-reported manual evidence, not an independently observed browser session or proof of every manual scenario. API keys and source content were not printed. Worker idling silently and hashed-password nonrecoverability were explained.

Commit scope excludes ignored `.env`, temporary Luna/low agent settings and later local `.env.example` overrides. The committed template retains disabled defaults, a blank key and an unselected model. No push or merge was requested.
