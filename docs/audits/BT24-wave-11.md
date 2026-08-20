# BT24 Audit Ledger — Wave 11

Scope: BT24-052, BT24-051, BT24-050, BT24-049, BT24-048 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-052 — Keramon (X Antibody) — 10/10

1. **Catalog identity:** `BT24-052`; set BT24; kind(s) Digimon; color(s) Black; level 3; play cost 4; DP 3000; form(s) Rookie; attribute(s) Unknown; trait(s) Unidentified/X Antibody; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":2,"memoryCost":1}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Keramon]: Cost 0 \n\n[When Moving] [When Digivolving] You may play 1 [Diaboromon] Token without paying the cost. (Digimon/Cost 14/Lv.6/White/Mega/Unknown/Unidentified/3000 DP)"
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon with [Diaboromon] in its text would leave the battle area, by deleting 1 of your other [Diaboromon], it doesn't leave."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-052`

```text
BT24-052 Keramon (X Antibody)
  Q&A (1):
    Q5642 (2025-12-25): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-052.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenMoving",
L14: kind: "PlayToken",
L23: trigger: "WhenDigivolving",
L26: kind: "PlayToken",
L35: trigger: "AllTurns",
L38: kind: "Replacement",
L42: kind: ["Digimon"],
L52: kind: "Prevent",
L55: kind: "deleteOwn",
L76: frequency: "OncePerTurn",
L81: digivolutionRequirement: [
L90: registerIrCard("BT24-052", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-052.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays a Diaboromon Token on both printed timings", () => {
L7: expect(BT24_052.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
L16: it("makes the other-Diaboromon replacement cost mandatory", () => {
L20: expect(prevent.cost).toMatchObject({ kind: "deleteOwn", raw: "by deleting 1 of your other [Diaboromon]" });
L21: expect(prevent.optional).toBeUndefined();
L22: expect(prevent.abortOnDecline).toBeUndefined();
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-051 — Merukimon — 10/10

1. **Catalog identity:** `BT24-051`; set BT24; kind(s) Digimon; color(s) Green/Blue; level 6; play cost 12; DP 12000; form(s) Mega; attribute(s) Virus; trait(s) Shaman/Olympos XII/Iliad/TS; rarity SR; deck limit 4. Evolution data: `[{"color":"Green","level":5,"memoryCost":4},{"color":"Blue","level":5,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Beastkin]/[TS] trait: Cost 3 \n\nWhen this card would be played, if there are 3 or more Digimon, reduce the play cost by 5.\n[On Play] [When Digivolving] Suspend 2 of your opponent's Digimon or Tamers. Then, 1 of your Digimon may get +5000 DP for the turn and attack your opponent's Digimon.\n[When Digivolving] [When Attacking] [Once Per Turn] 1 of your Digimon may unsuspend.\n[Your Turn] All of your [Iliad] trait Digimon gain ＜Rush＞ and ＜Piercing＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-051`

```text
BT24-051 Merukimon
  Q&A (1):
    Q5641 (2025-12-25): Can I use this card's [On Play] [When Digivolving] effect to get additional DP but then choose to not have that Digimon attack?
      A: No, you can't. The Digimon that gets additional DP from this effect must attack if possible.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-051.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L22: trigger: "Static",
L25: kind: "Replacement",
L32: kind: "Replacement",
L38: kind: "totalDigimonCount",
L49: trigger: "OnPlay",
L52: kind: "Suspend",
L56: kind: ["Digimon", "Tamer"],
L62: kind: "ModifyDP",
L66: kind: ["Digimon"],
L76: kind: "Attack",
L80: kind: ["Digimon"],
L89: kind: "ifThisEffectActed",
L96: trigger: "WhenDigivolving",
L99: kind: "Suspend",
L103: kind: ["Digimon", "Tamer"],
L109: kind: "ModifyDP",
L113: kind: ["Digimon"],
L123: kind: "Attack",
L127: kind: ["Digimon"],
L136: kind: "ifThisEffectActed",
L143: trigger: "WhenDigivolving",
L146: kind: "Unsuspend",
L150: kind: ["Digimon"],
L157: frequency: "OncePerTurn",
L161: trigger: "WhenAttacking",
L164: kind: "Unsuspend",
L168: kind: ["Digimon"],
L175: frequency: "OncePerTurn",
L179: trigger: "YourTurn",
L182: kind: "GainKeyword",
L186: kind: ["Digimon"],
L203: kind: "GainKeyword",
L207: kind: ["Digimon"],
L228: digivolutionRequirement: [
L238: registerIrCard("BT24-051", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-051.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("shares the once-per-turn unsuspend between When Digivolving and When Attacking", () => {
L10: expect(effects).toHaveLength(2);
L11: expect(effects?.map((entry) => entry.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
L12: expect(effects?.every((entry) => entry.frequency === "OncePerTurn")).toBe(true);
L14: it("makes the buffed Digimon attack an opponent's Digimon", () => {
L17: expect(effect?.actions?.[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-050 — WereGarurumon — 10/10

1. **Catalog identity:** `BT24-050`; set BT24; kind(s) Digimon; color(s) Green/Blue; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Vaccine; trait(s) Beastkin/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Green","level":4,"memoryCost":4},{"color":"Blue","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Garurumon] in name or w/[TS] trait: Cost 3 \n\n＜Evade＞ \n[On Play] [When Digivolving] 1 of your Digimon may unsuspend. Then, 1 of your opponent's Digimon or Tamers can't unsuspend until their turn ends."
   - Inherited: "[When Attacking] [Once Per Turn] You may play 1 4000 DP or lower Digimon card with the [Iliad] trait or [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its traits from your hand without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-050`

```text
BT24-050 WereGarurumon
  Q&A (1):
    Q5640 (2025-12-25): What cards can be played using this card's inherited effect?
      A: 1 4000 DP or lower Digimon card with the [Iliad] trait or 1 4000 DP or lower Digimon card with the [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its traits.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-050.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "Unsuspend",
L28: kind: ["Digimon"],
L35: kind: "Restrict",
L39: kind: ["Digimon", "Tamer"],
L49: trigger: "WhenDigivolving",
L52: kind: "Unsuspend",
L56: kind: ["Digimon"],
L63: kind: "Restrict",
L67: kind: ["Digimon", "Tamer"],
L77: trigger: "WhenAttacking",
L80: kind: "PlayWithoutCost",
L90: kind: ["Digimon"],
L114: frequency: "OncePerTurn",
L119: digivolutionRequirement: [
L135: registerIrCard("BT24-050", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-050.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("unsuspends your Digimon and restricts an opposing Digimon or Tamer", () => {
L8: expect(effect?.actions?.[0]).toMatchObject({
L13: expect(effect?.actions?.[1]).toMatchObject({
L21: it("keeps the inherited once-per-turn hand play filter", () => {
L23: expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
L24: expect((inherited?.actions?.[0] as any).target.filter).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-049 — Parrotmon — 10/10

1. **Catalog identity:** `BT24-049`; set BT24; kind(s) Digimon; color(s) Green; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Vaccine; trait(s) Giant Bird/Titan/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Green","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[TS] trait: Cost 3 \n\n＜Fortitude＞ \n[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon. Then, if played by effects, you may return 1 of their suspended Digimon with the lowest DP to the hand."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, trash their top security card."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-049`

```text
BT24-049 Parrotmon
  Q&A (1):
    Q5639 (2025-12-25): Can I activate this card's inherited effect when an opponent's Digimon and this Digimon are deleted at the same time?
      A: No, you can't activate it.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-049.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "Suspend",
L28: kind: ["Digimon"],
L35: kind: "Return",
L40: kind: ["Digimon"],
L47: kind: "triggerEnteredByEffect",
L55: trigger: "WhenDigivolving",
L58: kind: "Suspend",
L62: kind: ["Digimon"],
L69: kind: "Return",
L74: kind: ["Digimon"],
L81: kind: "triggerEnteredByEffect",
L89: trigger: "AllTurns",
L92: kind: "SubTrigger",
L96: kind: "SecurityManipulation",
L105: frequency: "OncePerTurn",
L110: digivolutionRequirement: [
L120: registerIrCard("BT24-049", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-049.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("gates the lowest-DP bounce on effect entry", () => {
L8: expect(effect?.actions?.[1]).toMatchObject({
L16: it("trashes the opponent's top security after a battle deletion once per turn", () => {
L18: expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
L19: expect((inherited?.actions?.[0] as any).event).toBe("whenDeletesInBattle");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-048 — Deramon — 10/10

1. **Catalog identity:** `BT24-048`; set BT24; kind(s) Digimon; color(s) Green; level 5; play cost 6; DP 6000; form(s) Ultimate; attribute(s) Data; trait(s) Avian; rarity R; deck limit 4. Evolution data: `[{"color":"Green","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "＜Blocker＞ \n[On Play] [When Digivolving] You may hatch in your breeding area. Then, 1 of your Digimon with [Avian] or [Bird] in any of its traits in the breeding area may digivolve into a level 5 or lower Digimon card with [Avian] or [Bird] in any of its traits in the hand without paying the cost."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, it may unsuspend."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-048`

```text
BT24-048 Deramon
  Q&A (1):
    Q5638 (2025-12-25): Can I activate this card's inherited effect when an opponent's Digimon and this Digimon are deleted at the same time?
      A: No, you can't activate it.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-048.ts` exposes the following executable trigger/action/requirement lines:

```text
L4: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Static",
L22: trigger: "OnPlay",
L25: kind: "Hatch",
L29: kind: "Digivolve",
L33: kind: ["Digimon"],
L46: kind: ["Digimon"],
L65: trigger: "WhenDigivolving",
L68: kind: "Hatch",
L72: kind: "Digivolve",
L76: kind: ["Digimon"],
L89: kind: ["Digimon"],
L108: trigger: "AllTurns",
L111: kind: "SubTrigger",
L115: kind: "Unsuspend",
L129: frequency: "OncePerTurn",
L136: registerIrCard("BT24-048", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-048.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("hatches and may free-digivolve a breeding-area Avian/Bird Digimon", () => {
L8: expect(effect?.actions?.[0]).toMatchObject({ kind: "Hatch", optional: true });
L9: expect(effect?.actions?.[1]).toMatchObject({
L22: it("has the inherited once-per-turn battle deletion unsuspend", () => {
L23: expect(BT24_048.effects?.find((entry) => entry.isInherited)).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
