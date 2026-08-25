# BT11 Card Implementation Audit

This ledger records evidence gathered independently in ascending card ID order. A card is marked 10/10 only when its exact committed catalog and local knowledge-base evidence map completely to compiled IR, shared behavior has been traced, and focused observable-state tests prove every applicable contract boundary.

## BT11-001 — Yokomon — 10/10

- Catalog evidence: Red level 2 Digi-Egg; form `In-Training`, type `Bulb`; inherited text is `[On Deletion] If you have a red Tamer in play, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or frequency clause.
- Knowledge base: `node tools/kb/query.mjs card BT11-001` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT11-001.ts` contains one inherited `OnDeletion` effect whose `Draw 1` is gated by `youHave` an exact controller-owned red Tamer in the battle area. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT11-001", compiled)`.
- Primitive trace: deletion snapshots the complete deleted stack and collects inherited `OnDeletion` effects from their stack-card source identities; the inherited placement guard rejects top-card or breeding-only use; `youHave` evaluates live controller-owned battle-area definitions and color; `Draw` moves exactly one top-deck card to that effect controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, deletes a realistic Yokomon evolution stack while a friendly red Tamer remains and observes exactly one draw, and proves an opposing red Tamer does not satisfy the controller-qualified condition.
- Verification: focused suite — 3 passed; inherited Digi-Egg and deletion-subtrigger mechanism regressions — 9 passed; workspace typecheck — passed; `git diff --check` — passed.

## BT11-002 — Wanyamon — 10/10

- Catalog evidence: Blue level 2 Digi-Egg; form `In-Training`, type `Lesser`; inherited text is `[When Attacking][Once Per Turn] If you have a blue Tamer in play, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or other effect.
- Knowledge base: `node tools/kb/query.mjs card BT11-002` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT11-002.ts` contains one inherited, once-per-turn `WhenAttacking` effect whose `Draw 1` is gated by `youHave` an exact controller-owned blue Tamer in the battle area. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT11-002", compiled)`.
- Primitive trace: attack declaration fires the inherited timing from Wanyamon's stack-card source; registration converts `frequency: "OncePerTurn"` to a source-instance-scoped `maxPerTurn: 1`; `youHave` forces controller ownership while matching the live Tamer kind and blue color; `Draw` moves exactly one top-deck card to the effect controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, draws from a realistic Wanyamon evolution stack with a friendly blue Tamer, proves a second attack by the same source in the turn does not draw again, and proves an opposing blue Tamer does not satisfy the condition.
- Verification: focused suite — 3 passed; inherited collection and once-per-turn kernel mechanism regressions — 28 passed; workspace typecheck — passed; `git diff --check` — passed.

## BT11-003 — Tokomon — 10/10

- Catalog evidence: Yellow level 2 Digi-Egg; form `In-Training`, type `Lesser`; inherited text is `[Your Turn][Once Per Turn] When you play a Digimon with [Angel], [Archangel], or [Fallen Angel] in its traits, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or other effect.
- Knowledge base: `node tools/kb/query.mjs card BT11-003` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT11-003.ts` installs an inherited, controller-turn `whenPlayed` watcher with a Digimon-only exact trait union for Angel, Archangel, and Fallen Angel, then draws one once per source per turn. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT11-003", compiled)`.
- Primitive trace: the continuous `YourTurn` body installs its watcher only while Tokomon is an inherited battle-area source; ordinary and effect-driven play paths emit `whenPlayed` after On Play resolution with the created permanent as subject; source matching checks controller, Digimon kind, and the complete forms/attributes/types trait union; frequency is threaded to the watcher with a stable Tokomon source-instance key.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, separately plays exact Angel, Archangel, and Fallen Angel Digimon from a realistic Tokomon stack, rejects a Mini Dragon near-pool nonmatch, and proves two matching plays in one turn produce only one draw.
- Verification: focused suite — 6 passed; when-played and subtrigger-frequency mechanism regressions — 45 passed; workspace typecheck — passed; `git diff --check` — passed.

## BT11-004 — Tanemon — 10/10

- Catalog evidence: Green level 2 Digi-Egg; form `In-Training`, type `Bulb`; inherited text is `[Your Turn][Once Per Turn] When you play a green Tamer, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or other effect.
- Knowledge base: `node tools/kb/query.mjs card BT11-004` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT11-004.ts` installs an inherited, controller-turn `whenPlayed` watcher filtered to controller-owned green Tamers, then draws one once per source per turn. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT11-004", compiled)`.
- Primitive trace: the inherited `YourTurn` static body arms its watcher only from Tanemon's evolution-source position; the play lifecycle publishes the created permanent after its On Play window; source matching uses live controller, kind, and color data; the outer once-per-turn frequency is threaded to the watcher under the Tanemon source instance; `Draw` moves exactly one top card to its controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, plays two different green Tamers from a realistic Tanemon stack and observes exactly one draw, rejects a green Digimon to prove the kind boundary, and rejects a red Tamer to prove the color boundary.
- Verification: focused suite — 4 passed; when-played and subtrigger-frequency mechanism regressions — 45 passed at the unchanged seam immediately before this card; workspace typecheck — passed; `git diff --check` — passed.

## BT11-005 — Koromon — 10/10

- Catalog evidence: Black level 2 Digi-Egg; form `In-Training`, type `Lesser`; inherited text is `[Opponent's Turn][Once Per Turn] When an opponent's Digimon is deleted, if this Digimon has [Greymon] in its name, <Draw 1>`; no main text, Security text, evolution requirements, attribute, or other effect.
- Knowledge base: Q2046 says the inherited effect does not activate when its Greymon host and the opposing Digimon are deleted simultaneously; there are no local errata, restrictions, or unresolved ambiguities.
- Implementation: `BT11-005.ts` installs an inherited, opponent-turn `onDeletionOf` watcher filtered to opposing Digimon, guarded by `notSimultaneous: true`, and draws only while the live host name contains Greymon. The watcher is once per source per turn; coverage is full, residuals are empty, and registration is exclusively `registerIrCard("BT11-005", compiled)`.
- Primitive trace: deletion publishes the complete simultaneous batch and its deleted-source snapshot; `notSimultaneous` rejects a watcher whose own host is in that batch, implementing Q2046; source matching restricts the event subjects to opposing Digimon; `selfHasNameContaining` reads the live host top card; the outer frequency is threaded to the reactive watcher under Koromon's source-instance identity.
- Behavioral proof: the focused suite checks the exact catalog and complete IR, draws from a realistic Koromon-under-Greymon stack for a separate opposing deletion, directly proves Q2046's simultaneous negative, proves only one draw across two separate deletions, rejects the controller-turn window, and rejects a non-Greymon host.
- Verification: focused suite — 5 passed; deletion collection and subtrigger mechanism regressions — 32 passed; workspace typecheck — passed; `git diff --check` — passed.
