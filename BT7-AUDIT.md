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
