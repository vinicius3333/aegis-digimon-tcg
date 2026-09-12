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
- Reviewed version 4.2 text SHA-256: `255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b`.
- `comprehensive-0170`: §15-7-4 choice even when payment is impossible;
  §15-7-5 payment even when no payload target exists.
- Reviewed version 4.2 text SHA-256: `6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97`.
- The baseline version 4.0 extraction read “126 [Machinedramon]”; reviewed version
  4.2 correctly reads one card, with a trailing page marker. §15-7-5 now renders
  `- 5000 DP`. These reviewed extraction differences do not change the tested
  processing contract; history and current source pins are recorded in
  `kb-citation-integrity.md`.
- New §4-2 Cost/alternate costs and revised §1-3-11 declaration conditions remain
  behavioral audit obligations. Missing DigiXros/Assembly scenarios must not be
  classified as non-normative merely to reduce the residual.

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

## Exact-name payment boundary, 2026-09-12

BT14-090 uses bracket-only references to Greymon, MetalGreymon, Agumon, and WarGreymon. `comprehensive-0034` §2-3-1-2 requires exact names, while §2-3-1-3 permits substring matches only for explicit “in its name” wording. Reviewed source hash: `c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2`. Q2466 separates payment from optional evolution.

A public Option-play reproduction with only MetalGreymon in trash consumed it as the Greymon component and then failed the second component. After repairing a transient fixture lookup of the resolving Option, the focused reproduction had 2 failed / 5 passed: the payment choice improperly included MetalGreymon, and the missing-Greymon case removed MetalGreymon from trash. Seven bracket-only filters now use `nameExact`; Tai Kamiya's explicit “in its name” filter remains substring matching. The first corrected focused run passed 7/7.

Expanded tests include a duplicate exact Greymon choice, a near-named Agumon host, exact WarGreymon together with X Antibody in hand, and Security refusal of near-named Agumon. The original Q2466 decline-after-payment and same-host proofs remain. The initially added targetless-destination no-payment expectation was removed following independent review: it would have asserted unresolved Main Option payment policy, not merely exact-name matching. CostGatedBlock's targetless payload gating for already played Options remains an explicit open obligation under §15-7-5.

BT14 IR synchronization against `e65036cc1`: 102 records synchronized, one semantic card change, zero semantic or byte changes outside BT14. Expanded regression: 175 files / 1815 tests passed across BT14, the chapter 2 and chapter 15 timing conformance files, and engine effects. API typecheck and scoped Oxlint passed. Audit layout tests passed 4/4; generated index and diff checks passed. No whole-card or whole-set completion is claimed.

Inspection of all 20 compound occurrences also found bracket-only substring filters in BT15-091, BT17-085, BT25-096, EX3-035, and ST17-10. Each needs a source-specific correction and public boundary proof. BT16-090, BT26-098, and EX13-071 already encode their relevant exact names. This classification is static inspection, not behavioral certification. General overlap, ordered returns, and “in any order” stack placement remain unproved.

### Current primary-source check

On 2026-09-12, the [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf) identifies itself as version 4.2, updated 2026-08-18. Its §15-7-3 example specifies one Kimeramon and one Machinedramon; the local “126” extraction is not a valid numeric requirement. The current text retains no-partial-payment and payment-without-payload principles. §15-8-4-4-1 additionally requires performable payment before declaring an activation-type effect and mandatory performance after declaration. The [official BT14-090 ruling](https://world.digimoncard.com/rule/?card_no=BT14-090) confirms separable placement payment and evolution choice. These sources clarify audit obligations; they do not certify the current targetless Option gate or replace the committed KB fingerprints without a separate reviewed KB update.
