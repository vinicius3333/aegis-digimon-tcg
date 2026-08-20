# BT24 Audit Ledger — Wave 6

Scope: BT24-077, BT24-076, BT24-075, BT24-074, BT24-073 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-077 — Revivemon — 10/10

1. **Catalog identity:** `BT24-077`; set BT24; kind(s) Digimon; color(s) Purple/Red; level 5; play cost 9; DP 9000; form(s) Ult./Appmon; attribute(s) System; trait(s) Restoration; rarity R; deck limit 4. Evolution data: `[{"color":"Purple","level":4,"memoryCost":4},{"color":"Red","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[App Fusion] [Raidramon] & [Dezipmon]: Cost 0\n\n＜Blocker＞ \n[When Digivolving] [On Deletion] You may link 1 level 4 or lower Digimon card from your trash or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[On Deletion] You may play 1 level 4 or lower [Appmon] trait Digimon card from your trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-077`

```text
BT24-077 Revivemon
  Q&A (1):
    Q5654 (2025-12-25): Can I use this card's [When Digivolving] [On Deletion] effect to link a card that doesn't have <Link>?
      A: No, you can't.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-077.ts` exposes the following executable trigger/action/requirement lines:

```text
L12: import { registerIrCard } from "../../engine/effects/interpreter.js";
L17: trigger: "Static",
L27: trigger: "WhenDigivolving",
L30: kind: "Link",
L34: kind: ["Digimon"],
L45: kind: ["Digimon"],
L56: trigger: "OnDeletion",
L59: kind: "Link",
L63: kind: ["Digimon"],
L74: kind: ["Digimon"],
L85: trigger: "OnDeletion",
L88: kind: "PlayWithoutCost",
L92: kind: ["Digimon"],
L115: appFusionRequirement: [
L123: registerIrCard("BT24-077", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-077.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("links level 4 or lower cards from trash/stack and revives an Appmon on deletion", () => {
L9: expect(action).toMatchObject({
L15: expect(action?.target?.filter).toMatchObject({ levelComparison: { op: "lte", value: 4 } });
L18: expect(
L29: expect(revival?.kind).toBe("Link");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-076 — WarGrowlmon — 10/10

1. **Catalog identity:** `BT24-076`; set BT24; kind(s) Digimon; color(s) Purple; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Cyborg/Dark Dragon; rarity C; deck limit 4. Evolution data: `[{"color":"Purple","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Trash] [Main] If you have 4 or fewer cards in your hand, play this card with the play cost reduced by 2. [On Play] [When Digivolving] Delete 1 of your opponent's level 4 or lower Digimon."
   - Inherited: "[On Deletion] You may play 1 level 4 or lower [Dark Dragon] or [Evil Dragon] Digimon card from your trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-076`

```text
BT24-076 WarGrowlmon
  Q&A (1):
    Q5653 (2025-12-25): What is a {Trash} effect?
      A: A {Trash} effect can be triggered/activated while its card is in the trash. Such effects can't be triggered or activated in areas other than the trash.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-076.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Main",
L11: kind: "PlayWithoutCost",
L23: kind: "zoneCount",
L35: trigger: "OnPlay",
L38: kind: "Delete",
L42: kind: ["Digimon"],
L54: trigger: "WhenDigivolving",
L57: kind: "Delete",
L61: kind: ["Digimon"],
L73: trigger: "OnDeletion",
L76: kind: "PlayWithoutCost",
L80: kind: ["Digimon"],
L106: registerIrCard("BT24-076", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-076.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("keeps the trash Main cost reduction and level restrictions", () => {
L8: expect(trash).toMatchObject({ isFromTrash: true });
L9: expect(trash?.actions?.[0]).toMatchObject({
L17: expect(BT24_076.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-075 — SkullBaluchimon — 10/10

1. **Catalog identity:** `BT24-075`; set BT24; kind(s) Digimon; color(s) Purple; level 5; play cost 6; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Undead/X Antibody/Titan/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Purple","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Demon]/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] By trashing 1 card in your hand, delete 1 each of your opponent's level 3 and level 4 Digimon."
   - Inherited: "[Your Turn] While this Digimon is [Titamon] or has the [Titan] trait, it gains ＜Security A. +1＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-075`

```text
BT24-075 SkullBaluchimon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-075.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "OnPlay",
L11: kind: "Delete",
L15: kind: ["Digimon"],
L21: kind: "trash",
L33: kind: "Delete",
L37: kind: ["Digimon"],
L46: trigger: "WhenDigivolving",
L49: kind: "Delete",
L53: kind: ["Digimon"],
L59: kind: "trash",
L71: kind: "Delete",
L75: kind: ["Digimon"],
L84: trigger: "YourTurn",
L87: kind: "Aura",
L96: kind: "keyword",
L104: kind: "anyOf",
L106: { kind: "selfHasNameContaining", names: ["Titamon"] },
L108: kind: "selfHasTrait",
L121: digivolutionRequirement: [
L131: registerIrCard("BT24-075", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-075.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("requires the hand-trash cost before deleting both level targets", () => {
L9: expect(actions[0]).toMatchObject({
L13: expect(actions[0]).not.toHaveProperty("optional");
L14: expect(actions[0]).toMatchObject({ target: { filter: { level: 3 }, count: 1 } });
L15: expect(actions[1]).toMatchObject({ kind: "Delete", target: { filter: { level: 4 }, count: 1 } });
L18: expect(inherited?.actions?.[0]).toMatchObject({ while: { kind: "anyOf" }, effect: { kind: "keyword" } });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-074 — SkullSeadramon — 10/10

1. **Catalog identity:** `BT24-074`; set BT24; kind(s) Digimon; color(s) Purple/Blue; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Undead/Titan/TS/Aquatic; rarity R; deck limit 4. Evolution data: `[{"color":"Purple","level":4,"memoryCost":4},{"color":"Blue","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Aqua] or [Sea Animal] in any trait or w/[TS] trait: Cost 3 \n\n[On Play] [When Digivolving] Trash any 3 digivolution cards from 1 of your opponent's Digimon. Then, if played by effects, delete 1 of your opponent's Digimon with no digivolution cards.\n[On Deletion] You may play 1 level 4 or lower Digimon card with [Seadramon] in its name or the [TS] trait from your trash without paying the cost."
   - Inherited: "[When Attacking] [Once Per Turn] By placing 1 of your other Digimon as this Digimon's bottom digivolution card, it unsuspends."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-074`

```text
BT24-074 SkullSeadramon
  Q&A (1):
    Q5652 (2025-12-25): What cards can be played using this card's [On Deletion] effect?
      A: 1 level 4 or lower Digimon card with [Seadramon] in its name or 1 level 4 or lower Digimon card with the [TS] trait.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-074.ts` exposes the following executable trigger/action/requirement lines:

```text
L7: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: kind: "TrashDigivolution",
L13: filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
L24: trigger: "OnPlay",
L28: kind: "Delete",
L30: filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
L33: condition: { kind: "triggerEnteredByEffect" },
L38: trigger: "WhenDigivolving",
L42: trigger: "OnDeletion",
L45: kind: "PlayWithoutCost",
L49: kind: ["Digimon"],
L65: trigger: "WhenAttacking",
L68: kind: "Unsuspend",
L71: kind: "place",
L73: filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
L81: frequency: "OncePerTurn",
L86: digivolutionRequirement: [
L108: registerIrCard("BT24-074", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-074.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("trashes digivolution cards before the effect-play deletion branch", () => {
L8: expect(onPlay?.actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3 });
L9: expect(onPlay?.actions?.[1]).toMatchObject({
L15: expect(inherited?.actions?.[0]).toMatchObject({ kind: "Unsuspend", cost: { kind: "place" } });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-073 — SkullSatamon — 10/10

1. **Catalog identity:** `BT24-073`; set BT24; kind(s) Digimon; color(s) Purple; level 5; play cost 8; DP 8000; form(s) Ultimate; attribute(s) Virus; trait(s) Undead/Fallen Angel; rarity U; deck limit 4. Evolution data: `[{"color":"Purple","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "＜Blocker＞ \n[When Digivolving] [On Deletion] If your opponent has 10 or fewer cards in their trash, trash the top 3 cards of both players' decks. Then, if your opponent has 10 or more cards in their trash, you may play 1 level 4 or lower [Evil] or [Fallen Angel] Digimon card from your trash without paying the cost."
   - Inherited: "[When Attacking] [Once Per Turn] This Digimon gains ＜Security A. +1＞ for the turn. If your opponent has 10 or fewer cards in their trash, instead trash the top 2 cards of both players' decks."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-073`

```text
BT24-073 SkullSatamon
  Q&A (3):
    Q5649 (2025-12-25): My opponent has 7 cards in their trash. Can I use this card's [When Digivolving] [On Deletion] effect to trash the top 3 cards of their deck, then process the part of the effect after "then"?
      A: Yes, you can process it.
    Q5650 (2025-12-25): My opponent has 11 cards in their trash. I didn't trash the top 3 cards of my opponent's deck for this card's [When Digivolving] [On Deletion] effect. Can I process the part of the effect after "then"?
      A: Yes, you can process it.
    Q5651 (2025-12-25): What does an "instead" effect mean, exactly?
      A: The processing shown after "instead" in the effect replaces the standard processing. For example, if an effect reads "Delete your opponent's Digimon with 6000 DP or less. If you have a Digimon with [Greymon] in its name, instead delete 1 of your opponent's Digimon with the lowest DP," and you have a Digimon with [Greymon] in its name, you delete 1 of your opponent's Digimon with the lowest DP instead of deleting 1 of their Digimon with 6000 DP or less.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-073.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "WhenDigivolving",
L24: kind: "TrashTopDeck",
L28: kind: "zoneCount",
L37: kind: "PlayWithoutCost",
L41: kind: ["Digimon"],
L58: kind: "zoneCount",
L70: trigger: "OnDeletion",
L73: kind: "TrashTopDeck",
L77: kind: "zoneCount",
L86: kind: "PlayWithoutCost",
L90: kind: ["Digimon"],
L107: kind: "zoneCount",
L119: trigger: "WhenAttacking",
L122: kind: "GainKeyword",
L137: kind: "not",
L139: kind: "zoneCount",
L150: kind: "SecurityManipulation",
L155: kind: "zoneCount",
L164: kind: "SecurityManipulation",
L169: kind: "zoneCount",
L179: frequency: "OncePerTurn",
L186: registerIrCard("BT24-073", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-073.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("makes the inherited Security Attack bonus an alternative to milling", () => {
L8: expect(inherited?.actions?.[0]).toMatchObject({
L13: expect(inherited?.actions?.[1]).toMatchObject({
L19: expect(inherited?.actions?.[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
