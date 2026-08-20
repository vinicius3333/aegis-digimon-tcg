# BT24 Audit Ledger — Wave 2

Scope: BT24-097, BT24-096, BT24-095, BT24-094, BT24-093 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-097 — Soul Fear — 10/10

1. **Catalog identity:** `BT24-097`; set BT24; kind(s) Option; color(s) Purple; level —; play cost 5; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "While you have an [TS] trait Digimon or Tamer on the field, you can ignore this card's color requirements.\n[Security] Activate this card's [Main] effects.\n[Main] Delete 1 of your opponent's level 6 or higher Digimon. Then, you may link this card to 1 of your Digimon on the field without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-097`

```text
BT24-097 Soul Fear
  Q&A (5):
    Q5704 (2025-12-25): What does "while you have (the specified card) on the field" mean, exactly?
      A: It refers to when you have the specified card in the battle area or breeding area.
    Q5705 (2025-12-25): This card is linked to a Digimon. If this card activates a link effect, is that effect considered a Digimon effect or an Option card effect?
      A: It's considered a Digimon effect.
    Q5706 (2025-12-25): Due to an effect, I can't use an Option card. Can I pay this card's link cost and link to one of my Digimon?
      A: Yes, you can link it. Linking a card isn't the same as using an Option card, therefore a card can still get linked when you can't use Option cards.
    Q5707 (2025-12-25): Can I also use this card's [Main] effect to link to a Digimon in the breeding area?
      A: Yes, you can also link to a Digimon in the breeding area.
    Q5708 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
      related: BT24-085
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-097.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L23: kind: "youHave",
L26: kind: ["Digimon", "Tamer"],
L40: trigger: "Security",
L43: kind: "ActivateMain",
L48: trigger: "Main",
L51: kind: "Delete",
L55: kind: ["Digimon"],
L65: kind: "Link",
L72: filter: { controller: "mine", kind: ["Digimon"] },
L85: registerIrCard("BT24-097", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-097.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("deletes a level 6+ Digimon and may link this Option to one of yours", () => {
L7: expect(BT24_097.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
L10: expect(BT24_097.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
L14: expect(main?.actions?.[0]).toMatchObject({
L21: expect(main?.actions?.[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-096 — Seventh Graviton — 10/10

1. **Catalog identity:** `BT24-096`; set BT24; kind(s) Option; color(s) Purple; level —; play cost 7; DP 0; form(s) -; attribute(s) -; trait(s) Seven Great Demon Lords; rarity R; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Trash] [Your Turn] When any of your Digimon digivolve into [Creepymon (X Antibody)], by returning this card to the bottom of the deck, activate its [Main] effects. [Main] Delete 1 of your opponent's level 6 or higher Digimon. If this effect didn't delete, trash the top 3 cards of your opponent's deck."
   - Security: "[Security] Activate this card's [Main] effects."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-096`

```text
BT24-096 Seventh Graviton
  Q&A (2):
    Q5702 (2025-12-25): What is a {Trash} effect?
      A: A {Trash} effect can be triggered/activated while its card is in the trash. Such effects can't be triggered or activated in areas other than the trash.
    Q5703 (2025-12-25): When one of my Digimon digivolves into [Creepymon (X Antibody)], in what order can I activate this card's {Trash} [Your Turn] effect and the effects that trigger upon digivolution into that Digimon?
      A: The effects trigger simultaneously, so the player can choose the activation order.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-096.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "SubTrigger",
L27: kind: "ActivateMain",
L29: kind: "return",
L49: trigger: "Main",
L52: kind: "Delete",
L56: kind: ["Digimon"],
L66: kind: "TrashTopDeck",
L70: kind: "ifThisEffectDidNotDelete",
L77: trigger: "Security",
L80: kind: "ActivateMain",
L90: registerIrCard("BT24-096", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-096.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("returns itself to deck bottom when the named digivolution occurs", () => {
L8: expect(watcher).toMatchObject({ isFromTrash: true });
L9: expect(watcher?.actions?.[0]).toMatchObject({
L17: expect((watcher?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
L23: expect(main?.actions?.[0]).toMatchObject({
L30: expect(main?.actions?.[1]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-095 — Sonic Shot — 10/10

1. **Catalog identity:** `BT24-095`; set BT24; kind(s) Option; color(s) Green; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "While you have an [TS] trait Digimon or Tamer on the field, you can ignore this card's color requirements.\n[Security] Activate this card's [Main] effects.\n[Main] Suspend 1 of your opponent's Digimon or Tamers. It can't unsuspend in their next unsuspend phase. Then, you may link this card to 1 of your Digimon on the field without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-095`

```text
BT24-095 Sonic Shot
  Q&A (5):
    Q5697 (2025-12-25): What does "while you have (the specified card) on the field" mean, exactly?
      A: It refers to when you have the specified card in the battle area or breeding area.
    Q5698 (2025-12-25): This card is linked to a Digimon. If this card activates a link effect, is that effect considered a Digimon effect or an Option card effect?
      A: It's considered a Digimon effect.
    Q5699 (2025-12-25): Due to an effect, I can't use an Option card. Can I pay this card's link cost and link to one of my Digimon?
      A: Yes, you can link it. Linking a card isn't the same as using an Option card, therefore a card can still get linked when you can't use Option cards.
    Q5700 (2025-12-25): Can I also use this card's [Main] effect to link to a Digimon in the breeding area?
      A: Yes, you can also link to a Digimon in the breeding area.
    Q5701 (2025-12-25): I used BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect to use this card, and I used its [Main] effect to link this card to my Digimon. If I then use the part of BT24-085 [Dan Yuki & Kanan Yuki]'s [End of Your Turn] effect after "then" to have the linked Digimon attack, can I activate this card's link effect?
      A: Yes, you can.
      related: BT24-085
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-095.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L23: kind: "youHave",
L26: kind: ["Digimon", "Tamer"],
L40: trigger: "Security",
L43: kind: "ActivateMain",
L48: trigger: "Main",
L51: kind: "Suspend",
L55: kind: ["Digimon", "Tamer"],
L61: kind: "Restrict",
L73: kind: "Link",
L80: filter: { controller: "mine", kind: ["Digimon"] },
L93: registerIrCard("BT24-095", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-095.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("suspends and restricts an opposing permanent, then may self-link", () => {
L7: expect(BT24_095.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
L10: expect(BT24_095.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
L14: expect(main?.actions?.[0]).toMatchObject({
L18: expect(main?.actions?.[1]).toMatchObject({
L24: expect(main?.actions?.[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-094 — Central Town: Throne Room — 10/10

1. **Catalog identity:** `BT24-094`; set BT24; kind(s) Option; color(s) Green/Yellow; level —; play cost 3; DP 0; form(s) -; attribute(s) -; trait(s) Iliad/TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "While you have no face-up security cards, you can ignore this card's color requirements.\n[Security] [All Turns] All of your green or yellow [TS] trait Digimon get +2000 DP. While you have [Merukimon] or [Minervamon], all of your green or yellow [TS] trait Digimon gain ＜Alliance＞ \n[Main] Add your bottom security card to the hand and place this card face up as the bottom security card. Then, you may play 1 green or yellow [TS] trait Digimon card from your hand with the play cost reduced by 3."
   - Security: "[Security] You may play 1 level 4 or lower green or yellow [TS] trait Digimon card from your hand or trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-094`

```text
BT24-094 Central Town: Throne Room
  Q&A (1):
    Q5696 (2025-12-25): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-094.ts` exposes the following executable trigger/action/requirement lines:

```text
L8: import { registerCard } from "../../engine/effects/registry.js";
L103: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: yes.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-094.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L6: it("uses no-face-up waiver and recycles bottom security face-up", async () => {
L16: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
L17: await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === id));
L19: expect(placed?.faceUp).toBe(true);
L20: expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-002")).toBe(true);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-093 — Temple of Beginnings — 10/10

1. **Catalog identity:** `BT24-093`; set BT24; kind(s) Option; color(s) Yellow; level —; play cost 2; DP 0; form(s) -; attribute(s) -; trait(s) Iliad/TS; rarity U; deck limit 4. Evolution data: `[]`.
2. **Exact printed surfaces:**
   - Main: "[Main] Add your top security card to the hand and ＜Recovery +1 (Deck)＞ Then, place this card in the battle area.\n[All Turns] When your security stack is removed from, ＜Delay＞ \n・You may place the top stacked card of any of your Digimon with [Aegiochusmon] or [Jupitermon] in their names as the top security card."
   - Security: "[Security] You may play 1 [Aegiomon] or [Elecmon] from your hand or trash without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-093`

```text
BT24-093 Temple of Beginnings
  Q&A (4):
    Q5692 (2025-12-25): I have 0 security cards. Can I activate this card’s [Main] effect and perform <Recovery +1 ≪Deck≫> without adding a security card to the hand?
      A: Yes, you can.
    Q5693 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q5694 (2025-12-25): What does this card's <Delay> effect do, exactly?
      A: This effect allows you to choose one of your Digimon with [Aegiochusmon] or [Jupitermon] in its name and place its top stacked card as your top security card.
    Q5695 (2025-12-25): Can I use this card’s <Delay> effect to place one of Digimon with [Aegiochusmon] or [Jupitermon] in its name that doesn't have any cards under it on top of the security stack?
      A: No, you can't. Only 1 card isn't considered "stacked cards."
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-093.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Main",
L14: { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
L15: { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck" },
L16: { kind: "PlaceInBattleAreaSelf" },
L20: trigger: "AllTurns",
L24: kind: "SubTrigger",
L28: kind: "SecurityManipulation",
L34: kind: ["Digimon"],
L52: registerIrCard("BT24-093", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: yes.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-093.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L21: it("moves the top security card to hand, recovers 1 from deck to security, and lands in the battle area", async () => {
L40: expect(
L41: s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId }),
L44: await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-093"));
L45: await settle(() => false, 60); // flush the rest of the resolution
L49: expect(p0.hand.some((c) => c.instanceId === topSecurity.instanceId)).toBe(true); // top security -> hand
L50: expect(p0.security.some((c) => c.instanceId === topSecurity.instanceId)).toBe(false);
L51: expect(p0.security.length).toBe(1); // Recovery +1 refilled security from the deck
L52: expect(p0.deck.some((c) => c.instanceId === deckCard.instanceId)).toBe(false);
L53: expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-093")).toBe(true); // placed
L54: expect(p0.trash.some((c) => c.cardId === "BT24-093")).toBe(false); // NOT trashed
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
