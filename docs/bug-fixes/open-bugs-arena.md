# Open bug issues: fixes and playable verification

Branch: `fix/open-bugs-arena`. Base: **local `main` at `048d15c3b`**, version `1.10.2-beta`.

Scope: all 34 open issues labeled `bug` read on 2026-10-05. Nine issues received new fixes, 22 already behave correctly on the local main, two describe expected rules, and one remains unconfirmed. Added 23 arena layouts; the complete issue reproduction registry contains 46 layouts. No deployment, issue closure, external comment or commit was performed.

Preview: API on `http://localhost:3567`, web on `http://localhost:5177`. These are local links to this worktree, not production links. Arena notes provide the action sequence and expected result in Portuguese and English.

## New fixes

| Issue                                                                  | Finding / resulting behavior                                                                                                                 | Playable scenario                                                                                                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#4964](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4964) | Burst Mode only offers its controller's Tamers in hand.                                                                                      | [http://localhost:5177/dev/arena?scenario=arena-issue-4964-burst-own-tamer](http://localhost:5177/dev/arena?scenario=arena-issue-4964-burst-own-tamer)                         |
| [#4958](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4958) | Card art falls back to the official PNG after the mirror candidates fail.                                                                    | [http://localhost:5177/dev/arena?scenario=arena-issue-4958-card-images](http://localhost:5177/dev/arena?scenario=arena-issue-4958-card-images)                                 |
| [#4953](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4953) | Nokia reacts to qualifying hand warp digivolutions and reduces their cost by 1.                                                              | [http://localhost:5177/dev/arena?scenario=arena-issue-4953-nokia-warp-reduction](http://localhost:5177/dev/arena?scenario=arena-issue-4953-nokia-warp-reduction)               |
| [#4949](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4949) | Paladin compares digivolution-card counts for its effect battle without acquiring Ice Clad.                                                  | [http://localhost:5177/dev/arena?scenario=arena-issue-4949-paladin-battle-comparison](http://localhost:5177/dev/arena?scenario=arena-issue-4949-paladin-battle-comparison)     |
| [#4948](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4948) | Paid, effect and Blast digivolution use the current rewritten name and colors; client cost choices agree.                                    | [http://localhost:5177/dev/arena?scenario=arena-issue-4948-sukamon-blast-legality](http://localhost:5177/dev/arena?scenario=arena-issue-4948-sukamon-blast-legality)           |
| [#4946](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4946) | Assembly places materials in printed slot order even when the player selects them in reverse order; effect Assembly uses the same ordering.  | [http://localhost:5177/dev/arena?scenario=arena-issue-4946-slayerdramon-assembly-order](http://localhost:5177/dev/arena?scenario=arena-issue-4946-slayerdramon-assembly-order) |
| [#4943](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4943) | React removals, insertions and text updates survive translator FONT replacements within the application root.                                | [http://localhost:5177/dev/arena?scenario=arena-issue-4943-browser-translation](http://localhost:5177/dev/arena?scenario=arena-issue-4943-browser-translation)                 |
| [#4940](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4940) | Lilithmon only prevents deletion after an actual successful deletion cost. Saving the chosen cost Digimon with Detach does not pay the cost. | [http://localhost:5177/dev/arena?scenario=arena-issue-4940-lilithmon-delete-cost](http://localhost:5177/dev/arena?scenario=arena-issue-4940-lilithmon-delete-cost)             |
| [#4928](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4928) | Covered by the same independent image fallback as #4958.                                                                                     | [http://localhost:5177/dev/arena?scenario=arena-issue-4958-card-images](http://localhost:5177/dev/arena?scenario=arena-issue-4958-card-images)                                 |

## Already working on local main; verified

| Issue                                                                  | Finding / resulting behavior                                                                                       | Playable scenario                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#4962](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4962) | EX12 Assembly works, including the exact Hakubamon effect-play route (cost 5).                                     | [http://localhost:5177/dev/arena?scenario=arena-issue-4962-seiten-ex12-assembly](http://localhost:5177/dev/arena?scenario=arena-issue-4962-seiten-ex12-assembly)                                                                                                                                                                                       |
| [#4961](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4961) | Takato suspends, and an eligible Gallantmon can declare its Raid attack.                                           | [http://localhost:5177/dev/arena?scenario=arena-issue-4961-takato-raid-attack](http://localhost:5177/dev/arena?scenario=arena-issue-4961-takato-raid-attack)                                                                                                                                                                                           |
| [#4957](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4957) | Gankoomon can use the DUAL Option side from its digivolution cards.                                                | [http://localhost:5177/dev/arena?scenario=arena-issue-4957-gankoomon-dual-sources](http://localhost:5177/dev/arena?scenario=arena-issue-4957-gankoomon-dual-sources)                                                                                                                                                                                   |
| [#4955](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4955) | Minervamon continues to De-Digivolve after the optional preceding action is declined.                              | [http://localhost:5177/dev/arena?scenario=arena-issue-4955-minervamon-dedigivolve](http://localhost:5177/dev/arena?scenario=arena-issue-4955-minervamon-dedigivolve)                                                                                                                                                                                   |
| [#4954](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4954) | AD1-018 catalog and inspector match the official text, including Security.                                         | [http://localhost:5177/dev/arena?scenario=arena-issue-4954-lordknightmon-inspector](http://localhost:5177/dev/arena?scenario=arena-issue-4954-lordknightmon-inspector)                                                                                                                                                                                 |
| [#4952](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4952) | Moving the stack from breeding through the public intent grants DP and Piercing.                                   | [http://localhost:5177/dev/arena?scenario=arena-issue-4952-kotemon-piercing](http://localhost:5177/dev/arena?scenario=arena-issue-4952-kotemon-piercing)                                                                                                                                                                                               |
| [#4951](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4951) | GrandisKuwagamon inherited Piercing resolves without an effect loop.                                               | [http://localhost:5177/dev/arena?scenario=arena-issue-4951-okuwamon-inherited](http://localhost:5177/dev/arena?scenario=arena-issue-4951-okuwamon-inherited)                                                                                                                                                                                           |
| [#4950](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4950) | Davis & Ken trash the required three digivolution cards.                                                           | [http://localhost:5177/dev/arena?scenario=arena-issue-4950-davis-ken-dna-sources](http://localhost:5177/dev/arena?scenario=arena-issue-4950-davis-ken-dna-sources)                                                                                                                                                                                     |
| [#4947](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4947) | Dragon Mode reacts to the opponent's Physical Training digivolution and evolves into Fighter Mode.                 | [http://localhost:5177/dev/arena?scenario=arena-issue-4947-physical-training-reaction](http://localhost:5177/dev/arena?scenario=arena-issue-4947-physical-training-reaction)                                                                                                                                                                           |
| [#4942](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4942) | Jesmon gains the two Alliance effects and resolves its digivolution/attack play effects.                           | [http://localhost:5177/dev/arena?scenario=arena-issue-4942-jesmon-double-alliance](http://localhost:5177/dev/arena?scenario=arena-issue-4942-jesmon-double-alliance)                                                                                                                                                                                   |
| [#4941](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4941) | Candlemon on top cannot activate its inherited deletion prevention.                                                | [http://localhost:5177/dev/arena?scenario=arena-issue-4941-candlemon-top-inheritance](http://localhost:5177/dev/arena?scenario=arena-issue-4941-candlemon-top-inheritance)                                                                                                                                                                             |
| [#4937](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4937) | Both Grademon versions allow effects from a DUAL card used as an Option.                                           | [http://localhost:5177/dev/arena?scenario=arena-issue-4937-grademon-dual-immunity](http://localhost:5177/dev/arena?scenario=arena-issue-4937-grademon-dual-immunity)<br>[http://localhost:5177/dev/arena?scenario=arena-issue-4937-bt20-grademon-dual-immunity](http://localhost:5177/dev/arena?scenario=arena-issue-4937-bt20-grademon-dual-immunity) |
| [#4936](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4936) | Barrier can activate in the second effect battle.                                                                  | [http://localhost:5177/dev/arena?scenario=arena-issue-4936-examon-repeat-barrier](http://localhost:5177/dev/arena?scenario=arena-issue-4936-examon-repeat-barrier)                                                                                                                                                                                     |
| [#4935](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4935) | Guard resolves after the DUAL Arts digivolution.                                                                   | [http://localhost:5177/dev/arena?scenario=arena-issue-4935-blanc-arts-guard](http://localhost:5177/dev/arena?scenario=arena-issue-4935-blanc-arts-guard)                                                                                                                                                                                               |
| [#4932](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4932) | The Security DP bonus follows the current security-card count.                                                     | [http://localhost:5177/dev/arena?scenario=arena-issue-4932-kentaurosmon-security](http://localhost:5177/dev/arena?scenario=arena-issue-4932-kentaurosmon-security)                                                                                                                                                                                     |
| [#4918](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4918) | The forced attack targets a player only.                                                                           | [http://localhost:5177/dev/arena?scenario=arena-issue-4918-lordknightmon-player-attack](http://localhost:5177/dev/arena?scenario=arena-issue-4918-lordknightmon-player-attack)                                                                                                                                                                         |
| [#4917](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4917) | Biting Crush remains placed after the Demon Lord cost resolves.                                                    | [http://localhost:5177/dev/arena?scenario=arena-issue-4917-biting-crush-placement](http://localhost:5177/dev/arena?scenario=arena-issue-4917-biting-crush-placement)                                                                                                                                                                                   |
| [#4914](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4914) | Blanc used as an Option reduces DP through immunity limited to Digimon effects; its Digimon face cannot be played. | [http://localhost:5177/dev/arena?scenario=arena-issue-4914-blanc-dual-option](http://localhost:5177/dev/arena?scenario=arena-issue-4914-blanc-dual-option)                                                                                                                                                                                             |
| [#4912](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4912) | Deep Savers protection follows the relative memory position.                                                       | [http://localhost:5177/dev/arena?scenario=arena-issue-4912-deep-savers-battle](http://localhost:5177/dev/arena?scenario=arena-issue-4912-deep-savers-battle)                                                                                                                                                                                           |
| [#4911](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4911) | Multiple security checks and bot decisions finish resolving.                                                       | [http://localhost:5177/dev/arena?scenario=arena-issue-4911-mervamon-multiple-checks](http://localhost:5177/dev/arena?scenario=arena-issue-4911-mervamon-multiple-checks)                                                                                                                                                                               |
| [#4910](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4910) | A DUAL card used as an Option bypasses immunity limited to Digimon effects.                                        | [http://localhost:5177/dev/arena?scenario=arena-issue-4910-diarbbitmon-dual-option](http://localhost:5177/dev/arena?scenario=arena-issue-4910-diarbbitmon-dual-option)                                                                                                                                                                                 |
| [#4905](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4905) | ST17 Magnamon recognizes colors granted by Merciful Mode.                                                          | [http://localhost:5177/dev/arena?scenario=arena-issue-4905-magnamon-merciful-colors](http://localhost:5177/dev/arena?scenario=arena-issue-4905-magnamon-merciful-colors)                                                                                                                                                                               |

## Expected rules; verified

| Issue                                                                  | Finding / resulting behavior                                                                                                                      | Playable scenario                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#4939](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4939) | A free play can still offer an optional play-cost reduction and its processing cost; declining preserves the resources and the play remains free. | [http://localhost:5177/dev/arena?scenario=arena-issue-4939-demon-lord-free-reduction](http://localhost:5177/dev/arena?scenario=arena-issue-4939-demon-lord-free-reduction) |
| [#4921](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4921) | Homeros arriving after the End of Your Turn timing does not retroactively receive that trigger.                                                   | [http://localhost:5177/dev/arena?scenario=arena-issue-4921-homeros-late-arrival](http://localhost:5177/dev/arena?scenario=arena-issue-4921-homeros-late-arrival)           |

The free-play ruling is supported by official [EX9-030 Q4784](https://world.digimoncard.com/cards/?card_no=EX9-030&search=true). Paying an optional processing cost is allowed even when the card is played without paying its play cost.

## Unconfirmed

[#4920](https://github.com/vinicius3333/aegis-digimon-tcg/issues/4920) reports a generic match-start freeze in v1.9.1 without a match ID or identified cards. Current startup, websocket board synchronization and browser checks pass. Production logs did not establish an attributable failure. A match ID or recording is needed to identify a reproducible defect; no fix or faithful arena reproduction is claimed.

## Causes, regression evidence and sweep

- **#4964:** `PlayWithoutCost` lacked a controller constraint. Production match `b0d636ca-15d8-4763-b2af-b57b68ef38a2` offered the opponent's Tamers. The public-intent regression excludes them. The sweep found and fixed the same defect in BT4-089 Plutomon and EX5-040 Kumbhiramon. BT17-094 already constrains the child filters; EX10-012/020/035/057 only select their own referenced card.
- **#4953:** Nokia used a manual Main activation rather than reacting to a digivolution. It now uses a Main-phase Your Turn replacement, matching its printed card restrictions, hand origin, ownership, optional suspension and reduction. Existing ordinary evolution tests and new warp scenarios pass.
- **#4949:** a temporary Ice Clad grant approximated Paladin's comparison rule and leaked a keyword it does not possess. The comparison is now an explicit battle parameter. The regression checks the pending Barrier window and the final state for absence of Ice Clad, while preserving the source-count battle result. The synced IR sweep found no remaining temporary Ice Clad grants of this shape.
- **#4948:** evolution validation consulted the printed base name and colors after a rewrite. Paid, free/effect and Blast paths now use effective base properties; the client menu uses the rewritten name as well. A public KingSukamon/Chuumon sequence rejects an illegal Paladin Blast, including a forged counter intent, while preserving another legal ACE choice.
- **#4946:** Assembly used selection order for materials occupying different printed slots. Both direct and effect-play paths now map selected materials to the recipe slots before constructing the stack. Reverse-selection regressions preserve the printed top-to-bottom order. The shared engine change covers all 18 current multislotted Assembly recipes.
- **#4940:** Lilithmon executed deletion as an action and then prevented its own deletion even if Detach saved the supposed payment. A real deletion cost now gates prevention. The same sweep finding was fixed in BT2-082 Diaboromon, including removal of a redundant optional payload that could save it without payment. BT14-018 and EX10-052 have different action/condition semantics and were not changed.
- **#4958/#4928:** the mirror fallback candidates shared the same unavailable host. Added a final canonical official PNG candidate, preserving bundled token behavior. Current production images returned 200; the original outage is no longer active and its exact infrastructure cause remains unconfirmed. A browser fault-injection test aborts every mirror request and confirms the official image renders.
- **#4943:** translator DOM replacements detach Text nodes still referenced by React. Scoped replacement tracking redirects removals/insertions and mirrors later text updates to the visible wrapper. Tests cover actual React updates, ordinary DOM errors and an unrelated FONT neighbor. Chromium deterministically simulates translator mutations, changes phase and resets without page errors; the external translation service itself was not automated.

Each new defect was exercised with a targeted failing regression before its fix, then a passing regression afterwards. Official printed card images and the local rules knowledge base were checked. Production logs also identified the Hakubamon/SeitenGokuumon report in match `05ff9685-dd2a-46e3-9a17-116f582b1190`; that route already works on the chosen local-main base.

## Validation

- Initial API fix gate: **14,673 passing tests in 1,341 files**, including complete BT2, BT4, BT5, BT25, EX5, EX6 and EX13 collections, affected engine mechanisms, new player scenarios and ST17 coverage.
- Real websocket/Colyseus scenario projection: **46 passing tests**, checking the board, own hand, hidden opponent hand, trash, stacks and breeding.
- Web unit tests: **156 passing tests** for board models, translator compatibility and cards.
- Shared image fallback: **11 passing tests**.
- Chromium: **3 passing end-to-end tests** for printed inspector text, mirror failure and translator DOM mutations.
- API and web TypeScript checks passed. Changed-file lint has zero errors; existing conditional assertion style emits warnings. Formatting and `git diff --check` passed.
- Executable card behavior remains registered exclusively with `registerIrCard`. IR snapshots were synchronized for all seven affected sets. Independent read-only code review completed and its findings were addressed.

## Follow-up: all 22 remaining issues have behavioral scenarios

The 22 issues in the existing-correct-behavior group now have a dedicated suite:
`apps/api/src/engine/remainingPlayerBugScenarios.test.ts`. It contains 29 behavioral
cases across 23 playable layouts (both Grademon versions have separate layouts).
Existing cases were moved into this suite to keep each reproduction in one place.
The complete issue-by-issue preview links remain in the table above.

- Added an independent #4914 Blanc layout: evolve Diarbbitmon to grant its immunity,
  pass the turn, reject Blanc's Digimon play without consuming resources, then use
  its Option face and verify the 3000 DP reduction. A white Tamer remains as a valid
  Option color source after Diarbbitmon's earlier effect battle. Exactly one opposing
  Digimon survives that battle, supplying the printed per-Digimon DP multiplier.
  With zero Digimon, a zero DP reduction would be the expected rule.
- Added an issue-specific #4905 Magnamon layout and regression: six granted colors
  produce one six-source trash event, followed by Merciful returning to hand.
- Added #4954 behavioral coverage for the corrected printed text and six-memory
  play, plus a Chromium check of the actual hand inspector's Main and Security text.
- Strengthened #4951 to perform a real battle, finish the Piercing security check,
  and pass the turn after playing another card, confirming that the reported loop
  does not block subsequent actions.

The follow-up changes layouts, instructions and tests; no additional card behavior
fix was needed for these 22 reports.

Follow-up verification: **100 scenario tests passed**, including all **29 dedicated
behavioral cases for the 22 issues**; **46 websocket board projection tests passed**;
**3 Chromium tests passed**, including the actual #4954 inspector. API and web
TypeScript checks, changed-file formatting and lint without errors, and
`git diff --check` passed.

## Follow-up: Burst Mode displays the activated Option Main text

BT25-104's nested `ActivateMain` inherited the outer When Digivolving or When
Attacking display context, so the hand-selection prompt repeated the invoking
Digimon clause. Borrowed Main effects now carry their printed clauses and use Main
timing while resolving, restoring the outer display context afterwards. The prompt
shows the Option text: -15000 DP for the turn, followed by free play of a hand Tamer.

The public-digivolution regression failed before the fix with When Digivolving
instead of Main. It now passes, together with a public-attack regression and a
Chromium test covering optional activation, the actual hand-selection prompt and
completion. The existing scenario instructions describe the expected Option text:
[http://localhost:5177/dev/arena?scenario=arena-issue-4964-burst-own-tamer](http://localhost:5177/dev/arena?scenario=arena-issue-4964-burst-own-tamer).

Verification: 1853 tests across the complete BT25 collection and affected engine
mechanisms passed; a further focused run including the new attack regression passed
all 37 cases. All four arena Chromium tests passed. API and web TypeScript checks,
changed-file formatting and lint without errors, independent read-only review, and
`git diff --check` passed.

## Follow-up: hide Burst Digivolve when its Tamer cost is unavailable

The client matched the Burst evolution base but omitted its additional Tamer-return
cost. This offered BT25-104's cost-zero route without Marcus in play, although the
authoritative server rejected it. The UI's shared evolution-cost model now requires
the named Tamer in the viewer's battle area, matching the server's existing gate.
The same model supplies both the cost picker and the memory preview. Ordinary paid
evolution remains available. The contract is the official
[BT25-104 Burst Digivolve condition](https://world.digimoncard.com/cards/?card_no=BT25-104&search=true).

The sweep found the same client omission in all six current Burst cards: BT13-020,
BT13-033, BT13-060, BT13-092, BT25-104 and BT26-050. Parameterized tests reproduced
six failing cost-zero offers before the fix. All now pass, including opponent-only
Tamers, cards in hand/trash/breeding, wrong Tamers, suspended eligible Tamers,
Tamer removal and five Marcus printings. The server public-intent scenario also
confirms that a forged cost-zero request fails without consuming resources before
the ordinary paid evolution succeeds.

The existing arena layout has no Marcus in play. Its Chromium test confirms that
evolution proceeds for 5 without displaying the invalid cost chooser, then verifies
the Option Main selection text. Arena notes include this expectation:
[http://localhost:5177/dev/arena?scenario=arena-issue-4964-burst-own-tamer](http://localhost:5177/dev/arena?scenario=arena-issue-4964-burst-own-tamer).

Verification: all 162 board-model unit tests and four arena Chromium tests passed;
all 37 focused API cases passed. API and web TypeScript checks, changed-file
formatting and lint without errors, `git diff --check`, and independent read-only
review passed. This follow-up changes UI eligibility only; server rules and card
implementations remain unchanged.
