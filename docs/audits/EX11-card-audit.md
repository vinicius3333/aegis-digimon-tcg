# EX11 Card Audit Ledger

Audit date: 2026-08-25. Scope: all 74 committed EX11 catalog cards, audited one card at a time in ascending ID order from the integrated corrected base. Exact catalog and KB evidence, clause-to-runtime/shared-primitive tracing, cross-card trait and realistic evolution-stack comparisons, and 172 focused tests across 74 isolated Vitest processes establish reproducible 10/10 evidence for every card. Collection-level affected-seam tests, typecheck, formatting, and diff gates are recorded in the completion commit and coordinator notification.

## EX11-001 — Koromon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-001",
  "set": "EX11",
  "nameEn": "Koromon",
  "colors": [
    "Red"
  ],
  "kinds": [
    "DigiEgg"
  ],
  "level": 2,
  "playCost": -1,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "In-Training"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Lesser",
    "LIBERATOR"
  ],
  "inheritedEffectText": "[When Attacking] [Once Per Turn] This Digimon may digivolve into a Digimon card with [Tyrannomon] in its name or the [Dinosaur] trait in the hand.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-001"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[When Attacking] [Once Per Turn] This Digimon may digivolve into a Digimon card with [Tyrannomon] in its name or the [Dinosaur] trait in the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-001`

```text
EX11-001 Koromon
  Q&A (1):
    Q5787 (2026-02-06): When multiple "when your Digimon attacks, you may digivolve that Digimon" effects trigger, I activated the 1st effect, then the digivolved Digimon's [When Digivolving] effect triggered. At such times, in what order can I activate the other "when your Digimon attacks, you may digivolve that Digimon" effects and that [When Digivolving] effect?
      A: The [When Digivolving] effect activates first. As soon as your Digimon attacks, the "when your Digimon attacks, you may digivolve that Digimon" effects trigger simultaneously. You activate the 1st effect, digivolve a Digimon, then its [When Digivolving] effect triggers, and you therefore activate it first due to the derived trigger rule.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-001.ts`; triggers WhenAttacking; action/condition kinds Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenAttacking",
L14: kind: "Digivolve",
L24: kind: ["Digimon"],
L37: optional: true,
L41: frequency: "OncePerTurn",
L48: registerIrCard("EX11-001", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-002 (Lesser/LIBERATOR), BT20-005 (Lesser/LIBERATOR), BT21-001 (Lesser/LIBERATOR), BT22-001 (Lesser/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-001.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("compiles its inherited once-per-turn attack digivolution permission", () => {
L8: expect(compiled!.coverage).toBe("full");
L9: expect(compiled!.residual).toEqual([]);
L10: expect(compiled!.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-001.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-001", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-002 — Hiyarimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-002",
  "set": "EX11",
  "nameEn": "Hiyarimon",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "DigiEgg"
  ],
  "level": 2,
  "playCost": -1,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "In-Training"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Lesser",
    "LIBERATOR"
  ],
  "inheritedEffectText": "[Your Turn] While your opponent has no Digimon with digivolution cards, this [Ice-Snow] trait Digimon can also attack your opponent's unsuspended Digimon.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-002"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] While your opponent has no Digimon with digivolution cards, this [Ice-Snow] trait Digimon can also attack your opponent's unsuspended Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-002`

```text
EX11-002 Hiyarimon
  Q&A (1):
    Q6044 (2026-03-13): Is a "while your opponent has no Digimon with XX" condition also met when my opponent has no Digimon?
      A: Yes, it's met.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-002.ts`; triggers YourTurn; action/condition kinds GrantCanAttackUnsuspended. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "YourTurn",
L11: kind: "GrantCanAttackUnsuspended",
L20: duration: "permanent",
L21: condition: {
L22: kind: "opponentHasNone",
L25: kind: ["Digimon"],
L39: registerIrCard("EX11-002", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-002 (Lesser/LIBERATOR), BT20-005 (Lesser/LIBERATOR), BT21-001 (Lesser/LIBERATOR), BT22-001 (Lesser/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-002.test.ts` contains 1 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("allows the host Digimon to attack an unsuspended opponent Digimon", async () => {
L8: const s = setupEngine({
L14: await settle(() => s.perm("host").attackablePermanentIds.includes(s.perm("target").permanentId), 400);
L16: expect(
L17: s.engine.applyIntent(0, {
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-002.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-002", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `69394057d Fix card engine behavior and typecheck regressions`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-003 — Puroromon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-003",
  "set": "EX11",
  "nameEn": "Puroromon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "DigiEgg"
  ],
  "level": 2,
  "playCost": -1,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "In-Training"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Larva",
    "X Antibody",
    "Royal Base",
    "LIBERATOR"
  ],
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When face-up [Royal Base] trait cards are placed in your security stack, ＜Draw 1＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-003"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When face-up [Royal Base] trait cards are placed in your security stack, ＜Draw 1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-003`

```text
EX11-003 Puroromon
  Q&A (1):
    Q5788 (2026-02-06): Does this card's inherited effect trigger if my face-down security card is flipped to face up and it's a [Royal Base] trait card?
      A: No, it doesn't trigger.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-003.ts`; triggers YourTurn; action/condition kinds SubTrigger, Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "YourTurn",
L11: kind: "SubTrigger",
L14: kind: "allOf",
L16: { kind: "triggerSecurityIsYours" },
L18: kind: "triggerAddedSecurityHasTrait",
L25: actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
L29: frequency: "OncePerTurn",
L36: export default registerIrCard("EX11-003", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-004 (Larva/X Antibody/Royal Base), BT19-045 (X Antibody/Royal Base/LIBERATOR), BT19-048 (X Antibody/Royal Base/LIBERATOR), BT19-052 (X Antibody/Royal Base/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-003.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("subscribes to own face-up Royal Base security placement, not a generic turn draw", async () => {
L30: expect(subscriptions).toHaveLength(1);
L31: expect(subscriptions[0]!.matches(makeTrigger(true, ["Royal Base"]))).toBe(true);
L32: expect(subscriptions[0]!.matches(makeTrigger(false, ["Royal Base"]))).toBe(false);
L33: expect(subscriptions[0]!.matches(makeTrigger(true, ["LIBERATOR"]))).toBe(false);
L34: expect(subscriptions[0]!.matches(makeTrigger(true, ["Royal Base"], 1))).toBe(false);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-003.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-003", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `932c3aa0c Repair EX11-003 focused harness`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-004 — Kapurimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-004",
  "set": "EX11",
  "nameEn": "Kapurimon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "DigiEgg"
  ],
  "level": 2,
  "playCost": -1,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "In-Training"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Lesser",
    "LIBERATOR"
  ],
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When face-up cards are added to your opponent's security stack, ＜Draw 1＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-004"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[Your Turn] [Once Per Turn] When face-up cards are added to your opponent's security stack, ＜Draw 1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-004`

```text
EX11-004 Kapurimon
  Q&A (2):
    Q5789 (2026-02-06): Does this card's inherited effect trigger when an opponent's security card is flipped to face up?
      A: Yes, it triggers.
    Q5790 (2026-02-06): Does this card's inherited effect trigger when a face-up card is placed in my opponent's security stack?
      A: Yes, it triggers.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-004.ts`; triggers YourTurn; action/condition kinds SubTrigger, Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "YourTurn",
L11: kind: "SubTrigger",
L13: actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
L17: frequency: "OncePerTurn",
L24: registerIrCard("EX11-004", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-002 (Lesser/LIBERATOR), BT20-005 (Lesser/LIBERATOR), BT21-001 (Lesser/LIBERATOR), BT22-001 (Lesser/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-004.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("subscribes to face-up cards added to the opponent's security", async () => {
L35: expect(subscriptions).toHaveLength(1);
L36: expect(subscriptions[0]!.matches(addToSecurity(1))).toBe(true);
L38: expect(subscriptions[0]!.matches(addToSecurity(0))).toBe(false);
L39: expect(subscriptions[0]!.matches(addToSecurity(1, { isOwnersTurn: () => false }))).toBe(false);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-004.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-004", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `1420f4b8e Repair EX11-004 focused harness`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-005 — Yaamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-005",
  "set": "EX11",
  "nameEn": "Yaamon",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "DigiEgg"
  ],
  "level": 2,
  "playCost": -1,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "In-Training"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Lesser",
    "LIBERATOR"
  ],
  "inheritedEffectText": "[Start of Your Main Phase] This Digimon may digivolve into a [Dark Dragon] or [Evil Dragon] trait Digimon card in the trash with the digivolution cost reduced by 1. If this effect digivolved, trash 2 cards in your hand.",
  "rarity": "P",
  "maxCountInDeck": 4,
  "imageId": "EX11-005"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[Start of Your Main Phase] This Digimon may digivolve into a [Dark Dragon] or [Evil Dragon] trait Digimon card in the trash with the digivolution cost reduced by 1. If this effect digivolved, trash 2 cards in your hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-005`

```text
EX11-005 Yaamon
  Q&A (2):
    Q5791 (2026-02-06): If I use this card's inherited effect to digivolve, do I trash 2 cards in my hand for this effect after performing the digivolution bonus draw?
      A: Yes. You perform the digivolution bonus draw and then trash 2 cards in your hand.
    Q5792 (2026-02-06): Can I activate this card's inherited effect even when I have 0 cards in my hand?
      A: Yes, you can. But even if you have just 1 card in your hand after digivolving with this effect, you must trash it when possible.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-005.ts`; triggers StartOfYourMainPhase; action/condition kinds Digivolve, Trash. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "Digivolve",
L24: kind: ["Digimon"],
L34: optional: true,
L37: kind: "Trash",
L45: condition: {
L46: kind: "ifThisEffectDigivolved",
L58: registerIrCard("EX11-005", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-002 (Lesser/LIBERATOR), BT20-005 (Lesser/LIBERATOR), BT21-001 (Lesser/LIBERATOR), BT22-001 (Lesser/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-005.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("keeps the optional trash digivolution and conditional hand cleanup together", () => {
L8: expect(effect).toMatchObject({ trigger: "StartOfYourMainPhase", isInherited: true });
L9: expect(effect.actions[0]).toMatchObject({
L16: expect(effect.actions[1]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-005.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-005", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-006 — Flickmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-006",
  "set": "EX11",
  "nameEn": "Flickmon",
  "colors": [
    "White"
  ],
  "kinds": [
    "DigiEgg"
  ],
  "level": 2,
  "playCost": -1,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "Appmon"
  ],
  "attributes": [
    "Tool"
  ],
  "types": [
    "Flick",
    "LIBERATOR"
  ],
  "inheritedEffectText": "[When Attacking] [Once Per Turn] This Digimon linked with [Maquinamon] may digivolve into a Digimon card with [Maquinamon] in its text in the hand with the digivolution cost reduced by 2.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-006"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[When Attacking] [Once Per Turn] This Digimon linked with [Maquinamon] may digivolve into a Digimon card with [Maquinamon] in its text in the hand with the digivolution cost reduced by 2."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-006`

```text
EX11-006 Flickmon
  Q&A (1):
    Q5793 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-006.ts`; triggers WhenAttacking; action/condition kinds Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "WhenAttacking",
L16: condition: {
L17: kind: "hostHasLinkedWith",
L30: kind: "Digivolve",
L40: kind: ["Digimon"],
L51: optional: true,
L55: frequency: "OncePerTurn",
L62: registerIrCard("EX11-006", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-006.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("requires a linked Maquinamon before its inherited attack digivolution", () => {
L8: expect(effect).toMatchObject({
L17: expect(effect.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-006.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-006", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-007 — Agumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-007",
  "set": "EX11",
  "nameEn": "Agumon",
  "colors": [
    "Red",
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Green",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Reptile",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Koromon]: Cost 0 \n\n[When Moving] [On Play] 1 of your Digimon with [Tyrannomon] in its name or the [Reptile] or [Dinosaur] trait gains ＜Raid＞ and ＜Piercing＞ for the turn..",
  "inheritedEffectText": "[All Turns] This Digimon gets +1000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-007"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Koromon]: Cost 0 \n\n[When Moving] [On Play] 1 of your Digimon with [Tyrannomon] in its name or the [Reptile] or [Dinosaur] trait gains ＜Raid＞ and ＜Piercing＞ for the turn.."
   - Inherited: "[All Turns] This Digimon gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-007`

```text
EX11-007 Agumon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-007.ts`; triggers WhenMoving, OnPlay, AllTurns; action/condition kinds GainKeyword, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenMoving",
L14: kind: "GainKeyword",
L18: kind: ["Digimon"],
L36: duration: "forTheTurn",
L39: kind: "GainKeyword",
L43: kind: ["Digimon"],
L61: duration: "forTheTurn",
L66: trigger: "OnPlay",
L69: kind: "GainKeyword",
L73: kind: ["Digimon"],
L91: duration: "forTheTurn",
L94: kind: "GainKeyword",
L98: kind: ["Digimon"],
L116: duration: "forTheTurn",
L121: trigger: "AllTurns",
L124: kind: "ModifyDP",
L133: duration: "permanent",
L141: digivolutionRequirement: [
L144: cost: 0,
L150: registerIrCard("EX11-007", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-008 (Reptile/LIBERATOR), BT21-017 (Reptile/LIBERATOR), BT21-055 (Reptile/LIBERATOR), BT23-005 (Reptile/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-007.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("grants both turn-long keywords on play or when moving", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([{ names: ["Koromon"], cost: 0, isAlternate: true }]);
L11: expect(effect.actions).toEqual([
L26: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-007.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-007", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-008 — Elizamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-008",
  "set": "EX11",
  "nameEn": "Elizamon",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 2,
      "memoryCost": 0
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Reptile",
    "LIBERATOR"
  ],
  "effectText": "[When Moving] [On Play] 1 of your Digimon with the [Reptile] or [Dragonkin] trait gains ＜Raid＞ and +3000 DP for the turn.",
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, gain 1 memory.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-008"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Moving] [On Play] 1 of your Digimon with the [Reptile] or [Dragonkin] trait gains ＜Raid＞ and +3000 DP for the turn."
   - Inherited: "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, gain 1 memory."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-008`

```text
EX11-008 Elizamon
  Q&A (1):
    Q5794 (2026-02-06): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-008.ts`; triggers WhenMoving, OnPlay, YourTurn; action/condition kinds GainKeyword, ModifyDP, SubTrigger, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "WhenMoving",
L18: kind: "GainKeyword",
L22: kind: ["Digimon"],
L36: duration: "forTheTurn",
L39: kind: "ModifyDP",
L43: kind: ["Digimon"],
L54: duration: "forTheTurn",
L59: trigger: "OnPlay",
L62: kind: "GainKeyword",
L66: kind: ["Digimon"],
L80: duration: "forTheTurn",
L83: kind: "ModifyDP",
L87: kind: ["Digimon"],
L98: duration: "forTheTurn",
L103: trigger: "YourTurn",
L106: kind: "SubTrigger",
L111: kind: "GainMemory",
L118: frequency: "OncePerTurn",
L125: registerIrCard("EX11-008", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-008 (Reptile/LIBERATOR), BT21-017 (Reptile/LIBERATOR), BT21-055 (Reptile/LIBERATOR), BT23-005 (Reptile/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-008.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("grants Raid and DP on entry while inheriting the opponent-security memory trigger", () => {
L12: expect(effect.actions).toEqual([
L21: expect(compiled.effects).toContainEqual(
L38: it("plays through the real engine and buffs one eligible Reptile/Dragonkin", async () => {
L39: const s = setupEngine(
L52: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elizamon").instanceId })).toEqual({
L55: await settle(() => ally.currentDP === initialDP + 3000, 600);
L57: expect(ally.currentDP).toBe(initialDP + 3000);
L58: expect(observe(s.engine).hasKeyword(ally, "Raid")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-008.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-008", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-009 — Tyrannomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-009",
  "set": "EX11",
  "nameEn": "Tyrannomon",
  "colors": [
    "Red",
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 6000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 3,
      "memoryCost": 3
    },
    {
      "color": "Green",
      "level": 3,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Dinosaur",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Reptile] trait: Cost 2  [When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Ryutaro Williams] from your hand without paying the cost.",
  "inheritedEffectText": "[All Turns] This Digimon get +1000 DP.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-009"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Reptile] trait: Cost 2  [When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Ryutaro Williams] from your hand without paying the cost."
   - Inherited: "[All Turns] This Digimon get +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-009`

```text
EX11-009 Tyrannomon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-009.ts`; triggers WhenDigivolving, AllTurns; action/condition kinds PlayWithoutCost, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenDigivolving",
L14: kind: "PlayWithoutCost",
L29: condition: {
L30: kind: "youHave",
L33: kind: ["Tamer"],
L37: optional: true,
L42: trigger: "AllTurns",
L45: kind: "ModifyDP",
L54: duration: "permanent",
L62: digivolutionRequirement: [
L66: cost: 2,
L72: registerIrCard("EX11-009", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-010 (Dinosaur/LIBERATOR), EX11-011 (Dinosaur/LIBERATOR), EX8-011 (Dinosaur/LIBERATOR), EX8-014 (Dinosaur/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-009.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("encodes the alternate Reptile evolution and conditional optional play", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Reptile"], cost: 2, isAlternate: true }]);
L10: expect(compiled.effects[0]).toMatchObject({
L30: expect(compiled.effects[1]).toMatchObject({
L37: it("evolves from a Reptile and plays Ryutaro without paying its cost", async () => {
L38: const s = setupEngine(
L53: expect(
L54: s.engine.applyIntent(0, {
L60: await settle(() => base.topCard?.cardId === "EX11-009", 600);
L61: expect(base.topCard?.cardId).toBe("EX11-009");
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-009.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-009", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-010 — MasterTyrannomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-010",
  "set": "EX11",
  "nameEn": "MasterTyrannomon",
  "colors": [
    "Red",
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 8,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 4,
      "memoryCost": 4
    },
    {
      "color": "Green",
      "level": 4,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Dinosaur",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Dinosaur] trait: Cost 3  <Security A. +1> <Fortitude>  [On Play] [When Digivolving] You may suspend 1 Digimon. Then, if this Digimon is suspended, it gets +4000 DP until your opponent's turn ends.",
  "inheritedEffectText": "<Security A. +1> (This Digimon checks 1 additional security card.)",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-010"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Dinosaur] trait: Cost 3  <Security A. +1> <Fortitude>  [On Play] [When Digivolving] You may suspend 1 Digimon. Then, if this Digimon is suspended, it gets +4000 DP until your opponent's turn ends."
   - Inherited: "<Security A. +1> (This Digimon checks 1 additional security card.)"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-010`

```text
EX11-010 MasterTyrannomon
  Q&A (1):
    Q5795 (2026-02-06): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-010.ts`; triggers Static, OnPlay, WhenDigivolving; action/condition kinds Suspend, SubTrigger, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L26: trigger: "OnPlay",
L29: kind: "Suspend",
L33: kind: ["Digimon"],
L37: optional: true,
L40: kind: "SubTrigger",
L47: kind: "ModifyDP",
L56: duration: "untilOpponentTurnEnd",
L63: trigger: "WhenDigivolving",
L66: kind: "Suspend",
L70: kind: ["Digimon"],
L74: optional: true,
L77: kind: "SubTrigger",
L84: kind: "ModifyDP",
L93: duration: "untilOpponentTurnEnd",
L100: trigger: "Static",
L114: digivolutionRequirement: [
L118: cost: 3,
L124: registerIrCard("EX11-010", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-009 (Dinosaur/LIBERATOR), EX11-011 (Dinosaur/LIBERATOR), EX8-011 (Dinosaur/LIBERATOR), EX8-014 (Dinosaur/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-010.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("requires this Digimon to be the suspended subject before granting +4000 DP", () => {
L9: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L21: expect(compiled.effects[0]?.keywords).toEqual([
L25: expect(compiled.effects[3]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-010.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-010", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-011 — Dinomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-011",
  "set": "EX11",
  "nameEn": "Dinomon",
  "colors": [
    "Red",
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 13,
  "dp": 13000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 5,
      "memoryCost": 5
    },
    {
      "color": "Green",
      "level": 5,
      "memoryCost": 5
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Dinosaur",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Tyrannomon] in name or w/[Dinosaur] trait: Cost 4 \n\n＜Security A. +1＞ \n＜Fortitude＞ \n[On Play] [When Digivolving] You may suspend 1 Digimon. Then, choose 1 of each player's Digimon with the highest play cost and delete all other Digimon.\n[Opponent's Turn] While this Digimon is suspended, all of your opponent's Digimon can only attack suspended Digimon.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-011"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Tyrannomon] in name or w/[Dinosaur] trait: Cost 4 \n\n＜Security A. +1＞ \n＜Fortitude＞ \n[On Play] [When Digivolving] You may suspend 1 Digimon. Then, choose 1 of each player's Digimon with the highest play cost and delete all other Digimon.\n[Opponent's Turn] While this Digimon is suspended, all of your opponent's Digimon can only attack suspended Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-011`

```text
EX11-011 Dinomon
  Q&A (4):
    Q5796 (2026-02-06): There are only opponent's Digimon with no play costs. What happens if this card's [On Play] [When Digivolving] effect activates?
      A: You can't choose your opponent's Digimon, and all Digimon that can't be chosen are deleted.
    Q5797 (2026-02-06): I have this card in the battle area, and it's suspended. Can my opponent's BT8-018 [Marsmon] attack their unsuspended Digimon?
      A: No, it can't attack. If a "can" or "may" effect activates at the same timing as a "can't" effect, the "can't" effect takes precedence.
      related: BT8-018
    Q5798 (2026-02-06): I have this card in the battle area, and it's suspended. If my opponent's Digimon attacks my suspended Digimon, can my opponent use <Raid> on the attacking Digimon to switch the target of the attack to my unsuspended Digimon?
      A: Yes, they can. This card's [Opponent's Turn] effect only allows suspended Digimon to be chosen as the attack target upon the attack declaration. After attacking a suspended Digimon, it will be possible to use <Raid> to switch the target of the attack to an opponent's unsuspended Digimon.
    Q5799 (2026-02-06): I have this card in the battle area, and it's suspended. If an opponent's Digimon isn't affected by effects, can it attack Digimon other than suspended Digimon?
      A: Yes, it can attack.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-011.ts`; triggers Static, OnPlay, WhenDigivolving, OpponentsTurn; action/condition kinds GainKeyword, Suspend, SelectBind, Delete, GrantStatic. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L16: //   `optional: true` from the Delete action.
L20: trigger: "Static",
L23: kind: "GainKeyword",
L35: duration: "permanent",
L41: trigger: "Static",
L44: kind: "GainKeyword",
L55: duration: "permanent",
L61: trigger: "OnPlay",
L64: kind: "Suspend",
L68: kind: ["Digimon"],
L72: optional: true,
L75: kind: "SelectBind",
L79: kind: ["Digimon"],
L88: kind: "SelectBind",
L92: kind: ["Digimon"],
L101: kind: "Delete",
L104: kind: ["Digimon"],
L113: trigger: "WhenDigivolving",
L116: kind: "Suspend",
L120: kind: ["Digimon"],
L124: optional: true,
L127: kind: "SelectBind",
L131: kind: ["Digimon"],
L140: kind: "SelectBind",
L144: kind: ["Digimon"],
L153: kind: "Delete",
L156: kind: ["Digimon"],
L165: trigger: "Static",
L168: kind: "GainKeyword",
L180: duration: "permanent",
L186: trigger: "OpponentsTurn",
L189: kind: "GrantStatic",
L193: kind: ["Digimon"],
L199: condition: {
L200: kind: "selfIsSuspended",
L209: digivolutionRequirement: [
L213: cost: 4,
L218: cost: 4,
L225: registerIrCard("EX11-011", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-009 (Dinosaur/LIBERATOR), EX11-010 (Dinosaur/LIBERATOR), EX8-011 (Dinosaur/LIBERATOR), EX8-014 (Dinosaur/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-011.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("keeps one highest-play-cost Digimon per player and deletes the rest", async () => {
L8: const s = setupEngine(
L27: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dinomon").instanceId })).toEqual({
L30: await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX11-008"), 600);
L32: expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-008")).toBe(true);
L33: expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-008")).toBe(true);
L34: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX11-011")).toBe(true);
L35: expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "EX11-010")).toBe(true);
L38: it("has both printed keywords and the two alternate evolution requirements", () => {
L40: expect(compiled.digivolutionRequirement).toEqual([
L47: expect(staticActions).toEqual(
L53: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-011.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-011", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-012 — Medusamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-012",
  "set": "EX11",
  "nameEn": "Medusamon",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 5,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Dragonkin",
    "LIBERATOR"
  ],
  "effectText": "＜Rush＞ \n＜Progress＞ \n[When Digivolving] [End of Attack] You may delete 1 of your opponent's Digimon with as much or less DP as this Digimon. Then, by returning 1 card from your opponent's trash to the bottom of the deck, they play 1 [Petrification] Token. (Digimon/White/3000 DP/[Your Turn] This Digimon can't suspend.\n[On Deletion] Trash your top security card.)\n[All Turns] When this Digimon would leave the battle area, by deleting 1 Token, it doesn't leave.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-012"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Rush＞ \n＜Progress＞ \n[When Digivolving] [End of Attack] You may delete 1 of your opponent's Digimon with as much or less DP as this Digimon. Then, by returning 1 card from your opponent's trash to the bottom of the deck, they play 1 [Petrification] Token. (Digimon/White/3000 DP/[Your Turn] This Digimon can't suspend.\n[On Deletion] Trash your top security card.)\n[All Turns] When this Digimon would leave the battle area, by deleting 1 Token, it doesn't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-012`

```text
EX11-012 Medusamon
  Q&A (4):
    Q5800 (2026-02-06): Which player's token does this card's [When Digivolving] [End of Attack] effect play as an opponent's Digimon?
      A: This card's [When Digivolving] [End of Attack] effect plays the token of the player that activated the effect as an opponent's Digimon. If the token played by this effect is removed from the field or the game ends, the token is returned to that player.
    Q5801 (2026-02-06): Can I use this card's [When Digivolving] [End of Attack] effect to play a [Petrification] Token during the turn I activated BT8-097 [Crimson Blaze]'s [Main] effect?
      A: Yes, it can be played. This card's [When Digivolving] [End of Attack] effect plays one of your cards. Cards can be played by your effects even after a "your opponent can't play Digimon by effects" effect has activated.
      related: BT8-097
    Q6045 (2026-03-13): I activated this card's [When Digivolving] [End of Attack] effect, and when my opponent's Digimon would leave the battle area for the 1st process, an immediate-type effect such as a "when [...] would leave" effect caused this card to be removed from the battle area. Can I then process the part of the effect after "then" in this card's effect?
      A: Yes, you can. If an effect activates, it is to be fully resolved even if the card that activated the effect is removed from that area during the processing.
    Q6514 (2026-05-08): I activated this card's [All Turns] effect to delete a Token when this card's DP became 0 and it would be deleted, then it was prevented from leaving. If this card's DP is still 0 after that and it would be deleted, can I activate this card's [All Turns] effect again?
      A: Yes, you can. By activating this card's [All Turns] effect to delete a Token when this card's DP becomes 0 and it would be deleted by a rule check, it will be prevented from leaving. You can activate this card's [All Turns] effect again when it would be deleted by the next rule check. If the deleted Tokens have [On Deletion] effects, once all processing has been resolved for the rule checks, those [On Deletion] effects will trigger simultaneously.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-012.ts`; triggers Static, WhenDigivolving, EndOfAttack, OnDeletion, AllTurns; action/condition kinds Delete, PlayToken, Trash, Replacement, Prevent. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L23: trigger: "Static",
L33: trigger: "WhenDigivolving",
L36: kind: "Delete",
L40: kind: ["Digimon"],
L48: optional: true,
L51: kind: "PlayToken",
L56: cost: {
L57: kind: "return",
L68: optional: true,
L69: abortOnDecline: true,
L74: trigger: "EndOfAttack",
L77: kind: "Delete",
L81: kind: ["Digimon"],
L89: optional: true,
L92: kind: "PlayToken",
L97: cost: {
L98: kind: "return",
L109: optional: true,
L110: abortOnDecline: true,
L115: trigger: "OnDeletion",
L118: kind: "Trash",
L131: trigger: "AllTurns",
L134: kind: "Replacement",
L141: kind: "Prevent",
L145: cost: {
L146: kind: "delete",
L163: registerIrCard("EX11-012", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-025 (Dragonkin/LIBERATOR), BT21-029 (Dragonkin/LIBERATOR), BT24-016 (Dragonkin/LIBERATOR), BT24-017 (Dragonkin/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-012.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("deletes an opposing Digimon within its DP on digivolution", async () => {
L10: const s = setupEngine(
L25: expect(
L26: s.engine.applyIntent(0, {
L32: await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX11-008"), 600);
L33: expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-008")).toBe(true);
L34: expect(s.perm("base").topCard?.cardId).toBe("EX11-012");
L37: it("encodes both token triggers, opponent-side placement, deck-bottom cost, and token replacement", () => {
L40: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L53: expect(compiled.effects).toContainEqual(
L67: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-012.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-012", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-013 — Sangomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-013",
  "set": "EX11",
  "nameEn": "Sangomon",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 2,
      "memoryCost": 0
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Mollusk",
    "LIBERATOR",
    "Aquatic"
  ],
  "effectText": "[When Moving] [On Play] If you have 7 or fewer cards in your hand, ＜Draw 1＞",
  "inheritedEffectText": "[End of Attack] [Once Per Turn] Gain 1 memory.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-013"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Moving] [On Play] If you have 7 or fewer cards in your hand, ＜Draw 1＞"
   - Inherited: "[End of Attack] [Once Per Turn] Gain 1 memory."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-013`

```text
EX11-013 Sangomon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-013.ts`; triggers WhenMoving, OnPlay, EndOfAttack; action/condition kinds Draw, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenMoving",
L14: kind: "Draw",
L17: condition: {
L18: kind: "zoneCount",
L29: trigger: "OnPlay",
L32: kind: "Draw",
L35: condition: {
L36: kind: "zoneCount",
L47: trigger: "EndOfAttack",
L50: kind: "GainMemory",
L55: frequency: "OncePerTurn",
L62: registerIrCard("EX11-013", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-017 (Mollusk/LIBERATOR/Aquatic), BT19-019 (Mollusk/LIBERATOR/Aquatic), BT19-024 (Mollusk/LIBERATOR/Aquatic), BT19-027 (Mollusk/LIBERATOR/Aquatic). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-013.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("draws on play when the hand has seven or fewer cards", async () => {
L8: const s = setupEngine(
L13: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
L16: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"), 600);
L17: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
L20: it("encodes both entry timings, the exact seven-card boundary, and inherited once-per-turn memory", () => {
L23: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L29: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-013.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-013", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-014 — Penguinmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-014",
  "set": "EX11",
  "nameEn": "Penguinmon",
  "colors": [
    "Blue",
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 2000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Yellow",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Avian",
    "LIBERATOR",
    "Ice-Snow"
  ],
  "effectText": "[Digivolve] [Hiyarimon]: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 [Suzune Kazuki] and 1 [Ice-Snow] trait Digimon card among them to the hand. Return the rest to the bottom of the deck.",
  "inheritedEffectText": "＜Jamming＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-014"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Hiyarimon]: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 [Suzune Kazuki] and 1 [Ice-Snow] trait Digimon card among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "＜Jamming＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-014`

```text
EX11-014 Penguinmon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-014.ts`; triggers OnPlay, Static; action/condition kinds RevealAdd. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "RevealAdd",
L33: kind: ["Digimon"],
L50: trigger: "Static",
L63: digivolutionRequirement: [
L66: cost: 0,
L72: registerIrCard("EX11-014", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX8-019 (Avian/LIBERATOR/Ice-Snow), EX11-015 (Ice-Snow/LIBERATOR), EX11-016 (Ice-Snow/LIBERATOR), EX11-017 (Ice-Snow/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-014.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("reveals three and adds Suzune plus an Ice-Snow Digimon", async () => {
L8: const s = setupEngine(
L18: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({
L21: await settle(
L27: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-057")).toBe(true);
L28: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-014")).toBe(true);
L31: it("encodes the Hiyarimon evolution and inherited Jamming", () => {
L33: expect(compiled.digivolutionRequirement).toEqual([{ names: ["Hiyarimon"], cost: 0, isAlternate: true }]);
L34: expect(compiled.effects[0]).toMatchObject({
L52: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-014.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-014", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-015 — Frigimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-015",
  "set": "EX11",
  "nameEn": "Frigimon",
  "colors": [
    "Blue",
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 6000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 3,
      "memoryCost": 3
    },
    {
      "color": "Yellow",
      "level": 3,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Ice-Snow",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Ice-Snow] trait: Cost 2 \n\n[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Suzune Kazuki] from your hand without paying the cost.",
  "inheritedEffectText": "＜Jamming＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-015"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Ice-Snow] trait: Cost 2 \n\n[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Suzune Kazuki] from your hand without paying the cost."
   - Inherited: "＜Jamming＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-015`

```text
EX11-015 Frigimon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-015.ts`; triggers WhenDigivolving, Static; action/condition kinds PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenDigivolving",
L14: kind: "PlayWithoutCost",
L29: condition: {
L30: kind: "youHave",
L33: kind: ["Tamer"],
L37: optional: true,
L42: trigger: "Static",
L55: digivolutionRequirement: [
L59: cost: 2,
L65: registerIrCard("EX11-015", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-014 (LIBERATOR/Ice-Snow), EX11-016 (Ice-Snow/LIBERATOR), EX11-017 (Ice-Snow/LIBERATOR), EX8-019 (LIBERATOR/Ice-Snow). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-015.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("legally evolves from an Ice-Snow level 3", async () => {
L8: const s = setupEngine(
L21: expect(
L22: s.engine.applyIntent(0, {
L28: await settle(() => s.perm("base").topCard?.cardId === "EX11-015", 600);
L29: expect(s.perm("base").topCard?.cardId).toBe("EX11-015");
L32: it("encodes the Ice-Snow evolution, one-or-fewer-Tamers condition, and inherited Jamming", () => {
L34: expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Ice-Snow"], cost: 2, isAlternate: true }]);
L35: expect(compiled.effects[0]).toMatchObject({
L48: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-015.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-015", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-016 — PolarBearmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-016",
  "set": "EX11",
  "nameEn": "PolarBearmon",
  "colors": [
    "Blue",
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 4,
      "memoryCost": 4
    },
    {
      "color": "Yellow",
      "level": 4,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Ice-Snow",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Ice-Snow] trait: Cost 3 \n\n＜Iceclad＞ \n[On Play] [When Digivolving] Trash any 2 digivolution cards from your opponent's Digimon. Then, you may place 1 of their Digimon with no digivolution cards as the top or bottom security card.",
  "inheritedEffectText": "[Your Turn] While your opponent has no Digimon with digivolution cards, this [Ice-Snow] trait Digimon gains ＜Piercing＞ and ＜Security A. +1＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-016"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Ice-Snow] trait: Cost 3 \n\n＜Iceclad＞ \n[On Play] [When Digivolving] Trash any 2 digivolution cards from your opponent's Digimon. Then, you may place 1 of their Digimon with no digivolution cards as the top or bottom security card."
   - Inherited: "[Your Turn] While your opponent has no Digimon with digivolution cards, this [Ice-Snow] trait Digimon gains ＜Piercing＞ and ＜Security A. +1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-016`

```text
EX11-016 PolarBearmon
  Q&A (2):
    Q5802 (2026-02-06): My Digimon with this card in its digivolution cards attacked, an opponent's Digimon with digivolution cards was deleted in the battle, and after that battle, my opponent doesn't have any Digimon with digivolution cards. This Digimon gains <Piercing> from this card's inherited effect at such times, but does the <Piercing> trigger simultaneously?
      A: Yes, it triggers. If an effect's trigger conditions are met when the effect is gained, that effect will trigger. In this case, your opponent no longer has Digimon with digivolution cards at the same timing as when your opponent's Digimon is deleted in battle, therefore you can activate <Piercing>.
    Q6046 (2026-03-13): Is a "while your opponent has no Digimon with XX" condition also met when my opponent has no Digimon?
      A: Yes, it's met.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-016.ts`; triggers Static, OnPlay, WhenDigivolving, YourTurn; action/condition kinds TrashDigivolution, SecurityManipulation, Aura. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "TrashDigivolution",
L28: kind: ["Digimon"],
L36: kind: "SecurityManipulation",
L42: kind: ["Digimon"],
L48: optional: true,
L53: trigger: "WhenDigivolving",
L56: kind: "TrashDigivolution",
L60: kind: ["Digimon"],
L68: kind: "SecurityManipulation",
L74: kind: ["Digimon"],
L80: optional: true,
L85: trigger: "YourTurn",
L88: kind: "Aura",
L92: kind: ["Digimon"],
L103: kind: "keyword",
L110: kind: "opponentHasNone",
L114: kind: ["Digimon"],
L120: kind: "Aura",
L124: kind: ["Digimon"],
L135: kind: "keyword",
L143: kind: "opponentHasNone",
L147: kind: ["Digimon"],
L158: digivolutionRequirement: [
L162: cost: 3,
L168: registerIrCard("EX11-016", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-014 (LIBERATOR/Ice-Snow), EX11-015 (Ice-Snow/LIBERATOR), EX11-017 (Ice-Snow/LIBERATOR), EX8-019 (LIBERATOR/Ice-Snow). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-016.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("trashes two opposing digivolution cards on play", async () => {
L8: const s = setupEngine(
L16: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("polar").instanceId })).toEqual({ ok: true });
L17: await settle(() => s.state.players[1]!.trash.length >= 2, 600);
L18: expect(s.state.players[1]!.trash.length).toBeGreaterThanOrEqual(2);
L21: it("encodes the Ice-Snow evolution, Iceclad, source trashing, and no-source security target", () => {
L23: expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Ice-Snow"], cost: 3, isAlternate: true }]);
L24: expect(compiled.effects[0]).toMatchObject({
L29: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L41: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-016.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-016", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-017 — Skadimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-017",
  "set": "EX11",
  "nameEn": "Skadimon",
  "colors": [
    "Blue",
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 12,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 5,
      "memoryCost": 4
    },
    {
      "color": "Yellow",
      "level": 5,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Ice-Snow",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Ice-Snow] trait: Cost 3 \n\n＜Iceclad＞ \n＜Barrier＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Suzune Kazuki] or level 4 or lower [Ice-Snow] trait Digimon card from your hand without paying the cost.\n[All Turns] [Once Per Turn] When other Digimon are played or digivolve, trash any 3 digivolution cards from your opponent's Digimon. Then, 1 of their Digimon with no digivolution cards can't suspend until their turn ends.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-017"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Ice-Snow] trait: Cost 3 \n\n＜Iceclad＞ \n＜Barrier＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Suzune Kazuki] or level 4 or lower [Ice-Snow] trait Digimon card from your hand without paying the cost.\n[All Turns] [Once Per Turn] When other Digimon are played or digivolve, trash any 3 digivolution cards from your opponent's Digimon. Then, 1 of their Digimon with no digivolution cards can't suspend until their turn ends."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-017`

```text
EX11-017 Skadimon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-017.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds PlayWithoutCost, SubTrigger, TrashDigivolution, Restrict. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "PlayWithoutCost",
L51: kind: ["Digimon"],
L63: optional: true,
L66: frequency: "OncePerTurn",
L67: sharedUseKey: "ir-shared-0",
L70: trigger: "WhenDigivolving",
L73: kind: "PlayWithoutCost",
L90: kind: ["Digimon"],
L102: optional: true,
L105: frequency: "OncePerTurn",
L106: sharedUseKey: "ir-shared-0",
L109: trigger: "WhenAttacking",
L112: kind: "PlayWithoutCost",
L129: kind: ["Digimon"],
L141: optional: true,
L144: frequency: "OncePerTurn",
L145: sharedUseKey: "ir-shared-0",
L148: trigger: "AllTurns",
L151: kind: "SubTrigger",
L155: kind: ["Digimon"],
L159: kind: "TrashDigivolution",
L163: kind: ["Digimon"],
L171: kind: "Restrict",
L176: kind: ["Digimon"],
L181: duration: "untilOpponentTurnEnd",
L186: kind: "SubTrigger",
L190: kind: ["Digimon"],
L194: kind: "TrashDigivolution",
L198: kind: ["Digimon"],
L206: kind: "Restrict",
L211: kind: ["Digimon"],
L216: duration: "untilOpponentTurnEnd",
L221: frequency: "OncePerTurn",
L226: digivolutionRequirement: [
L230: cost: 3,
L236: registerIrCard("EX11-017", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-014 (LIBERATOR/Ice-Snow), EX11-015 (Ice-Snow/LIBERATOR), EX11-016 (Ice-Snow/LIBERATOR), EX8-019 (LIBERATOR/Ice-Snow). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-017.test.ts` contains 2 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("shares one once-per-turn play effect across all three timings", () => {
L9: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L17: it("reacts to any other Digimon play or digivolution and restricts only a source-less opponent", () => {
L20: expect(allTurns.frequency).toBe("OncePerTurn");
L21: expect(allTurns.actions).toEqual([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-017.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-017", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-018 — Ryugumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-018",
  "set": "EX11",
  "nameEn": "Ryugumon",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 5,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Mollusk",
    "LIBERATOR",
    "Aquatic"
  ],
  "effectText": "＜Evade＞ \n＜Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait)＞ (When this Digimon would leave the battle area other than in battle, you may play 1 Level 5 or lower Digimon card with [Aqua] or [Sea Animal] in any of its traits from its digivolution cards without paying the cost.)\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card, 1 of your Digimon unsuspends.\n[All Turns] [Once Per Turn] When effects add to this Digimon's digivolution cards, return 1 of your opponent's Digimon with as many or fewer digivolution cards as this Digimon to the bottom of the deck.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-018"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Evade＞ \n＜Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait)＞ (When this Digimon would leave the battle area other than in battle, you may play 1 Level 5 or lower Digimon card with [Aqua] or [Sea Animal] in any of its traits from its digivolution cards without paying the cost.)\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card, 1 of your Digimon unsuspends.\n[All Turns] [Once Per Turn] When effects add to this Digimon's digivolution cards, return 1 of your opponent's Digimon with as many or fewer digivolution cards as this Digimon to the bottom of the deck."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-018`

```text
EX11-018 Ryugumon
  Q&A (2):
    Q6515 (2026-05-08): I activated <Decode> to play a Digimon when this card's DP became 0 and it would be deleted, then I activated <Evade>, and it was prevented from being deleted. If this card's DP is still 0 after that and it would be deleted, can I activate <Decode> again?
      A: Yes, you can. When this card's DP becomes 0 and it would be deleted by a rule check, its <Evade> and <Decode> will trigger simultaneously. You can activate <Decode>, play a Digimon, activate <Evade>, prevent the deletion, then activate this card's <Decode> again when it would be deleted by the next rule check. If the played Digimon has [On Play] effects, once all processing has been resolved for the rule checks, those [On Play] effects will trigger simultaneously.
    Q6516 (2026-05-08): When this card would be deleted, can I first activate <Evade> to prevent the deletion, then activate <Decode> to play a card from digivolution cards?
      A: Yes, you can.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-018.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Unsuspend, SubTrigger, Return. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "Unsuspend",
L38: kind: ["Digimon"],
L42: cost: {
L43: kind: "place",
L48: kind: ["Digimon"],
L64: optional: true,
L65: abortOnDecline: true,
L68: frequency: "OncePerTurn",
L69: sharedUseKey: "ir-shared-0",
L72: trigger: "WhenDigivolving",
L75: kind: "Unsuspend",
L79: kind: ["Digimon"],
L83: cost: {
L84: kind: "place",
L89: kind: ["Digimon"],
L105: optional: true,
L106: abortOnDecline: true,
L109: frequency: "OncePerTurn",
L110: sharedUseKey: "ir-shared-0",
L113: trigger: "WhenAttacking",
L116: kind: "Unsuspend",
L120: kind: ["Digimon"],
L124: cost: {
L125: kind: "place",
L130: kind: ["Digimon"],
L146: optional: true,
L147: abortOnDecline: true,
L150: frequency: "OncePerTurn",
L151: sharedUseKey: "ir-shared-0",
L154: trigger: "AllTurns",
L157: kind: "SubTrigger",
L164: kind: "Return",
L169: kind: ["Digimon"],
L178: frequency: "OncePerTurn",
L185: registerIrCard("EX11-018", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-017 (Mollusk/LIBERATOR/Aquatic), BT19-019 (Mollusk/LIBERATOR/Aquatic), BT19-024 (Mollusk/LIBERATOR/Aquatic), BT19-027 (Mollusk/LIBERATOR/Aquatic). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-018.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("places an Aqua/Sea Animal card under itself and unsuspends one Digimon", async () => {
L8: const s = setupEngine(
L18: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryugumon").instanceId })).toEqual({
L21: await settle(
L26: expect(
L29: expect(
L34: it("triggers the bottom-deck return only when effects add cards under this Digimon", () => {
L37: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L48: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-018.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-018", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-019 — Shoemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-019",
  "set": "EX11",
  "nameEn": "Shoemon",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 2000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 2,
      "memoryCost": 0
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Puppet",
    "LIBERATOR"
  ],
  "effectText": "[On Deletion] You may play 1 [Familiar] Token. (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.)",
  "inheritedEffectText": "＜Barrier＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-019"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Deletion] You may play 1 [Familiar] Token. (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.)"
   - Inherited: "＜Barrier＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-019`

```text
EX11-019 Shoemon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-019.ts`; triggers OnDeletion, Static; action/condition kinds PlayToken. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnDeletion",
L14: kind: "PlayToken",
L18: optional: true,
L23: trigger: "Static",
L38: registerIrCard("EX11-019", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/LIBERATOR), BT22-029 (Puppet/LIBERATOR), BT22-032 (Puppet/LIBERATOR), BT22-036 (Puppet/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-019.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("plays one Familiar Token when deleted", async () => {
L8: const s = setupEngine(
L15: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId?.includes("Familiar")), 600);
L16: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId?.includes("Familiar"))).toBe(true);
L19: it("encodes the optional Familiar Token and inherited Barrier", () => {
L21: expect(compiled.effects[0]).toMatchObject({
L25: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-019.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-019", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-020 — Hanimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-020",
  "set": "EX11",
  "nameEn": "Hanimon",
  "colors": [
    "Yellow",
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Purple",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Puppet",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Kyaromon]: Cost 0 \n\n[On Deletion] If deleted other than in battle, you may play 1 [Shoemon] trait from your hand without paying the cost.",
  "inheritedEffectText": "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by deleting 1 of your other Digimon, end that attack.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-020"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Kyaromon]: Cost 0 \n\n[On Deletion] If deleted other than in battle, you may play 1 [Shoemon] trait from your hand without paying the cost."
   - Inherited: "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by deleting 1 of your other Digimon, end that attack."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-020`

```text
EX11-020 Hanimon
  Q&A (3):
    Q5803 (2026-02-06): I tried to delete 1 of my other Digimon using this card's inherited effect when an opponent's Digimon attacked, but I couldn't delete the other Digimon due to another effect. Can I end that attack at such times?
      A: No, you can't end that attack. If the "by" condition isn't met, the rest of the effect isn't processed. In this case, if you can't delete 1 of your other Digimon, then you can't end the attack.
    Q5804 (2026-02-06): What does "end the attack" mean, exactly?
      A: After this effect activates, the current timing makes a transition to the end of attack timing. For example, if this effect activates during the attack declaration timing, it will make a transition to the end of attack timing. A transition to the counter timing or block timing won't occur, and the attack won't succeed.
    Q5805 (2026-02-06): Can an "end the attack" effect end an attack by a Digimon that isn't affected by effects?
      A: Yes, such attacks can be ended. "End the attack" effects are effects that change the timing, they don't affect an attacking Digimon.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-020.ts`; triggers OnDeletion, OpponentsTurn; action/condition kinds PlayWithoutCost, SubTrigger, EndAttack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "OnDeletion",
L18: kind: "PlayWithoutCost",
L33: condition: {
L34: kind: "not",
L35: condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
L38: optional: true,
L43: trigger: "OpponentsTurn",
L46: kind: "SubTrigger",
L50: kind: "EndAttack",
L53: cost: {
L54: kind: "deleteOwn",
L59: kind: ["Digimon"],
L68: frequency: "OncePerTurn",
L73: digivolutionRequirement: [
L76: cost: 0,
L82: registerIrCard("EX11-020", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/LIBERATOR), BT22-029 (Puppet/LIBERATOR), BT22-032 (Puppet/LIBERATOR), BT22-036 (Puppet/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-020.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("plays a Shoemon from hand when deleted by an effect", async () => {
L8: const s = setupEngine(
L15: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-019"), 600);
L16: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-019")).toBe(true);
L19: it("encodes zero-cost Kyaromon evolution and the cost-gated inherited attack ending effect", () => {
L21: expect(compiled.digivolutionRequirement).toEqual([{ names: ["Kyaromon"], cost: 0, isAlternate: true }]);
L22: expect(compiled.effects[0]).toMatchObject({
L34: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-020.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-020", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-021 — Kokeshimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-021",
  "set": "EX11",
  "nameEn": "Kokeshimon",
  "colors": [
    "Yellow",
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 6000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 3,
      "memoryCost": 3
    },
    {
      "color": "Purple",
      "level": 3,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Puppet",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Puppet] trait: Cost 2 \n\n[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Mirai Kinosaki] from your hand without paying the cost.",
  "inheritedEffectText": "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by deleting 1 of your other Digimon, end that attack.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-021"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Puppet] trait: Cost 2 \n\n[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Mirai Kinosaki] from your hand without paying the cost."
   - Inherited: "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by deleting 1 of your other Digimon, end that attack."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-021`

```text
EX11-021 Kokeshimon
  Q&A (3):
    Q5806 (2026-02-06): I tried to delete 1 of my other Digimon using this card's inherited effect when an opponent's Digimon attacked, but I couldn't delete the other Digimon due to another effect. Can I end that attack at such times?
      A: No, you can't end that attack. If the "by" condition isn't met, the rest of the effect isn't processed. In this case, if you can't delete 1 of your other Digimon, then you can't end the attack.
    Q5807 (2026-02-06): What does "end the attack" mean, exactly?
      A: After this effect activates, the current timing makes a transition to the end of attack timing. For example, if this effect activates during the attack declaration timing, it will make a transition to the end of attack timing. A transition to the counter timing or block timing won't occur, and the attack won't succeed.
    Q5808 (2026-02-06): Can an "end the attack" effect end an attack by a Digimon that isn't affected by effects?
      A: Yes, such attacks can be ended. "End the attack" effects are effects that change the timing, they don't affect an attacking Digimon.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-021.ts`; triggers WhenDigivolving, OpponentsTurn; action/condition kinds PlayWithoutCost, SubTrigger, Delete, EndAttack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "WhenDigivolving",
L16: kind: "PlayWithoutCost",
L31: condition: {
L32: kind: "youHaveFewOrEqual",
L35: kind: ["Tamer"],
L40: optional: true,
L45: trigger: "OpponentsTurn",
L48: kind: "SubTrigger",
L52: kind: "Delete",
L57: kind: ["Digimon"],
L61: cost: true,
L65: kind: "EndAttack",
L68: optional: true,
L69: abortOnDecline: true,
L73: frequency: "OncePerTurn",
L78: digivolutionRequirement: [
L82: cost: 2,
L88: registerIrCard("EX11-021", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/LIBERATOR), BT22-029 (Puppet/LIBERATOR), BT22-032 (Puppet/LIBERATOR), BT22-036 (Puppet/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-021.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("legally evolves from a Puppet level 3", async () => {
L8: const s = setupEngine(
L18: expect(
L19: s.engine.applyIntent(0, {
L25: await settle(() => s.perm("base").topCard?.cardId === "EX11-021", 600);
L26: expect(s.perm("base").topCard?.cardId).toBe("EX11-021");
L29: it("encodes conditional Mirai play and the cost-gated inherited EndAttack", () => {
L31: expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Puppet"], cost: 2, isAlternate: true }]);
L32: expect(compiled.effects[0]).toMatchObject({
L44: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-021.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-021", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-022 — Karakurumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-022",
  "set": "EX11",
  "nameEn": "Karakurumon",
  "colors": [
    "Yellow",
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 4,
      "memoryCost": 4
    },
    {
      "color": "Purple",
      "level": 4,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Puppet",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Yellow/Purple Lv.4 w/[Puppet] trait: Cost 3 \n\n＜Scapegoat＞ \n[On Play] [When Digivolving] You may play 1 [Puppet] trait Digimon card with 4000 DP or less from your hand or trash without paying the cost. At turn end, delete the Digimon this effect played.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 of your Tokens or other [Puppet] trait Digimon, it doesn't leave.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-022"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Yellow/Purple Lv.4 w/[Puppet] trait: Cost 3 \n\n＜Scapegoat＞ \n[On Play] [When Digivolving] You may play 1 [Puppet] trait Digimon card with 4000 DP or less from your hand or trash without paying the cost. At turn end, delete the Digimon this effect played."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 of your Tokens or other [Puppet] trait Digimon, it doesn't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-022`

```text
EX11-022 Karakurumon
  Q&A (2):
    Q5809 (2026-02-06): Do I delete the Digimon that was played by this card's [On Play] [When Digivolving] effect at the end of the turn?
      A: Yes, it's deleted upon the deletion timing.
    Q5810 (2026-02-06): What is the processing order for an effect that triggers at the end of the turn and the deletion of a Digimon played by this card's [On Play] [When Digivolving] effect?
      A: The pending processing for the effect that triggers at the end of the turn and the deletion at the end of the turn are considered to be processing that triggers simultaneously. Therefore, the turn player can choose the processing order.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-022.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns; action/condition kinds PlayWithoutCost, DelayedDelete, Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: // Inherited [All Turns] Replacement cost: "1 of your Tokens OR other [Puppet] trait Digimon"
L13: trigger: "Static",
L23: trigger: "OnPlay",
L26: kind: "PlayWithoutCost",
L30: kind: ["Digimon"],
L46: optional: true,
L55: kind: "DelayedDelete",
L61: trigger: "WhenDigivolving",
L64: kind: "PlayWithoutCost",
L68: kind: ["Digimon"],
L84: optional: true,
L93: kind: "DelayedDelete",
L99: trigger: "AllTurns",
L102: kind: "Replacement",
L108: cost: {
L109: kind: "deleteOwn",
L119: kind: ["Digimon"],
L136: frequency: "OncePerTurn",
L141: digivolutionRequirement: [
L145: cost: 3,
L152: registerIrCard("EX11-022", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/LIBERATOR), BT22-029 (Puppet/LIBERATOR), BT22-032 (Puppet/LIBERATOR), BT22-036 (Puppet/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-022.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
L41: it("deletes ONLY the Digimon it played at turn end, leaving the board alone", async () => {
L42: const s = setupEngine(
L59: await settle(() => onField(s, puppet.instanceId));
L60: expect(onField(s, puppet.instanceId)).toBe(true); // the free play happened
L63: await settle(() => !onField(s, puppet.instanceId));
L66: expect(onField(s, puppet.instanceId)).toBe(false);
L68: expect(onField(s, meId)).toBe(true);
L69: expect(onField(s, bystanderId)).toBe(true);
L74: it("arms nothing when the effect plays no Digimon", async () => {
L75: const s = setupEngine(
L93: expect(onField(s, meId)).toBe(true);
L94: expect(onField(s, bystanderId)).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-022.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-022", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-023 — Kaguyamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-023",
  "set": "EX11",
  "nameEn": "Kaguyamon",
  "colors": [
    "Yellow",
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 12,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 5,
      "memoryCost": 4
    },
    {
      "color": "Purple",
      "level": 5,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Puppet",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Puppet] trait: Cost 3 \n\n＜Alliance＞ \n＜Scapegoat＞ \n[When Digivolving] [End of Opponent's Turn] [Once Per Turn] Delete 1 of your opponent's Digimon with the lowest level.\n[All Turns] [Once Per Turn] When other Digimon are deleted, you may play 1 level 4 or lower [Puppet] trait Digimon card from your trash without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-023"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Puppet] trait: Cost 3 \n\n＜Alliance＞ \n＜Scapegoat＞ \n[When Digivolving] [End of Opponent's Turn] [Once Per Turn] Delete 1 of your opponent's Digimon with the lowest level.\n[All Turns] [Once Per Turn] When other Digimon are deleted, you may play 1 level 4 or lower [Puppet] trait Digimon card from your trash without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-023`

```text
EX11-023 Kaguyamon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-023.ts`; triggers Static, WhenDigivolving, EndOfOpponentsTurn, AllTurns; action/condition kinds Delete, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "WhenDigivolving",
L34: kind: "Delete",
L38: kind: ["Digimon"],
L45: frequency: "OncePerTurn",
L46: sharedUseKey: "ir-shared-0",
L49: trigger: "EndOfOpponentsTurn",
L52: kind: "Delete",
L56: kind: ["Digimon"],
L63: frequency: "OncePerTurn",
L64: sharedUseKey: "ir-shared-0",
L67: trigger: "AllTurns",
L70: kind: "SubTrigger",
L74: kind: ["Digimon"],
L78: kind: "PlayWithoutCost",
L82: kind: ["Digimon"],
L98: optional: true,
L103: frequency: "OncePerTurn",
L108: digivolutionRequirement: [
L112: cost: 3,
L118: registerIrCard("EX11-023", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/LIBERATOR), BT22-029 (Puppet/LIBERATOR), BT22-032 (Puppet/LIBERATOR), BT22-036 (Puppet/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-023.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("deletes the opponent's lowest-level Digimon when digivolving", async () => {
L8: const s = setupEngine(
L21: expect(
L22: s.engine.applyIntent(0, {
L28: await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX11-019"), 600);
L29: expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-019")).toBe(true);
L30: expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-021")).toBe(true);
L33: it("encodes Alliance, Scapegoat, shared once-per-turn deletion, and any-other-deletion recursion", () => {
L35: expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Puppet"], cost: 3, isAlternate: true }]);
L36: expect(compiled.effects.slice(0, 2)).toEqual(
L43: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L49: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-023.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-023", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-024 — Cendrillmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-024",
  "set": "EX11",
  "nameEn": "Cendrillmon",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 5,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Puppet",
    "LIBERATOR"
  ],
  "effectText": "＜Alliance＞ \n＜Overclock ([Puppet] Trait)＞ (At the end of your turn, by deleting 1 of your Tokens or other [Puppet] trait Digimon, this Digimon attacks a player without suspending.)\n[On Play] [When Digivolving] You may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost. Then, you may play 1 [Familiar] Token for each of your opponent's Digimon. (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.)\n[When Digivolving] [When Attacking] To 1 of your opponent's Digimon, give -3000 DP for the turn for each of your Digimon.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-024"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Alliance＞ \n＜Overclock ([Puppet] Trait)＞ (At the end of your turn, by deleting 1 of your Tokens or other [Puppet] trait Digimon, this Digimon attacks a player without suspending.)\n[On Play] [When Digivolving] You may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost. Then, you may play 1 [Familiar] Token for each of your opponent's Digimon. (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.)\n[When Digivolving] [When Attacking] To 1 of your opponent's Digimon, give -3000 DP for the turn for each of your Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-024`

```text
EX11-024 Cendrillmon
  Q&A (1):
    Q5811 (2026-02-06): Multiple effects trigger when this card digivolves. In what order can they be activated?
      A: The effects trigger simultaneously, so the player can choose the activation order.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-024.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds PlayWithoutCost, PlayToken, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "PlayWithoutCost",
L38: kind: ["Digimon"],
L54: optional: true,
L57: kind: "PlayToken",
L61: optional: true,
L66: kind: ["Digimon"],
L74: trigger: "WhenDigivolving",
L77: kind: "PlayWithoutCost",
L81: kind: ["Digimon"],
L97: optional: true,
L100: kind: "PlayToken",
L104: optional: true,
L109: kind: ["Digimon"],
L117: trigger: "WhenDigivolving",
L120: kind: "ModifyDP",
L124: kind: ["Digimon"],
L129: duration: "forTheTurn",
L134: kind: ["Digimon"],
L142: trigger: "WhenAttacking",
L145: kind: "ModifyDP",
L149: kind: ["Digimon"],
L154: duration: "forTheTurn",
L159: kind: ["Digimon"],
L169: digivolutionRequirement: [
L173: cost: 3,
L179: registerIrCard("EX11-024", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/LIBERATOR), BT22-029 (Puppet/LIBERATOR), BT22-032 (Puppet/LIBERATOR), BT22-036 (Puppet/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-024.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("evolves from a yellow level 5 and resolves the When Digivolving reduction", async () => {
L8: const s = setupEngine(
L21: expect(
L22: s.engine.applyIntent(0, {
L28: await settle(() => s.perm("base").topCard?.cardId === "EX11-024" && opponent.currentDP < initialDP, 600);
L29: expect(s.perm("base").topCard?.cardId).toBe("EX11-024");
L30: expect(opponent.currentDP).toBeLessThan(initialDP);
L33: it("encodes Alliance, Overclock, Puppet play, Familiar scaling, and per-own-Digimon DP scaling", () => {
L35: expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Yellow"], cost: 3, isAlternate: true }]);
L36: expect(compiled.effects.slice(0, 2)).toEqual(
L43: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L54: expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-024.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-024", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-025 — FunBeemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-025",
  "set": "EX11",
  "nameEn": "FunBeemon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Black",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Insectoid",
    "X Antibody",
    "Royal Base",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.2 w/[Royal Base] trait: Cost 0 \n\n[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Reboot＞ \n[Start of Your Main Phase] Add your top face-down security card to the hand. Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card.",
  "inheritedEffectText": "[All Turns] This Digimon gets +1000 DP.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-025"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Royal Base] trait: Cost 0 \n\n[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Reboot＞ \n[Start of Your Main Phase] Add your top face-down security card to the hand. Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card."
   - Inherited: "[All Turns] This Digimon gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-025`

```text
EX11-025 FunBeemon
  Errata (2026-02-06):
    notes:  The emblem design on the card differs from the official emblem design.
  Q&A (4):
    Q5812 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5813 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5814 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5815 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-025.ts`; triggers OpponentsTurn, StartOfYourMainPhase, AllTurns; action/condition kinds GainKeyword, SecurityManipulation, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OpponentsTurn",
L14: kind: "GainKeyword",
L18: kind: ["Digimon"],
L32: duration: "permanent",
L38: trigger: "StartOfYourMainPhase",
L41: kind: "SecurityManipulation",
L48: kind: "SecurityManipulation",
L54: kind: ["Digimon"],
L67: optional: true,
L72: trigger: "AllTurns",
L75: kind: "ModifyDP",
L84: duration: "permanent",
L92: digivolutionRequirement: [
L96: cost: 0,
L102: registerIrCard("EX11-025", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-045 (Insectoid/X Antibody/Royal Base/LIBERATOR), BT19-048 (X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-052 (X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-053 (X Antibody/Royal Base/LIBERATOR/Insectoid). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-025.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("legally evolves from a Royal Base level 2", async () => {
L8: const s = setupEngine(
L13: expect(
L14: s.engine.applyIntent(0, {
L20: await settle(() => s.perm("base").topCard?.cardId === "EX11-025", 600);
L21: expect(s.perm("base").topCard?.cardId).toBe("EX11-025");
L24: it("encodes Security Reboot, face-up bottom placement, and inherited DP", () => {
L26: expect(compiled.digivolutionRequirement).toEqual([
L29: expect(compiled.effects[0]).toMatchObject({
L34: expect(compiled.effects[1]).toMatchObject({
L48: expect(compiled.effects[2]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-025.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-025", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-026 — Pteromon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-026",
  "set": "EX11",
  "nameEn": "Pteromon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 2,
      "memoryCost": 0
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Bird Dragon",
    "LIBERATOR"
  ],
  "effectText": "[When Moving] [On Play] You may suspend 1 Digimon. If this effect suspended your Digimon, 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait gets +3000 DP until your opponent's turn ends.",
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When this Digimon wins a battle, gain 1 memory.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-026"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Moving] [On Play] You may suspend 1 Digimon. If this effect suspended your Digimon, 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait gets +3000 DP until your opponent's turn ends."
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon wins a battle, gain 1 memory."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-026`

```text
EX11-026 Pteromon
  Q&A (6):
    Q5816 (2026-02-06): Can I use this card's [When Moving] [On Play] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
    Q5817 (2026-02-06): When does "when this Digimon wins a battle" trigger?
      A: It triggers when the battle is won. When the Digimon with this effect wins a battle, the opponent's Digimon that lost the battle is deleted, then the "when this Digimon wins a battle" effect can be activated.
    Q5818 (2026-02-06): Does a "when this Digimon wins a battle" effect also trigger when a battle against a Security Digimon is won?
      A: Yes, it triggers.
    Q5819 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon that lost the battle is deleted. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the effects that trigger upon the losing Digimon being deleted?
      A: They trigger simultaneously, so the turn player can activate their effects first.
    Q5820 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the loser Digimon's effects such as "when this Digimon would be deleted" and "when this Digimon would leave the battle area" effects?
      A: The "when this Digimon would be deleted" and "when this Digimon would leave the battle area" effects can be activated first.
    Q5821 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, can the "when this Digimon wins a battle" effect be activated even if an effect prevents the opponent's Digimon from being deleted?
      A: Yes, it can be activated.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-026.ts`; triggers WhenMoving, OnPlay, YourTurn; action/condition kinds Suspend, ModifyDP, SubTrigger, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L12: cost: 0,
L18: trigger: "WhenMoving",
L21: kind: "Suspend",
L25: kind: ["Digimon"],
L29: optional: true,
L32: kind: "ModifyDP",
L36: kind: ["Digimon"],
L51: duration: "untilOpponentTurnEnd",
L52: condition: {
L53: kind: "ifThisEffectActed",
L60: trigger: "OnPlay",
L63: kind: "Suspend",
L67: kind: ["Digimon"],
L71: optional: true,
L74: kind: "ModifyDP",
L78: kind: ["Digimon"],
L93: duration: "untilOpponentTurnEnd",
L94: condition: {
L95: kind: "ifThisEffectActed",
L102: trigger: "YourTurn",
L105: kind: "SubTrigger",
L112: kind: "GainMemory",
L119: frequency: "OncePerTurn",
L126: registerIrCard("EX11-026", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-101 (LIBERATOR/Bird Dragon), EX11-028 (Bird Dragon/LIBERATOR), EX11-032 (Bird Dragon/LIBERATOR), EX11-035 (LIBERATOR/Bird Dragon). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-026.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("suspends an own Digimon and grants an eligible ally +3000 DP", async () => {
L8: const s = setupEngine(
L15: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
L18: await settle(() => ally.currentDP === initialDP + 3000, 600);
L19: expect(ally.isSuspended).toBe(true);
L20: expect(ally.currentDP).toBe(initialDP + 3000);
L23: it("encodes both entry timings, any-player suspension, exact trait groups, and inherited battle memory", () => {
L25: expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
L27: expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L46: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-026.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-026", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-027 — Maquinamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-027",
  "set": "EX11",
  "nameEn": "Maquinamon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Black",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Composite",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.2 w/[Maquinamon] in text: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 [Maquinamon] and 1 card with [Maquinamon] in its text among them to the hand. Return the rest to the bottom of the deck. Then, you may link this Digimon or 1 [Maquinamon] in your hand to 1 of your other Digimon without paying the cost.",
  "rarity": "C",
  "maxCountInDeck": 50,
  "imageId": "EX11-027",
  "linkDp": 2000,
  "linkEffect": "[All Turns] When this Digimon would leave the battle area, by placing 1 of its link cards as its bottom digivolution card, it doesn't leave.",
  "linkRequirement": "[Link] [Maquinamon] in text: Cost 2"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Maquinamon] in text: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 [Maquinamon] and 1 card with [Maquinamon] in its text among them to the hand. Return the rest to the bottom of the deck. Then, you may link this Digimon or 1 [Maquinamon] in your hand to 1 of your other Digimon without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-027`

```text
EX11-027 Maquinamon
  Q&A (5):
    Q5822 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5823 (2026-02-06): If I activate this card's link effect and this link card is placed as the bottom digivolution card, do "when digivolution cards are added" effects trigger?
      A: Yes, they trigger.
    Q5824 (2026-02-06): If a card was placed in digivolution cards by <Mind Link>, can I activate this card's link effect and place that card as the bottom digivolution card?
      A: No, you can't. A link card is a card plugged in sideways with a Digimon upon a link.
    Q5850 (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used a [When Moving] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
      A: No, you can't. Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.
    Q5878 (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used an [On Play] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
      A: No, you can't. Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-027.ts`; triggers OnPlay; action/condition kinds RevealAdd, Link. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "OnPlay",
L11: kind: "RevealAdd",
L28: kind: "Link",
L35: filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
L40: optional: true,
L47: digivolutionRequirement: [{ level: 2, texts: ["Maquinamon"], cost: 0, isAlternate: true }],
L50: registerIrCard("EX11-027", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-006 (Composite), BT10-009 (Composite), BT10-012 (Composite), BT10-013 (Composite). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-027.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("reveals Maquinamon cards, bottoms the rest, and links this Digimon to another Digimon", async () => {
L8: const s = setupEngine(
L20: expect(
L21: s.engine.applyIntent(0, {
L26: await settle(() => s.perm("ally").linked.length === 1, 600);
L27: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-073")).toBe(true);
L28: expect(s.perm("ally").linked).toHaveLength(1);
L31: it("recognizes a card with [Maquinamon] in its effect text", async () => {
L32: const s = setupEngine(
L44: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquinamon").instanceId })).toEqual({
L47: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-033"), 600);
L48: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-033")).toBe(true);
L51: it("records complete compiled coverage after the link behavior is implemented", () => {
L53: expect(compiled.coverage).toBe("full");
L54: expect(compiled.residual).toEqual([]);
L55: expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay" });
L56: expect(compiled.effects[0]?.actions[0]).toMatchObject({
L61: expect(compiled.effects[0]?.actions[1]).toMatchObject({ kind: "Link", payCost: false, optional: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-027.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-027", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-028 — Galemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-028",
  "set": "EX11",
  "nameEn": "Galemon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 4,
  "dp": 4000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 3,
      "memoryCost": 2
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Bird Dragon",
    "LIBERATOR"
  ],
  "effectText": "[On Play] [When Digivolving] You may suspend 1 Digimon.\n[All Turns] [Once Per Turn] When any of your Digimon suspend, if you have 1 or fewer Tamers, you may play 1 [Shoto Kazama] trait from your hand without paying the cost.",
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When this Digimon wins a battle, gain 1 memory.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-028"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] You may suspend 1 Digimon.\n[All Turns] [Once Per Turn] When any of your Digimon suspend, if you have 1 or fewer Tamers, you may play 1 [Shoto Kazama] trait from your hand without paying the cost."
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon wins a battle, gain 1 memory."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-028`

```text
EX11-028 Galemon
  Q&A (7):
    Q5825 (2026-02-06): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
    Q5826 (2026-02-06): My Digimon attacks an opponent's Digimon using <Vortex>, and I use this card's [All Turns] effect to play EX11-062 [Shoto Kazama]. Can I then use EX11-062 [Shoto Kazama]'s [Your Turn] effect to change the <Vortex> attack target to a player?
      A: No, you can't. EX11-062 [Shoto Kazama]'s [Your Turn] effect allows players to also be chosen as the attack target at the time of an attack declaration. It doesn't allow for changing the attack target.
      related: EX11-062
    Q5827 (2026-02-06): When does "when this Digimon wins a battle" trigger?
      A: It triggers when the battle is won. When the Digimon with this effect wins a battle, the opponent's Digimon that lost the battle is deleted, then the "when this Digimon wins a battle" effect can be activated.
    Q5828 (2026-02-06): Does a "when this Digimon wins a battle" effect also trigger when a battle against a Security Digimon is won?
      A: Yes, it triggers.
    Q5829 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon that lost the battle is deleted. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the effects that trigger upon the losing Digimon being deleted?
      A: They trigger simultaneously, so the turn player can activate their effects first.
    Q5830 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the loser Digimon's effects such as "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects?
      A: The "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects can be activated first.
    Q5831 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, can the "when this Digimon wins a battle" effect be activated even if an effect prevents the opponent's Digimon from being deleted?
      A: Yes, it can be activated.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-028.ts`; triggers OnPlay, WhenDigivolving, AllTurns, YourTurn; action/condition kinds Suspend, SubTrigger, PlayWithoutCost, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L12: cost: 2,
L18: trigger: "OnPlay",
L21: kind: "Suspend",
L25: kind: ["Digimon"],
L29: optional: true,
L34: trigger: "WhenDigivolving",
L37: kind: "Suspend",
L41: kind: ["Digimon"],
L45: optional: true,
L50: trigger: "AllTurns",
L53: kind: "SubTrigger",
L57: kind: ["Digimon"],
L61: kind: "PlayWithoutCost",
L76: condition: {
L77: kind: "youHave",
L80: kind: ["Tamer"],
L84: optional: true,
L89: frequency: "OncePerTurn",
L92: trigger: "YourTurn",
L95: kind: "SubTrigger",
L102: kind: "GainMemory",
L109: frequency: "OncePerTurn",
L116: registerIrCard("EX11-028", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-101 (LIBERATOR/Bird Dragon), EX11-026 (Bird Dragon/LIBERATOR), EX11-032 (Bird Dragon/LIBERATOR), EX11-035 (LIBERATOR/Bird Dragon). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-028.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("encodes its evolution requirement and all catalog effects", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([{ level: 3, cost: 2, isAlternate: true }]);
L9: expect(compiled.effects).toEqual(
L36: expect(allTurns.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-028.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-028", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-029 — Turbomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-029",
  "set": "EX11",
  "nameEn": "Turbomon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 5000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 3,
      "memoryCost": 2
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Beast",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Maquinamon]: Cost 2 \n\n[On Play] [When Digivolving] You may link 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer Tamers, you may play 1 [Unchained] from your hand or trash without paying the cost.",
  "inheritedEffectText": "＜Piercing＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-029"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Maquinamon]: Cost 2 \n\n[On Play] [When Digivolving] You may link 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer Tamers, you may play 1 [Unchained] from your hand or trash without paying the cost."
   - Inherited: "＜Piercing＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-029`

```text
EX11-029 Turbomon
  Q&A (1):
    Q5832 (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
      A: No, they don't trigger. "When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-029.ts`; triggers OnPlay, WhenDigivolving, YourTurn, Static; action/condition kinds Link, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: digivolutionRequirement: [
L16: cost: 2,
L21: cost: 2,
L27: trigger: "OnPlay",
L30: kind: "Link",
L48: kind: ["Digimon"],
L52: optional: true,
L57: trigger: "WhenDigivolving",
L60: kind: "Link",
L78: kind: ["Digimon"],
L82: optional: true,
L87: trigger: "YourTurn",
L90: kind: "SubTrigger",
L94: kind: "PlayWithoutCost",
L109: condition: {
L110: kind: "permanentCount",
L114: kind: ["Tamer"],
L120: optional: true,
L125: frequency: "OncePerTurn",
L128: trigger: "Static",
L143: registerIrCard("EX11-029", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-033 (Beast/LIBERATOR), EX11-036 (Beast/LIBERATOR), AD1-010 (Beast), BT1-031 (Beast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-029.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements, link sources, and linked Unchained trigger", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L13: expect(compiled.effects).toContainEqual(
L33: expect(linked).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked" }] });
L34: expect(linked.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-029.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-029", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-030 — ForgeBeemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-030",
  "set": "EX11",
  "nameEn": "ForgeBeemon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 4,
  "dp": 4000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 3,
      "memoryCost": 3
    },
    {
      "color": "Black",
      "level": 3,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "X Antibody",
    "Royal Base",
    "LIBERATOR",
    "Insectoid"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Royal Base] trait: Cost 2 \n\n[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Reboot＞ \n[On Play] [When Digivolving] Add your top face-down security card to the hand. Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card.",
  "inheritedEffectText": "[All Turns] This Digimon gets +1000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-030"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Royal Base] trait: Cost 2 \n\n[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Reboot＞ \n[On Play] [When Digivolving] Add your top face-down security card to the hand. Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card."
   - Inherited: "[All Turns] This Digimon gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-030`

```text
EX11-030 ForgeBeemon
  Q&A (4):
    Q5833 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5834 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5835 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5836 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-030.ts`; triggers OpponentsTurn, OnPlay, WhenDigivolving, AllTurns; action/condition kinds GainKeyword, SecurityManipulation, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: digivolutionRequirement: [
L9: cost: 3,
L16: cost: 2,
L22: trigger: "OpponentsTurn",
L25: kind: "GainKeyword",
L29: kind: ["Digimon"],
L43: duration: "permanent",
L49: trigger: "OnPlay",
L52: kind: "SecurityManipulation",
L60: kind: "SecurityManipulation",
L66: kind: ["Digimon"],
L79: optional: true,
L84: trigger: "WhenDigivolving",
L87: kind: "SecurityManipulation",
L95: kind: "SecurityManipulation",
L101: kind: ["Digimon"],
L114: optional: true,
L119: trigger: "AllTurns",
L122: kind: "ModifyDP",
L131: duration: "permanent",
L141: registerIrCard("EX11-030", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-052 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-053 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), EX11-031 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-030.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves standard and Royal Base evolution, security, and inherited effects", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L12: expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OpponentsTurn", isSecurity: true }));
L14: expect(compiled.effects).toContainEqual(
L36: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-030.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-030", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-031 — Vespamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-031",
  "set": "EX11",
  "nameEn": "Vespamon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 8,
  "dp": 8000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 4,
      "memoryCost": 4
    },
    {
      "color": "Black",
      "level": 4,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "X Antibody",
    "Royal Base",
    "LIBERATOR",
    "Insectoid"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Royal Base] trait: Cost 3 \n\n[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Blocker＞ \n[On Play] [When Digivolving] For each of your face-up security cards, suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When any of your [Royal Base] trait Digimon would leave the battle area other than by your effects, by flipping your top face-up security card face down, 1 of those Digimon doesn't leave.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-031"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Royal Base] trait: Cost 3 \n\n[Security] [Opponent's Turn] All of your [Royal Base] trait Digimon gain ＜Blocker＞ \n[On Play] [When Digivolving] For each of your face-up security cards, suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends."
   - Inherited: "[All Turns] [Once Per Turn] When any of your [Royal Base] trait Digimon would leave the battle area other than by your effects, by flipping your top face-up security card face down, 1 of those Digimon doesn't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-031`

```text
EX11-031 Vespamon
  Q&A (1):
    Q5837 (2026-02-06): Can this card's [On Play] [When Digivolving] effect suspend a different card from the one that's given "can't unsuspend until their turn ends"?
      A: Yes, it can.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-031.ts`; triggers OpponentsTurn, OnPlay, WhenDigivolving, AllTurns; action/condition kinds GainKeyword, Suspend, Restrict, Replacement, Prevent. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L10: digivolutionRequirement: [
L13: cost: 4,
L20: cost: 3,
L26: trigger: "OpponentsTurn",
L29: kind: "GainKeyword",
L33: kind: ["Digimon"],
L47: duration: "permanent",
L53: trigger: "OnPlay",
L56: kind: "Suspend",
L60: kind: ["Digimon", "Tamer"],
L74: kind: "Restrict",
L78: kind: ["Digimon", "Tamer"],
L83: duration: "untilOpponentTurnEnd",
L88: trigger: "WhenDigivolving",
L91: kind: "Suspend",
L95: kind: ["Digimon", "Tamer"],
L109: kind: "Restrict",
L113: kind: ["Digimon", "Tamer"],
L118: duration: "untilOpponentTurnEnd",
L123: trigger: "AllTurns",
L126: kind: "Replacement",
L130: kind: ["Digimon"],
L140: kind: "Prevent",
L150: cost: {
L151: kind: "flipSecurity",
L163: optional: true,
L164: abortOnDecline: true,
L168: frequency: "OncePerTurn",
L175: registerIrCard("EX11-031", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-052 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-053 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), EX11-030 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-031.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements, face-up security scaling, and replacement effect", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[0]).toMatchObject({
L18: expect(effect.actions[1]).toMatchObject({
L24: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-031.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-031", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-032 — GrandGalemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-032",
  "set": "EX11",
  "nameEn": "GrandGalemon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 8,
  "dp": 8000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 4,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Bird Dragon",
    "Vortex Warriors",
    "LIBERATOR"
  ],
  "effectText": "[Hand] [Main] If you have [Shoto Kazama], by placing 1 [Galemon] from your trash as any of your [Pteromon]'s bottom digivolution card, it digivolves into this card for a digivolution cost of 3, ignoring digivolution requirements.\n[When Digivolving] You may suspend 1 Digimon. Then, you may play 1 3000 DP or lower green Digimon card with [Avian] or [Bird] in any of its traits from your hand without paying the cost. For each suspended Digimon, add 1000 to this effect's DP maximum.",
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When this Digimon wins a battle, this [Vortex Warriors] trait Digimon may unsuspend.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-032"
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Main] If you have [Shoto Kazama], by placing 1 [Galemon] from your trash as any of your [Pteromon]'s bottom digivolution card, it digivolves into this card for a digivolution cost of 3, ignoring digivolution requirements.\n[When Digivolving] You may suspend 1 Digimon. Then, you may play 1 3000 DP or lower green Digimon card with [Avian] or [Bird] in any of its traits from your hand without paying the cost. For each suspended Digimon, add 1000 to this effect's DP maximum."
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon wins a battle, this [Vortex Warriors] trait Digimon may unsuspend."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-032`

```text
EX11-032 GrandGalemon
  Q&A (8):
    Q5838 (2026-02-06): If I use this card's {Hand} [Main] effect to digivolve EX7-031 [Pteromon] into this card, ignoring digivolution requirements, does the combination with EX7-031 [Pteromon]'s effect make the digivolution cost 2?
      A: Yes, the digivolution cost is 2.
      related: EX7-031
    Q5839 (2026-02-06): Can I activate this card's {Hand} [Main] effect at the same time as an effect such as P-106 [Agility Training]'s effect that digivolves?
      A: No, you can't.
      related: P-106
    Q5840 (2026-02-06): Can I use this card's [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
    Q5841 (2026-02-06): When does "when this Digimon wins a battle" trigger?
      A: It triggers when the battle is won. When the Digimon with this effect wins a battle, the opponent's Digimon that lost the battle is deleted, then the "when this Digimon wins a battle" effect can be activated.
    Q5842 (2026-02-06): Does a "when this Digimon wins a battle" effect also trigger when a battle against a Security Digimon is won?
      A: Yes, it triggers.
    Q5843 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon that lost the battle is deleted. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the effects that trigger upon the losing Digimon being deleted?
      A: They trigger simultaneously, so the turn player can activate their effects first.
    Q5844 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the loser Digimon's effects such as "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects?
      A: The "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects can be activated first.
    Q5845 (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, can the "when this Digimon wins a battle" effect be activated even if an effect prevents the opponent's Digimon from being deleted?
      A: Yes, it can be activated.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-032.ts`; triggers Main, WhenDigivolving, YourTurn; action/condition kinds Digivolve, Suspend, PlayWithoutCost, SubTrigger, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L22: digivolutionRequirement: [{ level: 4, cost: 3, isAlternate: true }],
L25: trigger: "Main",
L28: kind: "Digivolve",
L32: kind: ["Digimon"],
L40: condition: {
L41: kind: "youHave",
L48: cost: {
L49: kind: "place",
L62: kind: ["Digimon"],
L74: trigger: "WhenDigivolving",
L77: kind: "Suspend",
L81: kind: ["Digimon"],
L85: optional: true,
L88: kind: "PlayWithoutCost",
L92: kind: ["Digimon"],
L104: optional: true,
L113: kind: ["Digimon"],
L122: trigger: "YourTurn",
L125: kind: "SubTrigger",
L132: kind: "Unsuspend",
L140: optional: true,
L147: frequency: "OncePerTurn",
L154: registerIrCard("EX11-032", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-101 (Vortex Warriors/LIBERATOR/Bird Dragon), EX11-035 (Vortex Warriors/LIBERATOR/Bird Dragon), EX11-074 (Bird Dragon/Vortex Warriors/LIBERATOR), EX7-034 (Bird Dragon/Vortex Warriors/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-032.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves the standard evolution and hand, digivolving, and inherited effects", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([{ level: 4, cost: 3, isAlternate: true }]);
L9: expect(compiled.effects).toContainEqual(
L24: expect(digivolving.actions[0]).toMatchObject({
L28: expect(digivolving.actions[1]).toMatchObject({
L32: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-032.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-032", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-033 — Maneuvermon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-033",
  "set": "EX11",
  "nameEn": "Maneuvermon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 4,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Beast",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Maquinamon] in text: Cost 3 \n\n[On Play] [When Digivolving] You may play 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, suspend 1 of your opponent's Digimon. Then, 1 of their Digimon can't unsuspend until their turn ends.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, this Digimon may unsuspend.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-033"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Maquinamon] in text: Cost 3 \n\n[On Play] [When Digivolving] You may play 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, suspend 1 of your opponent's Digimon. Then, 1 of their Digimon can't unsuspend until their turn ends."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, this Digimon may unsuspend."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-033`

```text
EX11-033 Maneuvermon
  Q&A (5):
    Q5846 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5847 (2026-02-06): Can this card's [Your Turn] effect suspend a different card from the one that's given "can't unsuspend"?
      A: Yes, it can.
    Q5848 (2026-02-06): Can I activate this card's inherited effect when an opponent's Digimon and this Digimon are deleted at the same time?
      A: No, you can't activate it.
    Q5849 (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
      A: No, they don't trigger. "When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.
    Q5850 (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used a [When Moving] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
      A: No, you can't. Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.
      related: EX11-027
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-033.ts`; triggers OnPlay, WhenDigivolving, YourTurn, AllTurns; action/condition kinds PlayWithoutCost, SubTrigger, Suspend, Restrict, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 4, cost: 3, isAlternate: true },
L11: { level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true },
L15: trigger: "OnPlay",
L18: kind: "PlayWithoutCost",
L33: optional: true,
L38: trigger: "WhenDigivolving",
L41: kind: "PlayWithoutCost",
L56: optional: true,
L61: trigger: "YourTurn",
L64: kind: "SubTrigger",
L68: kind: "Suspend",
L72: kind: ["Digimon"],
L78: kind: "Restrict",
L80: filter: { controller: "opponent", kind: ["Digimon"] },
L84: duration: "untilOpponentTurnEnd",
L89: frequency: "OncePerTurn",
L92: trigger: "AllTurns",
L95: kind: "SubTrigger",
L99: kind: "Unsuspend",
L107: optional: true,
L113: frequency: "OncePerTurn",
L120: registerIrCard("EX11-033", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-029 (Beast/LIBERATOR), EX11-036 (Beast/LIBERATOR), AD1-010 (Beast), BT1-031 (Beast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-033.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and keeps linked restrictions inside the trigger", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L13: expect(yourTurn.actions).toHaveLength(1);
L14: expect(yourTurn.actions[0]).toMatchObject({
L19: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-033.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-033", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-034 — QueenBeemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-034",
  "set": "EX11",
  "nameEn": "QueenBeemon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 12,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 5,
      "memoryCost": 4
    },
    {
      "color": "Black",
      "level": 5,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "X Antibody",
    "Royal Base",
    "LIBERATOR",
    "Insectoid"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Royal Base] trait: Cost 3 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may place 1 [Royal Base] trait card from your hand or trash face up as the top or bottom security card. Then, delete up to 8 play cost's total worth of your opponent's Digimon. For each of your face-up security cards, add 2 to this effect's play cost maximum.\n[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 card with [Royal Base] in its text from your hand. For each of your face-up security cards, reduce this effect's paid play cost by 1.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-034"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Royal Base] trait: Cost 3 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may place 1 [Royal Base] trait card from your hand or trash face up as the top or bottom security card. Then, delete up to 8 play cost's total worth of your opponent's Digimon. For each of your face-up security cards, add 2 to this effect's play cost maximum.\n[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 card with [Royal Base] in its text from your hand. For each of your face-up security cards, reduce this effect's paid play cost by 1."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-034`

```text
EX11-034 QueenBeemon
  Q&A (6):
    Q5851 (2026-02-06): This card has multiple effects that trigger when it digivolves or when it attacks. In what order can they be activated?
      A: The effects trigger simultaneously, so the player can choose the activation order.
    Q5852 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5853 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5854 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5855 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
    Q5856 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-034.ts`; triggers OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds SecurityManipulation, DeleteBudget, PlayFromZone. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 5, cost: 4, colors: ["Green", "Black"], isAlternate: true },
L11: { level: 5, traits: ["Royal Base"], cost: 3, isAlternate: true },
L15: trigger: "OnPlay",
L18: kind: "SecurityManipulation",
L25: optional: true,
L28: kind: "DeleteBudget",
L31: kind: ["Digimon"],
L46: frequency: "OncePerTurn",
L47: sharedUseKey: "ir-shared-0",
L50: trigger: "WhenDigivolving",
L53: kind: "SecurityManipulation",
L60: optional: true,
L63: kind: "DeleteBudget",
L66: kind: ["Digimon"],
L81: frequency: "OncePerTurn",
L82: sharedUseKey: "ir-shared-0",
L85: trigger: "WhenAttacking",
L88: kind: "SecurityManipulation",
L95: optional: true,
L98: kind: "DeleteBudget",
L101: kind: ["Digimon"],
L116: frequency: "OncePerTurn",
L117: sharedUseKey: "ir-shared-0",
L120: trigger: "WhenDigivolving",
L123: kind: "PlayFromZone",
L146: optional: true,
L149: frequency: "OncePerTurn",
L150: sharedUseKey: "ir-shared-1",
L153: trigger: "WhenAttacking",
L156: kind: "PlayFromZone",
L179: optional: true,
L182: frequency: "OncePerTurn",
L183: sharedUseKey: "ir-shared-1",
L190: registerIrCard("EX11-034", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-052 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), BT19-053 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid), EX11-030 (Cyborg/X Antibody/Royal Base/LIBERATOR/Insectoid). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-034.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and Royal Base security/deletion effects", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effects[0]).toMatchObject({
L27: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-034.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-034", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-035 — Zephagamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-035",
  "set": "EX11",
  "nameEn": "Zephagamon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 5,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Magic Knight",
    "Vortex Warriors",
    "LIBERATOR",
    "Bird Dragon"
  ],
  "effectText": "＜Piercing＞ \n＜Vortex＞ \n＜Blocker＞ \n[When Digivolving] You may unsuspend 1 Digimon. Then, you may suspend 1 Digimon.\n[All Turns] [Once Per Turn] When any of your Digimon suspend, you may play 1 3000 DP or lower green Digimon card with [Avian] or [Bird] in any of its traits from your hand without paying the cost. For each suspended Digimon, add 2000 to this effect's DP maximum.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-035"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Piercing＞ \n＜Vortex＞ \n＜Blocker＞ \n[When Digivolving] You may unsuspend 1 Digimon. Then, you may suspend 1 Digimon.\n[All Turns] [Once Per Turn] When any of your Digimon suspend, you may play 1 3000 DP or lower green Digimon card with [Avian] or [Bird] in any of its traits from your hand without paying the cost. For each suspended Digimon, add 2000 to this effect's DP maximum."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-035`

```text
EX11-035 Zephagamon
  Q&A (1):
    Q5857 (2026-02-06): Can I use this card's [When Digivolving] effect to unsuspend or suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be unsuspended or suspended.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-035.ts`; triggers Static, WhenDigivolving, AllTurns; action/condition kinds Unsuspend, Suspend, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: digivolutionRequirement: [{ level: 5, cost: 3, isAlternate: true }],
L15: trigger: "Static",
L25: trigger: "Static",
L35: trigger: "Static",
L45: trigger: "WhenDigivolving",
L48: kind: "Unsuspend",
L52: kind: ["Digimon"],
L56: optional: true,
L59: kind: "Suspend",
L63: kind: ["Digimon"],
L67: optional: true,
L72: trigger: "AllTurns",
L75: kind: "SubTrigger",
L79: kind: ["Digimon"],
L83: kind: "PlayWithoutCost",
L87: kind: ["Digimon"],
L104: optional: true,
L110: filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
L118: frequency: "OncePerTurn",
L125: registerIrCard("EX11-035", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-101 (Magic Knight/Vortex Warriors/LIBERATOR/Bird Dragon), EX7-036 (Magic Knight/Vortex Warriors/LIBERATOR/Bird Dragon), ST18-12 (Magic Knight/Vortex Warriors/LIBERATOR/Bird Dragon), EX11-032 (Bird Dragon/Vortex Warriors/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-035.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves evolution, cross-player digivolving choices, and event-scoped DP scaling", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([{ level: 5, cost: 3, isAlternate: true }]);
L11: expect(digivolving.actions).toEqual(
L26: expect(allTurns.actions).toHaveLength(1);
L27: expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
L28: expect(irNode(allTurns.actions[0]!).actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-035.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-035", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-036 — Dalphomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-036",
  "set": "EX11",
  "nameEn": "Dalphomon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 12,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 5,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Beast",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Maquinamon] in text: Cost 3 \n\n＜Vortex＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.\n[End of Your Turn] [Once Per Turn] 1 of your other Digimon may digivolve into a black Digimon card with [Maquinamon] in its text in the hand without paying the cost.",
  "inheritedEffectText": "[Your Turn] [Once Per Turn] When this Digimon gets linked, suspend 1 of your opponent's Digimon. Then, this Digimon may attack.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-036"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Maquinamon] in text: Cost 3 \n\n＜Vortex＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.\n[End of Your Turn] [Once Per Turn] 1 of your other Digimon may digivolve into a black Digimon card with [Maquinamon] in its text in the hand without paying the cost."
   - Inherited: "[Your Turn] [Once Per Turn] When this Digimon gets linked, suspend 1 of your opponent's Digimon. Then, this Digimon may attack."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-036`

```text
EX11-036 Dalphomon
  Q&A (3):
    Q5858 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5859 (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
      A: No, they don't trigger. "When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.
    Q5860 (2026-02-06): Can this card's [On Play] [When Digivolving] [When Attacking] effect suspend a different card from the one that's given "can't unsuspend until their turn ends?
      A: Yes, it can.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-036.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, EndOfYourTurn, YourTurn; action/condition kinds Suspend, Restrict, Digivolve, SubTrigger, Attack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: digivolutionRequirement: [
L12: { level: 5, cost: 4, isAlternate: true },
L13: { level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true },
L17: trigger: "Static",
L27: trigger: "OnPlay",
L30: kind: "Suspend",
L34: kind: ["Digimon", "Tamer"],
L40: kind: "Restrict",
L44: kind: ["Digimon", "Tamer"],
L49: duration: "untilOpponentTurnEnd",
L52: frequency: "OncePerTurn",
L53: sharedUseKey: "ir-shared-0",
L56: trigger: "WhenDigivolving",
L59: kind: "Suspend",
L63: kind: ["Digimon", "Tamer"],
L69: kind: "Restrict",
L73: kind: ["Digimon", "Tamer"],
L78: duration: "untilOpponentTurnEnd",
L81: frequency: "OncePerTurn",
L82: sharedUseKey: "ir-shared-0",
L85: trigger: "WhenAttacking",
L88: kind: "Suspend",
L92: kind: ["Digimon", "Tamer"],
L98: kind: "Restrict",
L102: kind: ["Digimon", "Tamer"],
L107: duration: "untilOpponentTurnEnd",
L110: frequency: "OncePerTurn",
L111: sharedUseKey: "ir-shared-0",
L114: trigger: "EndOfYourTurn",
L117: kind: "Digivolve",
L122: kind: ["Digimon"],
L128: kind: ["Digimon"],
L139: optional: true,
L142: frequency: "OncePerTurn",
L145: trigger: "YourTurn",
L148: kind: "SubTrigger",
L152: kind: "Suspend",
L156: kind: ["Digimon"],
L162: kind: "Attack",
L165: optional: true,
L171: frequency: "OncePerTurn",
L178: registerIrCard("EX11-036", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-029 (Beast/LIBERATOR), EX11-033 (Beast/LIBERATOR), AD1-010 (Beast), BT1-031 (Beast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-036.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves both evolution requirements and scopes inherited attack to linking", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(compiled.effects).toContainEqual(
L19: expect(inherited.actions).toHaveLength(1);
L20: expect(inherited.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked" });
L21: expect(irNode(inherited.actions[0]!).actions).toEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-036.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-036", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-037 — Espimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-037",
  "set": "EX11",
  "nameEn": "Espimon",
  "colors": [
    "Black",
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Blue",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Kapurimon]: Cost 0 \n\n[When Moving] [On Play] Flip your opponent's top face-down security card face up. If this effect didn't flip, ＜Draw 1＞ and gain 1 memory.",
  "inheritedEffectText": "＜Jamming＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-037"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Kapurimon]: Cost 0 \n\n[When Moving] [On Play] Flip your opponent's top face-down security card face up. If this effect didn't flip, ＜Draw 1＞ and gain 1 memory."
   - Inherited: "＜Jamming＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-037`

```text
EX11-037 Espimon
  Q&A (4):
    Q5861 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5862 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5863 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5864 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-037.ts`; triggers WhenMoving, OnPlay, Static; action/condition kinds SecurityManipulation, Draw, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 2, cost: 1, colors: ["Black", "Blue"], isAlternate: true },
L11: { names: ["Kapurimon"], cost: 0, isAlternate: true },
L15: trigger: "WhenMoving",
L18: kind: "SecurityManipulation",
L23: kind: "Draw",
L26: condition: {
L27: kind: "ifThisEffectDidNotAct",
L32: kind: "GainMemory",
L34: condition: {
L35: kind: "ifThisEffectDidNotAct",
L42: trigger: "OnPlay",
L45: kind: "SecurityManipulation",
L50: kind: "Draw",
L53: condition: {
L54: kind: "ifThisEffectDidNotAct",
L59: kind: "GainMemory",
L61: condition: {
L62: kind: "ifThisEffectDidNotAct",
L69: trigger: "Static",
L84: registerIrCard("EX11-037", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/LIBERATOR), BT19-052 (Cyborg/LIBERATOR), BT19-053 (Cyborg/LIBERATOR), BT20-046 (Cyborg/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-037.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and failed-flip fallback", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[0]).toMatchObject({
L19: expect(effect.actions[1]).toMatchObject({
L24: expect(effect.actions[2]).toMatchObject({
L30: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-037.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-037", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-038 — Sunarizamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-038",
  "set": "EX11",
  "nameEn": "Sunarizamon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 2,
      "memoryCost": 0
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Reptile",
    "LIBERATOR",
    "Mineral"
  ],
  "effectText": "[When Moving] [On Play] By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards, ＜Draw 1＞",
  "inheritedEffectText": "When effects trash this card from a [Mineral] or [Rock] trait Digimon's digivolution cards, ＜Draw 1＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-038"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Moving] [On Play] By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards, ＜Draw 1＞"
   - Inherited: "When effects trash this card from a [Mineral] or [Rock] trait Digimon's digivolution cards, ＜Draw 1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-038`

```text
EX11-038 Sunarizamon
  Q&A (1):
    Q5865 (2026-02-06): Can I use this card's [When Moving] [On Play] effect to trash a digivolution card from another of my Digimon?
      A: Yes, you can.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-038.ts`; triggers WhenMoving, OnPlay, Static; action/condition kinds Draw, SubTrigger. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: // [When Moving][On Play] trash cost: from hand OR digivolutionCards (any card with
L12: digivolutionRequirement: [{ level: 2, cost: 0, isAlternate: true }],
L15: trigger: "WhenMoving",
L18: kind: "Draw",
L21: cost: {
L22: kind: "trash",
L38: optional: true,
L39: abortOnDecline: true,
L44: trigger: "OnPlay",
L47: kind: "Draw",
L50: cost: {
L51: kind: "trash",
L67: optional: true,
L68: abortOnDecline: true,
L73: trigger: "Static",
L76: kind: "SubTrigger",
L80: kind: ["Digimon"],
L90: kind: "Draw",
L104: registerIrCard("EX11-038", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-055 (Reptile/LIBERATOR/Mineral), EX10-025 (Reptile/LIBERATOR/Mineral), EX8-047 (Reptile/LIBERATOR/Mineral), BT21-008 (Reptile/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-038.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves evolution, cross-stack trash cost, and inherited discard trigger", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
L12: expect(effect.actions[0]).toMatchObject({
L19: expect(irNode(effect.actions[0]!.cost).target.filter.nameOrTrait).toEqual([
L24: expect(inherited).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-038.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-038", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-039 — HoverEspimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-039",
  "set": "EX11",
  "nameEn": "HoverEspimon",
  "colors": [
    "Black",
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 4,
  "dp": 5000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 3,
      "memoryCost": 3
    },
    {
      "color": "Blue",
      "level": 3,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Cyborg]/[Machine] trait: Cost 2 \n\n[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Altea] from your hand without paying the cost.",
  "inheritedEffectText": "＜Jamming＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-039"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Cyborg]/[Machine] trait: Cost 2 \n\n[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Altea] from your hand without paying the cost."
   - Inherited: "＜Jamming＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-039`

```text
EX11-039 HoverEspimon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-039.ts`; triggers WhenDigivolving, Static; action/condition kinds PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 3, cost: 3, colors: ["Black", "Blue"], isAlternate: true },
L11: { level: 3, traits: ["Cyborg", "Machine"], cost: 2, isAlternate: true },
L15: trigger: "WhenDigivolving",
L18: kind: "PlayWithoutCost",
L33: condition: {
L34: kind: "permanentCount",
L39: kind: ["Tamer"],
L43: optional: true,
L48: trigger: "Static",
L63: registerIrCard("EX11-039", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/LIBERATOR), BT19-052 (Cyborg/LIBERATOR), BT19-053 (Cyborg/LIBERATOR), BT20-046 (Cyborg/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-039.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves both evolution requirements and the one-Tamer count condition", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[0]).toMatchObject({
L20: expect(irNode(effect.actions[0]!).target.filter.nameOrTrait).toEqual([{ tokens: ["Altea"], match: "name" }]);
L21: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-039.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-039", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-040 — Mulemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-040",
  "set": "EX11",
  "nameEn": "Mulemon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 5000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 3,
      "memoryCost": 2
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Machine",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Maquinamon]: Cost 2 \n\n[On Play] [When Digivolving] You may link 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer Tamers, you may play 1 [Unchained] from your hand or trash without paying the cost.\"",
  "inheritedEffectText": "＜Reboot＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-040"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Maquinamon]: Cost 2 \n\n[On Play] [When Digivolving] You may link 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer Tamers, you may play 1 [Unchained] from your hand or trash without paying the cost.\""
   - Inherited: "＜Reboot＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-040`

```text
EX11-040 Mulemon
  Q&A (1):
    Q5866 (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
      A: No, they don't trigger. "When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-040.ts`; triggers OnPlay, WhenDigivolving, YourTurn, Static; action/condition kinds Link, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L16: digivolutionRequirement: [
L17: { level: 3, cost: 2, isAlternate: true },
L18: { names: ["Maquinamon"], cost: 2, isAlternate: true },
L22: trigger: "OnPlay",
L25: kind: "Link",
L42: kind: ["Digimon"],
L47: optional: true,
L52: trigger: "WhenDigivolving",
L55: kind: "Link",
L72: kind: ["Digimon"],
L77: optional: true,
L82: trigger: "YourTurn",
L85: kind: "SubTrigger",
L92: kind: "PlayWithoutCost",
L107: condition: {
L108: kind: "permanentCount",
L112: kind: ["Tamer"],
L118: optional: true,
L123: frequency: "OncePerTurn",
L126: trigger: "Static",
L141: registerIrCard("EX11-040", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-042 (Machine/LIBERATOR), EX11-045 (Machine/LIBERATOR), BT1-042 (Machine), BT1-068 (Machine). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-040.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves both evolution requirements and real-link Unchained trigger", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(compiled.effects).toContainEqual(
L22: expect(linked.actions).toHaveLength(1);
L23: expect(linked.actions[0]).toMatchObject({
L28: expect(irNode(linked.actions[0]!).actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-040.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-040", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-041 — Oblivimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-041",
  "set": "EX11",
  "nameEn": "Oblivimon",
  "colors": [
    "Black",
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 4,
      "memoryCost": 4
    },
    {
      "color": "Blue",
      "level": 4,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Cyborg] trait: Cost 3 \n\n[Security] [End of Opponent's Turn] Play this card without paying the cost.\n[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and ＜De-Digivolve 1＞ 1 of their Digimon. Then, if it's their turn, this Digimon may digivolve into [Invisimon] in the hand without paying the cost.\n[Your Turn] When any of your Digimon check face-up security cards, you may place this Digimon's top stacked card face up as the bottom security card.",
  "inheritedEffectText": "[Your Turn] This Digimon's attack target can't change.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-041"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Cyborg] trait: Cost 3 \n\n[Security] [End of Opponent's Turn] Play this card without paying the cost.\n[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and ＜De-Digivolve 1＞ 1 of their Digimon. Then, if it's their turn, this Digimon may digivolve into [Invisimon] in the hand without paying the cost.\n[Your Turn] When any of your Digimon check face-up security cards, you may place this Digimon's top stacked card face up as the bottom security card."
   - Inherited: "[Your Turn] This Digimon's attack target can't change."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-041`

```text
EX11-041 Oblivimon
  Q&A (10):
    Q5867 (2026-02-06): Only the top card of my opponent's security card is face up. If this card's [On Play] [When Digivolving] effect activates, what security card is flipped to face up?
      A: The 2nd card from the top of their security stack is flipped to face up.
    Q5868 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5869 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5870 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5871 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
    Q5872 (2026-02-06): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q5873 (2026-02-06): If I attack with this card, an opponent's face-up security card is checked for the security check, then this card's [Your Turn] effect activates and I place the top card of this Digimon at the bottom of the security stack, does the [End of Attack] effect on the Digimon under this card trigger?
      A: Yes, it triggers.
    Q5874 (2026-02-06): An opponent's Digimon attacks a player by an effect at the end of their turn. What happens if this card's {Security} [End of Opponent's Turn] effect then plays this card, my security stack is reduced to 0 cards, and the attack against the player is successful?
      A: You lose the game.
    Q5875 (2026-02-06): What happens if this card has just BT15-086 [Marvin Jackson] in its digivolution cards, it performs a security check on a face-up security card, and this card's [Your Turn] effect activates?
      A: This card stacked on top is removed, causing this Digimon to become a Tamer, therefore the attacking Digimon is considered to be removed.
      related: BT15-086
    Q5888 (2026-02-06): This card has EX11-041 [Oblivimon] in its digivolution cards, it gained <Security A. +1>, and it attacks a player. At such times, if the [Your Turn] effect activates upon the 1st face-up security check and this card's top stacked card is placed as a security card, do I use EX11-041 [Oblivimon] to perform the 2nd check?
      A: Yes, you use EX11-041 [Oblivimon] to perform the 2nd check. If the 2nd check is on a face-up security card, EX11-041 [Oblivimon]'s [Your Turn] effect will also trigger.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-041.ts`; triggers EndOfOpponentsTurn, OnPlay, WhenDigivolving, YourTurn; action/condition kinds PlayWithoutCost, SecurityManipulation, DeDigivolve, Digivolve, Restrict. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 4, cost: 4, colors: ["Black", "Blue"], isAlternate: true },
L11: { level: 4, traits: ["Cyborg"], cost: 3, isAlternate: true },
L15: trigger: "EndOfOpponentsTurn",
L18: kind: "PlayWithoutCost",
L32: trigger: "OnPlay",
L35: kind: "SecurityManipulation",
L41: kind: "DeDigivolve",
L45: kind: ["Digimon"],
L52: kind: "Digivolve",
L71: optional: true,
L72: condition: {
L73: kind: "isOpponentsTurn",
L80: trigger: "WhenDigivolving",
L83: kind: "SecurityManipulation",
L89: kind: "DeDigivolve",
L93: kind: ["Digimon"],
L100: kind: "Digivolve",
L119: optional: true,
L120: condition: {
L121: kind: "isOpponentsTurn",
L128: trigger: "YourTurn",
L131: kind: "SecurityManipulation",
L140: trigger: "YourTurn",
L143: kind: "Restrict",
L152: duration: "permanent",
L162: registerIrCard("EX11-041", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/LIBERATOR), BT19-052 (Cyborg/LIBERATOR), BT19-053 (Cyborg/LIBERATOR), BT20-046 (Cyborg/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-041.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements, face-down security flip, and turn condition", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[0]).toMatchObject({
L20: expect(effect.actions[1]).toMatchObject({
L25: expect(effect.actions[2]).toMatchObject({
L31: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-041.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-041", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-042 — MockingBirdmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-042",
  "set": "EX11",
  "nameEn": "MockingBirdmon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 4,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Machine",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Maquinamon] in text: Cost 3 \n\n[On Play] [When Digivolving] You may play 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, delete 1 of your opponent's Digimon with a play cost of 5 or less.",
  "inheritedEffectText": "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, you may change the attack target to this Digimon.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-042"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Maquinamon] in text: Cost 3 \n\n[On Play] [When Digivolving] You may play 1 [Maquinamon] from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.\n[Your Turn] [Once Per Turn] When this Digimon gets linked, delete 1 of your opponent's Digimon with a play cost of 5 or less."
   - Inherited: "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, you may change the attack target to this Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-042`

```text
EX11-042 MockingBirdmon
  Q&A (3):
    Q5876 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5877 (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
      A: No, they don't trigger. "When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.
    Q5878 (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used an [On Play] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
      A: No, you can't. Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.
      related: EX11-027
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-042.ts`; triggers OnPlay, WhenDigivolving, YourTurn, OpponentsTurn; action/condition kinds PlayWithoutCost, SubTrigger, Delete, RedirectAttack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 4, cost: 3, isAlternate: true },
L11: { level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true },
L15: trigger: "OnPlay",
L18: kind: "PlayWithoutCost",
L33: optional: true,
L38: trigger: "WhenDigivolving",
L41: kind: "PlayWithoutCost",
L56: optional: true,
L61: trigger: "YourTurn",
L64: kind: "SubTrigger",
L68: kind: "Delete",
L72: kind: ["Digimon"],
L81: frequency: "OncePerTurn",
L84: trigger: "OpponentsTurn",
L87: kind: "SubTrigger",
L91: kind: "RedirectAttack",
L99: optional: true,
L105: frequency: "OncePerTurn",
L112: registerIrCard("EX11-042", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-040 (Machine/LIBERATOR), EX11-045 (Machine/LIBERATOR), BT1-042 (Machine), BT1-068 (Machine). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-042.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and linked deletion/redirect effects", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L13: expect(linked).toMatchObject({
L29: expect(inherited).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-042.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-042", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-043 — Invisimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-043",
  "set": "EX11",
  "nameEn": "Invisimon",
  "colors": [
    "Black",
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 12,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 5,
      "memoryCost": 4
    },
    {
      "color": "Blue",
      "level": 5,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Cyborg]/[Machine] trait: Cost 3 \n\n[Security] [End of Opponent's Turn] Play this card without paying the cost.\n[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and return 1 of their lowest play cost Digimon to the bottom of the deck. Then, this Digimon gains ＜Security A. +1＞ until your turn ends.\n[Your Turn] When any of your Digimon check face-up security cards, you may place this Digimon's top stacked card face up as the bottom security card.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-043"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Cyborg]/[Machine] trait: Cost 3 \n\n[Security] [End of Opponent's Turn] Play this card without paying the cost.\n[On Play] [When Digivolving] Flip your opponent's top face-down security card face up and return 1 of their lowest play cost Digimon to the bottom of the deck. Then, this Digimon gains ＜Security A. +1＞ until your turn ends.\n[Your Turn] When any of your Digimon check face-up security cards, you may place this Digimon's top stacked card face up as the bottom security card."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-043`

```text
EX11-043 Invisimon
  Q&A (10):
    Q5879 (2026-02-06): Only the top card of my opponent's security card is face up. If this card's [On Play] [When Digivolving] effect activates, what security card is flipped to face up?
      A: The 2nd card from the top of their security stack is flipped to face up.
    Q5880 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5881 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5882 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5883 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
    Q5884 (2026-02-06): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q5885 (2026-02-06): If I attack with this card, an opponent's face-up security card is checked for the security check, then this card's [Your Turn] effect activates and I place the top card of this Digimon at the bottom of the security stack, does the [End of Attack] effect on the Digimon under this card trigger?
      A: Yes, it triggers.
    Q5886 (2026-02-06): An opponent's Digimon attacks a player by an effect at the end of their turn. What happens if this card's {Security} [End of Opponent's Turn] effect then plays this card, my security stack is reduced to 0 cards, and the attack against the player is successful?
      A: You lose the game.
    Q5887 (2026-02-06): What happens if this card has just BT15-086 [Marvin Jackson] in its digivolution cards, it performs a security check on a face-up security card, and this card's [Your Turn] effect activates?
      A: This card stacked on top is removed, causing this Digimon to become a Tamer, therefore the attacking Digimon is considered to be removed.
      related: BT15-086
    Q5888 (2026-02-06): This card has EX11-041 [Oblivimon] in its digivolution cards, it gained <Security A. +1>, and it attacks a player. At such times, if the [Your Turn] effect activates upon the 1st face-up security check and this card's top stacked card is placed as a security card, do I use EX11-041 [Oblivimon] to perform the 2nd check?
      A: Yes, you use EX11-041 [Oblivimon] to perform the 2nd check. If the 2nd check is on a face-up security card, EX11-041 [Oblivimon]'s [Your Turn] effect will also trigger.
      related: EX11-041
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-043.ts`; triggers EndOfOpponentsTurn, OnPlay, WhenDigivolving, YourTurn; action/condition kinds PlayWithoutCost, SecurityManipulation, Return, GainKeyword. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 5, cost: 4, colors: ["Black", "Blue"], isAlternate: true },
L11: { level: 5, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true },
L15: trigger: "EndOfOpponentsTurn",
L18: kind: "PlayWithoutCost",
L32: trigger: "OnPlay",
L35: kind: "SecurityManipulation",
L41: kind: "Return",
L45: kind: ["Digimon"],
L53: kind: "GainKeyword",
L66: duration: "untilYourTurnEnd",
L71: trigger: "WhenDigivolving",
L74: kind: "SecurityManipulation",
L80: kind: "Return",
L84: kind: ["Digimon"],
L92: kind: "GainKeyword",
L105: duration: "untilYourTurnEnd",
L110: trigger: "YourTurn",
L113: kind: "SecurityManipulation",
L126: registerIrCard("EX11-043", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT19-048 (Cyborg/LIBERATOR), BT19-052 (Cyborg/LIBERATOR), BT19-053 (Cyborg/LIBERATOR), BT20-046 (Cyborg/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-043.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and face-up security attack effect", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[0]).toMatchObject({
L20: expect(effect.actions[1]).toMatchObject({
L25: expect(effect.actions[2]).toMatchObject({
L31: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-043.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-043", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-044 — Pyramidimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-044",
  "set": "EX11",
  "nameEn": "Pyramidimon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 5,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Mineral",
    "LIBERATOR"
  ],
  "effectText": "＜Reboot＞ \n＜Fragment (3)＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards, delete 1 of your opponent's highest play cost Digimon or Tamers.\n[All Turns] [Once Per Turn] When effects trash any of this Digimon's digivolution cards, you may place 3 [Mineral] or [Rock] trait cards from your trash as this Digimon's bottom digivolution cards.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-044"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Reboot＞ \n＜Fragment (3)＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards, delete 1 of your opponent's highest play cost Digimon or Tamers.\n[All Turns] [Once Per Turn] When effects trash any of this Digimon's digivolution cards, you may place 3 [Mineral] or [Rock] trait cards from your trash as this Digimon's bottom digivolution cards."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-044`

```text
EX11-044 Pyramidimon
  Q&A (4):
    Q5889 (2026-02-06): Can I trash just 1 digivolution card for the conditions of this card's [On Play] [When Digivolving] [When Attacking] effect?
      A: No, you can't. A "by" condition can't be met if only some of the required actions are performed. The conditions for this [On Play] [When Digivolving] [When Attacking] effect require you to trash the specified number of digivolution cards.
    Q5890 (2026-02-06): Can I use this card's [On Play] [When Digivolving] [When Attacking] effect to trash a total of 3 digivolution cards from multiples of my Digimon?
      A: Yes, you can.
    Q5891 (2026-02-06): I have 3 or more [Mineral] or [Rock] trait cards in my trash. Can I use this card’s [All Turns] effect to place just 2 cards from my trash in digivolution cards?
      A: No, you can't. If you have 3 or more cards, you must place 3 cards in digivolution cards whenever possible.
    Q5892 (2026-02-06): I have only 1 [Mineral] or [Rock] trait card in my trash. Can I use this card’s [All Turns] effect to place just 1 card from my trash in digivolution cards?
      A: Yes, you can.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-044.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Delete, SubTrigger, PlaceUnder. Clause-bearing lines:

```text
L3: // Delete cost: count corrected to 3 (was 1); added superlative:highestPlayCost; fixed
L4: // cost filter (kind:Digimon removed, zone added). AllTurns: plain PlaceUnder converted
L8: import { registerIrCard } from "../../engine/effects/interpreter.js";
L10: digivolutionRequirement: [{ level: 5, cost: 3, isAlternate: true }],
L13: trigger: "Static",
L23: trigger: "Static",
L34: trigger: "OnPlay",
L37: kind: "Delete",
L41: kind: ["Digimon", "Tamer"],
L46: cost: {
L47: kind: "trash",
L65: frequency: "OncePerTurn",
L66: sharedUseKey: "ex11-044-main-effect",
L69: trigger: "WhenDigivolving",
L72: kind: "Delete",
L76: kind: ["Digimon", "Tamer"],
L81: cost: {
L82: kind: "trash",
L100: frequency: "OncePerTurn",
L101: sharedUseKey: "ex11-044-main-effect",
L104: trigger: "WhenAttacking",
L107: kind: "Delete",
L111: kind: ["Digimon", "Tamer"],
L116: cost: {
L117: kind: "trash",
L135: frequency: "OncePerTurn",
L136: sharedUseKey: "ex11-044-main-effect",
L139: trigger: "AllTurns",
L142: kind: "SubTrigger",
L149: kind: "PlaceUnder",
L168: optional: true,
L173: frequency: "OncePerTurn",
L180: registerIrCard("EX11-044", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-055 (LIBERATOR/Mineral), EX10-025 (LIBERATOR/Mineral), EX10-028 (Mineral/LIBERATOR), EX10-032 (Mineral/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-044.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves evolution, exact three-card trash cost, and bottom-stack recovery", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([{ level: 5, cost: 3, isAlternate: true }]);
L12: expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ex11-044-main-effect" });
L13: expect(effect.actions[0]).toMatchObject({
L20: expect(recovery.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenDigivolutionTrashed" });
L21: expect(irNode(recovery.actions[0]!).actions[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
L22: expect(irNode(recovery.actions[0]!).actions[0]!.target).toMatchObject({ from: ["trash"], count: 3, upTo: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-044.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-044", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-045 — Metatromon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-045",
  "set": "EX11",
  "nameEn": "Metatromon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 12,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 5,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Machine",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Maquinamon] in text: Cost 3 \n\n＜Blocker＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 2＞ 1 of your opponent's Digimon. Then, 1 of their Digimon or Tamers can't digivolve until their turn ends.\n[End of Your Turn] [Once Per Turn] 1 of your other Digimon may digivolve into a green Digimon card with [Maquinamon] in its text in the hand without paying the cost.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When effects add to this Digimon's digivolution cards, delete 1 of your opponent's Digimon with the lowest play cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-045"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Maquinamon] in text: Cost 3 \n\n＜Blocker＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 2＞ 1 of your opponent's Digimon. Then, 1 of their Digimon or Tamers can't digivolve until their turn ends.\n[End of Your Turn] [Once Per Turn] 1 of your other Digimon may digivolve into a green Digimon card with [Maquinamon] in its text in the hand without paying the cost."
   - Inherited: "[All Turns] [Once Per Turn] When effects add to this Digimon's digivolution cards, delete 1 of your opponent's Digimon with the lowest play cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-045`

```text
EX11-045 Metatromon
  Q&A (2):
    Q5893 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5894 (2026-02-06): Do "when effects add to this Digimon's digivolution cards" effects also trigger when effects link a card?
      A: No, they don't trigger. Link cards aren't digivolution cards.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-045.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, EndOfYourTurn, AllTurns; action/condition kinds GainKeyword, DeDigivolve, Restrict, Digivolve, SubTrigger, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: digivolutionRequirement: [
L12: { level: 5, cost: 4, isAlternate: true },
L13: { level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true },
L17: trigger: "Static",
L20: kind: "GainKeyword",
L31: duration: "permanent",
L37: trigger: "OnPlay",
L40: kind: "DeDigivolve",
L44: kind: ["Digimon"],
L51: kind: "Restrict",
L55: kind: ["Digimon", "Tamer"],
L60: duration: "untilOpponentTurnEnd",
L63: frequency: "OncePerTurn",
L64: sharedUseKey: "ir-shared-0",
L67: trigger: "WhenDigivolving",
L70: kind: "DeDigivolve",
L74: kind: ["Digimon"],
L81: kind: "Restrict",
L85: kind: ["Digimon", "Tamer"],
L90: duration: "untilOpponentTurnEnd",
L93: frequency: "OncePerTurn",
L94: sharedUseKey: "ir-shared-0",
L97: trigger: "WhenAttacking",
L100: kind: "DeDigivolve",
L104: kind: ["Digimon"],
L111: kind: "Restrict",
L115: kind: ["Digimon", "Tamer"],
L120: duration: "untilOpponentTurnEnd",
L123: frequency: "OncePerTurn",
L124: sharedUseKey: "ir-shared-0",
L127: trigger: "EndOfYourTurn",
L130: kind: "Digivolve",
L135: kind: ["Digimon"],
L141: kind: ["Digimon"],
L152: optional: true,
L155: frequency: "OncePerTurn",
L158: trigger: "AllTurns",
L161: kind: "SubTrigger",
L168: kind: "Delete",
L172: kind: ["Digimon"],
L182: frequency: "OncePerTurn",
L189: registerIrCard("EX11-045", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX11-040 (Machine/LIBERATOR), EX11-042 (Machine/LIBERATOR), BT1-042 (Machine), BT1-068 (Machine). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-045.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L7: it("preserves both evolution requirements and event-scoped inherited deletion", () => {
L9: expect(compiled.digivolutionRequirement).toEqual([
L15: expect(effect).toMatchObject({
L25: expect(inherited).toMatchObject({
L30: expect(irNode(inherited.actions[0]!).actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-045.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-045", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-046 — Galacticmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-046",
  "set": "EX11",
  "nameEn": "Galacticmon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 14,
  "dp": 14000,
  "evoCosts": [
    {
      "color": "Black",
      "level": 5,
      "memoryCost": 6
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Unknown"
  ],
  "types": [
    "Unknown",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Snatchmon]: Cost 9 [Digivolve] [Galacticmon]: Cost 5 \n\n[On Play] [When Digivolving] Choose 1 of your opponent's highest play cost Digimon and delete all of their other Digimon. Then, if this Digimon has 4 or more [Vemmon] in its digivolution cards, until your opponent's turn ends, it gains ＜Blocker＞ and isn't affected by their effects.\n[End of Opponent's Turn] This Digimon may digivolve into [Galacticmon] in the hand or trash, ignoring digivolution requirements and without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-046"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Snatchmon]: Cost 9 [Digivolve] [Galacticmon]: Cost 5 \n\n[On Play] [When Digivolving] Choose 1 of your opponent's highest play cost Digimon and delete all of their other Digimon. Then, if this Digimon has 4 or more [Vemmon] in its digivolution cards, until your opponent's turn ends, it gains ＜Blocker＞ and isn't affected by their effects.\n[End of Opponent's Turn] This Digimon may digivolve into [Galacticmon] in the hand or trash, ignoring digivolution requirements and without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-046`

```text
EX11-046 Galacticmon
  Q&A (9):
    Q5895 (2026-02-06): There are only opponent's Digimon with no play costs. What happens if this card's [On Play] [When Digivolving] effect activates?
      A: You can't choose your opponent's Digimon, and all opponent's Digimon that can't be chosen are deleted.
    Q5896 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5897 (2026-02-06): What does "effects don't affect" mean, exactly?
      A: This effect prevents a card from being affected by effects. For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.
    Q5898 (2026-02-06): Can a card that has an "effects don't affect" effect be chosen for an effect?
      A: Yes, it can be chosen. For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.
    Q5899 (2026-02-06): Can a card that has an "effects don't affect" effect be given an effect?
      A: Yes, it can. It won't be affected by it, but it can be given an effect. However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.
    Q5900 (2026-02-06): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
      A: As soon as it gains the "effects don't affect" effect, it will no longer be affected.
    Q5901 (2026-02-06): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
      A: It will be affected by the effect as soon as it can be affected by effects.
    Q5902 (2026-02-06): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
      A: If the Digimon isn't affected by effects upon the trigger timing, the effect won't trigger.
    Q6932 (2026-06-19): My Digimon digivolved into BT21-062 [Galacticmon] and I used its [When Digivolving] effect to place Vemmon in digivolution cards. At such times, can I activate this card's <Delay> effect and digivolve that Galacticmon into EX11-046 [Galacticmon]?
      A: Yes, you can.
      related: BT21-062
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-046.ts`; triggers OnPlay, WhenDigivolving, EndOfOpponentsTurn; action/condition kinds Delete, GainKeyword, GrantImmunity, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: digivolutionRequirement: [
L7: { level: 5, cost: 6, isAlternate: true },
L8: { names: ["Snatchmon"], cost: 9, isAlternate: true },
L9: { names: ["Galacticmon"], cost: 5, isAlternate: true },
L13: trigger: "OnPlay",
L16: kind: "Delete",
L20: kind: ["Digimon"],
L26: kind: ["Digimon"],
L34: kind: "GainKeyword",
L42: duration: "untilOpponentTurnEnd",
L43: condition: {
L44: kind: "digivolutionCardCount",
L60: kind: "GrantImmunity",
L68: duration: "untilOpponentTurnEnd",
L69: condition: {
L70: kind: "digivolutionCardCount",
L84: trigger: "WhenDigivolving",
L87: kind: "Delete",
L91: kind: ["Digimon"],
L97: kind: ["Digimon"],
L105: kind: "GainKeyword",
L113: duration: "untilOpponentTurnEnd",
L114: condition: {
L115: kind: "digivolutionCardCount",
L131: kind: "GrantImmunity",
L139: duration: "untilOpponentTurnEnd",
L140: condition: {
L141: kind: "digivolutionCardCount",
L155: trigger: "EndOfOpponentsTurn",
L158: kind: "Digivolve",
L173: optional: true,
L182: registerIrCard("EX11-046", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (Unknown/LIBERATOR), BT18-065 (Unknown/LIBERATOR), BT21-056 (Unknown/LIBERATOR), BT21-058 (Unknown/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-046.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L29: it("retains the standard level 5 evolution requirement alongside both alternates", () => {
L30: expect(runtimeCompiledCard(GALACTICMON)?.digivolutionRequirement).toEqual([
L37: it("keeps the highest-play-cost opponent Digimon, deletes the rest", async () => {
L38: const s = setupEngine(
L60: s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
L62: await settle(() => s.state.players[1]!.battleArea.length === 1);
L65: expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === costly.permanentId)).toBe(true);
L67: expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheap.permanentId)).toBe(false);
L70: it("grants Blocker when the evolving Digimon has at least 4 Vemmon in its stack", async () => {
L71: const s = setupEngine(
L89: s.engine.applyIntent(0, {
L94: await settle(() => observe(s.engine).hasKeyword(base, "Blocker"));
L96: expect(base.topCard?.cardId).toBe(GALACTICMON);
L97: expect(base.stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(4);
L98: expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-046.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-046", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-047 — Impmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-047",
  "set": "EX11",
  "nameEn": "Impmon",
  "colors": [
    "Purple",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 2,
      "memoryCost": 1
    },
    {
      "color": "Red",
      "level": 2,
      "memoryCost": 1
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Evil",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] [Yaamon]: Cost 0  [Start of Your Main Phase] Trash 1 card in your hand. Then, gain 1 memory.",
  "inheritedEffectText": "[Your Turn] This Digimon gets +2000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-047"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Yaamon]: Cost 0  [Start of Your Main Phase] Trash 1 card in your hand. Then, gain 1 memory."
   - Inherited: "[Your Turn] This Digimon gets +2000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-047`

```text
EX11-047 Impmon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-047.ts`; triggers StartOfYourMainPhase, YourTurn; action/condition kinds Trash, GainMemory, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 2, cost: 1, colors: ["Purple", "Red"], isAlternate: true },
L11: { names: ["Yaamon"], cost: 0, isAlternate: true },
L15: trigger: "StartOfYourMainPhase",
L18: kind: "Trash",
L28: kind: "GainMemory",
L34: trigger: "YourTurn",
L37: kind: "ModifyDP",
L46: duration: "permanent",
L56: registerIrCard("EX11-047", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-061 (Evil/LIBERATOR), EX7-050 (Evil/LIBERATOR), BT12-073 (Evil), BT15-070 (Evil). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-047.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and start-main-phase hand cost", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L13: expect(start.actions[0]).toMatchObject({
L17: expect(start.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
L18: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-047.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-047", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-048 — Ghostmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-048",
  "set": "EX11",
  "nameEn": "Ghostmon",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 1000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 2,
      "memoryCost": 0
    }
  ],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Ghost",
    "LIBERATOR"
  ],
  "effectText": "[When Moving] [On Play] 1 of your Digimon with the [Ghost] trait gains ＜Retaliation＞ until your opponent's turn ends.",
  "inheritedEffectText": "[On Deletion] Gain 1 memory.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-048"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Moving] [On Play] 1 of your Digimon with the [Ghost] trait gains ＜Retaliation＞ until your opponent's turn ends."
   - Inherited: "[On Deletion] Gain 1 memory."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-048`

```text
EX11-048 Ghostmon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-048.ts`; triggers WhenMoving, OnPlay, OnDeletion; action/condition kinds GainKeyword, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [{ level: 2, cost: 0, isAlternate: true }],
L12: trigger: "WhenMoving",
L15: kind: "GainKeyword",
L19: kind: ["Digimon"],
L33: duration: "untilOpponentTurnEnd",
L38: trigger: "OnPlay",
L41: kind: "GainKeyword",
L45: kind: ["Digimon"],
L59: duration: "untilOpponentTurnEnd",
L64: trigger: "OnDeletion",
L67: kind: "GainMemory",
L78: registerIrCard("EX11-048", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-063 (Ghost/LIBERATOR), BT20-068 (Ghost/LIBERATOR), BT20-072 (Ghost/LIBERATOR), BT20-079 (Ghost/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-048.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves evolution, Ghost targeting, Retaliation duration, and inherited memory", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
L11: expect(effect.actions[0]).toMatchObject({
L21: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-048.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-048", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-049 — Punkmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-049",
  "set": "EX11",
  "nameEn": "Punkmon",
  "colors": [
    "Purple",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 6000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 3,
      "memoryCost": 3
    },
    {
      "color": "Red",
      "level": 3,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Dark Dragon",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Evil] trait: Cost 2 \n\n[When Attacking] Trash 2 cards in your hand. Then, this Digimon may digivolve into a [Dark Dragon] or [Evil Dragon] trait Digimon card in the trash with the digivolution cost reduced by 2.",
  "inheritedEffectText": "[Your Turn] This Digimon gets +2000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-049"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Evil] trait: Cost 2 \n\n[When Attacking] Trash 2 cards in your hand. Then, this Digimon may digivolve into a [Dark Dragon] or [Evil Dragon] trait Digimon card in the trash with the digivolution cost reduced by 2."
   - Inherited: "[Your Turn] This Digimon gets +2000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-049`

```text
EX11-049 Punkmon
  Q&A (1):
    Q5903 (2026-02-06): If I use this card's [When Attacking] effect to trash cards from my hand, can I then use this effect to digivolve into one of those cards from the trash?
      A: Yes, you can digivolve into such a card.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-049.ts`; triggers WhenAttacking, YourTurn; action/condition kinds Trash, Digivolve, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [
L10: { level: 3, cost: 3, colors: ["Purple", "Red"], isAlternate: true },
L11: { level: 3, traits: ["Evil"], cost: 2, isAlternate: true },
L15: trigger: "WhenAttacking",
L18: kind: "Trash",
L28: kind: "Digivolve",
L38: kind: ["Digimon"],
L48: optional: true,
L53: trigger: "YourTurn",
L56: kind: "ModifyDP",
L65: duration: "permanent",
L75: registerIrCard("EX11-049", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-069 (Dark Dragon/LIBERATOR), BT20-075 (LIBERATOR/Dark Dragon), EX11-050 (LIBERATOR/Dark Dragon), EX7-055 (Dark Dragon/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-049.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements and trash-to-trash digivolution flow", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L13: expect(attack.actions[0]).toMatchObject({
L17: expect(attack.actions[1]).toMatchObject({
L24: expect(compiled.effects).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-049.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-049", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-050 — Loudmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-050",
  "set": "EX11",
  "nameEn": "Loudmon",
  "colors": [
    "Purple",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 7000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 4,
      "memoryCost": 4
    },
    {
      "color": "Red",
      "level": 4,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Ultimate"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Cyborg",
    "LIBERATOR",
    "Dark Dragon"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Dark Dragon]/[Evil Dragon] trait: Cost 3 \n\n[On Play] [When Digivolving] Trash 2 cards in your hand. Then, delete 1 of your opponent’s Digimon with as much or less DP as 1 of your [Dark Dragon] or [Evil Dragon] trait Digimon.\n[All Turns] While you have 4 or fewer cards in your hand, all of your [Dark Dragon] or [Evil Dragon] trait Digimon gain ＜Scapegoat＞",
  "inheritedEffectText": "[Your Turn] While you have 4 or fewer cards in your hand, all of your Digimon with the [Dark Dragon] or [Evil Dragon] trait gain ＜Security A. +1＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-050"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Dark Dragon]/[Evil Dragon] trait: Cost 3 \n\n[On Play] [When Digivolving] Trash 2 cards in your hand. Then, delete 1 of your opponent’s Digimon with as much or less DP as 1 of your [Dark Dragon] or [Evil Dragon] trait Digimon.\n[All Turns] While you have 4 or fewer cards in your hand, all of your [Dark Dragon] or [Evil Dragon] trait Digimon gain ＜Scapegoat＞"
   - Inherited: "[Your Turn] While you have 4 or fewer cards in your hand, all of your Digimon with the [Dark Dragon] or [Evil Dragon] trait gain ＜Security A. +1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-050`

```text
EX11-050 Loudmon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-050.ts`; triggers OnPlay, WhenDigivolving, AllTurns, YourTurn; action/condition kinds Trash, Delete, Aura. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: digivolutionRequirement: [
L7: { level: 4, cost: 4, colors: ["Purple", "Red"], isAlternate: true },
L8: { level: 4, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
L12: trigger: "OnPlay",
L15: kind: "Trash",
L25: kind: "Delete",
L29: kind: ["Digimon"],
L34: kind: ["Digimon"],
L50: trigger: "WhenDigivolving",
L53: kind: "Trash",
L63: kind: "Delete",
L67: kind: ["Digimon"],
L72: kind: ["Digimon"],
L88: trigger: "AllTurns",
L91: kind: "Aura",
L95: kind: ["Digimon"],
L106: kind: "keyword",
L113: kind: "zoneCount",
L124: trigger: "YourTurn",
L127: kind: "Aura",
L131: kind: ["Digimon"],
L142: kind: "keyword",
L150: kind: "zoneCount",
L166: registerIrCard("EX11-050", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-075 (Cyborg/LIBERATOR/Dark Dragon), EX7-057 (Cyborg/LIBERATOR/Dark Dragon), BT19-048 (Cyborg/LIBERATOR), BT19-052 (Cyborg/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-050.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements, hand cost, DP comparison, and conditional keywords", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[0]).toMatchObject({ kind: "Trash", target: { filter: { zone: "hand" }, count: 2 } });
L15: expect(effect.actions[1]).toMatchObject({
L28: expect(allTurns.actions[0]).toMatchObject({
L34: expect(inherited).toMatchObject({ isInherited: true });
L35: expect(inherited.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-050.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-050", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-051 — Necromon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-051",
  "set": "EX11",
  "nameEn": "Necromon",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 5,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Ghost",
    "LIBERATOR"
  ],
  "effectText": "＜Piercing＞ \n＜Execute＞ \n[On Play] [When Digivolving] [On Deletion] delete 1 of your opponent's Digimon with the lowest level. Then, you may play 1 level 4 or lower [Ghost] trait Digimon card from your trash without paying the cost.\n[On Deletion] 1 of your [Ghost] trait Digimon may digivolve into a [Ghost] trait Digimon card in the hand without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-051"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Piercing＞ \n＜Execute＞ \n[On Play] [When Digivolving] [On Deletion] delete 1 of your opponent's Digimon with the lowest level. Then, you may play 1 level 4 or lower [Ghost] trait Digimon card from your trash without paying the cost.\n[On Deletion] 1 of your [Ghost] trait Digimon may digivolve into a [Ghost] trait Digimon card in the hand without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-051`

```text
EX11-051 Necromon
  Q&A (2):
    Q5904 (2026-02-06): Multiple effects trigger when this card is deleted. In what order can they be activated?
      A: The effects trigger simultaneously, so the player can choose the activation order.
    Q5905 (2026-02-06): When this card with BT20-006 [DemiMeramon] in its digivolution cards is deleted, can I use BT20-006 [DemiMeramon]'s inherited effect to return this card to my hand after deletion, then activate this card's [On Deletion] effect to digivolve my Digimon into this card?
      A: No, you can't. If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated. In this case, the deleted card's [On Deletion] effect triggers, but it's removed from the trash before the effect can activate.
      related: BT20-006
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-051.ts`; triggers Static, OnPlay, WhenDigivolving, OnDeletion; action/condition kinds Delete, PlayWithoutCost, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: digivolutionRequirement: [{ level: 5, cost: 3, isAlternate: true }],
L12: trigger: "Static",
L22: trigger: "Static",
L32: trigger: "OnPlay",
L35: kind: "Delete",
L39: kind: ["Digimon"],
L46: kind: "PlayWithoutCost",
L50: kind: ["Digimon"],
L66: optional: true,
L71: trigger: "WhenDigivolving",
L74: kind: "Delete",
L78: kind: ["Digimon"],
L85: kind: "PlayWithoutCost",
L89: kind: ["Digimon"],
L105: optional: true,
L110: trigger: "OnDeletion",
L113: kind: "Delete",
L117: kind: ["Digimon"],
L124: kind: "PlayWithoutCost",
L128: kind: ["Digimon"],
L144: optional: true,
L149: trigger: "OnDeletion",
L152: kind: "Digivolve",
L156: kind: ["Digimon"],
L168: kind: ["Digimon"],
L178: optional: true,
L187: registerIrCard("EX11-051", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-063 (Ghost/LIBERATOR), BT20-068 (Ghost/LIBERATOR), BT20-072 (Ghost/LIBERATOR), BT20-079 (Ghost/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-051.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves evolution, deletion cleanup, Ghost trash play, and deletion digivolution", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([{ level: 5, cost: 3, isAlternate: true }]);
L11: expect(effect.actions[0]).toMatchObject({
L15: expect(effect.actions[1]).toMatchObject({
L25: expect(deletionDigivolve.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-051.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-051", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-052 — HeavyMetaldramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-052",
  "set": "EX11",
  "nameEn": "HeavyMetaldramon",
  "colors": [
    "Purple",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 13,
  "dp": 13000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 5,
      "memoryCost": 5
    },
    {
      "color": "Red",
      "level": 5,
      "memoryCost": 5
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Evil Dragon",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Dark Dragon]/[Evil Dragon] trait: Cost 3 \n\n[On Play] [When Digivolving] [End of Attack] Trash 2 cards in your hand and delete 1 of your opponent's unsuspended Digimon. Then, if you have 4 or fewer cards in your hand, you may play 1 level 5 or lower [Evil], [Dark Dragon] or [Evil Dragon] trait Digimon card from your trash without paying the cost.\n[All Turns] [Once Per Turn] When any of your [Dark Dragon] or [Evil Dragon] trait Digimon would leave the battle area, if you have 4 or fewer cards in your hand, trash your opponent's top security card.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-052"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Dark Dragon]/[Evil Dragon] trait: Cost 3 \n\n[On Play] [When Digivolving] [End of Attack] Trash 2 cards in your hand and delete 1 of your opponent's unsuspended Digimon. Then, if you have 4 or fewer cards in your hand, you may play 1 level 5 or lower [Evil], [Dark Dragon] or [Evil Dragon] trait Digimon card from your trash without paying the cost.\n[All Turns] [Once Per Turn] When any of your [Dark Dragon] or [Evil Dragon] trait Digimon would leave the battle area, if you have 4 or fewer cards in your hand, trash your opponent's top security card."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-052`

```text
EX11-052 HeavyMetaldramon
  Q&A (1):
    Q5906 (2026-02-06): This card gained <Scapegoat>, and when it would be deleted other than by my effects, <Scapegoat> prevented the deletion. Can I then activate this card's [All Turns] effect?
      A: Yes, you can. <Scapegoat> and this card's [All Turns] effect will trigger simultaneously. You can also activate the [All Turns] effect after <Scapegoat> prevents the deletion.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-052.ts`; triggers OnPlay, WhenDigivolving, EndOfAttack, AllTurns; action/condition kinds Trash, Delete, PlayWithoutCost, Replacement, SecurityManipulation. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: digivolutionRequirement: [
L7: { level: 5, cost: 5, colors: ["Purple", "Red"], isAlternate: true },
L8: { level: 5, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
L12: trigger: "OnPlay",
L15: kind: "Trash",
L25: kind: "Delete",
L29: kind: ["Digimon"],
L36: kind: "PlayWithoutCost",
L40: kind: ["Digimon"],
L56: condition: {
L57: kind: "zoneCount",
L64: optional: true,
L69: trigger: "WhenDigivolving",
L72: kind: "Trash",
L82: kind: "Delete",
L86: kind: ["Digimon"],
L93: kind: "PlayWithoutCost",
L97: kind: ["Digimon"],
L113: condition: {
L114: kind: "zoneCount",
L121: optional: true,
L126: trigger: "EndOfAttack",
L129: kind: "Trash",
L139: kind: "Delete",
L143: kind: ["Digimon"],
L150: kind: "PlayWithoutCost",
L154: kind: ["Digimon"],
L170: condition: {
L171: kind: "zoneCount",
L178: optional: true,
L183: trigger: "AllTurns",
L186: kind: "Replacement",
L190: kind: ["Digimon"],
L198: condition: {
L199: kind: "zoneCount",
L208: kind: "SecurityManipulation",
L216: frequency: "OncePerTurn",
L223: registerIrCard("EX11-052", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-077 (Evil Dragon/LIBERATOR), EX7-062 (Evil Dragon/LIBERATOR), BT11-079 (Evil Dragon), BT18-060 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-052.test.ts` contains 1 passing test(s); observable engine evidence is supplied by the traced shared primitives. Evidence lines:

```text
L6: it("preserves both evolution requirements, unsuspended deletion, and leave-play security replacement", () => {
L8: expect(compiled.digivolutionRequirement).toEqual([
L14: expect(effect.actions[1]).toMatchObject({
L18: expect(effect.actions[2]).toMatchObject({
L25: expect(replacement.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-052.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-052", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-053 — Omekamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-053",
  "set": "EX11",
  "nameEn": "Omekamon",
  "colors": [
    "White"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 5000,
  "evoCosts": [],
  "forms": [
    "Champion"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Puppet",
    "X Antibody",
    "LIBERATOR"
  ],
  "effectText": "[On Play] By placing 1 [Royal Knight] trait Digimon card from your hand as the bottom digivolution card of any of your [King Drasil_7D6]s on the field, <Draw 1>.  [On Deletion] If you have 1 of fewer security cards, you may 1 play [Omnimon (X Antibody) from your hand or under your [King Drasil_7D6]s on the field without paying the cost. Then, place this card as the played Digimon's bottom digivolution card.    [Rule] Name: Also treated as [X Antibody].",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-053"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] By placing 1 [Royal Knight] trait Digimon card from your hand as the bottom digivolution card of any of your [King Drasil_7D6]s on the field, <Draw 1>.  [On Deletion] If you have 1 of fewer security cards, you may 1 play [Omnimon (X Antibody) from your hand or under your [King Drasil_7D6]s on the field without paying the cost. Then, place this card as the played Digimon's bottom digivolution card.    [Rule] Name: Also treated as [X Antibody]."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-053`

```text
EX11-053 Omekamon
  Q&A (1):
    Q5907 (2026-02-06): I use this card's [On Deletion] effect to play BT20-102 [Omnimon (X Antibody)] and place this card into that Digimon's digivolution cards. If I then activate the played BT20-102 [Omnimon (X Antibody)]'s [On Play] [When Digivolving] effect, is the "if [Omnimon] or [X Antibody] is in this Digimon's digivolution cards" condition met?
      A: Yes, it's met.
      related: BT20-102
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-053.ts`; triggers OnPlay, OnDeletion, Rule; action/condition kinds Draw, PlayWithoutCost, PlaceUnder, GrantStatic. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L7: trigger: "OnPlay",
L10: kind: "Draw",
L13: cost: {
L14: kind: "place",
L18: kind: ["Digimon"],
L34: optional: true,
L35: abortOnDecline: true,
L40: trigger: "OnDeletion",
L43: kind: "PlayWithoutCost",
L47: kind: ["Digimon"],
L58: optional: true,
L59: condition: { kind: "securityAtMost", controller: "mine", value: 1 },
L63: kind: "PlaceUnder",
L67: optional: true,
L72: trigger: "Rule",
L75: kind: "GrantStatic",
L87: registerIrCard("EX11-053", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-083 (Puppet/X Antibody/LIBERATOR), BT13-093 (Puppet/X Antibody), BT15-040 (Puppet/X Antibody), BT15-060 (Puppet/X Antibody). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-053.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L6: it("places a Royal Knight under King Drasil", async () => {
L7: const s = setupEngine(
L18: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
L21: await settle(() => s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "AD1-008") === true, 600);
L22: expect(s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "AD1-008")).toBe(true);
L25: it("plays Omnimon (X Antibody) at 1 security and places deleted Omekamon under it (Q5907)", async () => {
L26: const s = setupEngine(
L39: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-086"));
L42: expect(played?.stack.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(true);
L43: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(false);
L46: it("keeps Omnimon (X Antibody) in hand above the printed security threshold", async () => {
L47: const s = setupEngine(
L60: await settle();
L62: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("omnimonX").instanceId)).toBe(true);
L65: it("publishes full compiled coverage, exact host narrowing, and the X Antibody rule name", () => {
L66: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L67: expect(compiled.effects).toEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-053.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-053", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `b64c89703 Complete EX11-053 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-054 — Owen Dreadnought — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-054",
  "set": "EX11",
  "nameEn": "Owen Dreadnought",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When your Digimon are played or digivolve, if any of them have the [Reptile] or [Dragonkin] trait, by suspending this Tamer, ＜Draw 1＞ After, 1 of your Digimon with ＜Progress＞ gets +3000 DP for the turn.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-054"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When your Digimon are played or digivolve, if any of them have the [Reptile] or [Dragonkin] trait, by suspending this Tamer, ＜Draw 1＞ After, 1 of your Digimon with ＜Progress＞ gets +3000 DP for the turn."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-054`

```text
EX11-054 Owen Dreadnought
  Q&A (1):
    Q5908 (2026-02-06): Can I process the part of the effect after "after" in this card's [All Turns] effect without meeting the "by" condition?
      A: No, you can't. If you don't suspend this card, you can't process the part after "after" in its [All Turns] effect.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-054.ts`; triggers StartOfYourTurn, AllTurns, Security; action/condition kinds Draw, ModifyDP, SetMemory, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L5: kind: "suspend",
L10: kind: ["Digimon"],
L15: kind: ["Digimon"],
L23: kind: "Draw",
L26: cost: suspendCost,
L27: optional: true,
L28: abortOnDecline: true,
L31: kind: "ModifyDP",
L34: duration: "forTheTurn",
L41: trigger: "StartOfYourTurn",
L42: actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
L45: trigger: "AllTurns",
L47: { kind: "SubTrigger", event: "whenPlayed", sourceFilter: reptileOrDragonkin, actions: reward },
L49: kind: "SubTrigger",
L57: trigger: "Security",
L60: kind: "PlayWithoutCost",
L72: registerIrCard("EX11-054", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-054.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L8: it("suspends to draw and boosts only a Progress Digimon when a Reptile is played", async () => {
L9: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
L27: await settle(() => s.perm("progress").currentDP === 10000, 600);
L29: expect(s.perm("owen").isSuspended).toBe(true);
L30: expect(s.perm("progress").currentDP).toBe(10000);
L33: it("leaves Owen unsuspended and draws nothing when the suspend cost is declined", async () => {
L34: const s = setupEngine(
L50: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
L53: await settle(() => false, 60);
L55: expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
L56: expect(s.perm("owen").isSuspended).toBe(false);
L58: expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);
L61: it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
L62: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-054", as: "owen" }] } });
L67: expect(s.state.memory).toBe(3);
L70: it("plays itself from security without paying the cost", async () => {
L71: const s = setupEngine({ 0: { security: [{ card: "EX11-054", as: "owen" }] } });
L73: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("owen"));
L74: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-054"));
L76: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-054")).toBe(true);
L79: it("publishes exact Reptile/Dragonkin watchers and full compiled coverage", () => {
L80: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L82: expect(allTurns?.actions).toEqual(
L90: expect(action.sourceFilter).toMatchObject({
L98: expect(action.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-054.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-054", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `94319e58f Complete EX11-054 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-055 — Chitose Horaiji — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-055",
  "set": "EX11",
  "nameEn": "Chitose Horaiji",
  "colors": [
    "Red",
    "Purple"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[On Play] [Start of Your Main Phase] By trashing 1 [Composite] or [Wicked God] trait card from your hand, ＜Draw 1＞ and gain 1 memory.\n[All Turns] When any of your [Composite] or [Wicked God] trait Digimon are deleted, by suspending this Tamer, you may play 1 [Gazimon] or [Gizamon] from your hand without paying the cost.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-055"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] [Start of Your Main Phase] By trashing 1 [Composite] or [Wicked God] trait card from your hand, ＜Draw 1＞ and gain 1 memory.\n[All Turns] When any of your [Composite] or [Wicked God] trait Digimon are deleted, by suspending this Tamer, you may play 1 [Gazimon] or [Gizamon] from your hand without paying the cost."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-055`

```text
EX11-055 Chitose Horaiji
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-055.ts`; triggers OnPlay, StartOfYourMainPhase, AllTurns, Security; action/condition kinds Trash, Draw, GainMemory, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: kind: "Trash",
L13: optional: true,
L14: abortOnDecline: true,
L18: { kind: "Draw", controller: "mine", amount: 1, condition: { kind: "ifThisEffectActed" } },
L19: { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed" } },
L24: { trigger: "OnPlay", actions: drawAndMemory },
L25: { trigger: "StartOfYourMainPhase", actions: drawAndMemory },
L27: trigger: "AllTurns",
L30: kind: "SubTrigger",
L35: kind: ["Digimon"],
L39: kind: "PlayWithoutCost",
L43: kind: ["Digimon"],
L50: optional: true,
L51: cost: {
L52: kind: "suspend",
L61: trigger: "Security",
L64: kind: "PlayWithoutCost",
L76: registerIrCard("EX11-055", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-055.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L8: it("trashes a Composite card to draw and gain memory on play", async () => {
L9: const s = setupEngine(
L15: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chitose").instanceId })).toEqual({
L18: await settle(
L23: expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006")).toBe(true);
L24: expect(s.state.memory).toBe(2);
L27: it("repeats the paid draw and memory effect at the start of its owner's main phase", async () => {
L28: const s = setupEngine(
L42: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
L43: expect(s.state.memory).toBe(1);
L46: it("suspends after a Composite deletion and plays an exact Gazimon from hand", async () => {
L47: const s = setupEngine(
L62: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-071"));
L64: expect(s.perm("chitose").isSuspended).toBe(true);
L65: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gazimon").instanceId)).toBe(false);
L68: it("publishes full compiled coverage with coupled payments and exact deletion filters", () => {
L69: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L70: expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
L75: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-055.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-055", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `de9afa09f Complete EX11-055 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-056 — Ryutaro Williams — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-056",
  "set": "EX11",
  "nameEn": "Ryutaro Williams",
  "colors": [
    "Red",
    "Green"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 5,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or the [Dinosaur] trait, by suspending this Tamer, you may hatch in your breeding area. After, 1 of your Digimon in the breeding area may digivolve into a Digimon card with [Tyrannomon] in its name or the [Reptile] or [Dinosaur] trait in the hand without paying the cost.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-056"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or the [Dinosaur] trait, by suspending this Tamer, you may hatch in your breeding area. After, 1 of your Digimon in the breeding area may digivolve into a Digimon card with [Tyrannomon] in its name or the [Reptile] or [Dinosaur] trait in the hand without paying the cost."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-056`

```text
EX11-056 Ryutaro Williams
  Q&A (2):
    Q5909 (2026-02-06): What Digimon's digivolutions will trigger this card's [All Turns] effect?
      A: It will trigger when any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or a level 5 or higher Digimon with the [Dinosaur] trait.
    Q5910 (2026-02-06): Can I process the part of the effect after "after" in this card's [All Turns] effect without meeting the "by" condition?
      A: No, you can't. If you don't suspend this card, you can't process the part after "after" in its [All Turns] effect.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-056.ts`; triggers StartOfYourTurn, AllTurns, Security; action/condition kinds SetMemory, SubTrigger, Hatch, Digivolve, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L17: trigger: "StartOfYourTurn",
L20: kind: "SetMemory",
L22: condition: {
L23: kind: "memoryAtMost",
L30: trigger: "AllTurns",
L33: kind: "SubTrigger",
L37: kind: ["Digimon"],
L58: kind: "Hatch",
L60: optional: true,
L61: cost: {
L62: kind: "suspend",
L72: abortOnDecline: true,
L75: kind: "Digivolve",
L85: kind: ["Digimon"],
L100: optional: true,
L107: trigger: "Security",
L110: kind: "PlayWithoutCost",
L128: registerIrCard("EX11-056", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-056.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
L9: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-056", as: "ryutaro" }] } });
L12: expect(s.state.memory).toBe(3);
L15: it("hatches and free-digivolves the breeding stack after a level-5 Tyrannomon digivolution", async () => {
L16: const s = setupEngine(
L35: expect(
L36: s.engine.applyIntent(0, {
L42: await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX11-007");
L44: expect(s.perm("ryutaro").isSuspended).toBe(true);
L45: expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX11-007");
L48: it("encodes the Q5909 destination filter as Tyrannomon OR Dinosaur and targets breeding exactly", () => {
L49: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L51: expect(subTrigger).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-056.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-056", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `29bc0a0ff Complete EX11-056 audit`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-057 — Suzune Kazuki — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-057",
  "set": "EX11",
  "nameEn": "Suzune Kazuki",
  "colors": [
    "Blue",
    "Yellow"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory. [On Play] For each of your [Ice-Snow] trait Digimon, trash any 1 digivolution card from your opponent's Digimon. \n[All Turns] When effects trash digivolution cards from your opponent's Digimon, by suspending this Tamer, gain 1 memory.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "P",
  "maxCountInDeck": 4,
  "imageId": "EX11-057"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory. [On Play] For each of your [Ice-Snow] trait Digimon, trash any 1 digivolution card from your opponent's Digimon. \n[All Turns] When effects trash digivolution cards from your opponent's Digimon, by suspending this Tamer, gain 1 memory."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-057`

```text
EX11-057 Suzune Kazuki
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-057.ts`; triggers StartOfYourMainPhase, OnPlay, AllTurns, Security; action/condition kinds GainMemory, TrashDigivolution, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L4: const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };
L7: kind: ["Digimon"],
L14: trigger: "StartOfYourMainPhase",
L17: kind: "GainMemory",
L19: condition: {
L20: kind: "opponentHas",
L28: trigger: "OnPlay",
L31: kind: "TrashDigivolution",
L41: trigger: "AllTurns",
L44: kind: "SubTrigger",
L49: kind: "GainMemory",
L51: cost: {
L52: kind: "suspend",
L55: optional: true,
L56: abortOnDecline: true,
L63: trigger: "Security",
L66: kind: "PlayWithoutCost",
L78: registerIrCard("EX11-057", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-057.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L8: it("gains memory at the start of your main phase when the opponent has a Digimon", async () => {
L9: const s = setupEngine({
L15: expect(s.state.memory).toBe(1);
L18: it("asks before suspending when an opponent Digimon loses a digivolution card", async () => {
L19: const s = setupEngine(
L29: await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
L32: await settle(() => s.perm("suzune").isSuspended);
L34: expect(s.perm("suzune").isSuspended).toBe(true);
L35: expect(s.state.memory).toBe(1);
L38: it("leaves Suzune unsuspended and gains no memory when the suspend cost is declined", async () => {
L39: const s = setupEngine(
L49: await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
L52: await settle(() => false, 30);
L54: expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
L55: expect(s.perm("suzune").isSuspended).toBe(false);
L56: expect(s.state.memory).toBe(0);
L59: it("trashes one freely chosen source per Ice-Snow Digimon across opposing stacks", async () => {
L60: const s = setupEngine(
L77: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suzune").instanceId })).toEqual({
L80: await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);
L82: expect(s.perm("first").stack).toHaveLength(0);
L83: expect(s.perm("second").stack).toHaveLength(0);
L86: it("publishes exclusive full IR with pooled scaling and the paid opponent-source watcher", () => {
L87: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L88: expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
L97: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-057.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-057", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `71f23a386 Complete EX11-057 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-058 — Yao Qinglan — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-058",
  "set": "EX11",
  "nameEn": "Yao Qinglan",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 3,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] By placing 1 level 5 or lower card with [Aqua] or [Sea Animal] in any of its traits from your hand as the bottom digivolution card of any of your Digimon with [Aqua] or [Sea Animal] in any of their traits, gain 1 memory.\n[All Turns] When your Digimon are played or digivolve, if any of them have [Aqua] or [Sea Animal] in any of their traits, by suspending this Tamer, ＜Draw 1＞. If played by ＜Decode＞, 1 of your opponent's Digimon can't suspend until their turn ends.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-058"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] By placing 1 level 5 or lower card with [Aqua] or [Sea Animal] in any of its traits from your hand as the bottom digivolution card of any of your Digimon with [Aqua] or [Sea Animal] in any of their traits, gain 1 memory.\n[All Turns] When your Digimon are played or digivolve, if any of them have [Aqua] or [Sea Animal] in any of their traits, by suspending this Tamer, ＜Draw 1＞. If played by ＜Decode＞, 1 of your opponent's Digimon can't suspend until their turn ends."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-058`

```text
EX11-058 Yao Qinglan
  Q&A (2):
    Q5911 (2026-02-06): What will meet the "if played by <Decode>" condition?
      A: The condition will be met if this effect is activated after being triggered by Digimion being played by <Decode>. The condition won't be met if this effect is activated after being triggered by digivolution or by Digimion being played by a method other than <Decode>.
    Q5912 (2026-02-06): My Digimon was played by <Decode>, and this card's [All Turns] effect triggered. What happens if I first use another effect to digivolve the played Digimon, then that digivolution triggers this card's [All Turns] effect again?
      A: The playing and digivolving both trigger this card's [All Turns] effect. The "if played by <Decode>" condition won't be met if this effect is activated after being triggered by digivolution, but it will be met if this effect is activated after being triggered by the Digimon being played by <Decode>.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-058.ts`; triggers StartOfYourMainPhase, AllTurns, Security; action/condition kinds Draw, GainMemory, SubTrigger, Restrict, PlayWithoutCost. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: kind: ["Digimon"],
L13: kind: "suspend",
L18: kind: "Draw",
L21: cost: suspendCost,
L22: optional: true,
L23: abortOnDecline: true,
L29: trigger: "StartOfYourMainPhase",
L32: kind: "GainMemory",
L34: cost: {
L35: kind: "place",
L47: optional: true,
L48: abortOnDecline: true,
L53: trigger: "AllTurns",
L56: kind: "SubTrigger",
L62: kind: "Restrict",
L63: target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
L65: duration: "untilOpponentTurnEnd",
L66: condition: { kind: "triggerPlayedByDecode", raw: "played by ＜Decode＞" },
L71: kind: "SubTrigger",
L79: trigger: "Security",
L82: kind: "PlayWithoutCost",
L94: registerIrCard("EX11-058", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-058.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L9: it("places an Aqua or Sea Animal card under a matching Digimon and gains memory", async () => {
L10: const s = setupEngine(
L24: expect(s.state.memory).toBe(1);
L25: expect(s.perm("host").stack.some((card) => card.cardId === "BT23-023")).toBe(true);
L28: it("suspends to draw when an Aqua or Sea Animal Digimon is played", async () => {
L29: const s = setupEngine(
L44: await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gizamon").permanentId });
L45: await settle(() => s.perm("yao").isSuspended);
L47: expect(s.perm("yao").isSuspended).toBe(true);
L48: expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
L51: it("leaves Yao unsuspended and draws nothing when the suspend cost is declined", async () => {
L52: const s = setupEngine(
L67: await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gizamon").permanentId });
L68: await settle(() => false, 30);
L70: expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
L71: expect(s.perm("yao").isSuspended).toBe(false);
L72: expect(s.state.players[0]!.hand.length).toBe(handBefore);
L75: it("locks an opponent Digimon only when the triggering play carries Decode provenance (Q5911-Q5912)", async () => {
L76: const s = setupEngine(
L91: await advance(s.engine).fireSubTrigger("whenPlayed", {
L96: expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
L99: it("publishes full IR with Aqua-or-Sea-Animal filters and Decode only on the play watcher", () => {
L100: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L106: expect(played).toMatchObject({
L118: expect(evolved).toMatchObject({ actions: [{ kind: "Draw" }] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-058.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-058", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fdd5e2935 Complete EX11-058 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-059 — Reina Oumi — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-059",
  "set": "EX11",
  "nameEn": "Reina Oumi",
  "colors": [
    "Yellow",
    "Purple"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "NSo",
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] By trashing 1 [NSo] trait card from your hand, ＜Draw 1＞ and gain 1 memory.\n[All Turns] When any of your [NSo] trait Digimon are deleted, by suspending this Tamer, 1 of your [NSo] trait Digimon and 1 [NSo] trait Digimon card in the trash may DNA digivolve into a Digimon card with the [NSo] trait in the hand.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-059"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] By trashing 1 [NSo] trait card from your hand, ＜Draw 1＞ and gain 1 memory.\n[All Turns] When any of your [NSo] trait Digimon are deleted, by suspending this Tamer, 1 of your [NSo] trait Digimon and 1 [NSo] trait Digimon card in the trash may DNA digivolve into a Digimon card with the [NSo] trait in the hand."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-059`

```text
EX11-059 Reina Oumi
  Q&A (1):
    Q5913 (2026-02-06): An [NSo] trait Digimon with an [On Deletion] effect is deleted, and that card's [On Deletion] effect and this card's [All Turns] effect trigger simultaneously. At such times, if I activate this card's effect first, then DNA digivolve my Digimon and the card with the [On Deletion] effect that's pending activation, can I then activate that [On Deletion] effect?
      A: No, you can't activate it. When a card with an effect that's pending activation leaves its current area while activation is pending, the effect can no longer be activated. In this case, the deleted card's [On Deletion] effect triggers, but it's removed from the trash before the effect can activate.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-059.ts`; triggers StartOfYourMainPhase, OnPlay, AllTurns, Security; action/condition kinds Draw, GainMemory, SubTrigger, DnaDigivolve, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L19: trigger: "StartOfYourMainPhase",
L22: kind: "Draw",
L25: cost: {
L26: kind: "trash",
L42: optional: true,
L43: abortOnDecline: true,
L46: kind: "GainMemory",
L48: optional: true,
L49: abortOnDecline: true,
L54: trigger: "OnPlay",
L57: kind: "Draw",
L60: cost: {
L61: kind: "trash",
L77: optional: true,
L78: abortOnDecline: true,
L81: kind: "GainMemory",
L83: optional: true,
L84: abortOnDecline: true,
L89: trigger: "AllTurns",
L92: kind: "SubTrigger",
L96: kind: ["Digimon"],
L106: kind: "DnaDigivolve",
L111: kind: ["Digimon"],
L125: kind: ["Digimon"],
L139: kind: ["Digimon"],
L148: cost: {
L149: kind: "suspend",
L159: optional: true,
L160: abortOnDecline: true,
L168: trigger: "Security",
L171: kind: "PlayWithoutCost",
L189: registerIrCard("EX11-059", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-059.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("trashes an NSo card to draw and gain memory at the start of the main phase", async () => {
L10: const s = setupEngine(
L16: expect(s.state.memory).toBe(1);
L17: expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-030")).toBe(true);
L20: it("uses the deleted NSo card from trash with a field NSo Digimon for DNA digivolution (Q5913)", async () => {
L21: const s = setupEngine(
L40: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-032"));
L43: expect(dna).toBeDefined();
L44: expect(s.perm("reina").isSuspended).toBe(true);
L45: expect(dna?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX8-033", "EX8-013"]));
L48: it("publishes full IR with distinct field and trash NSo material pools", () => {
L49: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L50: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-059.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-059", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `bc84bcc47 Complete EX11-059 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-060 — Arisa Kinosaki — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-060",
  "set": "EX11",
  "nameEn": "Arisa Kinosaki",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When any of your Tokens or [Puppet] trait Digimon are deleted, by suspending this Tamer, ＜Draw 1＞ If deleted by ＜Overclock＞, you may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-060"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When any of your Tokens or [Puppet] trait Digimon are deleted, by suspending this Tamer, ＜Draw 1＞ If deleted by ＜Overclock＞, you may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-060`

```text
EX11-060 Arisa Kinosaki
  Q&A (1):
    Q5914 (2026-02-06): What will meet the "if deleted by <Overclock>" condition?
      A: The condition will be met if this effect is activated after being triggered by tokens or Digimon being deleted by <Overclock>. The condition won't be met if this effect is activated after being triggered by tokens or Digimion being deleted by a method other than <Overclock>, attacking using <Overclock>, or deletion in battle.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-060.ts`; triggers StartOfYourTurn, AllTurns, Security; action/condition kinds SetMemory, SubTrigger, Draw, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "StartOfYourTurn",
L11: kind: "SetMemory",
L13: condition: {
L14: kind: "memoryAtMost",
L21: trigger: "AllTurns",
L24: kind: "SubTrigger",
L33: kind: ["Digimon"],
L43: cost: {
L44: kind: "suspend",
L56: kind: "Draw",
L61: kind: "PlayWithoutCost",
L65: kind: ["Digimon"],
L81: optional: true,
L82: condition: {
L83: kind: "triggerRemovalCause",
L94: trigger: "Security",
L97: kind: "PlayWithoutCost",
L115: registerIrCard("EX11-060", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-060.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("sets memory to 3 at the start of your turn from 2 or less", async () => {
L10: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-060", as: "arisa" }] } });
L13: expect(s.state.memory).toBe(3);
L16: it("draws and plays a level 4 Puppet only when the deletion paid Overclock (Q5914)", async () => {
L18: const s = setupEngine(
L41: expect(
L44: expect(s.perm("arisa").isSuspended).toBe(true);
L45: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(true);
L48: it("draws but does not play a Puppet after an ordinary effect deletion (Q5914)", async () => {
L49: const s = setupEngine(
L65: await settle(() => s.perm("arisa").isSuspended);
L67: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-021")).toBe(true);
L68: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(false);
L69: expect(s.state.players[0]!.hand).toHaveLength(2);
L72: it("publishes full exclusive IR for every printed clause", () => {
L73: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L74: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-060.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-060", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa88810d1 Complete EX11-060 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-061 — Mirai Kinosaki — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-061",
  "set": "EX11",
  "nameEn": "Mirai Kinosaki",
  "colors": [
    "Yellow",
    "Purple"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[Your Turn] When any of your Digimon digivolve into a [Puppet] trait Digimon, by suspending this Tamer, you may play 1 level 3 [Puppet] trait Digimon card from your hand without paying the cost. At turn end, delete the Digimon this effect played.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-061"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[Your Turn] When any of your Digimon digivolve into a [Puppet] trait Digimon, by suspending this Tamer, you may play 1 level 3 [Puppet] trait Digimon card from your hand without paying the cost. At turn end, delete the Digimon this effect played."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-061`

```text
EX11-061 Mirai Kinosaki
  Q&A (2):
    Q5915 (2026-02-06): Do I delete the Digimon that was played by this card's [Your Turn] effect at the end of the turn?
      A: Yes, it's deleted upon the deletion timing.
    Q5916 (2026-02-06): What is the processing order for an effect that triggers at the end of the turn and the deletion of a Digimon played by this card's [Your Turn] effect?
      A: The pending processing for the effect that triggers at the end of the turn and the deletion at the end of the turn are considered to be processing that triggers simultaneously. Therefore, the turn player can choose the processing order.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-061.ts`; triggers StartOfYourMainPhase, YourTurn, Security; action/condition kinds GainMemory, SubTrigger, PlayWithoutCost, DelayedDelete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: trigger: "StartOfYourMainPhase",
L12: kind: "GainMemory",
L14: condition: {
L15: kind: "opponentHas",
L18: kind: ["Digimon"],
L26: trigger: "YourTurn",
L29: kind: "SubTrigger",
L33: kind: ["Digimon"],
L43: kind: "PlayWithoutCost",
L47: kind: ["Digimon"],
L60: cost: {
L61: kind: "suspend",
L71: optional: true,
L72: abortOnDecline: true,
L82: kind: "DelayedDelete",
L90: trigger: "Security",
L93: kind: "PlayWithoutCost",
L111: registerIrCard("EX11-061", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-061.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("gains memory at the start of the main phase when the opponent has a Digimon", async () => {
L9: const s = setupEngine({
L15: expect(s.state.memory).toBe(1);
L18: it("plays a level 3 Puppet after a Puppet digivolution and deletes exactly it at turn end (Q5915/Q5916)", async () => {
L19: const s = setupEngine(
L37: expect(
L38: s.engine.applyIntent(0, {
L44: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-020"));
L47: expect(played).toBeDefined();
L48: expect(s.perm("mirai").isSuspended).toBe(true);
L49: expect(s.perm("base").topCard?.cardId).toBe("EX11-021");
L53: await advance(s.engine).fireSubTrigger("endOfTurn", { turnSeat: 0 });
L55: expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-020")).toBe(true);
L56: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(true);
L59: it("publishes full exclusive IR with the delayed delete inside the digivolve watcher", () => {
L60: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L61: expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-061.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-061", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `35063d9f9 Complete EX11-061 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-062 — Shoto Kazama — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-062",
  "set": "EX11",
  "nameEn": "Shoto Kazama",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When any Digimon suspend, by suspending this Tamer, if effects suspended those Digimon, ＜Draw 1＞ After, 1 of your Digimon with [Avian] or [Bird] in any of its traits in any of its traits or the [Vortex Warriors] trait gets +3000 DP until your opponent's turn ends.\n[Your Turn] While your opponent has no unsuspended Digimon, your ＜Vortex＞ can also attack players.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-062"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[All Turns] When any Digimon suspend, by suspending this Tamer, if effects suspended those Digimon, ＜Draw 1＞ After, 1 of your Digimon with [Avian] or [Bird] in any of its traits in any of its traits or the [Vortex Warriors] trait gets +3000 DP until your opponent's turn ends.\n[Your Turn] While your opponent has no unsuspended Digimon, your ＜Vortex＞ can also attack players."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-062`

```text
EX11-062 Shoto Kazama
  Q&A (7):
    Q5826 (2026-02-06): My Digimon attacks an opponent's Digimon using <Vortex>, and I use this card's [All Turns] effect to play EX11-062 [Shoto Kazama]. Can I then use EX11-062 [Shoto Kazama]'s [Your Turn] effect to change the <Vortex> attack target to a player?
      A: No, you can't. EX11-062 [Shoto Kazama]'s [Your Turn] effect allows players to also be chosen as the attack target at the time of an attack declaration. It doesn't allow for changing the attack target.
    Q5917 (2026-02-06): Can I process the part of the effect after "after" in this card's [All Turns] effect without meeting the "by" condition?
      A: No, you can't. If you don't suspend this card, you can't process the part after "after" in its [All Turns] effect.
    Q5918 (2026-02-06): What will meet the "if effects suspended those Digimon" condition?
      A: This condition will be met if this effect is activated after being triggered by a suspending effect. If suspending occurs due to an attack or block, it will be due to the rules and not effects, therefore this effect won't trigger.
    Q5919 (2026-03-13): Is a "while your opponent has no Digimon with XX" condition also met when my opponent has no Digimon?
      A: Yes, it's met.
    Q5920 (2026-02-06): What does "while your opponent has no unsuspended Digimon, your <Vortex> can also attack players" mean, exactly?
      A: <Vortex> is an effect that normally only allows for attack declarations against Digimon, but this card's effect also allows <Vortex> attack declarations against players.
    Q5921 (2026-02-06): If I use "while your opponent has no unsuspended Digimon, your <Vortex> can also attack players" to attack a player using <Vortex>, do "when attack targets change" effects trigger?
      A: No, they don't trigger. "While your opponent has no unsuspended Digimon, your <Vortex> can also attack players" isn't an effect that changes attack targets, it's an effect that allows for attack declarations using <Vortex> against players in addition to Digimon.
    Q6517 (2026-05-08): Can I process the part of the effect after "after" in this card's [All Turns] effect even if a Digimon wasn't suspended by effects?
      A: Yes, you can process it. Even if it wasn't played by effects, this card's [All Turns] effect will give 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait +3000 DP until your opponent's turn ends.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-062.ts`; triggers StartOfYourTurn, AllTurns, YourTurn, Security; action/condition kinds SetMemory, SubTrigger, Draw, ModifyDP, GrantVortexCanAttackPlayers, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L20: trigger: "StartOfYourTurn",
L23: kind: "SetMemory",
L25: condition: {
L26: kind: "memoryAtMost",
L34: trigger: "AllTurns",
L37: kind: "SubTrigger",
L41: kind: "Draw",
L44: condition: {
L45: kind: "triggeredByEffect",
L50: kind: "ModifyDP",
L54: kind: ["Digimon"],
L69: duration: "untilOpponentTurnEnd",
L72: cost: {
L73: kind: "suspend",
L83: optional: true,
L84: abortOnDecline: true,
L90: trigger: "YourTurn",
L93: kind: "GrantVortexCanAttackPlayers",
L97: kind: ["Digimon"],
L101: duration: "forTheTurn",
L102: condition: {
L103: kind: "opponentHasNone",
L106: kind: ["Digimon"],
L116: trigger: "Security",
L119: kind: "PlayWithoutCost",
L137: registerIrCard("EX11-062", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-062.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("sets memory to 3 at the start of your turn from 2 or less", async () => {
L9: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-062", as: "shoto" }] } });
L12: expect(s.state.memory).toBe(3);
L15: it("draws and grants +3000 DP when an effect suspends a Digimon (Q5917/Q5918)", async () => {
L16: const s = setupEngine(
L32: expect(s.perm("shoto").isSuspended).toBe(true);
L33: expect(s.state.players[0]!.hand).toHaveLength(1);
L34: expect(s.perm("bird").currentDP).toBe(4000);
L37: it("skips the draw but still grants +3000 DP after an attack-rule suspension (Q5918/Q6517)", async () => {
L38: const s = setupEngine(
L53: expect(
L54: s.engine.applyIntent(0, {
L60: await settle(() => s.perm("shoto").isSuspended);
L62: expect(s.state.players[0]!.hand).toHaveLength(0);
L63: expect(s.perm("birdAttacker").currentDP).toBe(4000);
L66: it("publishes full exclusive IR with the suspension cost gating both branches", () => {
L67: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L68: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-062.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-062", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `4b3a1ef03 Complete EX11-062 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-063 — Winr — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-063",
  "set": "EX11",
  "nameEn": "Winr",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 5,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[On Play] Add your top face-down security card to the hand. Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card.\n[End of Your Turn] By suspending this Tamer, 1 of your [Royal Base] trait Digimon gains ＜Collision＞ and ＜Piercing＞ for the turn, and attacks.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-063"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[On Play] Add your top face-down security card to the hand. Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card.\n[End of Your Turn] By suspending this Tamer, 1 of your [Royal Base] trait Digimon gains ＜Collision＞ and ＜Piercing＞ for the turn, and attacks."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-063`

```text
EX11-063 Winr
  Q&A (6):
    Q5922 (2026-02-06): Can I use this card's [On Play] effect to place a card from my hand as a security card even if I have 0 cards in my security stack?
      A: Yes, you can.
    Q5923 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5924 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5925 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5926 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
    Q5927 (2026-02-06): Can I use this card's [End of Your Turn] effect to give <Collision> and <Piercing> to a Digimon, but then choose to not attack with that Digimon?
      A: No, you can't. The Digimon that was given <Collision> and <Piercing> by this effect must attack if possible.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-063.ts`; triggers StartOfYourTurn, OnPlay, EndOfYourTurn, Security; action/condition kinds SetMemory, SecurityManipulation, SelectBind, GainKeyword, Attack, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "StartOfYourTurn",
L11: kind: "SetMemory",
L13: condition: {
L14: kind: "memoryAtMost",
L21: trigger: "OnPlay",
L24: kind: "SecurityManipulation",
L31: kind: "SecurityManipulation",
L37: kind: ["Digimon"],
L50: optional: true,
L55: trigger: "EndOfYourTurn",
L58: kind: "SelectBind",
L62: kind: ["Digimon"],
L73: cost: {
L74: kind: "suspend",
L84: optional: true,
L85: abortOnDecline: true,
L88: kind: "GainKeyword",
L98: duration: "forTheTurn",
L101: kind: "GainKeyword",
L111: duration: "forTheTurn",
L114: kind: "Attack",
L121: optional: false,
L126: trigger: "Security",
L129: kind: "PlayWithoutCost",
L147: registerIrCard("EX11-063", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-063.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine } from "../../engine/testkit/harness.js";
L9: it("sets memory to 3 at the start of your turn from 2 or less", async () => {
L10: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-063", as: "winr" }] } });
L13: expect(s.state.memory).toBe(3);
L16: it("places a Royal Base card face up at security bottom even from zero security (Q5922-Q5926)", async () => {
L17: const s = setupEngine(
L30: expect(s.state.players[0]!.security).toHaveLength(1);
L31: expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX11-025", faceUp: true });
L32: expect(s.state.players[0]!.hand).toHaveLength(0);
L35: it("binds one Royal Base Digimon, grants both keywords, and makes it attack (Q5927)", async () => {
L36: const s = setupEngine(
L52: expect(s.perm("winr").isSuspended).toBe(true);
L53: expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Collision")).toBe(true);
L54: expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
L55: expect(
L64: it("publishes full exclusive IR with one binding shared by both grants and the attack", () => {
L65: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L66: expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-063.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-063", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `64036afe5 Complete EX11-063 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-064 — Altea — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-064",
  "set": "EX11",
  "nameEn": "Altea",
  "colors": [
    "Black",
    "Blue"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[On Play] Flip your opponent's top face-down security card face up.\n[Your Turn] When one of your [Cyborg] or [Machine] trait Digimon attacks, by suspending this Tamer, that Digimon may digivolve into a [Cyborg] or [Machine] trait Digimon card in the hand. For each of your opponent's face-up security cards, reduce this effect's digivolution cost by 1.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-064"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[On Play] Flip your opponent's top face-down security card face up.\n[Your Turn] When one of your [Cyborg] or [Machine] trait Digimon attacks, by suspending this Tamer, that Digimon may digivolve into a [Cyborg] or [Machine] trait Digimon card in the hand. For each of your opponent's face-up security cards, reduce this effect's digivolution cost by 1."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-064`

```text
EX11-064 Altea
  Q&A (4):
    Q5928 (2026-02-06): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q5929 (2026-02-06): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q5930 (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q5931 (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-064.ts`; triggers StartOfYourMainPhase, OnPlay, YourTurn, Security; action/condition kinds GainMemory, SecurityManipulation, SubTrigger, Digivolve, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L16: condition: {
L17: kind: "opponentHas",
L20: kind: ["Digimon"],
L28: trigger: "OnPlay",
L31: kind: "SecurityManipulation",
L38: trigger: "YourTurn",
L41: kind: "SubTrigger",
L45: kind: ["Digimon"],
L55: kind: "Digivolve",
L59: kind: ["Digimon"],
L66: kind: ["Digimon"],
L84: optional: true,
L85: cost: {
L86: kind: "suspend",
L96: abortOnDecline: true,
L103: trigger: "Security",
L106: kind: "PlayWithoutCost",
L124: registerIrCard("EX11-064", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-064.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("gains memory at the start of the main phase when the opponent has a Digimon", async () => {
L9: const s = setupEngine({
L15: expect(s.state.memory).toBe(1);
L18: it("flips the opponent's top face-down security card face up (Q5928-Q5931)", async () => {
L19: const s = setupEngine({
L26: expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
L27: expect(s.state.players[1]!.security[1]!.faceUp).toBe(false);
L30: it("digivolves only the attacking Cyborg and reduces its cost per face-up opposing security", async () => {
L31: const s = setupEngine(
L51: expect(
L52: s.engine.applyIntent(0, {
L58: await settle(() => s.perm("attackingCyborg").topCard?.cardId === "EX11-039");
L60: expect(s.perm("altea").isSuspended).toBe(true);
L61: expect(s.perm("attackingCyborg").topCard?.cardId).toBe("EX11-039");
L62: expect(s.perm("otherCyborg").topCard?.cardId).toBe("EX11-037");
L63: expect(s.state.memory).toBe(2);
L66: it("publishes full exclusive IR with trigger-subject scoping and folded face-up scaling", () => {
L67: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L69: expect(yourTurn.actions).toHaveLength(1);
L70: expect(yourTurn.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-064.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-064", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `9e71d93c8 Complete EX11-064 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-065 — Close — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-065",
  "set": "EX11",
  "nameEn": "Close",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 3,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards, gain 1 memory.\n[All Turns] When your Digimon are played or digivolve, if any of them have the [Mineral] or [Rock] trait, by suspending this Tamer, you may place 1 [Mineral] or [Rock] trait card from your hand or trash as any of those Digimon's bottom digivolution card.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-065"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards, gain 1 memory.\n[All Turns] When your Digimon are played or digivolve, if any of them have the [Mineral] or [Rock] trait, by suspending this Tamer, you may place 1 [Mineral] or [Rock] trait card from your hand or trash as any of those Digimon's bottom digivolution card."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-065`

```text
EX11-065 Close
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-065.ts`; triggers StartOfYourMainPhase, AllTurns, Security; action/condition kinds PlaceUnder, GainMemory, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: kind: "PlaceUnder" as const,
L12: kind: ["Digimon" as const],
L21: cost: {
L22: kind: "suspend" as const,
L26: optional: true,
L27: abortOnDecline: true,
L33: trigger: "StartOfYourMainPhase",
L36: kind: "GainMemory",
L38: cost: {
L39: kind: "trash",
L41: filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: mineralOrRock },
L47: optional: true,
L48: abortOnDecline: true,
L53: trigger: "AllTurns",
L56: kind: "SubTrigger",
L58: sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: mineralOrRock },
L62: kind: "SubTrigger",
L64: sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: mineralOrRock },
L70: trigger: "Security",
L73: kind: "PlayWithoutCost",
L85: registerIrCard("EX11-065", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-065.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L8: it("trashes a Mineral card from a digivolution stack to gain memory", async () => {
L9: const s = setupEngine(
L22: expect(s.state.memory).toBe(1);
L23: expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-051")).toBe(true);
L24: expect(s.perm("host").stack).toHaveLength(0);
L27: it("suspends to place a Mineral or Rock card under a played Mineral Digimon", async () => {
L28: const s = setupEngine(
L42: await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
L43: await settle(() => s.perm("close").isSuspended);
L45: expect(s.perm("close").isSuspended).toBe(true);
L46: expect(s.perm("gotsumon").stack.some((card) => card.cardId === "EX8-051")).toBe(true);
L49: it("leaves Close unsuspended and places nothing when the suspend cost is declined", async () => {
L50: const s = setupEngine(
L64: await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
L65: await settle(() => false, 30);
L67: expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
L68: expect(s.perm("close").isSuspended).toBe(false);
L69: expect(s.perm("gotsumon").stack).toHaveLength(0);
L70: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-051")).toBe(true);
L73: it("places from trash under the Mineral Digimon that just digivolved", async () => {
L74: const s = setupEngine(
L90: expect(
L91: s.engine.applyIntent(0, {
L97: await settle(() => s.perm("close").isSuspended);
L99: expect(s.perm("base").topCard?.cardId).toBe("BT10-062");
L100: expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
L103: it("publishes full exclusive IR for both trait-gated trigger events", () => {
L104: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L106: expect(allTurns.actions).toHaveLength(2);
L108: expect(allTurns.actions).toContainEqual(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-065.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-065", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `21f412fc0 Complete EX11-065 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-066 — Xeno — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-066",
  "set": "EX11",
  "nameEn": "Xeno",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] By trashing 1 card with [Vemmon] in its text from your hand, ＜Draw 1＞ and gain 1 memory.\n[All Turns] When your Digimon are played or digivolve, if any of them have [Vemmon] in their texts, by suspending this Tamer, reveal the top 2 cards of your deck. Place all [Vemmon] among them as any of those Digimon's bottom digivolution cards. Trash the rest.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-066"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] By trashing 1 card with [Vemmon] in its text from your hand, ＜Draw 1＞ and gain 1 memory.\n[All Turns] When your Digimon are played or digivolve, if any of them have [Vemmon] in their texts, by suspending this Tamer, reveal the top 2 cards of your deck. Place all [Vemmon] among them as any of those Digimon's bottom digivolution cards. Trash the rest."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-066`

```text
EX11-066 Xeno
  Q&A (1):
    Q5932 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-066.ts`; triggers StartOfYourMainPhase, OnPlay, AllTurns, Security; action/condition kinds Draw, GainMemory, RevealAdd, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: kind: "Draw" as const,
L12: cost: {
L13: kind: "trash" as const,
L20: optional: true,
L21: abortOnDecline: true,
L23: { kind: "GainMemory" as const, amount: 1 },
L27: kind: "RevealAdd" as const,
L41: cost: {
L42: kind: "suspend" as const,
L46: optional: true,
L47: abortOnDecline: true,
L52: { trigger: "StartOfYourMainPhase", actions: trashDrawGain },
L53: { trigger: "OnPlay", actions: trashDrawGain },
L55: trigger: "AllTurns",
L58: kind: "SubTrigger",
L60: sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: vemmonInText },
L64: kind: "SubTrigger",
L66: sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: vemmonInText },
L72: trigger: "Security",
L75: kind: "PlayWithoutCost",
L87: registerIrCard("EX11-066", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-066.test.ts` contains 10 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("accepts a card with Vemmon in its text for the start-phase cost", async () => {
L11: const s = setupEngine(
L17: expect(s.state.memory).toBe(1);
L18: expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-244")).toBe(true);
L21: it("gains the memory without asking, since only the trash cost is optional", async () => {
L22: const s = setupEngine(
L28: expect(s.state.memory).toBe(1);
L30: expect(optionalPrompts).toHaveLength(1);
L33: it("asks before suspending for the [All Turns] clause and skips it when declined", async () => {
L34: const s = setupEngine(
L48: await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("vemmon").permanentId });
L50: expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
L51: expect(s.perm("xeno").isSuspended).toBe(false);
L52: expect(s.state.players[0]!.deck).toHaveLength(2);
L53: expect(s.perm("vemmon").stack).toHaveLength(0);
L56: it("suspends and places the revealed Vemmon cards when accepted", async () => {
L57: const s = setupEngine(
L71: await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("vemmon").permanentId });
L72: await settle(() => s.perm("xeno").isSuspended);
L74: expect(s.perm("xeno").isSuspended).toBe(true);
L75: expect(s.state.players[0]!.deck).toHaveLength(0);
L76: expect(Array.from(s.perm("vemmon").stack, (card) => card.cardId)).toContain("BT11-061");
L77: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
L80: it("lets the controller order two copies that trigger off the same digivolution", async () => {
L81: const s = setupEngine(
L96: await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
L99: await settle(() => s.perm("firstXeno").isSuspended && s.perm("secondXeno").isSuspended);
L102: expect(ordering).toHaveLength(1);
L103: expect(ordering[0]!.req.options?.triggerKeys).toHaveLength(2);
L104: expect(s.perm("firstXeno").isSuspended).toBe(true);
L105: expect(s.perm("secondXeno").isSuspended).toBe(true);
L108: it("orders the digivolving card's own effect together with both watchers", async () => {
L109: const s = setupEngine(
L126: expect(
L127: s.engine.applyIntent(0, {
L133: await settle(() => s.perm("vemmon").topCard.cardId === "BT11-070");
L134: await settle(() => s.perm("firstXeno").isSuspended && s.perm("secondXeno").isSuspended);
L139: expect(ordering?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT11-070", "EX11-066", "EX11-066"]));
L140: expect(ordering?.req.options?.triggerKeys).toHaveLength(3);
L143: it("orders a played card's own [On Play] together with the watcher it triggered", async () => {
L144: const s = setupEngine(
L158: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("destromon").instanceId })).toEqual({
L161: await settle(() => s.perm("xeno").isSuspended);
L166: expect(ordering?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["P-094", "EX11-066"]));
L167: expect(s.state.players[0]!.deck).toHaveLength(0);
L170: it("does not ask to order a copy that is already suspended and cannot pay", async () => {
L171: const s = setupEngine(
L187: await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
L190: await settle(() => s.perm("firstXeno").isSuspended);
L192: expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(false);
L193: expect(s.perm("firstXeno").isSuspended).toBe(true);
L196: it("ignores a digivolution in the breeding area", async () => {
L197: const s = setupEngine(
L209: await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
L213: expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(false);
L214: expect(s.perm("xeno").isSuspended).toBe(false);
L215: expect(s.state.players[0]!.deck).toHaveLength(2);
L216: expect(s.perm("vemmon").stack).toHaveLength(0);
L219: it("publishes full exclusive IR with Q5932 text matching and exact reveal dispositions", () => {
L220: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L222: expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
L231: expect(watchers).toHaveLength(2);
L233: expect(watcher).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-066.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-066", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `ed0f9bcaf Complete EX11-066 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-067 — Dokuson Aruba — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-067",
  "set": "EX11",
  "nameEn": "Dokuson Aruba",
  "colors": [
    "Purple",
    "Yellow"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 5,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[On Play] 1 of your Digimon with [Lucemon] in its text on the field may digivolve into a Digimon card with [Lucemon] in its name in the hand or trash without paying the cost.\n[Your Turn] When any of your Digimon digivolve into a Digimon card with [Lucemon] in its name, by suspending this Tamer, gain 1 memory.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "EX11-067"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[On Play] 1 of your Digimon with [Lucemon] in its text on the field may digivolve into a Digimon card with [Lucemon] in its name in the hand or trash without paying the cost.\n[Your Turn] When any of your Digimon digivolve into a Digimon card with [Lucemon] in its name, by suspending this Tamer, gain 1 memory."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-067`

```text
EX11-067 Dokuson Aruba
  Q&A (5):
    Q5933 (2026-02-06): Can I use a "Digimon on the field may digivolve" effect to digivolve a Digimon from the breeding area or battle area?
      A: Yes, you can. The "field" refers to both the breeding area and the battle area.
    Q5934 (2026-02-06): If I use this card's [On Play] effect to digivolve a Digimon in the breeding area, does that Digimon's [When Digivolving] effect trigger?
      A: No, it doesn't trigger.
    Q5935 (2026-02-06): Does this card's [Your Turn] effect trigger when I use this card’s [On Play] effect to digivolve my Digimon in the battle area?
      A: Yes, it triggers.
    Q5936 (2026-02-06): Does this card’s [Your Turn] effect trigger when I use this card’s [On Play] effect to digivolve my Digimon in the breeding area?
      A: No, it doesn't trigger.
    Q5937 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-067.ts`; triggers StartOfYourTurn, OnPlay, YourTurn, Security; action/condition kinds SetMemory, Digivolve, SubTrigger, GainMemory, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L19: trigger: "StartOfYourTurn",
L22: kind: "SetMemory",
L24: condition: {
L25: kind: "memoryAtMost",
L32: trigger: "OnPlay",
L35: kind: "Digivolve",
L39: kind: ["Digimon"],
L52: kind: ["Digimon"],
L62: optional: true,
L67: trigger: "YourTurn",
L70: kind: "SubTrigger",
L74: kind: ["Digimon"],
L87: kind: "GainMemory",
L89: cost: {
L90: kind: "suspend",
L100: optional: true,
L107: trigger: "Security",
L110: kind: "PlayWithoutCost",
L128: registerIrCard("EX11-067", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-067.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("sets memory to 3 at the start of your turn from 2 or less", async () => {
L9: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-067", as: "dokuson" }] } });
L12: expect(s.state.memory).toBe(3);
L15: it("digivolves a battle-area Lucemon-text Digimon and triggers the Tamer memory effect (Q5935)", async () => {
L16: const s = setupEngine(
L32: await settle(() => s.perm("dokuson").isSuspended);
L34: expect(s.perm("battleLucemon").topCard?.cardId).toBe("BT18-082");
L35: expect(s.state.memory).toBe(1);
L38: it("digivolves a breeding-area Digimon without firing either digivolution effect (Q5933/Q5934/Q5936)", async () => {
L39: const s = setupEngine(
L54: expect(s.perm("breedingLucemon").topCard?.cardId).toBe("BT18-082");
L55: expect(s.perm("dokuson").isSuspended).toBe(false);
L56: expect(s.state.memory).toBe(0);
L59: it("publishes full exclusive IR with the field union and Q5937 text match", () => {
L60: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L61: expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-067.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-067", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `34baef621 Complete EX11-067 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-068 — Violet Inboots — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-068",
  "set": "EX11",
  "nameEn": "Violet Inboots",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[Your Turn] When one of your [Ghost] trait Digimon attacks, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand. If attacking by ＜Execute＞, it may digivolve into a [Ghost] trait Digimon card in the hand with the digivolution cost reduced by 2.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-068"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[Your Turn] When one of your [Ghost] trait Digimon attacks, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand. If attacking by ＜Execute＞, it may digivolve into a [Ghost] trait Digimon card in the hand with the digivolution cost reduced by 2."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-068`

```text
EX11-068 Violet Inboots
  Q&A (1):
    Q5938 (2026-02-06): What will meet the "if attacking by <Execute>" condition?
      A: The condition will be met if this effect is activated after being triggered by an attack using <Execute>.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-068.ts`; triggers StartOfYourTurn, YourTurn, Security; action/condition kinds SetMemory, SubTrigger, Draw, Trash, Digivolve, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L17: trigger: "StartOfYourTurn",
L20: kind: "SetMemory",
L22: condition: {
L23: kind: "memoryAtMost",
L30: trigger: "YourTurn",
L33: kind: "SubTrigger",
L37: kind: ["Digimon"],
L47: kind: "Draw",
L50: cost: {
L51: kind: "suspend",
L63: kind: "Trash",
L73: kind: "Digivolve",
L78: kind: ["Digimon"],
L90: kind: ["Digimon"],
L101: optional: true,
L102: condition: {
L103: kind: "triggerAttackBy",
L113: trigger: "Security",
L116: kind: "PlayWithoutCost",
L134: registerIrCard("EX11-068", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-068.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine } from "../../engine/testkit/harness.js";
L10: it("sets memory to 3 at the start of your turn from 2 or less", async () => {
L11: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-068", as: "violet" }] } });
L14: expect(s.state.memory).toBe(3);
L17: it("suspends itself, draws, trashes, and evolves the Execute attacker with cost reduced by 2 (Q5938)", async () => {
L18: const s = setupEngine(
L39: await advance(s.engine).fireSubTrigger("whenAttacking", {
L44: expect(s.perm("violet").isSuspended).toBe(true);
L45: expect(s.perm("executor").topCard?.cardId).toBe("EX11-051");
L46: expect(s.state.memory).toBe(2);
L47: expect(s.state.players[0]!.hand).toHaveLength(1);
L48: expect(s.state.players[0]!.trash).toHaveLength(1);
L51: it("publishes full exclusive IR scoped to the triggering attacker", () => {
L52: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L53: expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-068.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-068", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7999ebf7b Complete EX11-068 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-069 — Yuuki — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-069",
  "set": "EX11",
  "nameEn": "Yuuki",
  "colors": [
    "Purple",
    "Red"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] By trashing 1 card in your hand, gain 1 memory.\n[Your Turn] [Once Per Turn] When one of your Digimon attacks, if you have 4 or fewer cards in your hand, it may digivolve into a [Dark Dragon] or [Evil Dragon] trait Digimon card in the trash with the digivolution cost reduced by 1.\n[End of All Turns] If you have 4 or fewer cards in your hand, by suspending this Tamer, you may return 1 [Evil], [Dark Dragon] or [Evil Dragon] trait card from your trash to the hand.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "EX11-069"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] By trashing 1 card in your hand, gain 1 memory.\n[Your Turn] [Once Per Turn] When one of your Digimon attacks, if you have 4 or fewer cards in your hand, it may digivolve into a [Dark Dragon] or [Evil Dragon] trait Digimon card in the trash with the digivolution cost reduced by 1.\n[End of All Turns] If you have 4 or fewer cards in your hand, by suspending this Tamer, you may return 1 [Evil], [Dark Dragon] or [Evil Dragon] trait card from your trash to the hand."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-069`

```text
EX11-069 Yuuki
  Q&A (1):
    Q5939 (2026-02-06): An opponent's Digimon uses another effect to attack a player at the end of their turn, this card is checked, and its [Security] effect plays it. After it's played, can I then activate this card's [All Turns] effect?
      A: No, you can't. [End of All Turns] effects are effects that trigger at the end of a turn. If the turn has already ended, it won't trigger.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-069.ts`; triggers StartOfYourMainPhase, OnPlay, YourTurn, EndOfAllTurns, Security; action/condition kinds GainMemory, SubTrigger, Digivolve, Return, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L16: cost: {
L17: kind: "trash",
L27: optional: true,
L28: abortOnDecline: true,
L33: trigger: "OnPlay",
L36: kind: "GainMemory",
L38: cost: {
L39: kind: "trash",
L49: optional: true,
L50: abortOnDecline: true,
L55: trigger: "YourTurn",
L58: kind: "SubTrigger",
L62: kind: ["Digimon"],
L66: kind: "Digivolve",
L70: kind: ["Digimon"],
L76: kind: ["Digimon"],
L87: optional: true,
L88: condition: {
L89: kind: "zoneCount",
L100: frequency: "OncePerTurn",
L103: trigger: "EndOfAllTurns",
L106: kind: "Return",
L121: condition: {
L122: kind: "zoneCount",
L129: cost: {
L130: kind: "suspend",
L140: optional: true,
L141: abortOnDecline: true,
L146: trigger: "Security",
L149: kind: "PlayWithoutCost",
L167: registerIrCard("EX11-069", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-069.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine } from "../../engine/testkit/harness.js";
L10: it("trashes a hand card to gain memory at the start of the main phase", async () => {
L11: const s = setupEngine(
L17: expect(s.state.memory).toBe(1);
L18: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
L21: it("evolves only the attacking Digimon from trash, pays the cost reduced by 1, and is once per turn", async () => {
L22: const s = setupEngine(
L43: await advance(s.engine).fireSubTrigger("whenAttacking", attack);
L44: await advance(s.engine).fireSubTrigger("whenAttacking", attack);
L46: expect(s.perm("attacker").topCard.cardId).toBe("EX11-050");
L47: expect(s.perm("other").topCard.cardId).toBe("EX11-049");
L48: expect(s.state.memory).toBe(2);
L49: expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-052");
L52: it("suspends itself to return an eligible trait card at end of all turns", async () => {
L53: const s = setupEngine(
L65: expect(s.perm("yuuki").isSuspended).toBe(true);
L66: expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX11-050"]);
L69: it("publishes full exclusive IR with trigger-subject evolution and no retroactive end trigger (Q5939)", () => {
L70: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L71: expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
L85: expect(compiled.effects.filter((effect) => effect.trigger === "EndOfAllTurns")).toHaveLength(1);
L86: expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
L91: it("does not retroactively trigger after its Security effect plays it following end-of-turn timing (Q5939)", async () => {
L92: const s = setupEngine(
L103: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityYuuki"));
L106: expect(played?.isSuspended).toBe(false);
L107: expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-050");
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-069.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-069", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `498809c6c Complete EX11-069 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-070 — Unchained — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-070",
  "set": "EX11",
  "nameEn": "Unchained",
  "colors": [
    "White"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 4,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[Security] Play this card without paying the cost.\n[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[End of Your Turn] 2 of your Digimon may DNA digivolve into [ExMaquinamon] in the hand. Then, this Tamer may ＜Mind Link＞ with 1 of your Digimon with [Maquinamon] in its text.",
  "inheritedEffectText": "[All Turns] This Digimon with [Maquinamon] in its text can't have less than 1000 DP, and your opponent's effects can't trash its stacked cards.\n[End of All Turns] You may play 1 [Unchained] from this Digimon's digivolution cards without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-070"
}
```
2. **Exact printed surfaces:**
   - Main: "[Security] Play this card without paying the cost.\n[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[End of Your Turn] 2 of your Digimon may DNA digivolve into [ExMaquinamon] in the hand. Then, this Tamer may ＜Mind Link＞ with 1 of your Digimon with [Maquinamon] in its text."
   - Inherited: "[All Turns] This Digimon with [Maquinamon] in its text can't have less than 1000 DP, and your opponent's effects can't trash its stacked cards.\n[End of All Turns] You may play 1 [Unchained] from this Digimon's digivolution cards without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-070`

```text
EX11-070 Unchained
  Q&A (5):
    Q5940 (2026-02-06): Can I use this card's [End of Your Turn] effect to perform <Mind Link> without DNA digivolving?
      A: Yes, you can.
    Q5941 (2026-02-06): There is a Digimon with a "can't have less than 1000 DP" effect and an original DP of 5000. It then gets +2000 DP, changing its DP to 7000. What happens if another effect gives that Digimon -7000 DP?
      A: Its DP becomes 1000. For changes to DP, the values of the changes are first calculated, then the changes are applied to the original value. In this case, +2000 DP and -7000 DP are the values of the changes, and those values are applied to the original DP of 5000. If a Digimon with 5000 DP gets -5000 DP but it has a "can't have less than 1000 DP" effect, its DP will change to 1000.
    Q5942 (2026-02-06): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q5943 (2026-02-06): What does a "can't trash stacked cards" effect do, exactly?
      A: This effect prevents cards stacked on top from being trashed by <De-Digivolve> or other effects, and cards stacked on the bottom can't be trashed by effects such as those that trash digivolution cards.
    Q6523 (2026-05-08): Does this card's [All Turns] effect trigger when I use EX11-070 [Unchained]'s inherited effect to play [Unchained] from my Digimon's digivolution cards?
      A: Yes, it triggers.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-070.ts`; triggers Security, StartOfYourTurn, EndOfYourTurn, AllTurns, EndOfAllTurns; action/condition kinds PlayWithoutCost, SetMemory, DnaDigivolve, MindLink, MinDpFloor, StackTrashLock. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: const maquinamonText = { controller: "mine", kind: ["Digimon"], textContains: "Maquinamon" };
L11: trigger: "Security",
L12: actions: [{ kind: "PlayWithoutCost", target: self, payCost: false }],
L16: trigger: "StartOfYourTurn",
L17: actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
L20: trigger: "EndOfYourTurn",
L23: kind: "DnaDigivolve",
L24: materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
L27: kind: ["Digimon"],
L31: optional: true,
L34: kind: "MindLink",
L36: optional: true,
L41: trigger: "AllTurns",
L44: kind: "MinDpFloor",
L47: duration: "permanent",
L48: condition: {
L49: kind: "selfTopHasText",
L54: kind: "StackTrashLock",
L56: duration: "permanent",
L57: condition: {
L58: kind: "selfTopHasText",
L66: trigger: "EndOfAllTurns",
L69: kind: "PlayWithoutCost",
L73: kind: ["Tamer"],
L80: optional: true,
L90: registerIrCard("EX11-070", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-070.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine } from "../../engine/testkit/harness.js";
L8: it("sets memory to 3 at the start of your turn from 2 or less", async () => {
L9: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-070", as: "unchained" }] } });
L12: expect(s.state.memory).toBe(3);
L15: it("Mind Links without requiring the preceding DNA digivolution (Q5940, Q5942)", async () => {
L16: const s = setupEngine(
L30: expect(s.perm("maquinamonText").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
L31: expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-070")).toHaveLength(0);
L34: it("DNA digivolves exactly 2 Digimon into ExMaquinamon from hand before Mind Link", async () => {
L35: const s = setupEngine(
L52: expect(s.perm("result").topCard.cardId).toBe("EX11-073");
L53: expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(
L56: expect(s.state.memory).toBe(2);
L59: it("clamps the inherited host after summed DP changes and blocks only opposing stack trash (Q5941-Q5943)", async () => {
L60: const s = setupEngine({
L69: expect(s.perm("host").currentDP).toBe(1000);
L71: await advance(s.engine).verb.trashDigivolutionCards(
L76: expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
L78: await advance(s.engine).verb.trashDigivolutionCards(
L83: expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-070");
L86: it("plays inherited Unchained from its own stack at end of all turns (Q6523)", async () => {
L87: const s = setupEngine(
L98: expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-070")).toBe(true);
L99: expect(s.perm("host").stack).toHaveLength(0);
L102: it("publishes full exclusive IR for every printed clause", () => {
L103: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L104: expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
L108: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-070.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-070", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `a795d6632 Port EX11-070 to compiled IR`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-071 — Cool Boy — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-071",
  "set": "EX11",
  "nameEn": "Cool Boy",
  "colors": [
    "White"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 3,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "LIBERATOR"
  ],
  "effectText": "[On Play] Reveal the top 3 cards of your deck. Add 1 [Omekamon] or [Omnimon (X Antibody)] and 1 [Royal Knight] or [LIBERATOR] trait card among them to the hand. Return the rest to the bottom of the deck.  [Main] By returning this Tamer to the bottom of the deck, you may play 1 play cost 4 or higher [Royal Knight] or [LIBERATOR] trait card from your hand with the play cost reduced by 2.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "EX11-071"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] Reveal the top 3 cards of your deck. Add 1 [Omekamon] or [Omnimon (X Antibody)] and 1 [Royal Knight] or [LIBERATOR] trait card among them to the hand. Return the rest to the bottom of the deck.  [Main] By returning this Tamer to the bottom of the deck, you may play 1 play cost 4 or higher [Royal Knight] or [LIBERATOR] trait card from your hand with the play cost reduced by 2."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-071`

```text
EX11-071 Cool Boy
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-071.ts`; triggers OnPlay, Main, Security; action/condition kinds RevealAdd, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "OnPlay",
L11: kind: "RevealAdd",
L46: trigger: "Main",
L49: kind: "PlayWithoutCost",
L66: cost: {
L67: kind: "return",
L78: optional: true,
L79: abortOnDecline: true,
L84: trigger: "Security",
L87: kind: "PlayWithoutCost",
L105: registerIrCard("EX11-071", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR), BT18-092 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-071.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { settle, setupEngine } from "../../engine/testkit/harness.js";
L9: it("reveals three cards and adds an Omekamon and Royal Knight", async () => {
L10: const s = setupEngine(
L15: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cool").instanceId })).toEqual({ ok: true });
L16: await settle(
L23: expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-053")).toBe(true);
L24: expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-008")).toBe(true);
L25: expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
L28: it("returns itself to deck bottom and pays a LIBERATOR card's play cost reduced by 2", async () => {
L29: const s = setupEngine(
L44: expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
L47: await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "AD1-008"));
L49: expect(s.state.memory).toBe(0);
L50: expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("EX11-071");
L53: it("rejects a play-cost-3 card before paying the self-return cost", async () => {
L54: const s = setupEngine(
L67: expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
L70: await settle(() => s.state.pendingDecision === undefined);
L71: expect(s.perm("cool").topCard.cardId).toBe("EX11-071");
L72: expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT18-060");
L75: it("plays itself from security without paying the cost", async () => {
L76: const s = setupEngine({ 0: { security: [{ card: "EX11-071", as: "cool", faceUp: true }] } });
L77: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("cool"));
L78: expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-071")).toBe(true);
L81: it("publishes full exclusive IR with the play floor and folded reduction", () => {
L82: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L83: expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-071.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-071", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `0d686b967 Complete EX11-071 compiled behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-072 — Unique Emblem: Guardian Vortex — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-072",
  "set": "EX11",
  "nameEn": "Unique Emblem: Guardian Vortex",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 3,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Vortex Warriors",
    "LIBERATOR"
  ],
  "effectText": "[Main] You may play 1 [Pteromon], [Muchomon] or [Shoto Kazama] from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Your Turn] When any of your [Shoto Kazama]s suspend, ＜Delay＞ \n・1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait may digivolve into a Digimon card with the [Bird Dragon] and [LIBERATOR] trait in the hand with the digivolution cost reduced by 3.",
  "securityEffectText": "[Security] Activate this card's [Main] effects.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "EX11-072"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] You may play 1 [Pteromon], [Muchomon] or [Shoto Kazama] from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Your Turn] When any of your [Shoto Kazama]s suspend, ＜Delay＞ \n・1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait may digivolve into a Digimon card with the [Bird Dragon] and [LIBERATOR] trait in the hand with the digivolution cost reduced by 3."
   - Security: "[Security] Activate this card's [Main] effects."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-072`

```text
EX11-072 Unique Emblem: Guardian Vortex
  Q&A (1):
    Q5944 (2026-02-06): If I would use this card's <Delay> effect to digivolve my Digimon, can it digivolve into Digimon card with just the [Bird Dragon] or [LIBERATOR] trait?
      A: No, it can't. It can only digivolve into a card with both the [Bird Dragon] and [LIBERATOR] traits.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-072.ts`; triggers Main, YourTurn, Security; action/condition kinds PlayWithoutCost, PlaceInBattleAreaSelf, SubTrigger, GainKeyword, Digivolve, ActivateMain. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L17: trigger: "Main",
L20: kind: "PlayWithoutCost",
L35: optional: true,
L38: kind: "PlaceInBattleAreaSelf",
L43: trigger: "YourTurn",
L46: kind: "SubTrigger",
L59: kind: "GainKeyword",
L68: duration: "permanent",
L75: trigger: "Main",
L79: kind: "Digivolve",
L83: kind: ["Digimon"],
L93: kind: ["Digimon"],
L99: optional: true,
L104: trigger: "Security",
L107: kind: "ActivateMain",
L117: registerIrCard("EX11-072", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/meta.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-101 (Vortex Warriors/LIBERATOR), EX11-032 (Vortex Warriors/LIBERATOR), EX11-035 (Vortex Warriors/LIBERATOR), EX11-074 (Vortex Warriors/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-072.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L7: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("requires both Bird Dragon and LIBERATOR on the Delay digivolution target", () => {
L15: expect(irNode(delay?.actions?.[0])?.into?.nameOrTrait?.[0]).toMatchObject({
L21: it("security activates Main, plays a named card, and places the emblem in battle", async () => {
L22: const s = setupEngine(
L32: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
L34: expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
L39: it("arms Delay when Shoto suspends, then trashes the emblem to evolve a legal stack for cost 0", async () => {
L40: const s = setupEngine(
L62: expect(observe(s.engine).hasKeyword(s.perm("emblem"), "Delay")).toBe(true);
L66: expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
L69: await settle(() => s.perm("bird").topCard.cardId === "EX11-032");
L71: expect(s.state.memory).toBe(2);
L72: expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-072");
L75: it("publishes a separate Delay grant and paid reduced-cost payload", () => {
L77: expect(watcher.actions).toMatchObject([
L83: expect(delay.actions).toMatchObject([
L91: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-072.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-072", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `1ab2227cb Complete EX11-072 Delay behavior`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-073 — ExMaquinamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-073",
  "set": "EX11",
  "nameEn": "ExMaquinamon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 7,
  "playCost": 15,
  "dp": 15000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 6,
      "memoryCost": 5
    },
    {
      "color": "Black",
      "level": 6,
      "memoryCost": 5
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Unique",
    "LIBERATOR"
  ],
  "effectText": "＜Security A. +1＞ \n＜Blocker＞ \n＜Link +2＞ (Add 2 to this Digimon's maximum links.)\n[When Digivolving] If DNA digivolving, you may link up to 3 [Maquinamon] from your hand, trash or this Digimon's digivolution cards to this Digimon without paying the cost.\n[End of Opponent's Turn] [Once Per Turn] For each of this Digimon's link cards, trash your opponent's top security card and return 1 of their Digimon to the bottom of the deck.",
  "rarity": "UR",
  "maxCountInDeck": 4,
  "imageId": "EX11-073"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Security A. +1＞ \n＜Blocker＞ \n＜Link +2＞ (Add 2 to this Digimon's maximum links.)\n[When Digivolving] If DNA digivolving, you may link up to 3 [Maquinamon] from your hand, trash or this Digimon's digivolution cards to this Digimon without paying the cost.\n[End of Opponent's Turn] [Once Per Turn] For each of this Digimon's link cards, trash your opponent's top security card and return 1 of their Digimon to the bottom of the deck."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-073`

```text
EX11-073 ExMaquinamon
  Q&A (3):
    Q5945 (2026-02-06): If a Digimon with a link card would DNA digivolve into this card, what happens to the link card of the Digimon that would become a digivolution card?
      A: The link card is trashed immediately before stacking the Digimon as a digivolution card.
    Q5946 (2026-02-06): If <Mind Link> places a card in this card's digivolution cards, is it also included as one of this card's link cards?
      A: No, it isn't. A link card is a card plugged in sideways with a Digimon by a <Link>.
    Q5947 (2026-02-06): If a card has a "for each XX, [action 1] and [action 2]" effect and there are multiples of XX, in what order are [action 1] and [action 2] processed?
      A: After performing [action 1] for each XX, then [action 2] is performed. For example, if a Digimon has 3 colors in its digivolution cards and a "for each color of this Digimon's digivolution cards, choose 1 digivolution card under your opponent's Digimon and trash it, and suspend 1 of your opponent's Digimon" effect activates, you first choose 3 digivolution cards under your opponent's Digimon and trash them, then you suspend 3 of their Digimon.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects recovery processing order" --limit 3`

```text
[comprehensive §16-6] <Recovery>  (14.619)
  16-6. <Recovery> 16-6-1. <Recovery> is a keyword effect where the specified number of cards from the specified area are placed face down on top of the security stack. This is shown on cards using text such as <Recovery +1>. 16-6-2. <Recovery> effects execute processing.

[glossary] Keyword Effects<Blocker>  (7.172)
  …attack changes to the Digimon that used <Blocker>, taking the place of the original target. <Security Attack +x> This Digimon checks x additional security card(s). Effect that increases the number of security cards checked by x when attacking the opposing player. When checking mu…

[comprehensive §15-1] Effects  (6.47)
  15-1. Effects 15-1-1. An effect refers to the processing activated by a card that affects the game or cards themselves. 15-1-2. A single effect is processed in the order shown in the text on the card. 15-1-3. A prohibiting effect takes precedence over an enabling effect. (Example…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "face-down cards under Tamers stacking trash visibility" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[comprehensive §4-6] Stacked Cards  (14.281)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-073.ts`; triggers Static, WhenDigivolving, EndOfOpponentsTurn; action/condition kinds Link, RepeatPerCount, Return. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: filter: { controller: "mine", kind: ["Digimon"], isSelfRef: true },
L14: trigger: "Static",
L19: trigger: "Static",
L24: trigger: "Static",
L29: trigger: "WhenDigivolving",
L32: kind: "Link",
L44: optional: true,
L45: condition: { kind: "isDnaDigivolving", raw: "If DNA digivolving" },
L50: trigger: "EndOfOpponentsTurn",
L51: frequency: "OncePerTurn",
L54: kind: "RepeatPerCount",
L57: action: { kind: "trashSecurityTop", controller: "opponent", count: 1 },
L60: kind: "RepeatPerCount",
L64: kind: "Return",
L65: target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
L76: registerIrCard("EX11-073", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT16-036 (Unique), BT18-060 (LIBERATOR), BT18-065 (LIBERATOR), BT18-087 (LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-073.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("has Security Attack +1 and Blocker while on the field", async () => {
L11: const s = setupEngine({ 0: { battleArea: [{ card: "EX11-073", as: "exmaquinamon" }] } });
L13: await settle(() => observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack"));
L14: expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack")).toBe(true);
L15: expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "Blocker")).toBe(true);
L16: expect(observe(s.engine).linkMaxDelta(s.perm("exmaquinamon"))).toBe(2);
L19: it("links up to 3 exact Maquinamon from hand, trash, and only this Digimon's stack when DNA digivolving", async () => {
L20: const s = setupEngine(
L38: expect(s.perm("host").linked.map(({ cardId }) => cardId)).toEqual(["EX11-027", "EX11-027", "EX11-027"]);
L39: expect(s.perm("other").stack.map(({ cardId }) => cardId)).toContain("EX11-027");
L42: it("trashes material link cards immediately before the DNA merge (Q5945-Q5946)", async () => {
L43: const s = setupEngine(
L60: expect(s.perm("result").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("materialLink").instanceId]);
L61: expect(
L69: expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(
L74: it("processes all security trashes before all deck-bottom returns for each link card (Q5947)", async () => {
L75: const s = setupEngine(
L101: expect(s.state.players[1]!.security).toHaveLength(1);
L102: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L103: expect(s.state.players[1]!.deck).toHaveLength(2);
L111: expect(securityMove).toBeGreaterThanOrEqual(0);
L112: expect(deckMove).toBeGreaterThan(securityMove);
L115: it("publishes full exclusive IR with exact link sources and ordered per-link action groups", () => {
L116: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L117: expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.actions).toMatchObject([
L125: expect(compiled.effects.find((effect) => effect.trigger === "EndOfOpponentsTurn")?.actions).toMatchObject([
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-073.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-073", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `b56dc5e99 Port EX11-073 to compiled IR`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## EX11-074 — Vortexdramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "EX11-074",
  "set": "EX11",
  "nameEn": "Vortexdramon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 7,
  "playCost": 14,
  "dp": 14000,
  "evoCosts": [
    {
      "color": "Green",
      "level": 6,
      "memoryCost": 4
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Data"
  ],
  "types": [
    "Bird Dragon",
    "Vortex Warriors",
    "LIBERATOR"
  ],
  "effectText": "[Digivolve] While you have [Shoto Kazama], [GrandGalemon]: Cost 6 \n\n＜Piercing＞ \n＜Vortex＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] You may suspend 1 Digimon. If this effect suspended your Digimon, until your opponent's turn ends, their Digimon's effects don't affect this Digimon and it gets +6000 DP.\n[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may unsuspend. Then, this Digimon may battle 1 of your opponent's Digimon.",
  "rarity": "UR",
  "maxCountInDeck": 4,
  "imageId": "EX11-074"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] While you have [Shoto Kazama], [GrandGalemon]: Cost 6 \n\n＜Piercing＞ \n＜Vortex＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] You may suspend 1 Digimon. If this effect suspended your Digimon, until your opponent's turn ends, their Digimon's effects don't affect this Digimon and it gets +6000 DP.\n[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may unsuspend. Then, this Digimon may battle 1 of your opponent's Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card EX11-074`

```text
EX11-074 Vortexdramon
  Q&A (12):
    Q5948 (2026-02-06): Can I use this card's [When Digivolving] [When Attacking] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
    Q5949 (2026-02-06): What does "effects don't affect" mean, exactly?
      A: This effect prevents a card from being affected by effects. For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.
    Q5950 (2026-02-06): Can a card that has an "effects don't affect" effect be chosen for an effect?
      A: Yes, it can be chosen. For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.
    Q5951 (2026-02-06): Can a card that has an "effects don't affect" effect be given an effect?
      A: Yes, it can. It won't be affected by it, but it can be given an effect. However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.
    Q5952 (2026-02-06): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
      A: As soon as it gains the "effects don't affect" effect, it will no longer be affected.
    Q5953 (2026-02-06): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
      A: It will be affected by the effect as soon as it can be affected by effects.
    Q5954 (2026-02-06): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
      A: If the Digimon isn't affected by effects upon the trigger timing, the effect won't trigger.
    Q5955 (2026-02-06): What does "may battle" mean, exactly?
      A: This effect directly performs a battle. If this effect is activated, the chosen Digimon battle, as with the standard rules.
    Q5956 (2026-03-06): If 2 Digimon including a Digimon that has an "effects don't affect" effect are chosen for a "may battle" effect, can those Digimon battle?
      A: Yes, they can battle. A card that has an "effects don't affect" effect can still be chosen for an effect. In addition, a battle itself is a rule that compares DP, not an effect. Therefore, a Digimon that isn't affected by effects can be chosen, and then it can battle. If it loses the battle, it will be deleted as normal according to the rules.
    Q5957 (2026-03-06): During an attack by this card, I used its [All Turns] effect to have it and an opponent's Digimon battle, and my opponent's Digimon was deleted in battle. Then, if the attack target successfully becomes an opponent's Digimon and it's also deleted in battle, do I use this card's <Piercing> to perform 2 security checks?
      A: No, you only perform 1 security check for <Piercing>. Only 1 security check can be performed during a single attack, even if <Piercing> activates multiple times. However, if the number of security checks is modified by <Security A.>, that number of cards will be checked in a single security check.
    Q5958 (2026-03-06): During an attack by this card, I used its [All Turns] effect to have it and an opponent's Digimon battle, and my opponent's Digimon was deleted in battle. Then, if the attack target successfully becomes an opponent's Digimon, it loses the battle, but an effect prevents it from being deleted, can I still activate this card's <Piercing>?
      A: Yes, you can. <Piercing> is an effect that triggers and activates if an opponent's Digimon is deleted in battle during the attack, and it's processed immediately before the end of attack timing. <Piercing> will still trigger if the Digimon with <Piercing> successfully attacks a Digimon, even if another battle occurs during this battle.
    Q5959 (2026-02-06): A Digimon other than this card attacks, I used this card's [All Turns] effect to have this card and an opponent's Digimon battle, and my opponent's Digimon was deleted in battle. At such times, does this card's <Piercing> trigger?
      A: No, it doesn't trigger. <Piercing> will only trigger if this card deletes an opponent's Digimon in battle during this card's attack.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements cost reduction breeding area" --limit 3`

```text
[glossary] Actions  (11.995)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …

[manual §5] Official Rule Manual  (11.326)
  …effects, the DigiXros declaration comes after such effects.) cards in the hand and/or battle area according to the DigiXros requirements. At the same time, the desired cards to be placed under the card to be played are chosen from the DigiXros! Shoutmon Hand Lv.Ч Shoutmon X4 BT10…

[glossary] Actions  (10.606)
  … battling Digimon/Security Digimon compare DP to determine a winner. Playing Paying a memory cost to place a Digimon card or Trainer card directly into the battle area. Hatching Drawing a card from the Digi-Egg deck during the Breeding Phase, and placing it face up in the breedin…
```
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion leave prevention timing" --limit 3`

```text
[comprehensive §15-16-4] [On Deletion]  (8.456)
  15-16-4. [On Deletion] 15-16-4-1. [On Deletion] is an effect timing where the effect is triggered at the point when the card with that effect is deleted.

[manual §13] Security  (7.656)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §3-1-3] Area Rules  (7.519)
  …-1-3-2. The number of cards in each area is public information. 3-1-3-3. When multiple cards leave an area at the same time and are then placed in a different area, they are all considered to leave and be placed at the same time rather than 1 card at a time. 3-1-3-4. When multipl…
```
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/EX11/EX11-074.ts`; triggers Static, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Suspend, Restrict, ModifyDP, SubTrigger, Unsuspend, Battle. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: const opponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
L7: const suspendedMine = { kind: "lastSuspendedIsMine", raw: "if this effect suspended your Digimon" };
L10: kind: "Suspend",
L11: target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 },
L12: optional: true,
L15: kind: "Restrict",
L20: duration: "untilOpponentTurnEnd",
L21: condition: suspendedMine,
L24: kind: "ModifyDP",
L27: duration: "untilOpponentTurnEnd",
L28: condition: suspendedMine,
L37: { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
L38: { trigger: "Static", actions: [], keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }] },
L39: { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
L40: { trigger: "WhenDigivolving", actions: suspendAndProtect },
L41: { trigger: "WhenAttacking", actions: suspendAndProtect },
L43: trigger: "AllTurns",
L44: frequency: "OncePerTurn",
L47: kind: "SubTrigger",
L49: sourceFilter: { controller: "any", kind: ["Digimon"] },
L51: { kind: "Unsuspend", target: self, optional: true },
L52: { kind: "Battle", attacker: self, defender: opponentDigimon, optional: true },
L60: digivolutionRequirement: [
L63: cost: 6,
L65: controllerControls: { kind: ["Tamer"], namesExact: ["Shoto Kazama"], min: 1 },
L70: registerIrCard("EX11-074", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT20-101 (Vortex Warriors/LIBERATOR/Bird Dragon), EX11-032 (Bird Dragon/Vortex Warriors/LIBERATOR), EX11-035 (Vortex Warriors/LIBERATOR/Bird Dragon), EX7-034 (Bird Dragon/Vortex Warriors/LIBERATOR). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/EX11/EX11-074.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("publishes the exact evolution, keywords, suspend windows, and All Turns OPT", () => {
L10: expect(compiled.digivolutionRequirement).toEqual([
L18: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L19: expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toMatchObject([
L25: expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
L37: expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
L53: it("Q5948-Q5954 rewards suspending your Digimon and filters opposing Digimon effects", async () => {
L55: const s = setupEngine(
L70: expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
L71: expect(observe(s.engine).hasKeyword(s.perm("source"), "Vortex")).toBe(true);
L72: expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
L75: await settle(() => s.perm("ally").isSuspended);
L77: expect(s.perm("source").currentDP).toBe(20000);
L78: expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
L83: expect(s.perm("source").currentDP).toBe(20000);
L88: expect(s.perm("source").currentDP).toBe(19000);
L91: it("Q5955-Q5959 unsuspends and directly battles without making a security check", async () => {
L92: const s = setupEngine(
L111: await settle(() => s.state.players[1]!.battleArea.length === 0);
L113: expect(s.perm("source").isSuspended).toBe(false);
L114: expect(s.state.players[1]!.security).toHaveLength(initialSecurity);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/EX11/EX11-074.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("EX11-074", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `f6b24221d Port EX11-074 to compiled IR`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.
