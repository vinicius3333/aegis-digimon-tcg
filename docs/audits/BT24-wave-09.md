# BT24 Audit Ledger — Wave 9

Scope: BT24-062, BT24-061, BT24-060, BT24-059, BT24-058 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-062 — MasterBlimpmon — 10/10

1. **Catalog identity:** `BT24-062`; set BT24; kind(s) Digimon; color(s) Black/Blue; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Data; trait(s) Machine/Iliad/TS; rarity R; deck limit 4. Evolution data: `[{"color":"Black","level":4,"memoryCost":4},{"color":"Blue","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Machine]/[Cyborg]/[TS]: Cost 3 \n\n＜Blocker＞ \n＜Armor Purge＞ \n[End of Attack] [End of Opponent's Turn] [Once Per Turn] You may play 1 play cost 5 or lower card with the [Machine], [Cyborg] or [TS] trait from this Digimon's digivolution cards without paying the cost."
   - Inherited: "[Your Turn] This Digimon's attack target can't change."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-062`

```text
BT24-062 MasterBlimpmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-062.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "EndOfAttack",
L34: kind: "PlayWithoutCost",
L54: frequency: "OncePerTurn",
L58: trigger: "EndOfOpponentsTurn",
L61: kind: "PlayWithoutCost",
L81: frequency: "OncePerTurn",
L85: trigger: "YourTurn",
L88: kind: "Restrict",
L105: digivolutionRequirement: [
L115: registerIrCard("BT24-062", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-062.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays the qualifying card from this Digimon's stack at either shared timing", () => {
L7: expect(effects).toHaveLength(2);
L9: expect(effect.frequency).toBe("OncePerTurn");
L10: expect(effect.sharedUseKey).toBe("ir-shared-0");
L11: expect(effect.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"] });
L12: expect((effect.actions?.[0] as any).target.source).toBe("thisDigimon");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-061 — Vademon — 10/10

1. **Catalog identity:** `BT24-061`; set BT24; kind(s) Digimon; color(s) Black; level 5; play cost 6; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Alien/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] Return 1 of your opponent's play cost 3 or lower Digimon or Tamers to the top of the deck."
   - Inherited: "[When Attacking] [Once Per Turn] ＜De-Digivolve 1＞ 1 of your opponent's Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-061`

```text
BT24-061 Vademon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-061.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Return",
L18: kind: ["Digimon", "Tamer"],
L28: trigger: "WhenDigivolving",
L31: kind: "Return",
L35: kind: ["Digimon", "Tamer"],
L45: trigger: "WhenAttacking",
L48: kind: "DeDigivolve",
L52: kind: ["Digimon"],
L60: frequency: "OncePerTurn",
L65: digivolutionRequirement: [
L75: registerIrCard("BT24-061", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-061.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("returns a low-play-cost opponent Digimon or Tamer to deck top", () => {
L7: expect(effects).toHaveLength(2);
L9: expect(effect.actions?.[0]).toMatchObject({
L16: expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-060 — Hisyaryumon — 10/10

1. **Catalog identity:** `BT24-060`; set BT24; kind(s) Digimon; color(s) Black/Green; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Vaccine; trait(s) Beast Dragon/X Antibody/DigiPolice/SEEKERS; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":4,"memoryCost":4},{"color":"Green","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[DigiPolice]/[SEEKERS] trait: Cost 3 \n\n[When Attacking] Reveal the top 3 cards of your deck. This Digimon may digivolve into a [DigiPolice] or [SEEKERS] trait Digimon card among them without paying the cost. Return the rest to the top or bottom of the deck.\n[All Turns] When Tamer cards are placed in this Digimon's digivolution cards, suspend 1 of your opponent's Digimon. Then, this Digimon may attack your opponent's Digimon."
   - Inherited: "[All Turns] [Once Per Turn] When any of your [DigiPolice] or [SEEKERS] trait Digimon would leave the battle area, by playing 1 [DigiPolice] or [SEEKERS] trait Tamer card from this Digimon's digivolution cards without paying the cost, they don't leave."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-060`

```text
BT24-060 Hisyaryumon
  Q&A (1):
    Q5782 (2026-02-06): If I activate this card's inherited effect when multiples of my Digimon with the [DigiPolice] or [SEEKERS] trait would leave the battle area at the same time, are all of those Digimon prevented from leaving?
      A: Yes, all of those Digimon are prevented from leaving. This card's inherited effect affects all Digimon without having to choose them.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-060.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L16: trigger: "WhenAttacking",
L19: kind: "RevealAdd",
L24: kind: ["Digimon"],
L48: trigger: "AllTurns",
L51: kind: "SubTrigger",
L55: kind: ["Tamer"],
L60: kind: "Suspend",
L64: kind: ["Digimon"],
L70: kind: "Attack",
L86: trigger: "AllTurns",
L89: kind: "Replacement",
L93: kind: ["Digimon"],
L104: kind: "Prevent",
L109: kind: "playWithoutCost",
L113: kind: ["Tamer"],
L131: frequency: "OncePerTurn",
L136: digivolutionRequirement: [
L147: registerIrCard("BT24-060", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-060.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("captures the printed reveal, suspension, attack, and replacement structure", () => {
L9: expect(attack?.actions?.[0]).toMatchObject({
L16: expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
L17: expect((inherited?.actions?.[0] as any).affectsAll).toBe(true);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-059 — Sharkmon — 10/10

1. **Catalog identity:** `BT24-059`; set BT24; kind(s) Digimon; color(s) Black/Blue; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Cyborg/Titan/TS/Aquatic; rarity R; deck limit 4. Evolution data: `[{"color":"Black","level":4,"memoryCost":4},{"color":"Blue","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Aqua] or [Sea Animal] in any trait or w/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. \n[On Deletion] Reveal the top 3 cards of your deck. You may play 1 play cost 7 or lower [TS] trait card suspended among them without paying the cost. Trash the rest."
   - Inherited: "[When Attacking] [Once Per Turn] By placing 1 of your other Digimon as this Digimon's bottom digivolution card, it unsuspends."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-059`

```text
BT24-059 Sharkmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-059.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "DeDigivolve",
L18: kind: ["Digimon"],
L27: trigger: "WhenDigivolving",
L30: kind: "DeDigivolve",
L34: kind: ["Digimon"],
L43: trigger: "OnDeletion",
L46: kind: "RevealAdd",
L71: trigger: "WhenAttacking",
L74: kind: "Unsuspend",
L83: kind: "place",
L88: kind: ["Digimon"],
L100: frequency: "OncePerTurn",
L105: digivolutionRequirement: [
L127: registerIrCard("BT24-059", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-059.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("makes the inherited placement-and-unsuspend effect mandatory", () => {
L8: expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
L9: expect(action).toMatchObject({ kind: "Unsuspend", target: { filter: { isSelfRef: true } } });
L10: expect(action.optional).toBeUndefined();
L11: expect(action.abortOnDecline).toBeUndefined();
L12: expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-058 — Blimpmon — 10/10

1. **Catalog identity:** `BT24-058`; set BT24; kind(s) Digimon; color(s) Black; level 4; play cost 5; DP 5000; form(s) Champion; attribute(s) Data; trait(s) Machine/Iliad/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Black","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[TS] trait: Cost 2 \n\n[On Play] [When Digivolving] Reveal the top 3 cards of your deck. Among them, add 1 [Machine], [Cyborg] or [TS] Digimon card or Tamer card to the hand or place it as any of your [Machine], [Cyborg] or [TS] trait Digimon's bottom digivolution card. Return the rest to the top or bottom of the deck."
   - Inherited: "＜Reboot＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-058`

```text
BT24-058 Blimpmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-058.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L19: kind: ["Digimon"],
L29: orFilters: [{ kind: ["Tamer"] }],
L35: kind: ["Digimon"],
L52: trigger: "WhenDigivolving",
L55: kind: "RevealAdd",
L60: kind: ["Digimon"],
L70: orFilters: [{ kind: ["Tamer"] }],
L76: kind: ["Digimon"],
L93: trigger: "Static",
L106: digivolutionRequirement: [
L116: registerIrCard("BT24-058", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-058.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("searches the two printed destination branches on play and digivolving", () => {
L7: expect(effects).toHaveLength(2);
L10: expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
L13: expect(reveal.add).toHaveLength(1);
L14: expect(reveal.add[0]).toMatchObject({
L19: expect(BT24_058.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Reboot");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
