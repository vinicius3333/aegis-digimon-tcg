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
effect `forceCostProcessing` has a bounded BT23-060/BT23-045 proof below; other
borrowed cost kinds and force assignments still need separate coverage before
any broader certification.
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

## Targetless paid payload checkpoint (2026-09-13)

`comprehensive-0170` §15-7-5 permits an optional processing condition to be
paid even when the subsequent payload has no eligible target. The executable
pin is SHA-256 `6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97`.

`activation-cost-targetless-payload.test.ts` drives the real public Main effect
of BT19-086 with four actual `[Device]` Options in the battle area and no
Cyberdramon in hand or trash. The compound suspend-plus-trash cost is paid,
all four captured physical Option instance IDs reach the trash, the Tamer and
host retain their original permanent identities and the host's DP, and the
optional play payload makes no board change. Focused result: **1 test passed**.
This closes the targetless payload case for BT19-086's compound
`CostGatedBlock`; other cost kinds, providers, and targetless shapes remain
open. The separate EX9-025/EX9-061 public deck-payment cases in
`digivolution-card-placement.test.ts` provide the same §15-7-5 boundary for a
different set and cost shape; they are referenced rather than duplicated here.

The BT20-073 MetalPhantomon ordering fixture exposed a separate, concrete
boundary for this rule. Its entry actions have a payable `deleteOwn` condition
when the controller has a Digimon, but their opponent level-5-or-lower Delete
payload can have no target (for example, an opponent whose only Digimon is a
level-6 BT20-076). The IR now marks both entry actions with
`allowCostWithoutTarget`; the public BT20-073 test accepts the processing
choice, selects an exact own payment instance, verifies that instance in the
trash, preserves the level-6 opponent, and leaves no pending decision. The
ordering conformance case explicitly refuses this targetless condition before
continuing its other pending watcher. This is a card-scoped use of the
existing §15-7-5 escape hatch: the cost remains payable only when a real own
Digimon exists, while the targetless payload no longer suppresses the
processing choice. Other cost kinds and generated actions still require their
own targetless review; BT20-073's collection entry remains bounded to its
recorded entry and inherited cases.

## Compound assignment checkpoint (2026-09-12)

BT14-090 Dragon of Courage is the reviewed printed consumer for this bounded
compound-cost proof. Its Main clause requires placing one exact [Greymon] and
one exact [MetalGreymon] from the controller's trash under one exact [Agumon],
then makes the [WarGreymon] evolution optional. Q2466 confirms that both
placements resolve before the optional evolution. Comprehensive-0169 §15-7-3
requires the compound condition to be paid as a whole. Because BT14-090 is an
activation-type [Main] effect, comprehensive-0176 §15-8-4-4-1 additionally
requires its condition to be performable before the player declares the effect;
the §15-7-4 triggered-effect choice rule does not override that declaration gate.

The new `activation-cost-compound-assignment.test.ts` uses only catalog cards
from BT14-090's printed filters. Its accepting public Option play supplies two
distinct exact Greymon instances and one MetalGreymon, then verifies that the
resulting Agumon stack contains exactly one physical instance for each payment
component and leaves the second Greymon in trash. Its impossible-payment control
supplies only one Greymon and verifies that the activation-type effect does not
declare, does not move the available Greymon, leaves the host unchanged, and
charges only the Option's ordinary play cost. Focused result: **2 tests passed**.

The source contract is satisfied for this activation-type consumer: an
unperformable compound condition is rejected before declaration. §15-7-4's
impossible-payment choice remains a separate triggered-effect obligation already
covered by the earlier ledger entries. The accepting case proves distinct
physical assignment for this consumer, but general candidate disjointness across
the 19 compound cost consumers remains open. The exact Greymon/MetalGreymon
filters here are disjoint by card identity; arbitrary overlapping filters,
multiple hosts, and other compound component shapes remain open.

The complete persisted inventory contains **20 compound-cost occurrences across
19 distinct cards**. Direct-module review classifies every component pair by its
printed zone, kind, exact name/trait, level, host, or self-reference constraints:
BT14-090, BT15-091, BT17-085, BT25-096, BT26-098, and ST17-10 use distinct
named material constraints, with the applicable self-reference or bound-host
constraint preserved; BT16-090, BT19-086, BT23-084, BT23-089, BT23-090,
BT25-092, EX5-064, and EX10-067 combine a self/permanent or source-class
component with a different card class; BT17-050, EX6-038, and EX6-042 combine
memory with a placement; EX3-035 uses three distinct named return classes; and
EX13-071 separates its level-4 and level-5 Holy Beast placements after a
face-down-source component. No current printed consumer yields a reproducible
same-physical-card overlap between two compound components. This is an
inventory finding, not a generic uniqueness proof: malformed filters, future
cards, and runtime candidate exclusion still require a reusable seam test.

## History

## Finite cost-shape reconciliation (2026-09-13)

The persisted discovery table above has 22 top-level kinds. The following map records the
actual current consumer classes and executable anchors reviewed in this pass. A discovery-only
row is deliberately not treated as behavioral certification; `raw` has no current consumer and
is rejected by `canPayCost`.

| Kind                              | Current consumer/class anchor                              | Public executable evidence                                                                  | Status and precise boundary                                                                                    |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `attack`                          | AD1-020 printed attack payment                             | `cards/AD1/AD1-020.test.ts`                                                                 | native attack cost; alternate target/compound attack costs remain unreviewed                                   |
| `compound`                        | BT14-090 named placement pair; BT23-060 borrowed placement | `activation-cost-compound-assignment.test.ts`, `activation-cost-borrowed-effects.test.ts`   | whole-clause payment and borrowed force path proved; other 19 consumers are inventory only                     |
| `deleteOwn`                       | BT19-086 suspend + delete-own CostGatedBlock               | `activation-cost-targetless-payload.test.ts`                                                | all-or-nothing targetless payload boundary proved for this shape; other target filters unreviewed              |
| `digivolve`                       | BT18-100 printed digivolve cost                            | `cards/BT18/BT18-100.test.ts`                                                               | native self digivolve payment; alternate source/waiver classes unreviewed                                      |
| `flipSecurity`                    | BT23-043 borrowed security flip                            | `activation-cost-borrowed-effects.test.ts`                                                  | exact borrowed payer path; ordinary flip consumers not separately proved                                       |
| `moveToBattleArea`                | BT20-095 printed Option action cost                        | `cards/BT20/BT20-095.test.ts`, `cards/EX13/EX13-072.test.ts`                                | current action path exists; standalone cost payment not separately anchored                                    |
| `payMemory`                       | BT10-025 and BT23-053 memory costs                         | `cards/BT10/BT10-025.test.ts`, `cards/BT23/BT23-053.test.ts`                                | ordinary memory affordability/payment paths; compound and borrowed combinations remain bounded                 |
| `place`                           | BT14-090 and ST17-10 ordered placement                     | `activation-cost-compound-assignment.test.ts`, `keyword-de-digivolve-parameters.test.ts`    | exact source/destination classes proved for reviewed consumers; other placement destinations remain unreviewed |
| `placeAsSecurity`                 | BT18-034 / BT19-048 printed placement                      | `cards/BT18/BT18-034.test.ts`, `cards/BT19/BT19-048.test.ts`                                | current providers discovered; face-up/bottom and refusal classes need direct public anchors                    |
| `placeOwnTopAtStackBottom`        | BT26-058 / EX5-016 source-top payment                      | `cards/BT26/BT26-058.test.ts`, `cards/EX5/EX5-016.test.ts`                                  | source-top movement class discovered; cross-stack source and refusal remain unreviewed                         |
| `playFromDigivolutionCards`       | BT19-102 / BT24-060 / EX5-065                              | `cards/BT19/BT19-102.test.ts`, `cards/BT24/BT24-060.test.ts`, `cards/EX5/EX5-065.test.ts`   | source-stack play class discovered; targetless and compound variants remain unreviewed                         |
| `raw`                             | no persisted consumer                                      | none                                                                                        | rejected by `canPayCost`; no current behavioral gap                                                            |
| `reveal`                          | EX4-023 “that revealed card” continuation                  | `cards/EX4/EX4-023.test.ts`                                                                 | reveal-to-follow-up binding is current; multi-reveal ordering remains unreviewed                               |
| `return`                          | BT19-086 / BT10-067 trash or hand return                   | card provider tests plus targetless checkpoint                                              | trash/hand return classes are real; bottom/stack and overlapping compound candidates remain open               |
| `securityToHand`                  | BT23-086 / AD1-023 security payment                        | `cards/BT23/BT23-086.test.ts`, `cards/AD1/AD1-023.test.ts`                                  | top/bottom identity classes require additional direct cost assertions                                          |
| `suspend`                         | BT19-086 and BT23 compound costs                           | `activation-cost-targetless-payload.test.ts`, `activation-cost-compound-assignment.test.ts` | public suspend payment exists; already-suspended and multi-target cost classes remain open                     |
| `trash`                           | BT19-043 security/trash cost                               | `cards/BT19/BT19-043.test.ts`                                                               | native trash payment path; hand/stack/breeding source permutations remain bounded                              |
| `trashBothSecurityTop`            | BT19-043 printed two-security cost                         | `cards/BT19/BT19-043.test.ts`                                                               | exact two-card top removal provider; refusal/empty-security boundary needs direct assertion                    |
| `trashBottomFaceDownUnderDigimon` | BT26-048 printed source-stack cost                         | `cards/BT26/BT26-048.test.ts`                                                               | exact bottom face-down source class; alternate source eligibility remains open                                 |
| `trashBottomFaceDownUnderTamer`   | BT25-027 / BT25-041 printed Tamer source cost              | `cards/BT25/BT25-029.test.ts`, `cards/BT25/BT25-041.test.ts`                                | current Tamer-stack class discovered; exact insufficient/refusal public cost proof remains open                |
| `trashSecurityTop`                | BT15-033 / BT16-080 printed security cost                  | `cards/BT15/BT15-033.test.ts`                                                               | top security identity path discovered; face-up, bottom, and compound variants remain open                      |
| `unsuspend`                       | BT14-054 / BT21-101 / BT23-024 / EX12-064                  | `cards/BT14/BT14-054.test.ts`, `cards/BT21/BT21-101.test.ts`, `cards/BT23/BT23-024.test.ts`, `cards/EX12/EX12-064.test.ts` | suspended payment and ready-state rejection are covered in native triggered paths; arbitrary multi-target costs remain open |
| `unsuspendNamed`                  | BT19-090 named unsuspend                                   | `cards/BT19/BT19-090.test.ts`                                                               | Main modal rejects an unavailable exact name or half-payable pair; arbitrary name/trait overlap remains open   |

The first focused closure run for the real `unsuspendNamed`, security-stack, digivolve, and
borrowed-cost providers passed 7 files / 44 tests. This is a consumer-shape checkpoint, not a
claim that every persisted card carrying a kind has full public-cost evidence. The remaining
items above are concrete source/destination, target-selection, refusal, or multi-target classes,
rather than a generic request to test every card.

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

Inspection of all 20 compound occurrences also found bracket-only substring filters in BT15-091, BT17-085, BT25-096, EX3-035, and ST17-10. BT15-091 and EX3-035 exact-name boundaries and BT17-085's host boundaries are corrected and reproduced below; BT25-096 and ST17-10 still need source-specific correction and public boundary proof. BT16-090, BT26-098, and EX13-071 already encode their relevant exact names. This classification is static inspection, not behavioral certification. General overlap and arbitrary ordering of stack placements remain unproved; EX3-035's specific ordered return is publicly reproduced below.

### BT15-091 payment and name boundaries

Baseline `63632cf6a`, reviewed `comprehensive-0034` fingerprint `c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2`, and [official Q2589](https://world.digimoncard.com/rule/?card_no=BT15-091), checked 2026-09-12. The printed placement pair requires exact Garurumon and WereGarurumon under exact Gabumon; free evolution requires exact MetalGarurumon. The Matt Ishida waiver explicitly says “in its name”.

Public Option/Security actions reproduced six failures with four existing cases green: missing exact Garurumon partially paid with WereGarurumon, either X Antibody material paid, an X Antibody host paid, the near-named evolution destination was preferred over the exact one, and Security played near-named Gabumon. Six bracket-only filters were corrected to `nameExact` while the Matt waiver retained substring matching. The unchanged focused cases passed 10/10; an additional Q2589 refusal scenario proves both placements are already paid before the evolution prompt and remain paid after refusal. All 11 tests pin the reviewed source fingerprint. See the sole card ledger `docs/audits/BT15.md`; the historical collection completion claim has been reopened.

`pnpm effects:sync:set -- --set BT15 --base 63632cf6a` synchronized 102 records with one semantic card change and zero semantic or byte changes outside BT15. A regression launched before synchronization completed correctly caught stale persisted IR (one sync test failed; 1911 tests passed); no assertions were weakened. After synchronization and the explicit temporal-order assertion, `pnpm --filter @aegis/api exec vitest run src/cards/BT15 src/cards/BT14/BT14-090.test.ts src/engine/conformance/ch02-card-information.test.ts src/engine/effects --maxWorkers=1 --no-file-parallelism` passed 175 files / 1912 tests. Full API typecheck, scoped Oxlint and audit layout (4/4) passed. Read-only independent review found no semantic or fixture blocker.

This proves these consumer boundaries, not all compound payment policy or BT15 collection fidelity. BT25-096 and ST17-10 exact-name consumers, general candidate overlap, arbitrary stack ordering, targetless Option payment and cost-bearing evolution remain open. BT17-085's host boundaries and EX3-035's specific ordered-return boundaries are reproduced below.

### EX3-035 exact-name return and player order

Baseline `2e0811eea`. The current catalog/2022-11-11 errata requires exact Magnadramon, Azulongmon and Megidramon; reviewed `comprehensive-0034` fingerprint `c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2`. Official Q2613 was checked on 2026-09-12 and preserves simultaneous effect ordering without introducing a name exception. Evidence lives in the sole card ledger `docs/audits/EX3.md`.

A public attack with only Magnadramon X Antibody as the first named payment reproduced two improper Security discards beyond the normal attack check. A strengthened mixed-trash positive also reproduced the near-named card entering the exact payment candidate list. After repairing a fixture milestone typo, the source-specific red run had two failures / eleven passes. Three bracket-only filters now use `nameExact`; the unchanged proof passes 13/13. The mixed-trash positive verifies full public trash visibility, exact duplicate choice, three distinct paid instances in manual deck-bottom order, and both unselected exact and near-named Magnadramon remaining in trash. The unpayable case verifies mandatory -6000 DP and normal combat continue while all payment instances and original deck order remain unchanged. All focused tests pin the reviewed exact-name fingerprint.

`pnpm effects:sync:set -- --set EX3 --base 2e0811eea` synchronized 74 records with one semantic card change and zero semantic or byte changes outside EX3. `pnpm --filter @aegis/api exec vitest run src/cards/EX3 src/cards/BT14/BT14-090.test.ts src/cards/BT15/BT15-091.test.ts src/engine/conformance/ch02-card-information.test.ts src/engine/conformance/ch15-02-timing-and-resolution.test.ts src/engine/effects --maxWorkers=1 --no-file-parallelism` passed 149 files / 2057 tests. Full API typecheck and scoped Oxlint passed. Audit layout passed 4/4. All six changed files passed Oxfmt; `git diff --check` was clean. Independent read-only review found no semantic, fixture, visibility or order blocker.

This proves EX3-035's particular ordered return with disjoint exact-name candidates, not general compound payment uniqueness or all return consumers. No artificial near-named Azulongmon or Megidramon definitions were introduced; current catalog has no distinct near-named variants. Historical EX3 completion has been reopened; a collection rerun alone does not restore full certification.

### BT17-085 exact-name placement host

Baseline `40904ef30`; catalog bracket-only Renamon, Kyubimon and Taomon; reviewed `comprehensive-0034` fingerprint `c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2`; [official Q2867/Q2868](https://world.digimoncard.com/rule/?card_no=BT17-085), checked 2026-09-12. Four filters now use exact names while the existing exact Sakuyamon destination stays unchanged.

Public Main activation with only Renamon X Antibody as a placement host incorrectly succeeded; a mixed-host positive incorrectly offered X as a host. After correcting the fixture to force a real choice between two exact hosts, restoring the old module reproduced two failures / seven passes and restoring the corrected module passed nine tests. Refusal retains the Tamer, both material instances, destination, memory and no decision; the mixed-host positive chooses between only the two exact hosts and keeps all placements/evolution on the selected one. All focused tests pin the reviewed fingerprint. No artificial Kyubimon/Taomon aliases were fabricated; the current catalog has no distinct near-named variants. The sole card ledger is `docs/audits/BT17.md` and its historical completion claim is reopened.

`pnpm effects:sync:set -- --set BT17 --base 40904ef30` synchronized 102 records with one semantic card change and zero semantic or byte changes outside BT17. `pnpm --filter @aegis/api exec vitest run src/cards/BT17 src/cards/BT14/BT14-090.test.ts src/cards/BT15/BT15-091.test.ts src/cards/EX3/EX3-035.test.ts src/engine/conformance/ch02-card-information.test.ts src/engine/conformance/ch15-02-timing-and-resolution.test.ts src/engine/effects --maxWorkers=1 --no-file-parallelism` passed 184 files / 2417 tests. Full API typecheck and scoped Oxlint passed. Independent read-only review found no semantic, fixture or bounded-claim blocker.

Arbitrary printed stack order, targetless declaration/payment policy, full conditional-return fidelity and complete equivalence-class proof are still open. This consumer correction does not certify general compound payment or BT17 collection completion.

### Payable processing without subsequent content (checkpoint `a43772ed7`)

Baseline `292739059`. Comprehensive version 4.2 §15-7-5 (`comprehensive-0170`, reviewed fingerprint `6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97`) permits performing optional processing conditions even when their subsequent content cannot execute. §15-8-4-4-1 (`comprehensive-0176`, reviewed fingerprint `f685a1a969a75e944c958f0cac3704d0c228231ee3865752f6ac20c4b0b49182`) separately requires payable conditions before declaring an activation-type effect and mandatory payment afterward. These are separate obligations, not an exception that requires a legal subsequent payload.

`activation-processing-costs.test.ts` reproduces both through public BT17-085 Main activation. With no Sakuyamon in hand but all three placement components available, declaration was incorrectly rejected as `illegal-target`. With a legal Sakuyamon, declaration was accepted but the first optional prompt appeared before any payment; the empty host stack contradicted mandatory payment after declaration. Initial red: two failed tests, for those exact assertions.

`canActivateEffect` no longer preflights `CostGatedBlock`'s inner payload. The existing outer condition and cost-payability gates are retained; the shared nested resolver still enforces each destination's exact names and optional evolution. Removed the unused host-filter reconstruction seam. A static search finds 63 direct card modules carrying `CostGatedBlock`; this is a discovery count, not a complete runtime consumer denominator.

The no-destination BT17-085 proof now accepts declaration, pays all three distinct physical cards under Renamon, removes the Tamer and materials from their original zones, leaves Renamon unevolved and does not charge the optional four-memory evolution. Two earlier BT17-085 tests incorrectly interpreted Q2868's prohibition on evolving into Kuzuhamon as a prohibition on declaring the independently payable placements. They now assert full three-card payment while preserving the invalid destination in hand and refusing evolution; this changes the expected contract based on §15-7-5 rather than weakening the destination boundary.

BT14-090 provides the second collection and an Option-use boundary: with no WarGreymon available, accepting the processing choice places both cards while declining retains both in trash. In both cases the used Option ends in trash, Agumon stays unevolved and the four-memory Option use is paid. These are public Option-play intents, not declarations of a resident Main ability; they preserve the optional choice.

| Obligation                                                                       | Source      | Public proof                                                                     | Current status                                                 |
| -------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Performable condition independent of unavailable subsequent content              | §15-7-5     | BT17-085 no-destination Main; BT14-090 targetless Option acceptance              | Verified for these consumers; general action shapes still open |
| Refuse optional processing inside an Option use                                  | §15-7-1/2   | BT14-090 targetless Option refusal retains both material instances               | Verified for this consumer                                     |
| Resident Main declaration requires payable conditions                            | §15-8-4-4-1 | Existing exact-host/material refusal proofs remain in the BT17-085 focused suite | Supporting proof; full shape inventory open                    |
| Resident Main declared condition must be paid before optional subsequent content | §15-8-4-4-1 | BT17-085 first optional prompt sees empty stack before payment                   | Reproduced unresolved defect; `it.fails`, not verified         |

At this checkpoint the expected failure was intentional audit evidence, not a passing obligation or completion certificate; the leading-block correction below removes that marker. Its source fingerprint is checked in a hook outside the expected-failure body, so citation drift remains a real suite failure; cleanup completes any pending public optional refusal. A mandatory-payment fix must remove the marker, prove no post-declaration refund and preserve triggered/Option processing choices. Direct action costs, whole-effect costs, borrowed effects, nested optional costs, all 63 discovered modules and complete activation-type inventory remain open.

Closing gates: `pnpm --filter @aegis/api exec vitest run src/engine src/cards --maxWorkers=1 --no-file-parallelism` completed with 5045 passing files / 41302 passing tests and seven expected failures (41309 total). The final conformance run after the source-hook and Option-proof additions passed 31 files / 424 tests with one expected failure (425 total); final focused processing proofs passed three tests with that same unresolved expected failure. Full API typecheck, scoped Oxlint, Oxfmt for all five changed files, audit layout (4/4) and `git diff --check` passed. These are regression results, not proof of the seven unresolved contracts.

Independent read-only review found no blocker in the bounded §15-7-5 repair and final Option acceptance/refusal proofs, confirming that condition/payability and exact destination gates remain. No complete mechanism, card or collection certification is claimed.

### Mandatory payment of a declared leading block

Baseline `a43772ed7`; reviewed version 4.2 §15-8-4-4-1 fingerprint `f685a1a969a75e944c958f0cac3704d0c228231ee3865752f6ac20c4b0b49182`. A performable optional processing condition is necessary before declaring an activation-type effect; after declaration its processing is mandatory. Optional subsequent evolution/play remains optional.

`applyActivateEffect` marks only a successfully validated public declaration. `runEffect` consumes the original context's declaration marker before condition/turn guards, retains that commitment for this resolution only, and clones a leading `CostGatedBlock` with mandatory outer payment. Compiled IR remains unchanged. Nested effects see no inherited declaration marker and inner optional payload actions keep their choices. Ordinary Option-use and triggered effects are not marked as public Main declarations.

The former §15-8-4-4-1 expected-failure proof is now an ordinary passing test. Public BT17-085 declaration has all three paid physical cards under Renamon before the first optional evolution prompt; declining evolution leaves those cards paid, Renamon unevolved, Sakuyamon in hand and memory unchanged. Its focused card refusal proof now answers that single optional payload prompt instead of consenting again to condition payment. BT19-086 Q3151 independently proves Ryo is suspended and the four selected Device physical identities are already in trash before optional Cyberdramon play; refusal retains the paid state and Cyberdramon in hand. See the sole collection ledgers `docs/audits/BT17.md` and `docs/audits/BT19.md`; their historical scores do not certify current full fidelity.

Review identified two one-shot-marker edges: an unseeded context originally cleared only its clone, and a condition/turn early return could bypass consumption. Both are corrected. `declaredProcessingScope.test.ts` resolves the real interpreter twice on the same unseeded context, verifying the first declared condition is paid once and the later uncommitted condition offers its own optional refusal with no extra payment. The second case begins with a condition-fizzled declared resolution and proves it cannot commit a later condition. Restoring clone-only consumption reproduced failure (optional choice called zero times instead of once); corrected focused public/mechanism proof passed four files / 31 tests.

A first broad run caught the old BT19-086 test's assumption of two optional prompts (one failed; 41302 passed; six expected failures). It was replaced by the source-derived public pre-prompt payment/refusal proof, not an unconditional acceptance or weakened endpoint. Independent read-only review confirmed both scope issues are closed and found no remaining blocker in this bounded change.

| Obligation / shape                                                                        | Current evidence                                                                           | Status                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| Declared leading CostGatedBlock condition precedes optional subsequent content            | BT17-085 placement/evolution and BT19-086 suspension/Devices/play public proofs            | Verified for these consumers |
| Subsequent refusal does not refund declared condition                                     | Both public refusal endpoints retain every payment instance/source state                   | Verified for these consumers |
| Original or fizzled context cannot force a later condition                                | Two real-interpreter context-reuse cases and clone-leak red reproduction                   | Verified seam                |
| Ordinary Option processing remains optional                                               | BT14-090 acceptance/refusal with unavailable evolution destination                         | Verified consumer boundary   |
| Whole-effect cost, direct action cost, leading branches, later/nested optional conditions | Full shape inventory and public declaration/trigger/borrowed comparisons still required    | Open                         |
| All activation-type effects and all discovered CostGatedBlock consumers                   | Collection regressions support compatibility; complete normative/parameter proof is absent | Open                         |

Closing gates: the final full engine/cards run passed 5046 files / 41305 tests with six existing expected failures (41311 total). Focused public/context proofs passed four files / 31 tests. Full API typecheck and scoped Oxlint passed. Independent read-only review found no blocker. The six remaining expected failures and incomplete normative coverage prevent full certification.

This removes the specific leading-block expected failure, not the remaining declaration-cost obligations or the full mechanism certification gate.

### BT25-096 exact-name processing materials

Baseline `eb8b41743`; reviewed `comprehensive-0034` fingerprint `c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2`; catalog and official English BT25 card list/Q6456 checked 2026-09-12. Two public Option-use cases reproduced BlackGaogamon or BlackMachGaogamon paying as bracket-only Gaogamon/MachGaogamon and evolving Gaomon into MirageGaogamon (two failures / five passes). Six bracket-only filters now use `nameExact`. Corrected focused tests pass seven cases, pin the source fingerprint and verify both payment identities remain in trash, no host sources/evolution, MirageGaogamon retained in hand, used Option in trash, five memory paid and no pending decision. Full evidence lives in `docs/audits/BT25.md`; historical BT25 certification is reopened.

BT25 scoped synchronization produced 104 records, one semantic card change and zero semantic/byte changes outside BT25. Comparative collection/effects/chapter-2 regression passed 183 files / 2559 tests. Independent read-only review found no blocker in this bounded consumer change. Destination/Security mixed candidates, arbitrary placement order and full-card recertification remain open; ST17-10 still needs its separate source-specific correction/proof. No complete mechanism or collection certification is claimed.

### ST17-10 exact-name declaration boundaries

Baseline `a3f5f4d6e`; reviewed `comprehensive-0034` fingerprint `c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2`; committed catalog and official Q835/Q836 checked 2026-09-12. Public Main declarations incorrectly accepted Terriermon Assistant as host, BlackGargomon or BlackRapidmon as processing materials (three failures / three existing passes). Seven bracket-only references now use `nameExact`. The same proofs require rejection before any component payment, retain the host/Tamer, both physical trash identities, MegaGargomon in hand, ten memory and no pending decision. Focused six tests and comparative ST17/BT25/BT17/chapter-2/effects regression passed 88 files / 1305 tests. Scoped synchronization produced 13 records, one semantic change and zero semantic/byte changes outside ST17. Independent read-only review found no blocker.

The sole collection evidence is `docs/audits/ST17.md`; historical certification is reopened. This resolves three unpayable name boundaries, not the cost-bearing Digivolve's payment-before-payload/targetless/refusal policy, arbitrary three-card ordering, destination mixed candidates or Rush recipient/duration. The leading CostGatedBlock repair does not cover this separate action shape. No whole-card, mechanism or collection certification is claimed.

### ST17-10 placements before optional evolution

Baseline `e491d2441`; reviewed `comprehensive-0170`/§15-7-5 fingerprint `6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97` and `comprehensive-0176`/§15-8-4-4-1 fingerprint `f685a1a969a75e944c958f0cac3704d0c228231ee3865752f6ac20c4b0b49182`, plus catalog/Q835/Q836. Public Henry Main proof reproduced empty payment at the first optional prompt with a destination and `illegal-target` rejection without a destination (two failures / four conformance passes).

ST17-10's Main IR now separates the three placements into a leading CostGatedBlock, binds one exact Terriermon and references that host for both optional four-memory evolution and conditional Rush. It reuses the already proved declaration seam; generic cost-bearing Digivolve behavior is unchanged. The same public proofs now pay all three physical identities before the first optional evolution prompt or targetless completion, retain all three after public refusal, preserve hand/source zones, leave ten memory and grant no Rush without evolution. Focused conformance/card tests passed two files / twelve tests; comparative ST17/BT17/BT19/BT25/effects regression passed 197 files / 2405 tests. Scoped synchronization produced thirteen ST17 records, one semantic change and zero changes outside ST17. Independent read-only review found no blocker.

Full evidence is in the sole `docs/audits/ST17.md` ledger. Arbitrary stack order, multiple-host recipient/evolution proof, Rush lifecycle, mixed destination boundaries and the remaining generic action-cost shape inventory stay open. Porting this consumer does not certify all direct-action processing or the collection.

### ST17-10 selected-host continuation

Baseline `fdcd148ea`; sole consumer evidence in `docs/audits/ST17.md`. The existing public positive now includes neutral Agumon first, two exact Terriermon and Terriermon Assistant. Actual host-choice candidates contain exactly the two exact hosts. All three physical payments and the original base remain on the selected host after paid four-memory MegaGargomon evolution; Rush applies only there, all other stacks remain empty, trash is empty and no decision remains. Removing only Rush's selected-host reference reproduced one failure / five passes; restoring it passes six focused cases. Comparative ST17/BT17/conformance/effects proof passed 87 files / 1279 tests. Independent read-only review found no blocker.

This proves bound-host continuation and conditional Rush recipient for this consumer. Rush expiry and arbitrary player-selected stack order remain open; historical whole-card/collection certification remains reopened.

### Arbitrary compound bottom placement: historical red reproduction

Baseline `c1ad19382`; sole consumer evidence in `docs/audits/ST17.md`. Public exact-name Henry declaration reaches MegaGargomon/Rush with no pending decision but offers no ordering of Henry/Gargomon/Rapidmon despite printed `in any order`. Ordinary red: one failure / six passes at missing `orderCards` candidate list. The explicit `it.fails` is unresolved evidence, not certification; both reviewed name citation and printed order-clause guards run outside expected-failure capture.

Compound payment currently orders only all-return bottom-deck costs; other components execute sequentially. Existing order API supports `stackBottom`. The required shared seam must collect all physical payment identities and one destination host before movement, validate a full distinct permutation, preserve pre-existing sources, and commit paid order once. Manual public permutation/refusal/incomplete-proof on ST17-10 and BT17-085 remains required before removing the marker or claiming this obligation verified.

### Complete loose-placement batch preflight

Baseline `0eb36089c`. Preparing atomic mixed permanent/loose ordering exposed a lower mutation-seam defect: `placeUnder` moved the first valid material when a later material was missing, and a duplicate physical id could be removed again from the just-mutated destination stack. Real-primitives tests reproduced both (two failures / 146 passes). These are malformed/stale batch identity boundaries, not a normative permission to partially pay processing.

The primitive now requires a live destination top, distinct physical ids and an existing loose location for every requested material before the first removal. Read-only `peekLooseInstance` shares checked-card, resolving-Option, hand/security/deck/trash, battle and breeding stack/link locations with removal. There is no asynchronous interleave between preflight and moves; recomputation and placement reactions still occur only after the batch. The unchanged tests now pass 148 cases and require original hand, empty destination stack, empty result, no events and no placement reaction for both invalid batches.

Closing gates: full engine/cards regression passed 5046 files / 41314 tests with seven expected failures (41321 total): six existing EX13 markers and the explicit ST17-10 ordering gap. Full API typecheck, scoped Oxlint, changed-file Oxfmt, audit layout (4/4) and diff checks passed. Independent read-only review found no batch-location, interleave or duplicate-identity blocker.

This repairs loose-batch identity/atomicity as a prerequisite; arbitrary mixed permanent/loose ordering remains unresolved in ST17-10's explicit expected failure. No manual ordering, whole-card, complete cost-shape or collection certification is claimed.

### Atomic mixed-material bottom placement seam

Baseline `a56933b37`. Added optional `placeMixedMaterialsUnder` primitive as the movement half of ordered compound payment; card/IR consumers are not yet wired to it. Its ordered instance ids resolve to loose cards or battle-area permanent tops. Preflight requires a live destination, distinct requested ids, all material locations, movable distinct source permanents, no destination-as-material and no overlapping attached physical cards. Existing destination cards cannot also enter the payment.

Before any mutation it snapshots existing host sources and each whole-permanent material's stack/link/top block. It synchronously relocates/removes the complete validated batch, uses `replaceStack` for the supplied bottom-to-top group order beneath the unchanged existing host sources, then recomputes continuous state and awaits one canonical placement reaction carrying all added physical ids. Source permanent ledgers are dropped through existing relocation. Returns the requested material instances in input order; attached material cards remain in their source group.

Real-primitives proof passes 155 tests, including missing/duplicate material rejection, whole-source/attached-card overlap, restricted source, destination-as-material and positives with/without attached Tamer sources. Rejected cases retain sources/trash/host stacks with no movement events or placement reactions. Positives prove exact requested order, attached-source preservation, old-host-source preservation, physical source departure, empty trash and exactly one placement reaction with final ordered added ids. An initial runtime check caught unsupported ArraySchema flatMap and was corrected using a native snapshot, without suppressions.

Review identified movement events emitted during provisional placement. The mixed path now uses private silent relocation, installs final ordering and emits one aggregate `cardsMoved` event before recompute/onAdd. Existing relocation calls keep the default movement-event behavior. Positive tests assert exact aggregate movement identities and one canonical placement reaction; independent read-only re-review found no remaining blocker. Comparative effects/ST17/BT17/conformance regression passed 87 files / 1288 tests with the existing ordering expected failure (1289 total).

Closing gates: final focused real-primitives proof passed 155 tests. Final API typecheck, scoped Oxlint, changed-file Oxfmt, audit layout (4/4) and `git diff --check` passed. Card modules and persisted card IR remain unchanged.

This is the movement prerequisite, not a complete ordering implementation. Cost target/host collection, public order decisions, stale selections after those decisions, manual nondefault ST17-10/BT17-085 permutations, source-specific Tamer-attached-card rulings and breeding-top material support still require classification/proof. ST17-10's expected ordering failure remains intentional unresolved evidence; no card, collection or mechanism completion is claimed.

### Public ordered placement payment for ST17-10 and BT17-085

Baseline `240e5fcc9`. Added `Cost.orderPlacedCards` for an explicit first-permanent / bound-loose-material compound shape. The resolver collects the complete unpaid batch and one destination on local bindings, offers a public stack-bottom order, validates an exact distinct permutation, refreshes source/host/material identity and eligibility after the awaited choice, and calls the atomic mixed-placement primitive before committing parent bindings/paid state. Ordinary non-ordered compound and Digivolve paths retain their behavior.

Both printed any-order consumers now enable the policy. Manual public conformance for ST17-10 and BT17-085 offers exactly the three payment identities before any movement. Incomplete, duplicate and forged responses reject and retain the same decision/Tamer/materials/old host source. A nondefault second-material/Tamer/first-material permutation commits exactly beneath the pre-existing host source with empty trash, source departure, unchanged unevolved host, ten memory and no pending decision. The ST17-10 missing-order marker was removed; its former red test is now ordinary passing proof. Focused three-file proof passed 24 tests; final conformance including forged-order assertions passed eight tests.

Scoped ST17 synchronization against the baseline produced thirteen records, one semantic change and zero changes outside ST17. Attempting BT17 synchronization against the same baseline correctly refused the already authorized ST17 semantic change without writing it away; BT17 was then synchronized against the current document (102 records). Final semantic comparison to baseline has exactly `ST17-10` and `BT17-085` changed. Sole collection evidence stays in `docs/audits/ST17.md` and `docs/audits/BT17.md`. Independent read-only review found no blocker in these enabled shapes.

Final public matrix covers all six material permutations for each consumer. Full engine/cards regression passed 5046 files / 41324 tests with six existing EX13 expected failures (41330 total). Typecheck initially found the IR target source can be a single zone or list; both selection and revalidation now normalize through existing `zoneList`. For these two array-zone consumers runtime behavior is unchanged. Final ST17/BT17/effects/conformance regression after normalization and expanded matrix passed 195 files / 2404 tests; independent final read-only review found no new blocker.

Final delivery gates: full workspace shared/API/web typecheck, scoped Oxlint, changed-file Oxfmt, audit layout (4/4) and `git diff --check` passed.

This verifies the two public permutation/refusal boundaries, not all compound costs or the full mechanism. Multiple-candidate overlap/assignment, other ordered shapes, attached-Tamer source rulings, stale selection interactions, Rush expiry and complete collection fidelity remain open. Earlier expected-failure and unintegrated-seam paragraphs are historical checkpoints, superseded only by this bounded proof.

### Current primary-source check

On 2026-09-12, the [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf) identifies itself as version 4.2, updated 2026-08-18. Its §15-7-3 example specifies one Kimeramon and one Machinedramon; the local “126” extraction is not a valid numeric requirement. The current text retains no-partial-payment and payment-without-payload principles. §15-8-4-4-1 additionally requires performable payment before declaring an activation-type effect and mandatory performance after declaration. The [official BT14-090 ruling](https://world.digimoncard.com/rule/?card_no=BT14-090) confirms separable placement payment and evolution choice. These sources clarify audit obligations; they do not certify the current targetless Option gate or replace the committed KB fingerprints without a separate reviewed KB update.

## Borrowed force-cost processing proof (2026-09-13)

`BT23-060.ts` is the current printed consumer assigning
`borrowedEffectOverrides.forceCostProcessing: true` for its public
`[When Attacking]` `ActivateForeignEffect`. It borrows the face-up
`BT23-045` `[On Play]` clause. The borrowed clause has a placement processing
cost and a return payload; when the eligible card is in trash, that cost is
mandatory under the borrowed override, and when the trash branch is absent the
hand branch is still processed without a second consent prompt.

`apps/api/src/engine/conformance/activation-cost-borrowed-effects.test.ts`
proves both real public attack paths. After the attack and its security
resolution finish, it asserts the exact physical payment instance is at the
bottom of security, the opponent victim instance is in its owner's hand, the
machine remains in play, memory is unchanged, and no decision remains. The
completed decision trace contains no second optional consent for the borrowed
processing step. This proves the current BT23-060/BT23-045 consumer shape
only; it does not certify all borrowed effects or ordinary optional activation
costs.

The combined focused command
`pnpm --filter @aegis/api exec vitest run src/cards/BT23/BT23-060.test.ts
src/engine/conformance/activation-cost-borrowed-effects.test.ts` passed **23
tests** (2026-09-12). The colocated BT23-060 suite remains the normal-consumer
comparison and covers the face-up lender, once-per-turn, source-zone, and
non-Zaxon boundaries; the new two-case proof adds the forced-cost completion
assertions. Oxfmt, Oxlint, and `git diff --check` also passed for both changed
paths.

| Reviewed obligation                                      | Current evidence                                                                                     | Status                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| Borrowed processing cost is paid before payload          | BT23-060 public attack with BT23-043 trash payer                                                     | Focused green           |
| Hand fallback remains a single forced processing step    | BT23-060 public attack with BT23-015 hand payer                                                      | Focused green           |
| Payment identity and destination are preserved           | Both cases assert the exact payer instance at security bottom                                        | Focused green           |
| No duplicate optional consent / no pending decision leak | Both cases use `autoAcceptOptional: false` and assert zero optional requests and empty pending state | Focused green           |
| Other borrowed cost kinds and force assignments          | No additional current printed `forceCostProcessing` assignment found                                 | Open discovery boundary |
