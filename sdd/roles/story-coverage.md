# Converge story coverage by developer

This map checks that each developer guide includes the full stories for its delivery features, including supporting assignments outside the person's primary user role. Story wording and allocation authority remain in [project.md](../project.md). Priorities are proposed delivery scope, not approved course requirements.

Y = [Yik Bing](yik-bing-attendee.md), D = [Dylan](dylan-organiser.md), I = [Isaac](isaac-business.md). Names in delivery context identify guides containing the full story, not individual implementation ownership. Agree on bounded tasks in each feature plan. Suggested reviewers must not implement the reviewed change.

| Story ID | User outcome | Proposed priority | Delivery context in guides | Suggested independent review |
| --- | --- | --- | --- | --- |
| F01-US01 | Create venues, rooms and programme drafts | MVP; criteria expansion pending | Y, D | I |
| F01-US02 | Publish valid programme items | MVP | Y, D | I |
| F01-US03 | Browse and search published programmes | MVP; filters criteria pending | Y, D | I |
| F02-US01 | Bookmarks and personal itinerary | MVP | Y, I | D |
| F02-US02 | Personal constraints and preferences | MVP | Y, I | D |
| F02-US03 | Merchandise wishlist | Stretch | Y, I | D |
| F03-US01 | Validated AI itinerary draft | MVP | Y, D | I |
| F03-US02 | Grounded programme answers | MVP | Y, D | I |
| F03-US03 | Replan after cancellations | MVP after F05 | Y, D | I |
| F03-US04 | Explicit-attendance recap | Stretch | Y, D | I |
| F04-US01 | Explicit submission decisions | MVP; submitter scope pending | D, I | Y |
| F04-US02 | Versioned AI submission analysis | MVP | D, I | Y |
| F04-US03 | Deterministic programme conflicts | MVP; F01 publication policy pending | D, I | Y |
| F04-US04 | Coverage and accessibility checklist | Stretch | D, I | Y |
| F05-US01 | Programme updates and announcements | MVP | Y, D, I | Assign per change |
| F05-US02 | Accepted-itinerary notifications | MVP | Y, D, I | Assign per change |
| F05-US03 | AI disruption announcement draft | MVP | Y, D, I | Assign per change |
| F06-US01 | Business application draft and submission | MVP | D, I | Y |
| F06-US02 | Status, booth and setup details | MVP; assignment contract pending | D, I | Y |
| F06-US03 | Preparation checklist and budget | MVP | D, I | Y |
| F06-US04 | AI preparation draft | MVP | D, I | Y |
| F07-US01 | Group dining options | Stretch | Y, I | D |
| F07-US02 | Sourced route estimates | Stretch | Y, I | D |
| F08-US01 | Sourced venue comparison | Stretch | D, I | Y |
| F08-US02 | Approved quotation email | Stretch | D, I | Y |
| F09-US01 | Promotional copy and concepts | Stretch | Y, I | D |
| F09-US02 | Supplier comparisons | Stretch | Y, I | D |
| F09-US03 | Quotation/purchase proposal | Stretch; real commerce deferred | Y, I | D |
| F10-US01 | Identity and server permissions | MVP foundation | Y, D, I | Assign per change |
| F10-US02 | Protected and bounded AI jobs | MVP as AI features begin | Y, D, I | Assign per change |
| F10-US03 | Exact-action approvals/execution | When F08/F09 needs it | Y, D, I | Assign per change |

Isaac's F05 contribution is shared contract/integration work, not a new business-facing disruption view. F10 includes later action context for all three; the whole action subsystem is not required before manual F01/F02/F06 work.

## Coverage check and maintenance

Expected canonical stories: 31. Expected full-story extracts: Yik Bing 21, Dylan 23, Isaac 24. Repetition across guides is intentional shared feature context. Repetition of a feature number within one guide reflects distinct user stories or cross-references, not new feature assignments.

Check each extract's complete wording against project.md and ensure the delivery-feature sets match its collaboration table. Check cross-feature handoffs against schema-and-parallel-plan.md, rule references against security.md and readiness against the feature specifications. A guide being complete does not make an unapproved feature Ready. Only F01 currently has a dedicated draft acceptance-criteria document.

This map and the guides were prepared on 2026-10-15. Document checks do not establish implementation correctness, real integration, migration safety or MP3 rubric compliance.
