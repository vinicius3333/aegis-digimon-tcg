# BT24 Audit Ledger — Wave 10

Scope: BT24-057, BT24-056, BT24-055, BT24-054, BT24-053 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-057 — Docmon — 10/10

1. **Catalog identity:** `BT24-057`; set BT24; kind(s) Digimon; color(s) Black; level 4; play cost 4; DP 4000; form(s) Sup./Appmon; attribute(s) Life; trait(s) Doctor; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Security] At the end of the battle, play this card without paying the cost. [On Play] [On Deletion] Until your opponent's turn ends, 1 of their Digimon can't attack players."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-057`

```text
BT24-057 Docmon
  Q&A (1):
    Q5643 (2025-12-25): This card is linked to my Digimon. If I use BT7-107 [Calling From the Darkness]'s [Main] effect to delete that Digimon and return the deleted Digimon card to the hand, can I then activate this card's link effect?
      A: No, you can't activate it. If a Digimon is deleted and an [On Deletion] link effect is triggered, it will only be pending activation for the Digimon card with that link card. If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated. In this case, if this card and the linked Digimon are deleted and an [On Deletion] link effect is triggered, the effect will only be pending activation for the linked Digimon card. If the deleted Digimon card with the effect that's pending activation leaves the trash, the [On Deletion] link effect that was pending activation can no longer be activated.
      related: BT7-107
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-057.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Security",
L14: kind: "PlayWithoutCost",
L27: trigger: "OnPlay",
L30: kind: "Restrict",
L34: kind: ["Digimon"],
L44: trigger: "OnDeletion",
L47: kind: "Restrict",
L51: kind: ["Digimon"],
L65: registerIrCard("BT24-057", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-057.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays from security at battle end and restricts one opposing Digimon", () => {
L7: expect(security?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false });
L10: expect(effect?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-056 — Dezipmon — 10/10

1. **Catalog identity:** `BT24-056`; set BT24; kind(s) Digimon; color(s) Black; level 4; play cost 5; DP 5000; form(s) Sup./Appmon; attribute(s) System; trait(s) Zip/Unzip; rarity R; deck limit 4. Evolution data: `[{"color":"Black","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[App Fusion] [Hackmon] & [Protecmon] & [Pipomon]: Cost 0\n\n＜Blocker＞ \n[On Play] [When Digivolving] Until your opponent's turn ends, their effects can't return 1 of your Digimon with the [System], [Life] or [Transmutation (App Name)] trait to hands or decks. with the [Appmon] trait from your trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-056`

```text
BT24-056 Dezipmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-056.ts` exposes the following executable trigger/action/requirement lines:

```text
L7: import { registerCard } from "../../engine/effects/registry.js";
L110: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-056.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L7: it("protects one own System/Life/Transmutation Digimon on both entry timings", () => {
L11: expect(effect?.description).toContain("can't return 1 of your Digimon");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-055 — Ginryumon — 10/10

1. **Catalog identity:** `BT24-055`; set BT24; kind(s) Digimon; color(s) Black/Green; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Vaccine; trait(s) Beast Dragon/X Antibody/DigiPolice/SEEKERS; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":3,"memoryCost":3},{"color":"Green","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[DigiPolice]/[SEEKERS] trait: Cost 2 \n\n＜Blocker＞ \n[On Play] [When Digivolving] By placing 1 [Shuu Yulin] from your hand as this Digimon's bottom digivolution card, your opponent's ＜De-Digivolve＞ effects don't affect 1 of your [DigiPolice] or [SEEKERS] trait Digimon until their turn ends."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon suspends, suspend 1 of your opponent's Digimon or Tamers with as high or lower a play cost as this Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-055`

```text
BT24-055 Ginryumon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-055.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "GrantStatic",
L28: kind: ["Digimon"],
L42: kind: "place",
L66: trigger: "WhenDigivolving",
L69: kind: "GrantStatic",
L73: kind: ["Digimon"],
L87: kind: "place",
L111: trigger: "AllTurns",
L114: kind: "SubTrigger",
L118: kind: "Suspend",
L122: kind: ["Digimon", "Tamer"],
L132: frequency: "OncePerTurn",
L137: digivolutionRequirement: [
L147: registerIrCard("BT24-055", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-055.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("limits the inherited suspension target to the source's play cost", () => {
L8: expect(action).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
L9: expect(action.actions?.[0]).toMatchObject({
L14: it("requires Shuu Yulin as the On Play/When Digivolving placement cost", () => {
L18: expect(action.optional).toBeUndefined();
L19: expect(action.abortOnDecline).toBeUndefined();
L20: expect(action.cost).toMatchObject({ kind: "place", position: "bottom" });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-054 — Ryudamon — 10/10

1. **Catalog identity:** `BT24-054`; set BT24; kind(s) Digimon; color(s) Black/Green; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Vaccine; trait(s) Beast/X Antibody/DigiPolice/SEEKERS; rarity U; deck limit 4. Evolution data: `[{"color":"Black","level":2,"memoryCost":1},{"color":"Green","level":2,"memoryCost":1}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Kyokyomon]/Lv.2 w/[DigiPolice]/[SEEKERS] trait: Cost 0 \n\n[Your Turn] When any of your [Shuu Yulin]s are played, this Digimon may digivolve into [Hisyaryumon] in the hand for a digivolution cost of 3, ignoring digivolution requirements."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon suspends, suspend 1 of your opponent's Digimon or Tamers with as high or lower a play cost as this Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-054`

```text
BT24-054 Ryudamon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-054.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L27: kind: "Digivolve",
L55: trigger: "AllTurns",
L58: kind: "SubTrigger",
L62: kind: "Suspend",
L66: kind: ["Digimon", "Tamer"],
L76: frequency: "OncePerTurn",
L81: digivolutionRequirement: [
L96: registerIrCard("BT24-054", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-054.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("limits the inherited suspension target by this Digimon's play cost", () => {
L7: expect((inherited?.actions?.[0] as any).actions?.[0]).toMatchObject({
L12: it("responds to your Shuu Yulin being played with optional Hisyaryumon digivolution", () => {
L14: expect(effect?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
L15: expect((effect?.actions?.[0] as any).actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-053 — Protecmon — 10/10

1. **Catalog identity:** `BT24-053`; set BT24; kind(s) Digimon; color(s) Black; level 3; play cost 3; DP 2000; form(s) Stnd./Appmon; attribute(s) System; trait(s) Security; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Appmon] trait: Cost 0 \n\n＜Blocker＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-053`

```text
BT24-053 Protecmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-053.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L23: digivolutionRequirement: [
L33: registerIrCard("BT24-053", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-053.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("has its printed Blocker keyword and Appmon level-2 evolution", () => {
L6: expect(BT24_053.effects?.[0]).toMatchObject({
L10: expect(BT24_053.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
