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
## BT13-008 — Agumon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-009 — Huckmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-010 — Biyomon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-011 — Aquilamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-012 — GeoGreymon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-013 — BaoHuckmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-014 — Garudamon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-015 — RizeGreymon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

## BT13-016 — SaviorHuckmon — Pending

- Status: Pending independent card-by-card revalidation. Prior batch structural and test evidence is input only and does not establish a score.

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
