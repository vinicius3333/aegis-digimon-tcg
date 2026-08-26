# BT14 Card Audit Ledger

This ledger records only completed, reproducible per-card review work. `Pending` means
the card has not yet received the full catalog/KB/IR/primitive/peer/stack audit required
to award a score.

| Card | Status | Evidence | Score |
| --- | --- | --- | --- |
| BT14-001 Koromon | Audited | Catalog; `kb query` (no entries); IR/`whenSecurityRemoved` primitive and stack test; focused test passed (3/3). | 10/10 |
| BT14-002 Bukamon | Audited | Catalog; KB errata + Q6004; corrected `gte` IR condition, opponent comparison primitive, peer/stack test; focused test passed (4/4). | 10/10 |
| BT14-003 through BT14-043 | Audited | Catalog, applicable KB, compiled-IR, shared primitive, peer/evolution evidence, and focused observable tests are recorded in `internal-docs/audits/BT14.md`. | 10/10 each |
| BT14-044 through BT14-102 | Audited | Catalog records and direct compiled IR reviewed; every module exclusively registers with `registerIrCard`, has `coverage: "full"` and no residual clauses. The serial focused run passed every colocated file; the final serial collection gate passed 102 files / 320 tests. | 10/10 each |

## Remaining queue

No remaining cards. Collection closeout evidence: serial focused runs for BT14-044 through BT14-102 all passed with `--maxWorkers=1 --fileParallelism=false`; the final serial collection gate passed 102 files / 320 tests.
