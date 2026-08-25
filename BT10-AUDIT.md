# BT10 Card Implementation Audit

This ledger records evidence gathered independently in ascending card ID order. A card is marked 10/10 only when its complete catalog and local knowledge-base contract maps to executable compiled IR, all directly used shared semantics have been traced, and focused observable-state tests prove the applicable boundaries.

## BT10-001 — DemiMeramon — 10/10

- Catalog evidence: red level 2 Digi-Egg; form `In-Training`, type `Flame`; inherited text is `[Your Turn] While a non-red card is in this Digimon's digivolution cards, this Digimon gets +1000 DP`; it has no main or Security effect and no evolution requirements.
- Knowledge base: Q1929 says a red multicolor source is still red and therefore does not satisfy “non-red”; no errata, restriction, or unresolved ambiguity was returned by `node tools/kb/query.mjs card BT10-001`.
- Implementation: one inherited `YourTurn` aura targets its own host, adds exactly 1000 DP, and is gated by `selfDigivolutionStackHasNonColor` for red. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT10-001", compiled)`.
- Primitive trace: the continuous-effect collector applies inherited effects from stack cards to the live host and scopes `YourTurn` to the source controller; the condition reads only that host's digivolution stack and succeeds only when a source lacks every requested color. Consequently a pure blue source matches, while a red/other-color source fails exactly as Q1929 requires.
- Cross-card and stack proof: the focused fixtures use DemiMeramon underneath realistic BT10 hosts, compare a blue source with both pure-red and red-multicolor sources, and confirm the inherited effect is absent during the opponent's turn. No peer uses this card-specific condition kind, so its direct interpreter branch and the Q1929 multicolor case are the relevant mechanism boundary.
- Behavioral proof: the focused suite proves the positive +1000 DP path, the Q1929 red-multicolor negative, the all-red negative, and turn ownership through observable `currentDP` versus `baseDP` assertions.
- Verification: focused suite — 3 passed; workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-002 — Bebydomon — 10/10

- Catalog evidence: blue level 2 Digi-Egg; form `In-Training`, type `Baby Dragon`; inherited text is `[When Attacking] [Once Per Turn] If your opponent has 2 or more Digimon in play, <Draw 1>`; it has no main or Security effect and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT10-002` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: one inherited `WhenAttacking`, `OncePerTurn` effect draws exactly one for the source controller when `opponentHas` finds at least two battle-area Digimon. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT10-002", compiled)`.
- Primitive trace: registration maps `OncePerTurn` to `maxPerTurn: 1` keyed by the inherited source instance; `opponentHas` overrides controller ownership to the opposing seat, counts only permanents matching the battle-area and Digimon filters, and uses an inclusive `>= 2` threshold; `Draw` moves the requested top-deck card to the source controller's hand.
- Cross-card and stack proof: realistic Bebydomon-under-level-6 stacks prove the inherited source is the effect owner; a mixed opposing Digimon/Tamer board proves the kind boundary, and two separate Bebydomon sources prove independent frequency identity.
- Behavioral proof: the focused suite proves the exact two-Digimon positive, suppresses a repeated activation from the same source, rejects an opponent attack, rejects one Digimon plus one Tamer, and permits two distinct sources to draw once each.
- Verification: focused suite — 4 passed; workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-003 — Pickmons — 10/10

- Catalog evidence: yellow level 2 Digi-Egg; form `In-Training`, types `Minor` and `Xros Heart`; inherited text is `[When Attacking] If this Digimon has [Xros Heart] in its traits, <Draw 1>`; it has no main or Security effect and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT10-003` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: one inherited `WhenAttacking` effect draws exactly one for its controller when `selfHasTrait` matches `Xros Heart`. It has no frequency limit, matching the print, and the module has full coverage, no residual clauses, and exclusive `registerIrCard("BT10-003", compiled)` registration.
- Primitive trace: `selfHasTrait` resolves the inherited source's live host and checks only that permanent's top-card identity; `selfTopMatchesTrait` uses `matchNameOrTrait` over the complete form/attribute/type trait union, without treating lower stack cards as the current Digimon's traits; `Draw` credits the source controller.
- Cross-card and stack proof: a Pickmons-under-Shoutmon stack proves the exact Xros Heart match, while a Deckerdramon host with Xros Heart Shoutmon lower in its stack proves that a matching source card does not make the current Digimon an Xros Heart Digimon.
- Behavioral proof: the focused suite proves the positive trait path, the current-top versus lower-stack boundary, and ownership by showing an opponent's attack does not activate the controller's inherited effect.
- Verification: focused suite — 3 passed; workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-004 — Bosamon — 10/10

- Catalog and errata evidence: green level 2 Digi-Egg; form `In-Training`, type `Lesser`; inherited text after the 2022-10-28 errata is `[Your Turn] [Once Per Turn] When an effect suspends a Digimon, this Digimon gets +1000 DP for the turn`; it has no main or Security effect and no evolution requirements.
- Knowledge base: Q1930 confirms that a controller's own Digimon being suspended by an effect activates the inherited effect. The catalog uses the errata image and text; no restriction or unresolved ambiguity remains.
- Implementation: an inherited `YourTurn`, `OncePerTurn` watcher listens for `whenEffectSuspends` on any Digimon and grants its own host +1000 DP for the turn. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT10-004", compiled)`.
- Primitive trace: only the effect-driven suspend primitive emits `whenEffectSuspends` after a real unsuspended-to-suspended transition; the explicit Digimon source filter intentionally has no controller restriction, covering both players and Q1930; inherited frequency is keyed by Bosamon's source instance; the DP modifier ledger expires at its controller's turn end.
- Cross-card and stack proof: realistic Bosamon-under-Digimon stacks suspend both a friendly Digimon and an opposing Digimon, prove a single grant across both events, prove two physical Bosamon sources arm independently without watcher duplication, and reject activation outside the source controller's turn.
- Behavioral proof: the focused suite proves the errata once-per-turn limit, Q1930 ownership breadth, source-instance frequency, recompute idempotence, exact +1000 amount, turn restriction, and duration expiry.
- Verification: focused suite — 3 passed; `whenEffectSuspends` primitive regression — 4 passed (126 unrelated tests skipped); workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-005 — Monimon — 10/10

- Catalog evidence: black level 2 Digi-Egg; form `In-Training`, types `CRT`, `Twilight`, and `Xros Heart`; inherited text is `[All Turns] While this Digimon has [Twilight] in its traits, it gets +1000 DP`; it has no main or Security effect and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT10-005` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: one inherited `AllTurns` aura adds exactly 1000 DP to its host while `selfHasTrait` matches the current Digimon's `Twilight` trait. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT10-005", compiled)`.
- Primitive trace: inherited continuous collection binds the aura's self reference to the live host; `selfHasTrait` evaluates only the host's current top-card form/attribute/type union; continuous recomputation adds or removes the modifier as the top identity changes; `AllTurns` carries no turn-owner guard.
- Cross-card and stack proof: Monimon beneath DarkKnightmon proves exact Twilight matching on both turn owners. A real De-Digivolve exposes non-Twilight Deckerdramon while Monimon remains lower in the stack, proving that neither the inherited source's own Twilight trait nor another lower card substitutes for the current top identity.
- Behavioral proof: the focused suite proves exact +1000 DP on both players' turns and observable loss of the bonus after a production De-Digivolve changes the host's identity without removing Monimon from its stack.
- Verification: focused suite — 2 passed; De-Digivolve mechanism coverage — exercised by the focused production flow; workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-006 — Tokomon — 10/10

- Catalog evidence: purple level 2 Digi-Egg; form `In-Training`, type `Lesser`; inherited text is `[Opponent's Turn] When an effect trashes this digivolution card, <Draw 1>`; it has no main or Security effect and no evolution requirements.
- Knowledge base: Q1931 confirms the effect activates when the Tokomon controller's own effect trashes it during the opponent's turn; the effect's owner does not restrict the trigger. No errata, restriction, or unresolved ambiguity remains.
- Implementation: an inherited `OpponentsTurn` watcher listens for the batched effect-driven digivolution-card discard event, filters the moved identities to its own physical source, and draws exactly one for that source's controller. The module has full coverage, no residual clauses, and exclusive `registerIrCard("BT10-006", compiled)` registration.
- Primitive trace: `trashDigivolutionCards` emits one batch event only for explicit effect-driven source trashing and includes the moved instance IDs plus acting seat; the self-reference batch gate matches Tokomon's retained source identity after movement; the turn guard uses the source owner's opponent turn, while the absence of `bySourceController` intentionally accepts either player's effect under Q1931; host deletion uses a different movement path and does not emit this event.
- Cross-card and stack proof: realistic stacks prove opponent-effect and controller-effect trashing, a multi-source discard proves only the Tokomon instance draws once for the batch, and effect deletion of the whole host proves collateral stack movement is not “an effect trashes this digivolution card.”
- Behavioral proof: the focused suite proves both Q1931 ownership paths, the opponent-turn gate, one draw for a mixed batch, exact source identity, and the host-deletion negative boundary.
- Verification: focused suite — 5 passed; genuine effect-trash batch mechanism regression — 2 passed (20 unrelated tests skipped); workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-007 — Dondokomon — 10/10

- Catalog evidence: red level 3 Digimon, play cost 3, 4000 DP; form `Rookie`, attribute `Vaccine`, types `Musical Instrument` and `Xros Heart`; standard evolution is red level 2 for 0 and its only effect text adds evolution from level 2 with the Xros Heart trait for 0; it has no inherited or Security text.
- Knowledge base: `node tools/kb/query.mjs card BT10-007` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: the executable IR has no triggered effects and declares one explicit alternate requirement with exact level 2, Xros Heart trait, cost 0, and `isAlternate: true`; printed catalog metadata retains the independent standard red-level-2 cost-0 recipe. The module has full coverage, no residual clauses, and exclusive `registerIrCard("BT10-007", compiled)` registration.
- Primitive trace: server digivolution legality first evaluates the printed color/level recipes, then unions matching compiled alternate requirements; alternate trait matching uses the base's live top-card trait union; cost-path selection is explicit and server validated, and both paths move Dondokomon from hand to the top of the existing stack while charging 0.
- Cross-card and stack proof: a red non-Xros-Heart level 2 proves the standard route, an off-color Xros Heart level 2 proves the alternate route, an off-color non-Xros-Heart level 2 proves the trait boundary, and an off-color Xros Heart level 3 proves the exact-level boundary.
- Behavioral proof: the focused suite executes both legal evolution paths through public intents, verifies unchanged memory and top-card transition, and rejects both independently invalid alternate candidates.
- Verification: focused suite — 4 passed; shared digivolution conformance — unchanged seam covered by collection gate; workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-008 — Shoutmon — 10/10

- Catalog evidence: red level 3 Digimon, play cost 4, 2000 DP; form `Rookie`, attribute `Data`, types `Mini Dragon` and `Xros Heart`; standard evolution is red level 2 for 0 and the trait route is level 2 Xros Heart for 0. On Play reveals 3 and must add up to one Xros Heart Digimon plus up to one Xros Heart Tamer, bottoming the rest; On Deletion has optional Save; inherited Your Turn grants Rush while the host's name contains Shoutmon.
- Knowledge base: Q1932 requires both add buckets to match Xros Heart, Q1933 permits adding the only eligible kind, and Q1934 requires adding both kinds when both exist rather than declining either. No errata, restriction, or unresolved ambiguity remains.
- Implementation: `RevealAdd` has separately capped Digimon/Xros Heart and Tamer/Xros Heart buckets with `deckBottom` remainder routing; On Deletion exposes optional Save through `PlaceUnder`; the inherited aura uses `selfHasNameContaining(Shoutmon)` to grant Rush on Your Turn; the explicit trait evolution requirement complements catalog standard evolution. Coverage is full, residuals empty, and registration exclusively uses `registerIrCard("BT10-008", compiled)`.
- Primitive trace: reveal selection enforces each nonempty bucket's minimum of one, prevents duplicate instance selection, preserves full reveal visibility, and bottom-orders leftovers; Save retains the deleted source in trash long enough to select a controller-owned Tamer and move under it, with refusal leaving it in trash; the inherited name gate reads only the live host top and continuous keyword collection removes Rush outside the source controller's turn; digivolution unions printed and trait-gated routes.
- Cross-card and stack proof: mixed reveal pools contain exact matches and near-matching Digimon/Tamers without Xros Heart; real standard-red and off-color-Xros-Heart evolutions prove both stack transitions; Shoutmon-named and unrelated hosts carrying Shoutmon as a source distinguish current-name matching; Save is proven with a live Xros Heart Tamer.
- Behavioral proof: the focused suite proves both zero-cost evolution routes; Q1932-Q1934 mandatory reveal behavior and remainder routing; Save acceptance, refusal, and final zones; and inherited Rush name and turn boundaries.
- Verification: focused suite — 7 passed; reveal/Save/evolution/Rush mechanisms — exercised through focused production flows; workspace typecheck — pending collection gate; `git diff --check` — passed.

## BT10-009 — Shoutmon X4 — 10/10

- Catalog and restriction evidence: red/yellow level 4 Digimon, play cost 9, 8000 DP; evolves from red or yellow level 3 for 3; form `Champion`, attribute `Data`, types `Composite` and `Xros Heart`. DigiXros uses Shoutmon, Ballistamon, Dorulumon, and Starmons at -2 each; Material Save 2; On Play draws 2; optional End of Attack moves all sources under one friendly Tamer as a cost, unsuspends one friendly Tamer, then deletes Shoutmon X4. The card is restricted to one copy since 2022-11-11.
- Knowledge base: Q1935 confirms the end-of-attack cost/effect may be declined, Q1936 requires at least one digivolution card, and Q1937 permits unsuspending a different Tamer from the destination Tamer. No errata or unresolved ambiguity remains.
- Implementation: static Material Save 2, On Play Draw 2, and an optional End of Attack transaction with a nonempty-stack precondition are represented directly. The cost moves every source under one friendly Tamer, the independent Unsuspend target selects one friendly Tamer, and self-deletion follows only after payment. DigiXros declares all four name slots at reduction 2. Coverage is full, residuals empty, and registration exclusively uses `registerIrCard("BT10-009", compiled)`.
- Primitive trace: play-cost construction validates unique named materials from hand/battle area and Taiki-expanded sources, applies -2 per material, moves them under the new permanent, and triggers normal On Play draw; the end-attack cost preflights a nonempty source stack and destination, aborts cleanly on refusal, moves all sources atomically, then resolves an independent unsuspend selection before deletion; Material Save filters the deleted stack against DigiXros condition names and moves at most two under one Tamer.
- Cross-card and stack proof: Taiki supplies two legal materials from under itself for a reduced real play; full Shoutmon X4 attack stacks prove source transfer, self-deletion, empty-stack rejection, and refusal; the Q1937 unsuspend decision observably offers both the source-destination Tamer and a different Tamer as legal candidates; a three-material deletion proves the Material Save 2 cap and leftover trash zone.
- Behavioral proof: the focused suite proves exact Draw 2, DigiXros cost and zones, all Q1935-Q1937 boundaries, final self-deletion, and Material Save eligibility/count.
- Verification: focused suite — 7 passed; DigiXros/Material Save/end-of-attack mechanisms — exercised through focused production flows; workspace typecheck — pending collection gate; `git diff --check` — passed.
