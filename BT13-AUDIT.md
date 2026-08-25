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

## BT13-017 — Jesmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-018 — ShineGreymon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-019 — Gankoomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-020 — ShineGreymon: Burst Mode — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-021 — Gaomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-022 — Kamemon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-023 — Jellymon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-024 — Gawappamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-025 — GaoGamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-026 — TeslaJellymon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-027 — Shaujinmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-028 — Thetismon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-029 — MachGaogamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-030 — UlforceVeedramon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-031 — MirageGaogamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

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
