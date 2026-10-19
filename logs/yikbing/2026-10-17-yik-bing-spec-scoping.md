# Story-level specification scoping review

- Date: 2026-10-17, Asia/Singapore. Owner: Yik Bing.
- Source: visible user question, Git output, current SDD files at 4642b67, and read-only analyst handoff.
- AI factual check: checked against those sources. Human verification: Pending.

## Prompts and actions

The user relayed a groupmate's question about consistent specification abstraction and whether a merchandise-wishlist user story can become a specification. They requested the latest default branch and a repository-grounded assessment, not specification implementation.

Fetched origin; confirmed the default is master and PR #1 is merged. With a clean checkout, created/switched to local master tracking origin/master at 4642b67. Read the feature template, F01 draft, workflow guidance, project story definitions and coverage map. No product specifications were changed.

Delegated read-only specification analysis to /root/specification_smoke using the existing role instructions. It recommended story-level specifications for bounded outcomes, retaining F02 as a parent group and existing story IDs, without a rigid one-story-one-file rule. It noted that F01 intentionally spans a first end-to-end journey and the wishlist is stretch scope.

## Recommendation and limits

A story is a useful starting unit, but requires acceptance criteria, permissions, validation, dependencies, exclusions, decisions, and evidence to become an implementation-ready spec. Compare user outcomes rather than document length, frontend/backend layers, or equal effort. Suggested wishlist name is track-merchandise-wishlist, not waitlist. Manual items, quantities, estimated prices and totals match F02-US03; exact currency, bounds, duplicates and lifecycle policies remain to be decided.

No application tests were needed or run for this read-only assessment. Only this local session log was added; no spec reorganization, commit, push or new PR was performed. Human approval of the proposed convention and wishlist scope remains outstanding.
