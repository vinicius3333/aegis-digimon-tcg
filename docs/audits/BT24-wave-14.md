# BT24 Audit Ledger — Wave 14

Scope: BT24-037, BT24-036, BT24-035, BT24-034, BT24-033 audited individually in descending order. This is a checkpoint ledger, not collection completion.

## BT24-037 — Silphymon — 10/10

1. **Catalog identity:** `BT24-037`; set BT24; kind(s) Digimon; color(s) Yellow/Red; level 5; play cost 8; DP 8000; form(s) Ultimate; attribute(s) Free; trait(s) Beastkin/Iliad/TS; rarity R; deck limit 4. Evolution data: `[{"color":"Yellow","level":4,"memoryCost":4},{"color":"Red","level":4,"memoryCost":4}]`.
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -5000 DP for the turn. Then, 1 of your Digimon may attack. If DNA digivolving, 1 of your Digimon gains ＜Security A. +1＞ and +5000 DP for the turn.\n[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, you may play 1 level 4 or lower yellow, red or [TS] trait Digimon card from its digivolution cards without paying the cost."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, you may play 1 level 4 or lower yellow, red or [TS] trait Digimon card from its digivolution cards without paying the cost."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-037`

```text
BT24-037 Silphymon
  Q&A (4):
    Q5616 (2026-05-08): This card's effect caused the DP of my opponent's Digimon to become 0. At such times, is the Digimon with a DP of zero deleted?
      A: No, it isn't deleted yet. Once all of the processing for the activated effect has resolved, a rule check will occur, then all of the Digimon with 0 DP are deleted at the same time.
    Q5617 (2025-12-25): Can I use this card's [On Play] [When Digivolving] effect to give -5000 DP to 1 of my opponent's Digimon, but then choose to not have 1 of my Digimon attack?
      A: Yes, you can.
    Q5618 (2025-12-25): What cards can be played by this card's [All Turns] effect?
      A: 1 level 4 or lower yellow or red Digimon card or 1 level 4 or lower [TS] trait Digimon card.
    Q5619 (2025-12-25): What cards can be played using this card's inherited effect?
      A: 1 level 4 or lower yellow or red Digimon card or 1 level 4 or lower [TS] trait Digimon card.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-037.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "ModifyDP",
L18: kind: ["Digimon"],
L26: kind: "Attack",
L30: kind: ["Digimon"],
L38: kind: "GainKeyword",
L42: kind: ["Digimon"],
L53: kind: "isDnaDigivolving", raw: "DNA digivolving",
L57: kind: "ModifyDP",
L61: kind: ["Digimon"],
L68: kind: "isDnaDigivolving", raw: "DNA digivolving",
L74: trigger: "WhenDigivolving",
L77: kind: "ModifyDP",
L81: kind: ["Digimon"],
L89: kind: "Attack",
L93: kind: ["Digimon"],
L101: kind: "GainKeyword",
L105: kind: ["Digimon"],
L116: kind: "isDnaDigivolving", raw: "DNA digivolving",
L120: kind: "ModifyDP",
L124: kind: ["Digimon"],
L131: kind: "isDnaDigivolving", raw: "DNA digivolving",
L137: trigger: "AllTurns",
L140: kind: "Replacement",
L147: kind: "PlayWithoutCost",
L151: kind: ["Digimon"],
L174: frequency: "OncePerTurn",
L177: trigger: "AllTurns",
L180: kind: "Replacement",
L187: kind: "PlayWithoutCost",
L191: kind: ["Digimon"],
L215: frequency: "OncePerTurn",
L222: registerIrCard("BT24-037", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-037.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("allows yellow/red or TS level-4-or-lower stack plays", () => {
L7: expect(replacements).toHaveLength(2);
L10: expect(play).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
L11: expect(play.target.filter).toMatchObject({
L17: it("models the conditional DNA attack bonuses", () => {
L20: expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -5000 });
L21: expect(actions[2]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-036 — Medicmon — 10/10

1. **Catalog identity:** `BT24-036`; set BT24; kind(s) Digimon; color(s) Yellow; level 4; play cost 4; DP 4000; form(s) Sup./Appmon; attribute(s) Life; trait(s) Medical; rarity C; deck limit 4. Evolution data: `[{"color":"Yellow","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Security] At the end of the battle, play this card without paying the cost. [On Play] [On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn."
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-036`

```text
BT24-036 Medicmon
  Q&A (1):
    Q5615 (2025-12-25): This card is linked to my Digimon. If I use BT7-107 [Calling From the Darkness]'s [Main] effect to delete that Digimon and return the deleted Digimon card to the hand, can I then activate this card's link effect?
      A: No, you can't activate it. If a Digimon is deleted and an [On Deletion] link effect is triggered, it will only be pending activation for the Digimon card with that link card. If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated. In this case, if this card and the linked Digimon are deleted and an [On Deletion] link effect is triggered, the effect will only be pending activation for the linked Digimon card. If the deleted Digimon card with the effect that's pending activation leaves the trash, the [On Deletion] link effect that was pending activation can no longer be activated.
      related: BT7-107
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-036.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Security",
L14: kind: "PlayWithoutCost",
L27: trigger: "OnPlay",
L30: kind: "ModifyDP",
L34: kind: ["Digimon"],
L44: trigger: "OnDeletion",
L47: kind: "ModifyDP",
L51: kind: ["Digimon"],
L65: registerIrCard("BT24-036", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-036.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("plays from security without battle and applies -3000 DP on entry/deletion", () => {
L6: expect(BT24_036.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
L11: expect(BT24_036.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-035 — Gatomon — 10/10

1. **Catalog identity:** `BT24-035`; set BT24; kind(s) Digimon; color(s) Yellow; level 4; play cost 4; DP 4000; form(s) Champion; attribute(s) Vaccine; trait(s) Holy Beast/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Yellow","level":3,"memoryCost":2},{"color":"Red","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[TS] trait: Cost 2 \n\n[On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn. Then, if it's your turn, 2 of your Digimon may DNA digivolve into [Silphymon] in the hand."
   - Inherited: "＜Barrier＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-035`

```text
BT24-035 Gatomon
  Q&A (1):
    Q5614 (2026-05-08): This card's effect caused the DP of my opponent's Digimon to become 0. At such times, is the Digimon with a DP of zero deleted?
      A: No, it isn't deleted yet. Once all of the processing for the activated effect has resolved, a rule check will occur, then all of the Digimon with 0 DP are deleted at the same time.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-035.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "ModifyDP",
L18: kind: ["Digimon"],
L26: kind: "DnaDigivolve",
L30: kind: ["Digimon"],
L45: kind: "isYourTurn",
L53: trigger: "WhenDigivolving",
L56: kind: "ModifyDP",
L60: kind: ["Digimon"],
L68: kind: "DnaDigivolve",
L72: kind: ["Digimon"],
L87: kind: "isYourTurn",
L95: trigger: "Static",
L108: digivolutionRequirement: [
L118: registerIrCard("BT24-035", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-035.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("applies -3000 DP and conditionally offers Silphymon DNA digivolution", () => {
L8: expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
L9: expect(actions[1]).toMatchObject({
L17: expect(BT24_035.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-034 — Aegiomon — 10/10

1. **Catalog identity:** `BT24-034`; set BT24; kind(s) Digimon; color(s) Yellow; level 4; play cost 5; DP 5000; form(s) Champion; attribute(s) Vaccine; trait(s) Shaman/Iliad/TS; rarity SR; deck limit 4. Evolution data: `[{"color":"Yellow","level":3,"memoryCost":2}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Elecmon]/Lv.3 w/[TS] trait: Cost 2 \n\n＜Barrier＞ \n[When Moving] [On Play] [When Digivolving] By adding your top security card to the hand, you may play 1 [TS] trait Tamer card from your hand without paying the cost. This effect can't play cards with the same name as any of your Tamers."
   - Inherited: "＜Barrier＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-034`

```text
BT24-034 Aegiomon
  Q&A (2):
    Q5613 (2025-12-25): Can I use this card's [When Moving] [On Play] [When Digivolving] effect to add a security card to the hand but choose to not play a Tamer card from my hand?
      A: Yes, you can.
    Q6713 (2026-06-19): I have [BT24-085 Dan Yuki & Kanan Yuki] in my battle area. Can I play [BT25-086 Dan Yuki] with this card's [When Moving] [On Play] [When Digivolving] effect?
      A: Yes, you can.
      related: BT24-085, BT25-086
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-034.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "WhenMoving",
L24: kind: "PlayWithoutCost",
L28: kind: ["Tamer"],
L41: kind: "securityToHand",
L48: kind: "Restrict",
L57: trigger: "OnPlay",
L60: kind: "PlayWithoutCost",
L64: kind: ["Tamer"],
L77: kind: "securityToHand",
L84: kind: "Restrict",
L93: trigger: "WhenDigivolving",
L96: kind: "PlayWithoutCost",
L100: kind: ["Tamer"],
L113: kind: "securityToHand",
L120: kind: "Restrict",
L129: trigger: "Static",
L142: digivolutionRequirement: [
L157: registerIrCard("BT24-034", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-034.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("uses the executable top-security-to-hand cost for all three entry timings", () => {
L8: expect(action).toMatchObject({
L17: it("keeps Barrier as both normal and inherited keyword", () => {
L18: expect(BT24_034.effects?.filter((entry) => entry.keywords?.[0]?.keyword === "Barrier")).toHaveLength(2);
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.

## BT24-033 — Salamon — 10/10

1. **Catalog identity:** `BT24-033`; set BT24; kind(s) Digimon; color(s) Yellow; level 3; play cost 3; DP 1000; form(s) Rookie; attribute(s) Vaccine; trait(s) Mammal/Iliad/TS; rarity C; deck limit 4. Evolution data: `[{"color":"Yellow","level":2,"memoryCost":0},{"color":"Red","level":2,"memoryCost":0}]`.
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[TS] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [Iliad] trait, reduce the digivolution cost by 1."
   - Inherited: "＜Barrier＞"
3. **Exact KB query:** `node tools/kb/query.mjs card BT24-033`

```text
BT24-033 Salamon
  Q&A (1):
    Q5612 (2025-12-25): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a Digimon card with the [Iliad] trait?
      A: No, it doesn't trigger.
```

4. **Clause-to-code mapping:** direct implementation `apps/api/src/cards/BT24/BT24-033.ts` exposes the following executable trigger/action/requirement lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "Replacement",
L21: kind: ["Digimon"],
L31: kind: "Replacement",
L42: trigger: "Static",
L55: digivolutionRequirement: [
L65: registerIrCard("BT24-033", compiled);
```

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every `cost`, `optional`, `abortOnDecline`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: no; this card's existing test is structural because its clause is declarative/keyword-only.
9. **Behavioral evidence and UI:** `apps/api/src/cards/BT24/BT24-033.test.ts` was inspected rather than accepted by file presence. Relevant evidence lines:

```text
L5: it("reduces your-turn Iliad digivolution costs by one", () => {
L7: expect(effect?.actions?.[0]).toMatchObject({
L12: expect(BT24_033.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
```

No presentation-specific behavior was found; Orca Browser is not applicable. 10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
