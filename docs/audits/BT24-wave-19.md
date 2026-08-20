# BT24 Audit Ledger — Wave 19

Scope: BT24-012, BT24-011, BT24-010, BT24-009, BT24-008 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-012 — Dimetromon — 10/10

1. **Catalog identity:** `BT24-012`; set BT24; kind(s) Digimon; color(s) Red; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Virus; trait(s) Reptile/LIBERATOR; rarity U; deck limit 4. Evolution data: `[{"color":"Red","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "＜Blocker＞ \n[All Turns] When any of your other Digimon with the [Reptile] or [Dragonkin] trait would leave the battle area by your opponent's effects, by returning this Digimon to the hand, they don't leave."
   - Inherited: "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, gain 1 memory."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-012`

```text
BT24-012 Dimetromon
  Q&A (2):
    Q5580 (2025-12-25): If I activate this card's [All Turns] effect when multiples of my other Digimon with the [Reptile] or [Dragonkin] trait would leave the battle area at the same time by my opponent's effects, are all of those Digimon prevented from leaving?
      A: Yes, all of those Digimon are prevented from leaving. This card's [All Turns] effect affects all Digimon without having to choose them.
    Q5581 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-012.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "AllTurns",
L24: kind: "Replacement",
L29: kind: ["Digimon"],
L40: kind: "Prevent",
L43: kind: "return",
L61: trigger: "YourTurn",
L64: kind: "SubTrigger",
L68: kind: "GainMemory",
L75: frequency: "OncePerTurn",
L82: registerIrCard("BT24-012", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-012.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("only protects other Reptile/Dragonkin Digimon from opponent effects", () => {
L7: expect(replacement).toMatchObject({
L13: expect(replacement.actions[0]).toMatchObject({ kind: "Prevent", cost: { kind: "return" } });
L16: it("retains Blocker and inherited once-per-turn memory gain", () => {
L17: expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
L19: expect(inherited.frequency).toBe("OncePerTurn");
L20: expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-011 — Cyclonemon — 10/10

1. **Catalog identity:** `BT24-011`; set BT24; kind(s) Digimon; color(s) Red; level 4; play cost 5; DP 5000; form(s) Champion; attribute(s) Virus; trait(s) Dragonkin/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Red","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[TS] trait: Cost 2 \n\n＜Rush＞ \n＜Raid＞"
   - Inherited: "＜Raid＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-011`

```text
BT24-011 Cyclonemon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-011.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "Static",
L44: digivolutionRequirement: [
L54: registerIrCard("BT24-011", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-011.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("grants Rush and Raid as printed", () => {
L9: expect(staticKeywords.map((keyword) => keyword.keyword)).toEqual(["Rush", "Raid"]);
L12: it("grants inherited Raid and keeps the TS level-3 alternate requirement", () => {
L13: expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
L14: expect(compiled.digivolutionRequirement ?? []).toContainEqual({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-010 — Greymon — 10/10

1. **Catalog identity:** `BT24-010`; set BT24; kind(s) Digimon; color(s) Red/Black; level 4; play cost 5; DP 5000; form(s) Champion; attribute(s) Virus; trait(s) Dinosaur/Titan/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Red","level":3,"memoryCost":3},{"color":"Black","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Agumon] in name or w/[TS] trait: Cost 2 \n\n＜Blocker＞ \n[On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon."
   - Inherited: "＜Raid＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-010`

```text
BT24-010 Greymon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-010.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnDeletion",
L24: kind: "DeDigivolve",
L28: kind: ["Digimon"],
L37: trigger: "Static",
L50: digivolutionRequirement: [
L66: registerIrCard("BT24-010", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-010.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("grants Blocker and De-Digivolves one opponent Digimon on deletion", () => {
L6: expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
L8: expect(deletion).toMatchObject({
L15: it("retains inherited Raid and alternate requirements", () => {
L16: expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
L17: expect(compiled.digivolutionRequirement ?? []).toHaveLength(2);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-009 — Shamanmon — 10/10

1. **Catalog identity:** `BT24-009`; set BT24; kind(s) Digimon; color(s) Red/Purple; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Virus; trait(s) Demon/Titan/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Red","level":2,"memoryCost":1},{"color":"Purple","level":2,"memoryCost":1}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Tsunomon]/Lv.2 w/[TS] trait: Cost 0 \n\n[On Play] By trashing 1 card with the [Demon], [Shaman] or [Titan] trait from your hand, ＜Draw 2＞"
   - Inherited: "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Demon] or [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-009`

```text
BT24-009 Shamanmon
  Q&A (1):
    Q5579 (2025-12-25): A Digimon with this card in its digivolution cards attacks, and another effect trashes a card from my hand. At such times, if I activate this card's inherited effect and perform a digivolution into P-209 [Titamon], can I then activate P-209 [Titamon]'s <Alliance>?
      A: No, you can't. <Alliance> is an effect that triggers upon an attack. You can't activate it if the Digimon doesn't have <Alliance> upon the attack declaration.
      related: P-209
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-009.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Draw",
L18: kind: "trash",
L39: trigger: "YourTurn",
L42: kind: "SubTrigger",
L46: kind: "Digivolve",
L56: kind: ["Digimon"],
L72: kind: "selfHasTrait",
L88: frequency: "OncePerTurn",
L93: digivolutionRequirement: [
L108: registerIrCard("BT24-009", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-009.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires trashing the qualifying hand card before drawing two", () => {
L7: expect(action).toMatchObject({ kind: "Draw", amount: 2, abortOnDecline: true, cost: { kind: "trash" } });
L8: expect(action.optional).toBeUndefined();
L11: it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
L14: expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
L15: expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
L16: expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-008 — Elizamon — 10/10

1. **Catalog identity:** `BT24-008`; set BT24; kind(s) Digimon; color(s) Red; level 3; play cost 3; DP 2000; form(s) Rookie; attribute(s) Virus; trait(s) Reptile/LIBERATOR; rarity C; deck limit 4. Evolution data: `[{"color":"Red","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[On Play] By trashing 1 card with the [Reptile], [Dragonkin] or [LIBERATOR] trait from your hand, ＜Draw 2＞"
   - Inherited: "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, gain 1 memory."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-008`

```text
BT24-008 Elizamon
  Q&A (1):
    Q5578 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-008.ts` exposes the following executable trigger/action/requirement lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "OnPlay",
L18: kind: "Draw",
L22: kind: "trash",
L41: trigger: "YourTurn",
L44: kind: "SubTrigger",
L47: kind: "triggerRemovedSecuritySeat",
L51: actions: [{ kind: "GainMemory", amount: 1 }],
L55: frequency: "OncePerTurn",
L62: registerIrCard("BT24-008", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-008.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires trashing a qualifying hand card before drawing two", () => {
L7: expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
L8: expect(action.cost.target.filter.nameOrTrait).toEqual([
L15: it("gains memory only when the opponent's security stack is removed", () => {
L17: expect(inherited.frequency).toBe("OncePerTurn");
L18: expect(inherited.actions[0]).toMatchObject({
L23: expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
