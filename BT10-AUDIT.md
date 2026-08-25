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
