# BT14 Card Audit Ledger

This ledger records only completed, reproducible per-card review work. `Pending` means
the card has not yet received the full catalog/KB/IR/primitive/peer/stack audit required
to award a score.

| Card | Status | Evidence | Score |
| --- | --- | --- | --- |
| BT14-001 Koromon | Audited | Catalog; `kb query` (no entries); IR/`whenSecurityRemoved` primitive and stack test; focused test passed (3/3). | 10/10 |
| BT14-002 Bukamon | Audited | Catalog; KB errata + Q6004; corrected `gte` IR condition, opponent comparison primitive, peer/stack test; focused test passed (4/4). | 10/10 |
| BT14-003 Tokomon | In review | Catalog; `kb query` (no entries); IR and recovery/stack test inspected. Focused test was started, but its completion result was not captured because the shared test host was saturated. | — |
| BT14-004 Tanemon | In review | Catalog; `kb query` (no entries); IR and suspension/stack test inspected. | — |
| BT14-005 Missimon | In review | Catalog; `kb query` (no entries); IR and trait-cost/stack test inspected. Focused test was started, but its completion result was not captured because the shared test host was saturated. | — |
| BT14-006 Bowmon | In review | Catalog; KB Q2370–Q2372; IR and paid, requirement-respecting evolution tests inspected. | — |

## Remaining queue

BT14-003 through BT14-102 require full verification before a collection-complete claim.
