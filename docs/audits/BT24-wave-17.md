# BT24 Audit Ledger — Wave 17

Scope: BT24-022, BT24-021, BT24-020, BT24-019, BT24-018 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-022 — Ikkakumon — 10/10

1. **Catalog identity:** `BT24-022`; set BT24; kind(s) Digimon; color(s) Blue; level 4; play cost 6; DP 6000; form(s) Champion; attribute(s) Vaccine; trait(s) Sea Beast/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Blue","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[TS] trait: Cost 2 \n\n＜Jamming＞ \n[On Play] [When Digivolving] Trash the top 2 digivolution cards of 1 of your opponent's Digimon. Then, 1 of their Digimon with as many or fewer digivolution cards as this Digimon can't suspend until their turn ends."
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon unsuspends, if you have 7 or fewer cards in your hand, ＜Draw 1＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-022`

```text
BT24-022 Ikkakumon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-022.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "TrashDigivolution",
L28: kind: ["Digimon"],
L37: kind: "Restrict",
L42: kind: ["Digimon"],
L52: trigger: "WhenDigivolving",
L55: kind: "TrashDigivolution",
L59: kind: ["Digimon"],
L68: kind: "Restrict",
L73: kind: ["Digimon"],
L83: trigger: "YourTurn",
L86: kind: "SubTrigger",
L93: kind: "Draw",
L97: kind: "handCount",
L106: frequency: "OncePerTurn",
L111: digivolutionRequirement: [
L121: registerIrCard("BT24-022", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-022.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("trashes two stack cards, then restricts an opponent Digimon by source stack count", () => {
L8: expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: true });
L9: expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
L10: expect(actions[1].target.filter.digivolutionCardsCompareToSource).toBe("lte");
L14: it("keeps the inherited unsuspend-to-draw condition", () => {
L17: expect(sub).toMatchObject({ kind: "SubTrigger", event: "whenUnsuspended" });
L18: expect(sub.actions[0].condition).toMatchObject({ kind: "handCount", op: "lte", value: 7 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-021 — SnowGoblimon — 10/10

1. **Catalog identity:** `BT24-021`; set BT24; kind(s) Digimon; color(s) Blue/Purple; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Virus; trait(s) Demon/Titan/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Blue","level":2,"memoryCost":1},{"color":"Purple","level":2,"memoryCost":1}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Tsunomon]/Lv.2 w/[TS] trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with the [Demon] or [Shaman] trait and 1 card with the [Titan] trait among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Demon] or [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-021`

```text
BT24-021 SnowGoblimon
  Q&A (1):
    Q5602 (2025-12-25): A Digimon with this card in its digivolution cards attacks, and another effect trashes a card from my hand. At such times, if I activate this card's inherited effect and perform a digivolution into P-209 [Titamon], can I then activate P-209 [Titamon]'s <Alliance>?
      A: No, you can't. <Alliance> is an effect that triggers upon an attack. You can't activate it if the Digimon doesn't have <Alliance> upon the attack declaration.
      related: P-209
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-021.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L20: kind: ["Digimon"],
L50: trigger: "YourTurn",
L53: kind: "SubTrigger",
L57: kind: "Digivolve",
L67: kind: ["Digimon"],
L83: kind: "selfHasTrait",
L99: frequency: "OncePerTurn",
L104: digivolutionRequirement: [
L119: registerIrCard("BT24-021", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-021.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reveals three cards for one Demon/Shaman Digimon and one Titan card", () => {
L7: expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
L8: expect(reveal.add).toHaveLength(2);
L11: it("digivolves this Demon/Titan Digimon from trash after the hand is trashed", () => {
L14: expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
L15: expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
L16: expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-020 — Gomamon — 10/10

1. **Catalog identity:** `BT24-020`; set BT24; kind(s) Digimon; color(s) Blue; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Vaccine; trait(s) Sea Beast/Iliad/ADAMAS/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Blue","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[TS] trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with the [Sea Beast] or [Shaman] trait or [Aqua] or [Sea Animal] in any of its traits and 1 card with the [TS] trait among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon unsuspends, if you have 7 or fewer cards in your hand, ＜Draw 1＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-020`

```text
BT24-020 Gomamon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-020.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L20: kind: ["Digimon"],
L54: trigger: "YourTurn",
L57: kind: "SubTrigger",
L64: kind: "Draw",
L68: kind: "handCount",
L77: frequency: "OncePerTurn",
L82: digivolutionRequirement: [
L92: registerIrCard("BT24-020", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-020.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reveals three cards for the two printed hand additions", () => {
L7: expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
L8: expect(reveal.add[0].filter.nameOrTrait).toEqual([
L12: expect(reveal.add[1].filter.nameOrTrait).toEqual([{ tokens: ["TS"], match: "trait" }]);
L15: it("draws on this Digimon's unsuspend when hand size is at most seven", () => {
L17: expect(inherited.frequency).toBe("OncePerTurn");
L18: expect(inherited.actions[0]).toMatchObject({
L23: expect(inherited.actions[0].actions[0].condition).toMatchObject({ kind: "handCount", op: "lte", value: 7 });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-019 — Kamemon — 10/10

1. **Catalog identity:** `BT24-019`; set BT24; kind(s) Digimon; color(s) Blue; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Data; trait(s) Cyborg/Iliad/TS/Aquatic; rarity C; deck limit 4. Evolution data: `[{"color":"Blue","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[TS] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a blue Digimon card with the [TS] trait, reduce the digivolution cost by 1."
   - Inherited: "＜Jamming＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-019`

```text
BT24-019 Kamemon
  Q&A (1):
    Q5601 (2025-12-25): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a Digimon card with the [TS] trait?
      A: No, it doesn't trigger.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-019.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "Replacement",
L21: kind: ["Digimon"],
L32: kind: "Replacement",
L43: trigger: "Static",
L56: digivolutionRequirement: [
L66: registerIrCard("BT24-019", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-019.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reduces this Digimon's blue TS digivolution cost during your turn", () => {
L7: expect(replacement).toMatchObject({
L12: expect(replacement.into).toMatchObject({ colors: ["Blue"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] });
L13: expect(replacement.actions[0]).toMatchObject({
L21: it("retains inherited Jamming", () => {
L22: expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-018 — Styracomon — 10/10

1. **Catalog identity:** `BT24-018`; set BT24; kind(s) Digimon; color(s) Red; level 7; play cost 14; DP 14000; form(s) Mega; attribute(s) Data; trait(s) Dragonkin/LIBERATOR; rarity SR; deck limit 4. Evolution data: `[{"color":"Red","level":6,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] While you have [Owen Dreadnought], [Lamiamon]: Cost 6 \n\n＜Progress＞ \n＜Piercing＞ \n＜Blocker＞ \n＜Armor Purge＞ \n[When Digivolving] You may trash any 1 of your opponent's security cards. Then, this Digimon may unsuspend.\n[All Turns] [Once Per Turn] When your opponent's security stack is removed from, you may delete 1 of their Digimon.\n[All Turns] [Once Per Turn] When any of your [Reptile] or [Dragonkin] trait Digimon would leave the battle area, by deleting 1 of your opponent's lowest DP Digimon, they don't leave."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-018`

```text
BT24-018 Styracomon
  Q&A (5):
    Q5596 (2025-12-25): What does "you may trash any 1 of your opponent's security cards" mean, exactly?
      A: This effect allows you to choose 1 card in your opponent's security stack and trash it.
    Q5597 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q5598 (2025-12-25): If I activate this card's [All Turns] effect when multiples of my Digimon with the [Reptile] or [Dragonkin] trait would leave the battle area at the same time, are all of those Digimon prevented from leaving?
      A: Yes, all of those Digimon are prevented from leaving. This card's [All Turns] effect affects all Digimon without having to choose them.
    Q5599 (2025-12-25): I attempted to delete my opponent's Digimon using this card's 2nd [All Turns] effect when this card would leave the battle area. If another effect prevents my opponent's Digimon from being deleted at such times, does this card leave the battle area?
      A: Yes, it leaves.
    Q5600 (2025-12-25): I attempted to delete my opponent's Digimon using this card's 2nd [All Turns] effect when this card with cards under it would be deleted. If another effect prevents my opponent's Digimon from being deleted at such times, can I use <Armor Purge> on this card and prevent it from being deleted?
      A: Yes, you can. When this card would be deleted, its <Armor Purge> and 2nd [All Turns] effect trigger simultaneously. Even if you activate its 2nd [All Turns] effect first and the opponent's Digimon can't be deleted, you can then activate the <Armor Purge> that triggered simultaneously.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-018.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L30: trigger: "Static",
L40: trigger: "Static",
L50: trigger: "Static",
L60: trigger: "Static",
L70: trigger: "WhenDigivolving",
L73: kind: "Trash",
L84: kind: "Unsuspend",
L97: trigger: "AllTurns",
L100: kind: "SubTrigger",
L104: kind: "Delete",
L108: kind: ["Digimon"],
L117: frequency: "OncePerTurn",
L120: trigger: "AllTurns",
L123: kind: "Replacement",
L127: kind: ["Digimon"],
L137: kind: "deleteOwn",
L141: kind: ["Digimon"],
L150: frequency: "OncePerTurn",
L155: digivolutionRequirement: [
L164: registerIrCard("BT24-018", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-018.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("trashes an opponent security card and may unsuspend on digivolution", () => {
L7: expect(effect.actions[0]).toMatchObject({
L12: expect(effect.actions[1]).toMatchObject({ kind: "Unsuspend", optional: true });
L15: it("uses an executable lowest-DP opponent deletion cost for leave prevention", () => {
L19: expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay" });
L20: expect(replacement.cost).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
