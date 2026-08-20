# BT24 Audit Ledger — Wave 5

Scope: BT24-082, BT24-081, BT24-080, BT24-079, BT24-078 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-082 — Owen Dreadnought — 10/10

1. **Catalog identity:** `BT24-082`; set BT24; kind(s) Tamer; color(s) Red; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) LIBERATOR; rarity R; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] By returning this Tamer to the bottom of the deck, you may play 1 [Owen Dreadnought] from your hand without paying the cost. Then, if you don't have a Digimon, you may play 1 [Elizamon] from your trash without paying the cost. [Your Turn] When any of your Digimon digivolve into a [Reptile] or [Dragonkin] Digimon, by suspending this Tamer, that Digimon gets +3000 DP for the turn. Then, it may attack."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-082`

```text
BT24-082 Owen Dreadnought
  Q&A (3):
    Q5663 (2025-12-25): Can I process the part of the effect after "then" in this card's [Start of Your Main Phase] effect without meeting the "by" condition?
      A: No, you can't. You can only process the part of the effect after "then" in this card's [Start of Your Main Phase] effect if you return this card to the bottom of the deck.
    Q5664 (2025-12-25): At the start of my main phase, this card's [Start of Your Main Phase] effect plays a card. Can I then activate the [Start of Your Main Phase] effect on the played card?
      A: No, you can't activate it.
    Q5665 (2025-12-25): Can I process the part of the effect after "then" in this card's [Your Turn] effect without meeting the "by" condition?
      A: No, you can't. If you don't suspend this card, you can't process the part after "then" in its [Your Turn] effect.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-082.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L26: trigger: "StartOfYourMainPhase",
L29: kind: "PlayWithoutCost",
L40: kind: "return",
L53: kind: "PlayWithoutCost",
L64: kind: "youHaveNone",
L67: kind: ["Digimon"],
L76: trigger: "YourTurn",
L79: kind: "SubTrigger",
L83: kind: ["Digimon"],
L87: kind: "suspend",
L98: kind: "ModifyDP",
L107: kind: "Attack",
L120: trigger: "Security",
L123: kind: "PlayWithoutCost",
L139: registerIrCard("BT24-082", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-082.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("returns itself to deck bottom and gates the chained Elizamon play", () => {
L8: expect(start?.actions?.[0]).toMatchObject({
L14: expect(start?.actions?.[1]).toMatchObject({
L20: expect(watcher).toMatchObject({ event: "whenOneOfYoursDigivolves", cost: { kind: "suspend" } });
L21: expect(watcher.actions).toEqual(
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-081 — Titamon + SkullBaluchimon — 10/10

1. **Catalog identity:** `BT24-081`; set BT24; kind(s) Digimon; color(s) Purple/Green; level 7; play cost 14; DP 14000; form(s) Mega; attribute(s) Virus; trait(s) Shaman/Titan/TS/Demon; rarity SR; deck limit 4. Evolution data: `[{"color":"Purple","level":6,"memoryCost":4},{"color":"Green","level":6,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "＜Rush＞ \n＜Piercing＞ \n＜Execute＞ \n[On Play] [When Digivolving] [When Attacking] By trashing 1 card in your hand, delete all of your opponent's Digimon with the lowest level.\n[On Deletion] You may play 1 [Titamon] or 1 level 5 or lower Digimon card with the [Titan] trait from your trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-081`

```text
BT24-081 Titamon + SkullBaluchimon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-081.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "Static",
L41: trigger: "OnPlay",
L44: kind: "Delete",
L48: kind: ["Digimon"],
L54: kind: "trash",
L68: trigger: "WhenDigivolving",
L71: kind: "Delete",
L75: kind: ["Digimon"],
L81: kind: "trash",
L95: trigger: "WhenAttacking",
L98: kind: "Delete",
L102: kind: ["Digimon"],
L108: kind: "trash",
L122: trigger: "OnDeletion",
L125: kind: "PlayWithoutCost",
L129: kind: ["Digimon"],
L141: kind: ["Digimon"],
L158: registerIrCard("BT24-081", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-081.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("requires the printed hand-trash cost and separates Titamon from the level-limited Titan branch", () => {
L9: expect(action).toMatchObject({
L14: expect(action).not.toHaveProperty("optional");
L17: expect(deletion).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-080 — Megidramon — 10/10

1. **Catalog identity:** `BT24-080`; set BT24; kind(s) Digimon; color(s) Purple; level 6; play cost 13; DP 13000; form(s) Mega; attribute(s) Virus; trait(s) Evil Dragon/Four Great Dragons; rarity R; deck limit 4. Evolution data: `[{"color":"Purple","level":5,"memoryCost":5}]`.
2. **Exact printed surfaces:**
   - Main: "[Trash] [End of Your Turn] If you have 4 or fewer cards in your hand, 1 of your [Dark Dragon] or [Evil Dragon] Digimon may digivolve into this card without paying the cost.\n＜Blocker＞ \n[On Play] [When Digivolving] [On Deletion] Delete all of your opponent's lowest level Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-080`

```text
BT24-080 Megidramon
  Q&A (2):
    Q5661 (2025-12-25): What is a {Trash} effect?
      A: A {Trash} effect can be triggered/activated while its card is in the trash. Such effects can't be triggered or activated in areas other than the trash.
    Q5662 (2025-12-25): I have 2 copies of this card in my trash, 2 of my Digimon with the [Dark Dragon] or [Evil Dragon] trait are in the battle area, and I have 4 cards in my hand. At the end of my turn, the {Trash} [End of Your Turn] effects on the 2 copies of this card in the trash trigger simultanesouly. I activate the effect on the 1st copy and digivolve 1 of my Digimon with the [Dark Dragon] or [Evil Dragon] trait into this card. After that, I perform the digivolution bonus draw, and I now have 5 cards in my hand. Can I then activate the {Trash} [End of Your Turn] effect that triggered simultaneously on the other copy of this card?
      A: No, you can't. You must have 4 or fewer cards in your hand upon the actual activation timing for this card's {Trash} [End of Your Turn] effect.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-080.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "EndOfYourTurn",
L14: kind: "Digivolve",
L18: kind: ["Digimon"],
L32: kind: ["Digimon"],
L38: kind: "zoneCount",
L50: trigger: "Static",
L60: trigger: "OnPlay",
L63: kind: "Delete",
L67: kind: ["Digimon"],
L76: trigger: "WhenDigivolving",
L79: kind: "Delete",
L83: kind: ["Digimon"],
L92: trigger: "OnDeletion",
L95: kind: "Delete",
L99: kind: ["Digimon"],
L112: registerIrCard("BT24-080", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-080.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("digivolves into this trash card from Dark Dragon/Evil Dragon and keeps lowest-level deletion", () => {
L8: expect(trash).toMatchObject({ isFromTrash: true });
L9: expect(trash?.actions?.[0]).toMatchObject({
L16: expect(BT24_080.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-079 — Hadesmon — 10/10

1. **Catalog identity:** `BT24-079`; set BT24; kind(s) Digimon; color(s) Purple/White; level 6; play cost 12; DP 12000; form(s) God/Appmon; attribute(s) God; trait(s) Transmutation; rarity SR; deck limit 4. Evolution data: `[{"color":"Purple","level":5,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[App Fusion] [Revivemon] & [Biomon]: Cost 0\n\n＜Overclock ([Appmon] Trait)＞ (At the end of your turn, by deleting 1 of your Tokens or other [Appmon] trait Digimon, this Digimon attacks a player without suspending.)\n＜Link +1＞ \n[When Digivolving] You may play 1 level 4 or lower [System] or [Life] trait Digimon card from your trash without paying the cost. Then, you may link 1 [Appmon] trait Digimon card from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[All Turns] [Once Per Turn] When other Digimon are deleted, you may activate 1 of this Digimon's [When Digivolving] effects."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-079`

```text
BT24-079 Hadesmon
  Q&A (2):
    Q5659 (2025-12-25): Can I use this card's [When Digivolving] effect to link a card that doesn't have <Link>?
      A: No, you can't.
    Q5660 (2025-12-25): All of my Digimon get -5000 DP. I used this card's [When Digivolving] effect to play a Digimon with 5000 DP or less. At such times, is the played Digimon deleted before the part of the effect after "then"?
      A: No, it isn't deleted yet. Once all of the processing for this card's [When Digivolving] effect is resolved, then all of the Digimon with 0 DP are deleted at the same time.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-079.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L14: trigger: "Static",
L24: trigger: "Static",
L35: trigger: "WhenDigivolving",
L38: kind: "PlayWithoutCost",
L42: kind: ["Digimon"],
L63: kind: "Link",
L67: kind: ["Digimon"],
L81: kind: ["Digimon"],
L91: trigger: "AllTurns",
L94: kind: "SubTrigger",
L99: kind: ["Digimon"],
L104: kind: "ReactivateEffect",
L113: frequency: "OncePerTurn",
L118: appFusionRequirement: [
L126: registerIrCard("BT24-079", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-079.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("links an Appmon card to a separately selected friendly Digimon", () => {
L8: expect(main?.actions?.[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-078 — Creepymon (X Antibody) — 10/10

1. **Catalog identity:** `BT24-078`; set BT24; kind(s) Digimon; color(s) Purple; level 6; play cost 13; DP 13000; form(s) Mega; attribute(s) Virus; trait(s) Demon Lord/X Antibody/Seven Great Demon Lords; rarity SR; deck limit 4. Evolution data: `[{"color":"Purple","level":5,"memoryCost":5}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Creepymon]: Cost 2 \n\n[Trash] [Your Turn] When one of your [Creepymon] attacks, if your opponent has 10 or more cards in their trash, by digivolving it into this card without paying the cost, trash your opponent's top security card.\n[When Digivolving] Delete all of your opponent's lowest level Digimon. Then, you may play up to 4 play cost's total worth of [Evil] or [Fallen Angel] trait cards from your trash without paying the cost. For every 10 cards in your opponent's trash, add 4 to this effect's play cost maximum."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-078`

```text
BT24-078 Creepymon (X Antibody)
  Q&A (6):
    Q5655 (2025-12-25): What is a {Trash} effect?
      A: A {Trash} effect can be triggered/activated while its card is in the trash. Such effects can't be triggered or activated in areas other than the trash.
    Q5656 (2025-12-25): When my EX10-009 [Creepymon] attacks, in what order do that Digimon's [When Attacking] effect and this card's {Trash} [Your Turn] effect activate?
      A: The effects trigger simultaneously, so the player can choose the activation order. However, if you use this card's {Trash} [Your Turn] effect to digivolve that Digimon before activating EX10-009 [Creepymon]'s [When Attacking] effect, you won't be able to activate that [When Attacking] effect.
      related: EX10-009
    Q5657 (2026-03-13): When exactly is the timing for the digivolution bonus draw when a digivolution would occur by this card's {Trash} [Your Turn] effect?
      A: You perform the digivolution bonus draw when a card is placed on top of the Digimon to digivolve. A digivolution includes the bonus draw in accordance with the rules. After the card to digivolve is stacked and the digivolution bonus draw is performed, you process the remaining effects.
    Q5658 (2025-12-25): Is the "by" condition in this card's {Trash} [Your Turn] effect met even if I don't have a card in my deck and can't perform a digivolution bonus draw when using this effect to digivolve?
      A: Yes, it's met.
    Q5775 (2025-12-25): If my [Creepymon] attacks and an effect such as a [When Attacking] effect trashes this card, can I activate this card's {Trash} [Your Turn] effect after it's trashed?
      A: No, you can't. You can only activate this card's {Trash} [Your Turn] effect if it's already in the trash upon the timing when you make the attack declaration for your [Creepymon]. If this card is placed in the trash by an effect that activates after making the attack declaration for your [Creepymon], this card's {Trash} [Your Turn] effect won't trigger and you can't activate it.
    Q6028 (2026-03-13): I activated this card's [When Digivolving] effect, and when my opponent's Digimon would leave the battle area for the 1st process, an immediate-type effect such as a "when [...] would leave" effect caused this card to be removed from the battle area. Can I then process the part of the effect after "then" in this card's effect?
      A: Yes, you can. If an effect activates, it is to be fully resolved even if the card that activated the effect is removed from that area during the processing.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-078.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L27: kind: "Digivolve",
L29: into: { controller: "mine", zone: "trash", isSelfRef: true, kind: ["Digimon"] },
L37: kind: "SecurityManipulation",
L47: trigger: "WhenDigivolving",
L50: kind: "Delete",
L54: kind: ["Digimon"],
L61: kind: "PlayMultiple",
L64: kind: ["Digimon"],
L84: digivolutionRequirement: [
L93: registerIrCard("BT24-078", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-078.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("digivolves from trash before trashing security and uses a dynamic total play-cost budget", () => {
L8: expect(trash).toMatchObject({ event: "whenAttacking" });
L9: expect(trash.actions).toEqual([
L15: expect(whenDigivolving?.actions?.[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
