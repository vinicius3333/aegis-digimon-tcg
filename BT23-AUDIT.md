# BT23 Card Implementation Audit

This ledger records the evidence gathered in ascending card ID order. A card is marked 10/10 only when its catalog text and local knowledge-base evidence map completely to compiled IR, the shared primitives have been traced, and focused observable-state tests cover every applicable contract boundary.

## BT23-001 — Flickmon — 10/10

- Catalog evidence: Blue level 2 Digi-Egg; form `Appmon`, attribute `Game`, type `Flick`; inherited text is `[When Attacking] [Once Per Turn] If this Digimon has the [Appmon] trait, <Draw 1>`; no main or Security text and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT23-001` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT23-001.ts` contains one inherited `WhenAttacking`, `OncePerTurn` effect. Its conditional `Draw 1` uses `selfHasTrait(Appmon)` and the module registers exclusively through `registerIrCard("BT23-001", compiled)` with full coverage and no residual clauses.
- Primitive trace: interpreter registration maps `frequency: "OncePerTurn"` to `maxPerTurn: 1` while preserving inherited source identity; `selfHasTrait` checks the live host top card only and `matchNameOrTrait` treats forms, attributes, and types as the complete trait union; `Draw` moves exactly one top-deck card to the effect controller's hand.
- Behavioral proof: the focused suite checks the exact catalog and IR contract, draws for a realistic Flickmon-under-Appmon stack, refuses the draw for a non-Appmon carrier, suppresses a second attack in the same turn, and permits two distinct Flickmon sources to draw independently.
- Verification: focused suite — 4 passed; `condition.selfHasTrait` mechanism regression — 3 passed; workspace typecheck — passed; `git diff --check` — passed.

## BT23-002 — Yokomon — 10/10

- Catalog evidence: Green level 2 Digi-Egg; form `In-Training`, attribute `-`, types `Bulb` and `CS`; inherited text is `[When Attacking] [Once Per Turn] If this Digimon has the [CS] trait, <Draw 1>`; no main or Security text and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT23-002` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT23-002.ts` contains one inherited `WhenAttacking`, `OncePerTurn` effect. Its conditional `Draw 1` uses `selfHasTrait(CS)` and the module registers exclusively through `registerIrCard("BT23-002", compiled)` with full coverage and no residual clauses.
- Primitive trace: the same verified inherited-frequency and draw paths used by BT23-001 apply, while this card additionally proves an exact type-trait match (`CS`) rather than a form-trait match.
- Behavioral proof: the focused suite checks the exact catalog and IR contract, draws for a realistic Yokomon-under-CS Digimon stack, refuses the draw for a non-CS carrier, suppresses a second attack in the same turn, and permits two distinct Yokomon sources to draw independently.
- Verification: focused suite — 4 passed; shared `condition.selfHasTrait` mechanism regression was already green at this unchanged seam; workspace typecheck remained green after BT23-001 and no production seam changed; `git diff --check` — passed.

## BT23-003 — Motimon — 10/10

- Catalog evidence: Black level 2 Digi-Egg; form `In-Training`, attribute `-`, types `Lesser` and `CS`; inherited text is `[Your Turn] [Once Per Turn] When any of your [CS] trait Option cards are placed in the battle area, this Digimon may attack`; no main or Security text and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT23-003` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT23-003.ts` installs an inherited, once-per-turn `whenOptionPlayed` subtrigger during `YourTurn`, filters the event subject to the controller's CS-trait Option, and offers a self attack that suspends normally. The module registers exclusively through `registerIrCard("BT23-003", compiled)` with full coverage and no residual clauses.
- Primitive trace: `PlaceInBattleAreaSelf`/`placeOptionAsPermanent` emits `whenOptionPlayed` only after producing the Option permanent; the subtrigger matches the payload's permanent definition and controller; `forceAttack` runs the full legal target, suspension, combat, and end-of-attack lifecycle; the generic optional wrapper resolves before combat; inherited frequency is keyed to the Motimon source instance.
- Behavioral proof: the focused suite checks the exact catalog and IR contract, attacks after a controller-owned CS Option placement, suppresses a second placement that turn, rejects a non-CS Option and an opponent-owned CS Option, and proves the controller can refuse without suspending or changing security.
- Verification: focused suite — 5 passed; Option-placement event regression — 1 passed (129 unrelated tests skipped); `git diff --check` — passed.

## BT23-004 — DemiMeramon — 10/10

- Catalog evidence: Purple level 2 Digi-Egg; form `In-Training`, attribute `-`, types `Flame` and `LIBERATOR`; inherited text is `[On Deletion] 1 of your Digimon with the [Ghost] trait gains <Blocker> and <Retaliation> until your opponent's turn ends`; no main or Security text and no evolution requirements.
- Knowledge base: `node tools/kb/query.mjs card BT23-004` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Defect corrected: the generated IR performed two independent target selections, which allowed Blocker and Retaliation to be granted to different Ghost Digimon. The audited IR now uses `SelectBind` once and both `GainKeyword` actions consume `fromSelectionRef: "demimeramonGhost"`; registration remains exclusively `registerIrCard("BT23-004", compiled)` with full coverage and no residual clauses.
- Primitive trace: inherited On Deletion collection retains the deleted stack source; `SelectBind` stores exactly one permanent ID; both keyword grants use the shared bound-target resolver and continuous ledger; `untilOpponentTurnEnd` survives the controller's turn end and expires after the opponent's turn-end boundary; Blocker and Retaliation are read by the combat subsystem from the same keyword ledger.
- Behavioral proof: the focused suite checks the exact catalog and corrected IR, deletes a realistic Digi-Egg stack, selects among multiple exact Ghost matches while excluding a friendly non-Ghost and opposing Ghost, proves both keywords land on only one chosen recipient, proves both duration boundaries, and proves an empty eligible set opens no decision or grant.
- Verification: focused suite — 3 passed; Retaliation combat regression — 4 passed; `git diff --check` — passed.

## Remaining queue

BT23-005 through BT23-102.
