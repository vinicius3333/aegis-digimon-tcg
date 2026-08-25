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

## BT20-010 — Ryudamon

- Catalog contract: red/black level 3 Vaccine Beast/X Antibody/Chronicle Digimon, play cost 3/1000 DP, red or black level-2 evolution cost 1 plus black X Antibody level-2 alternate cost 0; while in the battle area on your turn, its evolution into Ginryumon or Chronicle costs 1 less; inherited your-turn +2000 DP.
- Knowledge base: Q4292 binds the reduction to the battle area and explicitly excludes the breeding area.
- Implementation evidence: `BT20-010.ts` registers only through `registerIrCard`; its your-turn `wouldDigivolve` replacement is self-bound to `zone: "battleArea"`, filters the destination by Ginryumon name or Chronicle trait, and reduces cost by exactly 1. The alternate requirement and inherited continuous DP action map the remaining clauses.
- Peer/stack evidence: identical Ryudamon-to-Ginryumon public evolution intents pay 2 memory in battle (normal cost 3 minus 1) and 3 in breeding, directly proving Q4292. A separate Chronicle evolution stack proves the inherited +2000 appears only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-010.test.ts` — 3 passed.
- Clause scores: stats/normal evolution 2/2; alternate X Antibody evolution 2/2; battle-only destination-filtered reduction 2/2; Q4292 breeding negative 2/2; inherited your-turn DP/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-010.test.ts`).

## BT20-011 — ExVeemon

- Catalog contract: red level 4 Free-attribute Mythical Dragon, play cost 4/4000 DP, red or purple level-3 evolution cost 2; On Play/When Digivolving deletes 1 opposing Digimon at 3000 DP or less, then on your turn optionally DNA digivolves 2 of your Digimon into a hand Digimon named Imperialdramon or with Free trait while paying cost; inherited your-turn +2000 DP.
- Knowledge base: Q6017 confirms the activated effect finishes its “then” processing even if ExVeemon leaves the battle area during immediate processing caused by the first deletion.
- Implementation evidence: the hand-fixed IR correctly shares one sequential body across both triggers, uses an exact 3000-DP deletion ceiling, then a condition-gated optional two-material `DnaDigivolve` with hand destination filtering and `payCost: true`; effect resolution contexts survive source relocation per Q6017. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: playing ExVeemon beside a purple level-4 material deletes the 3000-DP target but preserves a 4000-DP peer, then merges both allied materials into Free-trait Paildramon and pays its recorded cost. An ExVeemon source under Paildramon observably grants +2000 only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-011.test.ts` — 3 passed.
- Clause scores: stats/evolution 2/2; dual On Play/When Digivolving timing 2/2; deletion target/boundary 2/2; conditional optional paid two-material DNA and destination 2/2; inherited DP/stack and continued resolution 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-011.test.ts`).

## BT20-012 — Ginryumon

- Catalog contract: red/black level 4 Vaccine Beast Dragon/X Antibody/Chronicle Digimon, play cost 5/6000 DP, red or black level-3 evolution cost 3 plus Ryudamon or Chronicle level-3 alternate cost 2; When Attacking may evolve self from hand into Hisyaryumon or Chronicle; inherited your-turn +2000 DP.
- Knowledge base: no card-specific entries; the optional evolution still pays its printed cost because no waiver or reduction is printed.
- Implementation evidence: the generated action omitted `payCost`, making the attack-triggered evolution free. It now explicitly pays and selects the matching alternate requirement before evolving; the self target, hand source, name/trait destination union, optionality, alternate base requirements, inherited DP action, and exclusive `registerIrCard` registration remain faithful.
- Peer/stack evidence: a Ginryumon/Ryudamon evolution stack attacks and observably evolves into Hisyaryumon for its 3-memory alternate cost while retaining its sources; a hand ExVeemon non-match leaves the attacker unchanged. Ginryumon under Hisyaryumon grants +2000 only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-012.test.ts` — 3 passed.
- Clause scores: stats/normal evolution 2/2; two alternate requirements 2/2; When Attacking optional self evolution 2/2; destination filter/paid hand transition 2/2; inherited DP/turn and stack preservation 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-012.test.ts`).

## BT20-013 — BaoHuckmon

- Catalog contract: red level 4 Data Dinosaur, play cost 5/5000 DP and red level-3 evolution cost 2; `[Main] [Once Per Turn]` may play one Sistermon/Gankoomon-name Digimon from hand with its paid play cost reduced by 2; inherited your-turn aura gives all your Digimon +1000 DP.
- Knowledge base: Q4293 forbids combining two simultaneous card-playing activations; Q4294 confirms the inline -2 stacks with Gankoomon's own -4; Q4295 says cost-reduction locks preserve the play but suppress the reduction; Q4296 says effect-play locks allow activation but prevent the play.
- Implementation evidence: the prior IR attempted to install a `wouldBePlayed` replacement after the play action, so the reduction could not affect its own play. The correction folds `reduceCostBy: 2` into the optional paid `PlayWithoutCost` action; the once-per-turn activation identity, exact name filter, hand zone, inherited aura, and exclusive `registerIrCard` registration remain intact. The play primitive applies reductions inline and respects global play/reduction restrictions required by Q4295/Q4296.
- Peer/stack evidence: the public Main activation plays Sistermon Ciel (Awakened) for 3 instead of 5 while leaving nonmatching Ryudamon in hand, and a second activation in the same turn is rejected. BaoHuckmon under SaviorHuckmon buffs both allied Digimon by +1000, never the opponent, and clears off-turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-013.test.ts` — 3 passed.
- Clause scores: stats/evolution 2/2; Main optional name/zone selection 2/2; exact inline paid reduction 2/2; once-per-turn activation 2/2; inherited allied aura/turn scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-013.test.ts`).

## BT20-014 — SaviorHuckmon

- Catalog contract: red level 5 Data Dragonkin, play cost 7/7000 DP and red level-4 evolution cost 3; On Play/When Digivolving deletes 1 opposing Digimon at 5000 DP or less; End of Your Turn may suspend another allied Digimon to evolve self from hand into Jesmon without cost; inherited your-turn grants Alliance only when the host is Royal Knight.
- Knowledge base: no card-specific entries; “By suspending” is the optional processing cost and must not suspend self.
- Implementation evidence: `BT20-014.ts` exclusively registers through `registerIrCard`; both entry timings share the exact deletion boundary, the end-turn Digivolve is self/hand/Jesmon filtered with `payCost: false`, an exclude-self suspend cost, optional refusal/abort semantics, and the inherited continuous keyword action reads the host's live Royal Knight trait.
- Peer/stack evidence: playing SaviorHuckmon deletes a 5000-DP target while preserving a 6000-DP peer; its end-turn resolution suspends a different ally and evolves into BT20-017 Jesmon without additional memory. SaviorHuckmon under Jesmon gains Alliance, while the same source under Chronicle Hisyaryumon does not, and the grant clears off-turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-014.test.ts` — 3 passed.
- Clause scores: stats/evolution 2/2; dual deletion timings/boundary 2/2; optional other-Digimon suspend cost 2/2; free Jesmon hand evolution/end-turn timing 2/2; inherited Royal Knight Alliance/turn scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-014.test.ts`).

## BT20-015 — Hisyaryumon

- Catalog contract: red/black level 5 Vaccine Beast Dragon/X Antibody/Chronicle, play cost 7/7000 DP, red or black level-4 evolution cost 4 plus Ginryumon or Chronicle level-4 alternate cost 3; On Play/When Digivolving may play Dorumon/Ryudamon from hand into empty breeding for free, then if resolving during any attack gives one allied Digimon Security Attack +1 and +5000 DP until the opponent turn ends; inherited your-turn suppresses Option Security effects checked by the host.
- Knowledge base: Q4715 confirms “during an attack” includes resolution during an opponent's attack, not merely an attack by the controller.
- Implementation evidence: the prior IR incorrectly played the rookie to the battle area and installed a future `whenAttacking` watcher, allowing a later attack to grant the bonus even when the entry effect had not resolved during that attack. The corrected dual-timing bodies play to an explicitly empty breeding slot and evaluate `duringAttack` immediately; one bound selection receives both modifiers. The inherited suppression and exclusive `registerIrCard` registration remain intact.
- Peer/stack evidence: Ginryumon's When Attacking evolution reaches Hisyaryumon during the live attack, plays Ryudamon into empty breeding, and grants both modifiers to the same attacker. An occupied breeding slot preserves its resident and the hand candidate; Hisyaryumon under Royal Knight Jesmon suppresses an Option Security effect only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-015.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual entry timings and optional rookie filter 2/2; empty breeding/free placement 2/2; immediate during-attack bound bonus/duration 2/2; inherited Option Security suppression/turn scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-015.test.ts`).

## BT20-016 — Paildramon

- Catalog contract: red/purple level 5 Free Dragonkin, play cost 8/8000 DP and red or purple level-4 evolution cost 4; On Play/When Digivolving gives one allied Digimon Piercing and +4000 DP for the turn, then self may attack; at all times an impending deletion of an allied Paildramon/Dinobeemon may instead DNA evolve two allied Digimon into Imperialdramon: Dragon Mode in hand; inherited Security Attack +1.
- Knowledge base: Q4297 permits applying the complete buff and declining the subsequent attack; Q4298 forbids declaring the granted attack while another attack is already in progress; Q4299 establishes that using the leaving Digimon as DNA material means the newly merged Digimon does not leave.
- Implementation evidence: both entry timings bind the chosen keyword recipient and reuse it for the DP modifier, followed by a separately optional self attack. The shared `GainKeyword` primitive now honors its declared `bindAs` contract just like other targeted actions. The all-turn replacement matches either protected name and performs an optional paid two-material DNA evolution; registration remains exclusively `registerIrCard`.
- Peer/stack evidence: the focused test plays Paildramon, observes Piercing and +4000 on the same chosen ally while declining the attack, then independently deletes a field Paildramon beside Dinobeemon and observes both become sources under BT20-076 Dragon Mode rather than the result leaving. A realistic host stack observes inherited Security Attack +1.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-016.test.ts` — 4 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts` — 173 passed.
- Clause scores: stats/evolution 2/2; dual entry timing and same-target buff 2/2; separately optional/legal attack 2/2; deletion replacement and Q4299 DNA survival 2/2; inherited Security Attack/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-016.test.ts`).

## BT20-017 — Jesmon

- Catalog contract: red level 6 Data Holy Warrior/Royal Knight, play cost 11/11000 DP and red level-5 evolution cost 3; On Play/When Digivolving may create one white 6000-DP Atho, René & Por Digimon token with Reboot, Blocker, and Decoy (Red/Black); on your turn once per turn, playing another allied Digimon deletes one opposing Digimon at 8000 DP or less, then one allied Digimon may attack.
- Knowledge base: no card-specific entries; the printed token descriptor, sequential “then,” other-Digimon trigger, optional actions, and once-per-turn scope are unambiguous.
- Implementation evidence: the prior generated token name retained a mojibake escape that did not resolve the token registry and omitted all token keywords; its watcher also placed Attack outside the `whenPlayed` body, causing it to execute during continuous installation rather than after deletion. Both entry effects now use the canonical token descriptor with all keyword metadata, and Delete/optional Attack resolve sequentially inside the filtered watcher; registration remains exclusively `registerIrCard`.
- Peer/stack evidence: the token path observes the canonical 6000-DP token and all three runtime keywords. A separate field Jesmon sees another Digimon played, deletes exactly the 8000-DP boundary while preserving a 9000-DP peer, permits declining the attack without suspension, and ignores a second qualifying play that turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-017.test.ts` — 3 passed.
- Clause scores: stats/evolution 2/2; dual optional token timings 2/2; complete token identity/stats/keywords 2/2; other-Digimon trigger/delete boundary 2/2; sequential optional attack/once-per-turn scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-017.test.ts`).

## BT20-018 — Ouryumon

- Catalog contract: red/black level 6 Vaccine Beast Dragon/X Antibody/Chronicle, play cost 12/11000 DP and red or black level-5 evolution cost 3; Piercing; On Play/When Digivolving De-Digivolve 2, then during an attack may evolve a breeding Digimon into a level-6-or-lower Chronicle card from hand/trash for free; all turns once per turn, security removal deletes one opposing lowest-DP Digimon; inherited once-per-turn attack by Alphamon: Ouryuken trashes opposing top security.
- Knowledge base: Q4300 says the breeding evolution does not trigger `[When Digivolving]`; Q4301 gives immediate Security effects priority over the simultaneously pending removal watchers; Q4716 confirms “during an attack” includes evolution caused during an opponent's attack.
- Implementation evidence: the generated entry bodies incorrectly installed a future attack watcher instead of evaluating the current attack. They now run the free breeding evolution immediately behind `duringAttack`. The shared target-breeding path no longer moves the stack into battle and explicitly suppresses the resulting `[When Digivolving]` window per Q4300. De-Digivolve, Piercing, lowest-DP watcher, inherited name gate, and exclusive `registerIrCard` registration remain direct IR.
- Peer/stack evidence: P-176 under a level-5 attacker evolves it into Ouryumon during the live attack; Ouryumon then evolves a complete Ginryumon/Ryudamon breeding stack into trash-resident Hisyaryumon without cost, preserving every source in breeding. Separate tests prove De-Digivolve 2, both-security-stack watcher direction and once-per-turn limit, lowest-DP selection, and Alphamon: Ouryuken inherited security trash.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-018.test.ts` — 5 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts` — 173 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/primitives.test.ts` — 129 passed, 1 unrelated pre-existing `returnToDeck` destination-label expectation (`deck` versus emitted `deckBottom`).
- Clause scores: stats/Piercing/evolution 2/2; dual De-Digivolve timing/amount 2/2; immediate attack-gated breeding evolution and Q4300 stack semantics 2/2; lowest-DP security-removal watcher/once-per-turn 2/2; inherited name gate/top-security trash 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-018.test.ts`).
