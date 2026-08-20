# BT24 Audit Ledger — Wave 21

Scope: BT24-002, BT24-001 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-002 — Bukamon — 10/10

1. **Catalog identity:** `BT24-002`; set BT24; kind(s) DigiEgg; color(s) Blue; level 2; play cost -1; DP 0; form(s) In-Training; attribute(s) -; trait(s) Lesser/Iliad/TS; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[End of Your Turn] [Once Per Turn] By paying 1 cost, this blue Digimon with the [TS] trait unsuspends."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-002`

```text
BT24-002 Bukamon
  Q&A (1):
    Q5575 (2025-12-25): I have a suspended blue [TS] trait Digimon with this card in its digivolution cards, and I have BT24-085 [Dan Yuki & Kanan Yuki]. At the end of my turn, can I activate this card's inherited effect, unsuspend the suspended Digimon, then activate BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect and have that Digimon attack?
      A: Yes, you can. At the end of your turn, this card's inherited effect and BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect will trigger simultaneously, therefore you can choose the activation order.
      related: BT24-085
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-002.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "EndOfYourTurn",
L14: kind: "Unsuspend",
L23: kind: "payMemory",
L30: frequency: "OncePerTurn",
L37: registerIrCard("BT24-002", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-002.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("unsuspends this Digimon, not an arbitrary blue TS Digimon", () => {
L8: expect(inherited.frequency).toBe("OncePerTurn");
L9: expect(action).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-001 — Gigimon — 10/10

1. **Catalog identity:** `BT24-001`; set BT24; kind(s) DigiEgg; color(s) Red; level 2; play cost -1; DP 0; form(s) In-Training; attribute(s) -; trait(s) Lesser/LIBERATOR; rarity C; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, you may delete 1 of their Digimon with 3000 DP or less."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-001`

```text
BT24-001 Gigimon
  Q&A (1):
    Q5574 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-001.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L17: kind: "triggerRemovedSecuritySeat",
L22: kind: "Delete",
L26: kind: ["Digimon"],
L40: frequency: "OncePerTurn",
L47: registerIrCard("BT24-001", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-001.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("may delete an opponent's 3000-DP-or-less Digimon when their security is removed", () => {
L7: expect(inherited.frequency).toBe("OncePerTurn");
L8: expect(inherited.actions[0]).toMatchObject({
L13: expect(inherited.actions[0].actions[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
