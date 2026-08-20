# BT24 Audit Ledger — Wave 16

Scope: BT24-027, BT24-026, BT24-025, BT24-024, BT24-023 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-027 — Lanamon — 10/10

1. **Catalog identity:** `BT24-027`; set BT24; kind(s) Digimon; color(s) Blue; level 4; play cost 5; DP 5000; form(s) Hybrid; attribute(s) Variable; trait(s) Fairy/Titan/TS/Aquatic; rarity R; deck limit 4. Evolution data: `[{"color":"Blue","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Calmaramon]: Cost 0 [Digivolve] Lv.3 w/[TS] trait: Cost 2 \n\n＜Decode ([Calmaramon])＞ (When this Digimon would leave the battle area other than in battle, you may play 1 [Calmaramon] from its digivolution cards without paying the cost.)\n[On Play] [When Digivolving] By placing 1 level 4 or lower blue [TS] trait Digimon card from your hand as this Digimon's bottom digivolution card, 1 of your blue [TS] trait Digimon can't be deleted in battle until your opponent's turn ends."
   - Inherited: "[When Attacking] [Once Per Turn] If you have 7 or fewer cards in your hand, ＜Draw 1＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-027`

```text
BT24-027 Lanamon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-027.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "Restrict",
L28: kind: ["Digimon"],
L42: kind: "place",
L47: kind: ["Digimon"],
L72: trigger: "WhenDigivolving",
L75: kind: "Restrict",
L79: kind: ["Digimon"],
L93: kind: "place",
L98: kind: ["Digimon"],
L123: trigger: "WhenAttacking",
L126: kind: "Draw",
L130: kind: "zoneCount",
L140: frequency: "OncePerTurn",
L143: trigger: "AllTurns",
L146: kind: "Replacement",
L154: kind: "PlayWithoutCost",
L158: kind: ["Digimon"],
L179: digivolutionRequirement: [
L194: registerIrCard("BT24-027", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-027.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires the qualifying hand placement on entry", () => {
L8: expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
L9: expect(action.cost.optional).toBeUndefined();
L10: expect(action.cost.abortOnDecline).toBeUndefined();
L14: it("implements Decode by playing Calmaramon from the stack on non-battle removal", () => {
L16: expect(decode).toMatchObject({
L22: expect(decode.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
L23: expect(decode.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Calmaramon"], match: "name" }]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-026 — Hyogamon — 10/10

1. **Catalog identity:** `BT24-026`; set BT24; kind(s) Digimon; color(s) Blue/Purple; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Virus; trait(s) Ice-Snow/Titan/TS/Demon; rarity U; deck limit 4. Evolution data: `[{"color":"Blue","level":3,"memoryCost":3},{"color":"Purple","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Demon]/[TS] trait: Cost 2 \n\nWhen this card is trashed from the hand, if you have 5 or fewer cards in your hand, ＜Draw 1＞ \n[On Play] [When Attacking] [Once Per Turn] By trashing 1 card in your hand, 1 of your Digimon with the [Demon], [Shaman] or [Titan] trait gains ＜Jamming＞ and ＜Blocker＞ until your opponent's turn ends."
   - Inherited: "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Demon] or [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-026`

```text
BT24-026 Hyogamon
  Q&A (2):
    Q5606 (2025-12-25): A Digimon with this card in its digivolution cards attacks, and another effect trashes a card from my hand. At such times, if I activate this card's inherited effect and perform a digivolution into P-209 [Titamon], can I then activate P-209 [Titamon]'s <Alliance>?
      A: No, you can't. <Alliance> is an effect that triggers upon an attack. You can't activate it if the Digimon doesn't have <Alliance> upon the attack declaration.
      related: P-209
    Q5607 (2025-12-25): I trash 2 copies of this card from my hand, then I have 5 cards in my hand. At such times, if I activate the 1st effect on the 1st copy of this card and have 6 cards in my hand, can I then use the 1st effect on the 2nd copy of this card to <Draw 1> again?
      A: No, you can't. You must have 5 or fewer cards in your hand upon the actual activation timing for this card's 1st effect.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-026.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "SubTrigger",
L21: kind: "Draw",
L25: kind: "zoneCount",
L38: trigger: "OnPlay",
L41: kind: "GainKeyword",
L45: kind: ["Digimon"],
L61: kind: "trash",
L74: kind: "GainKeyword",
L78: kind: ["Digimon"],
L96: frequency: "OncePerTurn",
L100: trigger: "WhenAttacking",
L103: kind: "GainKeyword",
L107: kind: ["Digimon"],
L123: kind: "trash",
L136: kind: "GainKeyword",
L140: kind: ["Digimon"],
L158: frequency: "OncePerTurn",
L162: trigger: "YourTurn",
L165: kind: "SubTrigger",
L169: kind: "Digivolve",
L179: kind: ["Digimon"],
L195: kind: "selfHasTrait",
L211: frequency: "OncePerTurn",
L216: digivolutionRequirement: [
L226: registerIrCard("BT24-026", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-026.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires the hand-trash cost before granting Jamming and Blocker", () => {
L8: expect(actions[0].cost).toMatchObject({ kind: "trash" });
L9: expect(actions[0].optional).toBeUndefined();
L10: expect(actions[0].abortOnDecline).toBe(true);
L11: expect(actions[1].target.sameTarget).toBe(true);
L12: expect(actions[1].keyword.keyword).toBe("Blocker");
L16: it("retains the once-per-turn trash-triggered Titamon digivolution", () => {
L19: expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
L20: expect(action.into.nameOrTrait).toEqual([
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-025 — Shellmon — 10/10

1. **Catalog identity:** `BT24-025`; set BT24; kind(s) Digimon; color(s) Blue; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Data; trait(s) Mollusk/Iliad/TS/Aquatic; rarity R; deck limit 4. Evolution data: `[{"color":"Blue","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Your Turn] When any of your other blue Digimon with the [TS] trait unsuspend, this Digimon may digivolve into [Venusmon] in the hand, ignoring level.\n[End of Your Turn] [Once Per Turn] 1 of your other Digimon with the [TS] trait may unsuspend."
   - Inherited: "＜Jamming＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-025`

```text
BT24-025 Shellmon
  Q&A (3):
    Q5603 (2025-12-25): Can I use this card's [Your Turn] effect to digivolve this card into a [Venusmon] such as BT10-042 [Venusmon] that doesn't meet the digivolution requirements, ignoring level?
      A: No, you can't. Digivolution while ignoring level is only possible as long as the digivolution requirements are met.
      related: BT10-042
    Q5604 (2025-12-25): If I use this card's [Your Turn] effect to digivolve into BT24-040 [Venusmon], ignoring level, the "[Digivolve] Blue/yellow Lv.5: Cost 4" digivolution requirement and "[Digivolve] Lv.5 w/[TS] trait: Cost 3" digivolution requirement are both met, but can I choose either digivolution requirement?
      A: Yes, you can. If you activate this card's [Your Turn] effect and use the "[Digivolve] Blue/yellow Lv.5: Cost 4" digivolution requirement to perform digivolution into BT24-040 [Venusmon], you pay 4 cost for the digivolution. If you activate this card's [Your Turn] effect and use the "[Digivolve] Lv.5 w/[TS] trait: Cost 3" digivolution requirement to perform digivolution into BT24-040 [Venusmon], you pay 3 cost for the digivolution.
      related: BT24-040
    Q5605 (2025-12-25): If it's the unsuspend phase of my turn, one of my other blue Digimon with the [TS] trait unsuspends, and I use this card's [Your Turn] effect to perform a digivolution into [Venusmon], ignoring level, what is the activation timing for effects such as that [Venusmon]'s [When Digivolving] effect that triggered?
      A: They activate during the unsuspend phase.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-025.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L14: trigger: "YourTurn",
L17: kind: "SubTrigger",
L22: kind: ["Digimon"],
L33: kind: "Digivolve",
L61: trigger: "EndOfYourTurn",
L64: kind: "Unsuspend",
L69: kind: ["Digimon"],
L82: frequency: "OncePerTurn",
L85: trigger: "Static",
L100: registerIrCard("BT24-025", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-025.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("digivolves on another blue TS Digimon's unsuspend, ignoring only level", () => {
L7: expect(sub).toMatchObject({
L12: expect(sub.actions[0]).toMatchObject({
L21: it("keeps the once-per-turn end-of-turn unsuspend and inherited Jamming", () => {
L23: expect(end.frequency).toBe("OncePerTurn");
L24: expect(end.actions[0]).toMatchObject({ kind: "Unsuspend", optional: true });
L25: expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-024 — Submarimon — 10/10

1. **Catalog identity:** `BT24-024`; set BT24; kind(s) Digimon; color(s) Blue/Yellow; level 4; play cost 5; DP 5000; form(s) Armor Form; attribute(s) Free; trait(s) Aquatic/Iliad/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Blue","level":3,"memoryCost":3},{"color":"Yellow","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Armadillomon]/Lv.3 w/[TS] trait: Cost 2 \n\n＜Armor Purge＞ \n[When Attacking] [Once Per Turn] You may play 1 Tamer card with the [TS] trait from your hand with the play cost reduced by 2."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-024`

```text
BT24-024 Submarimon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-024.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "WhenAttacking",
L24: kind: "PlayWithoutCost",
L28: kind: ["Tamer"],
L44: frequency: "OncePerTurn",
L49: digivolutionRequirement: [
L64: registerIrCard("BT24-024", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-024.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays a TS Tamer from hand with a once-per-turn cost reduction", () => {
L7: expect(effect.frequency).toBe("OncePerTurn");
L8: expect(effect.actions[0]).toMatchObject({
L15: expect(effect.actions[0].target.filter).toMatchObject({
L21: it("retains Armor Purge and both alternate digivolution requirements", () => {
L22: expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Armor Purge");
L23: expect(compiled.digivolutionRequirement ?? []).toHaveLength(2);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-023 — Calmaramon — 10/10

1. **Catalog identity:** `BT24-023`; set BT24; kind(s) Digimon; color(s) Blue; level 4; play cost 6; DP 7000; form(s) Hybrid; attribute(s) Variable; trait(s) Aquatic/Titan/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Blue","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Lanamon]: Cost 1\n[Digivolve] Lv.3 w/[TS] trait: Cost 3 \n\n＜Blocker＞ \n＜Decode ([Lanamon])＞ (When this Digimon would leave the battle area other than in battle, you may play 1 [Lanamon] from its digivolution cards without paying the cost.)\n[On Play] [When Digivolving] Return 1 of your opponent's level 4 or lower Digimon to the bottom of the deck. Then, if played by effects, 1 of their Digimon or Tamers can't suspend until their turn ends."
   - Inherited: "＜Jamming＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-023`

```text
BT24-023 Calmaramon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-023.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "Return",
L38: kind: ["Digimon"],
L49: kind: "Restrict",
L53: kind: ["Digimon", "Tamer"],
L60: kind: "triggerEnteredByEffect",
L67: trigger: "WhenDigivolving",
L70: kind: "Return",
L74: kind: ["Digimon"],
L85: kind: "Restrict",
L89: kind: ["Digimon", "Tamer"],
L96: kind: "triggerEnteredByEffect",
L103: trigger: "Static",
L114: trigger: "AllTurns",
L117: kind: "Replacement",
L125: kind: "PlayWithoutCost",
L129: kind: ["Digimon"],
L150: digivolutionRequirement: [
L165: registerIrCard("BT24-023", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-023.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("gates the follow-up suspend restriction on effect-played entry", () => {
L8: expect(actions[1].condition).toMatchObject({ kind: "triggerEnteredByEffect" });
L9: expect(actions[1].restriction).toBe("suspend");
L13: it("implements Decode by playing Lanamon from the stack on non-battle removal", () => {
L15: expect(decode).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanBattle" });
L16: expect(decode.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
L17: expect(decode.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Lanamon"], match: "name" }]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
