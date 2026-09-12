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

### Payable processing without subsequent content

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

The expected failure is intentional audit evidence, not a passing obligation or completion certificate. Its source fingerprint is checked in a hook outside the expected-failure body, so citation drift remains a real suite failure; cleanup completes any pending public optional refusal. A mandatory-payment fix must remove the marker, prove no post-declaration refund and preserve triggered/Option processing choices. Direct action costs, whole-effect costs, borrowed effects, nested optional costs, all 63 discovered modules and complete activation-type inventory remain open.

Closing gates: `pnpm --filter @aegis/api exec vitest run src/engine src/cards --maxWorkers=1 --no-file-parallelism` completed with 5045 passing files / 41302 passing tests and seven expected failures (41309 total). The final conformance run after the source-hook and Option-proof additions passed 31 files / 424 tests with one expected failure (425 total); final focused processing proofs passed three tests with that same unresolved expected failure. Full API typecheck, scoped Oxlint, Oxfmt for all five changed files, audit layout (4/4) and `git diff --check` passed. These are regression results, not proof of the seven unresolved contracts.

Independent read-only review found no blocker in the bounded §15-7-5 repair and final Option acceptance/refusal proofs, confirming that condition/payability and exact destination gates remain. No complete mechanism, card or collection certification is claimed.

### Current primary-source check

On 2026-09-12, the [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf) identifies itself as version 4.2, updated 2026-08-18. Its §15-7-3 example specifies one Kimeramon and one Machinedramon; the local “126” extraction is not a valid numeric requirement. The current text retains no-partial-payment and payment-without-payload principles. §15-8-4-4-1 additionally requires performable payment before declaring an activation-type effect and mandatory performance after declaration. The [official BT14-090 ruling](https://world.digimoncard.com/rule/?card_no=BT14-090) confirms separable placement payment and evolution choice. These sources clarify audit obligations; they do not certify the current targetless Option gate or replace the committed KB fingerprints without a separate reviewed KB update.
