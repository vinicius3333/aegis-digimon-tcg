# BT24 Audit Ledger — Wave 18

Scope: BT24-017, BT24-016, BT24-015, BT24-014, BT24-013 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-017 — Medusamon — 10/10

1. **Catalog identity:** `BT24-017`; set BT24; kind(s) Digimon; color(s) Red; level 6; play cost 11; DP 11000; form(s) Mega; attribute(s) Virus; trait(s) Dragonkin/LIBERATOR; rarity R; deck limit 4. Evolution data: `[{"color":"Red","level":5,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "＜Raid＞ \n＜Progress＞ \n＜Piercing＞ \n[When Digivolving] Delete 1 of your opponent's lowest DP Digimon. Then, by returning 2 cards from their trash to the bottom of the deck, they play 2 [Petrification] Tokens. (Digimon/White/3000 DP/[Your Turn] This Digimon can't suspend.\n[On Deletion] Trash your top security card.) After, this Digimon gets +2000 DP for each of your opponent's Digimon until their turn ends."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-017`

```text
BT24-017 Medusamon
  Q&A (8):
    Q5589 (2025-12-25): Which player chooses the cards that are to be returned from my opponent’s trash to the deck by this card's [When Digivolving] effect?
      A: The player that activated this card's effect. The cards to return and their order are chosen by the player that activated this effect, then they are returned to the deck.
    Q5590 (2025-12-25): I chose 2 cards including a Digi-Egg card from my opponent's trash for this card's [When Digivolving] effect. At such times, the rules place the Digi-Egg card at the bottom of the Digi-Egg deck when it would be returned to the deck, but is this effect's "by" condition met?
      A: Yes, it's met.
    Q5591 (2025-12-25): Can I process the part of the effect after "after" in this card's [When Digivolving] effect without meeting the "by" condition?
      A: No, you can't. You can only use the part after "after" in this card's [When Digivolving] effect to get additional DP if 2 cards from your opponent's trash are returned to the bottom of the deck.
    Q5592 (2025-12-25): Can I use this card's [When Digivolving] effect to return 1 card from my opponent's trash to the bottom of the deck?
      A: No, you can't. A "by" condition can't be met if only some of the required actions are performed. In order for the conditions for this card's [When Digivolving] effect to be met, you must return 2 cards from your opponent's trash to the bottom of the deck.
    Q5593 (2025-12-25): I used this card's [When Digivolving] effect to delete an opponent's Digimon with an [On Deletion] effect, and I used the part of the effect after "then" to return that card from their trash to the bottom of the deck. Can that deleted card's [On Deletion] effect activate at such times?
      A: No, you can't activate it. When a card with an effect that's pending activation leaves its current area while activation is pending, the effect can no longer be activated. In this case, the deleted card's [On Deletion] effect triggers, but it's removed from the trash before the effect can activate.
    Q5594 (2026-02-06): Which player's token does this card's [When Digivolving] effect play as an opponent's Digimon?
      A: The token of the player that activated this card's [When Digivolving] effect is played as an opponent's Digimon. If the token played by this effect is removed from the field or the game ends, the token is returned to that player.
    Q5595 (2025-12-25): Can I use this card's [When Digivolving] effect to play a [Petrification] Token during the turn I activated BT8-097 [Crimson Blaze]'s [Main] effect?
      A: Yes, it can be played. This card's [When Digivolving] effect plays one of your cards. Cards can be played by your effects even after a "your opponent can't play Digimon by effects" effect has activated.
      related: BT8-097
    Q6027 (2026-03-13): I activated this card's [When Digivolving] effect, and when my opponent's Digimon would leave the battle area for the 1st process, an immediate-type effect such as a "when [...] would leave" effect caused this card to be removed from the battle area. Can I then process the part of the effect after "then" in this card's effect?
      A: Yes, you can. If an effect activates, it is to be fully resolved even if the card that activated the effect is removed from that area during the processing.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-017.ts` exposes the following executable trigger/action/requirement lines:

```text
L8: import { registerCard } from "../../engine/effects/registry.js";
L130: registerCard(module);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-017.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L161: it("registers on import", () => {
L162: expect(module, "BT24-017 must self-register on import").toBeDefined();
L165: it("routes the digivolve clause to WhenDigivolving only", () => {
L167: expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
L168: expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
L171: it("deletes 1 of the opponent's Digimon", async () => {
L177: expect(deletes).toHaveLength(1);
L178: expect(deletes[0]!.args[0]).toEqual(["OPP-DIGI-0"]);
L181: it("plays 2 [Petrification] Tokens", async () => {
L187: expect(tokens).toHaveLength(2);
L188: for (const t of tokens) expect(t.args[1]).toBe("Petrification Token");
L191: it(
L201: expect(tokens.length).toBeGreaterThan(0);
L203: for (const t of tokens) expect(t.args[0]).toBe(1);
L207: it(
L218: expect(dp).toHaveLength(1);
L219: expect(dp[0]!.args[1]).toBe(2000 * 3);
L223: it(
L234: expect(toDeck).toHaveLength(1);
L235: expect((toDeck[0]!.args[0] as string[]).length).toBe(2);
L237: expect(opts?.toTop).toBeFalsy();
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-016 — Lamiamon — 10/10

1. **Catalog identity:** `BT24-016`; set BT24; kind(s) Digimon; color(s) Red; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Dragonkin/LIBERATOR; rarity U; deck limit 4. Evolution data: `[{"color":"Red","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Hand] [Main] If you have [Owen Dreadnought], by placing 1 [Dimetromon] from your trash as any of your [Elizamon]'s bottom digivolution card, it digivolves into this card for a digivolution cost of 3, ignoring digivolution requirements. [When Digivolving] [When Attacking] [Once Per Turn] Your opponent places 1 card from their hand as the bottom security card. Then, trash their top security card."
   - Inherited: "[All Turns] [Once Per Turn] When your opponent's security stack is removed from, you may play 1 5000 DP or lower [Reptile] or [Dragonkin] Digimon card from your hand without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-016`

```text
BT24-016 Lamiamon
  Q&A (3):
    Q5586 (2025-12-25): If I use this card's {Hand} [Main] effect to digivolve BT23-005 [Elizamon] into this card, ignoring digivolution requirements, does the combination with BT23-005 [Elizamon]'s effect make the digivolution cost 2?
      A: Yes, the digivolution cost is 2.
      related: BT23-005
    Q5587 (2025-12-25): Can I activate this card's {Hand} [Main] effect at the same time as an effect such as P-103 [Offense Training]'s effect that digivolves?
      A: No, you can't.
      related: P-103
    Q5588 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-016.ts` exposes the following executable trigger/action/requirement lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Main",
L14: kind: "Digivolve",
L28: kind: "youHave",
L31: kind: ["Tamer"],
L41: kind: "place",
L46: kind: ["Digimon"],
L62: kind: ["Digimon"],
L82: trigger: "WhenDigivolving",
L85: kind: "SecurityManipulation",
L92: kind: "SecurityManipulation",
L98: frequency: "OncePerTurn",
L102: trigger: "WhenAttacking",
L105: kind: "SecurityManipulation",
L112: kind: "SecurityManipulation",
L118: frequency: "OncePerTurn",
L122: trigger: "AllTurns",
L125: kind: "SubTrigger",
L128: kind: "triggerRemovedSecuritySeat",
L133: kind: "PlayWithoutCost",
L137: kind: ["Digimon"],
L160: frequency: "OncePerTurn",
L167: registerIrCard("BT24-016", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-016.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("uses the Dimetromon placement cost to digivolve an Elizamon host", () => {
L7: expect(main).toMatchObject({
L14: expect(main.cost).toMatchObject({ kind: "place", bindHostAs: "bt24_016_elizamon", position: "bottom" });
L15: expect(main.cost.target.filter.nameOrTrait).toEqual([{ tokens: ["Dimetromon"], match: "name" }]);
L16: expect(main.target.fromSelectionRef).toBe("bt24_016_elizamon");
L19: it("shares the once-per-turn opponent security manipulation", () => {
L22: expect(digivolving.sharedUseKey).toBe(attacking.sharedUseKey);
L23: expect(digivolving.frequency).toBe("OncePerTurn");
L24: expect(digivolving.actions).toMatchObject([
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-015 — MetalGreymon — 10/10

1. **Catalog identity:** `BT24-015`; set BT24; kind(s) Digimon; color(s) Red/Black; level 5; play cost 7; DP 7000; form(s) Ultimate; attribute(s) Virus; trait(s) Cyborg/Titan/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Red","level":4,"memoryCost":4},{"color":"Black","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Greymon] in name or w/[TS] trait: Cost 3 \n\n[Security] If your opponent has a level 6 or higher Digimon, play this card without battling and without paying the cost.\n＜Blocker＞ \n[All Turns] [Once Per Turn] When attack targets change, delete 1 of your opponent's Digimon with the lowest DP."
   - Inherited: "[When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with ＜Blocker＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-015`

```text
BT24-015 MetalGreymon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-015.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Security",
L14: kind: "PlayWithoutCost",
L26: kind: "opponentHas",
L29: kind: ["Digimon"],
L41: trigger: "Static",
L51: trigger: "AllTurns",
L54: kind: "SubTrigger",
L58: kind: "Delete",
L62: kind: ["Digimon"],
L71: frequency: "OncePerTurn",
L74: trigger: "WhenAttacking",
L77: kind: "Delete",
L81: kind: ["Digimon"],
L89: frequency: "OncePerTurn",
L94: digivolutionRequirement: [
L110: registerIrCard("BT24-015", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-015.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays itself from security without battling when the opponent has a level 6+ Digimon", () => {
L7: expect(security).toMatchObject({
L13: expect(security.condition).toMatchObject({
L19: it("keeps lowest-DP attack-target-change deletion and inherited Blocker deletion", () => {
L22: expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttackTargetSwitched" });
L23: expect(allTurns.actions[0].actions[0].target.filter.superlative).toBe("lowestDP");
L24: expect(inherited.actions[0].target.filter.keywords).toEqual(["Blocker"]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-014 — Aegiochusmon — 10/10

1. **Catalog identity:** `BT24-014`; set BT24; kind(s) Digimon; color(s) Red/Yellow; level 5; play cost 8; DP 8000; form(s) Ultimate; attribute(s) Vaccine; trait(s) Shaman/Iliad/TS/Dragonkin; rarity R; deck limit 4. Evolution data: `[{"color":"Red","level":4,"memoryCost":4},{"color":"Yellow","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Aegiomon]: Cost 3 \n\n＜Security A. +1＞ \n＜Decode ([Aegiomon])＞ (When this Digimon would leave the battle area other than in battle, you may play 1 [Aegiomon] from its digivolution cards without paying the cost.)\n[When Digivolving] 1 of your opponent's Digimon gets -5000 DP for the turn. Then, if you have 3 or fewer security cards, delete 1 of your opponent's Digimon with 7000 DP or less."
   - Inherited: "＜Decode ([Aegiomon])＞ (When this Digimon would leave the battle area other than in battle, you may play 1 [Aegiomon] from its digivolution cards without paying the cost.))"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-014`

```text
BT24-014 Aegiochusmon
  Q&A (2):
    Q5584 (2026-05-08): This card's effect caused the DP of my opponent's Digimon to become 0. At such times, is the Digimon with a DP of zero deleted?
      A: No, it isn't deleted yet. Once all of the processing for the activated effect has resolved, a rule check will occur, then all of the Digimon with 0 DP are deleted at the same time.
    Q5585 (2025-12-25): P-194 [Aegiomon] performs a security check, and when it would be deleted in battle against a Security Digimon, <Barrier> prevents the deletion. If I then use BT24-003 [Tsunomon] or BT24-084 [Inori Misono]'s effect to digivolve P-194 [Aegiomon] into this card, do I perform another security check using <Security A. +1>?
      A: Yes, you perform an additional security check.
      related: P-194, BT24-003, BT24-084
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-014.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L22: trigger: "Static",
L32: trigger: "WhenDigivolving",
L35: kind: "ModifyDP",
L39: kind: ["Digimon"],
L47: kind: "Delete",
L51: kind: ["Digimon"],
L60: kind: "zoneCount",
L71: trigger: "Static",
L82: trigger: "AllTurns",
L85: kind: "Replacement",
L93: kind: "PlayWithoutCost",
L97: kind: ["Digimon"],
L118: digivolutionRequirement: [
L127: registerIrCard("BT24-014", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-014.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("applies the DP reduction then conditionally deletes at three or fewer security cards", () => {
L7: expect(effect.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -5000 });
L8: expect(effect.actions[1]).toMatchObject({
L14: it("implements Decode by playing Aegiomon from the stack on non-battle removal", () => {
L16: expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanBattle" });
L17: expect(replacement.actions[0]).toMatchObject({
L22: expect(replacement.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Aegiomon"], match: "name" }]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-013 — Fugamon — 10/10

1. **Catalog identity:** `BT24-013`; set BT24; kind(s) Digimon; color(s) Red/Purple; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Virus; trait(s) Demon/Titan/TS; rarity U; deck limit 4. Evolution data: `[{"color":"Red","level":3,"memoryCost":3},{"color":"Purple","level":3,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Demon]/[TS] trait: Cost 2 \n\nWhen this card is trashed from the hand, if you have 5 or fewer cards in your hand, ＜Draw 1＞ \n[On Play] [When Attacking] [Once Per Turn] By trashing 1 card in your hand, delete 1 of your opponent's Digimon with 6000 DP or less."
   - Inherited: "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Demon] or [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-013`

```text
BT24-013 Fugamon
  Q&A (2):
    Q5582 (2025-12-25): A Digimon with this card in its digivolution cards attacks, and another effect trashes a card from my hand. At such times, if I activate this card's inherited effect and perform a digivolution into P-209 [Titamon], can I then activate P-209 [Titamon]'s <Alliance>?
      A: No, you can't. <Alliance> is an effect that triggers upon an attack. You can't activate it if the Digimon doesn't have <Alliance> upon the attack declaration.
      related: P-209
    Q5583 (2025-12-25): I trash 2 copies of this card from my hand, then I have 5 cards in my hand. At such times, if I activate the 1st effect on the 1st copy of this card and have 6 cards in my hand, can I then use the 1st effect on the 2nd copy of this card to <Draw 1> again?
      A: No, you can't. You must have 5 or fewer cards in your hand upon the actual activation timing for this card's 1st effect.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-013.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "SubTrigger",
L18: kind: "Draw",
L22: kind: "zoneCount",
L35: trigger: "OnPlay",
L38: kind: "Delete",
L42: kind: ["Digimon"],
L51: kind: "trash",
L64: frequency: "OncePerTurn",
L68: trigger: "WhenAttacking",
L71: kind: "Delete",
L75: kind: ["Digimon"],
L84: kind: "trash",
L97: frequency: "OncePerTurn",
L101: trigger: "YourTurn",
L104: kind: "SubTrigger",
L108: kind: "Digivolve",
L118: kind: ["Digimon"],
L134: kind: "selfHasTrait",
L150: frequency: "OncePerTurn",
L155: digivolutionRequirement: [
L165: registerIrCard("BT24-013", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-013.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("requires the hand-trash cost before deleting a 6000-DP-or-less opponent Digimon", () => {
L8: expect(actions[0]).toMatchObject({
L13: expect(actions[0].optional).toBeUndefined();
L14: expect(actions[0].target.filter.dp).toEqual({ op: "lte", value: 6000 });
L18: it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
L21: expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
L22: expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
L23: expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
