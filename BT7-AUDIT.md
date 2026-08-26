# BT7 Card Implementation Audit

This ledger records static audits performed in newest-to-oldest order. Behavioral tests and broad gates are intentionally not claimed unless explicitly run.

## BT7-111 — Lucemon: Chaos Mode — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `packages/shared/src/cards/data/cards.json` identifies BT7-111 as a Purple level 5 Ultimate Digimon, play cost 14, 12000 DP, with Demon Lord/Seven Great Demon Lords traits and no printed standard evolution recipe.
2. **Alternate evolution (1/1):** The direct IR declares an alternate hand evolution from a named `Lucemon` at memory cost 7, marked `isAlternate: true` and `sourceZones: ["hand"]`, matching the printed “Your [Lucemon] can digivolve into this card in your hand for a memory cost of 7, ignoring this card's digivolution requirements.”
3. **Trash scaling (1/1):** The static `wouldBePlayed` replacement reduces hand play cost by 3 for every 10 cards in the owner's trash, with `zone: "trash"`, `controller: "mine"`, and `unit: "trash"`.
4. **On Play target branches (1/1):** The On Play delete uses separate opponent Tamer and opponent level-6-or-lower Digimon branches, avoiding the common flattened-filter bug that excludes Tamers due to their absent level.
5. **When Digivolving target branches (1/1):** The When Digivolving delete mirrors the same two correctly separated opponent target branches.
6. **Count and optionality (1/1):** Each delete action has `count: 1`; the printed effect does not say “up to” or “may,” so no optional flag is introduced.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-111` returns Q1678/Q1679 timing and alternate-evolution rulings plus Q4999/Q5002/Q5041 trash-evolution boundaries. No unresolved ambiguity was surfaced.
8. **Direct IR and registration (1/1):** `apps/api/src/cards/BT7/BT7-111.ts` declares `coverage: "full"`, an empty residual list, and exactly one `registerIrCard("BT7-111", compiled)` registration; no legacy `registerCard` call is present.
9. **Shared primitive trace (1/1):** The replacement, split OR-target representation, alternate evolution requirement, and trigger declarations are supported by the compiled interpreter schema and align with the adjacent BT7 target-branch repair.
10. **Reproducible behavioral proof (0/1):** The colocated test only proves deleting an opponent Tamer on play. It does not yet prove the alternate Lucemon evolution path, level-6 boundary, trash-count cost reductions, When Digivolving path, or negative target boundaries. Per audit scope, no tests were run or added in this pass.

### Evidence

```text
node tools/kb/query.mjs card BT7-111
rg -n 'BT7-111' packages/shared/src/cards/data/cards.json
rg -n 'register(Card|IrCard)\\(' apps/api/src/cards/BT7/BT7-111.ts
```

Remaining work is behavioral proof for the clauses listed in item 10; this card is not formally complete at 10/10.

## BT7-110 — Evolution Ancient — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a White Option with play cost 0 and the printed Hybrid color-waiver, level-4-to-Ten-Warriors evolution, and Security add-to-owner-hand text.
2. **Hybrid color waiver (1/1):** The Static `WaiveColorRequirement` is conditioned on a controller-owned battle-area Digimon carrying the `Hybrid` trait, matching Q1677's battle-area ruling.
3. **Main source target (1/1):** The Main `Digivolve` action selects exactly one of the owner's level-4 Digimon.
4. **Evolution target and zone (1/1):** The destination is one Digimon in hand with the `Ten Warriors` trait; `from: ["hand"]` is explicit.
5. **Color and level boundaries (1/1):** `colorsMatchDigivolvingSource: true` enforces matching colors while `ignoreLevelRequirement: true` bypasses only the destination level requirement.
6. **Cost and Security (1/1):** `payCost: true` pays the destination's printed evolution cost, and Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-110` returns Q1677; no unresolved ambiguity is surfaced.
8. **Direct IR and registration (1/1):** The module is `coverage: "full"`, has no residual clauses, and has exactly one `registerIrCard("BT7-110", compiled)` registration.
9. **Static primitive trace (1/1):** The waiver condition, level-4 selector, trait selector, source zone, color match, level bypass, and paid evolution are all represented by explicit compiled fields.
10. **Reproducible behavioral proof (0/1):** A colocated suite exists for same-color evolution and off-color rejection, but it was not executed in this static-only pass; waiver behavior and Security recovery are not directly covered there.

Remaining work is execution of the focused suite plus Hybrid waiver and Security boundary proof; this card is not formally complete at 10/10.

## BT7-109 — Dead or Alive — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Purple Option, play cost 8, with the printed trash-play Main effect, 10-card alternative, and Security activation.
2. **Default play branch (1/1):** The first compiled action plays exactly one owner Purple level-5 Digimon from `trash` without paying its memory cost.
3. **Alternative filter (1/1):** The alternative selects exactly one owner Digimon with `Lucemon` in its name from `trash`, matching the printed name condition.
4. **Threshold (1/1):** The alternative is conditioned on the owner's trash count being greater than or equal to 10.
5. **Optionality and instead semantics (1/1):** The alternative is explicitly `optional: true` and `instead: true`, preserving the ruling that the normal level-5 branch remains available when the optional alternative is declined.
6. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-109` returns Q1676, confirming the 10+ trash alternative does not remove the ability to choose the ordinary Purple level-5 play.
8. **Direct IR and registration (1/1):** The module has `coverage: "full"`, an empty residual list, and exactly one `registerIrCard("BT7-109", compiled)` registration.
9. **Static primitive trace (1/1):** Both actions use explicit `from: ["trash"]`, `payCost: false`, controller ownership, exact count, and the threshold/name/level/color filters required by the card text.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only the ordinary Purple level-5 play and was not executed in this static-only pass; the 10-card optional choice, decline fallback, and Security path remain unproven.

Remaining work is behavioral proof of the alternative and fallback branches plus Security activation; this card is not formally complete at 10/10.

## BT7-108 — Schwarz Lehrsatz — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies BT7-108 as a Purple Option costing 6 with the Hybrid/Tamer scaling deletion and Security Main activation.
2. **Main timing and recipient (1/1):** The compiled Main effect deletes opposing Digimon only.
3. **Level boundary (1/1):** The deletion target is explicitly an opponent Digimon with level `lte 5`.
4. **Scaling population (1/1):** Scaling counts owner battle-area cards from the union of Hybrid-trait Digimon and Tamers.
5. **Pairing ruling (1/1):** The single scaling population produces one deletion per qualifying card, not one per Hybrid/Tamer pair, matching Q1675.
6. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-108` returns Q1675, with no unresolved ambiguity.
8. **Direct IR and registration (1/1):** The module has full compiled coverage, an empty residual list, and exactly one `registerIrCard("BT7-108", compiled)` registration.
9. **Static primitive trace (1/1):** The target controller/kind/level filter, battle-area scaling zone, Hybrid trait branch, Tamer branch, and unit `cards` are explicit.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only a basic deletion and was not executed in this static-only pass; multi-source scaling, exact level boundary, mixed trait population, and Security behavior remain unproven.

Remaining work is behavioral proof of Q1675 scaling and all applicable boundaries; this card is not formally complete at 10/10.

## BT7-107 — Calling From the Darkness — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Purple Option costing 1 with Main deletion/recovery text and Security add-to-owner-hand text.
2. **Deletion (1/1):** Main first deletes exactly one of the owner's Digimon, with no accidental color or level restriction.
3. **Recovery filter (1/1):** The second action returns up to two owner Purple Digimon cards from trash to hand.
4. **Ordering and self-return (1/1):** Delete precedes Return, allowing the deleted Purple Digimon to be selected from trash as confirmed by Q1673.
5. **Up-to and destination (1/1):** `count: 2`, `upTo: true`, and `to: "hand"` encode the printed upper bound and destination.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Rules evidence (1/1):** The KB returns Q1673/Q1674 and linked-card rulings Q5615/Q5643/Q5648, plus the restriction to one copy since 2022-11-11. The pending On Deletion behavior is delegated to shared zone/event handling; no card-local approximation is present.
8. **Direct IR and registration (1/1):** The module is full compiled IR with no residuals and exactly one `registerIrCard("BT7-107", compiled)` registration.
9. **Static primitive trace (1/1):** Controller, kind, Purple color, trash zone, count, ordering, and destination are explicit.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only one ordinary delete-and-return case and was not executed in this static-only pass; up-to-zero, non-Purple exclusion, On Deletion pending behavior, and Security recovery remain unproven.

Remaining work is behavioral proof of the Q1673/Q1674 boundaries and the current restriction's deck-validation integration; this card is not formally complete at 10/10.

## BT7-106 — Brave Metal — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 5 with the ordinary play-cost deletion, conditional alternative, and Security Main activation.
2. **Ordinary target (1/1):** Modal option one deletes exactly one opponent Digimon with play cost 6 or less.
3. **Loaded condition (1/1):** The alternative requires an owner battle-area Digimon with at least five digivolution cards and the `X-Antibody` trait.
4. **Alternative target (1/1):** Option two deletes exactly one opponent Digimon whose `X-Antibody` trait is negated, with no play-cost ceiling, matching the printed “instead.”
5. **Optionality and replacement (1/1):** The alternative is represented as a modal choice with `choose: 1`, conditionally offered only when loaded, and the second branch replaces the ordinary branch.
6. **Security behavior (1/1):** Security reuses the same Main modal effect through `isSecurity: true` and does not duplicate divergent logic.
7. **Knowledge base (1/1):** The KB returns Q1671/Q1672, confirming the ordinary low-cost target remains legal regardless of loaded status and the alternative permits higher-cost non-X targets.
8. **Direct IR and registration (1/1):** The module has full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-106", compiled)` registration.
9. **Static primitive trace (1/1):** Digivolution-card count, trait condition, play-cost upper bound, negated trait filter, controller, count, modal choice, and replacement semantics are explicit.
10. **Reproducible behavioral proof (0/1):** Existing tests cover the ordinary and loaded alternative paths but were not executed in this static-only pass; exact boundaries, refusal, Security, and mixed X/non-X target pools remain unproven here.

Remaining work is behavioral proof of Q1671/Q1672 boundaries and modal/Security behavior; this card is not formally complete at 10/10.

## BT7-105 — Pride Memory Boost! — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 4 with reveal/play/trash, Delay, and Security placement text.
2. **Reveal and play (1/1):** Main reveals 3 cards and optionally plays one owner Black Digimon with play cost 4 or less without memory cost.
3. **Remaining cards (1/1):** `rest: "trash"` sends all unrecruited revealed cards to trash, including when no eligible card is played, matching Q1670.
4. **Placement (1/1):** Main places this card in its battle area after the reveal sequence; Security places it in its owner's battle area.
5. **Delay (1/1):** A separate Main effect with `Delay` gains 2 memory; the engine's Delay lifecycle supplies trash-as-cost and same-turn activation prevention as documented in the module.
6. **Knowledge base (1/1):** The KB returns Q1670, confirming placement is independent of whether an eligible revealed Digimon is played.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-105", compiled)` registration are present.
8. **Static primitive trace (1/1):** Reveal count, Black filter, play-cost ceiling, optional play, free cost, rest destination, self-placement, Delay keyword, and Security placement are explicit.
9. **Ordering and ownership (1/1):** The reveal action precedes self-placement, and all card movement uses owner/controller defaults consistent with the printed text.
10. **Reproducible behavioral proof (0/1):** A colocated test exists but was not executed in this static-only pass; no proof is claimed for no-eligible/no-play trash handling, exact reveal boundaries, Delay timing, or Security placement.

Remaining work is behavioral proof of Q1670 and Delay/Security lifecycle boundaries; this card is not formally complete at 10/10.

## BT7-104 — Metal Cannon — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 2 with X-Antibody selection, draw scaling, and Security return-to-hand text.
2. **Selection (1/1):** Main selects exactly one owner Digimon carrying the `X-Antibody` trait and binds that choice.
3. **Scaling source (1/1):** Draw amount is one per digivolution card of the chosen Digimon, using the bound reference rather than a later or global source.
4. **Draw and Security (1/1):** The action draws from the owner's deck; Security uses `AddToHandSelf`.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-104` reports no rulings, errata, restrictions, or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-104", compiled)` registration are present.
7. **Static primitive trace (1/1):** Trait filter, owner controller, exact selection count, bind identity, per-card unit, and digivolution-card scaling are explicit.
8. **Reference fidelity (1/1):** `boundRef: "xAntibodyTarget"` ensures the draw count remains tied to the selected Digimon through effect resolution.
9. **Clause completeness (1/1):** All printed Main and Security clauses have direct IR representations; no optionality or duration clause is omitted.
10. **Reproducible behavioral proof (0/1):** A colocated test exists but was not executed in this static-only pass; zero-source, multi-source, non-X rejection, deck-boundary, and Security behavior remain unproven.

Remaining work is behavioral proof of selection and exact draw boundaries; this card is not formally complete at 10/10.

## BT7-103 — Mugen — 8/10 (static audit; fidelity finding)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 4 with Main suspend/restriction and Security suspend text.
2. **Main suspend (1/1):** The Main effect suspends exactly one opponent Digimon.
3. **Restriction duration (1/1):** The restriction uses `unsuspend` through the opponent's next unsuspend phase (`untilOpponentTurnEnd`).
4. **Security behavior (1/1):** Security suspends exactly one opponent Digimon.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-103` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-103", compiled)` registration are present.
7. **Static primitive trace (1/1):** Controller, Digimon kind, exact count, restriction type, and duration are explicit.
8. **Target identity fidelity (0/1):** The printed text says “That Digimon,” but the Restrict action has an independent opponent-Digimon selector rather than a bound reference to the Digimon suspended by the preceding action. Unless the shared sequential target semantics implicitly preserve identity (not established statically), the restriction can select a different Digimon.
9. **Clause completeness (1/1):** Both Main and Security clauses are represented, subject to the identity concern above.
10. **Reproducible behavioral proof (0/1):** Existing tests were not executed in this static-only pass; same-target enforcement, duration, and Security boundaries remain unproven.

Remaining work is to bind the suspended target into the Restrict action (or establish an engine guarantee that sequential selectors preserve it), then add behavioral proof. This card is not formally complete at 10/10.
