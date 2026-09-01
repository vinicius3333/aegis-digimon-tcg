# BT14 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

This report supersedes `BT14-STATIC-AUDIT.md`, `BT14-AUDIT-LEDGER.md`, the
historical `internal-docs/audits/BT14.md`, and the provisional range reports in
`internal-docs/audits/BT14/`. The earlier files remain as historical review
notes.

## Scope and score

- Catalog scope: exactly `BT14-001` through `BT14-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one matching
  `registerIrCard("BT14-NNN", compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and
  delivery gates are each worth 2 points. Every card earned 2/2 in every
  component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT14/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT14/<card-id>.ts`, and a persisted-equality assertion in
`BT14-catalog-sync.test.ts`.

| Cards             | Focused evidence                                                                                                               | Final score |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| BT14-001–BT14-010 | Security direction, inclusive source comparisons, recovery, suspension provenance, exact costs, and legal inherited stacks     | 10/10 each  |
| BT14-011–BT14-020 | Blocker, alternate evolution, end-turn attacks, ACE paths, Raid, token restrictions, replacement, and bottom-deck ordering     | 10/10 each  |
| BT14-021–BT14-030 | Evade, pooled source costs, re-evaluated targets, Blast Digivolve, battle protection, inclusive errata, and recovery           | 10/10 each  |
| BT14-031–BT14-040 | Inherited attack effects, Security transfer, turn-machine evolution, Barrier, placement costs, Armor Purge, and Tamer play     | 10/10 each  |
| BT14-041–BT14-050 | Recovery origins, suspension costs, phase auras, play-cost reduction, restrictions, attack evolution, Counter, and Overflow    | 10/10 each  |
| BT14-051–BT14-060 | Opponent-end timing, event subjects, mandatory attacks, leave prevention, Save, Rush, Blocker, Retaliation, and replacement    | 10/10 each  |
| BT14-061–BT14-070 | Return costs, effect immunity, reveal/play routing, De-Digivolve, inherited deletion causes, and exact trash origins           | 10/10 each  |
| BT14-071–BT14-080 | Tamer placement, return-then-trash, attack costs, battle deletion, dual-deck mill, scaling, and inherited frequency            | 10/10 each  |
| BT14-081–BT14-090 | Play-cost scaling, security watchers, source discard, Mind Link, breeding movement, Security self-play, and compound placement | 10/10 each  |
| BT14-091–BT14-100 | Pooled source trash, snapshot targeting, Security evolution, modal effects, granted watchers, and cross-kind budgets           | 10/10 each  |
| BT14-101–BT14-102 | Conditional hand evolution, Raid, attack keywords, modal deletion, self placement, hatch, and inherited Security               | 10/10 each  |

## Corrections completed in this pass

- BT14-046 now encodes the printed “from your hand” restriction for its green
  Tamer play-cost reduction. Paid effect plays carry their origin zone into
  reducer matching, and affordability projection no longer pays structured
  costs, suspends permanents, or consumes the reducer before real payment.
  Natural tests cover manual hand play, paid effect play from hand, and the
  negative paid effect play from trash.
- BT14-090 now pays both mandatory placement costs before the optional evolution,
  matching Q2466. The first placement binds its Agumon host; the second placement
  and optional WarGreymon evolution reuse that same host. A two-Agumon scenario
  proves the materials and evolution cannot split across hosts.
- BT14-013 and BT14-064 gained natural public end-turn and When Digivolving
  evidence. BT14-064 also waits for nested reveal resolution and proves its own
  bottom-deck ordering without relying on a nested On Play side effect.
- BT14-072, BT14-075, BT14-077, BT14-078, BT14-079, BT14-084, and BT14-086 gained
  natural attack, battle-deletion, draw-before-mill, scaling, level-boundary, and
  Security self-play evidence for clauses that were previously structural.
- The persisted contract now derives BT14 IDs from committed `cards.json`, checks
  the exact ID registered by every module, and rejects missing or flag-like
  `--base` values in the synchronization CLI.
- The synchronized-array test helpers accept the iterable contract exposed by
  `ArraySchema`, restoring workspace typechecks without changing runtime behavior.
- The persisted effects catalog is recalculated from executable modules through
  `pnpm effects:sync:set -- --set BT14`; `pnpm effects:check:set -- --set BT14`
  verifies drift, and adding `--base origin/main` proves semantic scope. Exactly
  57 BT14 records changed semantically and zero records outside BT14 changed.

## Executed gates

- Corrected-card and added-evidence suites: 11 files, 56 tests passed.
- Persisted catalog contract: 105 tests passed.
- BT14 collection: 103 files, 537 tests passed, one worker, no file parallelism.
- Core mechanisms: 11 files, 700 tests passed, one worker, no file parallelism.
- Synchronized-array regression suite: 2 files, 7 tests passed.
- Synchronization-tool unit suite: 5 tests passed.
- Shared and API builds passed inside the bounded synchronization checks.
- Workspace typechecks passed serially with an explicit 300-second limit.
- Oxlint and Oxfmt checks passed on the changed source, tool, and documentation
  files. The generated JSON passed syntax, persisted equality, and scoped
  semantic-diff checks.
- `git diff --check` passed.
- Persisted semantic diff: 57 changed records, all 57 within BT14, zero outside
  the audited set.

All Vitest commands used explicit timeouts, `--maxWorkers=1`, and
`--no-file-parallelism`. Build, synchronization, formatting, and typecheck
commands also used explicit limits; workspace typechecks ran with concurrency 1.
