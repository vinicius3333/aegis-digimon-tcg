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

## BT20-002 — Bebydomon

- Catalog contract: blue level 2 Digi-Egg; inherited `[When Attacking] [Once Per Turn]` draws 1 if this Digimon has Dracomon or Examon in its text.
- Knowledge base: Q4281 defines “in its text” across name, traits, effects, inherited effects, rule text, and evolution/combination requirements; Q4282 confirms either Dracomon text or Examon text satisfies this card.
- Implementation evidence: `BT20-002.ts` registers only through `registerIrCard`; its inherited `WhenAttacking` effect is once per turn and executes `Draw(1)` behind `selfTopHasText` with Dracomon/Examon text references. The interpreter resolves the inherited source's live top card and delegates the complete text-union match to `matchNameOrTrait`; effect registration maps `WhenAttacking` to `OnUseAttack` and sets `maxPerTurn: 1`.
- Peer/stack evidence: the focused test uses a mixed pair of realistic stacks: Bebydomon under BT20-007 Dracomon matches by name and draws, while the same egg under BT20-010 Ryudamon does not. A second production timing fire on the matching stack proves the once-per-turn counter prevents another draw.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-002.test.ts` — 2 passed.
- Clause scores: inherited timing 2/2; Dracomon/Examon text predicate 2/2; draw amount/controller 2/2; once-per-turn identity 2/2; positive/negative evolution-stack observability 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-002.test.ts`).

## BT20-003 — Bibimon

- Catalog contract: yellow level 2 Digi-Egg with Abadin Electronics/SEEKERS traits; inherited optional end-of-your-turn once-per-turn effect places 1 of your field Tamers with Pulsemon in its text or the SoC/SEEKERS trait as this Digimon's bottom digivolution card, only while its stack has no Tamer.
- Knowledge base: Q4283 defines “in its text” across the card's full printed identity and requirements; the catalog wording otherwise has no unresolved ambiguity.
- Implementation evidence: the previous IR incorrectly treated the Tamer as a loose card and allowed choosing another host, omitted the no-Tamer stack gate, and did not ensure bottom placement. The corrected `targetIsPermanent` action relocates a matching controlled field Tamer specifically under self, uses the reusable `digivolutionStackKindExclude` host filter, and makes permanent relocation honor `position: "bottom"`; registration remains exclusively `registerIrCard`.
- Peer/stack evidence: the focused test uses BT20-089 (SoC/SEEKERS) alongside a Bibimon evolution stack, proves the field Tamer leaves the battle area and becomes the true bottom card, and proves an existing Tamer card in the host stack blocks the effect.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-003.test.ts` — 2 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts` — 173 passed.
- Clause scores: inherited/end-of-turn/once-per-turn timing 2/2; optional qualifying Tamer selection 2/2; self destination 2/2; no-Tamer stack gate 2/2; bottom placement and observable relocation 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-003.test.ts`).
