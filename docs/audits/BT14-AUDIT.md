# BT14 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-01

Typed revalidation date: 2026-09-02

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
  verifies drift, and adding `--base origin/main` proves semantic scope.

## Typed revalidation

- Removed the remaining TypeScript suppressions from 101 direct modules; BT14-077
  was already typed. BT14 now has zero `@ts-nocheck` directives, zero production
  `registerCard` calls, zero `RawUnparsed` actions, and no unsafe casts in its
  production modules.
- Replaced stale generated shapes with supported typed IR: selection references
  now carry concrete targets, target filters include their counts and card kinds,
  recovery omits an invalid controller field, and DP comparisons use the integer
  equivalent supported by the runtime.
- Scoped BT14-020's deletion replacement to Gomamon cards beneath the deleting
  Digimon, with a competing-stack negative test. Scoped BT14-086's Mind Link to
  Digimon so a matching DigiPolice Tamer cannot become a target.
- Added the effect-origin guard to BT14-070, typed BT14-097's original-card-info
  grant, and preserved BT14-088's printed cost rule: an ineligible breeding card
  now aborts before Gennai is suspended.
- Added precise shared IR contracts for the existing `whenDigimonReturnsToHand`
  subtrigger and original-card-info static grant. The public test observer now
  validates and returns typed activatable-effect payloads instead of forcing
  card tests through casts.
- Reconciled an EX11-026 shared regression test left stale by the latest `main`
  merge: its ordinary green level-2 EvoCost is not exposed as an alternate
  digivolution requirement.
- `packages/shared/src/effects/effects.json` was regenerated with the scoped
  synchronization tool; it was not edited manually.

## Executed gates

- Typed/semantic focused cards: 17 files, 90 tests passed.
- Persisted catalog contract: 105 tests passed.
- BT14 collection: 103 files, 540 tests passed, one fork, no file parallelism.
- Core mechanisms: 9 files, 774 tests passed, one fork, no file parallelism.
- Move-permanent regressions: 5 files, 24 tests passed, one fork, no file
  parallelism.
- Shared suite: 8 files, 133 tests passed, one fork, no file parallelism.
- Synchronized state arrays: 6 files, 49 tests passed, one fork, no file
  parallelism.
- Web effect projection: 4 files, 131 tests passed, one fork, no file parallelism.
- Effect-snapshot synchronization tool: 10 tests passed.
- Shared build and shared, API, and web typechecks passed serially.
- Oxlint and Oxfmt passed on all changed TypeScript and documentation files. The
  generated JSON passed syntax, persisted equality, and scoped semantic and byte
  checks.
- `git diff --check` passed.
- Persisted semantic diff: 59 changed records, all 59 within BT14, with zero
  semantic or byte changes outside the audited set; the subsequent scoped
  `--check` passed.

All Vitest commands used explicit timeouts, a single fork, and no file
parallelism. Builds, synchronization, formatting, and typechecks also used
explicit limits and ran serially.
