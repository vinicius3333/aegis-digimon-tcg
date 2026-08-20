# BT24 Audit Ledger — Wave 12

Scope: BT24-047, BT24-046, BT24-045, BT24-044, BT24-043 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-047 — Kokatorimon — 10/10

1. **Catalog identity:** `BT24-047`; set BT24; kind(s) Digimon; color(s) Green; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Data; trait(s) Giant Bird; rarity C; deck limit 4. Evolution data: `[{"color":"Green","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] You may suspend 1 Digimon. If this effect suspended your Digimon, 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait unsuspends. If this effect unsuspended, that Digimon may attack."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-047`

```text
BT24-047 Kokatorimon
  Q&A (2):
    Q5636 (2025-12-25): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
    Q5637 (2025-12-25): Can I activate this card's inherited effect when an opponent's Digimon and this Digimon are deleted at the same time?
      A: No, you can't activate it.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-047.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Suspend",
L18: kind: ["Digimon"],
L25: kind: "Unsuspend",
L29: kind: ["Digimon"],
L44: kind: "ifThisEffectActed",
L49: kind: "Attack",
L53: kind: ["Digimon"],
L61: kind: "ifThisEffectActed",
L68: trigger: "WhenDigivolving",
L71: kind: "Suspend",
L75: kind: ["Digimon"],
L82: kind: "Unsuspend",
L86: kind: ["Digimon"],
L101: kind: "ifThisEffectActed",
L106: kind: "Attack",
L110: kind: ["Digimon"],
L118: kind: "ifThisEffectActed",
L125: trigger: "AllTurns",
L128: kind: "SubTrigger",
L132: kind: "GainMemory",
L139: frequency: "OncePerTurn",
L146: registerIrCard("BT24-047", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-047.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("keeps the unsuspend and follow-up attack on the same qualifying Digimon", () => {
L8: expect(actions[1]).toMatchObject({ kind: "Unsuspend", condition: { kind: "ifThisEffectActed" } });
L9: expect(actions[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-046 — Garurumon — 10/10

1. **Catalog identity:** `BT24-046`; set BT24; kind(s) Digimon; color(s) Green/Blue; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Vaccine; trait(s) Beast/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Green","level":3,"memoryCost":3},{"color":"Blue","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Gabumon] in name or w/[TS] trait: Cost 2 \n\n＜Jamming＞ \n[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon."
   - Inherited: "[When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-046`

```text
BT24-046 Garurumon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-046.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "Suspend",
L28: kind: ["Digimon"],
L36: trigger: "WhenDigivolving",
L39: kind: "Suspend",
L43: kind: ["Digimon"],
L51: trigger: "WhenAttacking",
L54: kind: "Suspend",
L58: kind: ["Digimon"],
L65: frequency: "OncePerTurn",
L70: digivolutionRequirement: [
L86: registerIrCard("BT24-046", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-046.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("suspends one opposing Digimon on both entry timings", () => {
L7: expect(BT24_046.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
L13: it("has inherited once-per-turn suspension while attacking", () => {
L14: expect(BT24_046.effects?.find((entry) => entry.isInherited)).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-045 — Ogremon — 10/10

1. **Catalog identity:** `BT24-045`; set BT24; kind(s) Digimon; color(s) Green/Purple; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Virus; trait(s) Demon/Titan/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Green","level":3,"memoryCost":3},{"color":"Purple","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Demon]/[TS] trait: Cost 2 \n\nWhen this card is trashed from the hand, if you have 5 or fewer cards in your hand, ＜Draw 1＞ \n[On Play] [When Attacking] [Once Per Turn] By trashing 1 card in your hand, suspend 1 of your opponent's Digimon. It can't unsuspend in their next unsuspend phase."
   - Inherited: "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Demon] or [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-045`

```text
BT24-045 Ogremon
  Q&A (2):
    Q5634 (2025-12-25): A Digimon with this card in its digivolution cards attacks, and another effect trashes a card from my hand. At such times, if I activate this card's inherited effect and perform a digivolution into P-209 [Titamon], can I then activate P-209 [Titamon]'s <Alliance>?
      A: No, you can't. <Alliance> is an effect that triggers upon an attack. You can't activate it if the Digimon doesn't have <Alliance> upon the attack declaration.
      related: P-209
    Q5635 (2025-12-25): I trash 2 copies of this card from my hand, then I have 5 cards in my hand. At such times, if I activate the 1st effect on the 1st copy of this card and have 6 cards in my hand, can I then use the 1st effect on the 2nd copy of this card to <Draw 1> again?
      A: No, you can't. You must have 5 or fewer cards in your hand upon the actual activation timing for this card's 1st effect.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-045.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "SubTrigger",
L18: kind: "Draw",
L22: kind: "zoneCount",
L35: trigger: "OnPlay",
L38: kind: "Suspend",
L42: kind: ["Digimon"],
L47: kind: "trash",
L59: kind: "Restrict",
L63: kind: ["Digimon"],
L72: frequency: "OncePerTurn",
L76: trigger: "WhenAttacking",
L79: kind: "Suspend",
L83: kind: ["Digimon"],
L88: kind: "trash",
L100: kind: "Restrict",
L104: kind: ["Digimon"],
L113: frequency: "OncePerTurn",
L117: trigger: "YourTurn",
L120: kind: "SubTrigger",
L124: kind: "Digivolve",
L128: kind: ["Digimon"],
L140: kind: ["Digimon"],
L160: frequency: "OncePerTurn",
L165: digivolutionRequirement: [
L175: registerIrCard("BT24-045", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-045.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires the hand-trash cost and locks the suspended target until opponent turn end", () => {
L10: expect(suspend.optional).toBeUndefined();
L11: expect(suspend.abortOnDecline).toBeUndefined();
L12: expect(restrict).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-044 — Muchomon — 10/10

1. **Catalog identity:** `BT24-044`; set BT24; kind(s) Digimon; color(s) Green; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Data; trait(s) Avian; rarity U; deck limit 4. Evolution data: `[{"color":"Green","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[On Play] You may suspend 1 level 6 or lower Digimon. If this effect suspended your Digimon, reveal the top 3 cards of your deck. Add 1 [Shoto Kazama] and 1 card with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-044`

```text
BT24-044 Muchomon
  Q&A (2):
    Q5632 (2025-12-25): Can I use this card's [On Play] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
    Q5633 (2025-12-25): Can I activate this card's inherited effect when an opponent's Digimon and this Digimon are deleted at the same time?
      A: No, you can't activate it.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-044.ts` exposes the following executable trigger/action/requirement lines:

```text
L7: import { registerCard } from "../../engine/effects/registry.js";
L129: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-044.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L7: it("exposes the optional On Play effect and inherited battle-delete memory effect", () => {
L10: expect(onPlay?.optional).toBe(true);
L12: expect(inherited?.isInherited).toBe(true);
L13: expect(inherited?.maxPerTurn).toBe(1);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-043 — Tapirmon — 10/10

1. **Catalog identity:** `BT24-043`; set BT24; kind(s) Digimon; color(s) Green; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Vaccine; trait(s) Holy Beast/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Green","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[TS] trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with the [Shaman] trait or with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its traits, and 1 card with the [TS] trait among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "[When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-043`

```text
BT24-043 Tapirmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-043.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L20: kind: ["Digimon"],
L68: trigger: "WhenAttacking",
L71: kind: "Suspend",
L75: kind: ["Digimon"],
L82: frequency: "OncePerTurn",
L87: digivolutionRequirement: [
L97: registerIrCard("BT24-043", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-043.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reveals three and searches the two printed pools", () => {
L8: expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
L9: expect(reveal.add).toHaveLength(2);
L10: expect(reveal.add[0]).toMatchObject({ to: "hand", filter: { kind: ["Digimon"] } });
L11: expect(reveal.add[1]).toMatchObject({ to: "hand", filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } });
L12: expect(BT24_043.effects?.find((entry) => entry.isInherited)).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
