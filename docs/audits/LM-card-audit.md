# LM Card Audit Ledger

Audit date: 2026-08-25. Scope: all 62 committed LM catalog cards, audited one card at a time in ascending ID order from the AD1-integrated base. Exact catalog and KB evidence (`data/kb/errata.json` and `data/kb/qa.json` are authoritative over card text), clause-to-runtime/shared-primitive tracing, cross-card trait and realistic evolution-stack comparisons, and 373 focused tests across 62 isolated Vitest processes establish reproducible 10/10 evidence for every card. Collection-level affected-seam tests, typecheck, formatting, and diff gates are recorded in the completion commit and coordinator notification.

Errata check: the only LM card carrying an errata entry is LM-013 (2025-04-25 — "…at the end of your opponent's turn…" becomes "…at the NEXT end of your opponent's turn…"), which the rebuilt module implements through a `nextEndOfOpponentTurn` delayed effect. `node tools/kb/query.mjs card <id>` reports Q&A only, so the errata file was read directly for every id in the collection.

Catalog data gap: LM-014's committed `effectText` reads "Add 1 card with  or 1 Tamer card among them to the hand" — the keyword icon between "with" and "or" did not survive the card import, exactly as every other icon in this set is stripped (LM-004's ＜Blocker＞, LM-005's ＜Security Attack +1＞, LM-009's ＜Rush＞, and the ＜Draw 1＞ in LM-014's own inherited clause). The module reads it as ＜Draw 1＞ — the only icon this card itself names — and says so in a header comment; the reading is a single `tokens` edit away from any confirmed alternative.

## LM-001 — Siriusmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-001",
  "set": "LM",
  "nameEn": "Siriusmon",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 7,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Red",
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
    "Light Dragon"
  ],
  "effectText": "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] You may place 1 card with [Gammamon]&#160;in its text from your hand as this Digimon's bottom digivolution card. Then, delete 1 of your opponent's Digimon with 8000 DP or less. For each color in this Digimon's digivolution cards, add 1000 to this DP deletion effect's maximum.[All Turns] [Once Per Turn] When another Digimon is deleted, gain 1 memory.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "LM-001",
  "nameJp": "シリウスモン",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] You may place 1 card with [Gammamon]&#160;in its text from your hand as this Digimon's bottom digivolution card. Then, delete 1 of your opponent's Digimon with 8000 DP or less. For each color in this Digimon's digivolution cards, add 1000 to this DP deletion effect's maximum.[All Turns] [Once Per Turn] When another Digimon is deleted, gain 1 memory."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-001`

```text
LM-001 Siriusmon
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
   - `node tools/kb/query.mjs rules "stacked digivolution cards placement trash" --limit 3`

```text
[manual §1] Official Rule Manual  (8.505)
  …givolve: 0 from (ShineGreymon] by returning 1 [Marcus Damon] to hand At the end of the burst digivolution turn, trash this Digimon's top card In the case of the above burst digivolve requirements, by returning 1 Shine Greymon: Burst Mode 8113-020 3) [Marcus Damon] to the hand, 1 …

[comprehensive §4-7] Digivolution Cards  (8.087)
  4-7. Digivolution Cards 4-7-1. A digivolution card refers to a card placed under a Digimon. (For details, refer to 4-5 "Stacked Cards")4-6 4-7-2. When referencing digivolution card information, the information is referenced on cards that are treated as digivolution cards.

[comprehensive §4-6] Stacked Cards  (7.911)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-001.ts`; triggers Hand, Counter, OnPlay, WhenDigivolving, AllTurns; action/condition kinds PlaceUnder, CostModifier, Delete, SubTrigger, GainMemory. Clause-bearing lines:

```text
L13: import { registerIrCard } from "../../engine/effects/interpreter.js";
L17: trigger: "Hand",
L27: trigger: "Counter",
L37: trigger: "OnPlay",
L40: kind: "PlaceUnder",
L58: optional: true,
L61: kind: "CostModifier",
L78: kind: "Delete",
L82: kind: ["Digimon"],
L94: trigger: "WhenDigivolving",
L97: kind: "PlaceUnder",
L115: optional: true,
L118: kind: "CostModifier",
L135: kind: "Delete",
L139: kind: ["Digimon"],
L151: trigger: "AllTurns",
L154: kind: "SubTrigger",
L159: kind: ["Digimon"],
L163: kind: "GainMemory",
L169: frequency: "OncePerTurn",
L176: registerIrCard("LM-001", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-007 (Light Dragon), AD1-016 (Light Dragon), BT12-043 (Light Dragon), BT13-018 (Light Dragon). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-001.test.ts` contains 8 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L12: it("blast-digivolves from hand in the counter window without paying the cost", async () => {
L13: const s = setupEngine(
L25: expect(
L26: s.engine.applyIntent(1, {
L32: await settle();
L34: expect(
L35: s.engine.applyIntent(0, {
L42: await settle(() => s.perm("base").topCard?.cardId === "LM-001");
L44: expect(s.perm("base").topCard?.cardId).toBe("LM-001");
L45: expect(s.state.memory).toBe(3);
L48: it("deletes an 8000 DP Digimon on play with no digivolution cards to scale with", async () => {
L49: const s = setupEngine(
L58: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("siriusmon").instanceId })).toEqual({
L61: await settle(() => s.state.players[1]!.battleArea.length === 0);
L63: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L66: it("raises the deletion maximum by 1000 for each color in its digivolution cards", async () => {
L67: const s = setupEngine(
L76: s.engine.applyIntent(0, {
L81: await settle(() => s.state.players[1]!.battleArea.length === 0);
L83: expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-027", "BT1-045", "BT1-024"]);
L84: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L87: it("leaves a Digimon above the raised maximum alone", async () => {
L88: const s = setupEngine(
L97: s.engine.applyIntent(0, {
L102: await settle(() => s.state.pendingDecision === null);
L104: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L107: it("places a Gammamon-in-text card from hand as its own bottom digivolution card", async () => {
L108: const s = setupEngine(
L122: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("siriusmon").instanceId });
L123: await settle(() => s.state.players[0]!.hand.every((card) => card.cardId !== "LM-016"));
L126: expect(host.stack.map((card) => card.cardId)).toEqual(["LM-016"]);
L127: expect(s.perm("decoy").stack).toHaveLength(0);
L130: it("leaves the hand untouched when the optional placement is declined", async () => {
L131: const s = setupEngine(
L144: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("siriusmon").instanceId });
L145: await settle(() => s.state.pendingDecision === null);
L147: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-016")).toBe(true);
L150: it("gains one memory the first time another Digimon is deleted each turn", async () => {
L151: const s = setupEngine(
L172: s.engine.applyIntent(0, {
L177: await settle(() => s.state.players[1]!.battleArea.length === 1, 2000);
L178: expect(s.state.memory).toBe(2);
L182: s.engine.applyIntent(0, {
L187: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L188: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L189: expect(s.state.memory).toBe(memoryAfterFirst);
L192: it("matches committed metadata and publishes fully covered compiled IR", () => {
L195: expect(definition?.nameEn).toBe("Siriusmon");
L196: expect(definition?.level).toBe(6);
L197: expect(definition?.dp).toBe(12000);
L198: expect(definition?.overflowMemory).toBe(4);
L199: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-001.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-001", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-002 — Jellymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-002",
  "set": "LM",
  "nameEn": "Jellymon",
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
    "Mollusk"
  ],
  "effectText": "[Start of Your Main Phase] If you have 7 or fewer cards in your hand,  (Draw 1 card from your deck).",
  "inheritedEffectText": "[When Attacking] If you have 7 or fewer cards in your hand,  (Draw 1 card from your deck).",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-002",
  "nameJp": "ジェリーモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If you have 7 or fewer cards in your hand,  (Draw 1 card from your deck)."
   - Inherited: "[When Attacking] If you have 7 or fewer cards in your hand,  (Draw 1 card from your deck)."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-002`

```text
LM-002 Jellymon
  Q&A (2):
    Q3989 (2024-03-28): If there are 7 cards in my hand and I have 2 of this Digimon at the start of my main phase, can I draw a total of 2 cards from both instances of this card's effect?
      A: No, you can't. At the start of your main phase, the [Start of Your Main Phase] effect on 2 of this Digimon simultaneously trigger, then the player determines the activation order. However, because your hand increases to 8 cards from <Draw 1> on the 1st Digimon, the effect's conditions aren't met for the 2nd Digimon, so the effect doesn't activate. As a result, you only draw 1 card.
    Q3990 (2024-03-28): If I have 7 cards in my hand upon an attack by my Digimon with 2 of this card in its digivolution cards, can I draw a total of 2 cards from both instances of this card's effect?
      A: No, you can't. Upon the attack declaration, the inherited effects on the 2 copies of this card simultaneously trigger, then the player determines the activation order. However, because your hand increases to 8 cards from <Draw 1> on the 1st card, the effect's conditions aren't met for the 2nd card, so the effect doesn't activate. As a result, you only draw 1 card.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-002.ts`; triggers StartOfYourMainPhase, WhenAttacking; action/condition kinds Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "StartOfYourMainPhase",
L16: kind: "Draw",
L19: condition: {
L20: kind: "zoneCount",
L31: trigger: "WhenAttacking",
L34: kind: "Draw",
L37: condition: {
L38: kind: "zoneCount",
L54: registerIrCard("LM-002", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT11-063 (Mollusk), BT13-023 (Mollusk), BT13-026 (Mollusk), BT14-022 (Mollusk). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-002.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("draws at the start of its owner's main phase with seven cards in hand", async () => {
L12: const s = setupEngine(
L22: expect(s.state.players[0]!.hand).toHaveLength(8);
L25: it("does not draw with eight cards in hand", async () => {
L26: const s = setupEngine(
L36: expect(s.state.players[0]!.hand).toHaveLength(8);
L39: it("stays silent on the opponent's main phase", async () => {
L40: const s = setupEngine(
L50: expect(s.state.players[0]!.hand).toHaveLength(7);
L53: it("draws only once from two copies at exactly seven cards, per Q3989", async () => {
L54: const s = setupEngine(
L73: expect(s.state.players[0]!.hand).toHaveLength(8);
L76: it("draws from the inherited clause when a Digimon carrying it attacks", async () => {
L77: const s = setupEngine(
L90: expect(
L91: s.engine.applyIntent(0, {
L97: await settle(() => s.state.players[0]!.hand.length >= 8, 2000);
L99: expect(s.state.players[0]!.hand.length).toBeGreaterThanOrEqual(8);
L102: it("matches committed metadata and publishes fully covered compiled IR", () => {
L105: expect(definition?.nameEn).toBe("Jellymon");
L106: expect(definition?.level).toBe(3);
L107: expect(definition?.dp).toBe(1000);
L108: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L109: expect(compiled?.effects.some((effect) => effect.isInherited === true)).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-002.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-002", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `81c3af4dc fix(LM-002): implement the missing inherited draw clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-003 — TeslaJellymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-003",
  "set": "LM",
  "nameEn": "TeslaJellymon",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 4,
  "dp": 4000,
  "evoCosts": [
    {
      "color": "Blue",
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
    "Mollusk"
  ],
  "effectText": "[When Attacking] By trashing 1 blue card in your hand, this Digimon can't be deleted in battle for the turn.",
  "inheritedEffectText": "[When Attacking] If you have 7 or fewer cards in your hand,  (Draw 1 card from your deck).",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-003",
  "nameJp": "テスラジェリーモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Attacking] By trashing 1 blue card in your hand, this Digimon can't be deleted in battle for the turn."
   - Inherited: "[When Attacking] If you have 7 or fewer cards in your hand,  (Draw 1 card from your deck)."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-003`

```text
LM-003 TeslaJellymon
  Q&A (3):
    Q3991 (2024-03-28): Does this card's [When Attacking] effect prevent deletion in battles against Security Digimon?
      A: Yes, it is not deleted.
    Q3992 (2024-03-28): Does this card's [When Attacking] effect prevent deletion even when my opponent's deleted Digimon has <Retaliation>?
      A: No. Deletion by <Retaliation> is deletion by an effect, not deletion in battle.
    Q3993 (2024-03-28): If I have 7 cards in my hand upon an attack by my Digimon with 2 of this card in its digivolution cards, can I draw a total of 2 cards from both instances of this card's effect?
      A: No, you can't. Upon the attack declaration, the inherited effects on the 2 copies of this card simultaneously trigger, then the player determines the activation order. However, because your hand increases to 8 cards from <Draw 1> on the 1st card, the effect's conditions aren't met for the 2nd card, so the effect doesn't activate. As a result, you only draw 1 card.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-003.ts`; triggers WhenAttacking; action/condition kinds Restrict, Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenAttacking",
L14: kind: "Restrict",
L23: duration: "forTheTurn",
L24: cost: {
L25: kind: "trash",
L36: optional: true,
L37: abortOnDecline: true,
L42: trigger: "WhenAttacking",
L45: kind: "Draw",
L48: condition: {
L49: kind: "zoneCount",
L65: registerIrCard("LM-003", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT11-063 (Mollusk), BT13-023 (Mollusk), BT13-026 (Mollusk), BT14-022 (Mollusk). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-003.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("trashes a blue card to survive a losing battle for the turn", async () => {
L10: const s = setupEngine(
L19: expect(
L20: s.engine.applyIntent(0, {
L26: await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId));
L28: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId)).toBe(true);
L29: expect(
L34: it("is deleted when the optional trash cost is declined", async () => {
L35: const s = setupEngine(
L45: s.engine.applyIntent(0, {
L50: await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 2000);
L52: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
L53: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId)).toBe(false);
L56: it("cannot pay the cost with a non-blue hand card, so the battle deletes it", async () => {
L57: const s = setupEngine(
L67: s.engine.applyIntent(0, {
L72: await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 2000);
L74: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
L75: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(false);
L78: it("survives a losing Security Digimon battle too, per Q3991", async () => {
L79: const s = setupEngine(
L90: s.engine.applyIntent(0, {
L95: await settle(() => s.state.players[1]!.security.length === 0, 2000);
L97: expect(observe(s.engine).isRestricted(attackerId, "beDeletedInBattle")).toBe(true);
L98: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
L101: it("draws from the inherited effect at seven cards", async () => {
L102: const s = setupEngine(
L115: expect(
L116: s.engine.applyIntent(0, {
L122: await settle(() => s.state.players[0]!.hand.length === 8);
L124: expect(s.state.players[0]!.hand).toHaveLength(8);
L127: it("matches committed metadata and publishes fully covered compiled IR", () => {
L130: expect(definition?.nameEn).toBe("TeslaJellymon");
L131: expect(definition?.dp).toBe(4000);
L132: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-003.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-003", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `4aa48042c fix(engine): honor battle-deletion protection in Security Digimon battles`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-004 — Thetismon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-004",
  "set": "LM",
  "nameEn": "Thetismon",
  "colors": [
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
      "color": "Blue",
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
    "Aquabeast"
  ],
  "effectText": "[On Play] [When Digivolving] By trashing 2 blue cards in your hand, unsuspend 1 of your Digimon and 1 of your [Kiyoshiro Higashimitarai], and this Digimon gains  (At blocker timing, by suspending this Digimon, it becomes the attack target) until the end of your opponent's turn.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When a card with [Jellymon]&#160;in its text is trashed from your hand, you may unsuspend this Digimon.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-004",
  "nameJp": "テティスモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] By trashing 2 blue cards in your hand, unsuspend 1 of your Digimon and 1 of your [Kiyoshiro Higashimitarai], and this Digimon gains  (At blocker timing, by suspending this Digimon, it becomes the attack target) until the end of your opponent's turn."
   - Inherited: "[All Turns] [Once Per Turn] When a card with [Jellymon]&#160;in its text is trashed from your hand, you may unsuspend this Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-004`

```text
LM-004 Thetismon
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-004.ts`; triggers OnPlay, WhenDigivolving, AllTurns; action/condition kinds Unsuspend, GainKeyword, SubTrigger. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L6: kind: "trash" as const,
L12: kind: "Unsuspend" as const,
L13: target: { filter: { controller: "mine" as const, kind: ["Digimon" as const], suspended: true }, count: 1 },
L14: cost: trashTwoBlue,
L15: optional: true,
L16: abortOnDecline: true,
L19: kind: "Unsuspend" as const,
L23: kind: ["Tamer" as const],
L31: kind: "GainKeyword" as const,
L34: duration: "untilOpponentTurnEnd" as const,
L40: { trigger: "OnPlay", actions: entranceActions },
L41: { trigger: "WhenDigivolving", actions: entranceActions },
L43: trigger: "AllTurns",
L45: frequency: "OncePerTurn",
L48: kind: "SubTrigger",
L52: actions: [{ kind: "Unsuspend", target: self, optional: true }],
L61: registerIrCard("LM-004", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT10-023 (Aquabeast), BT12-027 (Aquabeast), BT13-028 (Aquabeast), BT14-027 (Aquabeast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-004.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L21: it("trashes exactly two blue cards to unsuspend a Digimon and Kiyoshiro and gain Blocker", async () => {
L22: const s = setupEngine(entranceBoard, { autoAcceptOptional: true, autoSelectCards: true });
L25: await settle(() => !s.perm("digimon").isSuspended && !s.perm("kiyoshiro").isSuspended);
L27: expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-027")).toHaveLength(2);
L28: expect(s.perm("digimon").isSuspended).toBe(false);
L29: expect(s.perm("kiyoshiro").isSuspended).toBe(false);
L30: expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(true);
L33: it("does the same on the When Digivolving timing", async () => {
L34: const s = setupEngine(entranceBoard, { autoAcceptOptional: true, autoSelectCards: true });
L37: await settle(() => !s.perm("digimon").isSuspended);
L39: expect(s.perm("digimon").isSuspended).toBe(false);
L40: expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(true);
L43: it("leaves the board untouched when the trash cost is declined", async () => {
L44: const s = setupEngine(entranceBoard, { autoDeclineOptional: true, autoSelectCards: true });
L47: await settle(() => s.state.pendingDecision === null);
L49: expect(s.state.players[0]!.trash).toHaveLength(0);
L50: expect(s.perm("digimon").isSuspended).toBe(true);
L51: expect(s.perm("kiyoshiro").isSuspended).toBe(true);
L52: expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(false);
L55: it("unsuspends the host once per turn when a Jellymon-text card is trashed from hand", async () => {
L56: const s = setupEngine(
L70: await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
L75: await settle(() => !s.perm("host").isSuspended);
L76: expect(s.perm("host").isSuspended).toBe(false);
L79: await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
L84: await settle(() => s.state.pendingDecision === null);
L85: expect(s.perm("host").isSuspended).toBe(true);
L88: it("ignores a hand-trashed card with no Jellymon in its text", async () => {
L89: const s = setupEngine(
L100: await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
L105: await settle(() => s.state.pendingDecision === null);
L107: expect(s.perm("host").isSuspended).toBe(true);
L110: it("matches committed metadata and publishes fully covered compiled IR", () => {
L113: expect(definition?.nameEn).toBe("Thetismon");
L114: expect(definition?.dp).toBe(7000);
L115: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L116: expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-004.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-004", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-005 — Amphimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-005",
  "set": "LM",
  "nameEn": "Amphimon",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 6,
  "dp": 11000,
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
    "Cyborg"
  ],
  "effectText": "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] You may trash up to 4 blue cards in your hand. For each one, trash any 1 card under your opponent's Digimon or Tamers. Then, return 1 of their Digimon or Tamers without cards under it to the hand.[When Attacking] By returning 3 cards with [Jellymon]&#160;in their texts from your trash to the bottom of the deck, this Digimon gains  (This Digimon checks 1 additional security card) for the turn.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "LM-005",
  "nameJp": "アンフィモン",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] You may trash up to 4 blue cards in your hand. For each one, trash any 1 card under your opponent's Digimon or Tamers. Then, return 1 of their Digimon or Tamers without cards under it to the hand.[When Attacking] By returning 3 cards with [Jellymon]&#160;in their texts from your trash to the bottom of the deck, this Digimon gains  (This Digimon checks 1 additional security card) for the turn."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-005`

```text
LM-005 Amphimon
  Q&A (2):
    Q3994 (2024-03-28): If I trash 2 blue cards in my hand, can I use this card's [When Digivolving] [When Attacking] effect to trash 1 card under each of 2 of my opponent's Digimon/Tamers?
      A: Yes, you can.
    Q3995 (2024-03-28): If this card's [When Attacking] effect activates once from an attack, then this Digimon is unsuspended by an effect, attacks again, and the effect activates again in the same turn, does this Digimon gain 2 total instances of <Security A. +1>, resulting in 2 additional security checks?
      A: Yes, that's correct.
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
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-005.ts`; triggers Counter, OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds TrashDigivolution, Return, GainKeyword. Clause-bearing lines:

```text
L17: import { registerIrCard } from "../../engine/effects/interpreter.js";
L22: trigger: "Counter",
L33: trigger: "OnPlay",
L36: kind: "TrashDigivolution",
L41: kind: ["Digimon", "Tamer"],
L46: optional: true,
L47: cost: {
L48: kind: "trash",
L68: kind: "Return",
L72: kind: ["Digimon", "Tamer"],
L82: trigger: "WhenDigivolving",
L85: kind: "TrashDigivolution",
L90: kind: ["Digimon", "Tamer"],
L95: optional: true,
L96: cost: {
L97: kind: "trash",
L117: kind: "Return",
L121: kind: ["Digimon", "Tamer"],
L131: trigger: "WhenAttacking",
L134: kind: "GainKeyword",
L147: duration: "forTheTurn",
L148: cost: {
L149: kind: "return",
L167: optional: true,
L168: abortOnDecline: true,
L177: registerIrCard("LM-005", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-003 (Cyborg), AD1-009 (Cyborg), AD1-013 (Cyborg), AD1-014 (Cyborg). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-005.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("blast-digivolves from hand in the counter window without paying the cost", async () => {
L11: const s = setupEngine(
L21: s.engine.applyIntent(1, {
L26: await settle();
L28: expect(
L29: s.engine.applyIntent(0, {
L36: await settle(() => s.perm("base").topCard?.cardId === "LM-005");
L38: expect(s.perm("base").topCard?.cardId).toBe("LM-005");
L39: expect(s.state.memory).toBe(2);
L42: it("trashes one card under each of two opposing permanents for two blue cards, per Q3994", async () => {
L43: const s = setupEngine(
L64: await settle(() => s.state.players[1]!.trash.length === 2, 2000);
L67: expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-029")).toHaveLength(2);
L68: expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-027", "BT1-045"]);
L71: it("returns an opposing permanent with no cards under it to the hand", async () => {
L72: const s = setupEngine(
L82: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L84: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L85: expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-080")).toBe(true);
L88: it("leaves a stacked opposing permanent in play when nothing was trashed from under it", async () => {
L89: const s = setupEngine(
L99: await settle(() => s.state.pendingDecision === null);
L101: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L102: expect(s.perm("stacked").stack).toHaveLength(1);
L105: it("returns three Jellymon-text cards from trash for Security Attack +1", async () => {
L106: const s = setupEngine(
L120: await settle(() => s.state.players[0]!.trash.length === 0, 2000);
L122: expect(s.state.players[0]!.trash).toHaveLength(0);
L123: expect(s.state.players[0]!.deck).toHaveLength(4);
L124: expect(observe(s.engine).keywordAmount(s.perm("amphimon"), "SecurityAttack")).toBe(1);
L127: it("stacks a second Security Attack +1 when it attacks again in the same turn, per Q3995", async () => {
L128: const s = setupEngine(
L143: await settle(() => s.state.players[0]!.trash.length === 0, 2000);
L145: expect(observe(s.engine).keywordAmount(s.perm("amphimon"), "SecurityAttack")).toBe(2);
L148: it("matches committed metadata and publishes fully covered compiled IR", () => {
L151: expect(definition?.nameEn).toBe("Amphimon");
L152: expect(definition?.dp).toBe(11000);
L153: expect(definition?.isAce).toBe(true);
L154: expect(definition?.overflowMemory).toBe(4);
L155: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-005.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-005", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `2954d9d45 fix(LM-005): trash cards under opposing permanents and register Blast Digivolve`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-006 — Cthyllamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-006",
  "set": "LM",
  "nameEn": "Cthyllamon",
  "colors": [
    "Blue",
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 11000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 5,
      "memoryCost": 3
    },
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
    "Fairy"
  ],
  "effectText": "[Trash] [Main] By returning 1 of your Tamers to the bottom of the deck, play this card with the play cost reduced by the play cost of the returned Tamer.[On Play] [When Digivolving] Trash the bottom 3 digivolution cards of 1 of your opponent's Digimon. Then, until the end of their turn, none of their Digimon with no digivolution cards can attack.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "LM-006",
  "nameJp": "クティーラモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[Trash] [Main] By returning 1 of your Tamers to the bottom of the deck, play this card with the play cost reduced by the play cost of the returned Tamer.[On Play] [When Digivolving] Trash the bottom 3 digivolution cards of 1 of your opponent's Digimon. Then, until the end of their turn, none of their Digimon with no digivolution cards can attack."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-006`

```text
LM-006 Cthyllamon
  Q&A (1):
    Q3996 (2024-03-28): My opponent activated this card's [On Play] [When Digivolving] effect. If my Digimon without digivolution cards then gains digivolution cards by digivolving or other method, can it now attack?
      A: Yes, it can now attack. This card's [On Play] [When Digivolving] effect targets "none of their Digimon with no digivolution cards," therefore Digimon that no longer meet the conditions can no longer be effect targets.
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
   - `node tools/kb/query.mjs rules "stacked digivolution cards placement trash" --limit 3`

```text
[manual §1] Official Rule Manual  (8.505)
  …givolve: 0 from (ShineGreymon] by returning 1 [Marcus Damon] to hand At the end of the burst digivolution turn, trash this Digimon's top card In the case of the above burst digivolve requirements, by returning 1 Shine Greymon: Burst Mode 8113-020 3) [Marcus Damon] to the hand, 1 …

[comprehensive §4-7] Digivolution Cards  (8.087)
  4-7. Digivolution Cards 4-7-1. A digivolution card refers to a card placed under a Digimon. (For details, refer to 4-5 "Stacked Cards")4-6 4-7-2. When referencing digivolution card information, the information is referenced on cards that are treated as digivolution cards.

[comprehensive §4-6] Stacked Cards  (7.911)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-006.ts`; triggers Main, OnPlay, WhenDigivolving; action/condition kinds PlayWithoutCost, TrashDigivolution, Restrict. Clause-bearing lines:

```text
L15: import { registerIrCard } from "../../engine/effects/interpreter.js";
L20: trigger: "Main",
L23: kind: "PlayWithoutCost",
L38: cost: {
L39: kind: "return",
L43: kind: ["Tamer"],
L51: optional: true,
L52: abortOnDecline: true,
L58: trigger: "OnPlay",
L61: kind: "TrashDigivolution",
L65: kind: ["Digimon"],
L74: kind: "Restrict",
L79: kind: ["Digimon"],
L84: duration: "untilOpponentTurnEnd",
L90: trigger: "WhenDigivolving",
L93: kind: "TrashDigivolution",
L97: kind: ["Digimon"],
L106: kind: "Restrict",
L111: kind: ["Digimon"],
L116: duration: "untilOpponentTurnEnd",
L126: registerIrCard("LM-006", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-047 (Fairy), BT1-056 (Fairy), BT1-059 (Fairy), BT1-079 (Fairy). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-006.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("plays itself from the trash for its cost minus the returned Tamer's play cost", async () => {
L11: const s = setupEngine(
L27: await settle(() => mainPhase.isOpen);
L31: expect(effects).toHaveLength(1);
L32: expect(
L33: s.engine.applyIntent(0, {
L39: await settle(() =>
L46: expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT9-086");
L47: expect(s.state.memory).toBe(0);
L51: it("trashes the bottom three digivolution cards of one opposing Digimon", async () => {
L52: const s = setupEngine(
L64: await settle(() => s.perm("stacked").stack.length === 1, 2000);
L67: expect(s.perm("stacked").stack.map((card) => card.cardId)).toEqual(["BT1-047"]);
L68: expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-027", "BT1-028", "BT1-045"]);
L71: it("stops every opposing Digimon with no digivolution cards from attacking", async () => {
L72: const s = setupEngine(
L88: await settle(() => observe(s.engine).isRestricted(s.perm("bareA").permanentId, "attack"), 2000);
L90: expect(observe(s.engine).isRestricted(s.perm("bareA").permanentId, "attack")).toBe(true);
L91: expect(observe(s.engine).isRestricted(s.perm("bareB").permanentId, "attack")).toBe(true);
L92: expect(observe(s.engine).isRestricted(s.perm("stacked").permanentId, "attack")).toBe(false);
L95: it("releases a Digimon that gains digivolution cards afterwards, per Q3996", async () => {
L96: const s = setupEngine(
L109: await settle(() => observe(s.engine).isRestricted(s.perm("bare").permanentId, "attack"), 2000);
L110: expect(observe(s.engine).isRestricted(s.perm("bare").permanentId, "attack")).toBe(true);
L117: expect(observe(s.engine).isRestricted(s.perm("bare").permanentId, "attack")).toBe(false);
L120: it("matches committed metadata and publishes fully covered compiled IR", () => {
L123: expect(definition?.nameEn).toBe("Cthyllamon");
L124: expect(definition?.playCost).toBe(11);
L125: expect(definition?.colors).toEqual(["Blue", "Purple"]);
L126: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-006.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-006", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-007 — Publimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-007",
  "set": "LM",
  "nameEn": "Publimon",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 6,
  "dp": 5000,
  "evoCosts": [
    {
      "color": "Yellow",
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
    "Mutant"
  ],
  "effectText": "[Security] At the end of the battle, play this card without paying the cost.[End of Attack] Place this Digimon on top of your security stack.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "LM-007",
  "nameJp": "パブリモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[Security] At the end of the battle, play this card without paying the cost.[End of Attack] Place this Digimon on top of your security stack."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-007`

```text
LM-007 Publimon
  Q&A (1):
    Q3997 (2024-03-28): Do I have to activate this card's [End of Attack] effect?
      A: Yes. If this Digimon is in the battle area at the end of an attack, you must activate the effect.
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
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-007.ts`; triggers Security, EndOfAttack; action/condition kinds PlayWithoutCost, SecurityManipulation. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L14: trigger: "Security",
L17: kind: "PlayWithoutCost",
L30: trigger: "EndOfAttack",
L33: kind: "SecurityManipulation",
L52: registerIrCard("LM-007", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT10-075 (Mutant), BT11-043 (Mutant), BT11-050 (Mutant), BT11-068 (Mutant). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-007.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("plays itself from security for free when it is checked, then returns on top of security", async () => {
L10: const s = setupEngine(
L20: expect(
L21: s.engine.applyIntent(0, {
L27: await settle(() => s.events.some((event) => event.kind === "effectResolved"), 3000);
L31: expect(s.events.map((event) => event.kind)).toContain("cardPlayed");
L32: expect(s.state.players[1]!.trash).toHaveLength(0);
L33: expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["LM-007"]);
L34: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L37: it("places itself on top of its owner's security stack at the end of an attack", async () => {
L38: const s = setupEngine(
L47: await settle(() => s.state.players[0]!.security.length === 2, 2000);
L49: expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["LM-007", "BT1-027"]);
L50: expect(s.state.players[0]!.battleArea).toHaveLength(0);
L53: it("is mandatory at the end of an attack even when every prompt is declined, per Q3997", async () => {
L54: const s = setupEngine(
L63: await settle(() => s.state.players[0]!.security.length === 2, 2000);
L65: expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["LM-007", "BT1-027"]);
L68: it("matches committed metadata and publishes fully covered compiled IR", () => {
L71: expect(definition?.nameEn).toBe("Publimon");
L72: expect(definition?.dp).toBe(5000);
L73: expect(definition?.playCost).toBe(6);
L74: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L75: expect(compiled?.effects.map((effect) => effect.trigger)).toEqual(["Security", "EndOfAttack"]);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-007.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-007", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fc93c4664 test(LM): prove Publimon and Angoramon behavior through the engine`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-008 — Angoramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-008",
  "set": "LM",
  "nameEn": "Angoramon",
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
    "Vaccine"
  ],
  "types": [
    "Beast"
  ],
  "effectText": "[Start of Your Main Phase] If you have a Tamer, gain 1 memory.",
  "inheritedEffectText": "[Your Turn] While this Digimon has [Angoramon]&#160;in its text, it gets +2000 DP.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-008",
  "nameJp": "アンゴラモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If you have a Tamer, gain 1 memory."
   - Inherited: "[Your Turn] While this Digimon has [Angoramon]&#160;in its text, it gets +2000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-008`

```text
LM-008 Angoramon
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-008.ts`; triggers StartOfYourMainPhase, YourTurn; action/condition kinds GainMemory, Aura. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L16: condition: {
L17: kind: "youHave",
L20: kind: ["Tamer"],
L28: trigger: "YourTurn",
L31: kind: "Aura",
L40: kind: "modifyDP",
L44: kind: "selfTopHasText",
L57: registerIrCard("LM-008", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-010 (Beast), BT1-031 (Beast), BT1-036 (Beast), BT1-049 (Beast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-008.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine } from "../../engine/testkit/harness.js";
L9: it("gains 1 memory at the start of its owner's main phase while a Tamer is in play", async () => {
L10: const s = setupEngine(
L26: expect(s.state.memory).toBe(1);
L29: it("gains nothing without a Tamer", async () => {
L30: const s = setupEngine(
L39: expect(s.state.memory).toBe(0);
L42: it("stays silent on the opponent's main phase", async () => {
L43: const s = setupEngine(
L59: expect(s.state.memory).toBe(0);
L62: it("grants +2000 DP on your turn to a host whose text mentions Angoramon", async () => {
L63: const s = setupEngine(
L73: expect(s.perm("host").currentDP).toBe(printed + 2000);
L76: it("grants nothing to a host with no Angoramon in its text", async () => {
L77: const s = setupEngine(
L86: expect(s.perm("host").currentDP).toBe(getCardDefinition("BT1-024")!.dp);
L89: it("grants nothing on the opponent's turn", async () => {
L90: const s = setupEngine(
L100: expect(s.perm("host").currentDP).toBe(getCardDefinition("LM-011")!.dp);
L103: it("matches committed metadata and publishes fully covered compiled IR", () => {
L106: expect(definition?.nameEn).toBe("Angoramon");
L107: expect(definition?.dp).toBe(1000);
L108: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L109: expect(compiled?.effects.find((effect) => effect.isInherited)).toBeDefined();
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-008.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-008", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fc93c4664 test(LM): prove Publimon and Angoramon behavior through the engine`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-009 — Airdramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-009",
  "set": "LM",
  "nameEn": "Airdramon",
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
    "Vaccine"
  ],
  "types": [
    "Mythical Beast"
  ],
  "effectText": "[Your Turn] When a card with [Angoramon]&#160;in its text would be played or one of your Digimon would digivolve into such a card, by suspending this Digimon, reduce the play or digivolution cost by 2.[Your Turn] When this Digimon becomes suspended, 1 of your Digimon with [Angoramon]&#160;in its text gains  (This Digimon can attack the turn it comes into play) for the turn.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-009",
  "nameJp": "エアドラモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[Your Turn] When a card with [Angoramon]&#160;in its text would be played or one of your Digimon would digivolve into such a card, by suspending this Digimon, reduce the play or digivolution cost by 2.[Your Turn] When this Digimon becomes suspended, 1 of your Digimon with [Angoramon]&#160;in its text gains  (This Digimon can attack the turn it comes into play) for the turn."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-009`

```text
LM-009 Airdramon
  Q&A (2):
    Q3998 (2024-03-28): Can I use this card's [Your Turn] effect to reduce the digivolution cost by 2 when my Digimon with [Angoramon] in its text would digivolve into a Digimon card without [Angoramon] in its text?
      A: No, you can't. The digivolution cost is only reduced by 2 when it would digivolve into a card with [Angoramon] in its text.
    Q3999 (2024-03-28): When this Digimon would digivolve into a Digimon card with the [Angoramon] in its text, I used this card's effect to suspend this Digimon and reduce the digivolution cost by 2. At such times, can I use this card's "when this Digimon becomes suspended" effect to give this Digimon <Rush>?
      A: No, you can't. As soon as the digivolution is complete, this card becomes a digivolution card, and its effects can no longer activate.
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-009.ts`; triggers YourTurn; action/condition kinds Replacement, SubTrigger, GainKeyword. Clause-bearing lines:

```text
L14: import { registerIrCard } from "../../engine/effects/interpreter.js";
L21: kind: "suspend",
L29: trigger: "YourTurn",
L32: kind: "Replacement",
L40: kind: "Replacement",
L44: cost: suspendSelf,
L45: optional: true,
L46: abortOnDecline: true,
L52: kind: "Replacement",
L56: kind: ["Digimon"],
L58: into: { controllerDefault: "mine", kind: ["Digimon"], ...angoramonText },
L61: kind: "Replacement",
L65: cost: suspendSelf,
L66: optional: true,
L67: abortOnDecline: true,
L75: trigger: "YourTurn",
L78: kind: "SubTrigger",
L83: kind: "GainKeyword",
L87: kind: ["Digimon"],
L93: duration: "forTheTurn",
L104: registerIrCard("LM-009", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT10-055 (Mythical Beast), BT10-074 (Mythical Beast), BT14-035 (Mythical Beast), BT15-059 (Mythical Beast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-009.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("suspends itself to reduce an Angoramon-text card's play cost by 2", async () => {
L11: const s = setupEngine(
L20: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("symbare").instanceId })).toEqual({
L23: await settle(() => s.perm("airdramon").isSuspended, 2000);
L26: expect(s.perm("airdramon").isSuspended).toBe(true);
L27: expect(s.state.memory).toBe(2);
L30: it("leaves a card with no Angoramon in its text at full price", async () => {
L31: const s = setupEngine(
L40: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chamblemon").instanceId });
L41: await settle(() => s.state.pendingDecision === null);
L43: expect(s.perm("airdramon").isSuspended).toBe(false);
L44: expect(s.state.memory).toBe(0);
L47: it("reduces the digivolution cost only when the destination has Angoramon in its text", async () => {
L48: const s = setupEngine(
L63: expect(
L64: s.engine.applyIntent(0, {
L70: await settle(() => s.perm("base").topCard?.cardId === "LM-011", 2000);
L73: expect(s.perm("airdramon").isSuspended).toBe(true);
L74: expect(s.state.memory).toBe(2);
L77: it("does not reduce a digivolution into a card with no Angoramon in its text, per Q3998", async () => {
L78: const s = setupEngine(
L93: expect(
L94: s.engine.applyIntent(0, {
L100: await settle(() => s.perm("base").topCard?.cardId === "LM-010", 2000);
L102: expect(s.perm("airdramon").isSuspended).toBe(false);
L103: expect(s.state.memory).toBe(0);
L106: it("grants Rush to an Angoramon-text Digimon when it becomes suspended", async () => {
L108: const s = setupEngine(
L125: expect(
L126: s.engine.applyIntent(0, {
L132: await settle(() => observe(s.engine).hasKeyword(s.perm("symbare"), "Rush"), 3000);
L134: expect(s.perm("airdramon").isSuspended).toBe(true);
L135: expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Rush")).toBe(true);
L138: it("cannot grant Rush from the suspension that paid for its own digivolution, per Q3999", async () => {
L139: const s = setupEngine(
L154: s.engine.applyIntent(0, {
L159: await settle(() => s.perm("airdramon").topCard?.cardId === "LM-012", 2000);
L161: expect(s.perm("airdramon").topCard?.cardId).toBe("LM-012");
L162: expect(observe(s.engine).hasKeyword(basePermanentId, "Rush")).toBe(false);
L165: it("matches committed metadata and publishes fully covered compiled IR", () => {
L168: expect(definition?.nameEn).toBe("Airdramon");
L169: expect(definition?.dp).toBe(4000);
L170: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-009.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-009", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-010 — Chamblemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-010",
  "set": "LM",
  "nameEn": "Chamblemon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 3000,
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
    "Vegetation"
  ],
  "effectText": "[On Play] Suspend 1 Tamer. None of your opponent's Tamers can unsuspend until the end of their turn.[All Turns] For each suspended Tamer, this Digimon gets +1000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "LM-010",
  "nameJp": "シャンブルモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] Suspend 1 Tamer. None of your opponent's Tamers can unsuspend until the end of their turn.[All Turns] For each suspended Tamer, this Digimon gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-010`

```text
LM-010 Chamblemon
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-010.ts`; triggers OnPlay, AllTurns; action/condition kinds Suspend, Restrict, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L16: trigger: "OnPlay",
L19: kind: "Suspend",
L23: kind: ["Tamer"],
L29: kind: "Restrict",
L33: kind: ["Tamer"],
L38: duration: "untilOpponentTurnEnd",
L44: trigger: "AllTurns",
L47: kind: "ModifyDP",
L56: duration: "permanent",
L62: kind: ["Tamer"],
L74: registerIrCard("LM-010", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-065 (Vegetation), BT1-067 (Vegetation), BT1-072 (Vegetation), BT1-074 (Vegetation). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-010.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("suspends a Tamer and locks every opposing Tamer from unsuspending", async () => {
L12: const s = setupEngine(
L28: await settle(() => s.perm("oppTamer").isSuspended, 2000);
L30: expect(s.perm("oppTamer").isSuspended).toBe(true);
L31: expect(observe(s.engine).isRestricted(s.perm("oppTamer").permanentId, "unsuspend")).toBe(true);
L32: expect(observe(s.engine).isRestricted(s.perm("otherTamer").permanentId, "unsuspend")).toBe(true);
L35: it("leaves the controller's own Tamers free to unsuspend", async () => {
L36: const s = setupEngine(
L50: await settle(() => s.perm("myTamer").isSuspended, 2000);
L52: expect(s.perm("myTamer").isSuspended).toBe(true);
L53: expect(observe(s.engine).isRestricted(s.perm("myTamer").permanentId, "unsuspend")).toBe(false);
L56: it("locks an opposing Tamer that arrives after the effect resolved", async () => {
L57: const s = setupEngine(
L66: await settle(() => observe(s.engine).isRestricted(s.perm("oppTamer").permanentId, "unsuspend"), 2000);
L71: expect(observe(s.engine).isRestricted(late.permanentId, "unsuspend")).toBe(true);
L74: it("gets +1000 DP for each suspended Tamer on either side", async () => {
L75: const s = setupEngine(
L92: expect(s.perm("chamblemon").currentDP).toBe(5000);
L95: it("keeps its printed DP with no suspended Tamer anywhere", async () => {
L96: const s = setupEngine(
L110: expect(s.perm("chamblemon").currentDP).toBe(3000);
L113: it("matches committed metadata and publishes fully covered compiled IR", () => {
L116: expect(definition?.nameEn).toBe("Chamblemon");
L117: expect(definition?.dp).toBe(3000);
L118: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-010.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-010", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `0e9783a38 fix(LM-009,LM-010): correct Angoramon cost reduction and Tamer lock scoping`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-011 — SymbareAngoramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-011",
  "set": "LM",
  "nameEn": "SymbareAngoramon",
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
    "Vaccine"
  ],
  "types": [
    "Beastkin"
  ],
  "effectText": "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no unsuspended Digimon, 1 of your Digimon gains (At blocker timing, by suspending this Digimon, it becomes the attack target) until the end of your opponent's turn.",
  "inheritedEffectText": "[Your Turn] While this Digimon has [Angoramon]&#160;in its text, it gets +2000 DP.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-011",
  "nameJp": "ジンバーアンゴラモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no unsuspended Digimon, 1 of your Digimon gains (At blocker timing, by suspending this Digimon, it becomes the attack target) until the end of your opponent's turn."
   - Inherited: "[Your Turn] While this Digimon has [Angoramon]&#160;in its text, it gets +2000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-011`

```text
LM-011 SymbareAngoramon
  Q&A (1):
    Q4000 (2024-03-28): Can this card's [On Play] [When Digivolving] effect give 1 on my Digimon <Blocker> even when my opponent has no Digimon?
      A: Yes, it can.
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-011.ts`; triggers OnPlay, WhenDigivolving, YourTurn; action/condition kinds Suspend, GainKeyword, Aura. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "OnPlay",
L11: kind: "Suspend",
L15: kind: ["Digimon"],
L21: kind: "GainKeyword",
L25: kind: ["Digimon"],
L33: duration: "untilOpponentTurnEnd",
L34: condition: {
L35: kind: "opponentHasNone",
L38: kind: ["Digimon"],
L47: trigger: "WhenDigivolving",
L50: kind: "Suspend",
L54: kind: ["Digimon"],
L60: kind: "GainKeyword",
L64: kind: ["Digimon"],
L72: duration: "untilOpponentTurnEnd",
L73: condition: {
L74: kind: "opponentHasNone",
L77: kind: ["Digimon"],
L86: trigger: "YourTurn",
L89: kind: "Aura",
L98: kind: "modifyDP",
L102: kind: "selfTopHasText",
L117: registerIrCard("LM-011", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-035 (Beastkin), BT1-037 (Beastkin), BT1-040 (Beastkin), BT10-031 (Beastkin). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-011.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("suspends the opponent's only Digimon and hands out Blocker", async () => {
L11: const s = setupEngine(
L21: await settle(() => s.perm("victim").isSuspended, 2000);
L23: expect(s.perm("victim").isSuspended).toBe(true);
L24: expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker")).toBe(true);
L27: it("withholds Blocker while the opponent still has an unsuspended Digimon", async () => {
L28: const s = setupEngine(
L43: await settle(() => s.state.pendingDecision === null);
L45: expect(s.state.players[1]!.battleArea.filter((permanent) => !permanent.isSuspended)).toHaveLength(1);
L46: expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker")).toBe(false);
L49: it("still grants Blocker when the opponent has no Digimon at all, per Q4000", async () => {
L50: const s = setupEngine(
L60: await settle(() => observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker"), 2000);
L62: expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker")).toBe(true);
L65: it("can hand the Blocker grant to another of the controller's Digimon", async () => {
L67: const s = setupEngine(
L83: await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"), 2000);
L85: expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
L88: it("grants its inherited +2000 DP on your turn to an Angoramon-text host", async () => {
L89: const s = setupEngine(
L96: expect(s.perm("host").currentDP).toBe(getCardDefinition("LM-013")!.dp! + 2000);
L99: it("matches committed metadata and publishes fully covered compiled IR", () => {
L102: expect(definition?.nameEn).toBe("SymbareAngoramon");
L103: expect(definition?.dp).toBe(5000);
L104: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-011.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-011", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `0e9783a38 fix(LM-009,LM-010): correct Angoramon cost reduction and Tamer lock scoping`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-012 — Lamortmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-012",
  "set": "LM",
  "nameEn": "Lamortmon",
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
    "Vaccine"
  ],
  "types": [
    "Beast"
  ],
  "effectText": "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no unsuspended Digimon, 1 of their Digimon can't unsuspend until the end of their turn.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When one of your Digimon with [Angoramon] in their texts deletes an opponent's Digimon in battle, trash the top card of their security stack.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-012",
  "nameJp": "ラモールモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no unsuspended Digimon, 1 of their Digimon can't unsuspend until the end of their turn."
   - Inherited: "[All Turns] [Once Per Turn] When one of your Digimon with [Angoramon] in their texts deletes an opponent's Digimon in battle, trash the top card of their security stack."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-012`

```text
LM-012 Lamortmon
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-012.ts`; triggers OnPlay, WhenDigivolving, AllTurns; action/condition kinds Suspend, Restrict, SubTrigger, SecurityManipulation. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Suspend",
L18: kind: ["Digimon"],
L24: kind: "Restrict",
L28: kind: ["Digimon"],
L33: duration: "untilOpponentTurnEnd",
L34: condition: {
L35: kind: "opponentHasNone",
L36: filter: { kind: ["Digimon"], unsuspended: true },
L43: trigger: "WhenDigivolving",
L46: kind: "Suspend",
L50: kind: ["Digimon"],
L56: kind: "Restrict",
L60: kind: ["Digimon"],
L65: duration: "untilOpponentTurnEnd",
L66: condition: {
L67: kind: "opponentHasNone",
L68: filter: { kind: ["Digimon"], unsuspended: true },
L75: trigger: "AllTurns",
L78: kind: "SubTrigger",
L82: kind: ["Digimon"],
L87: kind: "SecurityManipulation",
L96: frequency: "OncePerTurn",
L103: registerIrCard("LM-012", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-010 (Beast), BT1-031 (Beast), BT1-036 (Beast), BT1-049 (Beast). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-012.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("suspends the last opposing Digimon and locks it down for the turn", async () => {
L11: const s = setupEngine(
L20: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lamortmon").instanceId })).toEqual({
L23: await settle(() => observe(s.engine).isRestricted(s.perm("target").permanentId, "unsuspend"), 2000);
L25: expect(s.perm("target").isSuspended).toBe(true);
L26: expect(observe(s.engine).isRestricted(s.perm("target").permanentId, "unsuspend")).toBe(true);
L29: it("skips the lock while the opponent keeps an unsuspended Digimon", async () => {
L31: const s = setupEngine(
L47: await settle(() => s.perm("victim").isSuspended, 2000);
L49: expect(s.perm("victim").isSuspended).toBe(true);
L50: expect(observe(s.engine).isRestricted(s.perm("victim").permanentId, "unsuspend")).toBe(false);
L51: expect(observe(s.engine).isRestricted(s.perm("survivor").permanentId, "unsuspend")).toBe(false);
L54: it("trashes the opponent's top security card once per turn when an Angoramon-text host wins a battle", async () => {
L55: const s = setupEngine(
L75: s.engine.applyIntent(0, {
L80: await settle(() => s.state.players[1]!.security.length === 2, 3000);
L81: expect(s.state.players[1]!.security).toHaveLength(2);
L85: s.engine.applyIntent(0, {
L90: await settle(() => s.state.players[1]!.battleArea.length === 0, 3000);
L92: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L93: expect(s.state.players[1]!.security).toHaveLength(2);
L96: it("stays silent when the winning Digimon has no Angoramon in its text", async () => {
L97: const s = setupEngine(
L109: s.engine.applyIntent(0, {
L114: await settle(() => s.state.players[1]!.battleArea.length === 0, 3000);
L116: expect(s.state.players[1]!.security).toHaveLength(3);
L119: it("matches committed metadata and publishes fully covered compiled IR", () => {
L122: expect(definition?.nameEn).toBe("Lamortmon");
L123: expect(definition?.dp).toBe(8000);
L124: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L125: expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-012.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-012", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-013 — Diarbbitmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-013",
  "set": "LM",
  "nameEn": "Diarbbitmon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 6,
  "dp": 11000,
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
    "Vaccine"
  ],
  "types": [
    "Beast Knight"
  ],
  "effectText": "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no unsuspended Digimon, gain 2 memory.[When Attacking] You may play 1 Digimon card with [Angoramon]&#160;in its text from your hand without paying the cost. At the end of your opponent's turn, return that Digimon to the hand.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "LM-013",
  "nameJp": "ディルビットモン",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no unsuspended Digimon, gain 2 memory.[When Attacking] You may play 1 Digimon card with [Angoramon]&#160;in its text from your hand without paying the cost. At the end of your opponent's turn, return that Digimon to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-013`

```text
LM-013 Diarbbitmon
  Q&A (1):
    Q4001 (2024-03-28): I used this card's [When Attacking] effect to play a Digimon card with [Angoramon] in its text. What happens if it digivolves and has a card on top of it at the end of my opponent's turn?
      A: The top card is returned to the hand and all of the cards under it are trashed.
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-013.ts`; triggers Counter, OnPlay, WhenDigivolving, WhenAttacking, nextEndOfOpponentTurn; action/condition kinds Suspend, GainMemory, PlayWithoutCost, DelayedEffect, Return. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L26: trigger: "Counter",
L37: trigger: "OnPlay",
L40: kind: "Suspend",
L44: kind: ["Digimon"],
L50: kind: "GainMemory",
L52: condition: {
L53: kind: "opponentHasNone",
L56: kind: ["Digimon"],
L65: trigger: "WhenDigivolving",
L68: kind: "Suspend",
L72: kind: ["Digimon"],
L78: kind: "GainMemory",
L80: condition: {
L81: kind: "opponentHasNone",
L84: kind: ["Digimon"],
L98: trigger: "WhenAttacking",
L101: kind: "PlayWithoutCost",
L105: kind: ["Digimon"],
L112: optional: true,
L116: kind: "DelayedEffect",
L118: kind: "Return",
L128: trigger: "nextEndOfOpponentTurn",
L137: registerIrCard("LM-013", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-012 (Beast Knight), BT11-033 (Beast Knight), BT13-031 (Beast Knight), BT13-033 (Beast Knight). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-013.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("suspends the last opposing Digimon and gains 2 memory", async () => {
L10: const s = setupEngine(
L19: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("diarbbitmon").instanceId })).toEqual({
L22: await settle(() => s.state.memory === 8, 2000);
L24: expect(s.perm("target").isSuspended).toBe(true);
L25: expect(s.state.memory).toBe(8);
L28: it("gains nothing while an unsuspended opposing Digimon remains", async () => {
L30: const s = setupEngine(
L47: await settle(() => s.perm("victim").isSuspended, 2000);
L49: expect(s.perm("victim").isSuspended).toBe(true);
L50: expect(s.state.memory).toBe(0);
L53: it("blast-digivolves from hand in the counter window without paying the cost", async () => {
L54: const s = setupEngine(
L71: s.engine.applyIntent(1, {
L76: await settle();
L78: expect(
L79: s.engine.applyIntent(0, {
L86: await settle(() => s.perm("base").topCard?.cardId === "LM-013");
L88: expect(s.perm("base").topCard?.cardId).toBe("LM-013");
L89: expect(s.state.memory).toBe(2);
L92: it("plays an Angoramon-text Digimon from hand for free when attacking", async () => {
L93: const s = setupEngine(
L107: await settle(
L112: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-011")).toBe(true);
L113: expect(s.state.memory).toBe(0);
L116: it("returns the played Digimon to hand at the next end of the opponent's turn, trashing its stack", async () => {
L117: const s = setupEngine(
L130: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-011"), 2000);
L140: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-011"), 2000);
L142: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-011")).toBe(true);
L143: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-011")).toBe(false);
L144: expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-008")).toBe(true);
L147: it("matches committed metadata and publishes fully covered compiled IR", () => {
L150: expect(definition?.nameEn).toBe("Diarbbitmon");
L151: expect(definition?.dp).toBe(11000);
L152: expect(definition?.isAce).toBe(true);
L153: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-013.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-013", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-014 — Espimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-014",
  "set": "LM",
  "nameEn": "Espimon",
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
    "Cyborg"
  ],
  "effectText": "[On Play] Reveal the top 3 cards of your deck. Add 1 card with  or 1 Tamer card among them to the hand. Return the rest to the bottom of the deck.",
  "inheritedEffectText": "[Opponent's Turn] [Once Per Turn] When the attack target is switched,  (Draw 1 card from your deck).",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "LM-014",
  "nameJp": "エスピモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] Reveal the top 3 cards of your deck. Add 1 card with  or 1 Tamer card among them to the hand. Return the rest to the bottom of the deck."
   - Inherited: "[Opponent's Turn] [Once Per Turn] When the attack target is switched,  (Draw 1 card from your deck)."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-014`

```text
LM-014 Espimon
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-014.ts`; triggers OnPlay, OpponentsTurn; action/condition kinds RevealAdd, SubTrigger, Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L16: trigger: "OnPlay",
L19: kind: "RevealAdd",
L30: kind: ["Tamer"],
L42: trigger: "OpponentsTurn",
L45: kind: "SubTrigger",
L49: kind: "Draw",
L57: frequency: "OncePerTurn",
L64: registerIrCard("LM-014", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-003 (Cyborg), AD1-009 (Cyborg), AD1-013 (Cyborg), AD1-014 (Cyborg). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-014.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("reveals three, adds a revealed Tamer and bottoms the rest", async () => {
L10: const s = setupEngine(
L21: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("espimon").instanceId })).toEqual({
L24: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-020"), 2000);
L26: expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-020")).toBe(true);
L27: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-020", "BT1-024"]);
L30: it("adds nothing when the three revealed cards are neither Tamers nor Draw cards", async () => {
L31: const s = setupEngine(
L42: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("espimon").instanceId });
L43: await settle(() => s.state.pendingDecision === null);
L45: expect(s.state.players[0]!.hand).toHaveLength(0);
L46: expect(s.state.players[0]!.deck).toHaveLength(3);
L49: it("draws once per opponent turn when the attack target is switched", async () => {
L50: const s = setupEngine(
L62: await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
L63: await settle(() => s.state.players[0]!.hand.length === 1, 2000);
L64: expect(s.state.players[0]!.hand).toHaveLength(1);
L66: await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
L67: await settle(() => s.state.pendingDecision === null);
L68: expect(s.state.players[0]!.hand).toHaveLength(1);
L71: it("stays silent on its controller's own turn", async () => {
L72: const s = setupEngine(
L84: await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
L85: await settle(() => s.state.pendingDecision === null);
L87: expect(s.state.players[0]!.hand).toHaveLength(0);
L90: it("matches committed metadata and publishes fully covered compiled IR", () => {
L93: expect(definition?.nameEn).toBe("Espimon");
L94: expect(definition?.dp).toBe(1000);
L95: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L96: expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-014.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-014", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `e1c23d858 fix(LM-016): limit the trash digivolution to effect deletions`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-015 — Ryudamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-015",
  "set": "LM",
  "nameEn": "Ryudamon",
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
    "Vaccine"
  ],
  "types": [
    "Beast",
    "X Antibody"
  ],
  "effectText": "[When Attacking] If you have a Tamer, this Digimon may digivolve into [Ginryumon] in your hand without paying the cost.",
  "inheritedEffectText": "[Your Turn] While this Digimon has the [X Antibody]&#160;trait, it gets +1000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "LM-015",
  "nameJp": "リュウダモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Attacking] If you have a Tamer, this Digimon may digivolve into [Ginryumon] in your hand without paying the cost."
   - Inherited: "[Your Turn] While this Digimon has the [X Antibody]&#160;trait, it gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-015`

```text
LM-015 Ryudamon
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-015.ts`; triggers WhenAttacking, YourTurn; action/condition kinds Digivolve, Aura. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenAttacking",
L14: kind: "Digivolve",
L33: optional: true,
L34: condition: {
L35: kind: "youHave",
L38: kind: ["Tamer"],
L46: trigger: "YourTurn",
L49: kind: "Aura",
L58: kind: "modifyDP",
L62: kind: "selfHasTrait",
L75: registerIrCard("LM-015", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT13-063 (Beast/X Antibody), BT15-056 (Beast/X Antibody), BT16-038 (Beast/X Antibody), BT16-051 (Beast/X Antibody). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-015.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("digivolves into Ginryumon from hand when attacking while its owner has a Tamer", async () => {
L10: const s = setupEngine(
L25: expect(
L26: s.engine.applyIntent(0, {
L32: await settle(() => s.perm("ryudamon").topCard?.cardId === "BT15-058", 2000);
L34: expect(s.perm("ryudamon").topCard?.cardId).toBe("BT15-058");
L35: expect(s.state.memory).toBe(0);
L38: it("does nothing without a Tamer", async () => {
L39: const s = setupEngine(
L51: s.engine.applyIntent(0, {
L56: await settle(() => s.state.pendingDecision === null);
L58: expect(s.perm("ryudamon").topCard?.cardId).toBe("LM-015");
L59: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT15-058")).toBe(true);
L62: it("stays put when the optional digivolution is declined", async () => {
L63: const s = setupEngine(
L78: s.engine.applyIntent(0, {
L83: await settle(() => s.state.pendingDecision === null);
L85: expect(s.perm("ryudamon").topCard?.cardId).toBe("LM-015");
L88: it("grants its inherited +1000 DP on your turn to an X Antibody host", async () => {
L89: const s = setupEngine(
L97: expect(s.perm("host").currentDP).toBe(getCardDefinition("BT15-058")!.dp! + 1000);
L100: it("withholds the inherited bonus from a host with no X Antibody trait", async () => {
L101: const s = setupEngine(
L109: expect(s.perm("host").currentDP).toBe(getCardDefinition("BT1-024")!.dp);
L112: it("withholds the inherited bonus on the opponent's turn", async () => {
L113: const s = setupEngine(
L121: expect(s.perm("host").currentDP).toBe(getCardDefinition("BT15-058")!.dp);
L124: it("matches committed metadata and publishes fully covered compiled IR", () => {
L127: expect(definition?.nameEn).toBe("Ryudamon");
L128: expect(definition?.types).toEqual(["Beast", "X Antibody"]);
L129: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-015.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-015", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `e1c23d858 fix(LM-016): limit the trash digivolution to effect deletions`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-016 — Gammamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-016",
  "set": "LM",
  "nameEn": "Gammamon",
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
    "Virus"
  ],
  "types": [
    "Ceratopsian"
  ],
  "effectText": "[All Turns] [Once Per Turn] When an effect deletes one of your other Digimon, this Digimon may digivolve into a Digimon card with [Gammamon]&#160;in its text in your trash without paying the cost.",
  "inheritedEffectText": "[On Deletion] You may play 1 [Hiro Amanokawa] from your hand without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "LM-016",
  "nameJp": "ガンマモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[All Turns] [Once Per Turn] When an effect deletes one of your other Digimon, this Digimon may digivolve into a Digimon card with [Gammamon]&#160;in its text in your trash without paying the cost."
   - Inherited: "[On Deletion] You may play 1 [Hiro Amanokawa] from your hand without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-016`

```text
LM-016 Gammamon
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
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-016.ts`; triggers AllTurns, OnDeletion; action/condition kinds SubTrigger, Digivolve, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "AllTurns",
L15: kind: "SubTrigger",
L20: kind: ["Digimon"],
L27: kind: "Digivolve",
L37: kind: ["Digimon"],
L47: optional: true,
L52: frequency: "OncePerTurn",
L55: trigger: "OnDeletion",
L58: kind: "PlayWithoutCost",
L73: optional: true,
L83: registerIrCard("LM-016", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT10-050 (Ceratopsian), BT14-016 (Ceratopsian), BT21-010 (Ceratopsian), BT22-045 (Ceratopsian). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-016.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("digivolves for free out of the trash when an effect deletes another of your Digimon", async () => {
L10: const s = setupEngine(
L26: await settle(() => s.perm("gammamon").topCard?.cardId === "BT10-078", 2000);
L28: expect(s.perm("gammamon").topCard?.cardId).toBe("BT10-078");
L29: expect(s.state.memory).toBe(0);
L32: it("stays put when the deletion came from battle rather than an effect", async () => {
L33: const s = setupEngine(
L48: await settle(() => s.state.pendingDecision === null);
L50: expect(s.perm("gammamon").topCard?.cardId).toBe("LM-016");
L53: it("does not react to its own deletion", async () => {
L54: const s = setupEngine(
L67: await settle(() => s.state.pendingDecision === null);
L69: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === gammamonId)).toBe(false);
L72: it("plays Hiro Amanokawa from hand when the inherited Gammamon effect is deleted", async () => {
L73: const s = setupEngine(
L84: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT21-080"));
L86: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT21-080")).toBe(true);
L89: it("leaves Hiro in hand when the inherited play is declined", async () => {
L90: const s = setupEngine(
L101: await settle(() => s.state.pendingDecision === null);
L103: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-080")).toBe(true);
L106: it("matches committed metadata and publishes fully covered compiled IR", () => {
L109: expect(definition?.nameEn).toBe("Gammamon");
L110: expect(definition?.colors).toEqual(["Purple"]);
L111: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L112: expect(compiled?.effects[0]).toMatchObject({ frequency: "OncePerTurn" });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-016.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-016", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `e1c23d858 fix(LM-016): limit the trash digivolution to effect deletions`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-017 — Regulusmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-017",
  "set": "LM",
  "nameEn": "Regulusmon",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 5,
  "dp": 10000,
  "evoCosts": [
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
    "Virus"
  ],
  "types": [
    "Evil Dragon"
  ],
  "effectText": "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] Trash 1 card in your hand. Then, you may place 1 card with [Gammamon]&#160;in its text from your trash as this Digimon's bottom digivolution card.[All Turns] [Once Per Turn] When an effect adds digivolution cards to this Digimon, by deleting 1 level 4 or lower Digimon, you may play 1 level 4 or lower Digimon card from your trash without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "LM-017",
  "nameJp": "レグルスモン",
  "isAce": true,
  "overflowMemory": 3
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Counter]  (Your Digimon may digivolve into this card without paying the cost).[On Play] [When Digivolving] Trash 1 card in your hand. Then, you may place 1 card with [Gammamon]&#160;in its text from your trash as this Digimon's bottom digivolution card.[All Turns] [Once Per Turn] When an effect adds digivolution cards to this Digimon, by deleting 1 level 4 or lower Digimon, you may play 1 level 4 or lower Digimon card from your trash without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-017`

```text
LM-017 Regulusmon
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
   - `node tools/kb/query.mjs rules "stacked digivolution cards placement trash" --limit 3`

```text
[manual §1] Official Rule Manual  (8.505)
  …givolve: 0 from (ShineGreymon] by returning 1 [Marcus Damon] to hand At the end of the burst digivolution turn, trash this Digimon's top card In the case of the above burst digivolve requirements, by returning 1 Shine Greymon: Burst Mode 8113-020 3) [Marcus Damon] to the hand, 1 …

[comprehensive §4-7] Digivolution Cards  (8.087)
  4-7. Digivolution Cards 4-7-1. A digivolution card refers to a card placed under a Digimon. (For details, refer to 4-5 "Stacked Cards")4-6 4-7-2. When referencing digivolution card information, the information is referenced on cards that are treated as digivolution cards.

[comprehensive §4-6] Stacked Cards  (7.911)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-017.ts`; triggers Counter, OnPlay, WhenDigivolving, AllTurns; action/condition kinds Trash, PlaceUnder, SubTrigger, PlayWithoutCost. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L4: const levelFourOrLower = { kind: ["Digimon" as const], levelComparison: { op: "lte" as const, value: 4 } };
L7: kind: "Trash" as const,
L11: kind: "PlaceUnder" as const,
L24: optional: true,
L31: trigger: "Counter",
L36: { trigger: "OnPlay", actions: entranceActions },
L37: { trigger: "WhenDigivolving", actions: entranceActions },
L39: trigger: "AllTurns",
L40: frequency: "OncePerTurn",
L43: kind: "SubTrigger",
L49: kind: "PlayWithoutCost",
L56: optional: true,
L57: abortOnDecline: true,
L58: cost: {
L59: kind: "deleteOwn",
L75: registerIrCard("LM-017", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT11-079 (Evil Dragon), BT20-077 (Evil Dragon), BT21-077 (Evil Dragon), BT21-079 (Evil Dragon). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-017.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("trashes a hand card and places a Gammamon-text trash card under itself, bottom-most", async () => {
L10: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulusmon").instanceId })).toEqual({
L27: await settle(
L33: expect(host.stack.map((card) => card.cardId)).toEqual(["LM-016"]);
L34: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
L37: it("places the trash card beneath an existing digivolution stack", async () => {
L38: const s = setupEngine(
L51: await settle(() => s.perm("regulusmon").stack.length === 2, 2000);
L53: expect(s.perm("regulusmon").stack.map((card) => card.cardId)).toEqual(["LM-016", "BT1-024"]);
L56: it("deletes a level 4 or lower Digimon to play one from trash after gaining a source", async () => {
L57: const s = setupEngine(
L71: await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
L75: await settle(
L80: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
L81: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-016")).toBe(true);
L84: it("spends the source-add reaction only once per turn", async () => {
L85: const s = setupEngine(
L100: await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
L104: await settle(() => s.state.players[0]!.trash.length === 1, 2000);
L107: await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
L111: await settle(() => s.state.pendingDecision === null);
L113: expect(s.state.players[0]!.battleArea).toHaveLength(afterFirst);
L116: it("registers the Blast Digivolve keyword marker", () => {
L118: expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
L124: it("matches committed metadata and publishes fully covered compiled IR", () => {
L127: expect(definition?.nameEn).toBe("Regulusmon");
L128: expect(definition?.isAce).toBe(true);
L129: expect(definition?.overflowMemory).toBe(3);
L130: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-017.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-017", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `8188e9056 fix(LM-017,LM-018): correct placement position and unpossessed targets`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-018 — Gyuukimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-018",
  "set": "LM",
  "nameEn": "Gyuukimon",
  "colors": [
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
      "color": "Purple",
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
    "Dark Animal"
  ],
  "effectText": "[On Play] Delete 1 level 4 or lower Digimon. If you did, you may play 1 [Gyuukimon] Token without paying the cost (Digimon/Cost 7/Lv.5/Purple/Ultimate/Virus/Dark Animal/3000 DP).",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "LM-018",
  "nameJp": "ギュウキモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] Delete 1 level 4 or lower Digimon. If you did, you may play 1 [Gyuukimon] Token without paying the cost (Digimon/Cost 7/Lv.5/Purple/Ultimate/Virus/Dark Animal/3000 DP)."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-018`

```text
LM-018 Gyuukimon
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-018.ts`; triggers OnPlay; action/condition kinds Delete, PlayToken. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "OnPlay",
L15: kind: "Delete",
L20: kind: ["Digimon"],
L30: kind: "PlayToken",
L34: condition: {
L35: kind: "ifThisEffectActed",
L38: optional: true,
L47: registerIrCard("LM-018", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-039 (Dark Animal), BT12-076 (Dark Animal), BT13-078 (Dark Animal), BT14-071 (Dark Animal). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-018.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("deletes an opposing level-4 Digimon and plays its token when played", async () => {
L9: const s = setupEngine(
L18: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId })).toEqual({
L21: await settle(
L26: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L27: expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST1-06")).toBe(true);
L28: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(true);
L31: it("can take one of the controller's own level-4-or-lower Digimon", async () => {
L33: const s = setupEngine(
L45: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId });
L46: await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST1-06"), 2000);
L48: expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST1-06")).toBe(true);
L51: it("leaves a level-5 Digimon alone and plays no token", async () => {
L52: const s = setupEngine(
L61: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId });
L62: await settle(() => s.state.pendingDecision === null);
L64: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L65: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
L68: it("does not play the token when nothing was deleted", async () => {
L69: const s = setupEngine(
L75: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId })).toEqual({
L78: await settle(() => s.state.pendingDecision === null);
L80: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
L83: it("leaves the token unplayed when the optional play is declined", async () => {
L84: const s = setupEngine(
L93: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId });
L94: await settle(() => s.state.pendingDecision === null);
L96: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
L99: it("matches committed metadata and publishes fully covered compiled IR", () => {
L102: expect(definition?.nameEn).toBe("Gyuukimon");
L103: expect(definition?.dp).toBe(7000);
L104: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-018.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-018", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `8188e9056 fix(LM-017,LM-018): correct placement position and unpossessed targets`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-019 — Bokomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-019",
  "set": "LM",
  "nameEn": "Bokomon",
  "colors": [
    "White"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 2000,
  "evoCosts": [],
  "forms": [
    "Rookie"
  ],
  "attributes": [
    "Vaccine"
  ],
  "types": [
    "Mutant"
  ],
  "effectText": "[On Play] Reveal the top 4 cards of your deck. Add 1 card with [Gammamon]&#160;in its text among them to the hand. Return the rest to the bottom of the deck.[All Turns] When one of your Digimon with [Gammamon]&#160;in its text, other than [Bokomon], would leave the battle area other than by one of your effects, by deleting this Digimon, prevent it from leaving.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "LM-019",
  "nameJp": "ボコモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[On Play] Reveal the top 4 cards of your deck. Add 1 card with [Gammamon]&#160;in its text among them to the hand. Return the rest to the bottom of the deck.[All Turns] When one of your Digimon with [Gammamon]&#160;in its text, other than [Bokomon], would leave the battle area other than by one of your effects, by deleting this Digimon, prevent it from leaving."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-019`

```text
LM-019 Bokomon
  Q&A (1):
    Q4002 (2024-03-28): Can I use this card's [All Turns] effect to delete this Digimon and prevent my Digimon with [Gammamon] in its text from leaving the battle area when this Digimon and my Digimon with [Gammamon] would leave the battle area at the same time due to a single effect?
      A: Yes, you can.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-019.ts`; triggers OnPlay, AllTurns; action/condition kinds RevealAdd, Replacement. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L7: trigger: "OnPlay",
L10: kind: "RevealAdd",
L27: trigger: "AllTurns",
L30: kind: "Replacement",
L37: kind: ["Digimon"],
L43: cost: {
L44: kind: "deleteOwn",
L48: optional: true,
L58: registerIrCard("LM-019", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT10-075 (Mutant), BT11-043 (Mutant), BT11-050 (Mutant), BT11-068 (Mutant). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-019.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("reveals four cards and adds a Digimon with Gammamon in its text", async () => {
L10: const s = setupEngine(
L18: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({
L21: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007"), 2000);
L23: expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007")).toBe(true);
L24: expect(s.state.players[0]!.deck).toHaveLength(3);
L27: it("adds nothing when none of the four has Gammamon in its text", async () => {
L28: const s = setupEngine(
L36: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId });
L37: await settle(() => s.state.pendingDecision === null);
L39: expect(s.state.players[0]!.hand).toHaveLength(0);
L40: expect(s.state.players[0]!.deck).toHaveLength(4);
L43: it("deletes itself to prevent another Gammamon-text Digimon from leaving", async () => {
L44: const s = setupEngine(
L60: await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "LM-019"), 2000);
L62: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
L63: expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-019")).toBe(true);
L66: it("does not protect Bokomon itself", async () => {
L67: const s = setupEngine(
L83: await settle(() => s.state.pendingDecision === null);
L85: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherId)).toBe(false);
L88: it("declining the cost lets the Digimon leave", async () => {
L89: const s = setupEngine(
L105: await settle(() => s.state.pendingDecision === null);
L107: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(false);
L108: expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-019")).toBe(false);
L111: it("matches committed metadata and publishes fully covered compiled IR", () => {
L114: expect(definition?.nameEn).toBe("Bokomon");
L115: expect(definition?.colors).toEqual(["White"]);
L116: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L117: expect(compiled?.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-019.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-019", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `8188e9056 fix(LM-017,LM-018): correct placement position and unpossessed targets`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-020 — Quantumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-020",
  "set": "LM",
  "nameEn": "Quantumon",
  "colors": [
    "Yellow",
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
      "color": "Yellow",
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
    "Data"
  ],
  "types": [
    "Fairy"
  ],
  "effectText": "[When Digivolving] By placing 1 Digimon on top of its owner's security stack, reveal all of your opponent's security cards, and place 1 card among them on top of your opponent's deck. Shuffle the rest and return them to the security stack.[Start of Opponent's Turn] Declare 1 card category. Then, reveal the top card of your opponent's deck. If that card is of the declared category, this Digimon isn't affected by the effects of that card category for the turn. Return the revealed card to the top or the bottom of your opponent's deck.",
  "rarity": "UR",
  "maxCountInDeck": 4,
  "imageId": "LM-020",
  "nameJp": "クオンタモン"
}
```
2. **Exact printed surfaces:**
   - Main: "[When Digivolving] By placing 1 Digimon on top of its owner's security stack, reveal all of your opponent's security cards, and place 1 card among them on top of your opponent's deck. Shuffle the rest and return them to the security stack.[Start of Opponent's Turn] Declare 1 card category. Then, reveal the top card of your opponent's deck. If that card is of the declared category, this Digimon isn't affected by the effects of that card category for the turn. Return the revealed card to the top or the bottom of your opponent's deck."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-020`

```text
LM-020 Quantumon
  Q&A (10):
    Q2657 (2024-03-28): Can I choose my [LM-020 Quantumon] that isn't affected by Digimon effects as the target of this card's [When Digivolving] effect, then delete just my opponent's Digimon without deleting my [LM-020 Quantumon]?
      A: Yes, you can.
    Q4003 (2024-08-01): What does this card's [Start of Opponent's Turn] effect do, exactly? (*This card's [Start of Opponent's Turn] effect has been changed to "[Start of Opponent's Turn] Declare 1 card category. Then, reveal the top card of your opponent's deck. If that card is of the declared category, this Digimon isn't affected by the effects of that card category for the turn. Return the revealed card to the top or the bottom of your opponent's deck.")
      A: You choose and declare 1 card category. Then, you reveal the top card of your opponent's deck. If that card is of the declared category, this Digimon isn't affected by the effects of that card category for the turn. The revealed card is returned to the top or the bottom of your opponent's deck.
    Q4004 (2024-08-01): Can I use this card's [Start of Opponent's Turn] effect to declare a card category such as Digi-Egg cards that can't be placed in decks?
      A: Yes, you can.
    Q4005 (2024-08-01): I used this card's [Start of Opponent's Turn] effect to prevent Tamer effects from affecting this card. At such times, is this Digimon unaffected by inherited effects on Tamer cards in the digivolution cards of my opponent's Digimon?
      A: No, it's affected by such effects. Inherited effects are gained and activated by Digimon, therefore such effects are considered Digimon effects. In this case, inherited effects on Tamer cards in digivolution cards of Digimon are considered Digimon effects, therefore they will affect this card.
    Q4006 (2024-08-01): I used this card's [Start of Opponent's Turn] effect to prevent Digimon effects from affecting this card. At such times, does this card still gain the inherited effects on Digimon cards in its digivolution cards?
      A: Yes, it gains inherited effects.
    Q4007 (2024-08-01): I used this card's [Start of Opponent's Turn] effect to prevent Digimon effects from affecting this card. At such times, is this card no longer affected by effects on my other Digimon?
      A: Yes, it isn't affected. Effects activated by Security Digimon are considered Digimon effects.
    Q4008 (2024-03-28): Can I use this card's [When Digivolving] effect to return my [EX2-007 Mother D-Reaper] from the battle area to the security stack, reveal all cards in my opponent's security stack, and place 1 card among them at the top of my opponent's deck?
      A: Yes, you can. If your [EX2-007 Mother D-Reaper] is chosen as the target to place in the security stack, it will ultimately be placed at the bottom of the Digi-Egg deck instead of the security stack according to the rules, but it meets this card's "by placing 1 Digimon on top of its owner's security stack" condition. A card isn't actually added to the security stack, therefore effects such as "when a card is added to the security stack" don't trigger.
      related: EX2-007
    Q4009 (2024-03-28): Can I use this card's [When Digivolving] effect to return my token played as a Digimon from the battle area to the hand, reveal all cards in my opponent's security stack, and place 1 card among them at the top of my opponent's deck?
      A: Yes, you can. If your token is chosen as the target to place in the security stack, it will ultimately be removed from the game instead of being placed in the security stack according to the rules, but it meets this card's "by placing 1 Digimon on top of its owner's security stack" condition. A card isn't actually added to the security stack, therefore effects such as "when a card is added to the security stack" don't trigger.
    Q4010 (2024-03-28): If I choose my [EX2-007 Mother D-Reaper] or token that is treated as a Digimon in the battle area as the target for this card's [When Digivolving] effect, it isn't placed in the security stack. In such cases, do "when a card is removed from the security stack" effects trigger because a card wasn't added to the security stack even though it normally should have been added?
      A: No, it doesn’t trigger.
      related: EX2-007
    Q4011 (2024-08-01): I used this card's [Start of Opponent's Turn] effect to prevent Digimon effects from affecting this card. At such times, is this card no longer affected by effects on my other Digimon?
      A: Yes, it isn't affected.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-020.ts`; triggers WhenDigivolving, StartOfOpponentsTurn; action/condition kinds SecurityManipulation, DeclareCategoryImmunity. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: trigger: "WhenDigivolving",
L12: kind: "SecurityManipulation",
L17: source: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
L20: optional: true,
L21: abortOnDecline: true,
L24: kind: "SecurityManipulation",
L31: trigger: "StartOfOpponentsTurn",
L34: kind: "DeclareCategoryImmunity",
L37: duration: "forTheTurn",
L46: registerIrCard("LM-020", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-047 (Fairy), BT1-056 (Fairy), BT1-059 (Fairy), BT1-079 (Fairy). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-020.test.ts` contains 8 passing test(s); observable engine evidence is present. Evidence lines:

```text
L8: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L152: it("registers complete security-exchange and category-immunity IR", () => {
L154: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L155: expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
L162: expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.frequency).toBeUndefined();
L163: expect(compiled.effects.find((effect) => effect.trigger === "StartOfOpponentsTurn")?.actions).toEqual([
L168: it("publicly digivolves Quantumon and places an owned Digimon into security", async () => {
L169: const s = setupEngine(
L183: expect(
L184: s.engine.applyIntent(0, {
L190: await settle(
L196: expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-020")).toBe(true);
L197: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-020")).toBe(false);
L198: expect(s.state.players[1]!.security).toHaveLength(1);
L199: expect(s.state.players[1]!.deck).toHaveLength(1);
L202: it("still places the chosen Digimon when the opponent has no security cards", async () => {
L203: const s = setupEngine(
L211: expect(
L212: s.engine.applyIntent(0, {
L218: await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "LM-020"));
L219: expect(s.state.players[0]!.security.filter((card) => card.cardId === "LM-020")).toHaveLength(1);
L220: expect(s.state.players[1]!.security).toHaveLength(0);
L222: it("places a chosen opposing Digimon into that opponent's own security stack", async () => {
L224: const s = setupEngine(
L234: s.engine.applyIntent(0, {
L239: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L244: expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-016")).toBe(false);
L245: expect(
L253: it("is registered", () => {
L255: expect(module, "LM-020 must self-register on import").toBeDefined();
L263: it("StartOfOpponentsTurn clause produces at least one effect at OnStartTurn timing", () => {
L266: expect(effects.length).toBeGreaterThanOrEqual(1);
L271: it("WhenDigivolving timing has at least one effect (the digivolving clause)", () => {
L275: expect(effects.length).toBeGreaterThanOrEqual(1);
L285: it("WhenDigivolving: resolving the effect calls addSecurity (place Digimon to security), not trashFromSecurity", async () => {
L307: expect(effects.length).toBeGreaterThanOrEqual(1);
L314: expect(addCalls.length).toBeGreaterThanOrEqual(1);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-020.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-020", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `4add1faee fix(LM-020): drop the invented once-per-turn and honor the owner's stack`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-021 — Agumon - Bond of Bravery — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-021",
  "set": "LM",
  "nameEn": "Agumon - Bond of Bravery",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 7,
  "playCost": 8,
  "dp": 14000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 6,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Unknown"
  ],
  "types": [
    "Unknown"
  ],
  "effectText": "[Digivolve][Agumon] while you have 2 or fewer security cards: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Delete any number of your opponent’s Digimon whose total DP adds up to equal or less than this Digimon’s DP.\n[When Attacking] [Once Per Turn] If you have a Tamer, trash the top card of your opponent’s security stack.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-021",
  "isAce": true,
  "overflowMemory": 5
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve][Agumon] while you have 2 or fewer security cards: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Delete any number of your opponent’s Digimon whose total DP adds up to equal or less than this Digimon’s DP.\n[When Attacking] [Once Per Turn] If you have a Tamer, trash the top card of your opponent’s security stack."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-021`

```text
LM-021 Agumon - Bond of Bravery
  Q&A (7):
    Q4012 (2024-03-28): Is "[Digivolve] While you have 2 or fewer security cards, [Agumon]: Cost 3" a digivolution requirement added by an effect while I have 2 or fewer security cards?
      A: No, this is a standard digivolution requirement for a Digimon card. It references the number of your security cards, but it's not an effect.
    Q4013 (2024-03-28): Can I use <Blast Digivolve> to digivolve my [Agumon] into this card in the hand when I have 2 or fewer security cards and an opponent's Digimon attacks?
      A: Yes, you can. Digivolution is possible as long as you have 2 or fewer security cards when you use <Blast Digivolve>.
    Q4014 (2024-03-28): If an opponent's Digimon attacks when I have 2 or fewer security cards, then an effect adds a card to my security stack so my security stack has 3 or more cards when I use <Blast Digivolve>, can my [Agumon] digivolve into this card in the hand?
      A: No, it can't. Digivolution from [Agumon] isn't possible because the digivolution requirements aren't met when you use <Blast Digivolve>.
    Q4015 (2024-03-28): If an opponent's Digimon attacks when I have 3 security cards, then an effect removes a card from my security stack so my security stack has 2 or fewer cards when I use <Blast Digivolve>, can my [Agumon] digivolve into this card in the hand?
      A: Yes, it can. Digivolution from [Agumon] is possible as long as the digivolution requirements are met when you use <Blast Digivolve>.
    Q4016 (2024-03-28): If I use an effect such as P-103 [Offense Training]'s <Delay> that digivolves a Digimon, can my [Agumon] digivolve into this card in the hand when I have 2 or fewer security cards?
      A: Yes, it can.
      related: P-103
    Q4017 (2024-03-28): What does "[On Play] [When Digivolving] Delete your opponent's Digimon up to a total DP equal to this Digimon's DP" mean, exactly?
      A: This effect allows you to choose any number of your opponent's Digimon whose total DP adds up to the same as this Digimon's DP or less, then you delete all of them. For example, if this Digimon has 14000 DP when its [On Play] [When Digivolving] effect activates, you can choose any number of your opponent's Digimon whose DP adds up to a total of 14000 or less, such as 1 with 10000 DP and 1 with 4000 DP, or 2 of their Digimon with 7000 DP each, then you delete them.
    Q4018 (2024-03-28): Can I intentionally choose targets whose total DP adds up to a lower value than this Digimon's DP?
      A: Yes, you can choose any targets as long as their total DP adds up to a value less than or equal to this Digimon's DP. However, you must choose at least 1 of your opponent's Digimon whose total DP is equal to or less than this Digimon's DP.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-021.ts`; triggers Counter, OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds Delete, SecurityManipulation. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Counter",
L22: trigger: "OnPlay",
L25: kind: "Delete",
L29: kind: ["Digimon"],
L40: trigger: "WhenDigivolving",
L43: kind: "Delete",
L47: kind: ["Digimon"],
L58: trigger: "WhenAttacking",
L61: kind: "SecurityManipulation",
L65: condition: {
L66: kind: "youHave",
L69: kind: ["Tamer"],
L75: frequency: "OncePerTurn",
L80: digivolutionRequirement: [
L83: cost: 3,
L86: // `zoneCount` shape only; the previous `condition: { kind: "securityCountLte" }` was
L89: kind: "zoneCount",
L100: registerIrCard("LM-021", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT11-061 (Unknown), BT11-065 (Unknown), BT11-070 (Unknown), BT11-111 (Unknown). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-021.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("deletes opposing Digimon whose total DP fits inside its own DP, per Q4017", async () => {
L10: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
L25: await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"), 2000);
L27: expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(false);
L28: expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
L31: it("reads its LIVE DP for the budget, not the printed 14000", async () => {
L32: const s = setupEngine(
L42: await settle(() => s.state.pendingDecision === null);
L45: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L48: it("takes several Digimon whose DP adds up inside the budget", async () => {
L49: const s = setupEngine(
L64: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L66: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L69: it("offers the Agumon cost-3 path only at two or fewer security cards, per Q4014", async () => {
L78: const low = setupEngine(board(2), { autoDeclineOptional: true, autoSelectCards: true });
L81: expect(
L82: low.engine.applyIntent(0, {
L88: await settle(() => low.perm("agumon").topCard?.cardId === "LM-021", 2000);
L89: expect(low.state.memory).toBe(0);
L91: const high = setupEngine(board(3), { autoDeclineOptional: true, autoSelectCards: true });
L94: expect(
L95: high.engine.applyIntent(0, {
L103: it("trashes the opponent's top security once per turn while you have a Tamer", async () => {
L104: const s = setupEngine(
L119: await settle(() => s.state.players[1]!.security.length === 2, 2000);
L120: expect(s.state.players[1]!.security).toHaveLength(2);
L123: await settle(() => s.state.pendingDecision === null);
L124: expect(s.state.players[1]!.security).toHaveLength(2);
L127: it("trashes nothing without a Tamer", async () => {
L128: const s = setupEngine(
L138: await settle(() => s.state.pendingDecision === null);
L140: expect(s.state.players[1]!.security).toHaveLength(3);
L143: it("matches committed metadata and publishes fully covered compiled IR", () => {
L146: expect(definition?.nameEn).toBe("Agumon - Bond of Bravery");
L147: expect(definition?.level).toBe(7);
L148: expect(definition?.overflowMemory).toBe(5);
L149: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L150: expect(compiled?.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-021.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-021", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `190d2f9a4 fix(LM-021,LM-022): gate the Bond digivolve paths on the security count`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-022 — Gabumon - Bond of Friendship — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-022",
  "set": "LM",
  "nameEn": "Gabumon - Bond of Friendship",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 7,
  "playCost": 8,
  "dp": 14000,
  "evoCosts": [
    {
      "color": "Blue",
      "level": 6,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Unknown"
  ],
  "types": [
    "Unknown"
  ],
  "effectText": "[Digivolve][Gabumon] while you have 2 or fewer security cards: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Return 2 of your opponent’s Digimon with equal or fewer digivolution cards than this Digimon to the bottom of the deck.\n[When Attacking] [Once Per Turn] If you have a Tamer, unsuspend this Digimon.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-022",
  "isAce": true,
  "overflowMemory": 5
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve][Gabumon] while you have 2 or fewer security cards: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Return 2 of your opponent’s Digimon with equal or fewer digivolution cards than this Digimon to the bottom of the deck.\n[When Attacking] [Once Per Turn] If you have a Tamer, unsuspend this Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-022`

```text
LM-022 Gabumon - Bond of Friendship
  Q&A (5):
    Q4019 (2024-03-28): Is "[Digivolve] While you have 2 or fewer security cards, [Gabumon]: Cost 3" a digivolution requirement added by an effect while I have 2 or fewer security cards?
      A: No, this is a standard digivolution requirement for a Digimon card. It references the number of your security cards, but it's not an effect.
    Q4020 (2024-03-28): Can I use <Blast Digivolve> to digivolve my [Gabumon] into this card in the hand when I have 2 or fewer security cards and an opponent's Digimon attacks?
      A: Yes, you can. Digivolution is possible as long as you have 2 or fewer security cards when you use <Blast Digivolve>.
    Q4021 (2024-03-28): If an opponent's Digimon attacks when I have 2 or fewer security cards, then an effect adds a card to my security stack so my security stack has 3 or more cards when I use <Blast Digivolve>, can my [Gabumon] digivolve into this card in the hand?
      A: No, it can't. Digivolution from [Gabumon] isn't possible because the digivolution requirements aren't met when you use <Blast Digivolve>.
    Q4022 (2024-03-28): If an opponent's Digimon attacks when I have 3 security cards, then an effect removes a card from my security stack so my security stack has 2 or fewer cards when I use <Blast Digivolve>, can my [Gabumon] digivolve into this card in the hand?
      A: Yes, you can. Digivolution from [Gabumon] is possible as long as the digivolution requirements are met when you use <Blast Digivolve>.
    Q4023 (2024-03-28): If I use an effect such as P-103 [Offense Training]'s <Delay> that digivolves a Digimon, can my [Gabumon] digivolve into this card in the hand when I have 2 or fewer security cards?
      A: Yes, you can.
      related: P-104
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-022.ts`; triggers Counter, OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds Return, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Counter",
L19: trigger: "OnPlay",
L22: kind: "Return",
L27: kind: ["Digimon"],
L36: trigger: "WhenDigivolving",
L39: kind: "Return",
L44: kind: ["Digimon"],
L53: trigger: "WhenAttacking",
L56: kind: "Unsuspend",
L64: condition: {
L65: kind: "youHave",
L68: kind: ["Tamer"],
L74: frequency: "OncePerTurn",
L79: digivolutionRequirement: [
L82: cost: 3,
L85: // `zoneCount` shape only; the previous `condition: { kind: "securityAtMost" }` was ignored
L88: kind: "zoneCount",
L99: registerIrCard("LM-022", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT11-061 (Unknown), BT11-065 (Unknown), BT11-070 (Unknown), BT11-111 (Unknown). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-022.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("returns opposing Digimon with at most as many digivolution cards as itself", async () => {
L10: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
L26: await settle(() => s.state.players[1]!.battleArea.length === 2, 2000);
L29: expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
L32: expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-009");
L35: it("returns two once its own stack is deep enough", async () => {
L36: const s = setupEngine(
L51: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L53: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L54: expect(s.state.players[1]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
L57: it("offers the Gabumon cost-3 path only at two or fewer security cards, per Q4021", async () => {
L66: const low = setupEngine(board(2), { autoDeclineOptional: true, autoSelectCards: true });
L69: expect(
L70: low.engine.applyIntent(0, {
L76: await settle(() => low.perm("gabumon").topCard?.cardId === "LM-022", 2000);
L77: expect(low.state.memory).toBe(0);
L79: const high = setupEngine(board(3), { autoDeclineOptional: true, autoSelectCards: true });
L82: expect(
L83: high.engine.applyIntent(0, {
L91: it("unsuspends itself once per turn when attacking with a Tamer in play", async () => {
L92: const s = setupEngine(
L106: await settle(() => !s.perm("bond").isSuspended, 2000);
L107: expect(s.perm("bond").isSuspended).toBe(false);
L111: await settle(() => s.state.pendingDecision === null);
L112: expect(s.perm("bond").isSuspended).toBe(true);
L115: it("stays suspended without a Tamer", async () => {
L116: const s = setupEngine(
L123: await settle(() => s.state.pendingDecision === null);
L125: expect(s.perm("bond").isSuspended).toBe(true);
L128: it("matches committed metadata and publishes fully covered compiled IR", () => {
L131: expect(definition?.nameEn).toBe("Gabumon - Bond of Friendship");
L132: expect(definition?.level).toBe(7);
L133: expect(definition?.overflowMemory).toBe(5);
L134: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L135: expect(compiled?.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-022.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-022", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `190d2f9a4 fix(LM-021,LM-022): gate the Bond digivolve paths on the security count`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-023 — Sakuyamon: Maid Mode — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-023",
  "set": "LM",
  "nameEn": "Sakuyamon: Maid Mode",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 6,
  "dp": 11000,
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
    "Data"
  ],
  "types": [
    "Shaman"
  ],
  "effectText": "[Digivolve][Sakuyamon]: Cost 1 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] You may place 1 yellow Tamer card or 1-color Option card with a cost of 5 or less from your hand on top of your security stack.\n[All Turns] [Once Per Turn] When an Option card is used, or when a card is added to a security stack, 1 of your opponent’s Digimon gets -6000 DP for the turn.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-023",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve][Sakuyamon]: Cost 1 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] You may place 1 yellow Tamer card or 1-color Option card with a cost of 5 or less from your hand on top of your security stack.\n[All Turns] [Once Per Turn] When an Option card is used, or when a card is added to a security stack, 1 of your opponent’s Digimon gets -6000 DP for the turn."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-023`

```text
LM-023 Sakuyamon: Maid Mode
  Q&A (5):
    Q4024 (2025-11-21): What cards can be placed as a security card by this card's [On Play] [When Digivolving] effect?
      A: 1 yellow Tamer card or 1 single-color use cost 5 or lower Option card.
    Q4025 (2025-11-21): When I use this card's [On Play] [When Digivolving] effect to place a card as a security card, do I reveal the card to my opponent?
      A: Yes, you reveal it. After revealing the card to your opponent, you place it as a security card.
    Q5516 (2025-11-21): An Option card's use cost is 5 or less when used from the hand due to an effect such as BT2-099 [Glorious Burst] or BT8-097 [Crimson Blaze]'s 1st effect. Can I use this card's [On Play] [When Digivolving] effect to place that card as a security card?
      A: Yes, you can. If a card's use cost itself is reduced when it's used from the hand and the use cost is 5 or less, this card's [On Play] [When Digivolving] effect can place that card as a security card.
      related: BT2-099, BT8-097
    Q5517 (2025-11-21): If the "when you use an Option card" effect triggers, what is the timing when it can activate?
      A: It can be activated after activating the used Option card's [Main] effect.
    Q5518 (2025-11-21): Does the "when you use an Option card" effect trigger if an Option card's effect activates by a method other than using the card?
      A: No, it doesn't trigger. If an Option card's effect activates without using it, such as activation by a [Security] effect or <Delay>, the "when you use an Option card" effect doesn't trigger.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-023.ts`; triggers Counter, OnPlay, WhenDigivolving, AllTurns; action/condition kinds SecurityManipulation, SubTrigger, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L10: trigger: "Counter",
L21: trigger: "OnPlay",
L24: kind: "SecurityManipulation",
L30: kind: ["Tamer"],
L33: orFilters: [{ controllerDefault: "mine", kind: ["Option"], singleColor: true, playCostLte: 5 }],
L40: optional: true,
L45: trigger: "WhenDigivolving",
L48: kind: "SecurityManipulation",
L54: kind: ["Tamer"],
L57: orFilters: [{ controllerDefault: "mine", kind: ["Option"], singleColor: true, playCostLte: 5 }],
L64: optional: true,
L69: trigger: "AllTurns",
L72: kind: "SubTrigger",
L76: kind: "ModifyDP",
L80: kind: ["Digimon"],
L85: duration: "forTheTurn",
L90: kind: "SubTrigger",
L96: kind: "ModifyDP",
L100: kind: ["Digimon"],
L105: duration: "forTheTurn",
L110: frequency: "OncePerTurn",
L115: digivolutionRequirement: [
L118: cost: 1,
L124: registerIrCard("LM-023", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-057 (Shaman), BT1-080 (Shaman), BT10-041 (Shaman), BT10-042 (Shaman). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-023.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("places an eligible yellow Tamer from hand on top of security and reveals it, per Q4024/Q4025", async () => {
L10: const s = setupEngine(
L23: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
L24: await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "AD1-019"), 2000);
L26: expect(s.state.players[0]!.security.at(0)?.cardId).toBe("AD1-019");
L27: expect(s.events.some((event) => event.kind === "cardRevealed")).toBe(true);
L30: it("places a single-color Option with a cost of 5 or less", async () => {
L31: const s = setupEngine(
L43: await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-091"), 2000);
L45: expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-091")).toBe(true);
L48: it("does not place an ineligible multicolor Option from hand", async () => {
L49: const s = setupEngine(
L62: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
L63: await settle(() => s.state.pendingDecision === null);
L65: expect(s.state.players[0]!.security.some((card) => card.cardId === "BT10-104")).toBe(false);
L66: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-104")).toBe(true);
L69: it("does not place a single-color Option costing more than 5", async () => {
L70: const s = setupEngine(
L82: await settle(() => s.state.pendingDecision === null);
L84: expect(s.state.players[0]!.security).toHaveLength(0);
L85: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-107")).toBe(true);
L88: it("shrinks an opposing Digimon by 6000 when a card is added to either security stack", async () => {
L89: const s = setupEngine(
L100: await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
L101: await settle(() => s.perm("victim").currentDP === printed - 6000, 2000);
L103: expect(s.perm("victim").currentDP).toBe(printed - 6000);
L106: it("shrinks an opposing Digimon by 6000 when an Option is used, once per turn", async () => {
L107: const s = setupEngine(
L117: await advance(s.engine).fireSubTrigger("whenOptionUsed", {});
L118: await settle(() => s.perm("victim").currentDP === printed - 6000, 2000);
L119: expect(s.perm("victim").currentDP).toBe(printed - 6000);
L121: await advance(s.engine).fireSubTrigger("whenOptionUsed", {});
L122: await settle(() => s.state.pendingDecision === null);
L123: expect(s.perm("victim").currentDP).toBe(printed - 6000);
L126: it("matches committed metadata and publishes fully covered compiled IR", () => {
L129: expect(definition?.nameEn).toBe("Sakuyamon: Maid Mode");
L130: expect(definition?.dp).toBe(11000);
L131: expect(definition?.isAce).toBe(true);
L132: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L133: expect(compiled?.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-023.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-023", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `22fcb734a fix(LM-023,LM-024): widen security watcher, reveal placement, arm the immunity`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-024 — Shivamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-024",
  "set": "LM",
  "nameEn": "Shivamon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 6,
  "dp": 11000,
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
    "Insectoid"
  ],
  "effectText": "[Digivolve]Lv.5 w/[Pulsemon] in its text: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] If you have 3 or more security cards, suspend 1 Digimon, and 1 of your Digimon gets +3000 DP until the end of your opponent's turn. If you have 3 or fewer security cards, return 1 of your opponent’s suspended Digimon to the bottom of the deck.\n[All Turns] While this Digimon is suspended, it isn't affected by the effects of your opponent’s Digimon.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-024",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve]Lv.5 w/[Pulsemon] in its text: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] If you have 3 or more security cards, suspend 1 Digimon, and 1 of your Digimon gets +3000 DP until the end of your opponent's turn. If you have 3 or fewer security cards, return 1 of your opponent’s suspended Digimon to the bottom of the deck.\n[All Turns] While this Digimon is suspended, it isn't affected by the effects of your opponent’s Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-024`

```text
LM-024 Shivamon
  Q&A (3):
    Q4026 (2024-03-28): If I have exactly 3 cards in my security stack, do I activate both "suspend 1 Digimon, and 1 of your Digimon gets +3000 DP until the end of your opponent's turn" and the "return 1 of your opponent's suspended Digimon to the bottom of the deck" effect when activating this card's [On Play] [When Digivolving] effect?
      A: Yes, that's correct.
    Q4027 (2024-03-28): Does this card's [All Turns] effect prevent [Security] effects on my opponent's Security Digimon from affecting this Digimon while it's suspended?
      A: Yes, it isn't affected. [Security] effects on Security Digimon are treated as Digimon effects, so the "this Digimon isn't affected by the effects of your opponent's Digimon" effect prevents such effects from affecting this Digimon.
    Q4028 (2024-03-28): If this Digimon is affected by a "can't unsuspend" effect from an opponent's Digimon, does it unsuspend during my unsuspend phase?
      A: Yes, it unsuspends. After it suspends, it's no longer affected by your opponent's effects, so it can now unsuspend.
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-024.ts`; triggers Counter, OnPlay, WhenDigivolving, AllTurns; action/condition kinds Suspend, ModifyDP, Return, GrantStatic. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L10: trigger: "Counter",
L16: trigger: "OnPlay",
L19: kind: "Suspend",
L24: kind: ["Digimon"],
L28: condition: {
L29: kind: "securityAtLeast",
L34: kind: "ModifyDP",
L38: kind: ["Digimon"],
L43: duration: "untilOpponentTurnEnd",
L44: condition: {
L45: kind: "securityAtLeast",
L50: kind: "Return",
L55: kind: ["Digimon"],
L60: condition: {
L61: kind: "zoneCount",
L72: trigger: "WhenDigivolving",
L75: kind: "Suspend",
L80: kind: ["Digimon"],
L84: condition: {
L85: kind: "securityAtLeast",
L90: kind: "ModifyDP",
L94: kind: ["Digimon"],
L99: duration: "untilOpponentTurnEnd",
L100: condition: {
L101: kind: "securityAtLeast",
L106: kind: "Return",
L111: kind: ["Digimon"],
L116: condition: {
L117: kind: "zoneCount",
L129: trigger: "AllTurns",
L132: kind: "GrantStatic",
L139: duration: "whileCondition",
L140: condition: {
L143: kind: "selfIsSuspended",
L152: digivolutionRequirement: [
L156: cost: 3,
L162: registerIrCard("LM-024", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-066 (Insectoid), BT1-070 (Insectoid), BT1-073 (Insectoid), BT1-076 (Insectoid). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-024.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("fires both halves at exactly three security cards, per Q4026", async () => {
L12: const s = setupEngine(
L22: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shivamon").instanceId })).toEqual({
L25: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L28: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L29: expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-009");
L30: expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-024")!.currentDP).toBe(14000);
L33: it("at two security returns an already-suspended opposing Digimon and does not buff", async () => {
L34: const s = setupEngine(
L43: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shivamon").instanceId })).toEqual({
L46: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L48: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L49: expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-024")!.currentDP).toBe(11000);
L52: it("at four security only suspends and buffs", async () => {
L54: const s = setupEngine(
L65: await settle(() => s.perm("target").isSuspended, 2000);
L67: expect(s.perm("target").isSuspended).toBe(true);
L68: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L69: expect(s.perm("shivamon").currentDP).toBe(14000);
L72: it("can suspend one of the controller's own Digimon", async () => {
L74: const s = setupEngine(
L90: await settle(() => s.perm("mine").isSuspended, 2000);
L92: expect(s.perm("mine").isSuspended).toBe(true);
L95: it("is immune to opposing Digimon effects only while suspended, per Q4027/Q4028", async () => {
L96: const s = setupEngine(
L107: expect(observe(s.engine).isRestrictedByEffect(shivamonId, "beAffected", "Digimon")).toBe(true);
L112: expect(observe(s.engine).isRestrictedByEffect(shivamonId, "beAffected", "Digimon")).toBe(false);
L115: it("matches committed metadata and publishes fully covered compiled IR", () => {
L118: expect(definition?.nameEn).toBe("Shivamon");
L119: expect(definition?.dp).toBe(11000);
L120: expect(definition?.isAce).toBe(true);
L121: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-024.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-024", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `22fcb734a fix(LM-023,LM-024): widen security watcher, reveal placement, arm the immunity`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-025 — Cyberdramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-025",
  "set": "LM",
  "nameEn": "Cyberdramon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 5,
  "dp": 8000,
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
    "Cyborg"
  ],
  "effectText": "[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Reveal the top 5 cards of your deck. You may play 1 black Tamer card with a play cost of 4 or less among without paying the cost. Return the rest to the top or bottom of the deck. Then, if you have a Tamer, ＜De-Digivolve1＞ 1 of your opponent's Digimon.",
  "inheritedEffectText": "[When Attacking] [Once Per Turn] ＜De-Digivolve1＞ 1 of your opponent's Digimon.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-025",
  "isAce": true,
  "overflowMemory": 3
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Reveal the top 5 cards of your deck. You may play 1 black Tamer card with a play cost of 4 or less among without paying the cost. Return the rest to the top or bottom of the deck. Then, if you have a Tamer, ＜De-Digivolve1＞ 1 of your opponent's Digimon."
   - Inherited: "[When Attacking] [Once Per Turn] ＜De-Digivolve1＞ 1 of your opponent's Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-025`

```text
LM-025 Cyberdramon
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
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-025.ts`; triggers Counter, OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds RevealAdd, DeDigivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Counter",
L19: trigger: "OnPlay",
L22: kind: "RevealAdd",
L28: kind: ["Tamer"],
L35: optional: true,
L41: kind: "DeDigivolve",
L45: kind: ["Digimon"],
L50: condition: {
L51: kind: "youHave",
L54: kind: ["Tamer"],
L62: trigger: "WhenDigivolving",
L65: kind: "RevealAdd",
L71: kind: ["Tamer"],
L78: optional: true,
L84: kind: "DeDigivolve",
L88: kind: ["Digimon"],
L93: condition: {
L94: kind: "youHave",
L97: kind: ["Tamer"],
L105: trigger: "WhenAttacking",
L108: kind: "DeDigivolve",
L112: kind: ["Digimon"],
L120: frequency: "OncePerTurn",
L127: registerIrCard("LM-025", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-003 (Cyborg), AD1-009 (Cyborg), AD1-013 (Cyborg), AD1-014 (Cyborg). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-025.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("reveals five, plays a qualifying black Tamer, and de-digivolves an opposing stack", async () => {
L10: const s = setupEngine(
L23: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
L26: await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
L27: await settle(() => s.state.pendingDecision === undefined);
L28: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092")).toBe(true);
L29: expect(s.state.players[1]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-015")!.stack).toHaveLength(0);
L30: expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
L33: it("does not de-digivolve when no qualifying Tamer is revealed", async () => {
L34: const s = setupEngine(
L46: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
L49: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-025"));
L50: expect(s.state.players[1]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-081")!.stack).toHaveLength(1);
L53: it("plays a revealed black Tamer costing 4 or less for free", async () => {
L54: const s = setupEngine(
L67: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092"), 2000);
L69: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092")).toBe(true);
L70: expect(s.state.memory).toBe(0);
L71: expect(s.state.players[0]!.deck).toHaveLength(4);
L74: it("de-digivolves once per turn from the inherited attacking clause", async () => {
L75: const s = setupEngine(
L87: await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"), 2000);
L91: await settle(() => s.state.pendingDecision === null);
L93: expect(s.state.players[1]!.trash).toHaveLength(afterFirst);
L96: it("matches committed metadata and publishes fully covered compiled IR", () => {
L99: expect(definition?.nameEn).toBe("Cyberdramon");
L100: expect(definition?.dp).toBe(8000);
L101: expect(definition?.overflowMemory).toBe(3);
L102: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L103: expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-025.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-025", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `e248ad843 test(LM-025,LM-026): prove the reveal-play, De-Digivolve and deletion ceiling`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-026 — Megidramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-026",
  "set": "LM",
  "nameEn": "Megidramon",
  "colors": [
    "Purple",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 7,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 5,
      "memoryCost": 4
    },
    {
      "color": "Red",
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
    "Evil Dragon",
    "Four Great Dragons"
  ],
  "effectText": "[Digivolve]Lv.5 w/[Growlmon] in its name: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Delete 1 of your opponent's 11000 DP or lower Digimon.\n[All Turns] When this Digimon would leave the battle area, by playing 1 [Guilmon] from this Digimon's digivolution cards or from your trash, place this Digimon as that Digimon's bottom digivolution card.\n[Rule] Name: Also treated as [ChaosGallantmon].",
  "inheritedEffectText": "[All Turns] Add 5000 to the maximum DP you can choose with this Digimon's DP-based deletion effects.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-026",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve]Lv.5 w/[Growlmon] in its name: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Delete 1 of your opponent's 11000 DP or lower Digimon.\n[All Turns] When this Digimon would leave the battle area, by playing 1 [Guilmon] from this Digimon's digivolution cards or from your trash, place this Digimon as that Digimon's bottom digivolution card.\n[Rule] Name: Also treated as [ChaosGallantmon]."
   - Inherited: "[All Turns] Add 5000 to the maximum DP you can choose with this Digimon's DP-based deletion effects."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-026`

```text
LM-026 Megidramon
  Q&A (4):
    Q4029 (2024-03-28): What does this card's "when [...] would leave the battle area" mean, exactly?
      A: "When [...] would leave the battle area" refers to when this Digimon is placed in the trash, returned to the hand/deck, placed in the security stack, moved to the breeding area, or placed under another card.
    Q4030 (2024-03-28): Does <Overflow> apply when I use this card's [All Turns] effect to place this card in the digivolution cards of the played [Guilmon]?
      A: No, it doesn't. <Overflow> applies when a card from the battle area or from under a card is placed into another area. In this case, it doesn't apply because a card from the battle area is placed under another card.
    Q4031 (2024-05-24): What does an "add X000 to the maximum your DP-based deletion effects can delete" effect do?
      A: Such effects increase the maximum value shown for DP-based deletion effects. For example, while "[Your Turn] Add 1000 to the maximum your DP-based deletion effects can delete" is activated, "[When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or less" will allow you to delete an opponent's Digimon with 4000 DP or less.
    Q4032 (2024-05-24): If "add X000 to the maximum your DP-based deletion effects can delete" is activating, can the maximum be increased for an effect such as "delete 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP" that references a Digimon's DP for deletion?
      A: No, it can't be increased. You can't increase the maximum of a DP-based deletion effect that doesn't show a numerical value.
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
   - `node tools/kb/query.mjs rules "stacked digivolution cards placement trash" --limit 3`

```text
[manual §1] Official Rule Manual  (8.505)
  …givolve: 0 from (ShineGreymon] by returning 1 [Marcus Damon] to hand At the end of the burst digivolution turn, trash this Digimon's top card In the case of the above burst digivolve requirements, by returning 1 Shine Greymon: Burst Mode 8113-020 3) [Marcus Damon] to the hand, 1 …

[comprehensive §4-7] Digivolution Cards  (8.087)
  4-7. Digivolution Cards 4-7-1. A digivolution card refers to a card placed under a Digimon. (For details, refer to 4-5 "Stacked Cards")4-6 4-7-2. When referencing digivolution card information, the information is referenced on cards that are treated as digivolution cards.

[comprehensive §4-6] Stacked Cards  (7.911)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-026.ts`; triggers Counter, OnPlay, WhenDigivolving, AllTurns, Rule; action/condition kinds Delete, Replacement, GrantStatic, DeletionMaxDpModifier. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: trigger: "Counter",
L15: trigger: "OnPlay",
L18: kind: "Delete",
L19: target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 },
L24: trigger: "WhenDigivolving",
L27: kind: "Delete",
L28: target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 },
L33: trigger: "AllTurns",
L36: kind: "Replacement",
L40: optional: true,
L42: filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] },
L50: trigger: "Rule",
L51: actions: [{ kind: "GrantStatic", target: self, grant: "name", tokens: ["ChaosGallantmon"] }],
L54: trigger: "AllTurns",
L56: actions: [{ kind: "DeletionMaxDpModifier", amount: 5000, scope: "self", duration: "permanent" }],
L61: digivolutionRequirement: [{ level: 5, names: ["Growlmon"], cost: 3, isAlternate: true }],
L64: registerIrCard("LM-026", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-079 (Evil Dragon/Four Great Dragons), BT24-080 (Evil Dragon/Four Great Dragons), BT5-083 (Evil Dragon/Four Great Dragons), EX2-012 (Evil Dragon/Four Great Dragons). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-026.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L12: it("registers complete leave replacement, rule name, and inherited deletion ceiling IR", () => {
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(
L27: expect(compiled.effects.find((effect) => effect.isInherited)?.actions).toEqual([
L32: it("deletes only opposing Digimon at 11000 DP or less", async () => {
L33: const s = setupEngine(
L47: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({
L50: await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
L51: expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
L52: expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-082")).toBe(true);
L55: it("replaces its own leave with a Guilmon host", async () => {
L56: const s = setupEngine(
L64: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT2-009")).toBe(true);
L65: expect(
L72: it("can play the Guilmon from its own digivolution cards for the replacement", async () => {
L73: const s = setupEngine(
L82: expect(guilmon?.stack.map((card) => card.cardId)).toEqual(["LM-026"]);
L83: expect(s.state.players[0]!.trash).toHaveLength(0);
L86: it("is also treated as ChaosGallantmon", async () => {
L87: const s = setupEngine(
L93: expect(observe(s.engine).effectiveNames(s.perm("megidramon"))).toContain("chaosgallantmon");
L96: it("raises its host's own numeric deletion ceiling by 5000, per Q4031", async () => {
L97: const withMegidramon = setupEngine(
L108: await settle(() => withMegidramon.state.players[1]!.battleArea.length === 0, 2000);
L109: expect(withMegidramon.state.players[1]!.battleArea).toHaveLength(0);
L111: const withoutMegidramon = setupEngine(
L121: await settle(() => withoutMegidramon.state.pendingDecision === null);
L122: expect(withoutMegidramon.state.players[1]!.battleArea).toHaveLength(1);
L125: it("matches committed metadata and publishes fully covered compiled IR", () => {
L128: expect(definition?.nameEn).toBe("Megidramon");
L129: expect(definition?.colors).toEqual(["Purple", "Red"]);
L130: expect(definition?.isAce).toBe(true);
L131: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-026.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-026", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `e248ad843 test(LM-025,LM-026): prove the reveal-play, De-Digivolve and deletion ceiling`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-027 — Red Scramble — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-027",
  "set": "LM",
  "nameEn": "Red Scramble",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Option"
  ],
  "effectText": "[Main] 1 of your red Digimon may digivolve into a red Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 red Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 red Digimon card with 2000 DP or less from your trash without paying the cost.",
  "securityEffectText": "[Security] You may play 1 red Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-027"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] 1 of your red Digimon may digivolve into a red Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 red Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 red Digimon card with 2000 DP or less from your trash without paying the cost."
   - Security: "[Security] You may play 1 red Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-027`

```text
LM-027 Red Scramble
  Q&A (5):
    Q4033 (2024-05-24): When I use this card's [Main] effect to digivolve into a card in my hand, can it digivolve regardless of its digivolution requirements?
      A: No, this card's [Main] effect does not allow ignoring digivolution requirements, so you can only digivolve into a card that meets the digivolution requirements.
    Q4034 (2024-05-24): Can I use this card's [Main] effect to burst digivolve or DNA digivolve into a card in my hand?
      A: No, you can't burst digivolve or DNA digivolve.
    Q4035 (2024-05-24): Can I use this card's [Main] effect to digivolve a Tamer into a Digimon card with a "your Tamer is treated as a Digimon and can digivolve" effect?
      A: No, you can't. This card's [Main] effect digivolves 1 Digimon. It doesn't digivolve Tamers.
    Q4036 (2024-05-24): Can I activate this card's <Delay> effect if I don't have any red Digimon cards in my trash?
      A: Yes, you can.
    Q4037 (2024-05-24): Can I use this card's <Delay> effect to play a red Digimon card with 2000 DP or less from my trash without returning a Digimon card from my trash to the top of the deck?
      A: No, you can't. You must perform "return 1 red Digimon card from your trash to the top of the deck" whenever possible.
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-027.ts`; triggers Main, StartOfYourTurn, Security; action/condition kinds Digivolve, PlaceInBattleAreaSelf, Return, PlayWithoutCost, AddToHandSelf. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Main",
L11: kind: "Digivolve",
L15: kind: ["Digimon"],
L22: kind: ["Digimon"],
L28: optional: true,
L31: kind: "PlaceInBattleAreaSelf",
L36: trigger: "StartOfYourTurn",
L43: condition: {
L44: kind: "opponentHas",
L47: kind: ["Digimon"],
L53: kind: "Return",
L58: kind: ["Digimon"],
L68: kind: "PlayWithoutCost",
L72: kind: ["Digimon"],
L83: condition: {
L84: kind: "youHaveNone",
L87: kind: ["Digimon"],
L91: optional: true,
L96: trigger: "Security",
L99: kind: "PlayWithoutCost",
L103: kind: ["Digimon"],
L114: optional: true,
L117: kind: "AddToHandSelf",
L127: registerIrCard("LM-027", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-027.test.ts` contains 8 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
L14: (s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop =
L22: expect(mainPhase.isOpen).toBe(true);
L26: async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
L30: const ended = s.engine.applyIntent(0, { type: "endPhase" });
L37: it("digivolves a red Digimon from hand and places Red Scramble in the battle area", async () => {
L38: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L48: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015"));
L49: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027"));
L50: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015")).toBe(true);
L51: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027")).toBe(true);
L54: it("Delay returns a red Digimon to deck before playing a small red Digimon when empty", async () => {
L55: const s = setupEngine(
L66: await settle(() => s.state.players[0]!.deck[0]?.cardId === "BT1-011");
L67: expect((s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop).toBe("BT1-011");
L68: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
L72: it("Delay does not play a red Digimon above 2000 DP", async () => {
L73: const s = setupEngine(
L84: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(false);
L85: expect((s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop).toBe("BT1-013");
L89: it("does not activate Delay when the opponent has no Digimon", async () => {
L90: const s = setupEngine(
L98: expect(s.state.players[0]!.deck[0]?.cardId).toBeUndefined();
L99: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
L100: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027")).toBe(true);
L104: it("Security plays a qualifying red Digimon from trash and returns itself to hand", async () => {
L105: const s = setupEngine(
L109: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L110: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-027"));
L111: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-011")).toBe(true);
L112: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-027")).toBe(true);
L115: it("activates Delay with no red Digimon in the trash, per Q4036", async () => {
L116: const s = setupEngine(
L129: expect(s.state.players[0]!.deck).toHaveLength(0);
L133: it("reduces the digivolution cost by 3", async () => {
L134: const s = setupEngine(
L147: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L150: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015"), 2000);
L152: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015")).toBe(true);
L153: expect(s.state.memory).toBe(0);
L156: it("matches committed metadata and publishes fully covered compiled IR", () => {
L159: expect(definition?.nameEn).toBe("Red Scramble");
L160: expect(definition?.kinds).toEqual(["Option"]);
L161: expect(definition?.playCost).toBe(2);
L162: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L163: expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-027.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-027", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-028 — Blue Scramble — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-028",
  "set": "LM",
  "nameEn": "Blue Scramble",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Option"
  ],
  "effectText": "[Main] 1 of your blue Digimon may digivolve into a blue Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 blue Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 blue Digimon card with 2000 DP or less from your trash without paying the cost.",
  "securityEffectText": "[Security] You may play 1 blue Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-028"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] 1 of your blue Digimon may digivolve into a blue Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 blue Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 blue Digimon card with 2000 DP or less from your trash without paying the cost."
   - Security: "[Security] You may play 1 blue Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-028`

```text
LM-028 Blue Scramble
  Q&A (5):
    Q4038 (2024-05-24): When I use this card's [Main] effect to digivolve into a card in my hand, can it digivolve regardless of its digivolution requirements?
      A: No, this card's [Main] effect does not allow ignoring digivolution requirements, so you can only digivolve into a card that meets the digivolution requirements.
    Q4039 (2024-05-24): Can I use this card's [Main] effect to burst digivolve or DNA digivolve into a card in my hand?
      A: No, you can't burst digivolve or DNA digivolve.
    Q4040 (2024-05-24): Can I use this card's [Main] effect to digivolve a Tamer into a Digimon card with a "your Tamer is treated as a Digimon and can digivolve" effect?
      A: No, you can't. This card's [Main] effect digivolves 1 Digimon. It doesn't digivolve Tamers.
    Q4041 (2024-05-24): Can I activate this card's <Delay> effect if I don't have any blue Digimon cards in my trash?
      A: Yes, you can.
    Q4042 (2024-05-24): Can I use this card's <Delay> effect to play a blue Digimon card with 2000 DP or less from my trash without returning a Digimon card from my trash to the top of the deck?
      A: No, you can't. You must perform "return 1 blue Digimon card from your trash to the top of the deck" whenever possible.
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-028.ts`; triggers Main, StartOfYourTurn, Security; action/condition kinds Digivolve, PlaceInBattleAreaSelf, Return, PlayWithoutCost, AddToHandSelf. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L20: trigger: "Main",
L23: kind: "Digivolve",
L27: kind: ["Digimon"],
L34: kind: ["Digimon"],
L39: optional: true,
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "StartOfYourTurn",
L48: condition: {
L49: kind: "opponentHas",
L52: kind: ["Digimon"],
L64: kind: "Return",
L69: kind: ["Digimon"],
L79: kind: "PlayWithoutCost",
L83: kind: ["Digimon"],
L94: condition: {
L95: kind: "youHaveNone",
L98: kind: ["Digimon"],
L102: optional: true,
L107: trigger: "Security",
L110: kind: "PlayWithoutCost",
L114: kind: ["Digimon"],
L125: optional: true,
L128: kind: "AddToHandSelf",
L138: registerIrCard("LM-028", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-028.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
L14: expect(mainPhase.isOpen).toBe(true);
L18: async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
L22: const ended = s.engine.applyIntent(0, { type: "endPhase" });
L29: it("digivolves a blue Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
L30: const s = setupEngine(
L38: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L41: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-115"), 2000);
L43: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-115")).toBe(true);
L44: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-028")).toBe(true);
L45: expect(s.state.memory).toBe(0);
L48: it("Delay returns a blue Digimon to the deck top and then revives a small one", async () => {
L49: const s = setupEngine(
L60: await settle(() => s.state.players[0]!.deck.length === 1, 2000);
L62: expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-027");
L63: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-031")).toBe(true);
L67: it("does not activate Delay when the opponent has no Digimon", async () => {
L68: const s = setupEngine(
L77: expect(s.state.players[0]!.deck).toHaveLength(0);
L78: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-031")).toBe(true);
L82: it("Security plays a qualifying blue Digimon from trash and returns itself to hand", async () => {
L83: const s = setupEngine(
L88: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L89: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-028"), 2000);
L91: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-031")).toBe(true);
L92: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-028")).toBe(true);
L95: it("Security leaves a blue Digimon above 2000 DP in the trash", async () => {
L96: const s = setupEngine(
L101: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L102: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-028"), 2000);
L104: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-027")).toBe(false);
L105: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-027")).toBe(true);
L108: it("matches committed metadata and publishes fully covered compiled IR", () => {
L111: expect(definition?.nameEn).toBe("Blue Scramble");
L112: expect(definition?.colors).toEqual(["Blue"]);
L113: expect(definition?.playCost).toBe(2);
L114: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L115: expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-028.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-028", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-029 — Yellow Scramble — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-029",
  "set": "LM",
  "nameEn": "Yellow Scramble",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Option"
  ],
  "effectText": "[Main] 1 of your yellow Digimon may digivolve into a yellow Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 yellow Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 yellow Digimon card with 2000 DP or less from your trash without paying the cost.",
  "securityEffectText": "[Security] You may play 1 yellow Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-029"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] 1 of your yellow Digimon may digivolve into a yellow Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 yellow Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 yellow Digimon card with 2000 DP or less from your trash without paying the cost."
   - Security: "[Security] You may play 1 yellow Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-029`

```text
LM-029 Yellow Scramble
  Q&A (7):
    Q4043 (2024-05-24): When I use this card's [Main] effect to digivolve into a card in my hand, can it digivolve regardless of its digivolution requirements?
      A: No, this card's [Main] effect does not allow ignoring digivolution requirements, so you can only digivolve into a card that meets the digivolution requirements.
    Q4044 (2024-05-24): Can I use this card's [Main] effect to burst digivolve or DNA digivolve into a card in my hand?
      A: No, you can't burst digivolve or DNA digivolve.
    Q4045 (2024-05-24): Can I use this card's [Main] effect to digivolve a Tamer into a Digimon card with a "your Tamer is treated as a Digimon and can digivolve" effect?
      A: No, you can't. This card's [Main] effect digivolves 1 Digimon. It doesn't digivolve Tamers.
    Q4046 (2024-05-24): Can I activate this card's <Delay> effect if I don't have any yellow Digimon cards in my trash?
      A: Yes, you can.
    Q4047 (2024-05-24): Can I use this card's <Delay> effect to play a yellow Digimon card with 2000 DP or less from my trash without returning a Digimon card from my trash to the top of the deck?
      A: No, you can't. You must perform "return 1 yellow Digimon card from your trash to the top of the deck" whenever possible.
    Q4737 (2026-05-08): If I use this card's [Your Turn] effect to use an Option card, can I then choose to not unsuspend 1 of my Digimon for the part of the effect after "if this effect used"?
      A: No, you can't. If you use this effect to use an Option card, you must unsuspend 1 of your Digimon.
    Q4738 (2026-05-08): If I use this card's [Your Turn] effect to use an Option card and its effect digivolves this card itself into another card, does the part of the effect after "if this effect used" then unsuspend 1 of my Digimon?
      A: Yes, it unsuspends.
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-029.ts`; triggers Main, StartOfYourTurn, Security; action/condition kinds Digivolve, PlaceInBattleAreaSelf, Return, PlayWithoutCost, AddToHandSelf. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Main",
L16: kind: "Digivolve",
L20: kind: ["Digimon"],
L27: kind: ["Digimon"],
L32: optional: true,
L35: kind: "PlaceInBattleAreaSelf",
L40: trigger: "StartOfYourTurn",
L47: condition: {
L48: kind: "opponentHas",
L51: kind: ["Digimon"],
L57: kind: "Return",
L62: kind: ["Digimon"],
L72: kind: "PlayWithoutCost",
L76: kind: ["Digimon"],
L87: condition: {
L88: kind: "youHaveNone",
L91: kind: ["Digimon"],
L95: optional: true,
L100: trigger: "Security",
L103: kind: "PlayWithoutCost",
L107: kind: ["Digimon"],
L118: optional: true,
L121: kind: "AddToHandSelf",
L131: registerIrCard("LM-029", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-029.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
L14: expect(mainPhase.isOpen).toBe(true);
L18: async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
L22: const ended = s.engine.applyIntent(0, { type: "endPhase" });
L29: it("digivolves a yellow Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
L30: const s = setupEngine(
L38: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L41: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-054"), 2000);
L43: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-054")).toBe(true);
L44: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-029")).toBe(true);
L45: expect(s.state.memory).toBe(0);
L48: it("Delay returns a yellow Digimon to the deck top and then revives a small one", async () => {
L49: const s = setupEngine(
L60: await settle(() => s.state.players[0]!.deck.length === 1, 2000);
L62: expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-045");
L63: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-048")).toBe(true);
L67: it("does not activate Delay when the opponent has no Digimon", async () => {
L68: const s = setupEngine(
L77: expect(s.state.players[0]!.deck).toHaveLength(0);
L78: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-048")).toBe(true);
L82: it("Security plays a qualifying yellow Digimon from trash and returns itself to hand", async () => {
L83: const s = setupEngine(
L88: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L89: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-029"), 2000);
L91: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-048")).toBe(true);
L92: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-029")).toBe(true);
L95: it("Security leaves a yellow Digimon above 2000 DP in the trash", async () => {
L96: const s = setupEngine(
L101: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L102: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-029"), 2000);
L104: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-045")).toBe(false);
L105: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-045")).toBe(true);
L108: it("matches committed metadata and publishes fully covered compiled IR", () => {
L111: expect(definition?.nameEn).toBe("Yellow Scramble");
L112: expect(definition?.colors).toEqual(["Yellow"]);
L113: expect(definition?.playCost).toBe(2);
L114: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L115: expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-029.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-029", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-030 — Green Scramble — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-030",
  "set": "LM",
  "nameEn": "Green Scramble",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Option"
  ],
  "effectText": "[Main] 1 of your green Digimon may digivolve into a green Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 green Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 green Digimon card with 2000 DP or less from your trash without paying the cost.",
  "securityEffectText": "[Security] You may play 1 green Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-030"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] 1 of your green Digimon may digivolve into a green Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 green Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 green Digimon card with 2000 DP or less from your trash without paying the cost."
   - Security: "[Security] You may play 1 green Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-030`

```text
LM-030 Green Scramble
  Q&A (5):
    Q4048 (2024-05-24): When I use this card's [Main] effect to digivolve into a card in my hand, can it digivolve regardless of its digivolution requirements?
      A: No, this card's [Main] effect does not allow ignoring digivolution requirements, so you can only digivolve into a card that meets the digivolution requirements.
    Q4049 (2024-05-24): Can I use this card's [Main] effect to burst digivolve or DNA digivolve into a card in my hand?
      A: No, you can't burst digivolve or DNA digivolve.
    Q4050 (2024-05-24): Can I use this card's [Main] effect to digivolve a Tamer into a Digimon card with a "your Tamer is treated as a Digimon and can digivolve" effect?
      A: No, you can't. This card's [Main] effect digivolves 1 Digimon. It doesn't digivolve Tamers.
    Q4051 (2024-05-24): Can I activate this card's <Delay> effect if I don't have any green Digimon cards in my trash?
      A: Yes, you can.
    Q4052 (2024-05-24): Can I use this card's <Delay> effect to play a green Digimon card with 2000 DP or less from my trash without returning a Digimon card from my trash to the top of the deck?
      A: No, you can't. You must perform "return 1 green Digimon card from your trash to the top of the deck" whenever possible.
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-030.ts`; triggers Main, StartOfYourTurn, Security; action/condition kinds Digivolve, PlaceInBattleAreaSelf, Return, PlayWithoutCost, AddToHandSelf. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Main",
L11: kind: "Digivolve",
L15: kind: ["Digimon"],
L22: kind: ["Digimon"],
L28: optional: true,
L31: kind: "PlaceInBattleAreaSelf",
L36: trigger: "StartOfYourTurn",
L43: condition: {
L44: kind: "opponentHas",
L47: kind: ["Digimon"],
L53: kind: "Return",
L58: kind: ["Digimon"],
L67: kind: "PlayWithoutCost",
L71: kind: ["Digimon"],
L82: condition: {
L83: kind: "youHaveNone",
L86: kind: ["Digimon"],
L90: optional: true,
L95: trigger: "Security",
L98: kind: "PlayWithoutCost",
L102: kind: ["Digimon"],
L113: optional: true,
L116: kind: "AddToHandSelf",
L126: registerIrCard("LM-030", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-030.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
L14: expect(mainPhase.isOpen).toBe(true);
L18: async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
L22: const ended = s.engine.applyIntent(0, { type: "endPhase" });
L29: it("digivolves a green Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
L30: const s = setupEngine(
L38: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L41: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT6-050"), 2000);
L43: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT6-050")).toBe(true);
L44: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-030")).toBe(true);
L45: expect(s.state.memory).toBe(0);
L48: it("Delay returns a green Digimon to the deck top and then revives a small one", async () => {
L49: const s = setupEngine(
L60: await settle(() => s.state.players[0]!.deck.length === 1, 2000);
L62: expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-064");
L63: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-066")).toBe(true);
L67: it("does not activate Delay when the opponent has no Digimon", async () => {
L68: const s = setupEngine(
L77: expect(s.state.players[0]!.deck).toHaveLength(0);
L78: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-066")).toBe(true);
L82: it("Security plays a qualifying green Digimon from trash and returns itself to hand", async () => {
L83: const s = setupEngine(
L88: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L89: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-030"), 2000);
L91: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-066")).toBe(true);
L92: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-030")).toBe(true);
L95: it("Security leaves a green Digimon above 2000 DP in the trash", async () => {
L96: const s = setupEngine(
L101: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L102: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-030"), 2000);
L104: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-064")).toBe(false);
L105: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-064")).toBe(true);
L108: it("matches committed metadata and publishes fully covered compiled IR", () => {
L111: expect(definition?.nameEn).toBe("Green Scramble");
L112: expect(definition?.colors).toEqual(["Green"]);
L113: expect(definition?.playCost).toBe(2);
L114: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L115: expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-030.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-030", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-031 — Black Scramble — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-031",
  "set": "LM",
  "nameEn": "Black Scramble",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Option"
  ],
  "effectText": "[Main] 1 of your black Digimon may digivolve into a black Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 black Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 black Digimon card with 2000 DP or less from your trash without paying the cost.",
  "securityEffectText": "[Security] You may play 1 black Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-031"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] 1 of your black Digimon may digivolve into a black Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 black Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 black Digimon card with 2000 DP or less from your trash without paying the cost."
   - Security: "[Security] You may play 1 black Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-031`

```text
LM-031 Black Scramble
  Q&A (5):
    Q4053 (2024-05-24): When I use this card's [Main] effect to digivolve into a card in my hand, can it digivolve regardless of its digivolution requirements?
      A: No, this card's [Main] effect does not allow ignoring digivolution requirements, so you can only digivolve into a card that meets the digivolution requirements.
    Q4054 (2024-05-24): Can I use this card's [Main] effect to burst digivolve or DNA digivolve into a card in my hand?
      A: No, you can't burst digivolve or DNA digivolve.
    Q4055 (2024-05-24): Can I use this card's [Main] effect to digivolve a Tamer into a Digimon card with a "your Tamer is treated as a Digimon and can digivolve" effect?
      A: No, you can't. This card's [Main] effect digivolves 1 Digimon. It doesn't digivolve Tamers.
    Q4056 (2024-05-24): Can I activate this card's <Delay> effect if I don't have any black Digimon cards in my trash?
      A: Yes, you can.
    Q4057 (2024-05-24): Can I use this card's <Delay> effect to play a black Digimon card with 2000 DP or less from my trash without returning a Digimon card from my trash to the top of the deck?
      A: No, you can't. You must perform "return 1 black Digimon card from your trash to the top of the deck" whenever possible.
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-031.ts`; triggers Main, StartOfYourTurn, Security; action/condition kinds Digivolve, PlaceInBattleAreaSelf, Return, PlayWithoutCost, AddToHandSelf. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Main",
L14: kind: "Digivolve",
L18: kind: ["Digimon"],
L25: kind: ["Digimon"],
L30: optional: true,
L33: kind: "PlaceInBattleAreaSelf",
L38: trigger: "StartOfYourTurn",
L41: kind: "Return",
L46: kind: ["Digimon"],
L56: kind: "PlayWithoutCost",
L60: kind: ["Digimon"],
L71: condition: {
L72: kind: "youHaveNone",
L75: kind: ["Digimon"],
L79: optional: true,
L88: condition: {
L89: kind: "opponentHas",
L92: kind: ["Digimon"],
L98: trigger: "Security",
L101: kind: "PlayWithoutCost",
L105: kind: ["Digimon"],
L116: optional: true,
L119: kind: "AddToHandSelf",
L129: registerIrCard("LM-031", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-031.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
L14: expect(mainPhase.isOpen).toBe(true);
L18: async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
L22: const ended = s.engine.applyIntent(0, { type: "endPhase" });
L29: it("digivolves a black Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
L30: const s = setupEngine(
L38: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L41: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-061"), 2000);
L43: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-061")).toBe(true);
L44: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-031")).toBe(true);
L45: expect(s.state.memory).toBe(0);
L48: it("Delay returns a black Digimon to the deck top and then revives a small one", async () => {
L49: const s = setupEngine(
L60: await settle(() => s.state.players[0]!.deck.length === 1, 2000);
L62: expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT11-062");
L63: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-060")).toBe(true);
L67: it("does not activate Delay when the opponent has no Digimon", async () => {
L68: const s = setupEngine(
L77: expect(s.state.players[0]!.deck).toHaveLength(0);
L78: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-060")).toBe(true);
L82: it("Security plays a qualifying black Digimon from trash and returns itself to hand", async () => {
L83: const s = setupEngine(
L88: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L89: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-031"), 2000);
L91: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-060")).toBe(true);
L92: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-031")).toBe(true);
L95: it("Security leaves a black Digimon above 2000 DP in the trash", async () => {
L96: const s = setupEngine(
L101: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L102: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-031"), 2000);
L104: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-062")).toBe(false);
L105: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-062")).toBe(true);
L108: it("matches committed metadata and publishes fully covered compiled IR", () => {
L111: expect(definition?.nameEn).toBe("Black Scramble");
L112: expect(definition?.colors).toEqual(["Black"]);
L113: expect(definition?.playCost).toBe(2);
L114: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L115: expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-031.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-031", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-032 — Purple Scramble — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-032",
  "set": "LM",
  "nameEn": "Purple Scramble",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "Option"
  ],
  "effectText": "[Main] 1 of your purple Digimon may digivolve into a purple Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 purple Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 purple Digimon card with 2000 DP or less from your trash without paying the cost.",
  "securityEffectText": "[Security] You may play 1 purple Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-032"
}
```
2. **Exact printed surfaces:**
   - Main: "[Main] 1 of your purple Digimon may digivolve into a purple Digimon card in the hand with the digivolution cost reduced by 3. Then, place this card in the battle area.\n[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 purple Digimon card from your trash to the top of the deck. Then, if you don't have a Digimon, you may play 1 purple Digimon card with 2000 DP or less from your trash without paying the cost."
   - Security: "[Security] You may play 1 purple Digimon card with 2000 DP or less from your trash without paying the cost. Then, add this card to the hand."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-032`

```text
LM-032 Purple Scramble
  Q&A (5):
    Q4058 (2024-05-24): When I use this card's [Main] effect to digivolve into a card in my hand, can it digivolve regardless of its digivolution requirements?
      A: No, this card's [Main] effect does not allow ignoring digivolution requirements, so you can only digivolve into a card that meets the digivolution requirements.
    Q4059 (2024-05-24): Can I use this card's [Main] effect to burst digivolve or DNA digivolve into a card in my hand?
      A: No, you can't burst digivolve or DNA digivolve.
    Q4060 (2024-05-24): Can I use this card's [Main] effect to digivolve a Tamer into a Digimon card with a "your Tamer is treated as a Digimon and can digivolve" effect?
      A: No, you can't. This card's [Main] effect digivolves 1 Digimon. It doesn't digivolve Tamers.
    Q4061 (2024-05-24): Can I activate this card's <Delay> effect if I don't have any purple Digimon cards in my trash?
      A: Yes, you can.
    Q4062 (2024-05-24): Can I use this card's <Delay> effect to play a purple Digimon card with 2000 DP or less from my trash without returning a Digimon card from my trash to the top of the deck?
      A: No, you can't. You must perform "return 1 purple Digimon card from your trash to the top of the deck" whenever possible.
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-032.ts`; triggers Main, StartOfYourTurn, Security; action/condition kinds Digivolve, PlaceInBattleAreaSelf, Return, PlayWithoutCost, AddToHandSelf. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Main",
L14: kind: "Digivolve",
L18: kind: ["Digimon"],
L25: kind: ["Digimon"],
L30: optional: true,
L33: kind: "PlaceInBattleAreaSelf",
L38: trigger: "StartOfYourTurn",
L41: kind: "Return",
L46: kind: ["Digimon"],
L56: kind: "PlayWithoutCost",
L60: kind: ["Digimon"],
L71: condition: {
L72: kind: "youHaveNone",
L75: kind: ["Digimon"],
L79: optional: true,
L88: condition: {
L89: kind: "opponentHas",
L92: kind: ["Digimon"],
L98: trigger: "Security",
L101: kind: "PlayWithoutCost",
L105: kind: ["Digimon"],
L116: optional: true,
L119: kind: "AddToHandSelf",
L129: registerIrCard("LM-032", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-032.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
L14: expect(mainPhase.isOpen).toBe(true);
L18: async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
L22: const ended = s.engine.applyIntent(0, { type: "endPhase" });
L29: it("digivolves a purple Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
L30: const s = setupEngine(
L38: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L41: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-075"), 2000);
L43: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-075")).toBe(true);
L44: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-032")).toBe(true);
L45: expect(s.state.memory).toBe(0);
L48: it("Delay returns a purple Digimon to the deck top and then revives a small one", async () => {
L49: const s = setupEngine(
L60: await settle(() => s.state.players[0]!.deck.length === 1, 2000);
L62: expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT11-075");
L63: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-071")).toBe(true);
L67: it("does not activate Delay when the opponent has no Digimon", async () => {
L68: const s = setupEngine(
L77: expect(s.state.players[0]!.deck).toHaveLength(0);
L78: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-071")).toBe(true);
L82: it("Security plays a qualifying purple Digimon from trash and returns itself to hand", async () => {
L83: const s = setupEngine(
L88: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L89: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-032"), 2000);
L91: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-071")).toBe(true);
L92: expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-032")).toBe(true);
L95: it("Security leaves a purple Digimon above 2000 DP in the trash", async () => {
L96: const s = setupEngine(
L101: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L102: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-032"), 2000);
L104: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-075")).toBe(false);
L105: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-075")).toBe(true);
L108: it("matches committed metadata and publishes fully covered compiled IR", () => {
L111: expect(definition?.nameEn).toBe("Purple Scramble");
L112: expect(definition?.colors).toEqual(["Purple"]);
L113: expect(definition?.playCost).toBe(2);
L114: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L115: expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-032.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-032", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `6ddf4043b chore(LM): satisfy the repo typecheck and style gates for the audit files`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-033 — Garnet Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-033",
  "set": "LM",
  "nameEn": "Garnet Memory Boost!",
  "colors": [
    "Red"
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
    "Option"
  ],
  "effectText": "This card may also have its color requirements met by black.\n[Main] Reveal the top 3 cards of your deck. Add 1 red or black Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-033"
}
```
2. **Exact printed surfaces:**
   - Main: "This card may also have its color requirements met by black.\n[Main] Reveal the top 3 cards of your deck. Add 1 red or black Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-033`

```text
LM-033 Garnet Memory Boost!
  Q&A (2):
    Q4063 (2024-08-01): What does this card's 1st effect do, exactly?
      A: To meet color requirements, normally you must have a Digimon or Tamer in your area that's the same color as the corresponding Option card. However, with this effect, this card's color requirements are met when you have a black Digimon or Tamer in the area.
    Q4064 (2024-08-01): Does this card's 1st effect mean that this card's color requirements are met even when I have a black Digimon in the breeding area?
      A: Yes, the color requirements are met when you have a black Digimon in the breeding area.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-033.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L27: trigger: "Main",
L30: kind: "RevealAdd",
L36: kind: ["Digimon"],
L46: kind: "PlaceInBattleAreaSelf",
L51: trigger: "Main",
L54: kind: "GainMemory",
L66: trigger: "Security",
L69: kind: "PlaceInBattleAreaSelf",
L79: registerIrCard("LM-033", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-033.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a red or black Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-028", "BT10-017"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-033")).toBe(true);
L35: it("can be used with only a black colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a black Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no red or black colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-033"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-033")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Garnet Memory Boost!");
L108: expect(definition?.colors).toEqual(["Red"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "black" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-033.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-033", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa7374262 fix(engine): make an extra colour meet an Option's colour requirement`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-034 — Wisteria Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-034",
  "set": "LM",
  "nameEn": "Wisteria Memory Boost!",
  "colors": [
    "Blue"
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
    "Option"
  ],
  "effectText": "This card may also have its color requirements met by red.\n[Main] Reveal the top 3 cards of your deck. Add 1 blue or red Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-034"
}
```
2. **Exact printed surfaces:**
   - Main: "This card may also have its color requirements met by red.\n[Main] Reveal the top 3 cards of your deck. Add 1 blue or red Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-034`

```text
LM-034 Wisteria Memory Boost!
  Q&A (2):
    Q4065 (2024-08-01): What does this card's 1st effect do, exactly?
      A: To meet color requirements, normally you must have a Digimon or Tamer in your area that's the same color as the corresponding Option card. However, with this effect, this card's color requirements are met when you have a red Digimon or Tamer in the area.
    Q4066 (2024-08-01): Does this card's 1st effect mean that this card's color requirements are met even when I have a red Digimon in the breeding area?
      A: Yes, the color requirements are met when you have a red Digimon in the breeding area.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-034.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L27: trigger: "Main",
L30: kind: "RevealAdd",
L36: kind: ["Digimon"],
L46: kind: "PlaceInBattleAreaSelf",
L51: trigger: "Main",
L54: kind: "GainMemory",
L66: trigger: "Security",
L69: kind: "PlaceInBattleAreaSelf",
L79: registerIrCard("LM-034", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-034.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a blue or red Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-047", "BT1-050"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-034")).toBe(true);
L35: it("can be used with only a red colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a red Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no blue or red colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-034"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-034")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Wisteria Memory Boost!");
L108: expect(definition?.colors).toEqual(["Blue"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "red" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-034.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-034", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa7374262 fix(engine): make an extra colour meet an Option's colour requirement`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-035 — Amber Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-035",
  "set": "LM",
  "nameEn": "Amber Memory Boost!",
  "colors": [
    "Yellow"
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
    "Option"
  ],
  "effectText": "This card may also have its color requirements met by purple.\n[Main] Reveal the top 3 cards of your deck. Add 1 yellow or purple Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-035"
}
```
2. **Exact printed surfaces:**
   - Main: "This card may also have its color requirements met by purple.\n[Main] Reveal the top 3 cards of your deck. Add 1 yellow or purple Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-035`

```text
LM-035 Amber Memory Boost!
  Q&A (2):
    Q4067 (2024-08-01): What does this card's 1st effect do, exactly?
      A: To meet color requirements, normally you must have a Digimon or Tamer in your area that's the same color as the corresponding Option card. However, with this effect, this card's color requirements are met when you have a purple Digimon or Tamer in the area.
    Q4068 (2024-08-01): Does this card's 1st effect mean that this card's color requirements are met even when I have a purple Digimon in the breeding area?
      A: Yes, the color requirements are met when you have a purple Digimon in the breeding area.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-035.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L27: trigger: "Main",
L30: kind: "RevealAdd",
L36: kind: ["Digimon"],
L46: kind: "PlaceInBattleAreaSelf",
L51: trigger: "Main",
L54: kind: "GainMemory",
L66: trigger: "Security",
L69: kind: "PlaceInBattleAreaSelf",
L79: registerIrCard("LM-035", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-035.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a yellow or purple Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-035")).toBe(true);
L35: it("can be used with only a purple colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a purple Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no yellow or purple colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-035"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-035")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Amber Memory Boost!");
L108: expect(definition?.colors).toEqual(["Yellow"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "purple" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-035.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-035", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa7374262 fix(engine): make an extra colour meet an Option's colour requirement`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-036 — Jade Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-036",
  "set": "LM",
  "nameEn": "Jade Memory Boost!",
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
    "Option"
  ],
  "effectText": "This card may also have its color requirements met by blue.\n[Main] Reveal the top 3 cards of your deck. Add 1 green or blue Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-036"
}
```
2. **Exact printed surfaces:**
   - Main: "This card may also have its color requirements met by blue.\n[Main] Reveal the top 3 cards of your deck. Add 1 green or blue Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-036`

```text
LM-036 Jade Memory Boost!
  Q&A (2):
    Q4069 (2024-08-01): What does this card's 1st effect do, exactly?
      A: To meet color requirements, normally you must have a Digimon or Tamer in your area that's the same color as the corresponding Option card. However, with this effect, this card's color requirements are met when you have a blue Digimon or Tamer in the area.
    Q4070 (2024-08-01): Does this card's 1st effect mean that this card's color requirements are met even when I have a blue Digimon in the breeding area?
      A: Yes, the color requirements are met when you have a blue Digimon in the breeding area.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-036.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L27: trigger: "Main",
L30: kind: "RevealAdd",
L36: kind: ["Digimon"],
L46: kind: "PlaceInBattleAreaSelf",
L51: trigger: "Main",
L54: kind: "GainMemory",
L66: trigger: "Security",
L69: kind: "PlaceInBattleAreaSelf",
L79: registerIrCard("LM-036", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-036.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a green or blue Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-036")).toBe(true);
L35: it("can be used with only a blue colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a blue Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no green or blue colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-036"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-036")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Jade Memory Boost!");
L108: expect(definition?.colors).toEqual(["Green"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "blue" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-036.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-036", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa7374262 fix(engine): make an extra colour meet an Option's colour requirement`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-037 — Sepia Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-037",
  "set": "LM",
  "nameEn": "Sepia Memory Boost!",
  "colors": [
    "Black"
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
    "Option"
  ],
  "effectText": "This card may also have its color requirements met by yellow.\n[Main] Reveal the top 3 cards of your deck. Add 1 black or yellow Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-037"
}
```
2. **Exact printed surfaces:**
   - Main: "This card may also have its color requirements met by yellow.\n[Main] Reveal the top 3 cards of your deck. Add 1 black or yellow Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-037`

```text
LM-037 Sepia Memory Boost!
  Q&A (2):
    Q4071 (2024-08-01): What does this card's 1st effect do, exactly?
      A: To meet color requirements, normally you must have a Digimon or Tamer in your area that's the same color as the corresponding Option card. However, with this effect, this card's color requirements are met when you have a yellow Digimon or Tamer in the area.
    Q4072 (2024-08-01): Does this card's 1st effect mean that this card's color requirements are met even when I have a yellow Digimon in the breeding area?
      A: Yes, the color requirements are met when you have a yellow Digimon in the breeding area.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-037.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L27: trigger: "Main",
L30: kind: "RevealAdd",
L36: kind: ["Digimon"],
L46: kind: "PlaceInBattleAreaSelf",
L51: trigger: "Main",
L54: kind: "GainMemory",
L66: trigger: "Security",
L69: kind: "PlaceInBattleAreaSelf",
L79: registerIrCard("LM-037", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-037.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a black or yellow Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-037")).toBe(true);
L35: it("can be used with only a yellow colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a yellow Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no black or yellow colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-037"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-037")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Sepia Memory Boost!");
L108: expect(definition?.colors).toEqual(["Black"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "yellow" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-037.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-037", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa7374262 fix(engine): make an extra colour meet an Option's colour requirement`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-038 — Grape Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-038",
  "set": "LM",
  "nameEn": "Grape Memory Boost!",
  "colors": [
    "Purple"
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
    "Option"
  ],
  "effectText": "This card may also have its color requirements met by green.\n[Main] Reveal the top 3 cards of your deck. Add 1 purple or green Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-038"
}
```
2. **Exact printed surfaces:**
   - Main: "This card may also have its color requirements met by green.\n[Main] Reveal the top 3 cards of your deck. Add 1 purple or green Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-038`

```text
LM-038 Grape Memory Boost!
  Q&A (2):
    Q4073 (2024-08-01): What does this card's 1st effect do, exactly?
      A: To meet color requirements, normally you must have a Digimon or Tamer in your area that's the same color as the corresponding Option card. However, with this effect, this card's color requirements are met when you have a green Digimon or Tamer in the area.
    Q4074 (2024-08-01): Does this card's 1st effect mean that this card's color requirements are met even when I have a green Digimon in the breeding area?
      A: Yes, the color requirements are met when you have a green Digimon in the breeding area.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-038.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L27: trigger: "Main",
L30: kind: "RevealAdd",
L36: kind: ["Digimon"],
L46: kind: "PlaceInBattleAreaSelf",
L51: trigger: "Main",
L54: kind: "GainMemory",
L66: trigger: "Security",
L69: kind: "PlaceInBattleAreaSelf",
L79: registerIrCard("LM-038", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT17-095 (Option), BT17-096 (Option), BT17-097 (Option), BT17-099 (Option). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-038.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a purple or green Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT2-067"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-067")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-038")).toBe(true);
L35: it("can be used with only a green colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a green Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no purple or green colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-038"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-038")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Grape Memory Boost!");
L108: expect(definition?.colors).toEqual(["Purple"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "green" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-038.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-038", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `fa7374262 fix(engine): make an extra colour meet an Option's colour requirement`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-039 — Valkyrimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-039",
  "set": "LM",
  "nameEn": "Valkyrimon",
  "colors": [
    "Red",
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
      "color": "Red",
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
    "Free"
  ],
  "types": [
    "Warrior"
  ],
  "effectText": "[Digivolve] [Silphymon]: Cost 3 \n\n[When Digivolving] ＜Blitz＞ \n[When Digivolving] [When Attacking] [Once Per Turn] Return 1 of your opponent's Digimon with 8000 DP or less to the bottom of the deck. If this effect didn't return, this Digimon gains ＜Security A. +1＞ for the turn.\n[Your Turn] This Digimon's attack target can't change.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-039"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Silphymon]: Cost 3 \n\n[When Digivolving] ＜Blitz＞ \n[When Digivolving] [When Attacking] [Once Per Turn] Return 1 of your opponent's Digimon with 8000 DP or less to the bottom of the deck. If this effect didn't return, this Digimon gains ＜Security A. +1＞ for the turn.\n[Your Turn] This Digimon's attack target can't change."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-039`

```text
LM-039 Valkyrimon
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-039.ts`; triggers WhenDigivolving, WhenAttacking, YourTurn; action/condition kinds Return, GainKeyword, Restrict. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "WhenDigivolving",
L21: trigger: "WhenDigivolving",
L24: kind: "Return",
L28: kind: ["Digimon"],
L39: kind: "GainKeyword",
L52: duration: "forTheTurn",
L53: condition: {
L54: kind: "ifThisEffectDidNotAct",
L59: frequency: "OncePerTurn",
L60: sharedUseKey: "ir-shared-0",
L63: trigger: "WhenAttacking",
L66: kind: "Return",
L70: kind: ["Digimon"],
L81: kind: "GainKeyword",
L94: duration: "forTheTurn",
L95: condition: {
L96: kind: "ifThisEffectDidNotAct",
L101: frequency: "OncePerTurn",
L102: sharedUseKey: "ir-shared-0",
L105: trigger: "YourTurn",
L108: kind: "Restrict",
L117: duration: "permanent",
L124: digivolutionRequirement: [
L127: cost: 3,
L133: registerIrCard("LM-039", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-015 (Warrior), BT13-067 (Warrior), BT16-013 (Warrior), BT17-022 (Warrior). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-039.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L14: it("returns an opposing Digimon at 8000 DP or less to the bottom of its deck", async () => {
L15: const s = setupEngine(
L26: expect(
L27: s.engine.applyIntent(0, {
L33: await settle(
L39: expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
L42: it("grants Security Attack +1 when the return clause has no valid target", async () => {
L43: const s = setupEngine(
L53: expect(
L54: s.engine.applyIntent(0, {
L60: await settle(() => observe(s.engine).keywordAmount(base, "SecurityAttack") === 1);
L62: expect(observe(s.engine).keywordAmount(base, "SecurityAttack")).toBe(1);
L65: it("leaves an opposing Digimon above 8000 DP alone and grants Security Attack +1 instead", async () => {
L66: const s = setupEngine(
L76: await settle(() => observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack") === 1, 2000);
L78: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L79: expect(observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack")).toBe(1);
L82: it("shares one once-per-turn budget between the digivolving and attacking windows", async () => {
L83: const s = setupEngine(
L98: await settle(() => s.state.players[1]!.battleArea.length === 1, 2000);
L101: await settle(() => s.state.pendingDecision === null);
L103: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L106: it("stops its own attack target from being changed on its controller's turn", async () => {
L107: const s = setupEngine(
L115: expect(observe(s.engine).isRestricted(s.perm("valkyrimon"), "attackTargetChange")).toBe(true);
L118: it("matches committed metadata and publishes fully covered compiled IR", () => {
L121: expect(definition?.nameEn).toBe("Valkyrimon");
L122: expect(definition?.colors).toEqual(["Red", "Blue"]);
L123: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "Blitz" }] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-039.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-039", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `48087474a fix(LM-040,LM-042): correct the security debuff, stack compare and self-place`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-040 — Vikemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-040",
  "set": "LM",
  "nameEn": "Vikemon",
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
    "Free"
  ],
  "types": [
    "Beastkin",
    "Sea Beast"
  ],
  "effectText": "[Digivolve] [Shakkoumon]/[Zudomon]: Cost 3 \n\n＜Iceclad＞ \n[When Digivolving] Trash any 4 digivolution cards from your opponent's Digimon.\n[When Attacking] [Once Per Turn] If your opponent has no Digimon with as many or more digivolution cards as this Digimon, it unsuspends. Then, all of your opponent's Security Digimon get -6000 DP for the turn.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-040"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Shakkoumon]/[Zudomon]: Cost 3 \n\n＜Iceclad＞ \n[When Digivolving] Trash any 4 digivolution cards from your opponent's Digimon.\n[When Attacking] [Once Per Turn] If your opponent has no Digimon with as many or more digivolution cards as this Digimon, it unsuspends. Then, all of your opponent's Security Digimon get -6000 DP for the turn."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-040`

```text
LM-040 Vikemon
  Q&A (1):
    Q4843 (2025-06-13): Can I process the part of the effect after "then" in this card's [When Attacking] effect even if the "if" condition in the 1st process isn't met?
      A: Yes, you can process it. Even if your opponent has a Digimon with more digivolution cards than this card, this card's [When Attacking] effect will still give all of your opponent's Security Digimon -6000 DP for the turn.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-040.ts`; triggers Static, WhenDigivolving, WhenAttacking; action/condition kinds TrashDigivolution, Unsuspend, ModifySecurityDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Static",
L20: trigger: "WhenDigivolving",
L23: kind: "TrashDigivolution",
L27: kind: ["Digimon"],
L40: trigger: "WhenAttacking",
L44: kind: "Unsuspend",
L50: condition: {
L51: kind: "opponentHasNone",
L57: kind: ["Digimon"],
L67: kind: "ModifySecurityDP",
L70: duration: "forTheTurn",
L73: frequency: "OncePerTurn",
L78: digivolutionRequirement: [
L81: cost: 3,
L87: registerIrCard("LM-040", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT1-030 (Sea Beast), BT1-034 (Sea Beast), BT1-035 (Beastkin), BT1-037 (Beastkin). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-040.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("trashes any four opposing digivolution cards across the opponent's Digimon", async () => {
L11: const s = setupEngine(
L25: await settle(() => s.state.players[1]!.trash.length === 4, 2000);
L27: expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(4);
L28: expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(0);
L31: it("unsuspends itself when no opposing Digimon matches its stack depth", async () => {
L32: const s = setupEngine(
L42: await settle(() => !s.perm("vikemon").isSuspended, 2000);
L44: expect(s.perm("vikemon").isSuspended).toBe(false);
L47: it("stays suspended while the opponent matches its stack depth", async () => {
L48: const s = setupEngine(
L58: await settle(() => s.state.pendingDecision === null);
L60: expect(s.perm("vikemon").isSuspended).toBe(true);
L63: it("still applies -6000 to the opponent's Security Digimon when the unsuspend condition fails, per Q4843", async () => {
L64: const s = setupEngine(
L74: await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);
L76: expect(observe(s.engine).securityDp(1)).toBe(-6000);
L79: it("spends the attacking clause only once per turn", async () => {
L80: const s = setupEngine(
L90: await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);
L92: await settle(() => s.state.pendingDecision === null);
L94: expect(observe(s.engine).securityDp(1)).toBe(-6000);
L97: it("matches committed metadata and publishes fully covered compiled IR", () => {
L100: expect(definition?.nameEn).toBe("Vikemon");
L101: expect(definition?.colors).toEqual(["Blue", "Yellow"]);
L102: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L103: expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "IceClad" }] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-040.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-040", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `48087474a fix(LM-040,LM-042): correct the security debuff, stack compare and self-place`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-041 — Regalecusmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-041",
  "set": "LM",
  "nameEn": "Regalecusmon",
  "colors": [
    "Blue",
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
      "color": "Blue",
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
    "Aquatic",
    "DS"
  ],
  "effectText": "[Digivolve] Lv.5 w/[DS] trait: Cost 3 \n\n[On Play] [When Digivolving] 1 of your Digimon with the [DS] trait unsuspends.\n[When Digivolving] [When Attacking] [Once Per Turn] If you have 1 or more memory, your opponent adds their top security card to the hand. Then, if you have 1 or less, until your opponent's turn ends, 1 of their Digimon or Tamers can't be suspended.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-041"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[DS] trait: Cost 3 \n\n[On Play] [When Digivolving] 1 of your Digimon with the [DS] trait unsuspends.\n[When Digivolving] [When Attacking] [Once Per Turn] If you have 1 or more memory, your opponent adds their top security card to the hand. Then, if you have 1 or less, until your opponent's turn ends, 1 of their Digimon or Tamers can't be suspended."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-041`

```text
LM-041 Regalecusmon
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
   - `node tools/kb/query.mjs rules "attack battle keyword timing" --limit 3`

```text
[comprehensive §11-1] Attack Procedure  (9.033)
  11-1. Attack Procedure 11-1-1. This is a rule where a player can attack a chosen target21 Digimon in the battle area. 11-1-2. Only the turn player can attack. 11-1-3. An attack proceeds using the following timings: Attack declaration, counter timing, block timing, confirming if t…

[glossary] Keyword Effects<Blocker>  (8.709)
  battle with one of your opponent’s Digimon, it deletes that Digimon, regardless of DP. <Digi-Burst X> Trash X of this Digimon's digivolution cards to activate the effect below. A Digimon with this effect has a <Digi-Burst> effect you can activate by trashing the specified number …

[manual] Official Rule Manual  (8.681)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…
```
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-041.ts`; triggers OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds Unsuspend, SecurityManipulation, Restrict. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L7: trigger: "OnPlay",
L10: kind: "Unsuspend",
L14: kind: ["Digimon"],
L28: trigger: "WhenDigivolving",
L31: kind: "Unsuspend",
L35: kind: ["Digimon"],
L49: trigger: "WhenDigivolving",
L52: kind: "SecurityManipulation",
L56: condition: {
L57: kind: "memoryAtLeast",
L62: kind: "Restrict",
L66: kind: ["Digimon", "Tamer"],
L71: duration: "untilOpponentTurnEnd",
L72: condition: {
L73: kind: "memoryAtMost",
L78: frequency: "OncePerTurn",
L79: sharedUseKey: "ir-shared-0",
L82: trigger: "WhenAttacking",
L85: kind: "SecurityManipulation",
L89: condition: {
L90: kind: "memoryAtLeast",
L95: kind: "Restrict",
L99: kind: ["Digimon", "Tamer"],
L104: duration: "untilOpponentTurnEnd",
L105: condition: {
L106: kind: "memoryAtMost",
L111: frequency: "OncePerTurn",
L112: sharedUseKey: "ir-shared-0",
L117: digivolutionRequirement: [
L121: cost: 3,
L127: registerIrCard("LM-041", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX8-021 (Aquatic/DS), EX8-024 (Aquatic/DS), EX8-026 (DS/Aquatic), EX8-029 (DS/Aquatic). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-041.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("unsuspends a DS Digimon, returns security, and restricts an opposing permanent at 1 memory", async () => {
L11: const s = setupEngine(
L26: await settle(
L32: expect(s.perm("ds").isSuspended).toBe(false);
L33: expect(s.state.players[1]!.hand).toHaveLength(1);
L35: expect(opponent).toBeDefined();
L36: expect(observe(s.engine).isRestricted(opponent!, "beSuspended")).toBe(true);
L39: it("does not hand back security while its controller has no memory", async () => {
L40: const s = setupEngine(
L51: await settle(() => s.state.pendingDecision === null);
L53: expect(s.state.players[1]!.hand).toHaveLength(0);
L54: expect(s.state.players[1]!.security).toHaveLength(1);
L57: it("skips the suspend lock above one memory", async () => {
L58: const s = setupEngine(
L69: await settle(() => s.state.players[1]!.hand.length === 1, 2000);
L71: expect(s.state.players[1]!.hand).toHaveLength(1);
L72: expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(false);
L75: it("unsuspends a DS Digimon when played", async () => {
L76: const s = setupEngine(
L90: await settle(() => !s.perm("ds").isSuspended, 2000);
L92: expect(s.perm("ds").isSuspended).toBe(false);
L95: it("matches committed metadata and publishes fully covered compiled IR", () => {
L98: expect(definition?.nameEn).toBe("Regalecusmon");
L99: expect(definition?.colors).toEqual(["Blue", "Black"]);
L100: expect(definition?.types).toEqual(["Aquatic", "DS"]);
L101: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-041.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-041", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `48087474a fix(LM-040,LM-042): correct the security debuff, stack compare and self-place`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-042 — Rasielmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-042",
  "set": "LM",
  "nameEn": "Rasielmon",
  "colors": [
    "Green",
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
      "color": "Green",
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
    "Throne",
    "Three Great Angels"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Angel]/[Archangel] trait: Cost 3 \n\n＜Security A. +1＞ \n[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, until their turn ends, 1 of their Digimon or Tamers can't activate [When Digivolving] effects or unsuspend.\n[On Deletion] Place this card as the bottom security card.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-042"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Angel]/[Archangel] trait: Cost 3 \n\n＜Security A. +1＞ \n[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, until their turn ends, 1 of their Digimon or Tamers can't activate [When Digivolving] effects or unsuspend.\n[On Deletion] Place this card as the bottom security card."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-042`

```text
LM-042 Rasielmon
  Q&A (5):
    Q5746 (2025-12-25): What does "[When Digivolving] effects don't activate" mean, exactly?
      A: This effect prevents [When Digivolving] effects on cards from activating. [When Digivolving] effects can no longer activate by triggering or when effects such as "activate that card's [When Digivolving]" effect" activate.
    Q5747 (2025-12-25): I used a card affected by "can't activate [When Digivolving] effects" to attack. Can I activate that card's [When Digivolving] [When Attacking] effect at such times?
      A: Yes, you can. The effect can activate if it activates upon the [When Attacking] timing.
    Q5748 (2025-12-25): If a card is affected by "can't activate [When Digivolving] effects," can other effects activate its [When Digivolving] effect?
      A: No, it can't be activated.
    Q5749 (2025-12-25): If a card is affected by "can't activate [When Digivolving] effects," can I process just the "by" condition in its [When Digivolving] effect?
      A: No, you can't.
    Q5750 (2025-12-25): A card that was given "can't activate [When Digivolving] effects" digivolved into a card that has a [When Digivolving] [When Attacking] [Once Per Turn] effect. Does that count as an instance of that effect's [X Per Turn] even if that effect can't be activated upon the timing when that card digivolved?
      A: No, it doesn't count. The effect can't activate upon the [When Digivolving] timing, therefore it doesn't count as an instance of that effect's [X Per Turn].
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
   - `node tools/kb/query.mjs rules "suspend unsuspend restriction timing" --limit 3`

```text
[glossary] Keyword Effects<Blocker>  (9.304)
  of your Digimon digivolves into this card from your hand, you may suspend of your 1 Digimon to reduce the memory cost of the digivolution by x. When digivolving into a card in your hand with this effect, you may suspend 1 of your Digimon to reduce the digivolve cost by the number…

[comprehensive §6-2] Unsuspend Phase  (8.581)
  6-2. Unsuspend Phase 6-2-1. The turn starts with the turn player unsuspending all of their Digimon and Tamers on the field at the same time. 6-2-1-1. If there are any rules or effects to be processed when the turn starts, the processing takes place before the unsuspending process…

[glossary] Properties Common to All Card Types  (8.451)
  … one turn, the effect could only be activated once. Different effects with the Once Per Turn restriction can still be activated in the same turn. Also, if two separate Digimon possess the same effect with a Once Per Turn restriction, they can each be activated once during the sam…
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-042.ts`; triggers Static, OnPlay, WhenDigivolving, OnDeletion; action/condition kinds Suspend, SelectBind, Restrict, SecurityManipulation. Clause-bearing lines:

```text
L9: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L24: trigger: "OnPlay",
L27: kind: "Suspend",
L31: kind: ["Digimon", "Tamer"],
L38: kind: "SelectBind",
L40: filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
L46: kind: "Restrict",
L52: duration: "untilOpponentTurnEnd",
L55: kind: "Restrict",
L61: duration: "untilOpponentTurnEnd",
L66: trigger: "WhenDigivolving",
L69: kind: "Suspend",
L73: kind: ["Digimon", "Tamer"],
L80: kind: "SelectBind",
L82: filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
L88: kind: "Restrict",
L94: duration: "untilOpponentTurnEnd",
L97: kind: "Restrict",
L103: duration: "untilOpponentTurnEnd",
L108: trigger: "OnDeletion",
L111: kind: "SecurityManipulation",
L124: digivolutionRequirement: [
L128: cost: 3,
L133: registerIrCard("LM-042", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT2-040 (Throne/Three Great Angels), EX6-027 (Throne/Three Great Angels), P-053 (Throne/Three Great Angels), BT1-063 (Three Great Angels). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-042.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("suspends one opposing permanent and locks one from unsuspending or digivolving", async () => {
L11: const s = setupEngine(
L20: await settle(() => s.perm("opponent").isSuspended, 2000);
L22: expect(s.perm("opponent").isSuspended).toBe(true);
L23: expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
L24: expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(true);
L27: it("puts both halves of the lock on the same chosen permanent", async () => {
L29: const s = setupEngine(
L45: await settle(() => observe(s.engine).isRestricted(s.perm("second"), "unsuspend"), 2000);
L47: expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(true);
L48: expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(true);
L49: expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(false);
L50: expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(false);
L53: it("places itself as the bottom security card when deleted", async () => {
L54: const s = setupEngine(
L63: await settle(() => s.state.players[0]!.security.length === 2, 2000);
L65: expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "LM-042"]);
L66: expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-042")).toBe(false);
L69: it("matches committed metadata and publishes fully covered compiled IR", () => {
L72: expect(definition?.nameEn).toBe("Rasielmon");
L73: expect(definition?.colors).toEqual(["Green", "Yellow"]);
L74: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L75: expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "SecurityAttack", amount: 1 }] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-042.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-042", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `48087474a fix(LM-040,LM-042): correct the security debuff, stack compare and self-place`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-043 — Darkdramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-043",
  "set": "LM",
  "nameEn": "Darkdramon",
  "colors": [
    "Black",
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 7,
  "dp": 12000,
  "evoCosts": [
    {
      "color": "Black",
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
    "Virus"
  ],
  "types": [
    "Cyborg",
    "D-Brigade",
    "ACCEL"
  ],
  "effectText": "[Digivolve] Lv.5 w/[D-Brigade]/[ACCEL] trait: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞.\n＜Scapegoat＞ \n[On Play] [When Digivolving] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, delete all of their Digimon with the lowest play cost.",
  "inheritedEffectText": "＜Collision＞.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-043",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[D-Brigade]/[ACCEL] trait: Cost 3 \n\n[Hand] [Counter] ＜Blast Digivolve＞.\n＜Scapegoat＞ \n[On Play] [When Digivolving] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, delete all of their Digimon with the lowest play cost."
   - Inherited: "＜Collision＞."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-043`

```text
LM-043 Darkdramon
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-043.ts`; triggers Counter, Static, OnPlay, WhenDigivolving; action/condition kinds DeDigivolve, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Counter",
L22: trigger: "Static",
L32: trigger: "OnPlay",
L35: kind: "DeDigivolve",
L39: kind: ["Digimon"],
L46: kind: "Delete",
L50: kind: ["Digimon"],
L59: trigger: "WhenDigivolving",
L62: kind: "DeDigivolve",
L66: kind: ["Digimon"],
L73: kind: "Delete",
L77: kind: ["Digimon"],
L86: trigger: "Static",
L99: digivolutionRequirement: [
L103: cost: 3,
L109: registerIrCard("LM-043", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-063 (Cyborg/D-Brigade/ACCEL), BT25-067 (Cyborg/D-Brigade/ACCEL), BT14-056 (Cyborg/D-Brigade), BT14-060 (Cyborg/D-Brigade). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-043.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("de-digivolves one opponent and deletes all of their lowest-play-cost Digimon", async () => {
L11: const s = setupEngine(
L25: await settle(() => s.state.players[1]!.battleArea.length === 0);
L27: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L28: expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(2);
L31: it("de-digivolves before choosing the lowest play cost, so the reduced Digimon can be the target", async () => {
L32: const s = setupEngine(
L42: await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
L45: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L48: it("carries Blast Digivolve, Scapegoat and the inherited Collision", async () => {
L49: const s = setupEngine(
L56: expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
L59: it("matches committed metadata and publishes fully covered compiled IR", () => {
L62: expect(definition?.nameEn).toBe("Darkdramon");
L63: expect(definition?.colors).toEqual(["Black", "Purple"]);
L64: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L65: expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "BlastDigivolve" }] });
L66: expect(compiled?.effects[1]).toMatchObject({ keywords: [{ keyword: "Scapegoat" }] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-043.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-043", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `48087474a fix(LM-040,LM-042): correct the security debuff, stack compare and self-place`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-044 — Ghoulmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-044",
  "set": "LM",
  "nameEn": "Ghoulmon",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 6,
  "dp": 11000,
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
    "Data"
  ],
  "types": [
    "Demon Lord",
    "Fallen Angel"
  ],
  "effectText": "[Hand] [Counter] ＜Blast Digivolve＞.\n＜Blocker＞.\n＜Retaliation＞ \n[On Deletion] If your opponent has 5 or more cards in their hand, they trash 1 card in their hand. Then, if they have 4 or fewer cards in their hand, delete 1 of their level 6 or lower Digimon.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-044",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[Hand] [Counter] ＜Blast Digivolve＞.\n＜Blocker＞.\n＜Retaliation＞ \n[On Deletion] If your opponent has 5 or more cards in their hand, they trash 1 card in their hand. Then, if they have 4 or fewer cards in their hand, delete 1 of their level 6 or lower Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-044`

```text
LM-044 Ghoulmon
  Q&A (1):
    Q4844 (2025-06-13): If the "if they have 4 or fewer cards in their hand," condition in this card's [On Deletion] effect is met, do I delete 1 of my opponent's level 6 or lower Digimon even if the "if" condition in the 1st process isn't met?
      A: Yes, you delete 1 of their level 6 or lower Digimon.
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
5. **Direct implementation:** `apps/api/src/cards/LM/LM-044.ts`; triggers Counter, Static, OnDeletion; action/condition kinds Trash, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Counter",
L22: trigger: "Static",
L32: trigger: "Static",
L42: trigger: "OnDeletion",
L45: kind: "Trash",
L54: condition: {
L55: kind: "zoneCount",
L64: kind: "Delete",
L68: kind: ["Digimon"],
L76: condition: {
L77: kind: "zoneCount",
L92: registerIrCard("LM-044", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: EX10-009 (Demon Lord/Fallen Angel), BT10-082 (Demon Lord), BT11-080 (Fallen Angel), BT11-083 (Fallen Angel). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-044.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L6: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("trashes one opposing hand card, then deletes a level 6 or lower Digimon", async () => {
L11: const s = setupEngine(
L24: await settle(
L30: expect(s.state.players[1]!.hand).toHaveLength(4);
L31: expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
L34: it("skips the discard but still deletes when the opponent already holds four cards", async () => {
L35: const s = setupEngine(
L49: await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId), 2000);
L53: expect(s.state.players[1]!.hand).toHaveLength(4);
L54: expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
L57: it("discards down to five and then deletes nothing", async () => {
L58: const s = setupEngine(
L72: await settle(() => s.state.players[1]!.hand.length === 5, 2000);
L74: expect(s.state.players[1]!.hand).toHaveLength(5);
L75: expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
L78: it("carries Blocker and Retaliation", async () => {
L79: const s = setupEngine(
L86: expect(observe(s.engine).hasKeyword(s.perm("ghoulmon"), "Blocker")).toBe(true);
L87: expect(observe(s.engine).hasKeyword(s.perm("ghoulmon"), "Retaliation")).toBe(true);
L90: it("matches committed metadata and publishes fully covered compiled IR", () => {
L93: expect(definition?.nameEn).toBe("Ghoulmon");
L94: expect(definition?.colors).toEqual(["Purple"]);
L95: expect(definition?.dp).toBe(11000);
L96: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L97: expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "BlastDigivolve" }] });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-044.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-044", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `48087474a fix(LM-040,LM-042): correct the security debuff, stack compare and self-place`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-045 — Vermilion Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-045",
  "set": "LM",
  "nameEn": "Vermilion Memory Boost!",
  "colors": [
    "Red"
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
    "-"
  ],
  "effectText": "Yellow also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 red or yellow Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-045"
}
```
2. **Exact printed surfaces:**
   - Main: "Yellow also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 red or yellow Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-045`

```text
LM-045 Vermilion Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-045.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L16: kind: "WaiveColorRequirement",
L23: trigger: "Main",
L26: kind: "RevealAdd",
L32: kind: ["Digimon"],
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "Main",
L50: kind: "GainMemory",
L62: trigger: "Security",
L65: kind: "PlaceInBattleAreaSelf",
L75: registerIrCard("LM-045", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-045.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a red or yellow Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-028", "BT10-017"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-045")).toBe(true);
L35: it("can be used with only a yellow colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a yellow Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no red or yellow colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-045"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-045")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Vermilion Memory Boost!");
L108: expect(definition?.colors).toEqual(["Red"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "yellow" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-045.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-045", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-046 — Navy Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-046",
  "set": "LM",
  "nameEn": "Navy Memory Boost!",
  "colors": [
    "Blue"
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
    "-"
  ],
  "effectText": "Purple also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 blue or Purple Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-046"
}
```
2. **Exact printed surfaces:**
   - Main: "Purple also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 blue or Purple Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-046`

```text
LM-046 Navy Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-046.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L16: kind: "WaiveColorRequirement",
L23: trigger: "Main",
L26: kind: "RevealAdd",
L32: kind: ["Digimon"],
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "Main",
L50: kind: "GainMemory",
L62: trigger: "Security",
L65: kind: "PlaceInBattleAreaSelf",
L75: registerIrCard("LM-046", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-046.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a blue or purple Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-046")).toBe(true);
L35: it("can be used with only a purple colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a purple Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no blue or purple colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-046"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-046")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Navy Memory Boost!");
L108: expect(definition?.colors).toEqual(["Blue"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "purple" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-046.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-046", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-047 — Chartreuse Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-047",
  "set": "LM",
  "nameEn": "Chartreuse Memory Boost!",
  "colors": [
    "Yellow"
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
    "-"
  ],
  "effectText": "Green also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 yellow or green Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-047"
}
```
2. **Exact printed surfaces:**
   - Main: "Green also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 yellow or green Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-047`

```text
LM-047 Chartreuse Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-047.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L16: kind: "WaiveColorRequirement",
L23: trigger: "Main",
L26: kind: "RevealAdd",
L32: kind: ["Digimon"],
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "Main",
L50: kind: "GainMemory",
L62: trigger: "Security",
L65: kind: "PlaceInBattleAreaSelf",
L75: registerIrCard("LM-047", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-047.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a yellow or green Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-047")).toBe(true);
L35: it("can be used with only a green colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a green Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no yellow or green colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-047"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-047")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Chartreuse Memory Boost!");
L108: expect(definition?.colors).toEqual(["Yellow"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "green" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-047.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-047", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-048 — Chrome Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-048",
  "set": "LM",
  "nameEn": "Chrome Memory Boost!",
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
    "-"
  ],
  "effectText": "Black also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 green or black Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-048"
}
```
2. **Exact printed surfaces:**
   - Main: "Black also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 green or black Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-048`

```text
LM-048 Chrome Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-048.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Static",
L15: kind: "WaiveColorRequirement",
L22: trigger: "Main",
L25: kind: "RevealAdd",
L29: filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green", "Black"] },
L36: { kind: "PlaceInBattleAreaSelf" },
L40: trigger: "Main",
L41: actions: [{ kind: "GainMemory", amount: 2 }],
L45: trigger: "Security",
L46: actions: [{ kind: "PlaceInBattleAreaSelf" }],
L54: registerIrCard("LM-048", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-048.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a green or black Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-048")).toBe(true);
L35: it("can be used with only a black colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a black Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no green or black colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-048"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-048")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Chrome Memory Boost!");
L108: expect(definition?.colors).toEqual(["Green"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "black" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-048.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-048", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-049 — Midnight Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-049",
  "set": "LM",
  "nameEn": "Midnight Memory Boost!",
  "colors": [
    "Black"
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
    "-"
  ],
  "effectText": "Blue also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 black or blue Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-049"
}
```
2. **Exact printed surfaces:**
   - Main: "Blue also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 black or blue Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-049`

```text
LM-049 Midnight Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-049.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Static",
L15: kind: "WaiveColorRequirement",
L22: trigger: "Main",
L25: kind: "RevealAdd",
L29: filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Black", "Blue"] },
L36: { kind: "PlaceInBattleAreaSelf" },
L40: trigger: "Main",
L41: actions: [{ kind: "GainMemory", amount: 2 }],
L45: trigger: "Security",
L46: actions: [{ kind: "PlaceInBattleAreaSelf" }],
L54: registerIrCard("LM-049", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-049.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a black or blue Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-049")).toBe(true);
L35: it("can be used with only a blue colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a blue Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no black or blue colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-049"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-049")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Midnight Memory Boost!");
L108: expect(definition?.colors).toEqual(["Black"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "blue" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-049.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-049", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-050 — Magenta Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-050",
  "set": "LM",
  "nameEn": "Magenta Memory Boost!",
  "colors": [
    "Purple"
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
    "-"
  ],
  "effectText": "Red also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 purple or red Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-050"
}
```
2. **Exact printed surfaces:**
   - Main: "Red also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 purple or red Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-050`

```text
LM-050 Magenta Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-050.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "Static",
L15: kind: "WaiveColorRequirement",
L22: trigger: "Main",
L25: kind: "RevealAdd",
L29: filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Purple", "Red"] },
L36: { kind: "PlaceInBattleAreaSelf" },
L40: trigger: "Main",
L41: actions: [{ kind: "GainMemory", amount: 2 }],
L45: trigger: "Security",
L46: actions: [{ kind: "PlaceInBattleAreaSelf" }],
L54: registerIrCard("LM-050", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-050.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a purple or red Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT2-067"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-067")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-028", "BT10-017"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-050")).toBe(true);
L35: it("can be used with only a red colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a red Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no purple or red colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-050"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-050")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Magenta Memory Boost!");
L108: expect(definition?.colors).toEqual(["Purple"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "red" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-050.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-050", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-051 — Alexandrite Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-051",
  "set": "LM",
  "nameEn": "Alexandrite Memory Boost!",
  "colors": [
    "Red"
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
    "-"
  ],
  "effectText": "Green also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 red or green Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-051"
}
```
2. **Exact printed surfaces:**
   - Main: "Green also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 red or green Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-051`

```text
LM-051 Alexandrite Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-051.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L16: kind: "WaiveColorRequirement",
L23: trigger: "Main",
L26: kind: "RevealAdd",
L32: kind: ["Digimon"],
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "Main",
L50: kind: "GainMemory",
L62: trigger: "Security",
L65: kind: "PlaceInBattleAreaSelf",
L75: registerIrCard("LM-051", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-051.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a red or green Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-028", "BT10-017"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-051")).toBe(true);
L35: it("can be used with only a green colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a green Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no red or green colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-051"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-051")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Alexandrite Memory Boost!");
L108: expect(definition?.colors).toEqual(["Red"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "green" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-051.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-051", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-052 — Malachite Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-052",
  "set": "LM",
  "nameEn": "Malachite Memory Boost!",
  "colors": [
    "Blue"
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
    "-"
  ],
  "effectText": "Yellow also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 blue or yellow Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-052"
}
```
2. **Exact printed surfaces:**
   - Main: "Yellow also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 blue or yellow Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-052`

```text
LM-052 Malachite Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-052.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L16: kind: "WaiveColorRequirement",
L23: trigger: "Main",
L26: kind: "RevealAdd",
L32: kind: ["Digimon"],
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "Main",
L50: kind: "GainMemory",
L62: trigger: "Security",
L65: kind: "PlaceInBattleAreaSelf",
L75: registerIrCard("LM-052", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-052.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a blue or yellow Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-052")).toBe(true);
L35: it("can be used with only a yellow colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a yellow Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no blue or yellow colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-052"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-052")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Malachite Memory Boost!");
L108: expect(definition?.colors).toEqual(["Blue"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "yellow" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-052.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-052", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-053 — Obsidian Memory Boost! — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-053",
  "set": "LM",
  "nameEn": "Obsidian Memory Boost!",
  "colors": [
    "Black"
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
    "-"
  ],
  "effectText": "Purple also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 black or purple Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory.",
  "securityEffectText": "[Security] Place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-053"
}
```
2. **Exact printed surfaces:**
   - Main: "Purple also meets this card's color requirements.\n[Main] Reveal the top 3 cards of your deck. Add 1 black or purple Digimon card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・Gain 2 memory."
   - Security: "[Security] Place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-053`

```text
LM-053 Obsidian Memory Boost!
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-053.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, GainMemory. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "Static",
L16: kind: "WaiveColorRequirement",
L23: trigger: "Main",
L26: kind: "RevealAdd",
L32: kind: ["Digimon"],
L42: kind: "PlaceInBattleAreaSelf",
L47: trigger: "Main",
L50: kind: "GainMemory",
L62: trigger: "Security",
L65: kind: "PlaceInBattleAreaSelf",
L75: registerIrCard("LM-053", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-053.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals three, adds a black or purple Digimon, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L28: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059"), 2000);
L30: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
L31: expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
L32: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-053")).toBe(true);
L35: it("can be used with only a purple colour source in play", async () => {
L36: const s = setupEngine(
L49: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L54: it("counts a purple Digimon in the breeding area too, per Q4064", async () => {
L55: const s = setupEngine(
L68: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L73: it("is refused with no black or purple colour source in play", async () => {
L74: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L92: it("places itself in the battle area from security", async () => {
L93: const s = setupEngine(
L98: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L99: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-053"), 2000);
L101: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-053")).toBe(true);
L104: it("matches committed metadata and publishes fully covered compiled IR", () => {
L107: expect(definition?.nameEn).toBe("Obsidian Memory Boost!");
L108: expect(definition?.colors).toEqual(["Black"]);
L109: expect(definition?.playCost).toBe(3);
L110: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L111: expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "purple" });
L112: expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-053.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-053", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `699caf6f9 fix(LM-045..053): register the alternative colour instead of waiving`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-054 — Treadmill Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-054",
  "set": "LM",
  "nameEn": "Treadmill Training",
  "colors": [
    "Yellow",
    "Black"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Treadmill Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 yellow or black card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a yellow or black Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 yellow or black card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-054"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Treadmill Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 yellow or black card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a yellow or black Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 yellow or black card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-054`

```text
LM-054 Treadmill Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-054.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Static",
L11: kind: "WaiveColorRequirement",
L19: condition: {
L20: kind: "youHaveNone",
L37: trigger: "Main",
L40: kind: "RevealAdd",
L55: kind: "PlaceInBattleAreaSelf",
L60: trigger: "Main",
L63: kind: "Digivolve",
L67: kind: ["Digimon"],
L73: kind: ["Digimon"],
L79: optional: true,
L90: trigger: "Security",
L93: kind: "RevealAdd",
L108: kind: "PlaceInBattleAreaSelf",
L118: registerIrCard("LM-054", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-054.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a yellow or black card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT1-054", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT1-054");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-054")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Treadmill Training");
L118: expect(definition?.colors).toEqual(["Yellow", "Black"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-054.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-054", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-055 — Sprint Dash Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-055",
  "set": "LM",
  "nameEn": "Sprint Dash Training",
  "colors": [
    "Green",
    "Red"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Sprint Dash Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 green or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a green or red Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 green or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-055"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Sprint Dash Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 green or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a green or red Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 green or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-055`

```text
LM-055 Sprint Dash Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-055.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-055", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-055.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a green or red card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-055"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-028"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-055")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT6-050", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT6-050");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-055"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-055")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Sprint Dash Training");
L118: expect(definition?.colors).toEqual(["Green", "Red"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-055.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-055", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-056 — Image Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-056",
  "set": "LM",
  "nameEn": "Image Training",
  "colors": [
    "Blue",
    "Purple"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Image Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 blue or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a blue or purple Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 blue or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-056"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Image Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 blue or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a blue or purple Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 blue or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-056`

```text
LM-056 Image Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-056.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-056", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-056.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a blue or purple card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-056"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-056")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT1-115", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT1-115");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-056"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-056")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Image Training");
L118: expect(definition?.colors).toEqual(["Blue", "Purple"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-056.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-056", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-057 — Wall Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-057",
  "set": "LM",
  "nameEn": "Wall Training",
  "colors": [
    "Red",
    "Blue"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Wall Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 red or blue card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a red or blue Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 red or blue card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-057"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Wall Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 red or blue card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a red or blue Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 red or blue card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-057`

```text
LM-057 Wall Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-057.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-057", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-057.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a red or blue card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-057"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-047"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-057")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT12-013", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT12-013");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-057"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-057")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Wall Training");
L118: expect(definition?.colors).toEqual(["Red", "Blue"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-057.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-057", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-058 — Parkour Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-058",
  "set": "LM",
  "nameEn": "Parkour Training",
  "colors": [
    "Blue",
    "Green"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Parkour Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 blue or green card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a blue or green Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 blue or green card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-058"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Parkour Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 blue or green card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a blue or green Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 blue or green card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-058`

```text
LM-058 Parkour Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-058.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-058", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-058.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a blue or green card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT1-115", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT1-115");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-058")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Parkour Training");
L118: expect(definition?.colors).toEqual(["Blue", "Green"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-058.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-058", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-059 — Heat Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-059",
  "set": "LM",
  "nameEn": "Heat Training",
  "colors": [
    "Yellow",
    "Red"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Heat Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 yellow or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a yellow or red Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 yellow or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-059"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Heat Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 yellow or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a yellow or red Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 yellow or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-059`

```text
LM-059 Heat Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-059.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-059", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-059.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a yellow or red card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-059"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-028"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-059")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT1-054", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT1-054");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-059"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-047")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-059")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Heat Training");
L118: expect(definition?.colors).toEqual(["Yellow", "Red"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-059.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-059", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-060 — Shadow Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-060",
  "set": "LM",
  "nameEn": "Shadow Training",
  "colors": [
    "Green",
    "Purple"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Shadow Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 green or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a green or purple Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 green or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-060"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Shadow Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 green or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a green or purple Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 green or purple card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-060`

```text
LM-060 Shadow Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-060.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-060", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-060.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a green or purple card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT6-050", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT6-050");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-065")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-060")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Shadow Training");
L118: expect(definition?.colors).toEqual(["Green", "Purple"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-060.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-060", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-061 — Punching Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-061",
  "set": "LM",
  "nameEn": "Punching Training",
  "colors": [
    "Black",
    "Red"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Punching Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 black or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a black or red Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 black or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-061"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Punching Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 black or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a black or red Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, reduce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 black or red card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-061`

```text
LM-061 Punching Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-061.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-061", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-061.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a black or red card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-028"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT10-061", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT10-061");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Punching Training");
L118: expect(definition?.colors).toEqual(["Black", "Red"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-061.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-061", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## LM-062 — Breathing Training — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "LM-062",
  "set": "LM",
  "nameEn": "Breathing Training",
  "colors": [
    "Purple",
    "Yellow"
  ],
  "kinds": [
    "Option"
  ],
  "playCost": 2,
  "dp": 0,
  "evoCosts": [],
  "forms": [
    "-"
  ],
  "attributes": [
    "-"
  ],
  "types": [
    "-"
  ],
  "effectText": "While you have don't have [Breathing Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 purple or yellow card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a purple or yellow Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, yellowuce the cost by 2.",
  "securityEffectText": "[Security] Reveal the top 2 cards of your deck. Add 1 purple or yellow card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.",
  "rarity": "SEC",
  "maxCountInDeck": 4,
  "imageId": "LM-062"
}
```
2. **Exact printed surfaces:**
   - Main: "While you have don't have [Breathing Training] in the battle area, you can ignore this card's color requirements.\n[Main] Reveal the top 2 cards of your deck. Add 1 purple or yellow card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area.\n[Main] ＜Delay＞ \n・1 of your Digimon may digivolve into a purple or yellow Digimon card in your hand for its digivolution cost. When it would digivolve by this effect, yellowuce the cost by 2."
   - Security: "[Security] Reveal the top 2 cards of your deck. Add 1 purple or yellow card among them to the hand. Return the rest to the bottom of deck. Then, place this card in the battle area."
3. **Exact card KB query:** `node tools/kb/query.mjs card LM-062`

```text
LM-062 Breathing Training
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
   - `node tools/kb/query.mjs rules "option color requirement digimon tamer area" --limit 3`

```text
[comprehensive §4-21] Color Requirements  (17.675)
  4-21. Color Requirements 4-21-1. "Color requirements" refers to a requirement that must be met in order to use an Option card. (For details, refer to 9 "Using Cards")9 4-21-2. To meet color requirements, you must have a Digimon or Tamer on your field that's the same color as the …

[manual] Official Rule Manual  (15.644)
  …(3 Once paid, use of the card has resolved, and its [Main] effect will activate immediately. Color Requirements • To meet color requirements, you must have a Digimon or Tamer on your field (battle area or breeding area) that has the same color as the Option card you want to use. …

[glossary] Actions  (13.666)
  a Digimon using DNA digivolution. Stack all of the Digimon specified by the DNA digivolution requirements on top of each other unsuspended, place the card you're DNA digivolving into from your hand on top of both Digimon, and pay the DNA digivolution cost. Then, draw a card from …
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
   - `node tools/kb/query.mjs rules "delay keyword activation timing" --limit 3`

```text
[comprehensive §16-17] <Delay>  (11.754)
  16-17. <Delay> 16-17-1. <Delay> is a keyword effect. While a card with this effect is in the battle area, by trashing that card, the effect specified in <Delay> will activate. 16-17-2. The processing from <Delay> is optional. (For details, refer to 15-7 "Optional Processing Condi…

[glossary] Keyword Effects<Blocker>  (9.019)
  …can activate by trashing the specified number of digivolution cards from it at the specified timing. <Rush> This Digimon can attack the turn it comes into play. Digimon with this effect can ignore the rule that states "Digimon can't attack the turn they enter play" and attack as …

[comprehensive §16-28] <Mind Link>  (8.397)
  16-28. <Mind Link> 16-28-1. <Mind Link> is a keyword effect that places a Tamer withthiseffect in thedigivolution cards of a Digimon with no Tamer cards in its digivolution cards. 16-28-2. <Mind Link> effects execute processing. 16-28-3. The processing from <Mind Link> is mandato…
```
5. **Direct implementation:** `apps/api/src/cards/LM/LM-062.ts`; triggers Static, Main, Security; action/condition kinds WaiveColorRequirement, RevealAdd, PlaceInBattleAreaSelf, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "Static",
L18: kind: "WaiveColorRequirement",
L26: condition: {
L27: kind: "youHaveNone",
L44: trigger: "Main",
L47: kind: "RevealAdd",
L62: kind: "PlaceInBattleAreaSelf",
L67: trigger: "Main",
L70: kind: "Digivolve",
L74: kind: ["Digimon"],
L80: kind: ["Digimon"],
L86: optional: true,
L97: trigger: "Security",
L100: kind: "RevealAdd",
L115: kind: "PlaceInBattleAreaSelf",
L125: registerIrCard("LM-062", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), AD1-023 (-), BT17-079 (-), BT17-080 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/LM/LM-062.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("reveals two, adds a purple or yellow card, bottoms the rest and places itself", async () => {
L12: const s = setupEngine(
L24: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L27: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062"), 2000);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-067")).toBe(true);
L30: expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
L31: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062")).toBe(true);
L34: it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
L35: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
L50: it("loses the waiver once a copy of itself is already in the battle area", async () => {
L51: const s = setupEngine(
L66: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
L71: it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
L72: const s = setupEngine(
L88: expect(
L89: s.engine.applyIntent(0, {
L95: await settle(() => s.perm("host").topCard?.cardId === "BT14-075", 2000);
L97: expect(s.perm("host").topCard?.cardId).toBe("BT14-075");
L98: expect(s.state.memory).toBe(0);
L101: it("reveals two and places itself from security", async () => {
L102: const s = setupEngine(
L107: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
L108: await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062"), 2000);
L110: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-067")).toBe(true);
L111: expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062")).toBe(true);
L114: it("matches committed metadata and publishes fully covered compiled IR", () => {
L117: expect(definition?.nameEn).toBe("Breathing Training");
L118: expect(definition?.colors).toEqual(["Purple", "Yellow"]);
L119: expect(definition?.playCost).toBe(2);
L120: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L124: expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-062.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("LM-062", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `88bc0bf38 fix(LM-055..062): restore the Training Delay digivolution clause`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.
