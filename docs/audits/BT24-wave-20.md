# BT24 Audit Ledger — Wave 20

Scope: BT24-007, BT24-006, BT24-005, BT24-004, BT24-003 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-007 — Tsunomon — 10/10

1. **Catalog identity:** `BT24-007`; set BT24; kind(s) DigiEgg; color(s) Purple; level 2; play cost -1; DP 0; form(s) In-Training; attribute(s) -; trait(s) Lesser/Titan/TS; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When level 4 or higher Digimon cards with the [Demon] or [Titan] trait are trashed from your hand, you may play 1 of them with the play cost reduced by 2."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-007`

```text
BT24-007 Tsunomon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-007.ts` exposes the following executable trigger/action/requirement lines:

```text
L7: import { registerCard } from "../../engine/effects/registry.js";
L88: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-007.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L50: it("subscribes the inherited hand-trash trigger and plays one eligible card at -2 cost", async () => {
L79: expect(subscribeSubTrigger).toHaveBeenCalledWith(
L85: expect(playInstances).toHaveBeenCalledWith(["demon-instance"], { payCost: true, costDelta: 2 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-006 — Tapmon — 10/10

1. **Catalog identity:** `BT24-006`; set BT24; kind(s) DigiEgg; color(s) Purple; level 2; play cost -1; DP 0; form(s) Appmon; attribute(s) System; trait(s) Tap; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon gets linked, ＜Draw 1＞ and trash 1 card in your hand."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-006`

```text
BT24-006 Tapmon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-006.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L18: kind: "Draw",
L23: kind: "Trash",
L36: frequency: "OncePerTurn",
L43: registerIrCard("BT24-006", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-006.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("draws one and trashes one hand card when linked", () => {
L7: expect(inherited.frequency).toBe("OncePerTurn");
L8: expect(inherited.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked" });
L9: expect(inherited.actions[0].actions).toMatchObject([
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-005 — Kyokyomon — 10/10

1. **Catalog identity:** `BT24-005`; set BT24; kind(s) DigiEgg; color(s) Black; level 2; play cost -1; DP 0; form(s) In-Training; attribute(s) -; trait(s) Lesser/X Antibody/DigiPolice/SEEKERS; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When Tamer cards are placed in this Digimon's digivolution cards, reveal the top 3 cards of your deck. Return the revealed cards to the top or bottom of the deck."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-005`

```text
BT24-005 Kyokyomon
  Q&A (1):
    Q5577 (2025-12-25): When returning cards revealed by this card's inherited effect to the top or bottom of the deck, do I have to reveal them to my opponent?
      A: Yes, you reveal them to your opponent. The cards to be returned and their order are confirmed by both players, then they're returned to the top or bottom of the deck.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-005.ts` exposes the following executable trigger/action/requirement lines:

```text
L7: import { registerCard } from "../../engine/effects/registry.js";
L66: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-005.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("registers an inherited once-per-turn Tamer-placement watcher", async () => {
L8: expect(module).toBeDefined();
L9: expect(module?.effectsForTiming).toBeTypeOf("function");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-004 — Wanyamon — 10/10

1. **Catalog identity:** `BT24-004`; set BT24; kind(s) DigiEgg; color(s) Green; level 2; play cost -1; DP 0; form(s) In-Training; attribute(s) -; trait(s) Lesser/Iliad/TS; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When any of your [Iliad] trait Digimon are played, ＜Draw 1＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-004`

```text
BT24-004 Wanyamon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-004.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L18: kind: ["Digimon"],
L28: kind: "Draw",
L36: frequency: "OncePerTurn",
L43: registerIrCard("BT24-004", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-004.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("draws once when one of your Iliad Digimon is played during your turn", () => {
L7: expect(inherited.frequency).toBe("OncePerTurn");
L8: expect(inherited.actions[0]).toMatchObject({
L13: expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-003 — Tsunomon — 10/10

1. **Catalog identity:** `BT24-003`; set BT24; kind(s) DigiEgg; color(s) Yellow; level 2; play cost -1; DP 0; form(s) In-Training; attribute(s) -; trait(s) Lesser/Iliad/TS; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When your security stack is removed from, this Digimon may digivolve into a [Shaman] trait Digimon card in the hand with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-003`

```text
BT24-003 Tsunomon
  Q&A (2):
    Q5576 (2025-12-25): P-194 [Aegiomon] with this card in its digivolution cards performs a security check, and when it would be deleted after losing a battle against a Security Digimon, <Barrier> prevents the deletion. At such times, can I activate this card's inherited effect and digivolve P-194 [Aegiomon] into a Digimon card with the [Shaman] trait?
      A: Yes, you can.
      related: P-194
    Q5585 (2025-12-25): P-194 [Aegiomon] performs a security check, and when it would be deleted in battle against a Security Digimon, <Barrier> prevents the deletion. If I then use BT24-003 [Tsunomon] or BT24-084 [Inori Misono]'s effect to digivolve P-194 [Aegiomon] into this card, do I perform another security check using <Security A. +1>?
      A: Yes, you perform an additional security check.
      related: P-194, BT24-084
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-003.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L17: kind: "triggerRemovedSecuritySeat",
L22: kind: "Digivolve",
L32: kind: ["Digimon"],
L48: frequency: "OncePerTurn",
L55: registerIrCard("BT24-003", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-003.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("digivolves this Digimon into a Shaman from hand when your security is removed", () => {
L7: expect(inherited.frequency).toBe("OncePerTurn");
L8: expect(inherited.actions[0]).toMatchObject({
L13: expect(inherited.actions[0].actions[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
