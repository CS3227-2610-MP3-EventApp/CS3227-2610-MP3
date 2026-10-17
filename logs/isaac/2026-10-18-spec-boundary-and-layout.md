# Specification boundary and capability drafts

- Date/timezone: 2026-10-18, Asia/Singapore. Session owner: Isaac.
- Scope: EventApp specification boundary, approved folder layout and 26 domain Drafts; uncommitted working tree.
- Sources: This visible conversation, repository guidance and catalogue, agent messages and actual checks; unavailable earlier conversations are not reconstructed.
- AI factual check: Checked against the visible requests, repository files, agent handoffs and command results below.
- Human verification: Pending; reviewer/date/corrections not yet supplied.

## Prompts and interactions

The user requested all specs in phase order, with a proposed category structure approved before drafting. The first proposal listed individual story-prefixed filenames. The user requested reasons and actual filenames, then clarified that a spec is a bounded contract of intent, inputs, outputs, constraints and failures, not an implementation plan or automatic one-file-per-story document. The user requested corrections to the standard and template and a revised folder proposal. The user then rejected `ai-job-lifecycle` as an internal-sounding name and requested capability names without story prefixes. After a revised six-folder, 26-file proposal, the user explicitly approved it and asked that this conversation be logged first, all Drafts be written in implementation order, story-to-spec links be updated, and the specs be checked for inconsistencies.

The subsequent cross-role UI request and its Draft are recorded in the [shared UI specification log](2026-10-18-shared-ui-spec.md); together these two entries cover the visible specification-drafting conversation without duplicating each review narrative.

The orchestrator assigned read-only analysis to `spec_boundary_review` (specification analyst). Initial workspace commands failed because the sandbox helper could not start; read-only elevated PowerShell succeeded. The analyst recommended capability names and externally observable contract sections. The orchestrator then assigned `standard_independent_review` (behaviour verifier) to review the documentation diff. That reviewer found a relative-link issue when copying the template into nested folders; the template was corrected. Neither agent reviewed application behaviour.

## Decisions and actions

The user approved the proposed six folders and 26 filenames as a structure, not the product details of future Drafts. Updated `specs/README.md` to define capability-based filenames and IDs, keep story IDs for traceability, preserve legacy F01 revision/criterion IDs, and separate external contracts from implementation plans. Updated `specs/TEMPLATE.md` with product outcome, roles, use cases/UI, inputs/outputs, external data/API shapes, non-functional constraints, security, failure modes and acceptance criteria. Updated the story catalogue's guidance so several stories may map to one cohesive contract. At the time of this log update, the legacy F01 Draft has not yet been moved or revised.

After this first log update, the orchestrator delegated eight shared/programme Drafts to `shared_programme_drafts` (specification analyst) and eight attendee Drafts to `attendee_drafts` (specification analyst), with separate file ownership. The orchestrator wrote ten applications/business/venue Drafts. Together these created the approved 26-file layout in roadmap order. The programme analyst moved the legacy F01 Draft to `specs/programme/create-and-publish-programme.md` as revision 5, preserving revision history and `F01-AC01` through `F01-AC09`; a new criterion covers F04-US03. All documents remain Draft with approval and evidence pending. The orchestrator updated `specs/README.md`, the catalogue story-to-spec links and the stale example in `docs/DeveloperGuide.md`.

`draft_test_scenarios` (test case designer) independently reviewed ten applications/business/venue Drafts and returned scenario gaps. The orchestrator corrected missing venue email generation and fallback, distinguished quotation-request versus purchase-proposal drafts, made concurrent submission/decision outcomes explicit, tightened factual promotional claims and clarified uncertain email retry wording. `security_draft_review` (security reviewer) reviewed all 26 Drafts read-only and identified applicant-safe reason publication, notification commit ordering, uncertain external-send reconciliation and quotation evidence as blocking decisions before Ready. `behaviour_draft_review` (behaviour verifier) reviewed coverage, links and RD consistency read-only; it found a malformed catalogue table row and incomplete F05-US01 announcement traceability, both corrected by the orchestrator. These agents did not edit the files they reviewed.

## Verification and limitations

Ran `git diff --check` successfully after the initial standard/template edits. The independent reviewer found no identifier-policy conflict and raised the link issue, which was addressed. No application tests or implementation checks ran. Human approval of product-specific Drafts remains pending; folder structure approval is recorded in the visible conversation. The initial sandbox helper failure required elevated read-only shell calls; no external action or deployment occurred.

Later checks: `python tools/validate_agent_setup.py` passed the six-role TOML and local Markdown link checks; `git diff --check` passed. A coverage scan found 26 Draft files and 31 unique canonical catalogue story rows, each covered by Draft metadata. The behaviour reviewer found no remaining document inconsistency after the traceability corrections, limited to document text and local link paths. No executable acceptance tests were created because application interfaces, tooling and blocking product decisions remain unresolved. No provider, persistence, security-runtime or deployment behavior was tested. Human correctness verification of this summary is still pending.

## Reflection and next steps

Story IDs are useful coverage references, but they should not determine contract boundaries or filenames. The approved layout made related cross-story contracts visible, including the F05-US01 change-plus-announcement boundary. Resolve the recorded product/contract decisions and review test scenarios independently before any Draft can become Ready or implementation begins.
