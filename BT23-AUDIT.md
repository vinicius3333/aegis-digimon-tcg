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

## BT23-005 — Elizamon — 10/10

- Catalog evidence: Red level 3, play cost 3, 1000 DP, evolves from a red level 2 for 0; form `Rookie`, attribute `Virus`, types `Reptile` and `LIBERATOR`; main text reduces by 1 when this Digimon would evolve into a Reptile- or Dragonkin-trait Digimon; inherited text gives the host +2000 DP during its controller's turn; no Security text.
- Knowledge base: Q5215 says the main reduction does not activate from the breeding area. Q5586 says BT24-016 Lamiamon's hand effect sets its evolution cost to 3 and Elizamon then reduces that to 2. Both rulings are covered directly and no ambiguity remains.
- Implementation: the top-card `YourTurn` effect installs a self-scoped `wouldDigivolve` replacement whose `into` filter is the exact Reptile/Dragonkin trait union and whose nested reducer subtracts 1. The inherited `YourTurn` effect continuously adds 2000 DP to the host. The module registers exclusively through `registerIrCard("BT23-005", compiled)` with full coverage and no residual clauses.
- Primitive trace: the continuous pass installs the replacement only for a battle-area top-card source; `costReductionFor("wouldDigivolve", target, into)` checks both the source permanent and destination definition after a fixed effect-driven cost is established; breeding cards do not satisfy the static builder's battle-area guard; inherited collection excludes the top-card main clause and continuously recomputes the DP modifier across turn ownership.
- Behavioral proof: the focused suite checks exact catalog and IR, separately proves Reptile and Dragonkin reductions from 2 to 1, proves a nonmatching destination pays 2, proves Q5215's breeding exclusion, proves Q5586's effect-driven 3-to-2 interaction with a realistic Elizamon/Dimetromon/Lamiamon stack, proves inherited DP on both turn owners, and proves the main reducer is not inherited.
- Verification: focused suite — 8 passed; `git diff --check` — passed.

## BT23-006 — Huckmon — 10/10

- Catalog evidence: Red level 3, play cost 3, 1000 DP, standard red-level-2 evolution for 0 plus alternate level-2 CS evolution for 0; form `Rookie`, attribute `Data`, types `Mini Dragon` and `CS`; On Play reveals 3, adds one Huckmon/Sistermon name match and one Royal Knight trait match, then bottoms the rest; inherited Your Turn once per turn gains 1 memory when a friendly white Digimon is played; no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT23-006` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: the On Play `RevealAdd` has two separately capped add buckets and `deckBottom` routing; the alternate evolution requirement records exact level, trait, cost, and alternate status; the inherited `whenPlayed` subtrigger filters mine + Digimon + White and grants 1 memory once per source per turn. The module registers exclusively through `registerIrCard("BT23-006", compiled)` with full coverage and no residual clauses.
- Primitive trace: RevealAdd exposes only the top 3, resolves each capped bucket against definition name/trait semantics, prevents one selected instance from being selected twice, and bottom-orders all leftovers face down; alternate evolution unions with the standard recipe; `whenPlayed` uses the created permanent payload's owner, kind, and effective printed colors; inherited frequency is keyed by source instance.
- Behavioral proof: the focused suite checks exact catalog/IR, routes one name match and one Royal Knight while leaving the fourth card unrevealed and bottoming the nonmatch, handles a zero-match reveal, proves the off-color CS evolution and rejects an off-color non-CS egg, proves one memory gain across two white plays, proves two Huckmon sources trigger independently, and rejects both a friendly non-white play and an opposing white play.
- Verification: focused suite — 7 passed; `git diff --check` — passed.

## BT23-007 — Musclemon — 10/10

- Catalog evidence: Red level 3, play cost 3, 1000 DP, standard red-level-2 evolution for 0 plus alternate level-2 Appmon evolution for 0; forms `Stnd.` and `Appmon`, attribute `Life`, type `Muscle Training`; Security plays this card without cost at the end of its battle; Link onto Appmon costs 1, contributes 2000 DP, and grants Piercing.
- Knowledge base: `node tools/kb/query.mjs card BT23-007` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Defects corrected: the generated IR omitted the complete Link clause and tried to play the Security card directly without retaining the post-battle trash source. The audited IR now declares the Appmon cost-1 link requirement, a linked static Piercing keyword, and the proven `whenSecurityBattleEnded` subtrigger that plays self from trash; registration remains exclusively `registerIrCard("BT23-007", compiled)` with full coverage and no residual clauses.
- Primitive trace: alternate evolution unions the trait recipe with the standard color recipe; the player Link action validates the live host's Appmon trait, spends exactly the printed cost, moves Musclemon from hand into the host's linked zone, applies the catalog `linkDp` through the modifier ledger, and exposes the linked static keyword only from that zone; the Security lifecycle moves the revealed card through trash before the once-only battle-ended subtrigger resolves `PlayWithoutCost` without spending memory.
- Behavioral proof: the focused suite checks every catalog field and the complete IR; executes a real security attack and verifies post-battle play, trash removal, and unchanged memory; proves off-color Appmon evolution for 0 and rejects an off-color non-Appmon; proves a valid Link costs exactly 1, contributes exactly 2000 DP, and grants Piercing; and proves an invalid host leaves hand, linked zone, and memory unchanged.
- Verification: focused suite — 5 passed; Link/Security mechanism regressions (`BT23-052`, CR chapter 4, CR chapter 10) — 74 passed; API typecheck — passed; `git diff --check` — passed.

## Remaining queue

BT23-008 through BT23-102.
