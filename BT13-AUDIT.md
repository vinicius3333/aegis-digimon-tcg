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

- Catalog evidence: White DigiEgg level n/a, play cost -1, DP 0; forms Mega; traits/types 9000; evolution requirements none; printed clauses: [Breeding] [Your Turn] All of your Digimon can't digivolve. [Breeding][Your Turn][Once Per Turn] When a [Royal Knight] trait Digimon card would be played, you may reduce the play cost by 4. Further reduce it by 1 for each of this Digimon's digivolution cards. [Breeding][Start of Your Main Phase] Reveal the top card of your Digi - Egg deck, then pllace that card and all of your [Royal Knight] trait Digimon as this Digimon as its bottom digivolution cards. | [Breeding][Your Turn][Once Per Turn] When an Option card with the [Royal Knight] trait is placed in the battle area, gain 1 memory..
- Knowledge base: `node tools/kb/query.mjs card BT13-007` reviewed; applicable entries Q2259, Q2260, Q2261, Q2262, Q2263, Q2264, Q2265, Q2340, Q2369, Q2463; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn, StartOfYourMainPhase and actions Restrict, Replacement, PlaceUnder, SubTrigger, GainMemory; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-007", compiled)`.
- Behavioral proof: isolated file `BT13-007.test.ts` passed 5 tests in its own Vitest process. Observable cases: prevents its controller's Digimon from digivolving while it is in breeding; reduces one Royal Knight play by 4 plus its source count, then spends the once-per-turn budget; may decline the Royal Knight play-cost reduction; must place the top Digi-Egg and every battle-area Royal Knight under itself at Start of Main; gains memory only once when Royal Knight Options enter battle with King Drasil inherited. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-008 — Agumon — 10/10

- Catalog evidence: Red/Yellow Digimon level 3, play cost 3, DP 2000; forms Rookie; traits/types Dinosaur; evolution requirements {"color":"Red","level":2,"memoryCost":1}; {"color":"Yellow","level":2,"memoryCost":1}; printed clauses: Digivolve: 0 from [Koromon][Main][Once Per Turn] For the turn, 1 of your [Marcus Damon]s is also treated as a 3000 DP Digimon and can't digivolve. | [Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended, you may delete 1 of your opponent's Digimon with 3000 DP or less..
- Knowledge base: `node tools/kb/query.mjs card BT13-008` reviewed; applicable entries Q2266, Q2267, Q5981, Q5982, Q5983, Q5984, Q5985; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, YourTurn and actions GrantStatic, SetBaseDP, Restrict, SubTrigger, Delete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-008", compiled)`.
- Behavioral proof: isolated file `BT13-008.test.ts` passed 4 tests in its own Vitest process. Observable cases: digivolves from Koromon for 0 memory through its alternate requirement; makes one Marcus Damon a 3000 DP Digimon that cannot digivolve for the turn; once per turn may delete only an opposing Digimon with 3000 DP or less when a red or yellow Tamer suspends; does not delete when the inherited optional effect is declined. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-009 — Huckmon — 10/10

- Catalog evidence: Red Digimon level 3, play cost 3, DP 2000; forms Rookie; traits/types Mini Dragon; evolution requirements {"color":"Red","level":2,"memoryCost":0}; printed clauses: [Your Turn] When you play a Digimon with [Sistermon] in its name, this Digimon may digivolve into [BaoHuckmon] in the hand without paying the cost. | [Your Turn][Once Per Turn] When you play a Digimon with [Sistermon] in its name, gain 1 memory..
- Knowledge base: `node tools/kb/query.mjs card BT13-009` reviewed; applicable entries Q2268; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn and actions SubTrigger, Digivolve, GainMemory; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-009", compiled)`.
- Behavioral proof: isolated file `BT13-009.test.ts` passed 4 tests in its own Vitest process. Observable cases: may digivolve into BaoHuckmon from hand for free when its controller plays a Sistermon; may decline the free BaoHuckmon digivolution; gains memory only once per turn from its inherited effect when allied Sistermon are played; does not trigger for a Digimon without Sistermon in its name. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-010 — Biyomon — 10/10

- Catalog evidence: Red Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Bird; evolution requirements {"color":"Red","level":2,"memoryCost":0}; printed clauses: [On Play] If played by an effect, by returning 1 of your [Kristy Damon]s to the hand, this Digimon may digivolve into [Garudamon] in the hand, ignoring its digivolution requirements and without paying the cost. | [On Deletion] ＜Draw 1＞ (Draw 1 card from your deck.).
- Knowledge base: `node tools/kb/query.mjs card BT13-010` reviewed; applicable entries Q2269; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, OnDeletion and actions Digivolve, triggerEnteredByEffect, return, Draw; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-010", compiled)`.
- Behavioral proof: isolated file `BT13-010.test.ts` passed 4 tests in its own Vitest process. Observable cases: when played by an effect, may return Kristy Damon and digivolve into Garudamon for free; may return Kristy Damon even without a Garudamon in hand (Q2269); does not offer the Kristy cost when Biyomon is played normally; draws one when the Digimon carrying its inherited effect is deleted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-011 — Aquilamon — 10/10

- Catalog evidence: Red Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Giant Bird; evolution requirements {"color":"Red","level":3,"memoryCost":2}; printed clauses: [On Play][When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or less. | [On Deletion] ＜Draw 1＞ (Draw 1 card from your deck.).
- Knowledge base: `node tools/kb/query.mjs card BT13-011` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, OnDeletion and actions Delete, Draw; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-011", compiled)`.
- Behavioral proof: isolated file `BT13-011.test.ts` passed 3 tests in its own Vitest process. Observable cases: on play deletes one opposing Digimon at or below 3000 DP but not a 4000 DP Digimon; when digivolving deletes an opposing Digimon at or below 3000 DP; draws one when the Digimon carrying its inherited effect is deleted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-012 — GeoGreymon — 10/10

- Catalog evidence: Red/Yellow Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Dinosaur; evolution requirements {"color":"Red","level":3,"memoryCost":3}; {"color":"Yellow","level":3,"memoryCost":3}; printed clauses: Digivolve: 2 from Lv.3 w/[Agumon] in name and [Dinosaur] trait[When Digivolving] Search your security stack, and you may play 1 red or yellow Tamer card among it without paying the cost. If you did, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.) Then, shuffle your security stack. | [Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended, you may delete 1 of your opponent's Digimon with 3000 DP or less..
- Knowledge base: `node tools/kb/query.mjs card BT13-012` reviewed; applicable entries Q2270, Q2271; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, YourTurn and actions PlayWithoutCost, SecurityManipulation, ifThisEffectActed, SubTrigger, Delete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-012", compiled)`.
- Behavioral proof: isolated file `BT13-012.test.ts` passed 3 tests in its own Vitest process. Observable cases: uses its alternate requirement, plays a red/yellow Tamer from security, then recovers from deck; does not recover when no eligible Tamer is played from security (Q2271); once per turn may delete a 3000-or-less opposing Digimon when an allied red/yellow Tamer suspends. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-013 — BaoHuckmon — 10/10

- Catalog evidence: Red Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Dinosaur; evolution requirements {"color":"Red","level":3,"memoryCost":2}; printed clauses: [Your Turn] When you play a Digimon with [Sistermon] in its name, this Digimon may digivolve into [SaviorHuckmon] in the hand for the digivolution cost. When this Digimon would digivolve by this effect, reduce the digivolution cost by 2. | [Your Turn][Once Per Turn] When you play a Digimon with [Sistermon] in its name, gain 1 memory..
- Knowledge base: `node tools/kb/query.mjs card BT13-013` reviewed; applicable entries Q2272, Q2273; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn and actions SubTrigger, Digivolve, Replacement, GainMemory; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-013", compiled)`.
- Behavioral proof: isolated file `BT13-013.test.ts` passed 3 tests in its own Vitest process. Observable cases: after an allied Sistermon play may digivolve into SaviorHuckmon with its cost reduced by 2; does not gain its newly acquired inherited memory effect for the triggering Sistermon (Q2272); its inherited effect gains memory only once per turn for allied Sistermon plays. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-014 — Garudamon — 10/10

- Catalog evidence: Red Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Birdkin; evolution requirements {"color":"Red","level":4,"memoryCost":3}; printed clauses: [On Play][When Digivolving] You may play 1 red Tamer card with a play cost of 3 or less from your hand without paying the cost. | [On Deletion] Delete 1 of your opponent's Digimon with 6000 DP or less..
- Knowledge base: `node tools/kb/query.mjs card BT13-014` reviewed; applicable entries Q2615; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, OnDeletion and actions PlayWithoutCost, Delete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-014", compiled)`.
- Behavioral proof: isolated file `BT13-014.test.ts` passed 3 tests in its own Vitest process. Observable cases: on play may play a red Tamer costing 3 or less, but not a cost-4 red Tamer; when digivolving may play the eligible red Tamer without paying its cost; on deletion inherited deletes one opposing Digimon at 6000 DP but not 7000 DP. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-015 — RizeGreymon — 10/10

- Catalog evidence: Red/Yellow Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Cyborg; evolution requirements {"color":"Red","level":4,"memoryCost":4}; {"color":"Yellow","level":4,"memoryCost":4}; printed clauses: Digivolve: 3 from [GeoGreymon][When Digivolving] You may play 1 [Marcus Damon] from your hand without paying the cost. [All Turns][Once Per Turn] When one of your red or yellow Tamers is deleted, place 1 [Marcus Damon] from your trash on top of your security stack face down. | [All Turns][Once Per Turn] When one of your red or yellow Tamers is deleted, place 1 [Marcus Damon] from your trash on top of your security stack face down..
- Knowledge base: `node tools/kb/query.mjs card BT13-015` reviewed; applicable entries Q2274; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, AllTurns and actions PlayWithoutCost, SubTrigger, SecurityManipulation; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-015", compiled)`.
- Behavioral proof: isolated file `BT13-015.test.ts` passed 3 tests in its own Vitest process. Observable cases: digivolves from GeoGreymon for 3 and may play Marcus Damon from hand for free; places the deleted Marcus Damon itself from trash face down on top of security (Q2274); provides the same once-per-turn security placement as an inherited effect. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-016 — SaviorHuckmon — 10/10

- Catalog evidence: Red Digimon level 5, play cost 8, DP 8000; forms Ultimate; traits/types Dragonkin; evolution requirements {"color":"Red","level":4,"memoryCost":3}; printed clauses: [Your Turn] When you play a Digimon with [Sistermon] in its name, this Digimon may digivolve into a Digimon card with [Jesmon] in its name in the hand for the digivolution cost. When this Digimon would digivolve by this effect, reduce the digivolution cost by 2. | [When Attacking][Once Per Turn] If this Digimon has the [Royal Knight] trait, you may play 1 Digimon card with [Sistermon] in its name from your hand or trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-016` reviewed; applicable entries Q2275; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn, WhenAttacking and actions SubTrigger, Digivolve, Replacement, PlayWithoutCost, selfHasTrait; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-016", compiled)`.
- Behavioral proof: isolated file `BT13-016.test.ts` passed 3 tests in its own Vitest process. Observable cases: after an allied Sistermon play may digivolve into Jesmon while paying 2 less; when its Royal Knight host attacks, may play a Sistermon from trash for free only once per turn; does not play Sistermon when the inherited host lacks the Royal Knight trait. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-017 — Jesmon — 10/10

- Catalog evidence: Red Digimon level 6, play cost 11, DP 11000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Red","level":5,"memoryCost":3}; printed clauses: [On Play][When Digivolving] Choose any number of your opponent's Digimon so that their DP total is up to 6000 and delete them. For each of your other Digimon, add 2000 to the maximum this DP-based deletion effect can delete. [All Turns] For each of your other Digimon with [Sistermon] in its name or the [Royal Knight] trait, all of your Digimon get +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-017` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, AllTurns and actions DeleteByDPBudget, ModifyDP; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-017", compiled)`.
- Behavioral proof: isolated file `BT13-017.test.ts` passed 3 tests in its own Vitest process. Observable cases: on play adds 2000 to its deletion budget for each other allied Digimon; when digivolving applies the same scaled deletion budget; gives all allied Digimon +1000 DP for each other Sistermon or Royal Knight. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-018 — ShineGreymon — 10/10

- Catalog evidence: Red/Yellow Digimon level 6, play cost 12, DP 12000; forms Mega; traits/types Light Dragon; evolution requirements {"color":"Red","level":5,"memoryCost":4}; {"color":"Yellow","level":5,"memoryCost":4}; printed clauses: Digivolve: 3 from Lv.5 w/[RizeGreymon] in name[Start of Your Main Phase][When Digivolving] Until the end of your opponent's turn, 1 of your [Marcus Damon]s is also treated as a 3000 DP Digimon, can't digivolve, and gains ＜Blocker＞. [All Turns][Once Per Turn] When one of your red or yellow Tamers becomes suspended, 1 of your opponent's Digimon gets -6000 DP for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-018` reviewed; applicable entries Q2276, Q5986, Q5987, Q5988, Q5989, Q5990, Q5991; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers StartOfYourMainPhase, WhenDigivolving, AllTurns and actions GrantStatic, SetBaseDP, Restrict, GainKeyword, SubTrigger, ModifyDP; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-018", compiled)`.
- Behavioral proof: isolated file `BT13-018.test.ts` passed 3 tests in its own Vitest process. Observable cases: at Start of Main makes Marcus a 3000 DP Blocker Digimon that cannot digivolve; when digivolving from RizeGreymon for 3 grants the same Marcus effects; once per turn gives one opposing Digimon -6000 DP when an allied red/yellow Tamer suspends. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-019 — Gankoomon — 10/10

- Catalog evidence: Red/Black Digimon level 6, play cost 13, DP 13000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Red","level":5,"memoryCost":5}; {"color":"Black","level":5,"memoryCost":5}; printed clauses: ＜Blocker＞ [On Play][When Digivolving] Without paying the cost, you may play 1 Digimon card with [Sistermon] in its name from your trash or 1 Digimon card with the [Royal Knight] trait from the digivolution cards of your Digimon in the breeding area. This effect can't play [Omnimon] or [Gankoomon]..
- Knowledge base: `node tools/kb/query.mjs card BT13-019` reviewed; applicable entries Q2277; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving and actions PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-019", compiled)`.
- Behavioral proof: isolated file `BT13-019.test.ts` passed 3 tests in its own Vitest process. Observable cases: optionally plays an allowed Sistermon or breeding-area Royal Knight; plays Sistermon Ciel from the trash without paying its cost; does not play excluded Omnimon or Gankoomon cards. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-020 — ShineGreymon: Burst Mode — 10/10

- Catalog evidence: Red/Yellow Digimon level 7, play cost 15, DP 15000; forms Mega; traits/types Light Dragon; evolution requirements {"color":"Red","level":6,"memoryCost":5}; {"color":"Yellow","level":6,"memoryCost":5}; printed clauses: Burst Digivolve: 0 from [ShineGreymon] by returning 1 [Marcus Damon] to handAt the end of the burst digivolution turn, trash this Digimon’s top card[When Digivolving] You may play 1 [Marcus Damon] from your hand without paying the cost. For the turn, the Tamer played by this effect is also treated as a 12000 DP Digimon, can't digivolve, and gains ＜Rush＞. [Your Turn][Once Per Turn] When one of your Tamers becomes suspended, trash the top card of your opponent’s security stack..
- Knowledge base: `node tools/kb/query.mjs card BT13-020` reviewed; applicable entries Q2278, Q2279, Q3677, Q5992, Q5993, Q5994, Q5995, Q5996; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, AllTurns and actions SubTrigger, GrantStatic, SetBaseDP, PlayWithoutCost, SecurityManipulation; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-020", compiled)`.
- Behavioral proof: isolated file `BT13-020.test.ts` passed 4 tests in its own Vitest process. Observable cases: is fully represented in compiled IR with the printed Burst Digivolve requirement; plays and binds Marcus for the temporary 12000 DP Digimon treatment; declares the once-per-turn allied Tamer suspension security effect; executes Burst Digivolve, returns one Marcus, and plays the other as a temporary 12000 DP Digimon with Rush. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-021 — Gaomon — 10/10

- Catalog evidence: Blue Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Beast; evolution requirements {"color":"Blue","level":2,"memoryCost":0}; printed clauses: [When Attacking][Once Per Turn] Both players draw 1 card from their decks. | [All Turns] While your opponent has 8 or more cards in their hand, this Digimon gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-021` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking, AllTurns and actions Draw, Aura, modifyDP, zoneCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-021", compiled)`.
- Behavioral proof: isolated file `BT13-021.test.ts` passed 3 tests in its own Vitest process. Observable cases: draws for both players and scales inherited DP on the opponent hand; draws one card for each player when it attacks; gains 1000 DP as an inherited effect while the opponent has at least 8 cards. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-022 — Kamemon — 10/10

- Catalog evidence: Blue Digimon level 3, play cost 3, DP 2000; forms Rookie; traits/types Cyborg; evolution requirements {"color":"Blue","level":2,"memoryCost":0}; printed clauses: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.).
- Knowledge base: `node tools/kb/query.mjs card BT13-022` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static and actions none; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-022", compiled)`.
- Behavioral proof: isolated file `BT13-022.test.ts` passed 2 tests in its own Vitest process. Observable cases: registers the printed Blocker keyword; exposes Blocker through the public game observer. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-023 — Jellymon — 10/10

- Catalog evidence: Blue Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Mollusk; evolution requirements {"color":"Blue","level":2,"memoryCost":0}; printed clauses: ＜Evade＞ (When this Digimon would be deleted, you may suspend it to prevent that deletion). | [When Attacking] Trash the bottom digivolution card of 1 of your opponent's Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-023` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, WhenAttacking and actions TrashDigivolution; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-023", compiled)`.
- Behavioral proof: isolated file `BT13-023.test.ts` passed 2 tests in its own Vitest process. Observable cases: registers Evade and trashes the opponent's bottom evolution card; trashes the bottom card of an opponent's evolution stack through the inherited attack trigger. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-024 — Gawappamon — 10/10

- Catalog evidence: Blue Digimon level 4, play cost 4, DP 5000; forms Champion; traits/types Cyborg; evolution requirements {"color":"Blue","level":3,"memoryCost":2}; printed clauses: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.).
- Knowledge base: `node tools/kb/query.mjs card BT13-024` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static and actions none; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-024", compiled)`.
- Behavioral proof: isolated file `BT13-024.test.ts` passed 2 tests in its own Vitest process. Observable cases: registers the printed Blocker keyword; exposes Blocker through the public game observer. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-025 — GaoGamon — 10/10

- Catalog evidence: Blue Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Beast; evolution requirements {"color":"Blue","level":3,"memoryCost":2}; printed clauses: [When Digivolving] If you don't have [Thomas H. Norstein], you may play 1 [Thomas H. Norstein] from your hand without paying the cost. | [All Turns] While your opponent has 8 or more cards in their hand, this Digimon gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-025` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, AllTurns and actions PlayWithoutCost, youHaveNone, Aura, modifyDP, zoneCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-025", compiled)`.
- Behavioral proof: isolated file `BT13-025.test.ts` passed 3 tests in its own Vitest process. Observable cases: conditionally plays Thomas and preserves the inherited hand-size aura; plays Thomas on digivolution only when none is already present; gains the inherited 1000 DP while the opponent has eight cards in hand. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-026 — TeslaJellymon — 10/10

- Catalog evidence: Blue Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Mollusk; evolution requirements {"color":"Blue","level":3,"memoryCost":2}; printed clauses: [When Attacking] ＜Draw 1＞ (Draw 1 card from your deck.) | [When Attacking] Trash the bottom digivolution card of 1 of your opponent's Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-026` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking and actions Draw, TrashDigivolution; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-026", compiled)`.
- Behavioral proof: isolated file `BT13-026.test.ts` passed 3 tests in its own Vitest process. Observable cases: draws on attack and trashes the opponent's bottom evolution card when inherited; draws on attack from its printed effect; trashes the opponent's bottom evolution card through its inherited effect. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-027 — Shaujinmon — 10/10

- Catalog evidence: Blue Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Wizard; evolution requirements {"color":"Blue","level":4,"memoryCost":3}; printed clauses: ＜Blocker＞ [Opponent's Turn] When an opponent's Digimon attacks, you may play 1 level 4 or lower Digimon card from this Digimon's digivolution cards without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-027` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OpponentsTurn and actions SubTrigger, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-027", compiled)`.
- Behavioral proof: isolated file `BT13-027.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker and optionally plays a level 4 or lower card from its stack; plays a level 4 card from its own stack when the opponent attacks. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-028 — Thetismon — 10/10

- Catalog evidence: Blue Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Aquabeast; evolution requirements {"color":"Blue","level":4,"memoryCost":3}; printed clauses: [Hand][Main] If you have [Kiyoshiro Higashimitarai], by placing 1 [TeslaJellymon] from your hand as 1 of your [Jellymon]'s bottom digivolution card, that Digimon digivolves into this card for a digivolution cost of 3, ignoring digivolution requirements. | [End of Attack][Once Per Turn] By returning 3 cards with [Jellymon] in their text from your trash at the bottom of the deck in any order, unsuspend this Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-028` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, EndOfAttack and actions Digivolve, place, Unsuspend, return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-028", compiled)`.
- Behavioral proof: isolated file `BT13-028.test.ts` passed 2 tests in its own Vitest process. Observable cases: uses the hand digivolution cost 3 and the three-card inherited return cost; returns three Jellymon-text cards from trash to unsuspend after attacking. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-029 — MachGaogamon — 10/10

- Catalog evidence: Blue Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Cyborg; evolution requirements {"color":"Blue","level":4,"memoryCost":3}; printed clauses: [When Attacking] If your opponent has 8 or more cards in their hand, for the turn, this Digimon's attack target can't be switched. | [All Turns][Once Per Turn] When an effect adds cards to your opponent's hand, unsuspend this Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-029` reviewed; applicable entries Q2280; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking, AllTurns and actions Restrict, zoneCount, SubTrigger, Unsuspend; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-029", compiled)`.
- Behavioral proof: isolated file `BT13-029.test.ts` passed 3 tests in its own Vitest process. Observable cases: locks the attack target for the turn and unsuspends on opponent-hand additions; restricts attack-target changes when the opponent has eight cards in hand; unsuspends its host when an effect adds a card to the opponent's hand. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-030 — UlforceVeedramon — 10/10

- Catalog evidence: Blue Digimon level 6, play cost 11, DP 11000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Blue","level":5,"memoryCost":3}; printed clauses: [On Play][When Digivolving] For each of your Digimon with the [Royal Knight] trait and each of your blue Tamers, trash the top 2 digivolution cards of 1 of your opponent's Digimon. [Your Turn][Once Per Turn] When you play a Digimon with the [Royal Knight] trait or a blue Tamer, return 1 of your opponent's Digimon with no digivolution cards to the hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-030` reviewed; applicable entries Q2281, Q2282, Q2283; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, YourTurn and actions TrashDigivolution, SubTrigger, Return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-030", compiled)`.
- Behavioral proof: isolated file `BT13-030.test.ts` passed 2 tests in its own Vitest process. Observable cases: trashes two cards per Royal Knight or blue Tamer and returns only empty-stack Digimon; trashes two opponent evolution cards, then returns the emptied Digimon on play. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-031 — MirageGaogamon — 10/10

- Catalog evidence: Blue Digimon level 6, play cost 12, DP 12000; forms Mega; traits/types Beast Knight; evolution requirements {"color":"Blue","level":5,"memoryCost":4}; printed clauses: ＜Evade＞ (When this Digimon would be deleted, you may suspend it to prevent that deletion). [When Digivolving] Return 1 of your opponent’s Tamers to the hand. [All Turns][Once Per Turn] When an effect adds cards to your opponent's hand, you may play 1 [Thomas H. Norstein] from your hand without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-031` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, WhenDigivolving, AllTurns and actions Return, SubTrigger, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-031", compiled)`.
- Behavioral proof: isolated file `BT13-031.test.ts` passed 3 tests in its own Vitest process. Observable cases: registers Evade, Tamer bounce, and the once-per-turn Thomas trigger; plays Thomas when an effect adds a card to the opponent's hand; exposes Evade as an active keyword. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-032 — JumboGamemon — 10/10

- Catalog evidence: Blue/Black Digimon level 6, play cost 13, DP 13000; forms Mega; traits/types Cyborg; evolution requirements {"color":"Blue","level":5,"memoryCost":5}; {"color":"Black","level":5,"memoryCost":5}; printed clauses: ＜Blocker＞ [Opponent's Turn] When an opponent's Digimon attacks, you may play 1 level 5 or lower Digimon card from this Digimon's digivolution cards without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-032` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OpponentsTurn and actions SubTrigger, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-032", compiled)`.
- Behavioral proof: isolated file `BT13-032.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker and the level-5 stack-play trigger; plays a level 5 card from its own stack when the opponent attacks. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-033 — MirageGaogamon: Burst Mode — 10/10

- Catalog evidence: Blue Digimon level 7, play cost 15, DP 15000; forms Mega; traits/types Beast Knight; evolution requirements {"color":"Blue","level":6,"memoryCost":5}; printed clauses: Burst Digivolve: 0 from [MirageGaogamon] by returning 1 [Thomas H. Norstein] to handAt the end of the burst digivolution turn, trash this Digimon’s top card[When Digivolving] Return 1 of your opponent's Digimon to the hand. Then, gain 1 memory for every 4 cards in your opponent's hand. [When Attacking] If your opponent has 9 or more cards in their hand, by choosing cards in your opponent's hand without looking and returning them to the bottom of the deck so that 8 remain, unsuspend this Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-033` reviewed; applicable entries Q2284, Q2285, Q2286; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, WhenAttacking and actions Digivolve, Return, TrashDigivolution, GainMemory, Unsuspend, zoneCount, return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-033", compiled)`.
- Behavioral proof: isolated file `BT13-033.test.ts` passed 2 tests in its own Vitest process. Observable cases: contains the complete compiled digivolving and attacking effects; loads the registered card into the battle area with its printed attack trigger. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-034 — Kudamon — 10/10

- Catalog evidence: Yellow Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Holy Beast; evolution requirements {"color":"Yellow","level":2,"memoryCost":0}; printed clauses: [On Play] Reveal the top 3 cards of your deck. Add 1 yellow Digimon card with the [Vaccine] trait and 1 yellow Tamer card among them to the hand. Place the rest at the bottom of the deck in any order. | [When Attacking][Once per Turn] If there're 6 or fewer total cards in both players' security stacks, 1 of your opponent’s Digimon gets -2000 DP for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-034` reviewed; applicable entries Q2287; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenAttacking and actions RevealAdd, ModifyDP, totalSecurityCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-034", compiled)`.
- Behavioral proof: isolated file `BT13-034.test.ts` passed 2 tests in its own Vitest process. Observable cases: reveals three cards, adds the two yellow categories, and bottoms the rest; adds a yellow Vaccine and Tamer from the top three cards and bottoms the rest. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-035 — PawnChessmon — 10/10

- Catalog evidence: Yellow/Black Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Puppet; evolution requirements {"color":"Yellow","level":2,"memoryCost":1}; {"color":"Black","level":2,"memoryCost":1}; printed clauses: [On Deletion] If it's your turn, you may play 1 level 3 or lower Digimon card with [Chessmon] in its name from your hand without paying the cost. If you have 8 or more Digimon cards with [Chessmon] in their names in your trash, add 2 to the maximum level of the card this effect can play. | ＜Reboot＞ (Unsuspend this Digimon during your opponent's unsuspend phase).
- Knowledge base: `node tools/kb/query.mjs card BT13-035` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion, Static and actions CostModifier, youHave, PlayWithoutCost, isYourTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-035", compiled)`.
- Behavioral proof: isolated file `BT13-035.test.ts` passed 2 tests in its own Vitest process. Observable cases: plays Chessmon conditionally and raises the level ceiling by two at eight trash cards; plays a PawnChessmon from hand when deleted during its controller's turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-036 — Liollmon — 10/10

- Catalog evidence: Yellow Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Holy Beast; evolution requirements {"color":"Yellow","level":2,"memoryCost":0}; printed clauses: [Your Turn][Once Per Turn] When a card is removed from your security stack, gain 1 memory. | [When Attacking][Once per Turn] If there're 6 or fewer total cards in both players' security stacks, 1 of your opponent’s Digimon gets -2000 DP for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-036` reviewed; applicable entries Q2288; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn, WhenAttacking and actions SubTrigger, GainMemory, ModifyDP, totalSecurityCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-036", compiled)`.
- Behavioral proof: isolated file `BT13-036.test.ts` passed 2 tests in its own Vitest process. Observable cases: gains memory on security removal and preserves the inherited security-count debuff; gains one memory when a security card is removed during its turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-037 — Liamon — 10/10

- Catalog evidence: Yellow Digimon level 4, play cost 4, DP 4000; forms Champion; traits/types Holy Beast; evolution requirements {"color":"Yellow","level":3,"memoryCost":2}; printed clauses: [When Attacking] By trashing the top card of your security stack, 1 of your opponent's Digimon gets -4000 DP for the turn. | [When Attacking][Once per Turn] If there're 6 or fewer total cards in both players' security stacks, 1 of your opponent’s Digimon gets -2000 DP for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-037` reviewed; applicable entries Q2289; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking and actions ModifyDP, trash, totalSecurityCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-037", compiled)`.
- Behavioral proof: isolated file `BT13-037.test.ts` passed 2 tests in its own Vitest process. Observable cases: trashes the top security card for the attack debuff; trashes its controller's top security card when the attack effect resolves. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-038 — Reppamon — 10/10

- Catalog evidence: Yellow Digimon level 4, play cost 4, DP 4000; forms Champion; traits/types Holy Beast; evolution requirements {"color":"Yellow","level":3,"memoryCost":2}; printed clauses: [When Attacking] By trashing the top card of your security stack, 1 of your opponent's Digimon gains ＜Security Attack -2＞ until the end of your opponent's turn. | [When Attacking][Once per Turn] If there're 6 or fewer total cards in both players' security stacks, 1 of your opponent’s Digimon gets -2000 DP for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-038` reviewed; applicable entries Q2290; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking and actions GainKeyword, trash, ModifyDP, totalSecurityCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-038", compiled)`.
- Behavioral proof: isolated file `BT13-038.test.ts` passed 2 tests in its own Vitest process. Observable cases: trashes the top security card for Security Attack -2; pays the attack cost by trashing the controller's top security card. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-039 — KnightChessmon — 10/10

- Catalog evidence: Yellow/Black Digimon level 4, play cost 5, DP 4000; forms Champion; traits/types Puppet; evolution requirements {"color":"Yellow","level":3,"memoryCost":3}; {"color":"Black","level":3,"memoryCost":3}; printed clauses: Digivolve: 2 from Lv.3 w/[Chessmon] in name [On Deletion] If it's your turn, you may play 1 level 4 or lower Digimon card with [Chessmon] in its name from your hand without paying the cost. | ＜Reboot＞ (Unsuspend this Digimon during your opponent's unsuspend phase).
- Knowledge base: `node tools/kb/query.mjs card BT13-039` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion, Static and actions PlayWithoutCost, isYourTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-039", compiled)`.
- Behavioral proof: isolated file `BT13-039.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps the Chessmon evolution requirement and conditional deletion play; plays another level-4 Chessmon from hand after deletion on its turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-040 — Magnamon — 10/10

- Catalog evidence: Yellow/Blue Digimon level 4, play cost 7, DP 7000; forms ArmorForm; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Yellow","level":3,"memoryCost":4}; printed clauses: Digivolve: 3 from [Veemon]＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [All Turns] When this Digimon would leave the battle area, ＜Draw 1＞. Then, you may play 1 [Veemon] from your hand or this Digimon's digivolution cards without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-040` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, AllTurns and actions Replacement, Draw, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-040", compiled)`.
- Behavioral proof: isolated file `BT13-040.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker and replaces leaving play with draw plus optional Veemon play; exposes Blocker on the live Magnamon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-041 — Chirinmon — 10/10

- Catalog evidence: Yellow Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Holy Beast; evolution requirements {"color":"Yellow","level":4,"memoryCost":3}; printed clauses: ＜Barrier＞ (When this Digimon would be deleted in battle, by trashing the top card of your security stack, prevent that deletion.) | [On Deletion] You may play 1 [Kudamon] from your hand or trash suspended without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-041` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnDeletion and actions PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-041", compiled)`.
- Behavioral proof: isolated file `BT13-041.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Barrier and plays inherited Kudamon suspended; exposes Barrier on the live Chirinmon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-042 — BishopChessmon — 10/10

- Catalog evidence: Yellow/Black Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Puppet; evolution requirements {"color":"Yellow","level":4,"memoryCost":4}; {"color":"Black","level":4,"memoryCost":4}; printed clauses: Digivolve: 3 from Lv.4 w/[Chessmon] in name [On Deletion] If it's your turn, you may play 1 level 5 or lower Digimon card with [Chessmon] in its name from your hand without paying the cost. | ＜Reboot＞ (Unsuspend this Digimon during your opponent's unsuspend phase).
- Knowledge base: `node tools/kb/query.mjs card BT13-042` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion, Static and actions PlayWithoutCost, isYourTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-042", compiled)`.
- Behavioral proof: isolated file `BT13-042.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps the level-4 Chessmon evolution and level-5 deletion play; plays another BishopChessmon from hand after deletion on its turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-043 — LoaderLeomon — 10/10

- Catalog evidence: Yellow Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Machine; evolution requirements {"color":"Yellow","level":4,"memoryCost":3}; printed clauses: ＜Barrier＞ (When this Digimon would be deleted in battle, by trashing the top card of your security stack, prevent that deletion.) | ＜Barrier＞ (When this Digimon would be deleted in battle, by trashing the top card of your security stack, prevent that deletion.).
- Knowledge base: `node tools/kb/query.mjs card BT13-043` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static and actions none; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-043", compiled)`.
- Behavioral proof: isolated file `BT13-043.test.ts` passed 2 tests in its own Vitest process. Observable cases: registers Barrier both as a printed and inherited keyword; exposes Barrier on the live LoaderLeomon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-044 — BanchoLeomon — 10/10

- Catalog evidence: Yellow Digimon level 6, play cost 12, DP 11000; forms Mega; traits/types Beastkin, Boss; evolution requirements {"color":"Yellow","level":5,"memoryCost":3}; printed clauses: ＜Blocker＞ [When Digivolving] By trashing the top card of your security stack, 1 of your opponent's Digimon gets -6000 DP until the end of your opponent's turn. [All Turns][Once Per Turn] When a card is removed from your security stack, you may play 1 yellow Tamer card from your hand without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-044` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, AllTurns and actions ModifyDP, trash, SubTrigger, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-044", compiled)`.
- Behavioral proof: isolated file `BT13-044.test.ts` passed 2 tests in its own Vitest process. Observable cases: uses the top security card for the DP reduction and reacts to security removal; trashes the top security card and reduces one opposing Digimon by 6000. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-045 — KingChessmon — 10/10

- Catalog evidence: Yellow/Black Digimon level 6, play cost 13, DP 11000; forms Mega; traits/types Puppet; evolution requirements {"color":"Yellow","level":5,"memoryCost":4}; {"color":"Black","level":5,"memoryCost":4}; printed clauses: Digivolve: 3 from Lv.5 w/[Chessmon] in name When you would play this card from the hand, if you have 8 or more Digimon cards with [Chessmon] in their names in your trash, reduce the play cost by 8. [On Play][When Digivolving] By deleting 1 of your other Digimon, you may play 1 Digimon card with [Chessmon] in its name, other than [KingChessmon], from your hand without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-045` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnPlay, WhenDigivolving and actions Replacement, youHave, PlayWithoutCost, deleteOwn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-045", compiled)`.
- Behavioral proof: isolated file `BT13-045.test.ts` passed 2 tests in its own Vitest process. Observable cases: reduces its play cost at eight Chessmon in trash and deletes another Digimon to play one; deletes another Digimon and plays a Chessmon from hand on play. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-046 — Kentaurosmon — 10/10

- Catalog evidence: Yellow Digimon level 6, play cost 13, DP 13000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Yellow","level":5,"memoryCost":5}; printed clauses: [On Play][When Digivolving] If there're 6 or fewer total cards in both players' security stacks, gain 3 memory, and reveal 1 card in your hand. If it’s yellow, place it on top of your security stack face down. If it's not, return it to the hand.[When Attacking][Once Per Turn] By trashing the top card of your security stack, unsuspend this Digimon, and 1 of your opponent's Digimon gets -7000 DP for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-046` reviewed; applicable entries Q2291, Q2292, Q2293; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, WhenAttacking and actions totalSecurityCount, GainMemory, HandRevealAdd, Unsuspend, trash, ModifyDP; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-046", compiled)`.
- Behavioral proof: isolated file `BT13-046.test.ts` passed 2 tests in its own Vitest process. Observable cases: contains the security-count reveal effects and the attack cost/debuff sequence; loads the IR implementation into a live Kentaurosmon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-047 — Angoramon — 10/10

- Catalog evidence: Green Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Beast; evolution requirements {"color":"Green","level":2,"memoryCost":0}; printed clauses: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) | [All Turns] While your opponent has no unsuspended Digimon, this Digimon gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-047` reviewed; applicable entries Q5997; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, AllTurns and actions Aura, modifyDP, opponentHasNone; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-047", compiled)`.
- Behavioral proof: isolated file `BT13-047.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker and the no-unsuspended-opponent aura; gains the inherited +1000 DP when the opponent has no Digimon. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-048 — Salamon — 10/10

- Catalog evidence: Green Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Mammal; evolution requirements {"color":"Green","level":2,"memoryCost":0}; printed clauses: [On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with [Beast], [Animal], or [Sovereign], other than [Sea Animal], in one of its traits and 1 Digimon card with the [Royal Knight] trait among them to the hand. Place the rest at the bottom of the deck in any order. | [Your Turn] While this Digimon has [Beast], [Animal], or [Sovereign], other than [Sea Animal], in one of its traits or the [Royal Knight] trait, it gets +2000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-048` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, YourTurn and actions RevealAdd, Aura, modifyDP, anyOf, allOf, selfHasTrait, not; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-048", compiled)`.
- Behavioral proof: isolated file `BT13-048.test.ts` passed 2 tests in its own Vitest process. Observable cases: searches the two printed trait groups and applies the inherited DP condition; loads the compiled Salamon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-049 — Lalamon — 10/10

- Catalog evidence: Green Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Vegetation; evolution requirements {"color":"Green","level":2,"memoryCost":0}; printed clauses: [On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with [Vegetation], [Plant], or [Fairy] in one of its traits and 1 [Yoshino Fujieda] among them to the hand. Place the rest at the bottom of the deck in any order. | [Your Turn][Once Per Turn] When this Digimon would digivolve, if you have a green Tamer, reduce the digivolution cost by 1..
- Knowledge base: `node tools/kb/query.mjs card BT13-049` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, YourTurn and actions RevealAdd, Replacement, youHave; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-049", compiled)`.
- Behavioral proof: isolated file `BT13-049.test.ts` passed 2 tests in its own Vitest process. Observable cases: searches the green trait/Yoshino pair and installs the conditional reduction; loads the compiled Lalamon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-050 — Sunflowmon — 10/10

- Catalog evidence: Green Digimon level 4, play cost 4, DP 3000; forms Champion; traits/types Vegetation; evolution requirements {"color":"Green","level":3,"memoryCost":2}; printed clauses: [Main] By suspending this Digimon, 1 of your Digimon may digivolve into a Digimon card with [Fairy] in one of its traits in the hand for the digivolution cost. When it would digivolve by this effect, reduce the digivolution cost by 2. | [Your Turn][Once Per Turn] When this Digimon would digivolve, if you have a green Tamer, reduce the digivolution cost by 1..
- Knowledge base: `node tools/kb/query.mjs card BT13-050` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, YourTurn and actions Digivolve, suspend, Replacement, youHave; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-050", compiled)`.
- Behavioral proof: isolated file `BT13-050.test.ts` passed 2 tests in its own Vitest process. Observable cases: charges suspension for the Fairy digivolution and reduces its cost by two; loads the compiled Sunflowmon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-051 — Mikemon — 10/10

- Catalog evidence: Green Digimon level 4, play cost 4, DP 4000; forms Champion; traits/types Beast; evolution requirements {"color":"Green","level":3,"memoryCost":2}; printed clauses: [On Play] 1 of your Digimon gains ＜Piercing＞ for the turn. (When this Digimon attacks and deletes an opponent's Digimon, it performs any security checks it normally would.) | [Your Turn] While this Digimon has [Beast], [Animal], or [Sovereign], other than [Sea Animal], in one of its traits or the [Royal Knight] trait, it gets +2000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-051` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, YourTurn and actions GainKeyword, Aura, modifyDP, anyOf, allOf, selfHasTrait, not; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-051", compiled)`.
- Behavioral proof: isolated file `BT13-051.test.ts` passed 2 tests in its own Vitest process. Observable cases: grants temporary Piercing and preserves the inherited trait aura; loads the compiled Mikemon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-052 — SymbareAngoramon — 10/10

- Catalog evidence: Green Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Beastkin; evolution requirements {"color":"Green","level":3,"memoryCost":2}; printed clauses: ＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.) | [All Turns] While your opponent has no unsuspended Digimon, this Digimon gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-052` reviewed; applicable entries Q2294; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, AllTurns and actions Aura, modifyDP, opponentHasNone; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-052", compiled)`.
- Behavioral proof: isolated file `BT13-052.test.ts` passed 2 tests in its own Vitest process. Observable cases: registers Jamming and the inherited empty-opponent-board aura; exposes Jamming on the live SymbareAngoramon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-053 — Mihiramon — 10/10

- Catalog evidence: Green Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Holy Beast, Deva; evolution requirements {"color":"Green","level":4,"memoryCost":3}; printed clauses: [On Play] Suspend 1 of your opponent's Digimon with 7000 DP or less. Then, until the end of your opponent's turn, 1 of your opponent's Digimon doesn't unsuspend. | [Your Turn][Once Per Turn] When this Digimon would digivolve, reduce the digivolution cost by 1..
- Knowledge base: `node tools/kb/query.mjs card BT13-053` reviewed; applicable entries Q2295, Q2296, Q2297; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, YourTurn and actions Suspend, Restrict, Replacement; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-053", compiled)`.
- Behavioral proof: isolated file `BT13-053.test.ts` passed 2 tests in its own Vitest process. Observable cases: suspends a target and prevents unsuspension without undoing the suspension; suspends an eligible opponent Digimon and keeps it suspended. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-054 — Lilamon — 10/10

- Catalog evidence: Green Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Fairy; evolution requirements {"color":"Green","level":4,"memoryCost":3}; printed clauses: [When Digivolving] You may play 1 [Yoshino Fujieda] from your hand without paying the cost. | [Your Turn] While your opponent has a suspended Digimon, this Digimon gains ＜Security Attack +1＞..
- Knowledge base: `node tools/kb/query.mjs card BT13-054` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, YourTurn and actions PlayWithoutCost, Aura, keyword, opponentHas; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-054", compiled)`.
- Behavioral proof: isolated file `BT13-054.test.ts` passed 2 tests in its own Vitest process. Observable cases: plays Yoshino optionally and grants inherited Security Attack +1 conditionally; loads the compiled Lilamon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-055 — Lamortmon — 10/10

- Catalog evidence: Green Digimon level 5, play cost 8, DP 8000; forms Ultimate; traits/types Beast; evolution requirements {"color":"Green","level":4,"memoryCost":3}; printed clauses: [Hand][Main] If you have [Ruli Tsukiyono], by placing 1 [SymbareAngoramon] from your hand as 1 of your [Angoramon]’s bottom digivolution card, that Digimon digivolves into this card for a digivolution cost of 3, ignoring digivolution requirements. | [Your Turn][Once Per Turn] When this Digimon deletes an opponent's Digimon in battle, trash the top card of your opponent's security stack..
- Knowledge base: `node tools/kb/query.mjs card BT13-055` reviewed; applicable entries Q2298; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, YourTurn and actions Digivolve, place, SubTrigger, SecurityManipulation; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-055", compiled)`.
- Behavioral proof: isolated file `BT13-055.test.ts` passed 2 tests in its own Vitest process. Observable cases: uses hand digivolution cost 3 and trashes opponent security on inherited battle deletion; trashes the opponent's top security card after a battle deletion. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-056 — Leopardmon — 10/10

- Catalog evidence: Green Digimon level 6, play cost 11, DP 11000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Green","level":5,"memoryCost":3}; printed clauses: [When Digivolving][Main][Once Per Turn] You may play 1 green or [Royal Knight] trait Digimon card from your hand for the cost. When it would be played by this effect, reduce the play cost by 4. [All Turns] When you play another Digimon, all of your green and [Royal Knight] trait Digimon gain ＜Blocker＞ until the end of your opponent's turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-056` reviewed; applicable entries Q2299, Q2300, Q2301; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, Main, AllTurns and actions PlayWithoutCost, Replacement, SubTrigger, GainKeyword; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-056", compiled)`.
- Behavioral proof: isolated file `BT13-056.test.ts` passed 2 tests in its own Vitest process. Observable cases: shares the once-per-turn play effect across both timings and grants Blocker dynamically; loads the compiled Leopardmon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-057 — Rosemon — 10/10

- Catalog evidence: Green Digimon level 6, play cost 11, DP 11000; forms Mega; traits/types Fairy; evolution requirements {"color":"Green","level":5,"memoryCost":3}; printed clauses: [When Digivolving] By suspending 1 of your opponent's Digimon or Tamers, unsuspend this Digimon. [All Turns][Once Per Turn] When an opponent’s Digimon or Tamer becomes suspended, suspend 1 of your opponent’s Digimon or Tamers..
- Knowledge base: `node tools/kb/query.mjs card BT13-057` reviewed; applicable entries Q2302; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, AllTurns and actions Unsuspend, suspend, SubTrigger, Suspend; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-057", compiled)`.
- Behavioral proof: isolated file `BT13-057.test.ts` passed 2 tests in its own Vitest process. Observable cases: suspends only unsuspended opponent permanents for both clauses; loads the compiled Rosemon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-058 — Leopardmon: Leopard Mode — 10/10

- Catalog evidence: Green Digimon level 6, play cost 12, DP 12000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Green","level":5,"memoryCost":4}; printed clauses: Digivolve: 1 from [Leopardmon][When Digivolving] Suspend 1 of your opponent's Digimon. Until the end of your opponent's turn, 1 of your opponent's Digimon doesn't unsuspend. [When Attacking] By suspending 1 of your other Digimon, unsuspend this Digimon. [End of Your Turn] Trash the top card of this Digimon and unsuspend all of your Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-058` reviewed; applicable entries Q2303; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, WhenAttacking, EndOfYourTurn and actions Suspend, Restrict, Unsuspend, suspend, Trash; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-058", compiled)`.
- Behavioral proof: isolated file `BT13-058.test.ts` passed 2 tests in its own Vitest process. Observable cases: restricts opponent unsuspension, charges suspension for attack, and trashes its top card at turn end; loads the compiled Leopardmon: Leopard Mode implementation. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-059 — Examon — 10/10

- Catalog evidence: Green/Blue Digimon level 7, play cost 14, DP 14000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Green","level":6,"memoryCost":4}; {"color":"Blue","level":6,"memoryCost":4}; printed clauses: Digivolve unsuspended with the 2 specified Digimon stacked on top of each other.[On Play][When Digivolving] Suspend 1 of your opponent's Digimon. That Digimon doesn't unsuspend during your opponent's next unsuspend phase. [All Turns][Once Per Turn] When an opponent's Digimon becomes suspended, you may activate 1 of the effects below. ・ Suspend 1 of your opponent's Digimon. ・ Unsuspend 1 of your Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-059` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, AllTurns and actions Suspend, Restrict, SubTrigger, Modal, Unsuspend; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-059", compiled)`.
- Behavioral proof: isolated file `BT13-059.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps DNA materials, same-target unsuspend restriction, and the once-per-turn modal; suspends an opponent Digimon on play and keeps the selected target restricted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-060 — Rosemon: Burst Mode — 10/10

- Catalog evidence: Green Digimon level 7, play cost 15, DP 15000; forms Mega; traits/types Fairy; evolution requirements {"color":"Green","level":6,"memoryCost":5}; printed clauses: Burst Digivolve: 0 from [Rosemon] by returning 1 [Yoshino Fujieda] to handAt the end of the burst digivolution turn, trash this Digimon’s top card[When Digivolving] Suspend 1 of your opponent's Digimon and 1 of their Tamers. Until the end of your opponent's turn, all of their Digimon and Tamers don't unsuspend. [When Attacking] Trash the top card of your opponent’s security stack for every 2 of your opponent's suspended Digimon and Tamers..
- Knowledge base: `node tools/kb/query.mjs card BT13-060` reviewed; applicable entries Q2304, Q2305; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, EndOfYourTurn, WhenDigivolving, WhenAttacking and actions Digivolve, Return, TrashDigivolution, Suspend, Restrict, SecurityManipulation; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-060", compiled)`.
- Behavioral proof: isolated file `BT13-060.test.ts` passed 2 tests in its own Vitest process. Observable cases: has complete compiled coverage and no residual gaps; suspends an opposing Digimon and Tamer when digivolving. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-061 — Gotsumon — 10/10

- Catalog evidence: Black Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Rock; evolution requirements {"color":"Black","level":2,"memoryCost":0}; printed clauses: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [On Deletion] If it's your opponent's turn, reveal the top 3 cards of your deck. Add 1 black card among them to the hand. Place the rest at the bottom of the deck in any order..
- Knowledge base: `node tools/kb/query.mjs card BT13-061` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnDeletion and actions RevealAdd, isOpponentsTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-061", compiled)`.
- Behavioral proof: isolated file `BT13-061.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker and opponent-turn black-card reveal; exposes Blocker on the live Gotsumon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-062 — Chuumon — 10/10

- Catalog evidence: Black Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Beast; evolution requirements {"color":"Black","level":2,"memoryCost":0}; printed clauses: [On Play] By trashing 1 card with [Sukamon] or [Etemon] in its name in your hand, return 1 card with [Sukamon] in its name from your trash to the hand. | [On Deletion] If this Digimon had [Sukamon] or [Etemon] in its name, you may play 1 [Chuumon] from your trash suspended without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-062` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, OnDeletion and actions Return, trash, PlayWithoutCost, selfHasNameContaining; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-062", compiled)`.
- Behavioral proof: isolated file `BT13-062.test.ts` passed 2 tests in its own Vitest process. Observable cases: charges the hand trash cost and plays inherited Chuumon suspended; trashes a Sukamon from hand and returns one from trash when played. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-063 — Dorumon — 10/10

- Catalog evidence: Black Digimon level 3, play cost 3, DP 3000; forms Rookie; traits/types Beast, X Antibody; evolution requirements {"color":"Black","level":2,"memoryCost":0}; printed clauses: [All Turns] While this Digimon has the [X Antibody] trait, it gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-063` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers AllTurns and actions Aura, modifyDP, selfHasTrait; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-063", compiled)`.
- Behavioral proof: isolated file `BT13-063.test.ts` passed 2 tests in its own Vitest process. Observable cases: grants inherited DP only with X Antibody; loads the compiled Dorumon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-064 — PawnChessmon — 10/10

- Catalog evidence: Black/Yellow Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Puppet; evolution requirements {"color":"Black","level":2,"memoryCost":1}; {"color":"Yellow","level":2,"memoryCost":1}; printed clauses: ＜Blocker＞[On Deletion] If it's your opponent's turn, you may play 1 level 3 or lower Digimon card with [Chessmon] in its name from your hand without paying the cost. If you have 8 or more Digimon cards with [Chessmon] in their names in your trash, add 2 to the maximum level of the card this effect can play..
- Knowledge base: `node tools/kb/query.mjs card BT13-064` reviewed; applicable entries Q2306; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion and actions CostModifier, youHave, PlayWithoutCost, isOpponentsTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-064", compiled)`.
- Behavioral proof: isolated file `BT13-064.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker, opponent-turn restriction, and the eight-card level ceiling; plays a level-3 Chessmon from hand when deleted during the opponent's turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-065 — PlatinumSukamon — 10/10

- Catalog evidence: Black Digimon level 4, play cost 3, DP 2000; forms Champion; traits/types Mutant; evolution requirements {"color":"Black","level":3,"memoryCost":2}; printed clauses: [On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. (Trash 1 card from the top of 1 of your opponent's Digimon. Stop trashing when you would trash a level 3 card or the Digimon's last card.) | [All Turns] When this Digimon would be deleted, by deleting 1 other Digimon with [Sukamon] in its name, prevent that deletion..
- Knowledge base: `node tools/kb/query.mjs card BT13-065` reviewed; applicable entries Q2307, Q2308, Q2615; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion, AllTurns and actions DeDigivolve, Replacement, Prevent, deleteOwn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-065", compiled)`.
- Behavioral proof: isolated file `BT13-065.test.ts` passed 2 tests in its own Vitest process. Observable cases: uses De-Digivolve 1 stopping at level 3 and the inherited deletion replacement; loads the compiled PlatinumSukamon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-066 — Dorugamon — 10/10

- Catalog evidence: Black Digimon level 4, play cost 4, DP 5000; forms Champion; traits/types Beast Dragon, X Antibody; evolution requirements {"color":"Black","level":3,"memoryCost":2}; printed clauses: [All Turns] While this Digimon has the [X Antibody] trait, it gets +1000 DP..
- Knowledge base: `node tools/kb/query.mjs card BT13-066` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers AllTurns and actions Aura, modifyDP, selfHasTrait; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-066", compiled)`.
- Behavioral proof: isolated file `BT13-066.test.ts` passed 2 tests in its own Vitest process. Observable cases: grants inherited DP while carrying X Antibody; loads the compiled Dorugamon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-067 — Gladimon — 10/10

- Catalog evidence: Black Digimon level 4, play cost 5, DP 4000; forms Champion; traits/types Warrior; evolution requirements {"color":"Black","level":3,"memoryCost":2}; printed clauses: ＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.) | ＜Reboot＞ (Unsuspend this Digimon during your opponent's unsuspend phase).
- Knowledge base: `node tools/kb/query.mjs card BT13-067` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static and actions none; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-067", compiled)`.
- Behavioral proof: isolated file `BT13-067.test.ts` passed 2 tests in its own Vitest process. Observable cases: registers Jamming and inherited Reboot; exposes Jamming on the live Gladimon permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-068 — KnightChessmon — 10/10

- Catalog evidence: Black/Yellow Digimon level 4, play cost 5, DP 4000; forms Champion; traits/types Puppet; evolution requirements {"color":"Black","level":3,"memoryCost":3}; {"color":"Yellow","level":3,"memoryCost":3}; printed clauses: Digivolve: 2 from Lv.3 w/[Chessmon] in name ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [On Deletion] If it's your opponent's turn, you may play 1 level 4 or lower Digimon card with [Chessmon] in its name from your hand without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-068` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnDeletion and actions PlayWithoutCost, isOpponentsTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-068", compiled)`.
- Behavioral proof: isolated file `BT13-068.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker, evolution cost 2, and opponent-turn Chessmon play; plays a level-4 Chessmon from hand after deletion during the opponent's turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-069 — KingSukamon — 10/10

- Catalog evidence: Black/Yellow Digimon level 5, play cost 6, DP 6000; forms Ultimate; traits/types Mutant; evolution requirements {"color":"Black","level":4,"memoryCost":4}; {"color":"Yellow","level":4,"memoryCost":4}; printed clauses: Digivolve: 3 from Lv.4 w/[Sukamon] in name [When Attacking] You may play 1 level 4 or lower Digimon card with [Sukamon] in its name from your hand without paying the cost. | [All Turns] When this Digimon would be deleted, by deleting 1 other Digimon with [Sukamon] in its name, prevent that deletion..
- Knowledge base: `node tools/kb/query.mjs card BT13-069` reviewed; applicable entries Q2309, Q2310; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking, AllTurns and actions PlayWithoutCost, Replacement, Prevent, deleteOwn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-069", compiled)`.
- Behavioral proof: isolated file `BT13-069.test.ts` passed 2 tests in its own Vitest process. Observable cases: plays a level-4 Sukamon on attack and prevents deletion by deleting another Sukamon; plays a Sukamon from hand when the host attacks. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-070 — RookChessmon — 10/10

- Catalog evidence: Black/Yellow Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Puppet; evolution requirements {"color":"Black","level":4,"memoryCost":4}; {"color":"Yellow","level":4,"memoryCost":4}; printed clauses: Digivolve: 3 from Lv.4 w/[Chessmon] in name ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [On Deletion] If it's your opponent's turn, you may play 1 level 5 or lower Digimon card with [Chessmon] in its name from your hand without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-070` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnDeletion and actions PlayWithoutCost, isOpponentsTurn; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-070", compiled)`.
- Behavioral proof: isolated file `BT13-070.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker, evolution cost 3, and opponent-turn level-5 play; plays a level-5 Chessmon after deletion during the opponent's turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-071 — Giromon — 10/10

- Catalog evidence: Black Digimon level 5, play cost 8, DP 8000; forms Ultimate; traits/types Mine; evolution requirements {"color":"Black","level":4,"memoryCost":3}; printed clauses: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) | [Opponent's Turn][Once Per Turn] When one of your Digimon becomes suspended, trash the top card of your opponent's security stack..
- Knowledge base: `node tools/kb/query.mjs card BT13-071` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OpponentsTurn and actions SubTrigger, SecurityManipulation; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-071", compiled)`.
- Behavioral proof: isolated file `BT13-071.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker and inherited opponent-turn security trash; trashes the opponent's top security when an inherited Digimon becomes suspended. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-072 — DoruGreymon — 10/10

- Catalog evidence: Black Digimon level 5, play cost 8, DP 8000; forms Ultimate; traits/types Beast Dragon, X Antibody; evolution requirements {"color":"Black","level":4,"memoryCost":3}; printed clauses: [When Digivolving] Reveal the top 3 cards of your deck. Place 1 card with the [X Antibody] trait among them as this Digimon's bottom digivolution card. If a card was placed by this effect, this Digimon's DP can't be reduced until the end of your opponent's turn. Trash the rest. | [End of Your Turn][Once Per Turn] You may place 1 Digimon card with the [X Antibody] trait from your hand as this Digimon's bottom digivolution card..
- Knowledge base: `node tools/kb/query.mjs card BT13-072` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenDigivolving, EndOfYourTurn and actions RevealAdd, Restrict, ifThisEffectActed, PlaceUnder; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-072", compiled)`.
- Behavioral proof: isolated file `BT13-072.test.ts` passed 2 tests in its own Vitest process. Observable cases: places an X Antibody reveal under itself and grants conditional DP immunity; loads the compiled DoruGreymon implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-073 — QueenChessmon — 10/10

- Catalog evidence: Black/Yellow Digimon level 6, play cost 11, DP 12000; forms Mega; traits/types Puppet; evolution requirements {"color":"Black","level":5,"memoryCost":4}; {"color":"Yellow","level":5,"memoryCost":4}; printed clauses: Digivolve: 3 from Lv.5 w/[Chessmon] in name ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) [All Turns] When one of your Digimon with [Chessmon] in its name is deleted, unsuspend this Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-073` reviewed; applicable entries Q2311; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, AllTurns and actions SubTrigger, Unsuspend; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-073", compiled)`.
- Behavioral proof: isolated file `BT13-073.test.ts` passed 2 tests in its own Vitest process. Observable cases: keeps Blocker, Chessmon evolution cost 3, and deletion-triggered unsuspend; unsuspends itself when your Chessmon is deleted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-074 — PrinceMamemon — 10/10

- Catalog evidence: Black Digimon level 6, play cost 11, DP 11000; forms Mega; traits/types Mutant; evolution requirements {"color":"Black","level":5,"memoryCost":3}; printed clauses: [On Play][When Digivolving] Reveal the top 3 cards of your deck. You may play 1 Digimon card that has [Mamemon] in its name and a play cost of 10 or less among them without paying the cost. Trash the rest.[All Turns] All of your Digimon with [Mamemon] in their names or the [Royal Knight] trait gain ＜Jamming＞ and ＜Reboot＞..
- Knowledge base: `node tools/kb/query.mjs card BT13-074` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, AllTurns and actions RevealAdd, Aura, keyword, selfHasTrait; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-074", compiled)`.
- Behavioral proof: isolated file `BT13-074.test.ts` passed 2 tests in its own Vitest process. Observable cases: uses reveal-play clauses and continuous Jamming/Reboot auras; grants Jamming and Reboot to Mamemon and Royal Knight Digimon. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-075 — Alphamon — 10/10

- Catalog evidence: Black Digimon level 6, play cost 12, DP 12000; forms Mega; traits/types Holy Warrior, Royal Knight, X Antibody; evolution requirements {"color":"Black","level":5,"memoryCost":4}; printed clauses: [On Play][When Digivolving] By placing 1 Digimon card with the [X Antibody] or [Royal Knight] trait from your trash as this Digimon's bottom digivolution card, all of your opponent's play cost 10 or higher Digimon can't attack players until the end of their turn.[All Turns][Once Per Turn] When an effect would remove this Digimon from the battle area, by returning 1 card with the [X Antibody] or [Royal Knight] trait from this Digimon's digivolution cards to the bottom of the deck, prevent that removal..
- Knowledge base: `node tools/kb/query.mjs card BT13-075` reviewed; applicable entries Q2312, Q2313; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, AllTurns and actions Restrict, place, Replacement, return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-075", compiled)`.
- Behavioral proof: isolated file `BT13-075.test.ts` passed 2 tests in its own Vitest process. Observable cases: has complete compiled coverage and no residual gaps; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-076 — KingEtemon — 10/10

- Catalog evidence: Black/Yellow Digimon level 6, play cost 13, DP 12000; forms Mega; traits/types Puppet; evolution requirements {"color":"Black","level":5,"memoryCost":5}; {"color":"Yellow","level":5,"memoryCost":5}; printed clauses: Digivolve: 4 from Lv.5 w/[Etemon] or [Sukamon] in name[All Turns][Once Per Turn] When another Digimon with [Etemon] or [Sukamon] in its name is deleted, 1 of your opponent's Digimon gets -3000 DP and gains ＜Security Attack -1＞ until the end of your opponent's turn. [Opponent's Turn] All of your Digimon with [Etemon] or [Sukamon] in their names gain ＜Blocker＞ and can't be returned to hands or decks..
- Knowledge base: `node tools/kb/query.mjs card BT13-076` reviewed; applicable entries Q2314; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers AllTurns, OpponentsTurn and actions SubTrigger, ModifyDP, GainKeyword, Restrict; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-076", compiled)`.
- Behavioral proof: isolated file `BT13-076.test.ts` passed 3 tests in its own Vitest process. Observable cases: debuffs one opposing Digimon when an Etemon or Sukamon is deleted; grants Blocker and protects Etemon/Sukamon Digimon from returning; reduces an opposing Digimon when your Etemon is deleted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-077 — Craniamon — 10/10

- Catalog evidence: Black Digimon level 6, play cost 13, DP 13000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Black","level":5,"memoryCost":5}; printed clauses: ＜Blocker＞ [On Play][When Digivolving] Until the end of your opponent's turn, this Digimon isn't affected by the effects of your opponent's Digimon. [End of Opponent’s Turn] Choose 1 of your opponent's Digimon. Your opponent attacks with the chosen Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-077` reviewed; applicable entries Q2315, Q2316, Q2317, Q2318, Q2319, Q2320; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, EndOfOpponentsTurn and actions GrantStatic, RedirectAttack; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-077", compiled)`.
- Behavioral proof: isolated file `BT13-077.test.ts` passed 3 tests in its own Vitest process. Observable cases: grants Blocker and opponent-Digimon effect immunity through the opponent's turn; redirects an opponent's end-of-turn attack after choosing a Digimon; installs opponent Digimon-effect immunity when played. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-078 — Phascomon — 10/10

- Catalog evidence: Purple Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Dark Animal; evolution requirements {"color":"Purple","level":2,"memoryCost":0}; printed clauses: [On Deletion] ＜Draw 1＞ (Draw 1 card from your deck.) Then, trash 1 card in your hand. | [End of Opponent’s Turn][Once Per Turn] ＜Draw 1＞. Then, trash 1 card in your hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-078` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDeletion, EndOfOpponentsTurn and actions Draw, Trash; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-078", compiled)`.
- Behavioral proof: isolated file `BT13-078.test.ts` passed 3 tests in its own Vitest process. Observable cases: draws 1 and then trashes 1 card on deletion; keeps the inherited end-of-opponent-turn effect once per turn; draws before trashing when deleted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-079 — Falcomon — 10/10

- Catalog evidence: Purple Digimon level 3, play cost 3, DP 1000; forms Rookie; traits/types Avian; evolution requirements {"color":"Purple","level":2,"memoryCost":0}; printed clauses: [On Play] 1 of your purple Digimon gains ＜Retaliation＞ until the end of your opponent's turn. | [On Deletion] If deleted outside of a battle, your opponent trashes 1 card in their hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-079` reviewed; applicable entries Q2321, Q2322; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, OnDeletion and actions GainKeyword, Trash, not, triggerRemovalCause; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-079", compiled)`.
- Behavioral proof: isolated file `BT13-079.test.ts` passed 3 tests in its own Vitest process. Observable cases: grants Retaliation to one purple Digimon until the opponent's turn ends; lets the opponent trash a card when this card is deleted outside battle; trashes an opposing hand card when deleted outside battle. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-080 — ProtoGizmon — 10/10

- Catalog evidence: Purple Digimon level 3, play cost 3, DP 3000; forms Rookie; traits/types Unknown; evolution requirements none; printed clauses: When you would play this card, by deleting 1 of your level 2 Digimon in the breeding area, reduce the play cost by 2. [On Play] ＜Draw 1＞. Then, trash 1 card in your hand. [All Turns] This Digimon can't digivolve. [On Deletion] By returning 2 cards with [Gizmon] in their names from your trash to the bottom of the deck in any order, you may play 1 [Gizmon: AT] from your trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-080` reviewed; applicable entries Q2323, Q2324, Q2325; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnPlay, AllTurns, OnDeletion and actions Replacement, deleteOwn, Draw, Trash, Restrict, PlayWithoutCost, return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-080", compiled)`.
- Behavioral proof: isolated file `BT13-080.test.ts` passed 4 tests in its own Vitest process. Observable cases: reduces its play cost by deleting a level 2 Digimon in the breeding area; draws then trashes on play and cannot digivolve; returns two Gizmon cards before optionally playing Gizmon: AT; draws one card and then trashes one card from hand on play. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-081 — Porcupamon — 10/10

- Catalog evidence: Purple Digimon level 4, play cost 4, DP 3000; forms Champion; traits/types Puppet; evolution requirements {"color":"Purple","level":3,"memoryCost":2}; printed clauses: [On Play][On Deletion] Delete 1 of your opponent's level 3 Digimon. | [End of Opponent’s Turn][Once Per Turn] ＜Draw 1＞. Then, trash 1 card in your hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-081` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, OnDeletion, EndOfOpponentsTurn and actions Delete, Draw, Trash; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-081", compiled)`.
- Behavioral proof: isolated file `BT13-081.test.ts` passed 3 tests in its own Vitest process. Observable cases: deletes one opposing level 3 Digimon on play and deletion; draws 1 then trashes 1 as an inherited once-per-turn effect; deletes an opposing level 3 Digimon when played. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-082 — Peckmon — 10/10

- Catalog evidence: Purple Digimon level 4, play cost 5, DP 5000; forms Champion; traits/types Avian; evolution requirements {"color":"Purple","level":3,"memoryCost":2}; printed clauses: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.) | [On Deletion] If deleted outside of a battle, your opponent trashes 1 card in their hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-082` reviewed; applicable entries Q2326, Q2327; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnDeletion and actions Trash, not, triggerRemovalCause; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-082", compiled)`.
- Behavioral proof: isolated file `BT13-082.test.ts` passed 3 tests in its own Vitest process. Observable cases: has Blocker; lets the opponent trash from hand when deleted outside battle; trashes an opposing hand card when deleted outside battle. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-083 — Gizmon: AT — 10/10

- Catalog evidence: Purple Digimon level 4, play cost 6, DP 6000; forms Champion; traits/types Unknown; evolution requirements none; printed clauses: When you would play this card, by deleting 1 of your level 3 Digimon, reduce the play cost by 4. [On Play] ＜Draw 2＞. Then, trash 2 cards in your hand. [All Turns] This Digimon can't digivolve. [On Deletion] By returning 2 cards with [Gizmon] in their names from your trash to the bottom of the deck in any order, you may play 1 [Gizmon: XT] from your trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-083` reviewed; applicable entries Q2328, Q2329, Q2330; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, OnPlay, AllTurns, OnDeletion and actions Replacement, deleteOwn, Draw, Trash, Restrict, PlayWithoutCost, return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-083", compiled)`.
- Behavioral proof: isolated file `BT13-083.test.ts` passed 4 tests in its own Vitest process. Observable cases: reduces play cost by deleting a level 3 Digimon; draws 2, trashes 2, and cannot digivolve; returns two Gizmon cards before optionally playing Gizmon: XT; draws two cards and trashes two cards from hand on play. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-084 — Astamon — 10/10

- Catalog evidence: Purple Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Wizard; evolution requirements {"color":"Purple","level":4,"memoryCost":3}; printed clauses: [On Play][When Digivolving] By deleting 1 of your other purple Digimon, this Digimon may digivolve into a Digimon card with [Belphemon] in its name in your hand without paying the cost. | [Opponent's Turn][Once Per Turn] When a card is trashed from your hand, you may play 1 level 4 or lower purple Digimon card from your trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-084` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, OpponentsTurn and actions Digivolve, deleteOwn, SubTrigger, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-084", compiled)`.
- Behavioral proof: isolated file `BT13-084.test.ts` passed 3 tests in its own Vitest process. Observable cases: may digivolve into a Belphemon in hand by deleting another purple Digimon; inherits a once-per-turn trash-from-hand watcher that plays a level 4 or lower purple Digimon; deletes another purple Digimon and digivolves into Belphemon from hand. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-085 — Crowmon — 10/10

- Catalog evidence: Purple Digimon level 5, play cost 7, DP 7000; forms Ultimate; traits/types Mysterious Bird; evolution requirements {"color":"Purple","level":4,"memoryCost":3}; printed clauses: [When Attacking] If you have a Tamer, this Digimon may digivolve into [Ravemon] in your trash for the digivolution cost. | [On Deletion] If deleted outside of a battle, you may play 1 level 4 or lower purple Digimon card from your trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-085` reviewed; applicable entries Q2331; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers WhenAttacking, OnDeletion and actions Digivolve, youHave, PlayWithoutCost, not, triggerRemovalCause; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-085", compiled)`.
- Behavioral proof: isolated file `BT13-085.test.ts` passed 3 tests in its own Vitest process. Observable cases: may digivolve into Ravemon from trash for the digivolution cost when attacking with a Tamer; inherits an outside-battle deletion rescue for a level 4 or lower purple Digimon; plays a level 4 or lower purple Digimon from trash when the inherited host is deleted. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-086 — Gizmon: XT — 10/10

- Catalog evidence: Purple Digimon level 5, play cost 9, DP 9000; forms Ultimate; traits/types Unknown; evolution requirements none; printed clauses: When you would play this card, by deleting 1 of your level 4 Digimon, reduce the play cost by 6. ＜Blocker＞ [On Play] Play 1 [Akihiro Kurata] from your trash without paying the cost. [All Turns] This Digimon can't digivolve. [On Deletion] You may play 1 [ProtoGizmon] from your trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-086` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, AllTurns, OnDeletion and actions Replacement, deleteOwn, GainKeyword, PlayWithoutCost, Restrict; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-086", compiled)`.
- Behavioral proof: isolated file `BT13-086.test.ts` passed 2 tests in its own Vitest process. Observable cases: matches the printed cost reduction and play effects; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-087 — Dynasmon — 10/10

- Catalog evidence: Purple Digimon level 6, play cost 10, DP 11000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Purple","level":5,"memoryCost":3}; printed clauses: [On Play][When Digivolving] Reveal the top 4 cards of your deck. Add 2 cards with [Lucemon] in their names or the [Royal Knight] trait among them to the hand. Trash the rest. [Your Turn] When you play another Digimon with [Lucemon] in its name or the [Royal Knight] trait, delete all of your opponent's level 4 or lower Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-087` reviewed; applicable entries Q2332, Q2333; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, YourTurn and actions RevealAdd, SubTrigger, Delete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-087", compiled)`.
- Behavioral proof: isolated file `BT13-087.test.ts` passed 3 tests in its own Vitest process. Observable cases: reveals four and adds up to two Lucemon/Royal Knight cards, trashing the rest; deletes all opposing level 4 or lower Digimon when another matching Digimon is played; deletes opposing level 4 Digimon when a Royal Knight is played. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-088 — Belphemon: Sleep Mode — 10/10

- Catalog evidence: Purple Digimon level 6, play cost 11, DP 11000; forms Mega; traits/types Demon Lord, Seven Great Demon Lords; evolution requirements {"color":"Purple","level":5,"memoryCost":3}; printed clauses: Digivolve: 1 from [Belphemon: Rage Mode][On Play][When Digivolving] By placing 1 [Belphemon: Rage Mode] from your trash as this Digimon's top digivolution card, until the end of your opponent's turn, this Digimon can't attack and isn't affected by your opponent's effects. [Opponent's Turn][Once Per Turn] When an opponent's Digimon attacks, by trashing 2 cards in your hand, end the attack..
- Knowledge base: `node tools/kb/query.mjs card BT13-088` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, OpponentsTurn and actions Restrict, place, GrantImmunity, ifThisEffectActed, SubTrigger, RedirectAttack, trash; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-088", compiled)`.
- Behavioral proof: isolated file `BT13-088.test.ts` passed 3 tests in its own Vitest process. Observable cases: requires placing Belphemon: Rage Mode from trash before restricting attacks and granting immunity; ends an opponent's attack by trashing two cards from hand once per opponent turn; places Rage Mode from trash before granting the play restrictions. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-089 — Ravemon — 10/10

- Catalog evidence: Purple Digimon level 6, play cost 12, DP 12000; forms Mega; traits/types Cyborg; evolution requirements {"color":"Purple","level":5,"memoryCost":4}; printed clauses: [End of Your Turn] By deleting this Digimon that has a digivolution card with [Bird] or [Avian] in one of its traits, at the end of your opponent's turn, you may play 1 [Ravemon] from your trash without paying the cost. [On Deletion] You may play 1 [Falcomon] or [Keenan Crier] from your hand or trash without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-089` reviewed; applicable entries Q2334, Q2335; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers EndOfYourTurn, OnDeletion and actions PlayWithoutCost, deleteOwn, selfDigivolutionStackHasTrait; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-089", compiled)`.
- Behavioral proof: isolated file `BT13-089.test.ts` passed 3 tests in its own Vitest process. Observable cases: matches the delayed and deletion play clauses; only plays Ravemon after deleting a Ravemon with a Bird or Avian stack card; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-090 — LordKnightmon — 10/10

- Catalog evidence: Purple Digimon level 6, play cost 12, DP 11000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Purple","level":5,"memoryCost":3}; printed clauses: [On Play][When Digivolving] You may return 1 card with [Lucemon] in its name or the [Royal Knight] trait from your trash to the hand. [Opponent's Turn][Once Per Turn] When an opponent's Digimon attacks, gain 1 memory for each of your Digimon with the [Royal Knight] trait..
- Knowledge base: `node tools/kb/query.mjs card BT13-090` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving, OpponentsTurn and actions Return, SubTrigger, GainMemory; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-090", compiled)`.
- Behavioral proof: isolated file `BT13-090.test.ts` passed 3 tests in its own Vitest process. Observable cases: may return one Lucemon-named or Royal Knight card from trash on play and digivolving; gains 1 memory per Royal Knight Digimon when an opponent's Digimon attacks; returns a Lucemon or Royal Knight card from trash on play. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-091 — Belphemon: Rage Mode — 10/10

- Catalog evidence: Purple Digimon level 6, play cost 14, DP 14000; forms Mega; traits/types Demon Lord, Seven Great Demon Lords; evolution requirements {"color":"Purple","level":5,"memoryCost":6}; printed clauses: [Start of Your Main Phase] Delete all of your opponent's level 5 or lower Digimon. Then, if you have 6 or fewer cards in your hand, this Digimon gets +3000 DP and gains ＜Security Attack +1＞ for the turn.[End of Attack][Once Per Turn] By deleting 1 of your other Digimon, unsuspend this Digimon. | [End of Opponent’s Turn] If this Digimon is [Belphemon: Sleep Mode], trash the top card of this Digimon..
- Knowledge base: `node tools/kb/query.mjs card BT13-091` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers StartOfYourMainPhase, EndOfAttack, EndOfOpponentsTurn and actions Delete, ModifyDP, zoneCount, GainKeyword, Unsuspend, deleteOwn, Trash, selfHasName; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-091", compiled)`.
- Behavioral proof: isolated file `BT13-091.test.ts` passed 4 tests in its own Vitest process. Observable cases: deletes all opposing level 5 or lower Digimon at the start of the main phase; conditionally grants +3000 DP and Security Attack +1 with 6 or fewer hand cards; unsuspends once per turn by deleting another Digimon; deletes an opposing level 5 Digimon at the start of the main phase. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-092 — Ravemon: Burst Mode — 10/10

- Catalog evidence: Purple Digimon level 7, play cost 15, DP 15000; forms Mega; traits/types Cyborg; evolution requirements {"color":"Purple","level":6,"memoryCost":5}; printed clauses: Burst Digivolve: 0 from [Ravemon] by returning 1 [Keenan Crier] to handAt the end of the burst digivolution turn, trash this Digimon’s top card[When Digivolving] Search your opponent's hand, and trash 1 card among it. Then, if they have 7 or fewer cards in their hand, they add the top card of their security stack to the hand. [When Attacking] By returning 1 Digimon card from your opponent's trash to the bottom of the deck, delete all of your opponent's Digimon with the same name as that card..
- Knowledge base: `node tools/kb/query.mjs card BT13-092` reviewed; applicable entries Q2335, Q2336, Q2337, Q2338, Q2339; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, EndOfYourTurn, WhenDigivolving, WhenAttacking and actions Digivolve, Return, TrashDigivolution, Trash, SecurityManipulation, zoneCount, Delete, return; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-092", compiled)`.
- Behavioral proof: isolated file `BT13-092.test.ts` passed 2 tests in its own Vitest process. Observable cases: matches burst timing and the two When Digivolving clauses; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-093 — Omekamon — 10/10

- Catalog evidence: White Digimon level 4, play cost 4, DP 4000; forms Champion; traits/types Puppet, X Antibody; evolution requirements none; printed clauses: [On Play] ＜Draw 1＞ (Draw 1 card from your deck.) [On Deletion] Place 1 Digimon card with the [Royal Knight] trait from your hand as the bottom digivolution card of one of your [King Drasil_7D6] in the breeding area..
- Knowledge base: `node tools/kb/query.mjs card BT13-093` reviewed; applicable entries Q2340; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, OnDeletion and actions Draw, PlaceUnder; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-093", compiled)`.
- Behavioral proof: isolated file `BT13-093.test.ts` passed 2 tests in its own Vitest process. Observable cases: draws on play and optionally places a Royal Knight from hand under a breeding-area King Drasil; draws a card through the live on-play effect. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-094 — Kristy Damon — 10/10

- Catalog evidence: Red Tamer level n/a, play cost 3, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Start of Your Main Phase] If you have a Digimon with [Avian] or [Bird] in one of its traits, gain 1 memory. [On Play] 1 of your Digimon gains "[On Deletion] You may play 1 [Biyomon] from your hand or trash without paying the cost" until the end of your opponent's turn. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-094` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers StartOfYourMainPhase, OnPlay, Security and actions GainMemory, youHave, GrantAuraToOpponents, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-094", compiled)`.
- Behavioral proof: isolated file `BT13-094.test.ts` passed 3 tests in its own Vitest process. Observable cases: registers the exact Biyomon deletion grant in the public effect library; matches Kristy Damon's printed phase, aura, and security effects; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-095 — Marcus Damon — 10/10

- Catalog evidence: Red/Yellow Tamer level n/a, play cost 5, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Start of Your Turn] If you have 2 or fewer memory, set it to 3.[On Play] You may suspend this Tamer.[All Turns] When this Tamer becomes suspended, 1 of your opponent's Digimon gets -3000 DP for the turn. Then, if you have a Digimon with [Agumon] or [Greymon] in its name, gain 1 memory. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-095` reviewed; applicable entries Q2341; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers StartOfYourTurn, OnPlay, AllTurns, Security and actions SetMemory, memoryAtMost, Suspend, SubTrigger, ModifyDP, GainMemory, youHave, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-095", compiled)`.
- Behavioral proof: isolated file `BT13-095.test.ts` passed 4 tests in its own Vitest process. Observable cases: sets memory to 3 at the start of turn when memory is 2 or less; suspends optionally on play; keeps the DP loss and conditional memory gain inside the suspension watcher; suspends on play and weakens an opposing Digimon. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-096 — Homer Yushima — 10/10

- Catalog evidence: Blue Tamer level n/a, play cost 3, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [On Play] You may play 1 blue level 3 Digimon card from 1 of your Digimon's digivolution cards without paying the cost. [All Turns] When you play a blue Digimon, by suspending this Tamer, you may place 1 blue level 4 or lower Digimon card as that Digimon's bottom digivolution card. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-096` reviewed; applicable entries Q2342; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, AllTurns, Security and actions PlayWithoutCost, SubTrigger, PlaceUnder, suspend; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-096", compiled)`.
- Behavioral proof: isolated file `BT13-096.test.ts` passed 3 tests in its own Vitest process. Observable cases: may play a blue level 3 Digimon from a digivolution card on play; places a blue level 4 or lower Digimon from hand under the played Digimon; plays a blue level 3 from its digivolution cards on play. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-097 — Thomas H. Norstein — 10/10

- Catalog evidence: Blue Tamer level n/a, play cost 4, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Start of Your Turn] If you have 2 or fewer memory, set it to 3.[Your Turn] When one of your Digimon with [Gaomon] or [GaoGamon] in its name attacks, by suspending this Tamer, both players draw 1 card from their decks. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-097` reviewed; applicable entries Q2344; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers StartOfYourTurn, YourTurn, Security and actions SetMemory, memoryAtMost, SubTrigger, Draw, suspend, ifThisEffectActed, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-097", compiled)`.
- Behavioral proof: isolated file `BT13-097.test.ts` passed 5 tests in its own Vitest process. Observable cases: sets memory to 3 at the start of turn when memory is 2 or less; draws for both players after a matching Digimon attacks, paying by suspending this Tamer; sets memory to three at the start of turn when below the threshold; suspends the Tamer and draws for both players when the cost is accepted; stays unsuspended and neither player draws when the suspend cost is declined. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-098 — Richard Sampson — 10/10

- Catalog evidence: Yellow Tamer level n/a, play cost 3, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: When an effect trashes this card from the security stack, you may play this card without paying the cost. [Start of Your Main Phase] If there're 6 or fewer total cards in both players' security stacks, gain 1 memory.[Main] If there're 6 or fewer total cards in both players' security stacks, by suspending this Tamer, 1 of your [Kudamon] may digivolve into [Kentaurosmon] in the hand for the digivolution cost, ignoring its level. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-098` reviewed; applicable entries Q2345, Q2346; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDiscardSecurity, StartOfYourMainPhase, Main, Security and actions PlayWithoutCost, GainMemory, totalSecurityCount, Digivolve, suspend; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-098", compiled)`.
- Behavioral proof: isolated file `BT13-098.test.ts` passed 3 tests in its own Vitest process. Observable cases: plays itself when an effect directly trashes it from security; uses the total security count for both memory and Main conditions; gains memory at the start of the main phase when total security is six or less. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-099 — Spencer Damon — 10/10

- Catalog evidence: Yellow Tamer level n/a, play cost 3, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [All Turns][Once Per Turn] When one of your yellow Digimon becomes suspended, 1 of your opponent's Digimon gets -1000 DP until the end of your opponent's turn.[End of Your Turn][Once Per Turn] If there're 6 or fewer total cards in both players' security stacks, until the end of your opponent's turn, this Tamer is also treated as a 3000 DP Digimon, can't digivolve, and gains ＜Blocker＞. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-099` reviewed; applicable entries Q2347, Q5998, Q5999, Q6000, Q6001, Q6002, Q6003; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers AllTurns, EndOfYourTurn, Security and actions SubTrigger, ModifyDP, GrantStatic, SetBaseDP, totalSecurityCount, Restrict, GainKeyword, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-099", compiled)`.
- Behavioral proof: isolated file `BT13-099.test.ts` passed 3 tests in its own Vitest process. Observable cases: debuffs one opposing Digimon when one of your yellow Digimon becomes suspended; becomes a 3000 DP Blocker Digimon through the opponent's turn at six or fewer total security; becomes a live 3000 DP Blocker when the end-of-turn condition is met. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-100 — Yoshino Fujieda — 10/10

- Catalog evidence: Green Tamer level n/a, play cost 4, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Start of Your Turn] If you have 2 or fewer memory, set it to 3.[Your Turn] When one of your Digimon digivolves into a Digimon with [Vegetation], [Plant], or [Fairy] in one of its traits, by suspending this Tamer, gain 1 memory. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-100` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers StartOfYourTurn, YourTurn, Security and actions SetMemory, memoryAtMost, SubTrigger, GainMemory, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-100", compiled)`.
- Behavioral proof: isolated file `BT13-100.test.ts` passed 2 tests in its own Vitest process. Observable cases: matches Yoshino Fujieda's turn and security effects; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-101 — Miki Kurosaki & Megumi Shirakawa — 10/10

- Catalog evidence: Black/Yellow Tamer level n/a, play cost 4, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [On Play] You may play 1 Digimon card with [PawnChessmon] in its name from your hand without paying the cost. [All Turns] When you play a 2-color black and yellow Digimon, by suspending this Tamer, ＜Draw 1＞ and gain 1 memory. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-101` reviewed; applicable entries Q2348, Q2349; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, AllTurns, Security and actions PlayWithoutCost, SubTrigger, Draw, suspend, GainMemory, ifThisEffectActed; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-101", compiled)`.
- Behavioral proof: isolated file `BT13-101.test.ts` passed 3 tests in its own Vitest process. Observable cases: may play a PawnChessmon from hand without paying; requires a two-color black/yellow Digimon and suspending this Tamer before draw and memory; plays PawnChessmon from hand through its on-play effect. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-102 — Keenan Crier — 10/10

- Catalog evidence: Purple Tamer level n/a, play cost 3, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [On Play] Your opponent may trash 1 Tamer card or Option card in their hand. If they don't, gain 1 memory and ＜Draw 1＞. [Opponent's Turn] When an effect plays a Digimon, by suspending this Tamer, gain 1 memory. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-102` reviewed; applicable entries Q2350, Q2351, Q2352; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, OpponentsTurn, Security and actions Trash, GainMemory, opponentDeclinedTrash, Draw, SubTrigger, suspend, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-102", compiled)`.
- Behavioral proof: isolated file `BT13-102.test.ts` passed 3 tests in its own Vitest process. Observable cases: offers the opponent a Tamer/Option hand trash, then rewards a decline; reacts to effect-played Digimon on the opponent's turn by suspending for memory; trashes an opposing Tamer through the optional hand choice. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-103 — Akihiro Kurata — 10/10

- Catalog evidence: Purple Tamer level n/a, play cost 3, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Your Turn] When a card with [Belphemon] in its name would be played, by deleting 1 of your Digimon with [Gizmon] in its name, reduce the play cost by the play cost of the deleted Digimon. [End of Opponent’s Turn][Once Per Turn] ＜Draw 1＞ and trash 1 card in your hand. Then, by placing this Tamer as the bottom digivolution card of 1 of your Digimon with [Belphemon] in its name, delete 1 of your opponent's level 6 Digimon. | [Security] Play this card without paying the cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-103` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers YourTurn, EndOfOpponentsTurn, Security and actions Replacement, CostModifier, deleteOwn, Draw, Trash, Delete, place, PlayWithoutCost; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-103", compiled)`.
- Behavioral proof: isolated file `BT13-103.test.ts` passed 3 tests in its own Vitest process. Observable cases: reduces a Belphemon play by deleting a Gizmon Digimon for its play cost; draws and trashes, then optionally places this Tamer under a Belphemon to delete an opposing level 6; draws and trashes at the end of the opponent's turn. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-104 — Final Shining Burst — 10/10

- Catalog evidence: Red/Yellow Option level n/a, play cost 8, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Main] 1 of your opponent's Digimon gets -12000 DP until the end of your opponent's turn. Then, you may play 1 [Marcus Damon] from your hand without paying the cost. | [Security] Activate this card's [Main] effect..
- Knowledge base: `node tools/kb/query.mjs card BT13-104` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, Security and actions ModifyDP, PlayWithoutCost, ActivateMain; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-104", compiled)`.
- Behavioral proof: isolated file `BT13-104.test.ts` passed 4 tests in its own Vitest process. Observable cases: reduces one opposing Digimon by 12000 through the opponent's turn, then may play Marcus Damon; activates its Main effect in security; reduces an opposing Digimon and plays Marcus Damon from hand without paying; activates the same Main effect when revealed from security. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-105 — Full Moon Meteor Impact — 10/10

- Catalog evidence: Blue Option level n/a, play cost 8, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Main] Return 1 of your opponent's Digimon to the hand. Then, gain 1 memory for every 4 cards in your opponent's hand. | [Security] Return 1 of your opponent's Digimon to the hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-105` reviewed; applicable entries Q2353; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, Security and actions Return, GainMemory; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-105", compiled)`.
- Behavioral proof: isolated file `BT13-105.test.ts` passed 4 tests in its own Vitest process. Observable cases: returns one opposing Digimon, then gains one memory per four cards in the opponent's hand; returns one opposing Digimon from security; returns an opposing Digimon and gains one memory for every four opposing hand cards; returns an opposing Digimon without the Main memory gain from security. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-106 — Odin's Breath — 10/10

- Catalog evidence: Yellow Option level n/a, play cost 5, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: When an effect trashes this card from the security stack, activate this card's [Main] effect.[Main] 1 of your opponent's Digimon gets -3000 DP until the end of your opponent's turn. Then, if there're 6 or fewer total cards in both players' security stacks, all of your opponent's Digimon gain ＜Security Attack -1＞ until the end of your opponent's turn. | [Security] Activate this card's [Main] effect..
- Knowledge base: `node tools/kb/query.mjs card BT13-106` reviewed; applicable entries Q2354, Q2355, Q2356; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnDiscardSecurity, Main, Security and actions ActivateMain, ModifyDP, GainKeyword, totalSecurityCount; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-106", compiled)`.
- Behavioral proof: isolated file `BT13-106.test.ts` passed 4 tests in its own Vitest process. Observable cases: activates Main when directly trashed from security by an effect; reduces one opposing Digimon and conditionally grants Security Attack -1 to all opposing Digimon; applies the DP reduction and Security Attack -1 to every opposing Digimon at six total security; activates Main when an effect directly trashes it from security. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-107 — Vulcan Crusher — 10/10

- Catalog evidence: Green Option level n/a, play cost 4, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Main] Choose 1 of your Digimon. Return 1 of your opponent's suspended Digimon with DP less than or equal to that Digimon to the hand. Then, by returning the top card of one of your [Leopardmon: Leopard Mode] to the hand, unsuspend all of your Digimon. | [Security] Suspend 1 of your opponent's Digimon. Then, add this card to the hand..
- Knowledge base: `node tools/kb/query.mjs card BT13-107` reviewed; applicable entries Q2359, Q2360; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, Security and actions Return, dpOfChosen, Unsuspend, return, Suspend, AddToHandSelf; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-107", compiled)`.
- Behavioral proof: isolated file `BT13-107.test.ts` passed 3 tests in its own Vitest process. Observable cases: returns one suspended opposing Digimon whose DP is at most the chosen own Digimon's DP; requires returning a Leopardmon: Leopard Mode top card before unsuspending all own Digimon; suspends an opposing Digimon and returns itself when revealed in security. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-108 — Waltz's End — 10/10

- Catalog evidence: Black Option level n/a, play cost 6, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Main] Until the end of your opponent's turn, 1 of your Digimon gains "[Opponent's Turn] When this Digimon becomes suspended, delete all of your opponent's Digimon with a play cost less than or equal to this Digimon's" and "[Opponent's Turn] This Digimon isn't affected by your opponent's Option cards." | [Security] Delete 1 of your opponent's Digimon with the lowest play cost..
- Knowledge base: `node tools/kb/query.mjs card BT13-108` reviewed; applicable entries Q2361, Q2362; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, Security and actions GrantAuraToOpponents, Delete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-108", compiled)`.
- Behavioral proof: isolated file `BT13-108.test.ts` passed 2 tests in its own Vitest process. Observable cases: grants the two opponent-turn effects and keeps the security deletion; loads the compiled implementation into a live permanent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-109 — Gift of Darkness — 10/10

- Catalog evidence: Purple Option level n/a, play cost 6, DP 0; forms none; traits/types none; evolution requirements none; printed clauses: [Main] Delete 1 of your opponent's level 6 or higher Digimon. Then, 1 of your Digimon may digivolve into [Belphemon: Sleep Mode] from your trash without paying the cost. | [Security] By trashing 1 Digimon card in your hand, delete 1 of your opponent's Digimon whose level is less than or equal to the trashed card..
- Knowledge base: `node tools/kb/query.mjs card BT13-109` reviewed; applicable entries Q2363; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, Security and actions Delete, Digivolve, trash; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-109", compiled)`.
- Behavioral proof: isolated file `BT13-109.test.ts` passed 5 tests in its own Vitest process. Observable cases: has complete compiled coverage and no residual gaps; bounds the security deletion by the level of the trashed hand card; loads the compiled implementation into a live permanent; digivolves a legal level 5 purple Digimon into Sleep Mode from trash for free; rejects a level 4 base because the effect does not ignore requirements. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-110 — Royal Knights of the Purge — 10/10

- Catalog evidence: White Option level n/a, play cost 6, DP 0; forms none; traits/types Royal Knight; evolution requirements none; printed clauses: [Main] ＜Draw 1＞. You may place 1 Digimon card from your hand as the bottom digivolution card of 1 of your [King Drasil_7D6] in the breeding area. Then, place this card in the battle area. [Main] ＜Delay＞ ・ Play 1 [Royal Knight] trait card from the digivolution cards of your Digimon in the breeding area without paying the cost. [On Play] effects on Digimon played by this effect don't activate, and they gain ＜Rush＞ for the turn. | [Security] Place this card in the battle area..
- Knowledge base: `node tools/kb/query.mjs card BT13-110` reviewed; no card-specific entries; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Main, Security and actions Draw, PlaceUnder, PlaceInBattleAreaSelf, PlayWithoutCost, GainKeyword; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-110", compiled)`.
- Behavioral proof: isolated file `BT13-110.test.ts` passed 7 tests in its own Vitest process. Observable cases: has complete compiled coverage and registers a live Option; draws, may place a Digimon from hand under a breeding-area King Drasil, then places itself; has a Delay branch that plays one Royal Knight from breeding digivolution cards with Rush; draws, places any Digimon under a breeding King Drasil, and enters the battle area; may decline placing a Digimon under King Drasil while still placing itself; uses Delay to play a Royal Knight from breeding materials without its On Play effect and grants Rush; places itself in the battle area when revealed from security. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-111 — Gallantmon — 10/10

- Catalog evidence: Red Digimon level 6, play cost 13, DP 13000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Red","level":5,"memoryCost":5}; printed clauses: When you would play this card from the hand, if you have no Digimon, reduce the play cost by 2 for every 5 total cards in both players' trashes.＜Rush＞ (This Digimon can attack the turn it was played.) [On Play][When Digivolving][When Attacking] Delete 1 of your opponent's Digimon with 6000 DP or less. If no opponent's Digimon was deleted by this effect, delete 1 of their Digimon with 13000 DP or more..
- Knowledge base: `node tools/kb/query.mjs card BT13-111` reviewed; applicable entries Q2364, Q2365; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers Static, BeforePayCost, OnPlay, WhenDigivolving, WhenAttacking and actions GainKeyword, Replacement, youHaveNone, Delete, ifThisEffectDidNotDelete; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-111", compiled)`.
- Behavioral proof: isolated file `BT13-111.test.ts` passed 7 tests in its own Vitest process. Observable cases: plays for the combined-trash reduction only while its controller has no Digimon; reduces play cost by two for every five cards in both trash when no Digimon is present; has Rush and the fallback delete when no level 6-or-lower target was deleted; deletes a 6000 DP-or-less Digimon and skips the 13000 DP fallback; uses the 13000 DP-or-more fallback only when the first deletion found no target; fires the same ordered deletion effect when digivolving from a legal level-5 red Digimon; fires the deletion effect when attacking the opponent. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## BT13-112 — Omnimon — 10/10

- Catalog evidence: White Digimon level 7, play cost 14, DP 14000; forms Mega; traits/types Holy Warrior, Royal Knight; evolution requirements {"color":"Red","level":6,"memoryCost":4}; {"color":"Blue","level":6,"memoryCost":4}; printed clauses: [On Play][When Digivolving] You may delete 1 of your opponent's Digimon, or play 1 of each Digimon with the [Royal Knight] trait and different names from the digivolution cards of your Digimon in the breeding area without paying the costs. When a Digimon is played by this effect, trash your Digimon in the breeding area, and all your Digimon gain ＜Rush＞ for the turn..
- Knowledge base: `node tools/kb/query.mjs card BT13-112` reviewed; applicable entries Q2366, Q2367, Q2368, Q2369; no unresolved ambiguity remains.
- Implementation and primitive trace: direct module has triggers OnPlay, WhenDigivolving and actions Modal, Delete, PlayWithoutCost, bindingExists, GainKeyword; each action was traced through the shared interpreter dispatch, target/filter resolution, cost/choice handling, zone movement, duration/use ledger, and relevant combat/evolution/event primitive. Coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("BT13-112", compiled)`.
- Behavioral proof: isolated file `BT13-112.test.ts` passed 6 tests in its own Vitest process. Observable cases: has complete compiled coverage and no residual gaps; loads the compiled implementation into a live permanent; offers the printed modal choice and can delete any opposing Digimon; plays one of each distinct Royal Knight name from breeding, then trashes the breeding Digimon and grants Rush; allows declining the optional modal effect; fires the same modal when legally digivolving from a level-6 red Digimon. Peer modules explicitly imported by the suite and realistic stacks/trait boundaries were reviewed where applicable.
- Revalidation result: 10/10; no remaining card-specific queue.

## Collection-wide recalculation — 112/112 (100%) at 10/10

- Registration: all 112 executable modules register exclusively through `registerIrCard(cardId, compiled)`; no BT13 module contains `registerCard`.
- Coverage: every card has `coverage: "full"`, an empty residual list, current catalog/KB evidence, direct primitive tracing, and an isolated focused suite recorded above.
- Corrections found during revalidation: BT13-006 now honors Q2258 by allowing its discard cost without a deletion target; the shared play-cost seam now resolves top-card breeding-area reducers such as BT13-007; BT13-010 and BT13-104 isolated tests explicitly register the peer modules whose triggered behavior they assert.
- Focused verification: all 112 card files passed in ascending order as separate Vitest processes; affected seams (`BT13-006`, `BT13-007`, and peer `EX6-006`) passed 10 tests.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/BT13` passed 112 files and 309 tests.
- Workspace gates: `pnpm typecheck` passed; `pnpm lint` exited successfully with repository warnings only; `pnpm format:check` passed across 9,924 files; `git diff --check` passed.
- Remaining queue: none.
