# BT13 Card Implementation Revalidation

This ledger records a fresh, ascending-ID revalidation against the committed catalog, local knowledge base, direct compiled IR, shared interpreter primitives, peer/evolution interactions exercised by the focused suites, and observable game state. Historical merged audit work was treated only as input; every score below was recalculated from the current branch.

## BT13-001 — Pinamon — 10/10

- Catalog evidence: Red DigiEgg level 2, play cost -1, DP 0; forms In-Training; traits/types Bird; evolution requirements none; printed clauses: [On Deletion] Delete 1 of your opponent's Digimon with 2000 DP or less..
- Knowledge base: `node tools/kb/query.mjs card BT13-001` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion and actions Delete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-001", compiled)`.
- Behavioral proof: isolated file `BT13-001.test.ts` passed 2 tests in its own Vitest process. Observable cases: deletes an opposing Digimon with exactly 2000 DP when its evolved stack is deleted; does not delete an opposing Digimon above 2000 DP. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-002 — Chapmon — 10/10

- Catalog evidence: Blue DigiEgg level 2, play cost -1, DP 0; forms In-Training; traits/types Lesser; evolution requirements none; printed clauses: [Opponent's Turn] While you have another Digimon, this Digimon gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-002` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OpponentsTurn and actions Aura, modifyDP, youHave; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-002", compiled)`.
- Behavioral proof: isolated file `BT13-002.test.ts` passed 4 tests in its own Vitest process. Observable cases: gives its evolved stack +1000 DP during the opponent's turn while you have another Digimon; does not give the bonus during its controller's turn; does not count its own evolved stack as another Digimon; does not count a Digimon in the breeding area as another Digimon. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-003 — Kyaromon — 10/10

- Catalog evidence: Yellow DigiEgg level 2, play cost -1, DP 0; forms In-Training; traits/types Lesser; evolution requirements none; printed clauses: [Your Turn][Once Per Turn] When a card is removed from your security stack, 1 of your Digimon gains ＜Jamming＞ for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-003` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn and actions SubTrigger, triggerRemovedSecuritySeat, GainKeyword; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-003", compiled)`.
- Behavioral proof: isolated file `BT13-003.test.ts` passed 3 tests in its own Vitest process. Observable cases: grants Jamming when its controller's security is removed and expires at turn end; grants Jamming only once across two own-security removal events in the same turn; does not trigger when the opponent's security is removed. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-004 — Budmon — 10/10

- Catalog evidence: Green DigiEgg level 2, play cost -1, DP 0; forms In-Training; traits/types Vegetation; evolution requirements none; printed clauses: [Your Turn] While your opponent has a suspended Digimon, this Digimon gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-004` reviewed; applicable entries Q2257; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn and actions Aura, modifyDP, opponentHas; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-004", compiled)`.
- Behavioral proof: isolated file `BT13-004.test.ts` passed 4 tests in its own Vitest process. Observable cases: gives its evolved stack +1000 DP during its turn while the opponent has a suspended Digimon; does not give the bonus while every opposing Digimon is unsuspended; does not give the bonus during the opponent's turn; applies the bonus after an opposing Blocker suspends and before their battle (Q2257). Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-005 — Dorimon — 10/10

- Catalog evidence: Black DigiEgg level 2, play cost -1, DP 0; forms In-Training; traits/types Lesser, X Antibody; evolution requirements none; printed clauses: [When Attacking] If this Digimon has 4 or more digivolution cards, ＜Draw 1＞. (Draw 1 card from your deck.).
- Knowledge base: `node tools/kb/query.mjs card BT13-005` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking and actions Draw, selfDigivolutionCountAtLeast; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-005", compiled)`.
- Behavioral proof: isolated file `BT13-005.test.ts` passed 2 tests in its own Vitest process. Observable cases: draws 1 when its evolved stack attacks with exactly 4 digivolution cards; does not draw when its evolved stack attacks with only 3 digivolution cards. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-006 — Kapurimon — 10/10

- Catalog evidence: Purple DigiEgg level 2, play cost -1, DP 0; forms In-Training; traits/types Lesser; evolution requirements none; printed clauses: [On Deletion] By trashing 1 card in your hand, delete 1 of your opponent's level 3 Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-006` reviewed; applicable entries Q2258; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion and actions Delete, trash; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-006", compiled)`.
- Behavioral proof: isolated file `BT13-006.test.ts` passed 3 tests in its own Vitest process. Observable cases: trashes 1 hand card to delete an opposing level 3 when its evolved stack is deleted; may decline without trashing a hand card or deleting the level 3; may trash the hand cost even when there is no opposing level 3 (Q2258). Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-007 — King Drasil_7D6 — 10/10

- Catalog evidence: White Digi-Egg, no level or payable play cost, 0 DP; Mega form; Unknown attribute; `9000` type; no evolution requirements. Printed clauses independently checked: the breeding-area own-turn digivolution lock; the optional once-per-turn Royal Knight Digimon play-cost reduction of 4 plus 1 per source; the mandatory Start of Main top Digi-Egg and all allied battle-area Royal Knight placement under this card; and the inherited breeding-area once-per-turn memory gain when a Royal Knight Option enters the battle area.
- Knowledge base: `node tools/kb/query.mjs card BT13-007` reviewed Q2259-Q2265, Q2340, Q2369, and Q2463. The suite proves the card's mandatory processing and bottom-placement behavior; Q2259-Q2261 establish that the restriction includes DNA/Burst and Tamers temporarily treated as Digimon, but not a Tamer using a requirement that evolves directly from a Tamer. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-007.ts` maps the clauses to breeding-resident `Restrict`, nested `Replacement` cost reduction with `digivolutionCards` scaling, `PlaceUnder` from the Digi-Egg deck, whole-permanent Royal Knight relocation, and inherited `SubTrigger(whenOptionPlayed)` plus `GainMemory`. Traced through the breeding timing guard, continuous restriction store and digivolve legality consumer, replacement subscription/once-per-turn budget, `placeUnderFromEggDeck`, `relocatePermanentByEffect`, trait/controller targeting, Option-play event dispatch, and memory primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-007", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: EX6-006 confirms the same breeding Start-of-Main egg-deck seam; BT13-110 supplies the real Royal Knight Option interaction. The focused mixed board distinguishes AD1-008 Royal Knight from BT1-015 non-Royal-Knight, uses a two-card source stack for the exact scaled reduction, retains the nonmatching permanent, verifies controller ownership, and exercises both shared once-per-turn keys independently.
- Behavioral proof: isolated `BT13-007.test.ts` passed 5 tests in its own Vitest process: blocks an allied Digimon's digivolution only while King Drasil supplies the breeding restriction; reduces exactly one Royal Knight play by 6 and charges the second at full cost; permits declining the optional reduction; places the face-down top Digi-Egg and every matching Royal Knight under the host while leaving a nonmatching Digimon in battle; and gains memory only once across two Royal Knight Options. Reverting the card's restriction, scaling, egg/permanent placement, trait filter, or frequency paths makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.
## BT13-008 — Agumon — 10/10

- Catalog evidence: Red/Yellow level 3 Digimon, play cost 3, 2000 DP; Rookie/Vaccine/Dinosaur; evolves from red or yellow level 2 for 1 and alternatively from Koromon for 0. Printed clauses independently checked: once-per-turn Main treatment of one Marcus Damon as a 3000 DP Digimon that cannot digivolve for the turn, and the inherited own-turn once-per-turn optional deletion of an opposing 3000-DP-or-less Digimon when an allied red or yellow Tamer suspends.
- Knowledge base: `node tools/kb/query.mjs card BT13-008` reviewed Q2266, Q2267, and Q5981-Q5985. The implementation preserves both Tamer and Digimon identity, supplies the 3000 base DP and attack legality, retains Tamer-effect provenance, and leaves ordinary same-turn attack restrictions to the shared combat rules. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-008.ts` maps the alternate evolution requirement directly and maps Main to duration-scoped `GrantStatic(kinds)`, `SetBaseDP`, and `Restrict(digivolve)` actions over one allied Marcus Damon. Its inherited `SubTrigger(whenSuspended)` filters controller, Tamer kind, and red/yellow colors before an optional DP-bounded `Delete`. Traced through alternate-evolution matching, activatable Main/frequency identity, target selection, kind/base-DP duration ledgers, continuous legality readers, suspension subject matching, optional targeting, DP filtering, deletion, ownership, and turn/frequency gates. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-008", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT12-092 provides the realistic Marcus Damon Tamer interaction and inherited-effect host behavior; BT13-097 supplies a blue-only near-match that must not trigger. The stack test evolves from a real Koromon at zero cost, the Main proof observes the selected Marcus as attack-legal with 3000 DP and a digivolve restriction, and the inherited fixture preserves a 4000-DP non-target while consuming its once-per-turn budget on only one eligible target.
- Behavioral proof: isolated `BT13-008.test.ts` passed 5 tests in its own Vitest process: uses the Koromon alternate requirement for 0 memory; turns Marcus into an attack-legal 3000 DP Digimon that cannot digivolve; deletes exactly one eligible opposing Digimon and not a 4000-DP Digimon, then refuses a second same-turn trigger; permits declining the optional deletion; and ignores a blue-only Tamer suspension. Reverting the card-specific alternate requirement, kind/DP/restriction grants, color filter, DP boundary, optionality, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-009 — Huckmon — 10/10

- Catalog evidence: Red level 3 Digimon, play cost 3, 2000 DP; Rookie/Data/Mini Dragon; evolves from red level 2 for 0. Printed clauses independently checked: during its controller's turn, an allied Sistermon-name Digimon play may evolve this Digimon into BaoHuckmon from hand without paying the cost; its inherited own-turn once-per-turn effect gains 1 memory from the same allied Sistermon play event.
- Knowledge base: `node tools/kb/query.mjs card BT13-009` reviewed Q2268. The Sistermon's On Play effect and Huckmon's reaction trigger simultaneously and remain player-orderable through the shared triggered-effect ordering seam; neither clause is incorrectly nested behind the other. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-009.ts` maps both clauses to own-turn `SubTrigger(whenPlayed)` watchers with allied Digimon and Sistermon-name subject filters. The first performs an optional self-targeted hand `Digivolve` into BaoHuckmon with `payCost: false`; the inherited watcher performs `GainMemory` under a once-per-turn budget. Traced through play-event emission, subject controller/kind/name matching, trigger ordering, optional resolution, hand candidate selection, self-stack evolution, zero-cost payment, evolution event processing, inherited-source anchoring, memory gain, and use-ledger frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-009", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-013 uses the same Sistermon reaction vocabulary for the next realistic Huckmon-family evolution step, while BT6-082 supplies a real Sistermon and BT13-013 a real BaoHuckmon. The positive fixture retains Huckmon as an evolution source, the decline fixture preserves BaoHuckmon in hand, the inherited stack uses Huckmon under a legal host, and the non-Sistermon Digimon fixture proves the name boundary. Controller and own-turn guards are supplied by the watcher and timing builder; the second matching play proves the inherited once-per-turn budget is shared only for that source.
- Behavioral proof: isolated `BT13-009.test.ts` passed 4 tests in its own Vitest process: may evolve into BaoHuckmon from hand for 0 memory after an allied Sistermon play; may decline and leave both Huckmon and BaoHuckmon unchanged; gains memory on only the first of two allied Sistermon plays in the turn; and does not trigger for a Digimon without Sistermon in its name. Reverting the subject filter, optional evolution, free-cost flag, inherited anchoring, memory action, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-010 — Biyomon — 10/10

- Catalog evidence: Red level 3 Digimon, play cost 3, 1000 DP; Rookie/Vaccine/Bird; evolves from red level 2 for 0. Printed clauses independently checked: On Play, only when played by an effect, may return one allied Kristy Damon to hand and then evolve this Digimon into a Garudamon in hand while ignoring requirements and paying no evolution cost; inherited On Deletion draws 1.
- Knowledge base: `node tools/kb/query.mjs card BT13-010` reviewed Q2269. Paying the Kristy return cost is legal even when no Garudamon candidate exists, so the implementation correctly keeps the cost and optional evolution outcome separable. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-010.ts` maps On Play to a self-targeted optional `Digivolve` from hand with `triggerEnteredByEffect`, `payCost: false`, and `ignoreRequirements: true`, plus an allied Kristy-name return cost and decline abort. The inherited clause is `OnDeletion` plus owner `Draw 1`. Traced through effect-entry provenance production/condition reading, optional/cost ordering, permanent return-to-hand movement, hand name selection, requirement bypass, free evolution and stack transition, On Deletion source preservation, deck draw, ownership, and empty-candidate behavior. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-010", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT15-088 provides a real Security effect that plays Biyomon by effect; BT13-094 is the exact Kristy Damon cost; BT13-014 supplies a real Garudamon and its When Digivolving replay demonstrates that the returned Kristy actually changed zones before evolution. The normal hard-play negative proves provenance gating, while the inherited stack deletion proves correct source/controller retention after the host leaves play. No printed once-per-turn limit applies.
- Behavioral proof: isolated `BT13-010.test.ts` passed 4 tests in its own Vitest process: a real Security effect plays Biyomon, returns Kristy, evolves to Garudamon for free ignoring requirements, and retains Biyomon underneath; Q2269 returns Kristy even with no Garudamon in hand; a normal play neither returns Kristy nor evolves; and deletion of a host carrying Biyomon draws exactly one card. Reverting entry provenance, return-cost ordering, free/ignore flags, target names, or inherited deletion draw makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-011 — Aquilamon — 10/10

- Catalog evidence: Red level 4 Digimon, play cost 5, 5000 DP; Champion/Free/Giant Bird; evolves from red level 3 for 2. Printed clauses independently checked: both On Play and When Digivolving delete one opposing Digimon with 3000 DP or less; inherited On Deletion draws 1.
- Knowledge base: `node tools/kb/query.mjs card BT13-011` reviewed; no card-specific entries exist and the printed thresholds and timings are unambiguous.
- Implementation and primitive trace: `BT13-011.ts` carries distinct On Play and When Digivolving records with identical opponent/Digimon/DP-at-most-3000 single-target `Delete` actions, plus inherited On Deletion owner `Draw 1`. Traced through timing registration and source anchoring, opponent ownership, effective DP matching at the inclusive boundary, target selection, deletion/leave processing, inherited-effect survival into the deletion window, and deck-to-hand draw. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-011", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: the focused evolution stack uses a real red level 3 base and preserves it under Aquilamon after paying the catalog cost; the mixed opponent board distinguishes the eligible 3000-DP Digimon from an ineligible 4000-DP Digimon. BT13-008 and BT13-012 use the same inclusive 3000-DP deletion vocabulary, confirming consistent filter semantics. Neither printed effect is optional or frequency-limited.
- Behavioral proof: isolated `BT13-011.test.ts` passed 3 tests in its own Vitest process: On Play deletes the 3000-DP opposing Digimon and preserves the 4000-DP near-match; a real evolution fires the independent When Digivolving deletion and leaves Aquilamon atop its base; and deletion of a host carrying Aquilamon draws exactly one card. Reverting either timing record, the DP/controller boundary, deletion primitive, or inherited draw makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-012 — GeoGreymon — 10/10

- Catalog evidence: Red/Yellow level 4 Digimon, play cost 5, 5000 DP; Champion/Vaccine/Dinosaur; evolves from red or yellow level 3 for 3 and alternatively from a level 3 with Agumon in its name and Dinosaur trait for 2. Printed clauses independently checked: When Digivolving privately searches security, may play one red/yellow Tamer free, recovers from deck only if it played one, then shuffles security; inherited own-turn once-per-turn may delete one opposing 3000-DP-or-less Digimon when an allied red/yellow Tamer suspends. The catalog restriction to one deck copy was also noted.
- Knowledge base: `node tools/kb/query.mjs card BT13-012` reviewed Q2270-Q2271. Security search is private; if no eligible card is chosen, recovery does not occur and security still shuffles. The focused proof separately covers accepting, declining, and having no eligible Tamer. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-012.ts` directly records the Agumon-name plus Dinosaur-trait alternate requirement and maps When Digivolving to optional security `PlayWithoutCost`, conditional deck-to-security `SecurityManipulation(addTop)` gated by `ifThisEffectActed`, then security shuffle. Its inherited `SubTrigger(whenSuspended)` filters allied red/yellow Tamers before optional opponent/Digimon/DP-at-most-3000 deletion under a once-per-turn budget. Traced through alternate requirement matching, security candidate privacy and selection, free play/zone transition, acted-result binding, recovery ordering, shuffle, suspension subject filtering, deletion, ownership, turn, and frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-012", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-008 is a real matching Agumon/Dinosaur base and shares the inherited red/yellow Tamer deletion vocabulary; BT12-092 supplies the eligible multicolor Marcus Tamer; BT13-015 supplies the next realistic GeoGreymon evolution step. Mixed opponent targets preserve a 4000-DP near-match, and the second suspension proves the inherited once-per-turn budget. The optional security branch now proves both consent outcomes with the same eligible card.
- Behavioral proof: isolated `BT13-012.test.ts` passed 4 tests in its own Vitest process: evolves through the alternate requirement for 2, plays Marcus from security free, recovers, and leaves correct memory/security/deck state; Q2271 does not recover with no eligible Tamer; declining an eligible Marcus leaves it in security and does not recover; and the inherited effect deletes only one eligible 3000-DP target across two same-turn suspension events while preserving a 4000-DP Digimon. Reverting the alternate name/trait gate, security color/kind filter, optionality, acted binding, recovery/shuffle ordering, DP filter, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-013 — BaoHuckmon — 10/10

- Catalog evidence: Red level 4 Digimon, play cost 5, 5000 DP; Champion/Data/Dinosaur; evolves from red level 3 for 2. Printed clauses independently checked: during its controller's turn, an allied Sistermon-name Digimon play may evolve this Digimon into SaviorHuckmon from hand for its evolution cost, reduced by exactly 2 for this effect; inherited own-turn once-per-turn gains 1 memory from an allied Sistermon play.
- Knowledge base: `node tools/kb/query.mjs card BT13-013` reviewed Q2272-Q2273. The inherited effect acquired after the triggering Sistermon play cannot trigger retroactively, and the Sistermon On Play and BaoHuckmon reaction are simultaneous effects whose order remains player-chosen. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-013.ts` maps the allied Sistermon play to an own-turn `SubTrigger(whenPlayed)` whose optional self-targeted `Digivolve` selects SaviorHuckmon from hand with normal cost payment. A same-record `Replacement(wouldDigivolve)` scopes a nested `reduceCost` amount 2 to self; the inherited watcher maps the same play subject to `GainMemory` under a once-per-turn budget. Traced through subject controller/kind/name matching, simultaneous trigger ordering, optional refusal, hand evolution selection, self-scoped replacement subscription, cost calculation/payment, evolution stack transition, inherited source timing, non-retroactivity, memory gain, and frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-013", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-009 is the preceding Huckmon-family Sistermon reaction and BT13-016 is the real SaviorHuckmon evolution target; BT6-082 supplies the matching Sistermon. The positive stack retains BaoHuckmon under SaviorHuckmon and proves an exact one-memory evolution payment after the 2 reduction; the refusal path leaves SaviorHuckmon in hand; the inherited host sees two Sistermon plays but gains memory only from the first. Q2272 is exercised in a realistic newly evolved stack.
- Behavioral proof: isolated `BT13-013.test.ts` passed 4 tests in its own Vitest process: evolves to SaviorHuckmon after a Sistermon play and pays the catalog cost reduced by exactly 2; does not gain the newly acquired inherited memory for that already-triggered play; may decline and preserve both BaoHuckmon and SaviorHuckmon with no evolution payment; and gains inherited memory only once across two allied Sistermon plays. Reverting the subject filter, optionality, self scope, replacement amount, payment path, inherited timing, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-014 — Garudamon — 10/10

- Catalog evidence: Red level 5 Digimon, play cost 7, 7000 DP; Ultimate/Vaccine/Birdkin; evolves from red level 4 for 3. Printed clauses independently checked: both On Play and When Digivolving may play one red Tamer with play cost 3 or less from hand without paying; inherited On Deletion deletes one opposing Digimon with 6000 DP or less.
- Knowledge base: `node tools/kb/query.mjs card BT13-014` reviewed Q2615 and its BT16-011/BT13-065 interaction. If an externally granted trigger condition ceases to be met before activation, the queued effect cannot activate; the shared timing/activation guard owns that cross-card rule. No unresolved behavior remains in BT13-014's direct clauses.
- Implementation and primitive trace: `BT13-014.ts` has separate On Play and When Digivolving records with optional hand `PlayWithoutCost` targeting one allied red Tamer at `playCostLte: 3`, plus inherited On Deletion opponent/Digimon/DP-at-most-6000 `Delete`. Traced through both timing builders, hand controller/kind/color/cost filtering, optional refusal, free-play zone transition and On Play processing, inherited source anchoring after host deletion, effective DP matching, target selection, and deletion ownership. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-014", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-010 supplies a realistic Biyomon-to-Garudamon effect evolution and returned Kristy interaction; BT13-011 is a legal red level 4 base; BT13-094 is the exact eligible cost-3 red Tamer, while BT1-085 is a cost-4 red near-match. The inherited mixed board distinguishes the inclusive 6000-DP target from 7000 DP. Neither clause has a printed frequency limit.
- Behavioral proof: isolated `BT13-014.test.ts` passed 4 tests in its own Vitest process: On Play plays a cost-3 red Tamer free while preserving the cost-4 red near-match; real evolution fires the independent When Digivolving branch and pays only the evolution cost; optional refusal leaves the eligible Tamer in hand and pays only Garudamon's play cost; and deletion of a host carrying Garudamon deletes the 6000-DP opponent while preserving 7000 DP. Reverting either timing, the red/Tamer/cost filter, optionality, free-play flag, inherited anchor, or DP boundary makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-015 — RizeGreymon — 10/10

- Catalog evidence: Red/Yellow level 5 Digimon, play cost 7, 7000 DP; Ultimate/Vaccine/Cyborg; evolves from red or yellow level 4 for 4 and alternatively from GeoGreymon for 3. Printed clauses independently checked: When Digivolving may play one Marcus Damon from hand free; both the main and inherited all-turns once-per-turn watchers place one Marcus Damon from trash face down on top of own security when an allied red/yellow Tamer is deleted.
- Knowledge base: `node tools/kb/query.mjs card BT13-015` reviewed Q2274. When the deleted qualifying Tamer is Marcus Damon, that exact just-deleted card is already a legal trash candidate and may be placed into security. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-015.ts` directly records the GeoGreymon alternate evolution and optional hand `PlayWithoutCost` for a Marcus Damon name. Its main and inherited All Turns records each install `SubTrigger(onDeletionOf)` filtered to allied red/yellow Tamers and resolve trash `SecurityManipulation(placeAsSecurity)` for one Marcus Damon with `toTop: true` under independent once-per-turn source budgets. Traced through alternate matching/cost payment, optional free play, deletion event subject/controller/kind/color matching, post-deletion trash availability, name selection, trash extraction, face-down top-security insertion, source anchoring, all-turn timing, and frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-015", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-012 supplies the real GeoGreymon base, BT13-018 supplies the next RizeGreymon family evolution, BT12-092 and BT13-094 provide red/yellow Tamer deletion subjects, and BT13-008's treat-as-Digimon path makes Marcus deletable by DP while retaining Tamer identity. The direct Q2274 fixture asserts exact instance identity and face-down/top ordering; the inherited stack fires once across two qualifying deletions.
- Behavioral proof: isolated `BT13-015.test.ts` passed 4 tests in its own Vitest process: evolves from GeoGreymon for 3 and plays Marcus free; may decline and leave Marcus in hand while paying only the evolution cost; deletes a Marcus treated as a Digimon and moves that exact instance from trash face down to the top of security; and provides the same security placement as an inherited effect only once across two qualifying deletions. Reverting the alternate route, optionality, free-play flag, deletion filter, trash timing, exact name selection, face state/top position, inherited anchoring, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-016 — SaviorHuckmon — 10/10

- Catalog evidence: Red level 5 Digimon, play cost 8, 8000 DP; Ultimate/Data/Dragonkin; evolves from red level 4 for 3. Printed clauses independently checked: during its controller's turn, an allied Sistermon-name Digimon play may evolve this Digimon into a Jesmon-name Digimon in hand for its evolution cost reduced by exactly 2; inherited When Attacking once per turn, only when the host has Royal Knight, may play one Sistermon-name Digimon from hand or trash free.
- Knowledge base: `node tools/kb/query.mjs card BT13-016` reviewed Q2275. The triggering Sistermon's On Play and SaviorHuckmon's evolution reaction are simultaneous and remain player-orderable through the shared trigger ordering seam. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-016.ts` maps allied Sistermon play to an own-turn `SubTrigger(whenPlayed)` with optional self `Digivolve` into a hand Digimon whose name contains Jesmon and normal cost payment, plus a self-scoped nested `Replacement(wouldDigivolve/reduceCost: 2)`. Its inherited When Attacking action condition checks the live host's Royal Knight trait, then optionally `PlayWithoutCost`s one allied Sistermon-name Digimon from hand or trash under a once-per-turn budget. Traced through subject matching/order, optional refusal, hand evolution and cost replacement/payment, live stack trait evaluation, attack source anchoring, mixed-zone candidate selection/extraction, free play, On Play handling, ownership, and frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-016", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-013 is the preceding paid/reduced Sistermon reaction; BT13-017 supplies both the real Jesmon evolution target and Royal Knight inherited host; BT6-082 supplies matching hand/trash Sistermon cards. A non-Royal-Knight BT1-021 host proves the trait boundary, and two attack windows prove the inherited once-per-turn budget. Separate refusal fixtures cover both printed optional clauses.
- Behavioral proof: isolated `BT13-016.test.ts` passed 5 tests in its own Vitest process: evolves into Jesmon after a Sistermon play with the cost reduced by exactly 2; may decline and preserve SaviorHuckmon/Jesmon; a Royal Knight host plays one Sistermon from trash free across two attacks; a non-Royal-Knight host cannot play one; and a qualifying Royal Knight host may decline the inherited hand play. Reverting the Sistermon/Jesmon name filters, optionality, self-scoped replacement, reduction amount, Royal Knight condition, hand/trash sources, free-play flag, inherited anchor, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-017 — Jesmon — 10/10

- Catalog evidence: Red level 6 Digimon, play cost 11, 11000 DP; Mega/Data/Holy Warrior and Royal Knight; evolves from red level 5 for 3. Printed clauses independently checked: On Play and When Digivolving may delete any number of opposing Digimon whose combined DP is at most 6000 plus 2000 for each other allied Digimon; during all turns, every allied Digimon gets +1000 DP for each other allied Sistermon-name or Royal Knight-trait Digimon.
- Knowledge base: `node tools/kb/query.mjs card BT13-017` reviewed; no card-specific entries exist and the aggregate budget, self-exclusion, inclusive cap, and aura scaling are unambiguous.
- Implementation and primitive trace: `BT13-017.ts` maps both activation timings to `DeleteByDPBudget` over opposing Digimon with base 6000 and a 2000-per-other-allied-Digimon scale. Its All Turns `ModifyDP` targets all allied Digimon and scales by other allied Digimon matching Sistermon name or Royal Knight trait. Traced through timing registration, live DP candidate ordering, aggregate optional selection and budget enforcement, self-excluding allied count, multi-delete/leave handling, continuous re-derivation, trait/name OR matching, all-recipient DP modification, ownership, and source exclusion. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-017", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-016 is the realistic SaviorHuckmon base; BT6-082 and BT13-040 provide distinct Sistermon-name and Royal Knight-trait aura scalers, while BT1-012 is a nonmatching allied recipient. Mixed deletion fixtures prove exact 10000/11000 and 8000/9000 scaled boundaries, two-target combined selection at the unscaled 6000 cap, and zero-target refusal. Jesmon's own Royal Knight trait is correctly excluded from both scaling counts.
- Behavioral proof: isolated `BT13-017.test.ts` passed 4 tests in its own Vitest process: On Play adds exactly 2000 per two other allies and deletes 10000 but not 11000 DP; When Digivolving applies the same exact scaled boundary in a real stack; the base budget deletes two 3000-DP targets together and permits choosing none; and one Sistermon plus one other Royal Knight gives every allied Digimon, including nonmatching recipients, exactly +2000 DP. Reverting either timing, aggregate selection, base/bonus amounts, ownership/self filters, name/trait matching, aura recipients, or continuous scaling makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-018 — ShineGreymon — 10/10

- Catalog evidence: Red/Yellow level 6 Digimon, play cost 12, 12000 DP; Mega/Vaccine/Light Dragon; evolves from red or yellow level 5 for 4 and alternatively from a level 5 with RizeGreymon in its name for 3. Printed clauses independently checked: at Start of Main and When Digivolving, until the end of the opponent's turn one allied Marcus Damon is also a 3000 DP Digimon, cannot digivolve, and gains Blocker; all turns once per turn, an allied red/yellow Tamer suspension gives one opposing Digimon -6000 DP for the turn.
- Knowledge base: `node tools/kb/query.mjs card BT13-018` reviewed Q2276 and Q5986-Q5991. Marcus remains both Tamer and Digimon, gains inherited effects, observes ordinary same-turn attack restrictions, is deleted by rule processing at 0 DP, has later base-DP treatments overwrite earlier ones, and its effects retain both Tamer/Digimon provenance. These are shared treat-as-kind/base-DP semantics with no unresolved card-specific ambiguity.
- Implementation and primitive trace: `BT13-018.ts` records the RizeGreymon alternate requirement and parallel Start-of-Main/When-Digivolving action groups: selected allied Marcus Tamer receives duration-scoped Digimon kind plus base 3000 DP, digivolve restriction, and Blocker through the end of the opponent's turn. An All Turns `SubTrigger(whenSuspended)` filters allied red/yellow Tamers before one opposing Digimon receives -6000 DP for the turn under a once-per-turn budget. Traced through timing/source collection, selection identity across three actions, kind/base-DP/keyword/restriction duration ledgers, effective dual-kind reads, suspension subject color/ownership matching, DP modification/rule processing, and frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-018", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-008 uses the same Marcus treat-as-Digimon primitives for a shorter duration; BT13-015 is the realistic RizeGreymon base; BT13-020 consumes ShineGreymon in the next Burst evolution. BT12-092 supplies the matching Marcus and BT13-097 a blue-only Tamer near-match. Both printed grant timings are exercised independently, and two suspension events prove one DP reduction per turn.
- Behavioral proof: isolated `BT13-018.test.ts` passed 4 tests in its own Vitest process: Start of Main makes Marcus exactly 3000 DP with Blocker and a digivolve restriction; a real alternate evolution from RizeGreymon for 3 applies the same complete grant set; the first red/yellow Tamer suspension gives exactly one of two opposing Digimon -6000 DP and the second cannot repeat; and a blue-only Tamer suspension leaves the target's DP unchanged. Reverting either timing, alternate requirement, target identity, kind/DP/restriction/Blocker grant, duration, color/ownership filter, amount, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-019 — Gankoomon — 10/10

- Catalog evidence: Red/Black level 6 Digimon, play cost 13, 13000 DP; Mega/Data/Holy Warrior and Royal Knight; evolves from red or black level 5 for 5; Blocker. Printed On Play and When Digivolving clauses independently checked: optionally play one Sistermon-name Digimon from trash or one Royal Knight-trait Digimon from the digivolution cards of the controller's breeding-area Digimon without paying, but not a Digimon whose exact name is Omnimon or Gankoomon.
- Knowledge base: `node tools/kb/query.mjs card BT13-019` reviewed Q2277. Omnimon X Anti-body and Gankoomon (X Antibody) are legal because the printed exclusions apply only to the exact base names. The prior substring exclusion incorrectly rejected these variants and was corrected to `nameExact`. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-019.ts` shares one `PlayWithoutCost` action across On Play and When Digivolving: an OR filter ties Sistermon-name candidates to trash and Royal Knight candidates to a breeding host, applies exact Omnimon/Gankoomon exclusions, selects up to one optionally, and pays no cost; both records expose Blocker. Traced through keyword observation, timing registration, loose-zone enumeration, common-plus-OR-branch matching, host permanent/breeding validation, exact-name exclusion, optional selection/refusal, stack-card extraction, free play, and On Play processing. The reusable loose-target seam was corrected to flatten `filter.or` with common constraints and retain the matching branch's `hostFilter`, preventing Royal Knights in trash from qualifying through the breeding branch. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-019", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-007 provides the realistic breeding-area King Drasil stack and BT13-110 uses the same Royal Knight-from-breeding vocabulary; BT10-085 supplies a trash Sistermon; BT5-111 is the Q2277 allowed Omnimon X variant; exact BT5-086 Omnimon and BT13-019 Gankoomon remain under breeding. Both timing records share identical behavior, no printed frequency applies, and separate source/decline fixtures prove ownership and zone boundaries.
- Behavioral proof: isolated `BT13-019.test.ts` passed 5 tests in its own Vitest process: both compiled timings expose Blocker and the same two-zone action; On Play plays Sistermon Ciel from trash free; the optional play may be declined; Q2277 plays Omnimon X from King Drasil's breeding digivolution cards and removes that exact instance from the stack; and exact Omnimon/Gankoomon remain excluded in the same breeding source zone. Reverting exact-name matching, branch-host preservation, either source, optionality, free-play behavior, or Blocker makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-020 — ShineGreymon: Burst Mode — 10/10

- Catalog evidence: Red/Yellow level 7 Digimon, play cost 15, 15000 DP; Mega/Vaccine/Light Dragon; evolves normally from red or yellow level 6 for 5. Its curated Burst Digivolve requirement evolves from ShineGreymon for 0 by returning one exact Marcus Damon Tamer, then schedules the prior top stacked card for end-of-turn trash. Printed clauses independently checked: When Digivolving may play one Marcus Damon from hand free and, for the turn, that played Tamer is also a 12000 DP Digimon that cannot digivolve and gains Rush; own-turn once per turn, an allied Tamer suspension trashes the opponent's top security card.
- Knowledge base: `node tools/kb/query.mjs card BT13-020` reviewed Q2278-Q2279, Q3677, and Q5992-Q5996. The played Marcus enters as a Tamer and only afterward becomes a Digimon, so Digimon-play reactions such as the cited Delay do not trigger; it remains both kinds, retains dual effect provenance, obeys 0-DP rule deletion, and later base-DP treatments overwrite earlier ones while additional effects such as Rush remain. No unresolved card-specific ambiguity remains.
- Implementation and primitive trace: `BT13-020.ts` maps When Digivolving to a Marcus `whenPlayed` watcher that binds the just-played permanent and grants duration-scoped Digimon kind, 12000 base DP, Rush, and digivolve restriction, followed by optional hand `PlayWithoutCost`. The curated digivolution-requirement seam supplies the true Burst base/Tamer-return cost, mechanic event, and pending end-of-turn top-stack trash. The security watcher was corrected from `AllTurns` to printed `YourTurn`; it filters allied Tamers and performs opponent `trashTop` under a once-per-turn budget. Traced through Burst validation/payment, exact Tamer return, draw/stack transition, pending processing, play-before-treatment ordering, trigger-source binding, kind/base-DP/keyword/restriction duration ledgers, suspension ownership/turn gate, security top-trash, and frequency. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-020", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-018 supplies the realistic ShineGreymon base and shared Marcus-treatment semantics; BT12-092 supplies both the returned field Tamer and played hand Tamer. The Burst fixture proves zero memory cost, exact return/play identities, previous-top placement, and end-turn trash; a normal evolution proves the printed cost-5 route and optional refusal. Own-turn and opponent-turn suspension fixtures prove timing ownership and once-per-turn frequency independently.
- Behavioral proof: isolated `BT13-020.test.ts` passed 7 tests in its own Vitest process: verifies complete IR plus curated Burst metadata; traces the played-Marcus binding; requires a printed own-turn once-per-turn watcher; executes Burst Digivolve, returns one Marcus, plays another as a 12000 DP Digimon with Rush and a digivolve restriction, then trashes the prior top at end of turn; permits declining Marcus after a normal cost-5 evolution; trashes only one top opposing security across two own-turn Tamer suspensions; and never trashes security for that suspension on the opponent's turn. Reverting Burst metadata/payment/pending processing, ordering/binding, optionality, treatment grants, own-turn gate, security ownership/top position, or frequency makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-021 — Gaomon — 10/10

- Catalog evidence: Blue level 3 Digimon, play cost 3, 1000 DP; Rookie/Data/Beast; evolves from blue level 2 for 0. Printed clauses independently checked: When Attacking once per turn both players draw 1; inherited All Turns, while the opponent has at least 8 hand cards, the host gets +1000 DP.
- Knowledge base: `node tools/kb/query.mjs card BT13-021` reviewed; no card-specific entries exist and the bilateral draw order, inclusive hand threshold, controller perspective, and continuous duration are unambiguous.
- Implementation and primitive trace: `BT13-021.ts` maps When Attacking to sequential owner and opponent `Draw 1` actions under one source once-per-turn key. The inherited All Turns record maps a self `Aura(modifyDP +1000)` to a live opponent-hand `zoneCount >= 8` condition. Traced through attack timing/source anchoring, per-source use ledger, each player's deck-to-hand movement and empty-deck tolerance, inherited host resolution, opponent seat selection, live zone counting, continuous aura re-derivation/removal, and DP calculation. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-021", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-025 inherits the identical opponent-hand aura and is the next realistic GaoGamon evolution; the focused stack carries Gaomon under a real blue host. Separate attack timing windows prove the once-per-turn identity, while seven/eight-card fixtures prove the exact threshold and dynamic activation. Both seats have independent decks and observable hand changes.
- Behavioral proof: isolated `BT13-021.test.ts` passed 5 tests in its own Vitest process: verifies the complete draw/aura IR; a real attack draws exactly one for each player; two same-turn attack timings still draw only once per player; an inherited host gains exactly +1000 DP at eight opposing hand cards; and it has no bonus at seven but gains it immediately when an eighth card enters the opponent's hand. Reverting either draw/controller, the frequency key, inherited self anchor, opponent seat, threshold, aura amount, or continuous recomputation makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-022 — Kamemon — 10/10

- Catalog evidence: Blue level 3 Digimon, play cost 3, 2000 DP; Rookie/Data/Cyborg; evolves from blue level 2 for 0. Its only printed executable clause is Blocker: during an opposing Digimon's attack, Kamemon may suspend to become the attack target.
- Knowledge base: `node tools/kb/query.mjs card BT13-022` reviewed; no card-specific entries exist. The reminder text agrees with the shared Blocker rule and introduces no separate effect.
- Implementation and primitive trace: `BT13-022.ts` represents the printed keyword as a Static IR effect with `keywords: [{ keyword: "Blocker" }]`, no actions, `coverage: "full"`, and an empty residual. Traced through static keyword installation, public continuous-ledger observation, `eligibleBlockers`, the defending-seat block window, `declareBlock`, suspension, defender switching, battle resolution, and deletion/security routing. Registration is exclusively `registerIrCard("BT13-022", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-068 is a same-set printed-Blocker peer using the identical keyword primitive; the comprehensive chapter-12 suites independently exercise that shared mechanism. Kamemon has no name/trait targeting, alternate evolution, inherited text, ownership ambiguity, or frequency key. The proof uses the opponent's attack timing, defending-seat intent, an unsuspended battle-area Kamemon, and its catalog DP.
- Behavioral proof: isolated `BT13-022.test.ts` passed 3 tests: exact full-coverage IR shape; public observer exposure; and a real player-directed attack where Kamemon is offered, declared by its controller, suspended, becomes the defender, loses the 5000-vs-2000 battle, and is deleted while security remains untouched. Reverting the keyword, static installation, controller/zone eligibility, block-window target switch, suspension, or battle routing makes an observable focused assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-023 — Jellymon — 10/10

- Catalog evidence: Blue level 3 Digimon, play cost 3, 1000 DP; Rookie/Data/Mollusk; evolves from blue level 2 for 0. Printed clauses checked independently: Evade on Jellymon itself, and inherited When Attacking trash the bottom digivolution card of 1 opposing Digimon.
- Knowledge base: `node tools/kb/query.mjs card BT13-023` reviewed; no card-specific entries exist. The bottom-of-stack direction, opponent ownership, one-target count, inherited source, and optional Evade prevention are explicit in the catalog/rules.
- Implementation and primitive trace: `BT13-023.ts` maps Evade to a Static keyword record. Its inherited When Attacking action is `TrashDigivolution` with an opponent Digimon/has-sources/count-1 filter, `amount: 1`, and `fromTop: false`. Traced through static keyword installation, deletion interception, controller decision and suspension cost, inherited host/source discovery, attack trigger dispatch, opponent-only candidate resolution, bottom-card detachment, and owner trash routing. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-023", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT26-020 and BT24-050 use the same Evade ledger and decision seam; the chapter-16c suite covers the shared rule. The attack proof places Jellymon under a real host and gives only the opponent an eligible stack, showing inherited timing and controller perspective; the host's own Jellymon source remains attached. Neither clause is once per turn, and there is no alternate evolution or trait/name selector.
- Behavioral proof: isolated `BT13-023.test.ts` passed 3 tests: exact full-coverage IR; a real inherited attack that removes only the opponent's bottom source to that owner's trash while preserving the top source and the attacking host's stack; and a real effect-deletion attempt where Jellymon's controller accepts Evade, Jellymon suspends, the deletion count is zero, and it remains in play. Reverting Evade installation, decision ownership/cost, inherited anchoring, attack timing, opponent filter, bottom direction, amount, or trash routing makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-024 — Gawappamon — 10/10

- Catalog evidence: Blue level 4 Digimon, play cost 4, 5000 DP; Champion/Data/Cyborg; evolves from blue level 3 for 2. Its only executable text is Blocker, allowing it to suspend during an opposing Digimon's attack and redirect that attack to itself.
- Knowledge base: `node tools/kb/query.mjs card BT13-024` reviewed; no card-specific entries exist. The reminder text is the standard shared Blocker rule and adds no residual clause.
- Implementation and primitive trace: `BT13-024.ts` carries one Static effect with the `Blocker` keyword, no actions, `coverage: "full"`, and no residual. Traced through static keyword installation, continuous-ledger observation, `eligibleBlockers`, defending-seat block-window publication and validation, suspension, target replacement, DP battle, deletion, and security suppression. Registration is exclusively `registerIrCard("BT13-024", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-022 is the immediate same-color/same-set Blocker peer using identical IR, while this proof independently uses Gawappamon's printed 5000 DP to exercise the opposite battle outcome. There is no name/trait selector, alternate evolution, inherited effect, or frequency key; timing and ownership are fixed to the opponent's attack and Gawappamon's controller.
- Behavioral proof: isolated `BT13-024.test.ts` passed 3 tests: exact full-coverage IR; public observer exposure; and a real player attack where the defending player declares Gawappamon, it suspends and redirects the attack, survives against a 4000 DP attacker, deletes that attacker, and prevents a security check. Reverting keyword installation, ownership/zone eligibility, block timing, suspension, target switching, or combat/security routing makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-025 — GaoGamon — 10/10

- Catalog evidence: Blue level 4 Digimon, play cost 5, 5000 DP; Champion/Data/Beast; evolves from blue level 3 for 2. Printed clauses checked independently: optional When Digivolving play 1 Thomas H. Norstein from hand without cost only if its controller has none, and inherited All Turns +1000 DP while the opponent has at least 8 hand cards.
- Knowledge base: `node tools/kb/query.mjs card BT13-025` reviewed; no card-specific entries exist. The exact Thomas name, controller-scoped absence condition, hand origin, optionality, free play, inherited self anchor, opponent hand perspective, and inclusive threshold are explicit.
- Implementation and primitive trace: `BT13-025.ts` maps When Digivolving to optional `PlayWithoutCost` from hand with a Thomas name filter and `youHaveNone` condition, then maps the inherited All Turns clause to a self `Aura(modifyDP +1000)` under opponent `zoneCount(hand) >= 8`. Traced through evolution legality/payment and timing, source/controller condition evaluation, optional decision, hand candidate selection, Tamer permanent creation without play cost, inherited host resolution, live zone counting, continuous re-derivation, and DP calculation. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-025", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-021 carries the identical inherited hand-size aura and is a valid blue level-3 predecessor; its independent proof corroborates the shared primitive without substituting for this card. BT13-097 is the exact Tamer candidate. Positive, existing-Tamer, and refusal fixtures isolate condition/ownership/optionality; a seven-to-eight transition isolates the threshold. Neither clause is once per turn.
- Behavioral proof: isolated `BT13-025.test.ts` passed 5 tests: full IR; a real legal evolution that plays Thomas from hand for free; an existing controlled Thomas prevents a second copy from leaving hand; explicit refusal leaves Thomas in hand; and an inherited host remains at 5000 DP with seven opposing hand cards then becomes 6000 immediately at eight. Reverting timing, exact-name/controller condition, origin, optionality, free play, inherited anchor, opponent seat, threshold, amount, or continuous refresh makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-026 — TeslaJellymon — 10/10

- Catalog evidence: Blue level 4 Digimon, play cost 5, 5000 DP; Champion/Data/Mollusk; evolves from blue level 3 for 2. Printed clauses independently checked: When Attacking Draw 1, and inherited When Attacking trash the bottom digivolution card of 1 opposing Digimon.
- Knowledge base: `node tools/kb/query.mjs card BT13-026` reviewed; no card-specific entries exist. Draw ownership/amount, the absence of a once-per-turn marker, inherited anchoring, opponent ownership, one-target count, and bottom direction are explicit.
- Implementation and primitive trace: `BT13-026.ts` maps the main When Attacking clause to owner `Draw 1` and the inherited clause to `TrashDigivolution` with opponent Digimon/has-sources/count-1 filtering, `amount: 1`, and `fromTop: false`. Traced through attack timing/source anchoring, repeated trigger dispatch without a frequency ledger, deck-to-hand movement, inherited host/source discovery, opponent candidate resolution, bottom detachment, and owner-trash routing. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-026", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-023 is the same-set inherited bottom-source peer, while BT13-021 supplies a contrasting once-per-turn attack draw. TeslaJellymon's test uses real attack flow for the printed draw, two direct attack timings for the non-once-per-turn distinction, and a real inherited stack with only the opponent eligible; its own source remains attached. There are no trait/name conditions or alternate evolution routes.
- Behavioral proof: isolated `BT13-026.test.ts` passed 4 tests: exact full IR; a real attack moves the controller's top deck card to hand; two same-turn attack timings draw twice; and an inherited attack removes only the opponent's bottom source to that owner's trash while retaining the opponent's top source and the host's own stack. Reverting timing, draw controller/amount/frequency, inherited anchoring, opponent filter, bottom direction, amount, or trash ownership makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-027 — Shaujinmon — 10/10

- Catalog evidence: Blue level 5 Digimon, play cost 7, 7000 DP; Ultimate/Virus/Wizard; evolves from blue level 4 for 3. Printed clauses checked independently: Blocker, and during the opponent's turn when an opposing Digimon attacks, optionally play 1 level 4 or lower Digimon from this Digimon's sources without cost.
- Knowledge base: `node tools/kb/query.mjs card BT13-027` reviewed; no card-specific entries exist. Opponent-turn duration, attack ownership, optionality, source-local origin, Digimon kind, inclusive level cap, and free play are explicit.
- Implementation and primitive trace: `BT13-027.ts` maps the opponent-turn record to the Blocker keyword plus a `whenOpponentAttacks` SubTrigger whose optional `PlayWithoutCost` selects one controlled Digimon of level at most 4 from its own digivolution stack. Traced through continuous turn-condition installation/removal, attack event publication, watcher source/controller identity, optional decision, source candidate filtering, detachment, permanent creation without cost, and remaining-stack preservation. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-027", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-024 independently corroborates the shared Blocker seam, while BT13-026 is a realistic level-4 source and BT13-028 is the level-5 negative boundary. Opponent-turn and own-turn recomputes isolate duration; opposing attack and refusal fixtures isolate event ownership and optionality. The attack watcher is not once per turn and can resolve on each qualifying attack while Shaujinmon remains present.
- Behavioral proof: isolated `BT13-027.test.ts` passed 4 tests: exact full IR; an opposing attack plays the eligible level-4 TeslaJellymon for free, removes it from Shaujinmon's stack, and leaves an ineligible level-5 source attached; explicit refusal keeps the eligible source attached and creates no permanent; and the public observer reports Blocker absent on its controller's turn but present on the opponent's turn. Reverting duration, Blocker, event ownership, optionality, origin, kind/level filter, payment, detachment, or stack routing makes a focused observable assertion fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-028 — Thetismon — 10/10

- Catalog evidence: Blue level 5 Digimon, play cost 7, 7000 DP; Ultimate/Data/Aquabeast; evolves from blue level 4 for 3. Printed clauses checked independently: Hand/Main requires controlled Kiyoshiro, places exact TeslaJellymon from hand at the bottom of exact Jellymon's sources as the activation cost, then that same Digimon evolves into this hand card for cost 3 ignoring requirements; inherited End of Attack once per turn optionally returns exactly 3 Jellymon-text cards from own trash to the deck bottom to unsuspend the host.
- Knowledge base: `node tools/kb/query.mjs card BT13-028` reviewed; no card-specific entries exist. Exact bracketed names, Kiyoshiro ownership, hand residency, cost-before-effect ordering, same-host binding, cost 3, requirement waiver, Jellymon full-text matching, own-trash/deck ownership, deck-bottom destination, optionality, and once-per-turn frequency are explicit.
- Implementation and primitive trace: the generated single `Digivolve` with `additionalCosts/host: "target"` was inert for a hand source and omitted Kiyoshiro. `BT13-028.ts` now uses the supported two-step IR: Kiyoshiro `youHave` gate; exact Tesla `PlaceUnder` from hand with exact Jellymon `underFilter`, bottom position, and `bindHostAs`; then trigger-source Thetismon `Digivolve` onto that binding for 3 ignoring requirements. The inherited action remains optional self `Unsuspend` gated by a return-3 own-trash/Jellymon-text cost. The activation preflight now treats `PlaceUnder` as gated through `canAttemptPlaceUnder`, so unpaid declarations are not surfaced. Traced through hand-resident projection, condition/placement feasibility, selection binding, memory payment, evolution mutation/timing, full-text loose filtering, cost selection, trash-to-deck-bottom routing, self unsuspension, and frequency ledger. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-028", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT23-065 uses the same place-bind-then-evolve primitive seam; BT13-023 and BT13-026 are the exact destination/material, while BT9-086 is the controlled Kiyoshiro. Negative fixtures exclude missing Kiyoshiro, missing material, and TeslaJellymon-as-host substring confusion. The inherited proof uses a real attack plus repeated direct end-of-attack timings to distinguish cost routing and once-per-turn use.
- Behavioral proof: isolated `BT13-028.test.ts` passed 7 tests: exact full IR; a hand activation produces the ordered Tesla/Jellymon/Thetismon stack and pays exactly 3 memory; missing Kiyoshiro rejects activation with no movement/payment; missing Tesla suppresses activation; TeslaJellymon is not accepted as exact Jellymon; a real attack returns three matching own-trash cards to the deck bottom and unsuspends; and a second same-turn end-of-attack timing neither returns the remaining three nor unsuspends again. Reverting any gate, exact match, zone/owner, binding, order, payment/waiver, text filter, destination, optional cost, self anchor, or frequency makes focused observable evidence fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-029 — MachGaogamon — 10/10

- Catalog evidence: Blue level 5 Digimon, play cost 7, 7000 DP; Ultimate/Data/Cyborg; evolves from blue level 4 for 3. Printed clauses independently checked: When Attacking, at 8 or more opposing hand cards this Digimon's attack target can't be switched for the turn; inherited All Turns once per turn, when an effect adds cards to the opponent's hand, unsuspend the host.
- Knowledge base: `node tools/kb/query.mjs card BT13-029` reviewed Q2280. It confirms `attackTargetChange` is broader than can't-be-blocked: it prevents both Blocker and effect-driven target switches. The opponent-hand threshold, effect-only event, inherited self, all-turn duration, and once-per-turn frequency remain as printed.
- Implementation and primitive trace: `BT13-029.ts` maps When Attacking to a for-turn `attackTargetChange` restriction under opponent `zoneCount(hand) >= 8`; its generated broad friendly target was corrected to exact self. The inherited All Turns record installs `whenEffectAddsToOpponentHand`, then self-unsuspends under one source once-per-turn key. Traced through attack timing, live opponent hand count, restriction ledger and combat Blocker/redirect consumers, inherited host/source discovery, effect-add payload seat qualification, suspension mutation, continuous watcher reinstallation, and frequency tracking. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-029", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-024 supplies the realistic Blocker boundary; engine combat legality covers the same Q2280 restriction consumer. Eight- and seven-card fixtures prove the inclusive threshold, while own-seat and opponent-seat hand-add payloads prove inherited perspective. Repeated qualifying opponent events prove once-per-turn use; the effect is active on both turns and has no name/trait or alternate-evolution branch.
- Behavioral proof: isolated `BT13-029.test.ts` passed 4 tests, with 29 shared combat-legality tests also green: exact full IR; at eight opposing hand cards a real attack applies the restriction to MachGaogamon itself, opens no Blocker window, leaves the opposing Blocker unsuspended, and reaches security; at seven, the same Blocker legally redirects the attack and security remains; and the inherited host ignores an effect addition to its controller's hand, unsuspends for the opponent-seat event, then remains suspended on a second same-turn event. Reverting self anchoring, timing, seat/zone/threshold, duration, restriction type, event ownership, inherited anchoring, or frequency makes focused observable evidence fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-030 — UlforceVeedramon — 10/10

- Catalog evidence: Blue level 6 Digimon, play cost 11, 11000 DP; Mega/Vaccine/Holy Warrior/Royal Knight; evolves from blue level 5 for 3. Printed clauses checked independently: On Play and When Digivolving, choose 1 opposing Digimon and trash its top 2 sources for each controlled Royal Knight Digimon and blue Tamer; Your Turn once per turn, when a controlled Royal Knight Digimon or blue Tamer is played, return 1 opposing Digimon with no sources to hand.
- Knowledge base: `node tools/kb/query.mjs card BT13-030` reviewed Q2281-Q2283. Q2281 requires all scaled source trashing to one target, not distribution. Q2282 says UlforceVeedramon's own play triggers its resident play watcher. Q2283 says its On Play and Your Turn effects trigger simultaneously and the controller chooses their order.
- Implementation and primitive trace: the paired On Play/When Digivolving records use one opponent-Digimon target, top-source `TrashDigivolution amount 2`, and a card-count scale over controlled Royal Knight Digimon or blue Tamers. To preserve Q2282/Q2283 in the engine's timing model, self-play now has a separate Your-Turn-conditioned On Play return record; the persistent `whenPlayed` watcher excludes self and handles later qualifying plays. Both return paths share one once-per-turn use key and the no-sources opponent filter. Traced through simultaneous trigger collection/order decisions, trait/color/kind scaling, same-target selection, top detachment and owner trash routing, play versus evolution timing, played-subject filters, empty-stack eligibility, return-to-owner-hand mutation, and shared frequency accounting. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-030", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-040 supplies a Royal Knight peer, BT9-086/BT13-097 are blue Tamers, and BT13-029 is a legal blue level-5 predecessor. Two-target and six-source evolution fixtures isolate Q2281 and scaling without the play watcher; self-play and manual order projection isolate Q2282/Q2283. Later Tamer plays prove subject ownership and the shared once-per-turn budget; a sourced opponent Digimon is an explicit target negative.
- Behavioral proof: isolated `BT13-030.test.ts` passed 7 tests with 31 shared trigger-stack tests: exact full IR; self-play trashes two sources and then returns the newly emptied target; an evolution with two qualifying cards trashes all four sources from only one of two targets and leaves both Digimon in play; Royal Knight plus blue Tamer plus Ulforce scales to exactly six top sources; two same-turn blue-Tamer plays return only one empty-stack Digimon; self-play exposes two BT13-030 triggers in one `orderTriggers` decision; and a sourced opposing Digimon is not returned. Reverting scaling count/unit, one-target ownership, top direction, play/evolution timing, Q2282 self handling, Q2283 simultaneity, source filters, empty-stack gate, hand routing, or shared frequency makes focused observable evidence fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-031 — MirageGaogamon — 10/10

- Catalog evidence: Blue level 6 Digimon, play cost 12, 12000 DP; Mega/Data/Beast Knight; evolves from blue level 5 for 4. Printed clauses independently checked: Evade; When Digivolving return 1 opposing Tamer to hand; All Turns once per turn, when an effect adds cards to the opponent's hand, optionally play exact Thomas H. Norstein from hand without cost.
- Knowledge base: `node tools/kb/query.mjs card BT13-031` reviewed; no card-specific entries exist. Opponent-Tamer kind/ownership, Thomas exact bracketed name and hand origin, event effect provenance and opponent perspective, all-turn duration, optionality, free play, and once-per-turn frequency are explicit.
- Implementation and primitive trace: `BT13-031.ts` maps Evade to a Static keyword, evolution timing to an opponent-Tamer `Return` to hand, and All Turns to a once-per-turn `whenEffectAddsToOpponentHand` watcher with optional exact-name `PlayWithoutCost` from hand. The generated broad Thomas name match was tightened to `nameExact`. Traced through keyword installation and effect-deletion interception, controller Evade decision/suspension, evolution legality/payment/timing, Tamer-only permanent selection and owner-hand routing, hand-add event seat qualification, all-turn watcher installation, optional candidate selection, free Tamer creation, and frequency tracking. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-031", compiled)`.
- Peers, traits, evolution, timing, ownership, and frequency: BT13-029 is a legal blue level-5 predecessor and shares the opponent-hand event seam; BT13-097 is the exact Thomas candidate, while BT9-086 supplies an opposing Tamer target. Own-hand and opponent-hand payloads isolate perspective, opponent-turn execution proves All Turns, repeated events prove once-per-turn, and refusal proves optionality. No alternate evolution or trait selector exists.
- Behavioral proof: isolated `BT13-031.test.ts` passed 7 tests with 30 shared advanced-keyword tests: exact full IR; on the opponent's turn an own-hand effect event is ignored and an opponent-hand event plays Thomas for free; a legal evolution pays 4 and returns only the opposing Tamer while leaving a Digimon; accepted Evade suspends MirageGaogamon and prevents effect deletion; two qualifying events play only one of two Thomas cards; refusal leaves Thomas in hand; and the public observer exposes Evade. Reverting keyword behavior, timing, target kind/owner, hand routing, event perspective/duration, exact name, origin/payment, optionality, or frequency makes focused observable evidence fail.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-032 — JumboGamemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-033 — MirageGaogamon: Burst Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-034 — Kudamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-035 — PawnChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-036 — Liollmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-037 — Liamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-038 — Reppamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-039 — KnightChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-040 — Magnamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-041 — Chirinmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-042 — BishopChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-043 — LoaderLeomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-044 — BanchoLeomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-045 — KingChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-046 — Kentaurosmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-047 — Angoramon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-048 — Salamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-049 — Lalamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-050 — Sunflowmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-051 — Mikemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-052 — SymbareAngoramon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-053 — Mihiramon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-054 — Lilamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-055 — Lamortmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-056 — Leopardmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-057 — Rosemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-058 — Leopardmon: Leopard Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-059 — Examon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-060 — Rosemon: Burst Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-061 — Gotsumon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-062 — Chuumon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-063 — Dorumon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-064 — PawnChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-065 — PlatinumSukamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-066 — Dorugamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-067 — Gladimon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-068 — KnightChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-069 — KingSukamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-070 — RookChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-071 — Giromon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-072 — DoruGreymon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-073 — QueenChessmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-074 — PrinceMamemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-075 — Alphamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-076 — KingEtemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-077 — Craniamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-078 — Phascomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-079 — Falcomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-080 — ProtoGizmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-081 — Porcupamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-082 — Peckmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-083 — Gizmon: AT — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-084 — Astamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-085 — Crowmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-086 — Gizmon: XT — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-087 — Dynasmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-088 — Belphemon: Sleep Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-089 — Ravemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-090 — LordKnightmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-091 — Belphemon: Rage Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-092 — Ravemon: Burst Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-093 — Omekamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-094 — Kristy Damon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-095 — Marcus Damon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-096 — Homer Yushima — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-097 — Thomas H. Norstein — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-098 — Richard Sampson — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-099 — Spencer Damon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-100 — Yoshino Fujieda — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-101 — Miki Kurosaki & Megumi Shirakawa — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-102 — Keenan Crier — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-103 — Akihiro Kurata — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-104 — Final Shining Burst — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-105 — Full Moon Meteor Impact — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-106 — Odin's Breath — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-107 — Vulcan Crusher — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-108 — Waltz's End — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-109 — Gift of Darkness — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-110 — Royal Knights of the Purge — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-111 — Gallantmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-112 — Omnimon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.
