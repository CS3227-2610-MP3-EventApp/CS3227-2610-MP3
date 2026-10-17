# EventApp developer guide

## Shared development agents

Capability specifications live under root `specs/`. Read the [spec definition, standard and index](../specs/README.md); draft from [the canonical template](../specs/TEMPLATE.md). Both draft and finalized specs stay there, with approval and evidence recorded in the document. Project planning, security and architecture live under docs/; [workflow/](../workflow/README.md) contains the development process.

Invoke `$draft-spec` to create a new capability spec from a story or refine an existing Draft. The [repository skill](../.agents/skills/draft-spec/SKILL.md) stops with a Draft and human questions; it does not audit finalized specs, verify implementation or synchronize specs with code. For example: `Use $draft-spec to refine specs/programme/create-and-publish-programme.md and surface its blocking product decisions.`

Open the repository root in Codex and follow [AGENTS.md](../AGENTS.md). All teammates use [the same six roles and workflow](../workflow/agents/README.md); assignments differ by story, approved scope, and file ownership. Start a new session after fetching configuration changes and verify actual role discovery/delegation. Do not mistake role files for evidence that agents ran.

Start with [the canonical story catalogue](UserStoriesAndFeatures.md) and the ordered roadmap in [project context](project.md), then read [security rules](security.md), [schema/contracts](architecture.md) and the relevant scoped specification. Product-role columns describe users; implementation and review responsibilities are assigned per task. Resolve blockers before dependent development. Use independently reviewed test cases and the approved immutable baseline; developers cannot weaken them. See the workflow for dispute handling and baseline checks.

## Evidence and assignment logs

Maintain [logs/](../logs/README.md) for summaries of all development prompts/interactions, including corrections, delegated work, checks and limitations. AI drafts are fact-checked against available evidence and then verified by their human owner. Pending human verification stays explicit. Historical backfills do not claim unavailable conversations.

## Current implementation status

The repository contains planning and coordination setup. Application startup, application tests, database migration, and deployment commands remain to be documented when implemented. Do not use workflow validation as evidence that product requirements are implemented.

## Delivery evidence to maintain

As tooling is implemented, document actual local setup/start/test commands, required environment-variable names without secret values, empty-database and existing-data migration commands, deployment/recovery steps and the online application URL. Keep development and production databases, credentials and configuration separate; production model/database credentials stay server-side. Record client-bundle/log secret checks and deployed synthetic smoke journeys for all three workspaces, including each role's real LLM integration and manual fallback. Link revision-specific security and multi-agent evidence to the release gates in project context; do not invent commands or successful deployments.
