---
title: Activation costs audit
updated: 2026-09-12
---

# Activation costs audit

## Status

In progress. Baseline: `de4dda717d8c9e0c2420796cb387f68b1379b863`.
EX10-052's whole-clause processing condition was paid without a refusal choice.
A public attack reproduction failed because the selected payment left the hand
despite declining all optional choices. The card now declares the processing
cost optional, and `runEffect` asks before paying it. Refusal exits the entire
clause. The subsequent opponent-owned optional payload uses explicit `target.chooser: "opponent"` and is routed through
`requireOpponentAsk`, preserving source attribution while addressing the choice
to the correct player. This does not certify all activation-cost shapes.

## Contract and sources

- `comprehensive-0169`: §15-7-1 successful processing conditions unlock the
  payload; §15-7-2 refusal/failure skips the whole payload; §15-7-3 compound
  conditions cannot be paid only in part.
- Reviewed text SHA-256: `e7f66fe8948ecd52b83fd319497a156cdf654fe68c59dff6ea5f4c3acd59587e`.
- `comprehensive-0170`: §15-7-4 choice even when payment is impossible;
  §15-7-5 payment even when no payload target exists.
- Reviewed text SHA-256: `238f003c6cbc645a023fd73c17dc447cec13647fb9e839d788b827998c3428e4`.
- The local §15-7-3 example contains the suspicious text “126 [Machinedramon]”.
  Verify source extraction before using this example's numeric value.

## Implementation trace

`EX10-052.ts` → `registerIrCard` → registration timing → `runEffect` clause
cost → `payCost` → nested `runAction`. Optional payloads assigned to the
opponent for Delete now use the existing seat-addressed decision API. Recipient
controller fields on other action kinds do not determine their chooser. Explicit borrowed
effect `forceCostProcessing` still bypasses the newly honored optional cost
choice; its dedicated behavior needs regression coverage before certification.
Implementation checkpoint: `7671a3b9f`; citation correction: `c99bcef5c`; citation infrastructure: `d2753b28e`.

## Obligation ledger

| Obligation                                                                     | Proof                                                                              | Status                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------- |
| Refuse a payable condition without losing the hand card or running any payload | `ch15-02-timing-and-resolution.test.ts`, “refusing a payable processing condition” | focused green              |
| Pay once and execute the full clause                                           | same suite, “a payable clause cost is paid exactly once”                           | focused green              |
| Do not refund payment when the opponent refuses the payload                    | same suite, “declining the opponent's optional”; EX10-052 public evolution test    | focused green              |
| Skip the entire clause when no hand payment exists                             | same suite, “an unpayable clause cost”                                             | focused green              |
| Pay despite absent payload targets, with final-zone assertions                 | BT9-042 public evolution proof in the same suite                                   | focused and combined green |
| Offer the processing choice even when payment is impossible                    | public triggered-effect proof; choice is offered before affordability checks       | focused and combined green |
| Opponent chooses among two legal targets; source cannot answer                 | public attack proof with two neutral targets                                       | focused green              |
| No partial compound payment                                                    | full shape inventory and public proofs pending                                     | queued                     |

## Consumer coverage

EX10-052 public attacks and evolution exercise whole-clause costs. BT9-042
exercises payment with an absent payload target. Action costs, CostGatedBlock,
compound costs, replacements, and borrowed-effect overrides remain to be
inventoried and proved. Root costs missing optional metadata elsewhere must be
checked against their printed contracts; this fix covers the demonstrated card.

## Gates

- Initial conformance baseline: 28 files / 398 tests passed.
- Red reproduction: 1 failed / 22 passed in the timing conformance file;
  payment disappeared from hand despite refusal.
- After refusal and chooser-routing fixes: focused conformance + EX10-052,
  2 files / 39 tests passed.
- First combined run: 215 files passed, 1 catalog-sync file failed;
  3113 passed / 1 failed. EX10-052 persisted IR was not yet synchronized.
- `pnpm effects:sync:set -- --set EX10 --base de4dda717d8c9e0c2420796cb387f68b1379b863`:
  74 records synchronized, 1 semantic change, zero out-of-set semantic or byte changes.
- Closing combined rerun: 217 files / 3119 tests passed.
- Effects check: 74 records synchronized, 1 semantic change against baseline, zero out-of-set changes.
- Shared and web typecheck passed; API typecheck passed after correcting a duplicated fingerprint argument.
- Scoped Oxlint: no errors; literal-concatenation warning subsequently cleaned.
- Formatter and diff check green before this documentation update; final check follows.

All Vitest commands use `--pool=forks --maxWorkers=1 --no-file-parallelism`.
Combined scope: conformance, combat, effects, engine cards, and EX10 collection.

## Open items

Resolve every queued/unresolved obligation, inspect all cost consumer shapes,
run final gates, and identify the delivery commit. No 10/10 or mechanism
completion is claimed from this checkpoint.

## History

- 2026-09-12: initial optional-cost reproduction and correction on
  `audit/engine-mechanisms-20260912`; raw results recorded above.

## Compiled cost consumer discovery

Snapshot: committed `packages/shared/src/effects/effects.json` after the EX10-052 correction. Counts are distinct card IDs carrying a `cost` field of that kind; they are discovery counts, not executable or behavioral certification. Nested compound components are shown separately below.

| Cost kind                         | Distinct cards | Sample consumers                               |
| --------------------------------- | -------------: | ---------------------------------------------- |
| `attack`                          |              1 | `AD1-020`                                      |
| `compound`                        |             19 | `BT14-090`, `BT15-091`, `BT16-090`, `BT17-050` |
| `deleteOwn`                       |            119 | `BT11-012`, `BT11-018`, `BT11-040`, `BT11-041` |
| `digivolve`                       |              1 | `BT18-100`                                     |
| `flipSecurity`                    |              3 | `BT23-043`, `BT23-045`, `EX11-031`             |
| `moveToBattleArea`                |              1 | `BT20-095`                                     |
| `payMemory`                       |             25 | `BT1-081`, `BT10-025`, `BT12-092`, `BT15-009`  |
| `place`                           |            195 | `AD1-007`, `AD1-015`, `BT10-009`, `BT10-059`   |
| `placeAsSecurity`                 |              3 | `BT18-034`, `BT19-048`, `BT26-033`             |
| `placeOwnTopAtStackBottom`        |              2 | `BT26-058`, `EX5-016`                          |
| `playFromDigivolutionCards`       |              3 | `BT19-102`, `BT24-060`, `EX5-065`              |
| `return`                          |            115 | `BT10-067`, `BT10-086`, `BT11-062`, `BT11-064` |
| `reveal`                          |              1 | `EX4-023`                                      |
| `securityToHand`                  |             10 | `AD1-023`, `BT14-084`, `BT18-042`, `BT23-086`  |
| `suspend`                         |            295 | `AD1-019`, `AD1-022`, `BT1-086`, `BT1-088`     |
| `trash`                           |            355 | `AD1-017`, `BT1-039`, `BT10-023`, `BT10-036`   |
| `trashBothSecurityTop`            |              1 | `BT19-043`                                     |
| `trashBottomFaceDownUnderDigimon` |              1 | `BT26-048`                                     |
| `trashBottomFaceDownUnderTamer`   |             31 | `BT25-027`, `BT25-029`, `BT25-035`, `BT25-041` |
| `trashSecurityTop`                |             16 | `BT15-033`, `BT16-080`, `BT17-036`, `BT18-040` |
| `unsuspend`                       |              6 | `BT14-054`, `BT21-101`, `BT23-024`, `EX12-064` |
| `unsuspendNamed`                  |              1 | `BT19-090`                                     |

### Compound shapes requiring payment proof

Each occurrence below retains its IR path. Component summaries omit filters and therefore do not prove disjoint candidates. Inspect full consumer filters and selection bindings before choosing regression fixtures.

| Card       | IR path                      | Component kinds                                   | Ordering                   |
| ---------- | ---------------------------- | ------------------------------------------------- | -------------------------- |
| `BT14-090` | `effects[1].actions[0].cost` | `place`, `place`                                  | `orderReturnedCards=false` |
| `BT15-091` | `effects[1].actions[0].cost` | `place`, `place`                                  | `orderReturnedCards=false` |
| `BT16-090` | `effects[1].actions[0].cost` | `deleteOwn`, `trashBreeding`                      | `orderReturnedCards=false` |
| `BT17-050` | `effects[0].actions[0].cost` | `payMemory`, `place`                              | `orderReturnedCards=false` |
| `BT17-085` | `effects[1].actions[0].cost` | `place`, `place`, `place`                         | `orderReturnedCards=false` |
| `BT19-086` | `effects[1].actions[0].cost` | `suspend`, `deleteOwn`                            | `orderReturnedCards=false` |
| `BT23-084` | `effects[2].actions[0].cost` | `suspend`, `return`                               | `orderReturnedCards=false` |
| `BT23-089` | `effects[1].actions[0].cost` | `suspend`, `trash`                                | `orderReturnedCards=false` |
| `BT23-090` | `effects[1].actions[0].cost` | `suspend`, `return`                               | `orderReturnedCards=false` |
| `BT25-092` | `effects[1].actions[0].cost` | `suspend`, `trash`                                | `orderReturnedCards=false` |
| `BT25-096` | `effects[1].actions[0].cost` | `place`, `place`                                  | `orderReturnedCards=false` |
| `EX10-067` | `effects[1].actions[0].cost` | `suspend`, `place`                                | `orderReturnedCards=false` |
| `EX3-035`  | `effects[1].actions[1].cost` | `return`, `return`, `return`                      | `orderReturnedCards=true`  |
| `EX5-064`  | `effects[1].actions[0].cost` | `suspend`, `placeOwnTopAtStackBottom`             | `orderReturnedCards=false` |
| `EX5-064`  | `effects[2].actions[0].cost` | `suspend`, `placeOwnTopAtStackBottom`             | `orderReturnedCards=false` |
| `EX6-038`  | `effects[0].actions[0].cost` | `payMemory`, `place`                              | `orderReturnedCards=false` |
| `EX6-042`  | `effects[0].actions[0].cost` | `payMemory`, `place`                              | `orderReturnedCards=false` |
| `ST17-10`  | `effects[1].actions[0].cost` | `place`, `place`, `place`                         | `orderReturnedCards=false` |
| `BT26-098` | `effects[1].actions[0].cost` | `place`, `place`                                  | `orderReturnedCards=false` |
| `EX13-071` | `effects[2].actions[0].cost` | `trashBottomFaceDownUnderTamer`, `place`, `place` | `orderReturnedCards=false` |

`canPayCost(compound)` checks each component independently; general payment executes components sequentially. The ordered-return branch collects selections before moving cards but does not currently exclude earlier selections from later candidates. Candidate overlap is a hypothesis to reproduce with an actual printed consumer, not a proven defect.
