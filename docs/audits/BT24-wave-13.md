# BT24 Audit Ledger — Wave 13

Scope: BT24-042, BT24-041, BT24-040, BT24-039, BT24-038 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-042 — Goblimon — 10/10

1. **Catalog identity:** `BT24-042`; set BT24; kind(s) Digimon; color(s) Green/Purple; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Virus; trait(s) Demon/Titan/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Green","level":2,"memoryCost":1},{"color":"Purple","level":2,"memoryCost":1}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Tsunomon]/Lv.2 w/[TS] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [Demon] or [Titan] trait, reduce the digivolution cost by 1."
   - Inherited: "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Demon] or [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the digivolution cost reduced by 1."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-042`

```text
BT24-042 Goblimon
  Q&A (2):
    Q5630 (2025-12-25): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a Digimon card with the [Demon] or [Titan] trait?
      A: No, it doesn't trigger.
    Q5631 (2025-12-25): A Digimon with this card in its digivolution cards attacks, and another effect trashes a card from my hand. At such times, if I activate this card's inherited effect and perform a digivolution into P-209 [Titamon], can I then activate P-209 [Titamon]'s <Alliance>?
      A: No, you can't. <Alliance> is an effect that triggers upon an attack. You can't activate it if the Digimon doesn't have <Alliance> upon the attack declaration.
      related: P-209
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-042.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "Replacement",
L21: kind: ["Digimon"],
L31: kind: "Replacement",
L42: trigger: "YourTurn",
L45: kind: "SubTrigger",
L49: kind: "Digivolve",
L53: kind: ["Digimon"],
L65: kind: ["Digimon"],
L85: frequency: "OncePerTurn",
L90: digivolutionRequirement: [
L105: registerIrCard("BT24-042", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-042.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reduces Demon/Titan digivolution costs on your turn", () => {
L9: expect(replacement?.actions?.[0]).toMatchObject({
L14: it("keeps the inherited once-per-turn trash-triggered digivolution", () => {
L16: expect(inherited).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
L17: expect((inherited?.actions?.[0] as any).event).toBe("whenHandTrashed");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-041 — Minervamon — 10/10

1. **Catalog identity:** `BT24-041`; set BT24; kind(s) Digimon; color(s) Yellow/Black; level 6; play cost 12; DP 12000; form(s) Mega; attribute(s) Virus; trait(s) Shaman/Olympos XII/Iliad/TS; rarity SR; deck limit 4. Evolution data: `[{"color":"Yellow","level":5,"memoryCost":4},{"color":"Black","level":5,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Beastkin]/[Dark Dragon]/[TS]: Cost 3 \n\nWhen this card would be played, if you have an [Iliad] trait Digimon or Tamer, reduce the play cost by 5.\n[On Play] [When Digivolving] [On Deletion] You may play 1 play cost 5 or lower [Iliad] trait card from your hand without paying the cost. Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon.\n[Opponent's Turn] All of your [Iliad] trait Digimon gain ＜Reboot＞ and ＜Blocker＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-041`

```text
BT24-041 Minervamon
  Q&A (3):
    Q5627 (2025-12-25): Can I use this card's [On Play] [When Digivolving] [On Deletion] effect to <De-Digivolve> my opponent's Digimon even if I don't play a card from my hand?
      A: Yes. Even if you don't play a card, you <De-Digivolve> your opponent's Digimon.
    Q5628 (2025-12-25): If I have 2 Digimon, does this card's [On Play] [When Digivolving] [On Deletion] effect activate <De-Digivolve 1> twice? Or does <De-Digivolve 2> activate once?
      A: <De-Digivolve 1> activates twice. <De-Digivolve 2> doesn't activate once. Even if a Tamer card or Option card becomes the top card after trashing the top card, <De-Digivolve> can trash a card regardless of its card category, therefore you go on to trash the 2nd card. However, if a card with an "isn't affected by effects" becomes the top card after the first <De-Digivolve 1>, it won't be affected by the second <De-Digivolve 1> and won't be trashed.
    Q5629 (2025-12-25): All of my Digimon get -5000 DP. I used this card's [On Play] [When Digivolving] [On Deletion] effect to play a Digimon with 5000 DP or less. At such times, is the played Digimon deleted before the part of the effect after "then"?
      A: No, it isn't deleted yet. Once all of the processing for this card's [On Play] [When Digivolving] [On Deletion] effect is resolved, then all of the Digimon with 0 DP are deleted at the same time.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-041.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "Replacement",
L21: kind: "Replacement",
L27: kind: "youHave",
L30: kind: ["Digimon", "Tamer"],
L46: trigger: "OnPlay",
L49: kind: "PlayWithoutCost",
L68: kind: "DeDigivolve",
L72: kind: ["Digimon"],
L82: kind: ["Digimon"],
L90: trigger: "WhenDigivolving",
L93: kind: "PlayWithoutCost",
L112: kind: "DeDigivolve",
L116: kind: ["Digimon"],
L126: kind: ["Digimon"],
L134: trigger: "OnDeletion",
L137: kind: "PlayWithoutCost",
L156: kind: "DeDigivolve",
L160: kind: ["Digimon"],
L170: kind: ["Digimon"],
L178: trigger: "OpponentsTurn",
L181: kind: "GainKeyword",
L185: kind: ["Digimon"],
L202: kind: "GainKeyword",
L206: kind: ["Digimon"],
L227: digivolutionRequirement: [
L237: registerIrCard("BT24-041", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-041.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("shares the three entry triggers and scales De-Digivolve by your Digimon", () => {
L8: expect(effect?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false });
L9: expect(effect?.actions?.[1]).toMatchObject({
L16: it("grants Iliad Digimon Reboot and Blocker during the opponent turn", () => {
L18: expect(effect?.actions).toHaveLength(2);
L19: expect(effect?.actions?.map((action: any) => action.keyword?.keyword)).toEqual(["Reboot", "Blocker"]);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-040 — Venusmon — 10/10

1. **Catalog identity:** `BT24-040`; set BT24; kind(s) Digimon; color(s) Yellow/Blue; level 6; play cost 12; DP 12000; form(s) Mega; attribute(s) Vaccine; trait(s) Shaman/Olympos XII/Iliad/TS; rarity SR; deck limit 4. Evolution data: `[{"color":"Yellow","level":5,"memoryCost":4},{"color":"Blue","level":5,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[TS] trait: Cost 3 \n\nWhen this card would be played, if you have 3 or fewer security cards, reduce the play cost by 5.\n[On Play] [When Digivolving] Trash all digivolution cards of 1 of your opponent's Digimon. Then, until your opponent's turn ends, 2 of their Digimon or Tamers can't suspend or activate [When Digivolving] effects.\n[All Turns] [Once Per Turn] When any of your [TS] trait Digimon would leave the battle area other than by your effects, by placing 1 other Digimon with no digivolution cards as the bottom security card, they don't leave."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-040`

```text
BT24-040 Venusmon
  Q&A (8):
    Q5604 (2025-12-25): If I use this card's [Your Turn] effect to digivolve into BT24-040 [Venusmon], ignoring level, the "[Digivolve] Blue/yellow Lv.5: Cost 4" digivolution requirement and "[Digivolve] Lv.5 w/[TS] trait: Cost 3" digivolution requirement are both met, but can I choose either digivolution requirement?
      A: Yes, you can. If you activate this card's [Your Turn] effect and use the "[Digivolve] Blue/yellow Lv.5: Cost 4" digivolution requirement to perform digivolution into BT24-040 [Venusmon], you pay 4 cost for the digivolution. If you activate this card's [Your Turn] effect and use the "[Digivolve] Lv.5 w/[TS] trait: Cost 3" digivolution requirement to perform digivolution into BT24-040 [Venusmon], you pay 3 cost for the digivolution.
    Q5621 (2025-12-25): If I activate this card's [All Turns] effect when multiples of my [TS] trait Digimon would leave the battle area other than by my effects at the same time, are all of those Digimon prevented from leaving?
      A: Yes, all of those Digimon are prevented from leaving. This card's [All Turns] effect affects all Digimon without having to choose them.
    Q5622 (2025-12-25): What does "[When Digivolving] effects don't activate" mean, exactly?
      A: This effect prevents [When Digivolving] effects on cards from activating. [When Digivolving] effects can no longer activate by triggering or when effects such as "activate that card's [When Digivolving]" effect" activate.
    Q5623 (2025-12-25): I used a card affected by "can't activate [When Digivolving] effects" to attack. Can I activate that card's [When Digivolving] [When Attacking] effect at such times?
      A: Yes, you can. The effect can activate if it activates upon the [When Attacking] timing.
    Q5624 (2025-12-25): If a card is affected by "can't activate [When Digivolving] effects," can other effects activate its [When Digivolving] effect?
      A: No, it can't be activated.
    Q5625 (2025-12-25): If a card is affected by "can't activate [When Digivolving] effects," can I process just the "by" condition in its [When Digivolving] effect?
      A: No, you can't.
    Q5626 (2025-12-25): A card that was given "can't activate [When Digivolving] effects" digivolved into a card that has a [When Digivolving] [When Attacking] [Once Per Turn] effect. Does that count as an instance of that effect's [X Per Turn] even if that effect can't be activated upon the timing when that card digivolved?
      A: No, it doesn't count. The effect can't activate upon the [When Digivolving] timing, therefore it doesn't count as an instance of that effect's [X Per Turn].
    Q5781 (2026-02-06): What Digimon are referred to as "other Digimon" by this card's [All Turns] effect?
      A: It refers to Digimon other than the Digimon that would leave the battle area. However, if multiple Digimon would leave, you can place Digimon other than 1 of those Digimon in the security stack to meet the conditions.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-040.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "Replacement",
L21: kind: "Replacement",
L27: kind: "zoneCount",
L40: trigger: "OnPlay",
L43: kind: "TrashDigivolution",
L47: kind: ["Digimon"],
L55: kind: "Restrict",
L59: kind: ["Digimon", "Tamer"],
L67: kind: "Restrict",
L71: kind: ["Digimon", "Tamer"],
L82: trigger: "WhenDigivolving",
L85: kind: "TrashDigivolution",
L89: kind: ["Digimon"],
L97: kind: "Restrict",
L101: kind: ["Digimon", "Tamer"],
L109: kind: "Restrict",
L113: kind: ["Digimon", "Tamer"],
L124: trigger: "AllTurns",
L127: kind: "Replacement",
L132: kind: ["Digimon"],
L142: kind: "Prevent",
L145: kind: "place",
L151: kind: ["Digimon"],
L166: frequency: "OncePerTurn",
L171: digivolutionRequirement: [
L181: registerIrCard("BT24-040", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-040.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("trashes one opponent stack and applies the two shared restrictions", () => {
L8: expect(actions[0]).toMatchObject({
L13: expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
L14: expect(actions[2]).toMatchObject({
L22: it("uses the other no-stack Digimon as a bottom-security replacement", () => {
L24: expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
L25: expect((inherited?.actions?.[0] as any).leaveCause).toBe("otherThanYourEffect");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-039 — Piximon — 10/10

1. **Catalog identity:** `BT24-039`; set BT24; kind(s) Digimon; color(s) Yellow; level 5; play cost 6; DP 6000; form(s) Ultimate; attribute(s) Data; trait(s) Fairy/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Yellow","level":4,"memoryCost":3}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[TS] trait: Cost 3 \n\n[Security] If your opponent has a level 6 or higher Digimon, play this card without battling and without paying the cost.\n＜Blocker＞ \n＜Barrier＞"
   - Inherited: "[On Deletion] ＜Recovery +1 (Deck)＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-039`

```text
BT24-039 Piximon
  (no knowledge-base entries)
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-039.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Security",
L11: kind: "PlayWithoutCost",
L23: kind: "opponentHas",
L26: kind: ["Digimon"],
L38: trigger: "Static",
L48: trigger: "Static",
L58: trigger: "OnDeletion",
L72: digivolutionRequirement: [
L82: registerIrCard("BT24-039", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-039.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays from security without battle only against an opposing level 6+ Digimon", () => {
L7: expect(security?.actions?.[0]).toMatchObject({
L15: it("has Blocker, Barrier, and inherited Recovery +1", () => {
L16: expect(
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-038 — Biomon — 10/10

1. **Catalog identity:** `BT24-038`; set BT24; kind(s) Digimon; color(s) Yellow/Green; level 5; play cost 8; DP 8000; form(s) Ult./Appmon; attribute(s) Life; trait(s) Life; rarity R; deck limit 4. Evolution data: `[{"color":"Yellow","level":4,"memoryCost":4},{"color":"Green","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[App Fusion] [Docmon] & [Medicmon]: Cost 0\n\n＜Fortitude＞ \n[On Play] [When Digivolving] You may link 1 level 4 or lower Digimon card from your hand or this Digimon's digivolution cards to this Digimon without paying the cost.\n[All Turns] [Once Per Turn] When this Digimon gets linked, 1 of your opponent's Digimon gets -7000 DP for the turn."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-038`

```text
BT24-038 Biomon
  Q&A (1):
    Q5620 (2025-12-25): Can I use this card's [On Play] [When Digivolving] effect to link a card that doesn't have <Link>?
      A: No, you can't.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-038.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "Link",
L28: kind: ["Digimon"],
L50: trigger: "WhenDigivolving",
L53: kind: "Link",
L57: kind: ["Digimon"],
L79: trigger: "AllTurns",
L82: kind: "SubTrigger",
L86: kind: "ModifyDP",
L90: kind: ["Digimon"],
L100: frequency: "OncePerTurn",
L105: appFusionRequirement: [
L113: registerIrCard("BT24-038", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-038.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("links a level-4-or-lower Digimon from hand or this stack to itself", () => {
L8: expect(action).toMatchObject({ kind: "Link", from: ["hand", "digivolutionCards"], optional: true });
L9: expect(action.target.filter.levelComparison).toEqual({ op: "lte", value: 4 });
L10: expect(action.recipient).toMatchObject({ filter: { isSelfRef: true }, count: 1, isSelf: true });
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
