# EventApp reflections

## 1. Context and scope

This reflection is based on the development summaries in [logs/](../logs/README.md), the
specifications in [specs/](../specs/README.md), the security rules in
[docs/security.md](security.md), and the recorded implementation and test evidence in
[workflow/](../workflow/README.md). It reflects the work recorded up to 22 October 2026.
The logs were reviewed and approved by the team on 22 October 2026.

The project used React, FastAPI, PostgreSQL, SoC LLM access through SoCLaaS, and a
specialised-agent workflow. The most developed product areas were authentication, business
applications, organiser programme management, organiser application analysis, attendee
programme browsing/planning, and organiser disruption announcements. The product website is
deployed through GitHub Pages, and the application is now hosted at
[eventapp-ws7v.onrender.com](https://eventapp-ws7v.onrender.com/). Some planned attendee and
business AI capabilities, full production environment separation, and complete deployed
cross-role verification remain release work rather than being claimed as complete.

## 2. AI security

### Attack surfaces considered

The project has several AI attack surfaces:

1. Submitted application descriptions and other user-controlled text can contain prompt
   injection instructions.
2. Programme-change facts supplied to announcement drafting are data, not instructions.
3. Model output can fabricate IDs, revisions, times, venues, prices, capacity, evidence
   quotes, or publication decisions.
4. A provider response can be malformed, truncated, wrapped in unexpected formatting, or
   contain tool-call fields.
5. A job can become stale, be cancelled, outlive a permission change, or be replayed after
   its source record changes.
6. Provider credentials, private application data, and job content can leak through request
   bodies, logs, frontend code, or error messages.
7. The development process itself can receive malicious or misleading instructions through
   repository content, agent handoffs, generated output, or an incorrect test expectation.

### Controls implemented

The AI features were deliberately narrow. The organiser application-analysis model receives
permission-filtered frozen submissions and criteria, not arbitrary database access or tools.
The announcement model receives immutable programme-change facts and selects only bounded
editorial choices. The server renders the factual announcement body itself; the model does
not write or publish arbitrary text.

The main controls are:

- SoCLaaS is the only configured provider destination.
- API keys remain server-side and are not sent to the frontend or written to logs.
- AI use is restricted to explicitly enabled, synthetic-data event IDs in the current
  implementation.
- Jobs have ownership checks, event-membership checks, deadlines, cancellation, daily
  limits, provider-rate limits, and recovery states.
- Model responses are parsed against strict Pydantic schemas.
- Application-analysis evidence quotes must be exact substrings of the permitted source.
- Duplicate flags must reference permitted comparison sources.
- Announcement `changeId` and `sourceRevision` must match the current authoritative change.
- AI output creates a private draft only. It cannot publish announcements, make application
  decisions, send notifications, spend money, or replace an accepted user record.
- Publication still requires a human organiser to review the exact text and approve it.
- Provider failures leave manual workflows available and do not silently create a successful
  result.

These controls were tested with malformed JSON, extra fields, fabricated evidence, stale
revisions, cancellation races, revocation races, quota limits, provider failures, and
recovery cases. One particularly useful real failure occurred during manual announcement
testing: the provider returned valid JSON but copied predecessor revision `3` instead of the
current revision `4`. The backend correctly rejected it as `invalid_output`. We then made the
required current revision explicit in the prompt and added a regression test. This showed why
valid JSON is not sufficient: AI output must also be grounded in the current server facts.

**Isaac on security versus useful uncertainty.** Supplier research taught me that stricter
validation can make an AI feature less useful without resolving its underlying uncertainty.
Review repeatedly found delivery statements attributed to the wrong product through
parentheses, slashes and other qualifiers. Adding delimiter rules caught those examples,
but could not establish general semantic understanding. My more useful product decision
was to allow source-backed supplier/product listings with unknown prices or delivery, and
reject defective offers individually. Forged source IDs and malformed output still failed
the whole extraction. The lesson was to specify which uncertainty users can safely see,
and which failures invalidate trust in the result. After the approved changes, the log
records 9 successful live runs out of 12; this small sample supports practical improvement,
not a reliability guarantee. [Sources: grounding review](../logs/isaac/2026-10-23-f09-phase2-delivery-grounding-review.md)
and [approved revisions and live results](../logs/isaac/2026-10-23-f09-phase2-completion-and-handoff.md).

### Limits and human oversight

AI requests are bounded by input size, output size, timeouts, daily quotas, active-job limits,
provider requests-per-minute limits, and a 180-second job deadline. The worker records
whether a provider may have run so that cancellation does not falsely claim that no provider
usage occurred.

Human approval is intentionally placed after generation and before publication or any
business decision. AI application analysis is a review aid, not an automatic accept/reject
mechanism. AI announcement drafting produces a private draft, while preview expiry, source
freshness, exact-text approval, and immutable publication are enforced by the server.

The remaining limitation is that local synthetic-data and provider checks do not prove
production readiness. The application now has a hosted entry point, but production real-data
processing, deployed provider configuration, online isolation, and a full production
cross-role smoke test still require team verification.

**Isaac on approval when an outcome is uncertain.** A procurement specification needs to
explain what happens when the user clicks Execute but never receives a response. A timeout
does not establish that nothing happened. For the sandbox procurement UI, I chose no
automatic execute retry and a minimal cross-tab/reload marker containing identifiers only.
Approval also binds the exact server-derived proposal revision and payload; changed
quotation text needs a new revision and approval. This made me see approval as a lifecycle
contract covering edits, interrupted requests and recovery, rather than simply a confirmation
button. The recorded scope was simulation: it does not establish safe real purchasing or
payment execution. [Source: procurement decisions and handoff](../logs/isaac/2026-10-23-f09-us03-start-and-tcr-correction.md).

## 3. Spec-Driven Development

### What a useful specification made clear

A specification was most useful when it stated:

- the user and authorised role;
- the exact request and response fields;
- revision and freshness rules;
- what is mutable and what becomes immutable;
- error and failure outcomes;
- privacy and visibility boundaries;
- server-enforced constraints;
- acceptance and adverse scenarios;
- ownership and integration boundaries;
- what the AI may propose and what it must never do.

For example, the programme specification states that an activity must satisfy
`event.startsAt <= startsAt < endsAt <= event.endsAt`, that same-room overlap is allowed,
and that published snapshots preserve venue and room facts. That precision was more useful
than a general requirement such as “organisers can manage activities.”

### How specifications helped

The specifications and protected tests gave the team a shared contract during merges. They
helped preserve:

- both F02 attendee-planning and F05 organiser-disruption routes;
- immutable change history;
- current-only attendee reads;
- role and event-membership enforcement;
- the distinction between private drafts and published announcements;
- the forward-only F02 migration boundary;
- the requirement that generated OpenAPI and frontend types be regenerated rather than
  hand-merged.

When the migration graph acquired two legitimate parents after the F02 merge, the failing
tests exposed an outdated “single linear predecessor” assumption. The team documented the
test-change request, selected a supported rollback point, updated the expected branch
revisions, and reran the migration and full backend suite. This was a concrete example of a
requirement/test contract needing to evolve with an approved architecture change.

**Yik Bing's account of the migration test.** After merging my F02 branch with the organiser AI
work, CI failed because a protected test assumed the Alembic head had one parent. My first
response was to avoid editing the test: I instructed the orchestrator to skip the full workflow,
stopped the test-owner agent before it changed anything, and added a no-op migration so the graph
had a single head again (`6023e2a`). I judged this proportionate because the cause was
understood, the change was small and no product behaviour was involved. The cost was that the
test no longer exercised a downgrade of real schema changes, which I accepted because F02
rollback is intentionally unsupported. A teammate later updated the test itself (`e78ba84`), so
the final resolution combined a source-side fix with a test change.

**Yik Bing on approved test changes.** The rule that the developer must not edit protected tests
held, but tests still changed three times in my own work, and each time through a controlled
route. An old prototype test expected all attendee actions to be disabled, and a behaviour
reviewer assessed it before the test owner corrected it. F02 received a replacement protected
baseline instead of in-place edits. For the silent session re-check, the spec decision was
recorded first, a verifier reviewed the proposal, and the test owner rewrote four protected tests
and added six under `SILENT-TCR-01`. What made these changes safe was the order: decision,
independent review, then test edit by the owner, never an edit by the implementer.

### How tests showed intent

The strongest tests were not just schema checks. They exercised:

- concurrent stale edits and authority revocation;
- cancellation between AI worker steps;
- private draft ownership;
- exact evidence grounding;
- persistence after restart;
- migration preservation of existing records;
- immutable published announcement text;
- current versus predecessor programme revisions;
- generated API shape and frontend behaviour.

Independent review also found a real authority-revocation race and a history-pagination
problem. The team added regression coverage instead of weakening the tests. Conversely, one
reported published-announcement edit vulnerability was checked against the existing shared
draft-state guard and withdrawn when it was disproved. This was a useful reminder that a
review finding must be reproduced against the actual code before changing the product.

**Isaac on testing the tests before trusting a baseline.** The first procurement UI suite
reported 143 failures and three passes before the feature existed. Independent reviewers
found that the three role checks passed vacuously, and that some other assertions could pass
without loading a proposal. Even a large red suite therefore did not establish that every
scenario would detect its intended defect. I would ask the test designer to state the
precondition each assertion reaches and the wrong behaviour it distinguishes. Protecting a
baseline is valuable only after reviewing whether its assertions discriminate between a
working feature and an absent or broken one. [Source: pre-implementation test review](../logs/isaac/2026-10-23-f09-us03-start-and-tcr-correction.md).

### Where SDD was excessive

My main criticism is that the SDD process was disproportionate for a small project completed
over a few weeks. The project required multiple specification revisions, approval states,
separate plan and task artifacts, protected-baseline procedures, test-change requests,
quality gates, run records, handoff records, session logs, and repeated traceability updates.
For a large or long-lived system, these controls could protect against drift and make work
auditable. For this project, they often duplicated information that was already visible in
the code, tests, and recent conversation.

In my experience on this project, current AI models generally retained enough repository
context for short feature tasks. The context problems that occurred were usually minor and
could have been corrected with a focused specification, a small acceptance-test list, and
human review. The full process therefore introduced substantial overhead:

- more tokens were spent explaining process rather than implementing or testing behaviour;
- development took longer because small changes needed multiple formal handoffs;
- generated records and revisions had to be synchronised with implementation changes;
- the team spent time maintaining workflow evidence while product work was still incomplete;
- context windows and usage quotas became a practical constraint.

The team also experienced a sudden reported reduction in its monthly AI allowance from
approximately 2500 to 700 on 22 October. I have not independently verified the provider
account change, so this reflection records it as a team-reported operational impact rather
than an established platform fact. Regardless of the cause, the project's extensive
multi-agent and SDD conversations consumed enough tokens that the team experienced
insufficient remaining capacity. This made the process itself compete with implementation,
testing, and deployment work.

**Yik Bing's workflow adjustment.** In response, I reduced the workflow for my own work rather
than for the team. I replaced up to six role agents with two subagents: one test designer and one behaviour verifier, with security
checked through an explicit checklist in the behaviour review instead of a dedicated pass. I
kept the parts I judged most valuable: tests written independently of the implementation, a
protected baseline, and an independent review of a frozen snapshot. The trade-off is that
security received less dedicated attention, so I recorded this limitation in my session log and
did not claim a separate security review. This was a personal adjustment agreed locally, not a
change to the team's process, and I have not measured its cost saving. It did make the
proportionality argument concrete: I kept the safeguards that independently caught errors and
dropped the ceremony around them.

My conclusion is not that SDD has no value. It is that SDD should be proportional to risk and
project size. For a short three-person student project, I would use:

1. one concise capability specification per feature;
2. a short decision log for unresolved product choices;
3. acceptance tests written before implementation;
4. one independent security/behaviour review for high-risk features;
5. a lightweight implementation and evidence summary.

I would reserve full revision histories, multi-stage gates, extensive handoff artifacts, and
large protected-baseline procedures for shared infrastructure, security-sensitive changes,
complex migrations, or longer-lived products. This would preserve the benefits of explicit
contracts without making process overhead the dominant cost.

## 4. Basic Multi-Agent Software Engineering

### Specialised roles that helped

The project defined orchestrator, specification analyst, test-case designer, developer,
behaviour verifier, and security reviewer roles. This division was useful when the task had
real independent concerns:

- the specification analyst clarified stories, contracts, and unresolved decisions;
- the test designer created acceptance cases before implementation;
- the developer implemented within owned files;
- the behaviour verifier checked observable workflows and regressions;
- the security reviewer checked authorisation, privacy, AI grounding, and approval limits;
- the orchestrator integrated changes and preserved shared contracts.

Examples from the logs include independent review of the F05 disruption workflow, test-owner
coverage for authority revocation and history pagination, security review of AI boundaries,
and merge review preserving both F02 and F05 routes.

**Isaac on the limits of parallel agent work.** During merge verification, four stale test
processes competed over one resettable database, producing deadlocks, unexpected records
and missing tables. Assigning different files to agents had not isolated their shared
execution resource. The useful distinction is between parallel reasoning and parallel
mutation: reviewers can inspect the same frozen change concurrently, but database-reset
suites need exclusive ownership or separate databases. A handoff should therefore include
running process IDs, database ownership and cleanup state alongside code and spec revisions.
Otherwise, more agents can reduce the credibility of the test evidence they produce.
[Source: merge execution failures and recovery](../logs/isaac/2026-10-21-merge-conversation.md).

### Handoffs and evidence

A useful handoff included the specification revision, permitted files, dependencies, expected
tests, known limitations, and actual command results. The best evidence was a small run record
linking requirements to tests and recording failures rather than only claiming success.
Protected test ownership also made it harder for an implementer to remove an inconvenient
assertion.

However, the process was not perfect. An analyst initially drifted on route and criterion
meanings, a developer became unavailable, and some reviewers produced findings that required
reproduction before acceptance. The orchestrator had to correct and integrate work directly.
The migration merge and F02/F05 integration also showed that separate agents can each be
locally correct while their assumptions about shared revision history conflict.

**Isaac on reviewing the reviewer's evidence.** In the external-action phase, a behaviour
reviewer reported a migration downgrade/upgrade roundtrip, but inspection showed the helper
always ran upgrade. Calling it with an older target had not performed the claimed downgrade.
The reviewer withdrew the claim; the corrected explicit procedure remained unexecuted at
that checkpoint. This exposed a different failure from an implementation bug: independent
agents can supply convincing evidence descriptions with misunderstood tool semantics.
Future handoffs should retain the actual procedure and assert the intermediate state,
such as the database revision after downgrade, so a person can verify what happened.
[Source: migration evidence correction](../logs/isaac/2026-10-23-f09-phase3-approval-contract.md).

### Where errors or malicious instructions could enter

An incorrect requirement could enter through an analyst's interpretation. A developer could
misread a draft requirement as permission to change a protected test. A reviewer could trust
an AI-generated report or repository instruction without checking the source. User-submitted
application text could attempt to redirect an analysis model. Generated OpenAPI or migration
files could conceal an incompatible contract if they were hand-edited.

The project reduced these risks through file ownership, explicit source-of-truth rules,
independent reviewers, protected tests, strict model validation, server-side authorisation,
and human approval before external effects. The controls did not remove the need for a human: the logs record the successful GitHub Pages
deployment and hosted application URL, while still separating those facts from unresolved
production integration and verification gates rather than presenting local evidence as a
production guarantee.

## 5. Overall lessons and next steps

The most valuable lesson was that AI safety and process safety both depend on independent
verification. A model can return valid JSON with the wrong revision; an agent can produce a
plausible specification with the wrong route; a test can pass while an integration boundary
is still incomplete. Grounding, protected tests, focused reviews, and human approval caught
several of these issues.

**Yik Bing on human judgment.** The process supplied gates, but I still chose when to scale it
back. I stopped further AI testing to save credits and tested by hand instead, and I skipped the
full workflow for the migration fix because the cause was understood and the change was small.
These choices worked because I understood each problem and its risks, and I recorded the
trade-offs in my session log rather than claiming the checks had been done. I would be wary of
using the same shortcuts when the cause was unclear or the risk was higher.

The most important process improvement would be proportionality. For a similar short project,
I would agree the security boundaries and acceptance tests early, use a compact shared
specification, delegate only tasks with genuinely separate context, and spend the saved time
on browser testing, deployment, production separation, and reflection. In this project, the
static product website was deployed first and the application later received a hosted entry
point; that made deployment concrete, but it also showed that a hosted URL is not by itself
evidence that every role, provider, migration and security boundary has been verified online.
The final project should be judged not only by how much process documentation it contains, but
by whether the documentation helped the team deliver a secure, testable, and honestly
described product.
