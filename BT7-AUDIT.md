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
