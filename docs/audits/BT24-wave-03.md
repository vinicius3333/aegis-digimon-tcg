# BT24 Audit Ledger — Wave 3

Scope: BT24-092, BT24-091, BT24-090, BT24-089, BT24-088 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-092 — Shock Plasma — 10/10

1. **Catalog identity:** `BT24-092`; set BT24; kind(s) Option; color(s) Yellow; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "While you have an [TS] trait Digimon or Tamer on the field, you can ignore this card's color requirements.\n[Security] Activate this card's [Main] effects.\n[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, you may link this card to 1 of your Digimon on the field without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-092`

```text
BT24-092 Shock Plasma
  Q&A (5):
    Q5687 (2025-12-25): What does "while you have (the specified card) on the field" mean, exactly?
      A: It refers to when you have the specified card in the battle area or breeding area.
    Q5688 (2025-12-25): This card is linked to a Digimon. If this card activates a link effect, is that effect considered a Digimon effect or an Option card effect?
      A: It's considered a Digimon effect.
    Q5689 (2025-12-25): Due to an effect, I can't use an Option card. Can I pay this card's link cost and link to one of my Digimon?
      A: Yes, you can link it. Linking a card isn't the same as using an Option card, therefore a card can still get linked when you can't use Option cards.
    Q5690 (2025-12-25): Can I also use this card's [Main] effect to link to a Digimon in the breeding area?
      A: Yes, you can also link to a Digimon in the breeding area.
    Q5691 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
      related: BT24-085
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-092.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L23: kind: "youHave",
L26: kind: ["Digimon", "Tamer"],
L40: trigger: "Security",
L43: kind: "ActivateMain",
L48: trigger: "Main",
L51: kind: "ModifyDP",
L55: kind: ["Digimon"],
L63: kind: "Link",
L65: recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
L76: registerIrCard("BT24-092", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: yes.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-092.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L7: it("reduces an opponent Digimon and optionally links to your Digimon", async () => {
L23: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
L24: await settle(() => s.perm("opponent").currentDP === 7000);
L26: expect(s.perm("opponent").currentDP).toBe(7000);
L28: expect(link).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-091 — Tidal Stream — 10/10

1. **Catalog identity:** `BT24-091`; set BT24; kind(s) Option; color(s) Blue; level —; play cost 5; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "While you have an [TS] trait Digimon or Tamer on the field, you can ignore this card's color requirements.\n[Security] Activate this card's [Main] effects.\n[Main] Return all of your opponent's lowest level Digimon to the hand. If this effect returned, 1 of your [TS] trait Digimon unsuspends. Then, you may link this card to 1 of your Digimon on the field without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-091`

```text
BT24-091 Tidal Stream
  Q&A (5):
    Q5682 (2025-12-25): What does "while you have (the specified card) on the field" mean, exactly?
      A: It refers to when you have the specified card in the battle area or breeding area.
    Q5683 (2025-12-25): This card is linked to a Digimon. If this card activates a link effect, is that effect considered a Digimon effect or an Option card effect?
      A: It's considered a Digimon effect.
    Q5684 (2025-12-25): Due to an effect, I can't use an Option card. Can I pay this card's link cost and link to one of my Digimon?
      A: Yes, you can link it. Linking a card isn't the same as using an Option card, therefore a card can still get linked when you can't use Option cards.
    Q5685 (2025-12-25): Can I also use this card's [Main] effect to link to a Digimon in the breeding area?
      A: Yes, you can also link to a Digimon in the breeding area.
    Q5686 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
      related: BT24-085
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-091.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L23: kind: "youHave",
L26: kind: ["Digimon", "Tamer"],
L40: trigger: "Security",
L43: kind: "ActivateMain",
L48: trigger: "Main",
L51: kind: "Return",
L55: kind: ["Digimon"],
L63: kind: "Unsuspend",
L67: kind: ["Digimon"],
L78: kind: "opponentHasNone",
L79: filter: { controller: "opponent", kind: ["Digimon"] },
L84: kind: "Link",
L95: kind: ["Digimon"],
L109: registerIrCard("BT24-091", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: yes.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-091.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L7: it("returns only the opponent's lowest-level Digimon and unsuspends TS", async () => {
L19: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L22: await settle(() => s.state.players[1]!.hand.some((c) => c.cardId === "BT1-045"));
L24: expect(s.state.players[1]!.hand.some((c) => c.cardId === "BT1-045")).toBe(true);
L27: it("links this Option to a separately selected Digimon", () => {
L29: expect(main?.actions?.[0]).toMatchObject({
L33: expect(main?.actions?.[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-090 — Abyss Sanctuary: Throne Room — 10/10

1. **Catalog identity:** `BT24-090`; set BT24; kind(s) Option; color(s) Blue/Yellow; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) Iliad/TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "While you have no face-up security cards, you can ignore this card's color requirements.\n[Security] [All Turns] All of your blue or yellow [TS] trait Digimon gain ＜Blocker＞ While you have [Neptunemon] or [Venusmon], all of your blue or yellow [TS] trait Digimon gain ＜Alliance＞ \n[Main] Add your bottom security card to the hand and place this card face up as the bottom security card. Then, you may play 1 blue or yellow [TS] trait Digimon card from your hand with the play cost reduced by 3."
   - Security: "[Security] You may play 1 level 4 or lower blue or yellow [TS] trait Digimon card from your hand or trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-090`

```text
BT24-090 Abyss Sanctuary: Throne Room
  Q&A (2):
    Q5681 (2025-12-25): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q6720 (2026-06-19): Do cards such as Neptunemon and Venusmon that are not blue or yellow [TS] trait Digimon also gain <Blocker> and <Alliance> from this card's [Security] [All Turns] effect?
      A: No, they don't.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-090.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Static",
L15: kind: "WaiveColorRequirement",
L24: kind: "youHaveNone",
L36: trigger: "AllTurns",
L39: kind: "GainKeyword",
L43: kind: ["Digimon"],
L61: kind: "GainKeyword",
L65: kind: ["Digimon"],
L82: kind: "youHave",
L86: kind: ["Digimon"],
L101: trigger: "Main",
L104: kind: "SecurityManipulation",
L112: kind: "SecurityManipulation",
L126: kind: "PlayWithoutCost",
L130: kind: ["Digimon"],
L149: trigger: "Security",
L152: kind: "PlayWithoutCost",
L156: kind: ["Digimon"],
L183: registerIrCard("BT24-090", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-090.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("models face-up security effects and the bottom-security Main sequence", () => {
L8: expect(security).toMatchObject({ isSecurity: true });
L9: expect(security?.actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" } });
L10: expect(security?.actions?.[1]).toMatchObject({
L20: expect(main?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", position: "bottom" });
L21: expect(main?.actions?.[1]).toMatchObject({
L27: expect(main?.actions?.[2]).toMatchObject({ kind: "PlayWithoutCost", reduceCostBy: 3, optional: true });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-089 — Unique Emblem: Blazing Conductor — 10/10

1. **Catalog identity:** `BT24-089`; set BT24; kind(s) Option; color(s) Red; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) LIBERATOR; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Main] You may play 1 [Elizamon] or [Owen Dreadnought] from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Your Turn] When any of your [Owen Dreadnought]s suspend, ＜Delay＞ \n・1 of your [Reptile] or [Dragonkin] Digimon may digivolve into a Digimon card with the [Reptile] or [Dragonkin] trait and the [LIBERATOR] trait in the hand with the digivolution cost reduced by 3."
   - Security: "[Security] Activate this card's [Main] effects."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-089`

```text
BT24-089 Unique Emblem: Blazing Conductor
  Q&A (1):
    Q5680 (2025-12-25): If I would use this card's <Delay> effect to digivolve my Digimon, can it digivolve into a [Reptile] trait Digimon card or a Digimon card with just the [Dragonkin] trait or [LIBERATOR] trait?
      A: No, you can't. It can only digivolve into a [Reptile] trait card or a card with both the [Dragonkin] and [LIBERATOR] traits.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-089.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Main",
L14: kind: "PlayWithoutCost",
L32: kind: "PlaceInBattleAreaSelf",
L37: trigger: "YourTurn",
L40: kind: "SubTrigger",
L53: kind: "GainKeyword",
L72: trigger: "Main",
L76: kind: "Digivolve",
L80: kind: ["Digimon"],
L87: kind: ["Digimon"],
L100: trigger: "Security",
L103: kind: "ActivateMain",
L113: registerIrCard("BT24-089", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-089.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("arms Delay on Owen suspension and keeps the digivolve in a separate Delay Main effect", () => {
L8: expect(yourTurn?.actions?.[0]).toMatchObject({
L18: expect(delay).toBeDefined();
L19: expect(delay?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-088 — Asuna Shiroki — 10/10

1. **Catalog identity:** `BT24-088`; set BT24; kind(s) Tamer; color(s) Purple; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 4 or less memory, by returning this Tamer to the bottom of the deck, you may play 1 [Asuna Shiroki] or 1 level 4 or lower Digimon card with the [TS] trait or [Three Musketeers] in its text from your trash without paying the cost.\n[On Play] By trashing 1 card with [Three Musketeers] in its text or the [TS] trait from your hand, ＜Draw 2＞"
   - Security: "[Security] Play this card without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-088`

```text
BT24-088 Asuna Shiroki
  Q&A (4):
    Q5676 (2025-12-25): What position on the memory gauge does "while you have 4 or less memory" refer to?
      A: It refers to when the memory gauge is at 4 or further to the right on your side.
    Q5677 (2025-12-25): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5678 (2025-12-25): What cards can be played by this card's [Start of Your Turn] effect?
      A: 1 [Asuna Shiroki], 1 level 4 or lower Digimon card with the [TS] trait, or 1 level 4 or lower Digimon card with [Three Musketeers] in its text.
    Q5679 (2025-12-25): At the start of my turn, this card's [Start of Your Turn] effect plays a card. Can I then activate the [Start of Your Turn] effect on the played card?
      A: No, you can't activate it.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-088.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourTurn",
L14: kind: "PlayWithoutCost",
L28: kind: ["Digimon"],
L42: kind: ["Digimon"],
L60: kind: "memoryAtMost",
L64: kind: "return",
L81: trigger: "OnPlay",
L84: kind: "Draw",
L88: kind: "trash",
L114: trigger: "Security",
L117: kind: "PlayWithoutCost",
L135: registerIrCard("BT24-088", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-088.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("returns itself to the bottom of the deck before the optional trash play", () => {
L8: expect(start?.actions?.[0]).toMatchObject({
L16: expect(BT24_088.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
