# BT17 Completed Card Audit

Status: complete — 102/102 cards have reproducible 10/10 evidence.

Audit date: 2026-09-02

This report supersedes `BT17-STATIC-AUDIT.md` and the provisional range reports
in `internal-docs/audits/BT17/`. The earlier files remain as historical review
notes.

## Scope and score

- Catalog scope: exactly `BT17-001` through `BT17-102`.
- Production scope: 102 direct TypeScript modules and 102 persisted IR records.
- Registration invariant: every production module has exactly one
  `registerIrCard(cardId, compiled)` call and no `registerCard` call.
- Runtime contract: every record has `coverage: "full"` and `residual: []`.
- Score model: catalog/rules, IR trace, behavioral proof, peer/stack proof, and
  delivery gates are each worth 2 points. Every card earned 2/2 in every
  component.

## Reproducible card evidence

Every card below has a direct focused test at
`apps/api/src/cards/BT17/<card-id>.test.ts`, a direct executable module at
`apps/api/src/cards/BT17/<card-id>.ts`, and a persisted-equality assertion in
`BT17-catalog-sync.test.ts`.

| Cards             | Focused evidence                                                                                                      | Final score |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| BT17-001–BT17-010 | Natural attack, deletion, source-zone, Tamer-placement, DNA, recovery, reveal, and inherited-stack boundaries         | 10/10 each  |
| BT17-011–BT17-020 | Named-Tamer evolution, Raid, stack-host effects, modal play, Blast Digivolve, DigiXros, and inherited DNA             | 10/10 each  |
| BT17-021–BT17-030 | Hybrid routes, effect-play binding, hand activation, security movement, Tamer suspension, and start-main branches     | 10/10 each  |
| BT17-031–BT17-040 | Option filters, security-trash timing, leave replacement, exact-three branches, later entrants, and inherited effects | 10/10 each  |
| BT17-041–BT17-050 | Free Tamer play, reveal, effect-play watchers, Alliance, linked hosts, and hand activation                            | 10/10 each  |
| BT17-051–BT17-060 | Live restrictions, Collision, redirection, leave protection, stack placement, tokens, and trash-cost reduction        | 10/10 each  |
| BT17-061–BT17-070 | Retaliation, attack evolution, no-source targeting, replacement evolution, memory thresholds, and deck routing        | 10/10 each  |
| BT17-071–BT17-080 | Exact stack names, Eosmon redirection, non-DNA branches, DNA, Security, and end-turn flows                            | 10/10 each  |
| BT17-081–BT17-090 | Provenance gates, self-bound costs, recovery locality, selected-host grants, Mind Link, and end-turn conditions       | 10/10 each  |
| BT17-091–BT17-100 | Mind Link, live auras, Delay, synchronous leave replacement, Trash DNA, stack-bottom placement, and win conditions    | 10/10 each  |
| BT17-101–BT17-102 | Natural Trash-origin DNA, opponent-seat memory, exclusive play/hatch choice, alternate evolution, and inherited DP    | 10/10 each  |

## Corrections completed in the functional audit

- BT17-011 and BT17-012 now expose their named-Takuya alternate evolution route
  through the runtime's Tamer-base contract.
- BT17-025 binds its delayed return only to Digimon played by an effect.
- BT17-040 applies the opponent-wide Security Attack reduction to Digimon that
  enter after the continuous effect starts. The shared grant path now tracks
  permanent identity instead of the current top-card identity.
- BT17-095 now implements Delay as the printed all-turns, non-battle
  leave-replacement window. The synchronous replacement path validates and
  performs a legal Omnimon DNA digivolution before the leaving material is
  removed, consuming the Option only when the DNA action can proceed.
- The shared DNA preflight now supports pinned trigger subjects, loose hand
  materials, distinct results, and full requirement legality.
- BT17-100 places the selected card at the bottom of the digivolution stack.
- BT17-101 now has natural behavioral proof for Trash-origin DNA and
  opponent-seat memory loss.
- BT17-102 presents play and hatch as one optional, exclusive modal choice. The
  shared modal preflight now hides a `PlayWithoutCost` branch when it has no
  eligible loose-card target.
- The persisted BT17 catalog was recalculated automatically from the executable
  compiled IR, with zero records outside BT17 changed.

## Typed revalidation after the main-branch reconciliation

- Removed all 100 remaining `@ts-nocheck` directives from BT17 production
  modules. The collection now has zero TypeScript suppressions.
- Corrected the typed IR shapes exposed by the removal, including deletion-DP
  modifiers, Tamer-base evolution metadata, delayed-effect subject binding,
  chooser ownership, target cardinality, stack-kind filters, and paid-cost
  declarations.
- BT17-075 now exercises the opponent-owned optional Tamer selection through a
  real decision request and proves the four-Tamer/two-repetition boundary.
- BT17-077 uses the explicit all-sources trash primitive instead of a numeric
  sentinel.
- BT17-092 models the permanent On Play timing restriction through the typed
  timing-disable primitive.
- BT17-093 publishes hatch triggers through the continuous sub-trigger seam,
  avoiding duplicate watchers after continuous-effect recomputation.
- The shared play-without-cost runtime now routes opponent-owned choices to the
  opponent and records a declined optional selection.
- The persisted BT17 catalog was synchronized by the snapshot generator:
  exactly 89 BT17 records differ semantically from `origin/main`, with zero
  semantic or byte changes outside BT17.

## Executed gates

- Focused typed-correction suite: 28 files, 162 tests passed.
- BT17 collection: 109 files, 675 tests passed, one worker, no file parallelism.
- Core and cross-cutting mechanisms: 15 files, 645 tests passed, one worker, no
  file parallelism.
- Primitive mechanisms: 138 tests passed, one worker, no file parallelism.
- Shared effect mechanisms: 8 files, 133 tests passed.
- Web effect and digivolution projection: 3 files, 128 tests passed.
- Synchronized-state regression suite: 5 files, 18 tests passed.
- Effects snapshot generator tests: 13 tests passed.
- Shared and API builds passed with explicit 180-second limits.
- Workspace typechecks passed serially with an explicit 300-second limit.
- Oxlint and Oxfmt checks passed on the changed TypeScript files.
- `git diff --check` passed.
- Persisted semantic diff: 89 changed records, all 89 within BT17, zero outside
  the audited set.

All Vitest commands used explicit timeouts, `--maxWorkers=1`, and
`--no-file-parallelism`. Builds and workspace typechecks also used explicit
timeouts; workspace typechecks ran with concurrency 1.
