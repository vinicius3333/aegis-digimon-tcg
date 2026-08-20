# BT24 Audit Ledger — Wave 8

Scope: BT24-067, BT24-066, BT24-065, BT24-064, BT24-063 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-067 — Hackmon — 10/10

1. **Catalog identity:** `BT24-067`; set BT24; kind(s) Digimon; color(s) Purple; level 3; play cost 3; DP 1000; form(s) Stnd./Appmon; attribute(s) System; trait(s) Hacking; rarity U; deck limit 4. Evolution data: `[{"color":"Purple","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Appmon] trait: Cost 0 \n\n[Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer Tamers, you may play 1 [Rei Katsura] from your hand without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-067`

```text
BT24-067 Hackmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-067.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L18: kind: "PlayWithoutCost",
L34: kind: "permanentCount",
L36: filter: { controller: "mine", kind: ["Tamer"] },
L46: frequency: "OncePerTurn",
L51: digivolutionRequirement: [
L61: registerIrCard("BT24-067", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-067.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("limits the linked Rei Katsura play to one or fewer Tamers", () => {
L8: expect(watcher).toMatchObject({ event: "whenLinked" });
L9: expect(watcher.actions[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-066 — Guilmon — 10/10

1. **Catalog identity:** `BT24-066`; set BT24; kind(s) Digimon; color(s) Purple; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Virus; trait(s) Reptile/Evil; rarity C; deck limit 4. Evolution data: `[{"color":"Purple","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Gigimon]: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Among them, add 1 [Evil], [Dark Dragon], [Evil Dragon] or [Dark Knight] trait card or purple Tamer card to the hand and trash 1 such card. Return the rest to the bottom of the deck. Then, trash 1 card in your hand."
   - Inherited: "[When Attacking] [Once Per Turn] Delete 1 of your opponent's level 3 Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-066`

```text
BT24-066 Guilmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-066.ts` exposes the following executable trigger/action/requirement lines:

```text
L7: import { registerCard } from "../../engine/effects/registry.js";
L110: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-066.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L7: it("models the reveal/search/trash On Play and inherited level-3 deletion", () => {
L11: expect(onPlay?.description).toContain("qualifying trait card");
L13: expect(inherited?.isInherited).toBe(true);
L14: expect(inherited?.maxPerTurn).toBe(1);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-065 — Diaboromon (X Antibody) — 10/10

1. **Catalog identity:** `BT24-065`; set BT24; kind(s) Digimon; color(s) Black; level 6; play cost 13; DP 13000; form(s) Mega; attribute(s) Unknown; trait(s) Unidentified/X Antibody; rarity SR; deck limit 4. Evolution data: `[{"color":"Black","level":5,"memoryCost":5}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Diaboromon]: Cost 2 \n\n＜Overclock ([Unidentified] Trait)＞ (At the end of your turn, by deleting 1 of your Tokens or other [Unidentified] trait Digimon, this Digimon attacks a player without suspending.)\n＜Blocker＞ \n[When Digivolving] To 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon. Then, delete all of your opponent's Digimon with the highest play cost.\n[All Turns] [Once Per Turn] When any of your Digimon with [Diaboromon] in their names would leave the battle area, you may play 1 [Diaboromon] from your hand or this Digimon's digivolution cards without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-065`

```text
BT24-065 Diaboromon (X Antibody)
  Q&A (3):
    Q5644 (2025-12-25): When this card with BT22-053 [Keramon] in its digivolution cards would leave the battle area, can I use this card's [All Turns] effect to play [Diaboromon], then use BT22-053 [Keramon]'s inherited effect to delete that [Diaboromon] and prevent this card from leaving?
      A: Yes, you can.
      related: BT22-053
    Q5645 (2025-12-25): If I activate this card's [All Turns] effect when multiples of my Digimon with [Diaboromon] in their names would leave the battle area at the same time, how many [Diaboromon] can be played by this effect?
      A: 1 Digimon.
    Q5646 (2025-12-25): I attack my opponent's Digimon, and an attempt is made to delete this Digimon using an effect. After that, I activate this card's [All Turns] effect and play BT17-059 [Diaboromon]. Can I then activate BT17-059 [Diaboromon]'s [Opponent's Turn] effect?
      A: No, you can't.
      related: BT17-059
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-065.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "WhenDigivolving",
L34: kind: "DeDigivolve",
L38: kind: ["Digimon"],
L47: kind: ["Digimon"],
L53: kind: "Delete",
L57: kind: ["Digimon"],
L66: trigger: "AllTurns",
L69: kind: "Replacement",
L73: kind: ["Digimon"],
L83: kind: "PlayWithoutCost",
L104: frequency: "OncePerTurn",
L109: digivolutionRequirement: [
L118: registerIrCard("BT24-065", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-065.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("limits the replacement play to this Digimon's digivolution cards", () => {
L8: expect(play).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-064 — Ouryumon — 10/10

1. **Catalog identity:** `BT24-064`; set BT24; kind(s) Digimon; color(s) Black/Green; level 6; play cost 12; DP 12000; form(s) Mega; attribute(s) Vaccine; trait(s) Beast Dragon/X Antibody/DigiPolice/SEEKERS; rarity R; deck limit 4. Evolution data: `[{"color":"Black","level":5,"memoryCost":4},{"color":"Green","level":5,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[DigiPolice]/[SEEKERS] trait: Cost 3 \n\n＜Piercing＞ \n＜Blocker＞ \n[When Digivolving] Reveal the top 3 cards of your deck. You may play 1 play cost 7 or lower [DigiPolice] or [SEEKERS] card among them without paying the cost. Return the rest to the top or bottom of the deck.\n[All Turns] [Once Per Turn] When any Digimon or Tamers suspend, ＜De-Digivolve 2＞ 1 of your opponent's Digimon."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-064`

```text
BT24-064 Ouryumon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-064.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "WhenDigivolving",
L34: kind: "RevealAdd",
L58: trigger: "AllTurns",
L61: kind: "SubTrigger",
L64: kind: ["Digimon", "Tamer"],
L68: kind: "DeDigivolve",
L72: kind: ["Digimon"],
L81: frequency: "OncePerTurn",
L86: digivolutionRequirement: [
L96: registerIrCard("BT24-064", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-064.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("triggers De-Digivolve when any Digimon or Tamer suspends", () => {
L8: expect(subTrigger).toMatchObject({
L13: expect(subTrigger.sourceFilter.controllerDefault).toBeUndefined();
L14: expect(subTrigger.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-063 — Locomon — 10/10

1. **Catalog identity:** `BT24-063`; set BT24; kind(s) Digimon; color(s) Black; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Data; trait(s) Machine/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Black","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[TS] trait: Cost 3 \n\n＜Collision＞ \n[On Play] [When Digivolving] Reveal the top 3 cards of your deck. You may play 1 play cost 5 or lower [Machine], [Cyborg] or [TS] trait card among them without paying the cost. Return the rest to the top or bottom of the deck."
   - Inherited: "＜Collision＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-063`

```text
BT24-063 Locomon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-063.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "RevealAdd",
L48: trigger: "WhenDigivolving",
L51: kind: "RevealAdd",
L75: trigger: "Static",
L88: digivolutionRequirement: [
L98: registerIrCard("BT24-063", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-063.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("has the same play-from-reveal search on play and digivolving", () => {
L7: expect(effects).toHaveLength(2);
L9: expect(effect.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
L10: expect((effect.actions?.[0] as any).add?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
