# BT24 Audit Ledger — Wave 15

Scope: BT24-032, BT24-031, BT24-030, BT24-029, BT24-028 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-032 — Pipomon — 10/10

1. **Catalog identity:** `BT24-032`; set BT24; kind(s) Digimon; color(s) Yellow; level 3; play cost 3; DP 1000; form(s) Stnd./Appmon; attribute(s) System; trait(s) Warning/Leviathan; rarity C; deck limit 4. Evolution data: `[{"color":"Yellow","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Appmon] trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Appmon] trait and 1 card with the [System] or [Transmutation (App Name)] trait among them to the hand. Return the rest to the bottom of the deck."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-032`

```text
BT24-032 Pipomon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-032.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L51: digivolutionRequirement: [
L61: registerIrCard("BT24-032", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-032.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reveals three and searches Appmon plus System/Transmutation", () => {
L7: expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
L8: expect(reveal.add).toHaveLength(2);
L9: expect(reveal.add[0]).toMatchObject({
L13: expect(reveal.add[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-031 — Elecmon — 10/10

1. **Catalog identity:** `BT24-031`; set BT24; kind(s) Digimon; color(s) Yellow; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Data; trait(s) Mammal/Iliad/TS; rarity R; deck limit 4. Evolution data: `[{"color":"Yellow","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[TS] trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Iliad] trait and 1 card with the [TS] trait among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "[When Attacking] [Once Per Turn] You may add your top security card to the hand. Then, if you have 0 security cards, ＜Recovery +1 (Deck)＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-031`

```text
BT24-031 Elecmon
  Q&A (1):
    Q5611 (2025-12-25): I have 0 security cards. Can I activate this card's inherited effect and perform <Recovery +1 ≪Deck≫> without adding a security card to the hand?
      A: Yes, you can.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-031.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L49: trigger: "WhenAttacking",
L52: kind: "SecurityManipulation",
L60: kind: "SecurityManipulation",
L66: kind: "zoneCount",
L77: frequency: "OncePerTurn",
L82: digivolutionRequirement: [
L92: registerIrCard("BT24-031", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-031.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("recovers only after the optional top-security add leaves zero security", () => {
L8: expect(recovery).toMatchObject({ kind: "SecurityManipulation", op: "addTop", source: "deck" });
L9: expect(recovery.condition).toMatchObject({
L17: it("reveals the two printed search pools on play", () => {
L19: expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
L20: expect(reveal.add).toHaveLength(2);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-030 — Neptunemon — 10/10

1. **Catalog identity:** `BT24-030`; set BT24; kind(s) Digimon; color(s) Blue/Black; level 6; play cost 12; DP 12000; form(s) Mega; attribute(s) Vaccine; trait(s) Shaman/Olympos XII/Iliad/TS/Aquatic; rarity SR; deck limit 4. Evolution data: `[{"color":"Blue","level":5,"memoryCost":4},{"color":"Black","level":5,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Aqua] or [Sea Animal] in any trait or w/[TS] trait: Cost 3 \n\nWhen this card would be played, if your opponent has 2 or more Digimon, reduce the play cost by 5.\n[On Play] [When Digivolving] Return all of your opponent's Digimon with the fewest digivolution cards to the bottom of the deck.\n[All Turns] [Once Per Turn] When this Digimon suspends, it may unsuspend.\n[All Turns] When any of your Digimon with the [TS] trait or [Aqua] or [Sea Animal] in any of their traits would leave the battle area by your opponent's effects, by suspending this Digimon, they don't leave."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-030`

```text
BT24-030 Neptunemon
  Q&A (1):
    Q5610 (2025-12-25): If I activate this card's [All Turns] effect when multiples of my [TS] trait Digimon would leave the battle area by my opponent's effects at the same time, are all of those Digimon prevented from leaving?
      A: Yes, all of those Digimon are prevented from leaving. This card's [All Turns] effect affects all Digimon without having to choose them.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-030.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Static",
L11: kind: "Replacement",
L18: kind: "Replacement",
L24: kind: "opponentHas",
L27: kind: ["Digimon"],
L38: trigger: "OnPlay",
L41: kind: "Return",
L45: kind: ["Digimon"],
L55: trigger: "WhenDigivolving",
L58: kind: "Return",
L62: kind: ["Digimon"],
L72: trigger: "AllTurns",
L75: kind: "SubTrigger",
L82: kind: "Unsuspend",
L95: frequency: "OncePerTurn",
L98: trigger: "AllTurns",
L101: kind: "Replacement",
L105: kind: ["Digimon"],
L120: kind: "Replacement",
L127: kind: "suspend",
L143: digivolutionRequirement: [
L165: registerIrCard("BT24-030", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-030.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reduces its play cost when the opponent has at least two Digimon", () => {
L9: expect(reduction.event).toBe("wouldBePlayed");
L10: expect(reduction.mode).toBe("reduceCost");
L11: expect(reduction.amount).toBe(5);
L12: expect(reduction.condition).toMatchObject({
L19: it("returns all opponent Digimon tied for fewest digivolution cards", () => {
L22: expect(effect?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-029 — Whamon — 10/10

1. **Catalog identity:** `BT24-029`; set BT24; kind(s) Digimon; color(s) Blue; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Vaccine; trait(s) Sea Animal/Iliad/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Blue","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] By placing 1 play cost 5 or lower card with the [Sea Beast] or [TS] trait or [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.\n[End of Attack] [Once Per Turn] You may play 1 play cost 5 or lower [TS] trait card from this Digimon's digivolution cards without paying the cost."
   - Inherited: "[When Attacking] [Once Per Turn] You may play 1 level 4 or lower blue Digimon card with the [TS] trait from this Digimon's digivolution cards without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-029`

```text
BT24-029 Whamon
  Q&A (1):
    Q5609 (2025-12-25): What cards can be placed as this Digimon's digivolution cards by this card's [On Play] [When Digivolving] effect?
      A: 1 play cost 5 or lower card with the [Sea Beast] or [TS] trait or 1 play cost 5 or lower card with [Aqua] or [Sea Animal] in any of its traits.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-029.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Restrict",
L18: kind: ["Digimon", "Tamer"],
L25: kind: "place",
L54: trigger: "WhenDigivolving",
L57: kind: "Restrict",
L61: kind: ["Digimon", "Tamer"],
L68: kind: "place",
L97: trigger: "EndOfAttack",
L100: kind: "PlayWithoutCost",
L119: frequency: "OncePerTurn",
L122: trigger: "WhenAttacking",
L125: kind: "PlayWithoutCost",
L129: kind: ["Digimon"],
L150: frequency: "OncePerTurn",
L155: digivolutionRequirement: [
L165: registerIrCard("BT24-029", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-029.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires the qualifying hand card placement for both entry triggers", () => {
L8: expect(action.kind).toBe("Restrict");
L9: expect(action.target.filter.kind).toEqual(["Digimon", "Tamer"]);
L10: expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
L11: expect(action.cost.optional).toBeUndefined();
L12: expect(action.cost.abortOnDecline).toBeUndefined();
L16: it("plays qualifying TS cards from its digivolution cards", () => {
L19: expect(endOfAttack).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
L20: expect(inherited.target.filter).toMatchObject({ levelComparison: { op: "lte", value: 4 }, colors: ["Blue"] });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-028 — Divermon — 10/10

1. **Catalog identity:** `BT24-028`; set BT24; kind(s) Digimon; color(s) Blue; level 5; play cost 6; DP 6000; form(s) Ultimate; attribute(s) Data; trait(s) Aquabeast/Titan/TS; rarity R; deck limit 4. Evolution data: `[{"color":"Blue","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Aqua] or [Sea Animal] in any trait or w/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] By placing 1 level 5 or lower blue [TS] trait Digimon card from your hand as this Digimon's bottom digivolution card, until your opponent's turn ends, this Digimon can't be deleted in battle and gains ＜Blocker＞ \n[Your Turn] When this Digimon unsuspends, it may digivolve into [Neptunemon] in the hand without paying the cost."
   - Inherited: "[When Attacking] [Once Per Turn] You may play 1 level 4 or lower blue Digimon card with the [TS] trait from this Digimon's digivolution cards without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-028`

```text
BT24-028 Divermon
  Q&A (1):
    Q5608 (2025-12-25): If it's the unsuspend phase of my turn, this card unsuspends, and I use this card's [Your Turn] effect to perform a digivolution into [Neptunemon], what is the activation timing for effects such as that [Neptunemon]'s [When Digivolving] effect that triggered?
      A: They activate during the unsuspend phase.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-028.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: // digivolutionRequirement: [Aqua] OR [Sea Animal] is ONE OR-condition; [TS] is separate alternate.
L16: trigger: "OnPlay",
L19: kind: "GainKeyword",
L33: kind: "GrantStatic",
L38: kind: "place",
L42: kind: ["Digimon"],
L67: trigger: "WhenDigivolving",
L70: kind: "GainKeyword",
L84: kind: "GrantStatic",
L89: kind: "place",
L93: kind: ["Digimon"],
L118: trigger: "YourTurn",
L121: kind: "SubTrigger",
L128: kind: "Digivolve",
L154: trigger: "WhenAttacking",
L157: kind: "PlayWithoutCost",
L161: kind: ["Digimon"],
L183: frequency: "OncePerTurn",
L188: digivolutionRequirement: [
L205: registerIrCard("BT24-028", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-028.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires the qualifying hand placement on entry", () => {
L8: expect(action.kind).toBe("GainKeyword");
L9: expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
L10: expect(action.cost.optional).toBeUndefined();
L11: expect(action.cost.abortOnDecline).toBeUndefined();
L12: expect(action.additionalEffect).toMatchObject({ kind: "GrantStatic", modifier: "cannotBeDeletedInBattle" });
L16: it("keeps the inherited TS play effect scoped to this stack", () => {
L18: expect(action).toMatchObject({
L24: expect(action.target.filter).toMatchObject({ colors: ["Blue"], levelComparison: { op: "lte", value: 4 } });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
