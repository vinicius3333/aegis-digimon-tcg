# BT20 Card Audit Ledger

## BT20-001 — DemiVeemon

- Catalog contract: red level 2 Digi-Egg; inherited `[Your Turn]` clause gives this Digimon +2000 DP while it has at least 4 digivolution cards.
- Knowledge base: `node tools/kb/query.mjs card BT20-001` returned no card-specific entries; no ambiguity remains in the printed clause.
- Implementation evidence: `BT20-001.ts` registers only through `registerIrCard`; its inherited `YourTurn` effect targets self, applies `ModifyDP(2000)`, and uses `selfDigivolutionCountAtLeast(4)`. The interpreter routes `YourTurn` through the continuous/static seam, counts `Permanent.stack.length` (excluding the top card), resolves self through the permanent targeter, and rebuilds continuous DP modifiers on recomputation.
- Peer/stack evidence: the focused test places DemiVeemon under otherwise neutral BT20 Digimon stacks with exactly 4 and exactly 3 digivolution cards, proving the inclusive boundary and non-match; changing turn ownership proves the modifier is scoped to the controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-001.test.ts` — 2 passed.
- Clause scores: inherited timing 2/2; self target 2/2; 4-or-more boundary 2/2; +2000 DP amount 2/2; evolution-stack/turn-scope observability 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-001.test.ts`).
