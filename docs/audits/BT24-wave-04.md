# BT24 Audit Ledger — Wave 4

Scope: BT24-087, BT24-086, BT24-085, BT24-084, BT24-083 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-087 — Rei Katsura — 10/10

1. **Catalog identity:** `BT24-087`; set BT24; kind(s) Tamer; color(s) Purple; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) App Driver/Appmon; rarity R; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[Your Turn] When any of your Digimon get linked, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand. Then, 1 of your Digimon may app fuse into a Digimon card with the [System], [Life] or [Transmutation (App Name)] trait in the trash."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-087`

```text
BT24-087 Rei Katsura
  Q&A (1):
    Q5675 (2025-12-25): Can I process the part of the effect after "then" in this card's [Your Turn] effect without meeting the "by" condition?
      A: No, you can't. If you don't suspend this card, you can't process the part after "then" in its [Your Turn] effect.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-087.ts` exposes the following executable trigger/action/requirement lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L17: kind: "opponentHas",
L18: filter: { controller: "opponent", kind: ["Digimon"] },
L25: trigger: "YourTurn",
L28: kind: "SubTrigger",
L32: kind: "Draw",
L36: kind: "suspend",
L42: kind: "Trash",
L46: kind: "AppFuse",
L47: source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
L50: kind: ["Digimon"],
L61: trigger: "Security",
L64: { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
L72: registerIrCard("BT24-087", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-087.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L113: it("plays the fusion-target on top of the fusing Digimon, the source sliding under it", async () => {
L122: expect(result, "the fusion must be legal (top Docmon + linked Medicmon)").toBeDefined();
L124: expect(fuser.topCard?.cardId).toBe(TARGET);
L126: expect(fuser.stack.map((c) => c.cardId)).toContain(DOCMON);
L128: expect(p0.trash.some((c) => c.instanceId === target.instanceId)).toBe(false);
L130: expect(fuser.baseDP).toBe(8000);
L133: it("DENIES the fusion when the fusing Digimon does not satisfy the target's app-fusion names", async () => {
L145: expect(result, "an illegal fusion must be refused (legality enforced server-side)").toBeUndefined();
L146: expect(fuser.topCard?.cardId).toBe(DOCMON); // unchanged
L147: expect(p0.trash.some((c) => c.instanceId === target.instanceId)).toBe(true); // still in trash
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-086 — The Crossroad Witch — 10/10

1. **Catalog identity:** `BT24-086`; set BT24; kind(s) Tamer; color(s) Black; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) SEEKERS/DigiPolice; rarity R; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Security] Play this card without paying the cost.\n[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[All Turns] When any of your Digimon are played or digivolve, you may ＜Mind Link＞ to 1 of your Digimon with [X Antibody], [DigiPolice] or [SEEKERS] trait."
   - Inherited: "[All Turns] This [X Antibody], [DigiPolice] or [SEEKERS] trait Digimon gains ＜Alliance＞ and ＜Reboot＞ \n[End of All Turns] You may play 1 [Shuu Yulin] from this Digimon's digivolution cards without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-086`

```text
BT24-086 The Crossroad Witch
  Q&A (1):
    Q5674 (2025-12-25): Can I use the [End of All Turns] effect in this card's inherited effect to play this card itself when this card is in a Digimon's digivolution cards?
      A: Yes, you can.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-086.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Security",
L14: kind: "PlayWithoutCost",
L27: trigger: "StartOfYourMainPhase",
L30: kind: "GainMemory",
L33: kind: "opponentHas",
L36: kind: ["Digimon"],
L44: trigger: "AllTurns",
L47: kind: "SubTrigger",
L51: kind: ["Digimon"],
L55: kind: "MindLink",
L59: kind: ["Digimon"],
L69: kind: "SubTrigger",
L73: kind: ["Digimon"],
L77: kind: "MindLink",
L81: kind: ["Digimon"],
L93: trigger: "AllTurns",
L96: kind: "GainKeyword",
L100: kind: ["Digimon"],
L117: kind: "GainKeyword",
L121: kind: ["Digimon"],
L141: trigger: "EndOfAllTurns",
L144: kind: "PlayWithoutCost",
L170: registerIrCard("BT24-086", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-086.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("mind-links to the correct traits and scopes the inherited play to this stack", () => {
L9: expect(action).toMatchObject({
L27: expect(inherited?.actions?.[0]).toMatchObject({ from: ["digivolutionCards"], fromOwnDigivolutionStack: true });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-085 — Dan Yuki & Kanan Yuki — 10/10

1. **Catalog identity:** `BT24-085`; set BT24; kind(s) Tamer; color(s) Green/Red; level —; play cost 4; DP 0; form(s) -; attribute(s) -; trait(s) ADAMAS/TS; rarity SR; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.\n[End of Your Turn] By suspending this Tamer, you may use 1 [TS] trait Option card with as high or lower a use cost as your opponent's memory from your hand without paying the cost. Then, 1 of your Digimon with the [TS] trait may attack."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-085`

```text
BT24-085 Dan Yuki & Kanan Yuki
  Q&A (11):
    Q5575 (2025-12-25): I have a suspended blue [TS] trait Digimon with this card in its digivolution cards, and I have BT24-085 [Dan Yuki & Kanan Yuki]. At the end of my turn, can I activate this card's inherited effect, unsuspend the suspended Digimon, then activate BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect and have that Digimon attack?
      A: Yes, you can. At the end of your turn, this card's inherited effect and BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect will trigger simultaneously, therefore you can choose the activation order.
    Q5671 (2025-12-25): What position on the memory gauge does "while you have 4 or less memory" refer to?
      A: It refers to when the memory gauge is at 4 or further to the right on your side.
    Q5672 (2025-12-25): Can I process the part of the effect after "then" in this card's [End of Your Turn] effect without meeting the "by" condition?
      A: No, you can't. If you don't suspend this card, you can't process the part after "then" in its [End of Your Turn] effect.
    Q5673 (2025-12-25): Can I use an Option card but then choose to not have my Digimon attack for this card's [End of Your Turn] effect?
      A: Yes, you can.
    Q5686 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
    Q5691 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
    Q5701 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
    Q5708 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
    Q6442 (2026-05-08): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
    Q6713 (2026-06-19): I have [BT24-085 Dan Yuki & Kanan Yuki] in my battle area. Can I play [BT25-086 Dan Yuki] with this card's [When Moving] [On Play] [When Digivolving] effect?
      A: Yes, you can.
      related: BT25-086
    Q7171 (2026-08-18): If I use this card with [BT24-085 Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect then place that used [Dan Yuki & Kanan Yuki] card as my [Aegiomon]'s bottom digivolution card, can I process the part of [BT24-085 Dan Yuki & Kanan Yuki]'s effect that follows after "then"?
      A: Yes, you can. If an effect activates, it is to be fully resolved even if the card that activated the effect is removed from that area during the processing.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-085.ts` exposes the following executable trigger/action/requirement lines:

```text
L8: import { registerCard } from "../../engine/effects/registry.js";
L180: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-085.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L116: it("registers the module", () => {
L117: expect(getEffectModule(CARD_ID)).toBeDefined();
L120: it("suspends, uses the eligible [TS] Option for free, and attacks with a [TS] Digimon", async () => {
L124: expect(effects.length).toBe(1);
L143: expect(record.suspendCalls).toEqual([["perm-tamer"]]);
L144: expect(record.useOptionCalls).toEqual([["ts-option", 2]]);
L145: expect(record.forceAttackCalls).toEqual(["ts-digimon-perm"]);
L148: it("does not pay the cost or attack when this Tamer is already suspended", async () => {
L168: expect(record.suspendCalls).toEqual([]);
L169: expect(record.useOptionCalls).toEqual([]);
L170: expect(record.forceAttackCalls).toEqual([]);
L173: it("skips the Option use when its cost exceeds the opponent's memory, but still offers the attack", async () => {
L193: expect(record.suspendCalls).toEqual([["perm-tamer"]]);
L194: expect(record.useOptionCalls).toEqual([]);
L195: expect(record.forceAttackCalls).toEqual(["ts-digimon-perm"]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-084 — Inori Misono — 10/10

1. **Catalog identity:** `BT24-084`; set BT24; kind(s) Tamer; color(s) Yellow; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity SR; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.\n[All Turns] When your security stack is removed from, by suspending this Tamer, 1 of your [Aegiomon] may digivolve into a Digimon card with [Aegiochusmon] in its name in the hand without paying the cost."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-084`

```text
BT24-084 Inori Misono
  Q&A (4):
    Q5585 (2025-12-25): P-194 [Aegiomon] performs a security check, and when it would be deleted in battle against a Security Digimon, <Barrier> prevents the deletion. If I then use BT24-003 [Tsunomon] or BT24-084 [Inori Misono]'s effect to digivolve P-194 [Aegiomon] into this card, do I perform another security check using <Security A. +1>?
      A: Yes, you perform an additional security check.
      related: P-194, BT24-003
    Q5668 (2025-12-25): What position on the memory gauge does "while you have 4 or less memory" refer to?
      A: It refers to when the memory gauge is at 4 or further to the right on your side.
    Q5669 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q5670 (2025-12-25): P-194 [Aegiomon] performs a security check, and when it would be deleted in battle against a Security Digimon, <Barrier> prevents the deletion. At such times, can I activate this card's [All Turns] effect and digivolve P-194 [Aegiomon] into a Digimon card with [Aegiochusmon] in its name?
      A: Yes, you can.
      related: P-194
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-084.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L17: kind: "memoryAtMost",
L25: trigger: "AllTurns",
L28: kind: "SubTrigger",
L31: kind: "triggerRemovedSecuritySeat",
L36: kind: "Digivolve",
L51: kind: ["Digimon"],
L63: kind: "suspend",
L80: trigger: "Security",
L83: kind: "PlayWithoutCost",
L101: registerIrCard("BT24-084", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-084.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("gains memory only at 4 or less at the start of your main phase", () => {
L6: expect(compiled.effects[0]).toMatchObject({
L18: it("reacts only to your security removal and pays the suspend cost before free digivolution", () => {
L19: expect(compiled.effects[1]).toMatchObject({
L56: it("plays itself from security without paying the cost", () => {
L57: expect(compiled.effects[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-083 — Hiroko Sagisaka — 10/10

1. **Catalog identity:** `BT24-083`; set BT24; kind(s) Tamer; color(s) Red; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity R; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 4 or less memory, by returning this Tamer to the bottom of the deck, you may play 1 [Hiroko Sagisaka] or 1 [TS] trait Digimon card with 5000 DP or less from your hand without paying the cost.\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [TS] trait among them to the hand. Return the rest to the bottom of the deck."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-083`

```text
BT24-083 Hiroko Sagisaka
  Q&A (2):
    Q5666 (2025-12-25): What position on the memory gauge does "while you have 4 or less memory" refer to?
      A: It refers to when the memory gauge is at 4 or further to the right on your side.
    Q5667 (2025-12-25): At the start of my turn, this card's [Start of Your Turn] effect plays a card. Can I then activate the [Start of Your Turn] effect on the played card?
      A: No, you can't activate it.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-083.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourTurn",
L14: kind: "PlayWithoutCost",
L18: kind: ["Tamer"],
L25: kind: ["Digimon"],
L35: kind: "memoryAtMost",
L40: kind: "return",
L57: trigger: "OnPlay",
L60: kind: "RevealAdd",
L82: trigger: "Security",
L85: kind: "PlayWithoutCost",
L103: registerIrCard("BT24-083", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-083.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("returns itself to deck bottom and offers Hiroko or a qualifying TS Digimon", () => {
L8: expect(start?.actions?.[0]).toMatchObject({
L23: expect(BT24_083.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
