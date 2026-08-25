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

## BT20-019 — Jesmon (X Antibody)

- Catalog contract: red level 6 Data Holy Warrior/X Antibody/Royal Knight, play cost 12/12000 DP, red level-5 evolution cost 4 plus Jesmon alternate cost 1; Alliance; When Digivolving conditionally gives one allied Digimon opponent-effect immunity for the turn, then independently lets one allied Digimon attack; your-turn aura gives Sistermon-name/Royal Knight Digimon Piercing and permission to attack unsuspended Digimon; inherited version gives both to all allies while the host is Jesmon GX.
- Knowledge base: Q4302 permits different immunity and attack recipients; Q4303-Q4308 define immunity as suppression rather than untargetability, including already/granted effects and trigger timing; Q4717 explicitly makes the post-`then` attack available when the stack condition fails.
- Implementation evidence: the direct IR correctly gates only `GrantStatic`, leaves the optional Attack independent, uses the full Jesmon-name/X Antibody-trait stack union, and installs both aura capabilities over the exact name/trait population. The inherited effects share the Jesmon GX name gate; Alliance and the alternate requirement are direct metadata. Registration is exclusively `registerIrCard`.
- Peer/stack evidence: evolution over Jesmon for alternate cost produces observable opponent-effect immunity while allowing attack refusal; evolution over nonmatching SaviorHuckmon produces no immunity but still carries out the accepted attack per Q4717. Mixed Sistermon/Royal Knight/nonmatch peers prove both positive capabilities and exclusion, while a Jesmon GX stack proves the inherited all-allies expansion and off-turn expiry.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-019.test.ts` — 5 passed.
- Clause scores: stats/Alliance/alternate evolution 2/2; conditional immunity/stack union 2/2; independent optional attack/Q4717 2/2; Sistermon/Royal Knight dual aura 2/2; inherited Jesmon GX all-allies aura/turn scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-019.test.ts`).

## BT20-020 — Imperialdramon: Fighter Mode

- Catalog contract: red/purple level 6 Virus Ancient Dragonkin, play cost 13/13000 DP, red or purple level-5 evolution cost 5 plus Dragon Mode alternate cost 2; Raid and Piercing; When Digivolving prevents the opponent from effect-playing Digimon/Tamers through their turn end, then trashes top opposing security if Dragon Mode is a source; all turns once per turn, opposing-security removal deletes one opposing Digimon at or below this Digimon's DP.
- Knowledge base: Q4309 establishes Security-effect priority over removal watchers; Q4665-Q4668 define the player-scoped effect-play restriction by the controller of the play rather than the effect owner; Q6245 confirms the restriction also covers effect plays into breeding.
- Implementation evidence: `RestrictPlay` is opponent-seat, Digimon/Tamer filtered, by-effect-only, and lasts through opponent turn end; its consumer gates effect placements including breeding. The conditional security action reads the live source stack, and the removal watcher uses source-relative DP with once-per-turn identity. Raid, Piercing, alternate evolution, and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: a legal BT20-076 Dragon Mode stack evolves for exactly 2, retains its source, trashes one security, and observes both keywords. A separate opponent Hisyaryumon entry effect cannot place Ryudamon into empty breeding under the restriction. Mixed 13000/14000/7000-DP peers prove the inclusive source-DP boundary, exclusion, and second-event once-per-turn gate.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-020.test.ts` — 4 passed.
- Clause scores: stats/keywords/alternate evolution 2/2; effect-play restriction/controller scope 2/2; duration and breeding coverage/Q6245 2/2; Dragon Mode source/security trash 2/2; source-DP deletion boundary/once-per-turn 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-020.test.ts`).

## BT20-021 — Jesmon GX

- Catalog contract: red/black level 7 Data Holy Warrior/X Antibody/Royal Knight ACE, play cost 9/16000 DP, red or black level-6 evolution cost 6, Blast Digivolve, Overflow -5; entry/attack shared once per turn may place a Royal Knight from hand/trash at stack bottom to delete an opposing Digimon at or below self DP; separate attack once per turn unsuspends self, then trashes top security once per two Royal Knight sources.
- Knowledge base: Q4310 forbids combining Blast Digivolve with a DNA requirement; Q4311 makes the two attack effects simultaneous and controller-ordered.
- Implementation evidence: the three timings share one use key and an optional paid `place` cost with hand/trash source, self host, and bottom position before source-relative deletion. The independent attack effect unsuspends self and scales top-security trash from Royal Knight cards in the live source stack. The security primitive now multiplies an explicit top-position trash count by action scale; Blast Digivolve and exclusive `registerIrCard` registration remain direct.
- Peer/stack evidence: On Play places BT20-017 beneath an existing source at the actual bottom and deletes the inclusive 16000-DP boundary while preserving 17000 DP; a later timing cannot reuse the shared clause. Four distinct Royal Knight sources under a suspended GX produce an observable unsuspend and exactly two top-security trashes through the simultaneous attack timing.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-021.test.ts` — 3 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts` — 173 passed.
- Clause scores: stats/ACE/Blast metadata 2/2; three shared timings/once-per-turn 2/2; Royal Knight hand-trash bottom cost 2/2; source-DP deletion boundary 2/2; independent unsuspend/scaled top-security trash 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-021.test.ts`).

## BT20-022 — Crabmon (X Antibody)

- Catalog contract: blue level 3 Data Crustacean/X Antibody, play cost 4/2000 DP, blue level-2 evolution cost 0 plus Crabmon alternate cost 0; On Play/When Digivolving gives one allied Digimon battle-deletion protection through the opponent turn end; inherited attack once per turn draws 1 at 7 or fewer hand cards.
- Knowledge base: no card-specific entries; the inclusive hand boundary, battle-only protection, recipient/controller, dual timings, duration, and once-per-turn identity are unambiguous.
- Implementation evidence: both entry timings share an allied-Digimon `beDeletedInBattle` restriction with the exact cross-turn duration. The inherited action evaluates the live controller hand at `<= 7`, draws one, and uses source-scoped once-per-turn. The alternate Crabmon requirement and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: a selected 1000-DP ally survives battle against an 11000-DP opposing attacker on the following opponent turn. Under a realistic Coredramon stack, exactly seven hand cards draws to eight, a repeated timing does not draw again, and an eight-card negative fixture never draws.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-022.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual entry timing/selection 2/2; battle-only protection 2/2; opponent-turn-end duration/observable survival 2/2; inherited hand boundary/draw/once-per-turn 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-022.test.ts`).

## BT20-023 — Coredramon

- Catalog contract: blue/red level 4 Vaccine Dragon, play cost 5/5000 DP, blue or red level-3 evolution cost 3 plus Dracomon-name level-3 alternate cost 2; Jamming; on your turn, playing a green Digimon with Dracomon/Examon anywhere in its text may evolve self into hand Wingdramon with cost reduced by 2; inherited your-turn +2000 DP.
- Knowledge base: Q4312 requires both green color and the Dracomon/Examon text union; Q4313 defines “in its text” across names, traits, effects, inherited text, rules, and evolution/assembly requirements.
- Implementation evidence: the watcher uses the canonical green Digimon plus full-text union predicate and self/hand/Wingdramon targets. The generated action had the reduction but omitted payment, waiving Wingdramon's entire cost; it now explicitly pays with the existing folded -2 delta. Jamming, inherited DP, alternate requirement, and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: playing green BT20-040, whose text contains the named terms, evolves Coredramon into Wingdramon for exactly 2 after its 5-cost play and preserves the source stack; otherwise similar blue/red BT20-023 fails the green gate. Separate direct and Wingdramon-host stacks prove Jamming ownership and inherited +2000 turn scope.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-023.test.ts` — 3 passed.
- Clause scores: stats/Jamming/alternate evolution 2/2; green played-Digimon trigger 2/2; Q4313 text union 2/2; optional paid Wingdramon evolution/exact reduction 2/2; inherited DP/turn/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-023.test.ts`).

## BT20-024 — Seadramon (X Antibody)

- Catalog contract: blue level 4 Data Aquatic/X Antibody, play cost 6/6000 DP, blue level-3 evolution cost 2 plus Seadramon alternate cost 0; On Play/When Digivolving bottoms one opposing level-3 Digimon, then with Seadramon/X Antibody in its sources prevents one opposing Tamer from suspending through that player's turn end; inherited attack once per turn draws 1 at 7 or fewer hand cards.
- Knowledge base: no card-specific entries; the exact level, bottom destination, sequential conditional, source-stack union, Tamer restriction, duration, and hand boundary are unambiguous.
- Implementation evidence: both entry bodies use an exact level-3 Return followed by a source-stack-gated opponent Tamer restriction. The generated restriction token `suspend` was not consumed by legality; the shared interpreter now normalizes it to canonical `beSuspended`. The inherited draw, alternate requirement, and exclusive `registerIrCard` registration remain direct.
- Peer/stack evidence: a Seadramon-backed stack bottoms only the selected level-3 peer, preserves a level-4 peer, and prevents effect suspension of the selected Tamer on its controller's turn. A MegaSeadramon host with seven hand cards draws once to eight and not again that turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-024.test.ts` — 3 passed; `pnpm --filter @aegis/api exec vitest run src/engine/mechanic.test.ts -t 'Restrict beSuspended'` — 1 passed (117 skipped by focus).
- Clause scores: stats/alternate evolution 2/2; dual level-3 bottom-deck action 2/2; source-stack condition 2/2; Tamer suspension restriction/duration 2/2; inherited draw boundary/once-per-turn 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-024.test.ts`).

## BT20-025 — Wingdramon

- Catalog contract: blue/red level 5 Vaccine Sky Dragon, play cost 7/7000 DP, blue or red level-4 evolution cost 4 plus Coredramon alternate cost 3; On Play/When Digivolving deletes one opposing Digimon at 6000 DP or less; in the battle area it is also level-6 Slayerdramon for Examon DNA evolution; inherited Security Attack +1.
- Knowledge base: Q4314 confines the Slayerdramon identity/level treatment to the battle area and forbids using a hand Wingdramon as the Slayerdramon material for BT20-045 Blast DNA Digivolve.
- Implementation evidence: both entry timings share the inclusive DP deletion; the All Turns field effect grants the Slayerdramon name and an Examon-scoped DNA level-6 override through the continuous ledger; the inherited keyword records Security Attack +1. The Coredramon alternate requirement and exclusive `registerIrCard` registration are direct; no hand-zone static is installed, preserving Q4314.
- Peer/stack evidence: On Play deletes the 6000-DP boundary and preserves a 7000-DP peer. A field Wingdramon observably carries the normalized Slayerdramon granted name and supplies the level-6 material requirement for Examon DNA, while Wingdramon under Slayerdramon produces inherited Security Attack +1.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-025.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual deletion timings 2/2; exact 6000-DP boundary 2/2; field-only Slayerdramon identity/Q4314 2/2; inherited Security Attack/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-025.test.ts`).

## BT20-026 — MegaSeadramon (X Antibody)

- Catalog contract: blue level 5 Data Aquatic/X Antibody, play cost 8/8000 DP, blue level-4 evolution cost 3 plus MegaSeadramon alternate cost 0; On Play/When Digivolving bottoms one opposing level-4-or-lower Digimon, then with MegaSeadramon/X Antibody in its sources prevents one opposing Digimon from suspending through its turn end; inherited your-turn prevents the host's attack target from changing.
- Knowledge base: no card-specific entries; the inclusive level boundary, source-stack union, sequential restriction, duration, and attack-target lock are unambiguous.
- Implementation evidence: both entry bodies use an inclusive level comparison followed by the stack-gated suspension restriction now normalized by the shared restriction seam. The inherited action writes the dedicated attack-target-change restriction on self during its controller's turn. The alternate requirement and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: a MegaSeadramon source stack bottoms a level-4 peer, preserves level 5, and prevents effect suspension of the selected Digimon. Under Slayerdramon, the inherited restriction keeps a player-directed attack from being redirected by an available Blocker, so security is checked and the Blocker remains.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-026.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual bottom-deck timing 2/2; inclusive level boundary 2/2; source-gated suspension lock/duration 2/2; inherited attack-target lock/turn/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-026.test.ts`).

## BT20-027 — Slayerdramon

- Catalog contract: blue/red level 6 Vaccine Dragonkin, play cost 12/12000 DP, blue or red level-5 evolution cost 4 plus Wingdramon/Groundramon alternate cost 3; Piercing; On Play/When Digivolving trashes any three sources of one opposing Digimon then deletes one opposing stackless Digimon; opponent-security removal once per turn may unsuspend one allied Dracomon/Examon-text Digimon; inherited once per turn may suspend the host to prevent all matching allies leaving other than in battle.
- Knowledge base: Q4315 gives Security-effect priority; Q4316/Q4317 define the unsuspend population using full printed text; Q4318 applies the same population to inherited prevention; Q4319 makes one activation protect every simultaneously leaving match.
- Implementation evidence: both entry timings share ordered `TrashDigivolution` then stackless `Delete`; the removal watcher is opponent-security scoped, full-text filtered, optional, and once per turn. The inherited `wouldLeavePlay` replacement is nonbattle-only, affects all matches, and charges a self-suspend cost. Piercing, alternate requirements, and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: a three-source opponent loses exactly those sources and is then deleted while a peer remains. Security removal unsuspends a suspended Coredramon text match but not Ryudamon and cannot repeat that turn. Under GigaSeadramon, one suspension payment prevents two different matching Digimon from the same effect-deletion batch.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-027.test.ts` — 7 passed.
- Clause scores: stats/Piercing/alternate evolution 2/2; dual three-source trash 2/2; sequential stackless deletion 2/2; text-filtered unsuspend/once-per-turn 2/2; inherited all-match nonbattle replacement/payment 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-027.test.ts`).

## BT20-028 — GigaSeadramon

- Catalog contract: blue/black level 7 Data Aquatic/Machine, play cost 13/13000 DP, blue or black level-6 evolution cost 5 plus MetalSeadramon alternate cost 2; Security Attack +1, Reboot, Blocker; shared once-per-turn When Digivolving/When Attacking may play one level-5-or-lower Digimon from this stack only if MetalSeadramon/X Antibody is a source; playing any allied Digimon from sources de-digivolves an opponent by 2 once per turn.
- Knowledge base: Q4320 makes the source-stack condition mandatory; Q4321 confirms the removal watcher also sees GigaSeadramon itself when it is played from sources.
- Implementation evidence: the generated play searched default hand/trash because its source zone was incorrectly nested under the target, used a non-consumed level shape, and could scan every allied stack. Both timings now use action-level `from: [digivolutionCards]`, canonical level comparison, `source: thisDigimon`, and direct source-stack condition. The from-digivolution watcher, three keywords, alternate requirement, and exclusive `registerIrCard` registration remain direct.
- Peer/stack evidence: legal evolution over MetalSeadramon plays BT20-026 only from GigaSeadramon's own stack, preserves an eligible card under another host, and triggers De-Digivolve 2. A stack with eligible but nonqualifying Coredramon/Wingdramon cards plays nothing. All three keywords are observable.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-028.test.ts` — 3 passed.
- Clause scores: stats/three keywords/alternate evolution 2/2; shared timing/once-per-turn 2/2; Q4320 source condition 2/2; own-stack level-5-or-lower free play 2/2; from-source play watcher/De-Digivolve 2 2/2.
- Score: 10/10.
- Ambiguity: Q4321 is covered by the same `fromDigivolution` production event seam; a direct self-play fixture is not independently constructible without another card's compatible level-7 source-play effect.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-028.test.ts`).

## BT20-029 — Pulsemon

- Catalog contract: yellow/green level 3 Vaccine Beastkin, play cost 3/1000 DP, purple or green level-2 evolution cost 1 plus Bibimon or level-2 SEEKERS alternate cost 0; on your turn, its battle-area evolution into a Digimon with Pulsemon in its text or the SEEKERS trait costs 1 less; inherited once per turn gains 1 memory when the host deletes an opponent in battle.
- Knowledge base: Q4322 defines “Pulsemon in its text” across the complete printed card text; Q4323 says the reduction does not apply in the breeding area; Q4324 says the inherited effect cannot activate if the host is deleted in the same battle.
- Implementation evidence: the reduction's source filter now explicitly requires the battle area, preserving the full-text/trait union and exact -1 delta. The generated inherited trigger used the runtime timing enum name as an IR trigger, which fell through to continuous timing and repeatedly gained memory during recomputation; it now uses canonical `WhenBattleDeleteOpponent`, routes only to the battle-deletion window, and retains source-scoped once-per-turn. Alternate requirements and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: BT17-034 is a qualifying Pulsemon-text evolution: over a battle-area Pulsemon its cost falls from 3 to 2, while the identical breeding evolution pays the full 3. Under a realistic Digimon host, two direct battle-deletion windows gain exactly one memory total.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-029.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; text-or-trait destination union 2/2; exact evolution reduction 2/2; Q4323 battle-area scope 2/2; inherited battle-deletion timing/once-per-turn 2/2.
- Score: 10/10.
- Ambiguity: Q4324 is enforced by the production combat controller, which fires this timing only for the surviving attacker; the direct timing fixture isolates the card's routed effect and frequency.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-029.test.ts`).

## BT20-030 — Liollmon

- Catalog contract: yellow/black level 3 Vaccine Holy Beast/ACCEL, play cost 3/1000 DP, yellow or black level-2 evolution cost 1 plus Frimon or level-2 ACCEL alternate cost 0; On Play reveals three, independently adds one Chaosmon-name or ACCEL-trait Digimon and one ACCEL Option, and bottoms the rest; inherited Barrier.
- Knowledge base: no card-specific rulings; the two independent add slots, union in the first slot, card-kind boundaries, remainder destination, and inherited keyword ownership are unambiguous.
- Implementation evidence: the direct IR carries two ordered `RevealAdd.add` specifications with the exact Digimon name/trait union and ACCEL Option filter, followed by `deckBottom`. The inherited Static keyword is flagged `isInherited`, both alternate requirements are exact, and registration is exclusively through `registerIrCard`.
- Peer/stack evidence: revealing ACCEL Digimon BT20-031, ACCEL Option BT20-099, and nonmatching Digimon BT20-010 moves the first two to hand and only the control to the main-deck bottom. A Liollmon source grants Barrier to its host, while a top-card Liollmon does not receive its own inherited keyword.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-030.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; reveal count 2/2; Digimon union/add limit 2/2; ACCEL Option/remainder destination 2/2; inherited-only Barrier/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-030.test.ts`).

## BT20-031 — Liamon

- Catalog contract: yellow/black level 4 Vaccine Holy Beast/ACCEL, play cost 4/5000 DP, yellow or black level-3 evolution cost 3 plus level-3 ACCEL alternate cost 2; On Play and When Digivolving give one opposing Digimon -3000 DP for the turn; inherited Barrier.
- Knowledge base: no card-specific rulings; target ownership/kind/count, modifier amount/duration, dual timing, alternate cost, and inherited ownership are unambiguous.
- Implementation evidence: separate On Play and When Digivolving entries carry the same single opposing-Digimon target, -3000 amount, and `forTheTurn` duration. The inherited Static entry carries only Barrier, the ACCEL alternate requirement is explicit, and registration is exclusively through `registerIrCard`.
- Peer/stack evidence: playing Liamon and explicitly taking its ACCEL alternate evolution over Liollmon each reduce a 6000-DP opposing Ryudamon to 3000; the evolution pays exactly 2 despite the simultaneously applicable printed yellow cost of 3. A Liamon source grants Barrier to its host, while top-card Liamon does not receive its inherited keyword.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-031.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; On Play target/amount 2/2; When Digivolving target/amount 2/2; turn duration 2/2; inherited-only Barrier/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-031.test.ts`).

## BT20-032 — Bulkmon

- Catalog contract: yellow/green level 4 Vaccine Dragonkin/Abadin Electronics/SEEKERS, play cost 6/6000 DP, purple or green level-3 evolution cost 3 plus Pulsemon or level-3 SEEKERS alternate cost 2; On Play/When Digivolving may move top security to hand at three or more, then recovers one from deck at two or fewer; inherited once per turn gains 1 memory after deleting an opponent in battle.
- Knowledge base: Q4325 forbids the inherited effect when its host and the opposing Digimon are deleted at the same timing.
- Implementation evidence: both entry timings carry the optional top-security move followed sequentially by a mandatory live security-count check and deck recovery. The inherited continuous watcher is source-scoped to `whenDeletesInBattle`, once per turn, and gains exactly one memory. Both alternate requirements and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: from exactly three security, accepting the first action puts a security card in hand, then the now-two count recovers BT20-013 from deck back to three. A 7000-DP Boutmon host with Bulkmon underneath deletes a suspended 1000-DP opponent, survives as Q4325 requires, and gains exactly one memory.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-032.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual timing 2/2; optional three-plus security move 2/2; sequential two-or-fewer recovery 2/2; inherited surviving battle deletion/memory/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-032.test.ts`).

## BT20-033 — LoaderLeomon

- Catalog contract: yellow/black level 5 Vaccine Machine/ACCEL, play cost 6/6000 DP, yellow or black level-4 evolution cost 4 plus level-4 ACCEL alternate cost 3; On Play/When Digivolving gives one opposing Digimon -3000 DP and prevents its When Digivolving effects through that opponent's turn end; inherited opponent-turn once per turn may redirect an opposing attack to the host.
- Knowledge base: Q4326/Q4328/Q4329 suppress the entire When Digivolving activation, including externally activated effects and their costs; Q4327 preserves a combined When Digivolving/When Attacking effect at its attack timing; Q4330 says a suppressed timing does not spend once-per-turn usage.
- Implementation evidence: both entry timings target one opposing Digimon with the dedicated `cannotActivateWhenDigivolving` restriction and -3000 modifier under the same cross-turn duration. The engine consumes that restriction only at the When Digivolving timing, preserving Q4327. The inherited opponent-attack watcher redirects optionally to self once per turn; alternate evolution and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: On Play makes a 6000-DP opposing Liollmon 3000 and observably installs the exact timing restriction. During the opponent's turn, LoaderLeomon beneath a 12000-DP host redirects a 1000-DP attack away from security; the attacker is deleted in battle, security is preserved, and the host survives.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-033.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual target/timing 2/2; -3000 amount/cross-turn duration 2/2; complete When Digivolving suppression/ruling boundary 2/2; inherited optional redirect/turn/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-033.test.ts`).

## BT20-034 — Boutmon

- Catalog contract: yellow/green level 5 Vaccine Beastkin/Abadin Electronics/SEEKERS, play cost 7/7000 DP, purple or green level-4 evolution cost 4 plus level-4 Pulsemon-text or SEEKERS alternate cost 3; Fortitude; placing a Tamer in its sources prevents one opposing Digimon's When Digivolving effects through that opponent's turn end; inherited once per turn trashes opposing top security after a battle deletion.
- Knowledge base: Q4333 defines Pulsemon in text across the complete printed card; Q4334–Q4338 define the same complete When Digivolving suppression boundaries as LoaderLeomon; Q4341 forbids the inherited effect when its host also dies in battle.
- Implementation evidence: Fortitude is a direct Static keyword. The `onAddDigivolutionCards` watcher is resident on Boutmon, filters the added source to a Tamer, targets one opposing Digimon, and installs the canonical cross-turn timing restriction. The inherited surviving battle-deletion watcher trashes exactly one opposing top security once per turn; both alternate requirements and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: placing BT20-085 from hand under Boutmon observably installs the timing restriction on an opposing Digimon while Fortitude remains active. A 12000-DP Kazuchimon host carrying Boutmon deletes a suspended 1000-DP opponent, survives as Q4341 requires, and reduces opposing security from two to one.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-034.test.ts` — 3 passed.
- Clause scores: stats/alternate full-text evolution 2/2; Fortitude 2/2; Tamer-source event/filter 2/2; timing restriction/target/duration 2/2; inherited surviving battle deletion/security/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-034.test.ts`).

## BT20-035 — Kazuchimon

- Catalog contract: yellow/green level 6 Vaccine Shaman/Abadin Electronics/SEEKERS, play cost 12/12000 DP, purple or green level-5 evolution cost 4 plus level-5 Pulsemon-text or SEEKERS alternate cost 3; Fortitude; When Digivolving suspends one opposing Digimon/Tamer, then independently prevents one from unsuspending through its turn end; a Tamer entering its stack reactivates one When Digivolving effect, then optionally attacks an opposing Digimon; inherited Fenriloogamon recovers once per turn when own security is removed.
- Knowledge base: Q4342 defines Pulsemon in text across complete printed text; Q4343 explicitly permits different suspend and unsuspend-lock targets; Q4344 gives Security effects priority over the inherited security-removal trigger.
- Implementation evidence: Fortitude is direct; the When Digivolving body uses two independent target resolutions for Q4343 and canonical unsuspend restriction duration. The Tamer-source watcher reactivates self's When Digivolving effect before its separate optional attack. The inherited watcher checks live Fenriloogamon name, own security removal, deck recovery, and once-per-turn; alternate requirements and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: placing BT20-085 under Kazuchimon reactivates the payload, observably suspending and locking an opposing Digimon while the optional attack is declined. Kazuchimon beneath BT14-081 Fenriloogamon recovers BT20-010 from deck after an own-security removal event and cannot recover again that turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-035.test.ts` — 3 passed.
- Clause scores: stats/alternate full-text evolution/Fortitude 2/2; suspend target 2/2; independent unsuspend lock/duration 2/2; Tamer-source reactivation/optional attack 2/2; inherited Fenriloogamon recovery/scope/frequency 2/2.
- Score: 10/10.
- Ambiguity: Q4344 is an engine-wide trigger-order rule; the focused test isolates the card's pending inherited response after that priority window.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-035.test.ts`).

## BT20-036 — BanchoLeomon

- Catalog contract: yellow/black level 6 Vaccine Beastkin/Boss/ACCEL, play cost 12/12000 DP, yellow or black level-5 evolution cost 4 plus level-5 ACCEL alternate cost 3; its own play costs 5 less while an allied ACCEL Digimon exists; On Play/When Digivolving De-Digivolve 2, then gives one opposing Digimon -5000 DP through its turn end; at own turn end it may DNA itself plus another Digimon into a hand Chaosmon and then attack; inherited opponent-turn once per turn may redirect an attack to the host.
- Knowledge base: Q4345 makes the DNA evolution's When Digivolving and subsequent When Attacking effects simultaneous/controller-ordered; Q4346 forbids a second BanchoLeomon's follow-up attack while the first attack remains underway.
- Implementation evidence: the conditional self-play reducer was valid IR but absent from the strict verified pay-time reducer registry, so it paid 12; BT20-036 is now admitted with its existing ACCEL board condition and exact -5 amount. Both entry timings preserve independent De-Digivolve and DP targets/duration. The end-turn action requires self among two own materials, filters hand Chaosmon, gates the optional attack on successful DNA action, and the inherited redirect is opponent-turn once per turn. Registration remains exclusively `registerIrCard`.
- Peer/stack evidence: with Liollmon as the ACCEL resident, BanchoLeomon pays 7, removes two sources from a 10000-DP opposing stack, and leaves it at 5000 DP. BanchoLeomon plus Kazuchimon DNA into BT16-036 Chaosmon at turn end and the resulting stack deletes a suspended opponent in the follow-up attack. Its inherited redirect separately preserves security and its host.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-036.test.ts` — 4 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts` — 173 passed.
- Clause scores: stats/alternate evolution 2/2; conditional self-play reduction 2/2; dual De-Digivolve/DP payload 2/2; end-turn DNA/self-material/attack 2/2; inherited redirect/turn/frequency 2/2.
- Score: 10/10.
- Ambiguity: Q4345 ordering is controlled by the shared simultaneous trigger stack after the DNA action; the focused fixture proves the complete DNA-then-attack production chain.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-036.test.ts`).

## BT20-037 — Chaosmon: Valdur Arm

- Catalog contract: yellow/green level 7 Vaccine Unique, play cost 15/15000 DP, yellow or green level-6 evolution cost 5; Security Attack +1; Partition (yellow level 6 + green/black level 6); When Digivolving, for each level-6 source suspend one opposing Digimon/Tamer and gain 1 memory, then all opposing Digimon/Tamers lose On Play activation and cannot unsuspend through their turn end.
- Knowledge base: Q4347 confirms two level-6 sources produce two suspensions and 2 memory; Q4348–Q4354 define complete On Play timing suppression and its combined-timing/usage boundaries; Q4605 confirms rule-deletion at 0 DP triggers Partition; Q4718 explicitly includes both opposing Digimon and Tamers; Q4841 keeps a placed card's On Play activation suppressed.
- Implementation evidence: both scaled actions count only level-6 cards in this Digimon's live stack. The following all-target actions use the dedicated On Play timing disable and unsuspend restriction with cross-turn duration. Both printed keywords are direct Static entries, and registration is exclusively `registerIrCard`.
- Peer/stack evidence: evolving over Kazuchimon with BanchoLeomon underneath counts two level-6 sources, suspends both an opposing Digimon and Tamer, pays 5 then gains 2 memory, and observably locks both On Play and unsuspend. Security Attack +1 and Partition are live; opponent-effect deletion replays the specified Kazuchimon and BanchoLeomon as two fresh permanents.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-037.test.ts` — 3 passed.
- Clause scores: stats/evolution/Security Attack 2/2; level-6 scaling 2/2; repeated suspension/memory 2/2; global Digimon/Tamer On Play and unsuspend locks 2/2; Partition composition/observable replay 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-037.test.ts`).

## BT20-038 — Falcomon

- Catalog contract: green/yellow level 3 Vaccine Avian/ACCEL, play cost 3/1000 DP, green or yellow level-2 evolution cost 1 plus Pinamon or level-2 ACCEL alternate cost 0; on your turn, its battle-area evolution into an ACCEL Digimon costs 1 less; inherited Piercing.
- Knowledge base: Q4355 explicitly says the evolution reducer does not trigger in the breeding area because it lacks the Breeding icon.
- Implementation evidence: the resident replacement is self-referenced, battle-area scoped, destination-gated to ACCEL, and reduces exactly 1. The inherited Static keyword is Piercing, both alternate requirements are exact, and registration is exclusively through `registerIrCard`.
- Peer/stack evidence: BT20-039's ACCEL alternate path normally costs 2; over a battle-area Falcomon it costs 1, while the identical breeding evolution costs the full 2. A Diatrymon host carrying Falcomon deletes a suspended opposing Digimon in battle and Pierces through the remaining security.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-038.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; ACCEL destination gate 2/2; exact -1 reduction 2/2; Q4355 battle-area scope 2/2; inherited Piercing/observable battle-security flow 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-038.test.ts`).

## BT20-039 — Diatrymon

- Catalog contract: green/yellow level 4 Vaccine Ancient Bird/ACCEL, play cost 4/5000 DP, green or yellow level-3 evolution cost 3 plus level-3 ACCEL alternate cost 2; On Play/When Digivolving suspends one opposing Digimon; inherited Piercing.
- Knowledge base: no card-specific rulings; timing, opponent/card-kind scope, count, alternate cost, and inherited keyword ownership are unambiguous.
- Implementation evidence: separate On Play and When Digivolving effects share the exact one-opposing-Digimon suspend target. The inherited Static entry is Piercing, the ACCEL alternate requirement is exact, and registration is exclusively through `registerIrCard`.
- Peer/stack evidence: On Play suspends one of two opposing Digimon and preserves the other; evolution over Falcomon takes the ACCEL path and its resident reduction, paying exactly 1 before suspending the target. Crowmon with Diatrymon underneath deletes a weaker suspended opponent and Pierces the remaining security.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-039.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; On Play suspension 2/2; When Digivolving suspension 2/2; exact opponent/count scope 2/2; inherited Piercing/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-039.test.ts`).

## BT20-040 — Coredramon

- Catalog contract: green/red level 4 Virus Dragon, play cost 5/5000 DP, green or red level-3 evolution cost 3 plus Dracomon-name alternate cost 2; Raid; on your turn, playing a blue Digimon with Dracomon/Examon anywhere in its text may evolve self into hand Groundramon with cost reduced by 2; inherited your-turn +2000 DP.
- Knowledge base: Q4356 requires both blue color and the Dracomon/Examon text union; Q4357 defines “in its text” across the complete printed card.
- Implementation evidence: the played-card watcher uses the exact allied blue Digimon and full-text union filter. The generated Digivolve action omitted payment and defaulted to the simultaneously applicable printed route; it now pays and explicitly selects Groundramon's Coredramon alternate requirement before applying -2. Raid, inherited DP, alternate requirement, and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: playing blue BT20-023, whose printed text contains the named terms, costs 5 and evolves Coredramon into BT20-042 Groundramon for exactly 1; blue BT20-024 does not trigger it. Raid redirects a declared player attack into an unsuspended opposing Digimon, and Coredramon underneath Groundramon grants +2000 DP only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-040.test.ts` — 3 passed.
- Clause scores: stats/Raid/alternate evolution 2/2; blue played-Digimon gate 2/2; Q4357 full-text union 2/2; optional paid Groundramon alternate evolution/exact reduction 2/2; inherited DP/turn/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-040.test.ts`).

## BT20-041 — Crowmon

- Catalog contract: green/yellow level 5 Vaccine Mysterious Bird/ACCEL, play cost 6/6000 DP, green or yellow level-4 evolution cost 4 plus level-4 ACCEL alternate cost 3; On Play/When Digivolving suspends one opposing Digimon, gives one allied Digimon +3000 DP for the turn, then one allied Digimon may attack; inherited attack once per turn gives one opposing Digimon -4000 DP for the turn.
- Knowledge base: no card-specific rulings; action order, independent allied/opposing targets, duration, optional attack, alternate cost, and inherited frequency are unambiguous.
- Implementation evidence: both entry timings carry the same ordered Suspend, allied ModifyDP, and optional Attack actions. The inherited When Attacking entry targets one opponent, applies -4000 for the turn, and is source-scoped once per turn. Alternate evolution and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: playing Crowmon suspends a 6000-DP opponent, raises itself from 6000 to 9000, and takes the offered attack to delete that target. Groundramon with Crowmon underneath attacks a 6000-DP opponent; the inherited -4000 resolves before battle and the target is deleted.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-041.test.ts` — 3 passed.
- Clause scores: stats/alternate evolution 2/2; dual entry timing/suspension 2/2; allied +3000/duration 2/2; optional follow-up attack/order 2/2; inherited -4000/attack/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-041.test.ts`).

## BT20-042 — Groundramon

- Catalog contract: green/red level 5 Virus Earth Dragon, play cost 7/7000 DP, green or red level-4 evolution cost 4 plus Coredramon alternate cost 3; On Play/When Digivolving independently suspends one opposing Digimon/Tamer, then locks one from unsuspending through its turn end; in battle it is level-6 Breakdramon for Examon DNA evolution; inherited once per turn trashes opposing top security after a battle deletion.
- Knowledge base: Q4358 permits different suspend and lock targets; Q4359 confines the level/name treatment to the battle area and forbids using hand Groundramon as Breakdramon for Blast DNA; Q4360 requires the inherited host to survive the battle.
- Implementation evidence: both entry timings use independent one-card Digimon/Tamer target resolutions and the canonical cross-turn unsuspend restriction. The generated field identity incorrectly granted both Breakdramon and Examon names; it now grants only Breakdramon and separately applies level 6 solely in DNA evolution into Examon. The inherited battle watcher is source/battle-area scoped and once per turn; alternate evolution and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: On Play suspends and locks an opposing Digimon, while the live name ledger contains Breakdramon and explicitly excludes Examon. A Breakdramon host carrying Groundramon deletes a weaker opponent, survives, and reduces opposing security from two to one.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-042.test.ts` — 5 passed.
- Clause scores: stats/alternate evolution 2/2; dual suspend/lock timing and independent targets 2/2; unsuspend duration 2/2; field-only Breakdramon/Examon-scoped level 6 2/2; inherited surviving battle deletion/security/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-042.test.ts`).

## BT20-043 — Varodurumon

- Catalog contract: green/yellow level 6 Vaccine Holy Bird/ACCEL, play cost 12/12000 DP, green or yellow level-5 evolution cost 4 plus level-5 ACCEL alternate cost 3; its own play costs 5 less with an allied ACCEL Digimon; On Play/When Digivolving suspends all opposing Digimon, gives one ally +3000 DP for the turn, then one ally may attack; at own turn end it may DNA itself plus another ally into hand Chaosmon and then attack; inherited attack once per turn gives one opponent -4000 DP for the turn.
- Knowledge base: Q4361 makes the DNA evolution's When Digivolving and follow-up When Attacking effects simultaneous/controller-ordered; Q4362 forbids a second Varodurumon's follow-up attack during the first attack.
- Implementation evidence: the ACCEL-gated self reducer was absent from the strict verified registry and is now admitted at exact -5. The DNA action's generated material filter required `isSelfRef` for both of its count-2 materials, making self-plus-another impossible; it now selects two allied Digimon while retaining `includeRef:self`. Both entry bodies, the successful-DNA attack gate, inherited once-per-turn reduction, alternate requirement, and exclusive `registerIrCard` registration remain direct.
- Peer/stack evidence: with Crowmon resident, Varodurumon pays 7, suspends two opposing Digimon, and gives Crowmon +3000 DP while the optional attack is declined. Varodurumon plus BanchoLeomon DNA into BT16-036 Chaosmon at turn end; the resulting stack attacks, its inherited -4000 applies, and the opposing target is deleted.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-043.test.ts` — 5 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts` — 173 passed.
- Clause scores: stats/alternate evolution 2/2; conditional self-play reduction 2/2; dual all-suspend/buff/attack payload 2/2; self-plus-another Chaosmon DNA/follow-up attack 2/2; inherited -4000/attack/frequency 2/2.
- Score: 10/10.
- Ambiguity: Q4361 ordering is owned by the shared simultaneous trigger stack after DNA; the focused fixture proves the full DNA-then-attack chain.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-043.test.ts`).

## BT20-044 — Breakdramon

- Catalog contract: green/red level 6 Virus Machine Dragon, play cost 12/12000 DP, green or red level-5 evolution cost 4 plus Groundramon/Wingdramon alternate cost 3; Blocker; On Play/When Digivolving suspends two opposing Digimon/Tamers, then one ally may attack; once per turn, a surviving allied Dracomon/Examon-text Digimon's battle deletion deletes one opposing suspended Digimon/Tamer; the same watcher is inherited.
- Knowledge base: Q4363/Q4365 define both resident and inherited trigger populations as any allied Digimon with Dracomon/Examon in its text; Q4364/Q4367 require that deleting Digimon to survive; Q4366 defines full printed text.
- Implementation evidence: both entry timings use count 2 across opposing Digimon/Tamers before the optional attack. Resident and inherited watchers independently carry the allied full-text union, survival fire condition, suspended Digimon/Tamer target, and once-per-turn frequency. Blocker, alternate requirements, and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: On Play suspends exactly two of three eligible opposing cards and leaves the third ready while Blocker is live. With resident Breakdramon, a Coredramon-text ally wins a battle and the watcher deletes a second suspended Tamer; the same full production sequence succeeds when Breakdramon is instead underneath an Examon host.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-044.test.ts` — 5 passed.
- Clause scores: stats/Blocker/alternate evolution 2/2; dual entry two-card suspension/optional attack 2/2; Q4363/Q4366 full-text allied trigger 2/2; suspended secondary target/survival/frequency 2/2; inherited duplicate ownership/behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-044.test.ts`).

## BT20-045 — Examon ACE

- Catalog contract: green/red/blue level 7 Data Holy Warrior/Royal Knight ACE, play cost 9/15000 DP, green/red/blue level-6 evolution cost 5, Blast DNA Digivolve (Breakdramon + Slayerdramon), Overflow -5; Raid, Piercing, Blocker, Evade; DNA When Digivolving bottoms every opposing highest-DP Digimon; once per turn may unsuspend when any Digimon suspends.
- Knowledge base: Q4314/Q4359 allow field Wingdramon/Groundramon aliases but reject those hand cards as Blast DNA materials; Q4368 says either player's suspension triggers the unsuspend.
- Implementation evidence: the direct IR carries hand-only Blast DNA, four field keywords, DNA-gated all-highest Return, and an any-controller suspension watcher. Blast DNA validation previously read only printed material names, rejecting live field aliases; it now consumes effective field names and scoped DNA levels while still matching exactly one material per printed slot. Wingdramon's missing Examon-scoped level-6 override was repaired in atomic commit `a26c55a05`. Registration remains exclusively `registerIrCard`.
- Peer/stack evidence: field Groundramon and Wingdramon satisfy the named level-6 Blast DNA pair at zero memory; Examon merges them, bottoms both tied 8000-DP opponents, and preserves the 7000-DP peer. ACE/Overflow and all four keyword consumers are observable. Suspending either an allied or opposing Digimon unsuspends Examon.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-045.test.ts` — 5 passed; `pnpm --filter @aegis/api exec vitest run src/engine/interactionAudit.test.ts -t 'Blast DNA Digivolve'` — 2 passed; `pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts -t 'Blast DNA Digivolve'` — 4 passed.
- Clause scores: stats/ACE/Overflow/Blast DNA 2/2; four keywords 2/2; field alias/material legality 2/2; DNA-only all-highest bottom deck 2/2; any-controller suspension/unsuspend/frequency 2/2.
- Score: 10/10.
- Ambiguity: a full unfiltered `interactionAudit.test.ts` run has one unrelated pre-existing optional-processing expectation failure; both affected Blast DNA tests in that file are green and final collection gates remain pending.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-045.test.ts`).

## BT20-046 — Espimon

- Catalog contract: black/blue level 3 Virus Cyborg/LIBERATOR, play cost 3/1000 DP, black or blue level-2 evolution cost 1 plus Kapurimon alternate cost 0; on your turn, its battle-area evolution into a Cyborg/Machine Digimon costs 1 less; inherited all-turn +1000 DP.
- Knowledge base: Q4369 explicitly says the evolution reducer does not trigger in the breeding area because it lacks the Breeding icon.
- Implementation evidence: the resident replacement is self-referenced, battle-area scoped, destination-gated to the Cyborg/Machine trait union, and reduces exactly 1. The inherited All Turns modifier targets its host permanently, the Kapurimon alternate requirement is exact, and registration is exclusively through `registerIrCard`.
- Peer/stack evidence: BT20-050's Cyborg alternate path normally costs 2; over a battle-area Espimon it costs 1, while the identical breeding evolution costs the full 2. HoverEspimon with Espimon underneath is 5000 DP from a 4000 base on both controller and opponent turns.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-046.test.ts` — 4 passed.
- Clause scores: stats/Kapurimon alternate evolution 2/2; Cyborg/Machine union 2/2; exact -1 reduction 2/2; Q4369 battle-area scope 2/2; inherited all-turn +1000/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-046.test.ts`).

## BT20-047 — Solarmon

- Catalog contract: black level 3 Vaccine Machine, play cost 3/2000 DP, black level-2 evolution cost 0; resident Blocker and inherited Reboot.
- Knowledge base: the card query has no card-specific entries; the comprehensive keyword behavior is exercised through the production combat and active-phase seams.
- Implementation evidence: two independent static IR effects publish resident Blocker and inherited Reboot, with no residual text. The module registers exclusively through `registerIrCard`.
- Peer/stack evidence: like BT2-065, the resident keyword opens a real optional block window and redirects an opposing attack. Unlike a standalone Solarmon, a BT20-050 host with Solarmon underneath receives Reboot and unsuspends during the opponent's active phase.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-047.test.ts` — 3 passed.
- Clause scores: stats/evolution route 2/2; resident Blocker publication 2/2; optional attack redirection/security protection 2/2; inherited-only Reboot stack boundary 2/2; opponent active-phase unsuspend 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-047.test.ts`).

## BT20-048 — Dorumon

- Catalog contract: black/yellow level 3 Data Beast/X Antibody/Chronicle, play cost 3/1000 DP, black or yellow level-2 evolution cost 1 plus black level-2 X Antibody alternate cost 0; On Play reveals 3, independently adds 1 X Antibody card and 1 Chronicle Tamer/Option, bottoms the rest; inherited Opponent's Turn +2000 DP.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: `RevealAdd` exposes exactly three cards, evaluates two independent count-1 filters, excludes already-taken cards from later slots, and routes the remainder to deck bottom. The alternate requirement combines black, level 2, and X Antibody; the inherited modifier is self-scoped and opponent-turn gated. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: a mixed reveal adds BT20-010 as the X Antibody card and BT20-087 as the Chronicle Tamer while bottoming nonmatching BT20-047. BT13-005 receives the alternate cost 0 while BT20-005 uses the ordinary cost 1; a 6000-DP BT20-051 host is 6000 on its controller's turn and 8000 on the opponent's.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-048.test.ts` — 5 passed.
- Clause scores: stats/ordinary evolution routes 2/2; exact alternate trait route 2/2; reveal-three/X Antibody slot 2/2; Chronicle Tamer-or-Option slot/rest bottoming 2/2; inherited opponent-turn +2000/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-048.test.ts`).

## BT20-049 — Blimpmon

- Catalog contract: black level 4 Data Machine, play cost 4/4000 DP, black level-3 evolution cost 2; On Play and When Digivolving restrict 1 opposing Digimon from attacking players through the end of that opponent's turn; inherited Reboot.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: two entry effects independently use the shared `Restrict` primitive with opponent Digimon count 1, `attackPlayers`, and `untilOpponentTurnEnd`. Combat legality rejects only player targets for the selected attacker. The inherited static marker publishes Reboot to its host, and registration is exclusively through `registerIrCard`.
- Peer/stack evidence: both playing Blimpmon and evolving BT20-047 into it restrict exactly the auto-selected BT1-010 while leaving a second opposing Digimon unrestricted; the selected Digimon's player attack is rejected as `illegal-target`. BT20-051 gains Reboot with Blimpmon underneath while a standalone Blimpmon does not.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-049.test.ts` — 4 passed.
- Clause scores: stats/evolution route 2/2; On Play timing 2/2; When Digivolving timing 2/2; one-target/player-only/duration restriction 2/2; inherited Reboot stack boundary 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-049.test.ts`).

## BT20-050 — HoverEspimon

- Catalog contract: black/blue level 4 Virus Cyborg/LIBERATOR, play cost 4/4000 DP, black or blue level-3 evolution cost 3 plus level-3 Cyborg/Machine alternate cost 2; When Digivolving flips the opponent's top face-down security face up; End of Attack once per turn draws 1; inherited all-turn +1000 DP.
- Knowledge base: Q4370 requires skipping an already-face-up top security card and flipping the next face-down one; Q4371-Q4374 preserve revealed security behavior, Security effects, and reset all cards face down before a security shuffle.
- Implementation evidence: `SecurityManipulation.flipFaceUp` delegates to the security primitive's from-top face-down scan. End of Attack uses the shared once-per-turn tracker around Draw 1, the alternate requirement is the Cyborg/Machine trait union at level 3, and the inherited permanent modifier is all-turn self-scoped. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: BT20-046 satisfies the Cyborg route for exactly 2; with the top opposing security already face up, evolution flips only the second and leaves the third face down. Two same-turn end-of-attack windows draw only the first of two deck cards. A 7000-DP BT20-052 host with HoverEspimon underneath remains 8000 DP on both turns.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-050.test.ts` — 5 passed.
- Clause scores: stats/ordinary evolution routes 2/2; exact alternate trait route 2/2; Q4370 security face-state behavior 2/2; end-of-attack Draw 1/frequency 2/2; inherited all-turn +1000/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-050.test.ts`).

## BT20-051 — Raptordramon

- Catalog contract: black/yellow level 4 Vaccine Cyborg/X Antibody/Chronicle, play cost 5/6000 DP, black or yellow level-3 evolution cost 3 plus Dorumon or level-3 Chronicle alternate cost 2; When Digivolving, at 1 or fewer own Tamers, may play Kota Domoto from hand free; inherited Opponent's Turn +2000 DP.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: the direct IR uses a numeric own-Tamer `permanentCount <= 1` gate around an optional, free, hand-only exact-name Kota play. Its two alternate requirements independently cover Dorumon and level-3 Chronicle; the inherited modifier is opponent-turn self-scoped. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: BT20-048 proves the Dorumon route and BT20-010 proves the non-Dorumon Chronicle route, both for cost 2. Kota is played at zero and one Tamer, remains in hand at two, and may be declined. A 7000-DP BT20-053 host is 7000 on its controller's turn and 9000 on the opponent's.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-051.test.ts` — 5 passed.
- Clause scores: stats/ordinary evolution routes 2/2; Dorumon/Chronicle alternate union 2/2; exact 0/1/2-Tamer boundary 2/2; optional named free play/refusal 2/2; inherited opponent-turn +2000/stack behavior 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-051.test.ts`).

## BT20-052 — Oblivimon

- Catalog contract: black/blue level 5 Virus Cyborg/LIBERATOR, play cost 7/7000 DP, black or blue level-4 evolution cost 4 plus level-4 Cyborg/Machine alternate cost 3; face-up Security End of Opponent's Turn free play; When Digivolving flips the opponent's top face-down security; on your turn, after any allied Digimon checks face-up security, may place Oblivimon's top card face-up at own security bottom; inherited your-turn attack-target-change lock.
- Knowledge base: Q4375 requires the next face-down scan; Q4376-Q4379 define persistent face-up security behavior; Q4380 orders Security before other check/removal triggers; Q4381 preserves the newly promoted card's End of Attack effect after Oblivimon moves; Q4719 preserves loss at zero security; Q4720 confirms the top-card move can expose a Tamer and remove the attacking Digimon.
- Implementation evidence: face-up security contributes the delayed end-turn effect; the evolution flip uses the shared face-down scan; `whenCheckedFaceUpSecurity` is emitted only for a pre-existing face-up check. Audit exposed that `runSecurityAdd` discarded the supported `detachPermanentTop` flag, causing the whole stack to move. The seam now forwards that flag and this action sets it, so only Oblivimon moves while its top source is promoted. The inherited restriction is stack- and owner-turn scoped, and registration remains exclusively `registerIrCard`.
- Peer/stack evidence: face-up Oblivimon plays free at the opponent's end turn; BT20-050 satisfies the Cyborg route for 3 and Q4375 flips only the second of three security cards. A real attack into face-up BT20-047 moves Oblivimon face-up to security bottom and leaves HoverEspimon active. BT20-053 receives the target lock only with Oblivimon underneath and only on its controller's turn.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-052.test.ts` — 7 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/primitives.test.ts -t 'addSecurity'` — 9 passed; `pnpm typecheck` — passed.
- Clause scores: stats/evolution routes 2/2; delayed Security free play 2/2; Q4375 next-face-down flip 2/2; face-up-check optional top-card detach/promotion 2/2; inherited turn/stack target lock 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-052.test.ts`).

## BT20-053 — Grademon

- Catalog contract: black/yellow level 5 Vaccine Warrior/X Antibody/Chronicle, play cost 7/7000 DP, black or yellow level-4 evolution cost 4 plus Raptordramon or level-4 Chronicle alternate cost 3; On Play/When Digivolving may free-play Dorumon/Ryudamon from hand to empty breeding, then during an attack grants 1 ally +5000 DP and opponent-Digimon-effect immunity through the opponent's turn; inherited opponent-turn once-per-turn optional redirect to host.
- Knowledge base: Q4721 confirms an effect-driven evolution into Grademon during an opponent's attack satisfies the during-attack branch.
- Implementation evidence: both entry effects share exact hand/name, empty-breeding, free, optional placement followed by independently condition-gated DP and immunity actions. Production effect-driven entry injects the current attacker ID into the timing payload consumed by `duringAttack`. The inherited watcher is opponent-turn, optional, self-targeted, and once tracked. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: hard play free-plays BT20-048 Dorumon and evolution over BT20-051 free-plays BT20-010 Ryudamon, proving both names and the cost-3 Raptordramon/Chronicle route. During a live opposing attack, Q4721's payload makes a 2000-DP ally 7000 and immune to opposing Digimon effects. A BT20-056 host redirects the first of two attacks, preserves security, then the exhausted watcher lets the second check security.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-053.test.ts` — 6 passed.
- Clause scores: stats/ordinary and alternate evolution 2/2; dual entry/empty breeding/name union 2/2; optional free placement 2/2; Q4721 during-attack DP/immunity/duration 2/2; inherited opponent-turn redirect/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-053.test.ts`).

## BT20-054 — Bulbmon

- Catalog contract: black level 5 Data Machine, play cost 7/7000 DP, black level-4 evolution cost 3; Blocker; on the opponent's turn when leaving battle, may free-play 1 play-cost-4-or-lower Digimon card from its evolution cards; inherited opponent-turn once-per-turn optional redirect to host.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: the resident keyword publishes Blocker. The opponent-turn `wouldLeavePlay` replacement is self/battle scoped and runs an optional, free, own-stack Digimon selection capped at play cost 4 without preventing Bulbmon's departure. The inherited watcher is optional, self-targeted, opponent-turn, and once tracked. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: deleting a stack containing play-cost-5 BT20-051 and play-cost-3 BT20-047 on the opponent's turn can play only BT20-047 while Bulbmon and BT20-051 reach trash; the same deletion on its controller's turn cannot play, and refusal also plays nothing. A BT20-056 host with Bulbmon underneath redirects an attack and preserves security; standalone Bulbmon contributes no inherited redirect.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-054.test.ts` — 5 passed.
- Clause scores: stats/evolution route 2/2; live Blocker 2/2; opponent-turn/self-leave scope 2/2; optional free own-stack cost ceiling 2/2; inherited redirect/stack/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-054.test.ts`).

## BT20-055 — Invisimon

- Catalog contract: black/blue level 6 Virus Cyborg/LIBERATOR, play cost 11/11000 DP, black or blue level-5 evolution cost 3; face-up Security End of Opponent's Turn free play; On Play/When Digivolving de-digivolve 2, flip the opponent's top face-down security, then delete 1 opposing Digimon with at most 1 evolution card; on your turn after an allied face-up security check, may place Invisimon's top card face-up at own security bottom.
- Knowledge base: Q4382 requires the next face-down scan; Q4383-Q4387 define face-up security and trigger ordering; Q4388 says moving Invisimon exposes and still triggers the underlying Digimon's End of Attack; Q4722 preserves loss at zero security; Q4723 confirms exposing a Tamer removes the attacking Digimon.
- Implementation evidence: delayed Security and both ordered entry sequences are direct. Audit found `fromDigivolutionTop` moved the card beneath Invisimon, contradicting Q4388/Q4723. The action now targets self with `detachPermanentTop`, moving Invisimon itself face up and promoting the underlying card; the optionality remains on the face-up-check watcher. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: both hard play and evolution over BT20-054 de-digivolve a three-source target by 2, then delete it at one source while flipping only the next face-down security card. Face-up Invisimon plays free at opponent end turn. On a face-up check, acceptance puts Invisimon at security bottom and promoted BT20-050 draws at End of Attack; refusal keeps Invisimon on top and adds no security.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-055.test.ts` — 6 passed.
- Clause scores: stats/evolution routes 2/2; delayed Security free play 2/2; dual entry de-digivolve/flip ordering 2/2; post-de-digivolve deletion boundary 2/2; Q4388 optional top-card detach/promotion 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-055.test.ts`).

## BT20-056 — Alphamon

- Catalog contract: black/yellow level 6 Vaccine Holy Warrior/X Antibody/Royal Knight/Chronicle, play cost 12/11000 DP, black or yellow level-5 evolution cost 3; Barrier; On Play/When Digivolving Recovery +1, then during an attack may free-evolve an allied breeding Digimon into a level-6-or-lower Chronicle from hand/trash; all-turn once per turn, any security removal gives 1 opponent -8000 DP for the turn; inherited once per turn protects Alphamon: Ouryuken from non-own-effect leaving by trashing own top security.
- Knowledge base: Q4389 suppresses When Digivolving effects for this breeding evolution; Q4390 orders Security effects before check/removal triggers; Q4724 confirms effect-driven evolution into Alphamon during an opposing attack satisfies the attack condition.
- Implementation evidence: audit found the Digivolve action named the breeding zone but omitted `targetBreeding`, so generic field resolution found no target. Adding that existing flag routes through the breeding-safe primitive, which evolves in place, pays no cost, and sets `suppressWhenDigivolving`. Recovery precedes it. Barrier, the global security-removal watcher, and the qualified paid leave-prevention replacement are direct; registration is exclusively `registerIrCard`.
- Peer/stack evidence: Q4724's payload recovers a deck card and evolves breeding BT20-051 into BT20-053 free, while Q4389 prevents Grademon's +5000/immunity entry branch. Two security-removal events apply -8000 only once. A BT20-060 host with Alphamon underneath survives an opposing effect by trashing security, but own effects, empty security, and a non-Ouryuken host all leave normally.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-056.test.ts` — 8 passed.
- Clause scores: stats/evolution/Barrier 2/2; dual entry Recovery ordering 2/2; Q4389/Q4724 breeding evolution 2/2; global security-removal -8000/frequency 2/2; inherited name/cause/cost/frequency prevention 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-056.test.ts`).

## BT20-057 — Gankoomon

- Catalog contract: black level 6 Data Holy Warrior/Royal Knight, play cost 12/12000 DP, black or red level-5 evolution cost 4; when played with an allied Huckmon/Jesmon/Sistermon-named Digimon, play cost -4; Reboot and Blocker; On Play/When Digivolving, 1 ally may free-evolve into a level-6-or-lower Huckmon/Jesmon/Sistermon-named or Royal Knight Digimon from hand/trash.
- Knowledge base: Q4294 confirms this card's self reduction stacks with the separate play reduction that can play it, for a total reduction of 6 in that scenario.
- Implementation evidence: the explicit self `wouldBePlayed` reducer and named-presence condition were structurally correct but BT20-057 was missing from the deliberately verified self-reducer allowlist, so payment stayed 12. Its catalog-proven entry now admits the reducer at Before Pay Cost. Both static keywords and both optional free Digivolve actions are direct, enforce level/name-or-trait/source zones and ordinary evolution legality, and registration remains exclusively `registerIrCard`.
- Peer/stack evidence: Sistermon Ciel makes Gankoomon cost 8 while a Machine peer leaves it at 12. On Play evolves BT20-016 into hand BT20-017 Jesmon free; When Digivolving evolves a second BT20-054 into trash BT20-056 Alphamon free, covering the named and Royal Knight arms and both zones. Refusal leaves the target unchanged, while Gankoomon publishes Reboot and Blocker.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-057.test.ts` — 7 passed; `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter/registration/module.test.ts` — 1 passed; `pnpm typecheck` — passed.
- Clause scores: stats/evolution routes 2/2; conditional self play reduction 2/2; live Reboot/Blocker 2/2; dual entry hand/trash/name/Royal Knight evolution 2/2; free cost/legality/optional refusal 2/2.
- Score: 10/10.
- Ambiguity: Q4294 references BT20-05 in its rendered question, but the ruling's self-reduction stacking principle is clear and does not alter this card's isolated -4 clause.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-057.test.ts`).

## BT20-058 — Raidenmon

- Catalog contract: black level 6 Virus Machine, play cost 12/12000 DP, black level-5 evolution cost 4; On Play/When Digivolving deletes 1 opponent at play cost 7 or less; all-turn when leaving battle may free-play 1 play-cost-11-or-lower Cyborg/Machine Digimon from its evolution cards; DigiXros -2 with Raijinmon + Fujinmon + Suijinmon.
- Knowledge base: Q4391 explicitly defines the leave-play candidate union as any qualifying Cyborg or any qualifying Machine under the shared cost-11 ceiling.
- Implementation evidence: both entry deletions and the self/battle leave watcher are direct and ordered. Audit found the direct DigiXros recipe used the wrong `cost` field and shared metadata retained only Raijinmon, so the complete three-name declaration was rejected. The direct IR now uses `count: 2`, and a shared override supplies all three distinct slots to server legality and client highlighting. Registration remains exclusively `registerIrCard`.
- Peer/stack evidence: both play and evolution delete cost-7 BT20-054 while preserving cost-8 BT10-025. On departure, BT9-042 proves the Cyborg arm and BT9-029 the Machine arm; cost-12 Raidenmon and cost-11 nonmatching Jesmon stay ineligible and reach trash, while refusal plays nothing. All three exact hand materials produce a six-cost play and become Raidenmon's evolution cards.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-058.test.ts` — 7 passed; `pnpm --filter @aegis/shared exec vitest run src/effects/digivolutionRequirementsFor.test.ts` — 83 passed; `pnpm typecheck` — passed.
- Clause scores: stats/evolution route 2/2; dual entry cost-7 deletion boundary 2/2; all-turn/self-leave/optional source play 2/2; Q4391 trait union/cost ceiling 2/2; exact three-slot DigiXros -2/cost/stack 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-058.test.ts`).

## BT20-059 — Gankoomon (X Antibody)

- Catalog contract: black level 6 Data Holy Warrior/X Antibody/Royal Knight, play cost 13/13000 DP, black or red level-5 evolution cost 5 plus Gankoomon alternate cost 2; When Digivolving de-digivolves 2, then if Gankoomon/X Antibody is in its evolution cards all allies are immune to opposing Digimon effects through the opponent's turn; opponent-turn all Sistermon/Huckmon-named or Royal Knight allies gain Reboot and Blocker; inherited opponent-turn while host is Jesmon GX, all allies gain both.
- Knowledge base: Q4392-Q4397 define immunity as allowing selection/grant while suppressing effects, immediately suppressing already-applied effects when gained, restoring them when immunity ends, and suppressing granted triggered effects at their timing.
- Implementation evidence: the entry sequence keeps de-digivolve unconditional and gates only a board-wide opponent-Digimon `beAffected` restriction on the source stack's Gankoomon-name/X Antibody-trait union. Resident and inherited opponent-turn keyword grants have distinct exact populations, durations, and host condition. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: evolution over BT20-057 pays 2 and proves the Gankoomon arm; BT20-053 pays 5 and proves X Antibody; BT20-054 pays 5 and remains unprotected. All three de-digivolve a legal stack by 2. On the opponent's turn, source/Royal Knight, Sistermon, and SaviorHuckmon gain both keywords while Dorumon does not; with BT20-059 under BT20-021 Jesmon GX, Dorumon also gains both, but under BT20-060 it does not.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-059.test.ts` — 6 passed.
- Clause scores: stats/ordinary and Gankoomon evolution 2/2; unconditional de-digivolve 2/2; stack-union board immunity/duration 2/2; resident opponent-turn population keywords 2/2; inherited Jesmon GX/all-allies boundary 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-059.test.ts`).

## BT20-060 — Alphamon: Ouryuken

- Catalog contract: black/yellow/red level 7 Vaccine Holy Warrior/X Antibody/Royal Knight/Chronicle ACE, play cost 9/16000 DP, black, yellow, or red level-6 evolution cost 6; Blast DNA Digivolve from Alphamon + Ouryumon; On Play/When Digivolving gives 1 opponent -15000 DP through the opponent's turn, then only when DNA digivolving trashes the opponent's top security and performs Recovery +1; all-turn once per turn, removal from either security stack gains 3 memory; Overflow -5.
- Knowledge base: Q4398 delays the zero-DP rule deletion until the complete entry effect has resolved; Q4399 orders a Security effect ahead of other simultaneous triggers; Q4726 confirms the -15000 DP duration remains through the opponent's turn even if the memory gain interrupts turn progression.
- Implementation evidence: both entry timings share the ordered DP/security/Recovery actions and the DNA-only gate. The exact Blast DNA material names route through the production DNA validator and entry payload. Audit found the security-removal watcher omitted its direction, which the shared primitive correctly defaults to the controller's own stack; adding `sourceFilter.controller: "any"` faithfully represents “security stacks” and makes the card observe its own opponent-security trash. ACE metadata, Overflow, and exclusive `registerIrCard` registration are direct.
- Peer/stack evidence: BT20-056 Alphamon plus BT20-018 Ouryumon is accepted, while substituting BT20-057 is rejected. Normal play and ordinary evolution apply only the DP reduction. The valid DNA path draws, trashes the opposing top security, recovers the next deck card, gains 3 memory, and only then removes the zero-DP opposing Digimon; explicit events for each player's security prove one shared once-per-turn budget.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-060.test.ts` — 9 passed.
- Clause scores: stats/evolution/ACE/Overflow 2/2; exact Blast DNA declaration and rejection boundary 2/2; dual entry DP reduction/duration 2/2; Q4398 DNA-only trash/Recovery/zero-DP ordering 2/2; either-stack memory trigger/frequency 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-060.test.ts`).

## BT20-061 — Impmon

- Catalog contract: purple/red level 3 Virus Evil/LIBERATOR, play cost 3/1000 DP, purple or red level-2 evolution cost 1 plus Yaamon alternate cost 0; On Play reveals 3, adds 1 Evil/Dark Dragon/Evil Dragon-trait card and 1 Yuuki, then bottoms the rest; inherited Your Turn +2000 DP.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: the committed RevealAdd has two independent one-card selection groups, the complete three-trait union, exact Yuuki-name match, and deck-bottom remainder. The alternate evolution metadata coexists with the ordinary level/color route and is selected explicitly when both match. The inherited continuous modifier is self/stack scoped and owner-turn guarded. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: EX7-006 Yaamon supports the cost-0 path while the ordinary purple/red level-2 route remains cost 1. A mixed reveal adds BT20-069 through the Dark Dragon arm and BT20-090 Yuuki while rejecting/bottoming Machine BT20-047. Under BT20-069, Impmon raises the host from 5000 to 7000 only on its controller's turn; a standalone copy receives no inherited modifier.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-061.test.ts` — 5 passed.
- Clause scores: stats/ordinary evolution 2/2; exact Yaamon alternate cost 2/2; reveal count and independent additions 2/2; trait/name boundaries and deck-bottom remainder 2/2; inherited stack/turn DP scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-061.test.ts`).

## BT20-062 — Candlemon

- Catalog contract: purple level 3 Data Flame/Ghost, play cost 3/1000 DP, purple level-2 evolution cost 0; Retaliation; inherited On Deletion may trash 1 card in hand to delete 1 opposing level-4-or-lower Digimon.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: Retaliation is a resident static keyword consumed by the production battle cleanup. The inherited On Deletion action is stack scoped, optional, aborts on refusal, pays exactly one own hand card, and targets exactly one opponent Digimon through the inclusive level-4 boundary. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: standalone Candlemon loses to 5000-DP BT20-069 in battle and Retaliation deletes the winner. Under BT20-069, deletion of the host trashes one selected hand card and deletes level-4 BT20-066 while preserving level-5 BT20-071. Explicit refusal preserves both the hand cost and opponent target.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-062.test.ts` — 5 passed.
- Clause scores: stats/evolution route 2/2; live Retaliation/battle result 2/2; inherited On Deletion stack scope 2/2; hand cost and level-4 boundary 2/2; optional refusal/final zones 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-062.test.ts`).

## BT20-063 — Ghostmon

- Catalog contract: purple level 3 Data Ghost/LIBERATOR, play cost 3/1000 DP, purple level-2 evolution cost 0; On Play reveals 3, adds 1 Ghost-trait card and 1 LIBERATOR-trait card, then bottoms the rest; inherited On Deletion gains 1 memory.
- Knowledge base: Q4285 says the inherited trigger lapses if the deleted host leaves trash before activation; Q4286 says moving Ghostmon itself out of the deleted stack does not invalidate the host-anchored pending effect. The shared timing resolver records every pending source's first permanent identity and one-way `departed` state, which implements that distinction.
- Implementation evidence: RevealAdd uses two independent one-card trait groups and a deck-bottom remainder. The inherited memory action is collected only from Ghostmon beneath the deleted host; the engine's timing snapshot binds the pending inherited effect to the deleted permanent rather than the individual source card, matching Q4285/Q4286. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: a mixed reveal adds Ghost-only BT20-062 and LIBERATOR-only BT20-090 while bottoming Machine BT20-047. Deleting BT20-068 with Ghostmon underneath gains exactly 1 memory; deleting standalone Ghostmon gains none, proving the inherited boundary and stack identity used by the ruling seam.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-063.test.ts` — 5 passed.
- Clause scores: stats/evolution route 2/2; reveal count/groups 2/2; independent trait boundaries/remainder 2/2; inherited stack/deletion/memory result 2/2; Q4285/Q4286 pending-source identity 2/2.
- Score: 10/10.
- Ambiguity: the rendered Q&A says “this card” without naming the other inherited source, but both answers unambiguously define the BT20-063 host-versus-source movement distinction.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-063.test.ts`).

## BT20-064 — Loogamon

- Catalog contract: purple/red level 3 Virus Dark Animal/X Antibody/SoC/SEEKERS, play cost 3/1000 DP, red or yellow level-2 evolution cost 1 plus Bowmon or level-2 SEEKERS alternate cost 0; On Play reveals 3, adds 1 SoC/SEEKERS card and 1 Eiji Nagasumi, then bottoms the rest; inherited Your Turn +2000 DP.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: both alternate requirements are structured independently and share the exact zero cost, while printed red/yellow routes remain available. RevealAdd carries the complete trait union, exact Eiji name, two independent selection groups, and deck-bottom remainder. The inherited continuous modifier is self/stack scoped and owner-turn guarded. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: BT14-006 proves the Bowmon route and BT20-003 proves the level-2 SEEKERS route, both at cost 0 through explicit server-validated indexes. The mixed reveal adds BT20-070 by SoC/SEEKERS and BT14-087 Eiji while bottoming Machine BT20-047. Under BT20-070 the inherited source raises 6000 DP to 8000 only on its controller's turn; standalone Loogamon is unchanged.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-064.test.ts` — 5 passed.
- Clause scores: stats/ordinary evolution 2/2; both alternate routes/costs 2/2; reveal count/independent additions 2/2; trait/name boundaries/remainder 2/2; inherited stack/turn DP scope 2/2.
- Score: 10/10.
- Ambiguity: catalog colors are purple/red while its printed ordinary evolution entries are red/yellow; tests treat those committed fields independently without inventing a purple route.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-064.test.ts`).

## BT20-065 — Wormmon

- Catalog contract: purple level 3 Free Larva, play cost 3/1000 DP, purple or red level-2 evolution cost 0; On Play may trash 1 own hand card to give 1 opponent Digimon “[On Deletion] Lose 1 memory” through the end of that opponent's turn; inherited Retaliation.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: the costed optional GrantAura targets exactly one opposing Digimon and routes its exact quoted text through the registered granted-effect library. The shared action defaults this action family to `UntilOpponentTurnEnd`, anchors the grant to the recipient top card, and resolves its On Deletion memory loss from that card's controller perspective. The inherited keyword is stack-only. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: paying with BT1-085 installs the named effect on BT1-009 with the exact duration; deleting it moves the gauge 1 against its controller. With no hand card after Wormmon is played, no grant installs and deletion changes no memory. Under BT20-066, Wormmon confers Retaliation, while standalone Wormmon does not.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-065.test.ts` — 5 passed.
- Clause scores: stats/evolution routes 2/2; On Play opponent target 2/2; hand cost/payability boundary 2/2; granted On Deletion memory/duration 2/2; inherited Retaliation stack scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-065.test.ts`).

## BT20-066 — Stingmon

- Catalog contract: purple level 4 Free Insectoid, play cost 4/4000 DP, purple or red level-3 evolution cost 2; On Play/When Digivolving deletes 1 opposing level-3 Digimon, then on its controller's turn may DNA digivolve 2 own Digimon into a hand Digimon with Imperialdramon in name or the Free trait, paying its cost; inherited Retaliation.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: both entry timings preserve the ordered exact-level deletion before an optional, owner-turn-gated two-material DNA action. The result filter is the Imperialdramon-name/Free-trait union, hand-only, and delegates exact material and cost validation to the shared DNA primitive. The inherited keyword is stack-only. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: On Play deletes BT20-061 at exactly level 3, then BT20-074 Dinobeemon plus BT20-016 Paildramon DNA digivolve into hand BT20-076 Imperialdramon, preserving both material stacks beneath the result. Effect-driven When Digivolving on the opponent's turn still deletes level 3 but leaves the Imperialdramon in hand. Under BT20-074, Stingmon confers Retaliation; standalone Stingmon does not.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-066.test.ts` — 7 passed.
- Clause scores: stats/evolution routes 2/2; dual entry exact-level deletion 2/2; owner-turn/optional DNA gate 2/2; result union/material/cost/zone behavior 2/2; inherited Retaliation stack scope 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-066.test.ts`).

## BT20-067 — Soulmon

- Catalog contract: purple level 4 Virus Ghost, play cost 4/4000 DP, purple level-3 evolution cost 2; On Play/When Digivolving gives 1 own Digimon Retaliation through the opponent's turn; inherited On Deletion may trash 1 hand card to delete 1 opposing level-4-or-lower Digimon.
- Knowledge base: the card query has no card-specific entries.
- Implementation evidence: both entry timings share the exact one-allied-Digimon keyword grant and `untilOpponentTurnEnd` duration. The inherited action is stack scoped, optional, aborts on refusal, pays exactly one own hand card, and uses the inclusive level-4 opponent boundary. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: hard play and evolution over BT20-063 each grant live Retaliation to BT20-061 through the production target selector. Under BT20-068, host deletion pays BT20-047 from hand and deletes level-4 BT20-066 while preserving level-5 BT20-071.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-067.test.ts` — 5 passed.
- Clause scores: stats/evolution route 2/2; On Play Retaliation grant 2/2; When Digivolving grant/duration 2/2; inherited hand cost/stack scope 2/2; opponent level boundary/final zones 2/2.
- Score: 10/10.
- Ambiguity: none.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-067.test.ts`).

## BT20-068 — Bakemon

- Catalog contract: purple level 4 Virus Ghost/LIBERATOR, play cost 4/4000 DP, purple level-3 evolution cost 2; When Digivolving, at 1 or fewer own Tamers may free-play Violet Inboots from hand; inherited On Deletion gains 1 memory.
- Knowledge base: Q4285 makes a pending inherited effect lapse if deleted Bakemon, the host carrying it, leaves trash before activation; Q4286 preserves the pending effect if only Ghostmon's source card moves. The shared timing resolver's first-permanent identity and one-way departure latch implements this host/source distinction.
- Implementation evidence: the entry action is optional, hand-only, exact-name, cost-free, and gates on an inclusive own-Tamer count of 1. The inherited memory action is stack scoped and resolves from the deleted host snapshot. Registration is exclusively through `registerIrCard`.
- Peer/stack evidence: evolution over BT20-063 free-plays BT20-088 at exactly 0 and 1 Tamer, but not at 2; explicit refusal leaves Violet in hand. Deleting neutral BT20-069 with Bakemon underneath gains exactly 1 memory, exercising the inherited host snapshot without another deletion trigger obscuring the result.
- Tests: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-068.test.ts` — 6 passed.
- Clause scores: stats/evolution route 2/2; exact Violet/name/hand/free play 2/2; 0/1/2-Tamer boundary 2/2; optional refusal 2/2; inherited deletion memory/Q4285-Q4286 source identity 2/2.
- Score: 10/10.
- Ambiguity: the rendered Q&A's “this card” does not identify the other inherited source, but its host-versus-source movement rule is explicit.
- Commit: this card's atomic audit commit (resolve with `git log -- apps/api/src/cards/BT20/BT20-068.test.ts`).
