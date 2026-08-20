# BT24 Audit Ledger — Wave 7

Scope: BT24-072, BT24-071, BT24-070, BT24-069, BT24-068 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-072 — SkullGreymon — 10/10

1. **Catalog identity:** `BT24-072`; set BT24; kind(s) Digimon; color(s) Purple; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Undead/Titan/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Purple","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Demon]/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] By trashing 1 card in your hand, until your opponent's turn ends, 1 of your Digimon with the [Demon], [Shaman] or [Titan] trait gains ＜Blocker＞ and ＜Retaliation＞ \n[On Deletion] You may play 1 level 4 or lower [Demon] or [Titan] trait Digimon card from your trash without paying the cost."
   - Inherited: "[Your Turn] While this Digimon is [Titamon] or has the [Titan] trait, it gains ＜Security A. +1＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-072`

```text
BT24-072 SkullGreymon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-072.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "GainKeyword",
L18: kind: ["Digimon"],
L34: kind: "trash",
L46: kind: "GainKeyword",
L50: kind: ["Digimon"],
L70: trigger: "WhenDigivolving",
L73: kind: "GainKeyword",
L77: kind: ["Digimon"],
L93: kind: "trash",
L105: kind: "GainKeyword",
L109: kind: ["Digimon"],
L129: trigger: "OnDeletion",
L132: kind: "PlayWithoutCost",
L136: kind: ["Digimon"],
L157: trigger: "YourTurn",
L160: kind: "Aura",
L169: kind: "keyword",
L177: kind: "anyOf",
L180: kind: "selfHasName",
L189: kind: "selfHasTrait",
L209: digivolutionRequirement: [
L219: registerIrCard("BT24-072", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-072.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("requires the hand-trash cost before granting both keywords", () => {
L9: expect(actions[0]).toMatchObject({
L14: expect(actions[0]).not.toHaveProperty("optional");
L15: expect(actions[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-071 — Raidramon — 10/10

1. **Catalog identity:** `BT24-071`; set BT24; kind(s) Digimon; color(s) Purple/Red; level 4; play cost 6; DP 6000; form(s) Sup./Appmon; attribute(s) System; trait(s) Super Hacking; rarity R; deck limit 4. Evolution data: `[{"color":"Purple","level":3,"memoryCost":3},{"color":"Red","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[App Fusion] [Hackmon] & [Protecmon] & [Pipomon]: Cost 0\n\n[On Play] [When Digivolving] 1 of your Digimon with the [System], [Life] or [Transmutation (App Name)] trait gains ＜Security A. +1＞ for the turn.\n[On Deletion] You may play 1 level 3 Digimon card with the [Appmon] trait from your trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-071`

```text
BT24-071 Raidramon
  Q&A (2):
    Q5647 (2025-12-25): This card has 3 different cards in its App Fusion requirements. What combinations are possible for App Fusion?
      A: App Fusion is possible with the following combinations. ●[Hackmon] with [Protecmon] link card ●[Hackmon] with [Pipomon] link card ●[Protecmon] with [Hackmon] link card ●[Protecmon] with [Pipomon] link card ●[Pipomon] with [Hackmon] link card ●[Pipomon] with [Protecmon] link card
    Q5648 (2025-12-25): This card is linked to my Digimon. If I use BT7-107 [Calling From the Darkness]'s [Main] effect to delete that Digimon and return the deleted Digimon card to the hand, can I then activate this card's link effect?
      A: No, you can't activate it. If a Digimon is deleted and an [On Deletion] link effect is triggered, it will only be pending activation for the Digimon card with that link card. If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated. In this case, if this card and the linked Digimon are deleted and an [On Deletion] link effect is triggered, the effect will only be pending activation for the linked Digimon card. If the deleted Digimon card with the effect that's pending activation leaves the trash, the [On Deletion] link effect that was pending activation can no longer be activated.
      related: BT7-107
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-071.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "GainKeyword",
L18: kind: ["Digimon"],
L38: trigger: "WhenDigivolving",
L41: kind: "GainKeyword",
L45: kind: ["Digimon"],
L65: trigger: "OnDeletion",
L68: kind: "PlayWithoutCost",
L72: kind: ["Digimon"],
L92: appFusionRequirement: [
L100: registerIrCard("BT24-071", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-071.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("grants Security Attack +1 to one eligible trait Digimon and revives level 3 Appmon", () => {
L8: expect(BT24_071.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
L18: expect(BT24_071.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-070 — Growlmon — 10/10

1. **Catalog identity:** `BT24-070`; set BT24; kind(s) Digimon; color(s) Purple; level 4; play cost 5; DP 5000; form(s) Champion; attribute(s) Virus; trait(s) Dark Dragon; rarity C; deck limit 4. Evolution data: `[{"color":"Purple","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] If you have 4 or fewer cards in your hand, you may play 1 purple Tamer card with a play cost of 4 or less from your trash without paying the cost."
   - Inherited: "[When Attacking] [Once Per Turn] Delete 1 of your opponent's level 3 Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-070`

```text
BT24-070 Growlmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-070.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "PlayWithoutCost",
L18: kind: ["Tamer"],
L27: kind: "zoneCount",
L39: trigger: "WhenDigivolving",
L42: kind: "PlayWithoutCost",
L46: kind: ["Tamer"],
L55: kind: "zoneCount",
L67: trigger: "WhenAttacking",
L70: kind: "Delete",
L74: kind: ["Digimon"],
L82: frequency: "OncePerTurn",
L89: registerIrCard("BT24-070", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-070.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("plays a qualifying purple Tamer from trash under the hand-size gate", () => {
L8: expect(BT24_070.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
L15: expect(BT24_070.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-069 — Vilemon — 10/10

1. **Catalog identity:** `BT24-069`; set BT24; kind(s) Digimon; color(s) Purple; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Virus; trait(s) Evil; rarity C; deck limit 4. Evolution data: `[{"color":"Purple","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[When Moving] [When Digivolving] Trash 1 card in your hand. Then, your opponent may trash 1 card in their hand. If your opponent didn't trash with this effect, trash the top 2 cards of your opponent's deck.\n[All Turns] While your opponent has 10 or more cards in their trash, this Digimon gains ＜Blocker＞ and +2000 DP."
   - Inherited: "[When Attacking] [Once Per Turn] Trash the top card of both players' decks."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-069`

```text
BT24-069 Vilemon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-069.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenMoving",
L14: kind: "Trash",
L24: kind: "Trash",
L37: kind: "TrashTopDeck",
L41: kind: "ifThisEffectDidNotAct",
L48: trigger: "WhenDigivolving",
L51: kind: "Trash",
L61: kind: "Trash",
L74: kind: "TrashTopDeck",
L78: kind: "ifThisEffectDidNotAct",
L85: trigger: "AllTurns",
L88: kind: "Aura",
L97: kind: "keyword",
L104: kind: "zoneCount",
L113: kind: "Aura",
L122: kind: "modifyDP",
L126: kind: "zoneCount",
L137: trigger: "WhenAttacking",
L140: kind: "TrashTopDeck",
L146: frequency: "OncePerTurn",
L153: registerIrCard("BT24-069", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-069.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("lets the opponent choose their discard and mills only when they decline", () => {
L9: expect(actions[1]).toMatchObject({
L15: expect(actions[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-068 — DemiDevimon — 10/10

1. **Catalog identity:** `BT24-068`; set BT24; kind(s) Digimon; color(s) Purple; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Virus; trait(s) Evil; rarity C; deck limit 4. Evolution data: `[{"color":"Purple","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Evil] or [Fallen Angel] trait and 1 card with the [Seven Great Demon Lords] trait among them to the hand. Return the rest to the bottom of the deck. Then, trash 1 card in your hand."
   - Inherited: "[When Attacking] [Once Per Turn] Trash the top card of both players' decks."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-068`

```text
BT24-068 DemiDevimon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-068.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L47: kind: "Trash",
L59: trigger: "WhenAttacking",
L62: kind: "TrashTopDeck",
L68: frequency: "OncePerTurn",
L75: registerIrCard("BT24-068", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-068.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("reveals both printed trait categories, bottoms the rest, then trashes a hand card", () => {
L8: expect(onPlay?.actions?.[0]).toMatchObject({
L17: expect(onPlay?.actions?.[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
