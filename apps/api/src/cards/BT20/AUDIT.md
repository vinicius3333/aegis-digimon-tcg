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

## BT20-004 — Pinamon

- Catalog contract: green level 2 Bird/ACCEL Digi-Egg; inherited optional `[Your Turn] [Once Per Turn]` watcher lets this Digimon digivolve from hand into an ACCEL Digimon for 2 less when one of your ACCEL Digimon is played.
- Knowledge base: no card-specific entries; the printed trigger, trait, destination, reduction, and optionality are unambiguous.
- Implementation evidence: `BT20-004.ts` registers only with `registerIrCard`; its inherited continuous watcher subscribes to controlled Digimon play events filtered to ACCEL, carries the your-turn and once-per-turn scope onto the subscription, and executes an optional self-targeted hand digivolution with `reduceCost: 2`. The digivolve primitive folds that positive legacy reduction into a signed cost delta and uses normal evolution requirements.
- Peer/stack evidence: the focused test uses Pinamon under ACCEL Liollmon, plays a second ACCEL Liollmon, and observes the host evolve into ACCEL Liamon without paying its alternate cost; playing non-ACCEL Ryudamon leaves the same stack unchanged.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-004.test.ts` — 2 passed.
- Clause scores: your-turn play trigger 2/2; ACCEL source predicate 2/2; optional self evolution from hand 2/2; ACCEL destination and legal stack transition 2/2; once-per-turn/cost reduction observable state 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-004.test.ts`).

## BT20-005 — Kapurimon

- Catalog contract: black level 2 Lesser/LIBERATOR Digi-Egg; inherited `[Your Turn]` effect grants this Digimon Jamming for the turn when it checks a security card that was already face up.
- Knowledge base: Q4284 establishes security-effect priority when the face-up-check trigger is simultaneous with other security/removal triggers; this effect's event timing remains pending after immediate Security effects.
- Implementation evidence: `BT20-005.ts` registers only through `registerIrCard`; its inherited your-turn watcher subscribes to `whenCheckedFaceUpSecurity` and grants Jamming to self for the turn. The security-check primitive snapshots `faceUp` before revealing, fires this event only for an already-face-up card, and includes the attacker identity; the subscription preserves your-turn scope.
- Peer/stack evidence: the focused test attacks with Kapurimon in a realistic evolution stack against identical security cards in face-up and face-down states. Only the pre-existing face-up check produces an observable Jamming grant.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-005.test.ts` — 2 passed.
- Clause scores: inherited/your-turn scope 2/2; face-up-before-check boundary 2/2; checking Digimon identity/self target 2/2; Jamming keyword 2/2; for-the-turn observable grant and negative path 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-005.test.ts`).

## BT20-006 — DemiMeramon

- Catalog contract: purple level 2 Flame/LIBERATOR Digi-Egg; inherited optional `[On Deletion]` returns 1 Ghost-trait Digimon card from your trash to hand.
- Knowledge base: Q4285/Q4286/Q5905 establish that inherited deletion effects are pending for the deleted top card's trash object: moving that top card before another pending effect activates invalidates the latter, while moving a source card formerly underneath does not. This card's single recovery clause needs no invented ordering rule.
- Implementation evidence: `BT20-006.ts` registers only through `registerIrCard`; its inherited OnDeletion action selects one controlled-trash Digimon with exact Ghost trait matching, optionally returns it to hand, and uses the deletion engine's captured inherited-effect source.
- Peer/stack evidence: the focused test deletes a Bakemon stack containing DemiMeramon in battle, with Ghostmon and a near-zone non-Ghost Ryudamon in trash. It observes only Ghostmon move to the controller's hand and confirms no opponent-zone leakage.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-006.test.ts` — 2 passed.
- Clause scores: inherited On Deletion timing 2/2; optionality 2/2; one-card boundary 2/2; Ghost Digimon predicate 2/2; controller trash-to-hand zones and stack provenance 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-006.test.ts`).

## BT20-007 — Dracomon

- Catalog contract: red level 3 Dragon Digimon, play cost 3/1000 DP, normal red level-2 evolution cost 0 plus alternate Bebydomon cost 0; optional start-of-your-main-phase processing condition trashes 1 Dracomon/Examon-text card from hand to draw 1 and gain 1 memory; inherited your-turn +2000 DP.
- Knowledge base: Q4290 confirms either Dracomon or Examon text is a valid trash payment; Q4291 defines the full “in its text” union across printed identity/effect/requirement fields.
- Implementation evidence: the prior IR made the `By trashing` payment mandatory and allowed the trailing memory gain after refusal. The Draw cost is now optional with `abortOnDecline`, so refusing aborts the whole processing-conditioned effect; the existing text filter, Draw, GainMemory, inherited continuous DP modifier, alternate requirement, and exclusive `registerIrCard` registration remain intact.
- Peer/stack evidence: the focused test accepts the effect to move a matching Dracomon from hand to trash, draw the deck top, and gain exactly 1 memory; a decline leaves all zones and memory unchanged. A Dracomon evolution source under Ginryumon gains +2000 DP on its controller's turn and loses it on the opposing turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-007.test.ts` — 3 passed.
- Clause scores: evolution requirements/stats 2/2; optional matching-text trash cost 2/2; draw and memory results 2/2; inherited self +2000 DP 2/2; start-main/your-turn and stack observability 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-007.test.ts`).

## BT20-008 — Huckmon

- Catalog contract: red level 3 Mini Dragon Digimon, play cost 3/1000 DP and red level-2 evolution cost 0; optional start-of-your-main-phase processing condition trashes 1 Huckmon/Sistermon-name or Royal Knight-trait card from hand to draw 1 and gain 1 memory; inherited your-turn aura gives all your Digimon +1000 DP.
- Knowledge base: no card-specific entries; name matching and exact Royal Knight trait matching follow the shared definition matcher.
- Implementation evidence: the previous IR made the `By trashing` payment mandatory and could continue to memory gain after refusal. The Draw cost is now optional with `abortOnDecline`; the name/trait alternatives, Draw, GainMemory, all-allied continuous DP target, durations, and exclusive `registerIrCard` registration are otherwise faithful.
- Peer/stack evidence: a mixed hand contains a Huckmon name match, Examon Royal Knight trait match, and Ryudamon non-match; exactly one valid card is paid, the nonselected cards remain, and refusal changes no zone or memory. An evolved host and a separate allied Digimon both gain +1000 while an opponent does not, and the aura clears off-turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-008.test.ts` — 3 passed.
- Clause scores: stats/evolution 2/2; optional name-or-trait trash cost 2/2; draw/memory and refusal 2/2; allied all-target +1000 DP 2/2; inherited your-turn stack scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-008.test.ts`).

## BT20-009 — Veemon

- Catalog contract: red level 3 Free-attribute Mini Dragon Digimon, play cost 3/1000 DP, red or purple level-2 evolution cost 0; your-turn watcher optionally evolves self from hand into a Free-trait Digimon for 1 less when an allied purple Digimon is played; inherited your-turn +2000 DP.
- Knowledge base: no card-specific entries; color and structural Free matching use the shared catalog predicates.
- Implementation evidence: the generated triggered Digivolve omitted `payCost`, silently waiving the entire evolution cost rather than reducing it by 1. It now explicitly pays the legal cost with a -1 folded delta; the purple controlled-play watcher, optional self target, Free destination, hand source, inherited DP effect, and exclusive `registerIrCard` registration remain faithful.
- Peer/stack evidence: playing purple ST6-03 alongside Veemon observably evolves it into BT20-011 ExVeemon and spends exactly 1 evolution memory after the reduction; playing black BT20-010 does not trigger. Veemon under an evolved host grants +2000 only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-009.test.ts` — 3 passed.
- Clause scores: stats/evolution colors 2/2; your-turn purple allied-play trigger 2/2; optional Free hand evolution 2/2; exact reduced payment 2/2; inherited self DP and stack scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-009.test.ts`).
