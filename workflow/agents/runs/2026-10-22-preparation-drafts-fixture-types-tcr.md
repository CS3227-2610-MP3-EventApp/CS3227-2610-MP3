# Test baseline change request DRAFTS-TCR-03
- Requester: root, 2026-10-22; generate-preparation-drafts r3.
- Baseline: 77cbabb87dce90bb5aac3e0f43efe55bfee5229f; frontend/tests/preparation-drafts.test.tsx.
- Reproduction: npm.cmd run build; TS2322 at lines74/75: inferred null-only dueDate/quotationBasis and nonnullable price conflict with valid adoption fixture values.
- Cause: test fixture TypeScript inference; independent of application implementation. Adoption must accept nullable dates/prices/bases.
- Correction: one explicit manual fixture type annotation using existing independent Task/Line types; no assertions, fixture values, expected outputs or behavior changed.
- Isaac explicitly approved type annotations only in this conversation. Root applied that exact bounded correction as explicitly requested; no subagent used. Independent test-owner/verifier assessment remains pending; this is not a newly approved baseline.
- No replacement commit created because user requires staging without commits. Preserve original baseline and evaluate this single authorized delta separately. Independent reviewer must inspect before baseline reissue/completion.
