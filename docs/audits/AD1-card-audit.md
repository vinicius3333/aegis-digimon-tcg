# AD1 Card Audit Ledger

Audit date: 2026-08-25. Scope: all 25 committed AD1 catalog cards, audited one card at a time in ascending ID order from the integrated corrected base. Exact catalog and KB evidence, clause-to-runtime/shared-primitive tracing, cross-card trait and realistic evolution-stack comparisons, and 162 focused tests across 25 isolated Vitest processes establish reproducible 10/10 evidence for every card. Collection-level affected-seam tests, typecheck, formatting, and diff gates are recorded in the completion commit and coordinator notification.

## AD1-001 — Greymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-001",
  "set": "AD1",
  "nameEn": "Greymon",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 5000,
  "evoCosts": [
    {
      "color": "Red",
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
    "Dinosaur",
    "ADVENTURE"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2 \n\n[On Play] [When Digivolving] You may return 1 card with [Greymon], [Garurumon] or [Omnimon] in its name from your trash to the hand.\n[All Turns] When your Digimon or Tamers are played or digivolve, if any of them have [Garurumon] or [Tai Kamiya] in their names, this Digimon may digivolve into a Digimon card with [Greymon] in its name in the hand without paying the cost.",
  "inheritedEffectText": "＜Raid＞",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-001"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2 \n\n[On Play] [When Digivolving] You may return 1 card with [Greymon], [Garurumon] or [Omnimon] in its name from your trash to the hand.\n[All Turns] When your Digimon or Tamers are played or digivolve, if any of them have [Garurumon] or [Tai Kamiya] in their names, this Digimon may digivolve into a Digimon card with [Greymon] in its name in the hand without paying the cost."
   - Inherited: "＜Raid＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-001`

```text
AD1-001 Greymon
  Q&A (2):
    Q6050 (2026-03-13): Can I activate this card's [All Turns] effect when this card digivolves into a card with [Garurumon] in its name?
      A: No, you can't.
    Q6051 (2026-03-13): What does a card with "X in its text" refer to?
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-001.ts`; triggers OnPlay, WhenDigivolving, AllTurns, Static; action/condition kinds Return, SubTrigger, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Return",
L29: optional: true,
L34: trigger: "WhenDigivolving",
L37: kind: "Return",
L52: optional: true,
L57: trigger: "AllTurns",
L60: kind: "SubTrigger",
L64: kind: ["Digimon", "Tamer"],
L74: kind: "Digivolve",
L84: kind: ["Digimon"],
L94: optional: true,
L99: kind: "SubTrigger",
L103: kind: ["Digimon", "Tamer"],
L113: kind: "Digivolve",
L123: kind: ["Digimon"],
L133: optional: true,
L140: trigger: "Static",
L153: digivolutionRequirement: [
L157: cost: 2,
L162: cost: 2,
L169: registerIrCard("AD1-001", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-057 (Dinosaur/ADVENTURE), AD1-004 (ADVENTURE), AD1-009 (ADVENTURE), AD1-010 (ADVENTURE). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-001.test.ts` contains 8 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("returns a matching Greymon-family card from trash on play", async () => {
L10: const s = setupEngine(
L21: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
L24: await settle(() =>
L28: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(true);
L29: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(
L34: it("allows the printed level-3 ADVENTURE and Omnimon-in-text digivolution routes for cost 2", async () => {
L36: const s = setupEngine({
L45: expect(
L46: s.engine.applyIntent(0, {
L52: await settle(() => s.perm("base").topCard?.cardId === "AD1-001");
L54: expect(s.perm("base").topCard?.cardId).toBe("AD1-001");
L55: expect(s.state.memory).toBe(0);
L59: it("may free-digivolve itself into a Greymon when a Garurumon is played", async () => {
L60: const s = setupEngine(
L75: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
L78: await settle(() => s.perm("source").topCard?.cardId === "BT1-021");
L80: expect(s.perm("source").topCard?.cardId).toBe("BT1-021");
L81: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(false);
L82: expect(s.state.memory).toBe(5);
L85: it("does not retrigger after it digivolves into Garurumon, per Q6050", async () => {
L86: const s = setupEngine(
L102: await settle();
L104: expect(s.perm("source").topCard?.cardId).toBe("AD1-010");
L105: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(true);
L108: it("allows the optional trash return to be declined", async () => {
L109: const s = setupEngine(
L115: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
L118: await settle(() => s.state.pendingDecision === null);
L120: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(
L125: it("grants Raid from the evolution stack and redirects to the highest-DP unsuspended Digimon", async () => {
L126: const s = setupEngine(
L143: expect(
L144: s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
L146: await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 5000);
L148: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
L149: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(true);
L150: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowerId)).toBe(true);
L153: it("rejects play when memory is below the printed cost", () => {
L154: const s = setupEngine({ 0: { hand: [{ card: "AD1-001", as: "greymon" }] } });
L157: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
L163: it("matches committed metadata and publishes fully covered compiled IR", () => {
L166: expect(definition).toBeDefined();
L167: expect(definition?.cardId).toBe("AD1-001");
L168: expect(definition?.nameEn).toBe("Greymon");
L169: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L170: expect(compiled?.effects.length).toBeGreaterThan(0);
L171: expect(compiled?.effects).toEqual(expect.any(Array));
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-001.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-001", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-002 — Aldamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-002",
  "set": "AD1",
  "nameEn": "Aldamon",
  "colors": [
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 8,
  "dp": 8000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 4,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Hybrid"
  ],
  "attributes": [
    "Variable"
  ],
  "types": [
    "Wizard"
  ],
  "effectText": "[Digivolve] [Takuya Kanbara] w/2 or more [Hybrid] trait cards under: Cost 3 \n\n＜Rush＞ \n[When Digivolving] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon.\n[End of Attack] [On Deletion] You may trash 1 [Hybrid] or [Ten Warriors] trait card from your hand. If this effect trashed, ＜Draw 2＞ Then, you may play 1 red, blue or green Tamer card with inherited effects from your hand or trash without paying the cost.",
  "inheritedEffectText": "[Your Turn] This Digimon gets +4000 DP.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-002"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Takuya Kanbara] w/2 or more [Hybrid] trait cards under: Cost 3 \n\n＜Rush＞ \n[When Digivolving] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon.\n[End of Attack] [On Deletion] You may trash 1 [Hybrid] or [Ten Warriors] trait card from your hand. If this effect trashed, ＜Draw 2＞ Then, you may play 1 red, blue or green Tamer card with inherited effects from your hand or trash without paying the cost."
   - Inherited: "[Your Turn] This Digimon gets +4000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-002`

```text
AD1-002 Aldamon
  Q&A (7):
    Q6052 (2026-03-13): Can I process the part of the effect after "then" in this card's [End of Attack] [On Deletion] effect without trashing a card from my hand?
      A: Yes, you can.
    Q6903 (2026-06-19): Does a digivolution requirement that digivolves from a Tamer mean that the Tamer that will become a digivolution card is treated as a Digimon when it digivolves?
      A: No, it digivolves from the Tamer as-is. It isn't treated as a Digimon that digivolves, therefore "when a Digimon would digivolve" effects and "when a Digimon digivolves" effects don't trigger. In addition, this digivolution requirement can be used to digivolve a Tamer even if a "Digimon can't digivolve" effect activates.
    Q6904 (2026-06-19): Is a digivolution bonus draw performed even when a Tamer digivolves?
      A: Yes, you perform a digivolution bonus draw. A digivolution bonus draw is performed for any kind of digivolution.
    Q6905 (2026-06-19): If this card digivolves from a Tamer that was played this turn, can it attack in the same turn?
      A: This card has <Rush>, so it can attack. Unless the other cards have an effect that allows them to attack the turn they were played, they can't attack.
    Q6906 (2026-06-19): Does a Tamer card placed under a Digimon become a digivolution card?
      A: Yes, it becomes a digivolution card. If that Digimon would leave the field, the Tamer card will be trashed like a normal digivolution card.
    Q6907 (2026-06-19): Does a Digimon gain the Security effect in the lower text on a Tamer card in digivolution cards?
      A: No, it doesn't.
    Q6908 (2026-06-19): Does a Digimon gain the Inherited effect in the lower text on a Tamer card in digivolution cards?
      A: Yes, it does.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-002.ts`; triggers Static, WhenDigivolving, EndOfAttack, OnDeletion, YourTurn; action/condition kinds Delete, Trash, Draw, PlayWithoutCost, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "WhenDigivolving",
L24: kind: "Delete",
L28: kind: ["Digimon"],
L40: trigger: "EndOfAttack",
L43: kind: "Trash",
L57: optional: true,
L60: kind: "Draw",
L63: condition: {
L64: kind: "ifThisEffectActed",
L69: kind: "PlayWithoutCost",
L74: kind: ["Tamer"],
L81: optional: true,
L86: trigger: "OnDeletion",
L89: kind: "Trash",
L103: optional: true,
L106: kind: "Draw",
L109: condition: {
L110: kind: "ifThisEffectActed",
L115: kind: "PlayWithoutCost",
L120: kind: ["Tamer"],
L127: optional: true,
L132: trigger: "YourTurn",
L135: kind: "ModifyDP",
L144: duration: "permanent",
L152: digivolutionRequirement: [
L155: cost: 3,
L161: registerIrCard("AD1-002", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT10-010 (Wizard), BT10-039 (Wizard), BT10-081 (Wizard), BT10-084 (Wizard). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-002.test.ts` contains 8 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("deletes an opposing Digimon within its DP ceiling when digivolving", async () => {
L9: const s = setupEngine(
L23: expect(
L24: s.engine.applyIntent(0, {
L30: await settle(() => s.state.players[1]!.battleArea.length === 1);
L32: expect(
L37: it("digivolves from Takuya with 2 Hybrid cards under it and can attack immediately with Rush", async () => {
L38: const s = setupEngine(
L51: expect(
L52: s.engine.applyIntent(0, {
L58: await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
L59: expect(s.state.memory).toBe(0);
L61: expect(
L62: s.engine.applyIntent(0, {
L68: await settle(() => s.state.players[1]!.security.length === 0);
L69: expect(s.state.players[1]!.security).toHaveLength(0);
L72: it("at end of attack trashes a Hybrid, draws 2, and plays an inherited-effect Tamer for free", async () => {
L73: const s = setupEngine(
L91: expect(
L92: s.engine.applyIntent(0, {
L98: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));
L100: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
L101: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw1").instanceId)).toBe(true);
L102: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw2").instanceId)).toBe(true);
L103: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
L106: it("still plays the Tamer after an attack when no card was trashed, per Q6052", async () => {
L107: const s = setupEngine(
L119: expect(
L120: s.engine.applyIntent(0, {
L126: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));
L128: expect(s.state.players[0]!.deck).toHaveLength(2);
L129: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
L132: it("resolves the same trash, draw, and free-play sequence on deletion", async () => {
L133: const s = setupEngine(
L148: expect(
L149: s.engine.applyIntent(1, {
L155: await settle(
L160: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === aldmonId)).toBe(false);
L161: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
L162: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
L165: it("grants the inherited +4000 DP only during its controller's turn", async () => {
L166: const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", dp: 7000, as: "holder", under: ["AD1-002"] }] } });
L168: expect(s.perm("holder").currentDP).toBe(11000);
L172: expect(s.perm("holder").currentDP).toBe(7000);
L175: it("rejects play when memory is below the printed cost", () => {
L176: const s = setupEngine({ 0: { hand: [{ card: "AD1-002", as: "aldamon" }] } });
L179: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aldamon").instanceId })).toEqual({
L185: it("matches committed metadata and publishes fully covered compiled IR", () => {
L188: expect(definition).toBeDefined();
L189: expect(definition?.cardId).toBe("AD1-002");
L190: expect(definition?.nameEn).toBe("Aldamon");
L191: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L192: expect(compiled?.effects.length).toBeGreaterThan(0);
L193: expect(compiled?.effects).toEqual(expect.any(Array));
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-002.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-002", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-003 — WarGrowlmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-003",
  "set": "AD1",
  "nameEn": "WarGrowlmon",
  "colors": [
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
      "color": "Red",
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
    "Cyborg",
    "Hero"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Growlmon] in name or w/[Hero] trait: Cost 3 \n\n＜Raid＞ \n[On Play] [When Digivolving] You may play 1 [Takato Matsuki] from your hand or trash without paying the cost. Then, you may delete 1 of your opponent's Digimon with 6000 DP or less.",
  "inheritedEffectText": "[All Turns] When this Digimon with [Gallantmon] in its name would leave the battle area other than by your effects, you may play 1 each of [Takato Matsuki] and [Guilmon] from its digivolution cards without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-003"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Growlmon] in name or w/[Hero] trait: Cost 3 \n\n＜Raid＞ \n[On Play] [When Digivolving] You may play 1 [Takato Matsuki] from your hand or trash without paying the cost. Then, you may delete 1 of your opponent's Digimon with 6000 DP or less."
   - Inherited: "[All Turns] When this Digimon with [Gallantmon] in its name would leave the battle area other than by your effects, you may play 1 each of [Takato Matsuki] and [Guilmon] from its digivolution cards without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-003`

```text
AD1-003 WarGrowlmon
  Q&A (2):
    Q6053 (2026-03-13): This card, [Takato Matsuki], and [Guilmon] are in [Gallantmon]'s digivolution cards. When that Digimon would leave the battle area other than by my effects, can I activate this card's inherited effect and play just 1 [Takato Matsuki] or 1 [Guilmon] from this card's digivolution cards?
      A: No, you can't. You must play 1 [Takato Matsuki] and 1 [Guilmon] whenever possible.
    Q6054 (2026-03-13): Only this card and [Takato Matsuki] are in [Gallantmon]'s digivolution cards. When that Digimon would leave the battle area other than by my effects, can I activate this card's inherited effect and play just [Takato Matsuki] from this card's digivolution cards?
      A: Yes, it can be played.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-003.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns; action/condition kinds PlayWithoutCost, Delete, Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "PlayWithoutCost",
L39: optional: true,
L42: kind: "Delete",
L46: kind: ["Digimon"],
L54: optional: true,
L59: trigger: "WhenDigivolving",
L62: kind: "PlayWithoutCost",
L77: optional: true,
L80: kind: "Delete",
L84: kind: ["Digimon"],
L92: optional: true,
L97: trigger: "AllTurns",
L100: kind: "Replacement",
L105: kind: ["Digimon"],
L115: kind: "PlayWithoutCost",
L130: abortOnDecline: true,
L131: optional: true,
L134: kind: "PlayWithoutCost",
L158: digivolutionRequirement: [
L162: cost: 3,
L167: cost: 3,
L174: registerIrCard("AD1-003", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-014 (Cyborg/Hero), AD1-004 (Hero), AD1-008 (Hero), AD1-009 (Cyborg). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-003.test.ts` contains 9 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("plays Takato and deletes an opposing Digimon at the printed DP limit when digivolving", async () => {
L10: const s = setupEngine(
L25: expect(
L26: s.engine.applyIntent(0, {
L32: await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 2);
L34: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L35: expect(
L40: it("allows both printed level-4 Growlmon-name and Hero digivolution routes for cost 3", async () => {
L42: const s = setupEngine({
L51: expect(
L52: s.engine.applyIntent(0, {
L58: await settle(() => s.perm("base").topCard?.cardId === "AD1-003");
L60: expect(s.perm("base").topCard?.cardId).toBe("AD1-003");
L61: expect(s.state.memory).toBe(0);
L65: it("plays Takato from trash and deletes only an eligible Digimon on play", async () => {
L66: const s = setupEngine(
L80: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
L83: await settle(
L89: expect(
L94: it("uses Raid to redirect a player attack to the highest-DP unsuspended Digimon", async () => {
L95: const s = setupEngine(
L112: expect(
L113: s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
L115: await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 5000);
L117: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
L118: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(true);
L119: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowerId)).toBe(true);
L122: it("plays both Takato and Guilmon when an inherited holder leaves in battle, per Q6053", async () => {
L123: const s = setupEngine(
L143: expect(
L144: s.engine.applyIntent(1, {
L150: await settle(
L157: await settle();
L159: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === gallantmonId)).toBe(false);
L160: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-089")).toBe(true);
L161: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-007")).toBe(true);
L164: it("plays the sole available Takato when no Guilmon is in the stack, per Q6054", async () => {
L165: const s = setupEngine(
L178: expect(
L179: s.engine.applyIntent(1, {
L185: await settle(
L190: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-089")).toBe(true);
L191: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-007")).toBe(false);
L194: it("does not play inherited cards when Gallantmon leaves by its controller's effect", async () => {
L195: const s = setupEngine(
L205: await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
L207: expect(s.state.players[0]!.battleArea).toHaveLength(0);
L208: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-089")).toBe(true);
L209: expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-007")).toBe(true);
L212: it("rejects play when memory is below the printed cost", () => {
L213: const s = setupEngine({ 0: { hand: [{ card: "AD1-003", as: "wargrowlmon" }] } });
L216: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
L222: it("matches committed metadata and publishes fully covered compiled IR", () => {
L225: expect(definition).toBeDefined();
L226: expect(definition?.cardId).toBe("AD1-003");
L227: expect(definition?.nameEn).toBe("WarGrowlmon");
L228: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L229: expect(compiled?.effects.length).toBeGreaterThan(0);
L230: expect(compiled?.effects).toEqual(expect.any(Array));
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-003.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-003", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-004 — WarGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-004",
  "set": "AD1",
  "nameEn": "WarGreymon",
  "colors": [
    "Red",
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
      "color": "Red",
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
    "Vaccine"
  ],
  "types": [
    "Dragonkin",
    "ADVENTURE",
    "Hero"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Greymon] in name: Cost 3\n[Digivolve] Lv.5 w/[ADVENTURE]/[Hero] trait: Cost 3 \n\n＜Raid＞ \n＜Piercing＞ \n[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon.\n[All Turns] This Digimon gets +1000 DP for each of your Tamers' colors, and gains ＜Security A. +1＞ for every 3 of their colors.\n[End of Your Turn] 1 of your Digimon may attack.",
  "inheritedEffectText": "[When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon with [Greymon] or [Omnimon] in its name in its name.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-004"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Greymon] in name: Cost 3\n[Digivolve] Lv.5 w/[ADVENTURE]/[Hero] trait: Cost 3 \n\n＜Raid＞ \n＜Piercing＞ \n[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon.\n[All Turns] This Digimon gets +1000 DP for each of your Tamers' colors, and gains ＜Security A. +1＞ for every 3 of their colors.\n[End of Your Turn] 1 of your Digimon may attack."
   - Inherited: "[When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon with [Greymon] or [Omnimon] in its name in its name."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-004`

```text
AD1-004 WarGreymon
  Q&A (1):
    Q6055 (2026-03-13): When a Digimon with this card in its digivolution cards but without [Greymon] or [Omnimon] in its name attacks, does this card’s inherited effect activate?
      A: Yes. You must activate this card’s inherited effect and use up its [Once Per Turn], even if the attacking Digimon doesn't have [Greymon] or [Omnimon] in its name. However, if the attacking Digimon doesn't have [Greymon] or [Omnimon] in its name, you can't reference DP or delete a Digimon.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-004.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns, EndOfYourTurn, WhenAttacking; action/condition kinds Delete, ModifyDP, GainKeyword, Attack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "Delete",
L38: kind: ["Digimon"],
L50: trigger: "WhenDigivolving",
L53: kind: "Delete",
L57: kind: ["Digimon"],
L69: trigger: "AllTurns",
L72: kind: "ModifyDP",
L81: duration: "permanent",
L86: kind: ["Tamer"],
L92: kind: "GainKeyword",
L105: duration: "permanent",
L110: kind: ["Tamer"],
L118: trigger: "EndOfYourTurn",
L121: kind: "Attack",
L125: kind: ["Digimon"],
L130: optional: true,
L135: trigger: "WhenAttacking",
L138: kind: "Delete",
L142: kind: ["Digimon"],
L150: condition: {
L151: kind: "selfHasNameContaining",
L158: frequency: "OncePerTurn",
L163: digivolutionRequirement: [
L167: cost: 3,
L173: cost: 3,
L179: registerIrCard("AD1-004", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: ST20-11 (Dragonkin/ADVENTURE/Hero), AD1-011 (Dragonkin/Hero), AD1-014 (ADVENTURE/Hero), AD1-019 (ADVENTURE/Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-004.test.ts` contains 10 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("deletes an opposing Digimon within its DP ceiling when played", async () => {
L11: const s = setupEngine(
L20: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
L23: await settle(() => s.state.players[1]!.battleArea.length === 0);
L24: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L27: it("allows Greymon-name, ADVENTURE, and Hero level-5 digivolution routes for cost 3", async () => {
L29: const s = setupEngine({
L38: expect(
L39: s.engine.applyIntent(0, {
L46: await settle(() => s.perm("base").topCard?.cardId === "AD1-004");
L48: expect(s.perm("base").topCard?.cardId).toBe("AD1-004");
L49: expect(s.state.memory).toBe(0);
L53: it("gets +1000 DP per distinct Tamer color and Security Attack +1 per three colors", async () => {
L54: const s = setupEngine({
L65: expect(s.perm("wargreymon").currentDP).toBe(15000);
L66: expect(observe(s.engine).keywordAmount(s.perm("wargreymon"), "SecurityAttack")).toBe(1);
L68: expect(
L69: s.engine.applyIntent(0, {
L75: await settle(() => s.state.players[1]!.security.length === 1, 5000);
L76: expect(s.state.players[1]!.security).toHaveLength(1);
L79: it("has no Security Attack bonus with only two distinct Tamer colors", async () => {
L80: const s = setupEngine({
L90: expect(s.perm("wargreymon").currentDP).toBe(14000);
L91: expect(observe(s.engine).keywordAmount(s.perm("wargreymon"), "SecurityAttack")).toBe(0);
L94: it("may make one of its Digimon attack at the end of the turn", async () => {
L95: const s = setupEngine(
L110: expect(s.state.players[1]!.security).toHaveLength(0);
L113: it("uses Raid and Piercing to redirect, win battle, and continue security checks", async () => {
L114: const s = setupEngine(
L123: expect(
L124: s.engine.applyIntent(0, {
L130: await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);
L132: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L133: expect(s.state.players[1]!.security).toHaveLength(0);
L136: it("inherits one DP-relative deletion for a Greymon-name attacker", async () => {
L137: const s = setupEngine(
L151: expect(
L152: s.engine.applyIntent(0, {
L158: await settle(() => s.state.players[1]!.battleArea.length === 1);
L160: expect(
L165: it("activates but cannot delete when inherited by a non-Greymon or Omnimon attacker, per Q6055", async () => {
L166: const s = setupEngine(
L174: expect(
L175: s.engine.applyIntent(0, {
L181: await settle(() => s.state.players[1]!.security.length === 0);
L183: expect(
L190: it("rejects play when memory is below the printed cost", () => {
L191: const s = setupEngine({ 0: { hand: [{ card: "AD1-004", as: "wargreymon" }] } });
L194: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
L200: it("matches committed metadata and publishes fully covered compiled IR", () => {
L203: expect(definition).toBeDefined();
L204: expect(definition?.cardId).toBe("AD1-004");
L205: expect(definition?.nameEn).toBe("WarGreymon");
L206: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L207: expect(compiled?.effects.length).toBeGreaterThan(0);
L208: expect(compiled?.effects).toEqual(expect.any(Array));
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-004.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-004", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-005 — Gaiamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-005",
  "set": "AD1",
  "nameEn": "Gaiamon",
  "colors": [
    "Red",
    "White"
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
    "God",
    "Appmon"
  ],
  "attributes": [
    "God"
  ],
  "types": [
    "Creation"
  ],
  "effectText": "[App Fusion] [Globemon] & [Charismon]: Cost 0\n\n[Hand] [Counter] ＜Blast Digivolve＞ \n＜Security A. +1＞ \n＜Blocker＞ \n＜Link +1＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may link up to 2 [Social], [Navi] or [Tool] trait cards from your hand or this Digimon's digivolution cards to this Digimon without paying the cost. Then, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-005",
  "isAce": true,
  "overflowMemory": 4
}
```
2. **Exact printed surfaces:**
   - Main: "[App Fusion] [Globemon] & [Charismon]: Cost 0\n\n[Hand] [Counter] ＜Blast Digivolve＞ \n＜Security A. +1＞ \n＜Blocker＞ \n＜Link +1＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may link up to 2 [Social], [Navi] or [Tool] trait cards from your hand or this Digimon's digivolution cards to this Digimon without paying the cost. Then, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-005`

```text
AD1-005 Gaiamon
  Q&A (3):
    Q6056 (2026-03-13): Can I use this card's [On Play] [When Digivolving] [When Attacking] effect to link a card that doesn't have <Link>?
      A: No, you can't.
    Q6057 (2026-03-13): Can I use this card's [On Play] [When Digivolving] [When Attacking] effect to choose 1 card from my hand, 1 of this card's digivolution cards, and link them to this card?
      A: Yes, you can.
    Q6058 (2026-03-13): If I use this card's [On Play] [When Digivolving] [When Attacking] effect to link cards, can I activate the [When Linking] effect on the linked card before processing the part of this card's [On Play] [When Digivolving] [When Attacking] effect after "then"?
      A: No, you can't.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-005.ts`; triggers Counter, Static, OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds Link, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Counter",
L22: trigger: "Static",
L33: trigger: "Static",
L43: trigger: "Static",
L54: trigger: "OnPlay",
L57: kind: "Link",
L72: optional: true,
L75: kind: "Delete",
L79: kind: ["Digimon"],
L87: optional: true,
L90: frequency: "OncePerTurn",
L91: sharedUseKey: "ir-shared-0",
L94: trigger: "WhenDigivolving",
L97: kind: "Link",
L112: optional: true,
L115: kind: "Delete",
L119: kind: ["Digimon"],
L127: optional: true,
L130: frequency: "OncePerTurn",
L131: sharedUseKey: "ir-shared-0",
L134: trigger: "WhenAttacking",
L137: kind: "Link",
L152: optional: true,
L155: kind: "Delete",
L159: kind: ["Digimon"],
L167: optional: true,
L170: frequency: "OncePerTurn",
L171: sharedUseKey: "ir-shared-0",
L179: cost: 0,
L184: registerIrCard("AD1-005", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-101 (Creation). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-005.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("deletes an opposing Digimon within its DP ceiling when played", async () => {
L10: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaiamon").instanceId })).toEqual({
L28: await settle(() => s.state.players[1]!.battleArea.length === 0);
L30: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L33: it("links legal cards from hand and its stack, rejects a no-Link card, and shares once-per-turn use", async () => {
L34: const s = setupEngine(
L53: expect(
L54: s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gaiamon.permanentId, target: { kind: "player" } }),
L56: await settle(() => gaiamon.linked.length === 2 && s.state.players[1]!.battleArea.length === 0);
L57: await settle();
L59: expect(gaiamon.linked.map((card) => card.instanceId)).toEqual(
L62: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalidNoLink").instanceId)).toBe(true);
L67: expect(gaiamon.linked).toHaveLength(2);
L68: expect(s.state.players[0]!.hand.some((card) => card.instanceId === lateLink.instanceId)).toBe(true);
L71: it("rejects play when memory is below the printed cost", () => {
L72: const s = setupEngine({ 0: { hand: [{ card: "AD1-005", as: "gaiamon" }] } });
L75: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaiamon").instanceId })).toEqual({
L81: it("matches committed metadata and publishes fully covered compiled IR", () => {
L84: expect(definition).toBeDefined();
L85: expect(definition?.cardId).toBe("AD1-005");
L86: expect(definition?.nameEn).toBe("Gaiamon");
L87: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L88: expect(compiled?.effects.length).toBeGreaterThan(0);
L89: expect(compiled?.effects).toEqual(expect.any(Array));
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-005.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-005", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-006 — Shoutmon X7 — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-006",
  "set": "AD1",
  "nameEn": "Shoutmon X7",
  "colors": [
    "Red",
    "Black",
    "Blue"
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
      "color": "Black",
      "level": 5,
      "memoryCost": 5
    },
    {
      "color": "Blue",
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
    "Composite",
    "Xros Heart",
    "Blue Flare"
  ],
  "effectText": "[Digivolve] Lv.6 w/[Xros Heart]/[Blue Flare] trait: Cost 2 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's Digimon with as much or less DP as this Digimon to the bottom of the deck. Then, this Digimon may unsuspend.\n[All Turns] When this Digimon would leave the battle area other than by DigiXros, from this Digimon's digivolution cards, you may place up to 4 [Xros Heart] or [Blue Flare] trait Digimon cards under 1 of your Tamers and play 1 such card without paying the cost.\n\n[DigiXros -2] [OmniShoutmon] x [ZeigGreymon] x [Ballistamon] x [Dorulumon] x [Starmons] x [Sparrowmon]",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-006"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.6 w/[Xros Heart]/[Blue Flare] trait: Cost 2 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's Digimon with as much or less DP as this Digimon to the bottom of the deck. Then, this Digimon may unsuspend.\n[All Turns] When this Digimon would leave the battle area other than by DigiXros, from this Digimon's digivolution cards, you may place up to 4 [Xros Heart] or [Blue Flare] trait Digimon cards under 1 of your Tamers and play 1 such card without paying the cost.\n\n[DigiXros -2] [OmniShoutmon] x [ZeigGreymon] x [Ballistamon] x [Dorulumon] x [Starmons] x [Sparrowmon]"
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-006`

```text
AD1-006 Shoutmon X7
  Q&A (5):
    Q6059 (2026-03-13): Does the Digimon card played by this card's [All Turns] effect have to be a [Xros Heart] or [Blue Flare] trait card?
      A: Yes. Only a [Xros Heart] or [Blue Flare] trait card can be played.
    Q6060 (2026-03-13): I activated this card's [All Turns] effect, placed cards from this card's digivolution cards under a Tamer, then attempted to play 1 card. If I then choose the cards placed under the Tamer for a DigiXros on the card to be played, can I choose the cards placed under the Tamer by this effect?
      A: Yes, you can.
    Q6061 (2026-03-13): When I activate this card's [All Turns] effect and would play cards from its digivolution cards, if I would choose this card for a DigiXros on those cards, can I choose this card in the battle area?
      A: Yes, you can.
    Q6062 (2026-03-13): I have a Tamer. Can I activate this card's [All Turns] effect and play 1 card without placing any cards from this card's digivolution cards under the Tamer?
      A: No, you can't. If you activate this card's [All Turns] effect, you must place at least 1 card from digivolution cards under a Tamer when possible and play 1 card. However, if there is only 1 digivolution card, you can first place that card under a Tamer, then no card will be played.
    Q6063 (2026-03-13): I have no Tamers. Can I activate this card's [All Turns] effect and play 1 card from this card's digivolution cards?
      A: Yes, you can.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-006.ts`; triggers OnPlay, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Return, Unsuspend, Replacement, PlaceUnder, PlayFromZone. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Return",
L18: kind: ["Digimon"],
L27: optional: true,
L30: kind: "Unsuspend",
L38: optional: true,
L41: frequency: "OncePerTurn",
L42: sharedUseKey: "ir-shared-0",
L45: trigger: "WhenDigivolving",
L48: kind: "Return",
L52: kind: ["Digimon"],
L61: optional: true,
L64: kind: "Unsuspend",
L72: optional: true,
L75: frequency: "OncePerTurn",
L76: sharedUseKey: "ir-shared-0",
L79: trigger: "WhenAttacking",
L82: kind: "Return",
L86: kind: ["Digimon"],
L95: optional: true,
L98: kind: "Unsuspend",
L106: optional: true,
L109: frequency: "OncePerTurn",
L110: sharedUseKey: "ir-shared-0",
L113: trigger: "AllTurns",
L116: kind: "Replacement",
L118: optional: true,
L125: kind: "PlaceUnder",
L129: kind: ["Digimon"],
L148: kind: ["Tamer"],
L152: kind: "PlayFromZone",
L156: kind: ["Digimon"],
L181: digivolutionRequirement: [
L185: cost: 2,
L216: registerIrCard("AD1-006", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT11-018 (Composite/Xros Heart/Blue Flare), BT19-014 (Composite/Xros Heart/Blue Flare), BT21-027 (Composite/Xros Heart/Blue Flare), BT21-030 (Composite/Xros Heart/Blue Flare). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-006.test.ts` contains 10 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("bottom-decks an opposing Digimon within its DP ceiling when played", async () => {
L9: const s = setupEngine(
L23: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
L24: await settle(() => s.state.players[1]!.battleArea.length === 1);
L26: expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-010");
L27: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
L30: it("publishes and uses all six exact DigiXros slots at reduction 2 each", async () => {
L31: expect(digiXrosRequirementFor("AD1-006")).toEqual([
L40: const s = setupEngine(
L66: expect(
L67: s.engine.applyIntent(0, {
L73: await settle(() =>
L79: expect(s.state.memory).toBe(0);
L80: expect(
L85: it("allows level-6 Xros Heart and Blue Flare digivolution routes for cost 2", async () => {
L87: const s = setupEngine({
L92: expect(
L93: s.engine.applyIntent(0, {
L99: await settle(() => s.perm("base").topCard?.cardId === "AD1-006");
L101: expect(s.perm("base").topCard?.cardId).toBe("AD1-006");
L102: expect(s.state.memory).toBe(0);
L106: it("bottom-decks at the DP boundary and unsuspends itself on its first attack only", async () => {
L107: const s = setupEngine(
L122: expect(
L123: s.engine.applyIntent(0, {
L129: await settle(() => s.state.players[1]!.battleArea.length === 1 && s.perm("x7").isSuspended === false);
L131: expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(eligibleInstanceId);
L132: expect(
L135: expect(s.perm("x7").isSuspended).toBe(false);
L138: it("with no Tamer, may play a qualifying source card and rejects non-matching sources, per Q6059/Q6063", async () => {
L139: const s = setupEngine(
L162: expect(
L163: s.engine.applyIntent(1, {
L169: await settle(
L173: await settle();
L175: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
L176: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009")).toBe(true);
L177: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("invalid").instanceId)).toBe(true);
L180: it("with one source and a Tamer, must place it and then cannot play it, per Q6062", async () => {
L181: const s = setupEngine(
L196: expect(
L197: s.engine.applyIntent(1, {
L203: await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === s.inst("onlySource").instanceId), 5000);
L204: await settle();
L206: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
L207: expect(s.perm("tamer").stack.some((card) => card.instanceId === s.inst("onlySource").instanceId)).toBe(true);
L208: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-009")).toBe(false);
L211: it("uses newly placed cards and itself as DigiXros materials for the played card, per Q6060/Q6061", async () => {
L213: const s = setupEngine(
L248: expect(
L249: s.engine.applyIntent(1, {
L255: await settle(
L264: expect(played.stack.map((card) => card.instanceId)).toEqual(
L272: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === x7Id)).toBe(false);
L273: expect(s.perm("tamer").stack).toHaveLength(1);
L274: expect(s.perm("tamer").stack[0]?.cardId).toBe("BT10-049");
L277: it("may decline the leave effect and lets the whole stack go to trash", async () => {
L278: const s = setupEngine(
L292: expect(
L293: s.engine.applyIntent(1, {
L299: await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== x7Id), 5000);
L301: expect(s.state.players[0]!.battleArea).toHaveLength(0);
L302: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
L305: it("rejects play when memory is below the printed cost", () => {
L306: const s = setupEngine({ 0: { hand: [{ card: "AD1-006", as: "x7" }] } });
L309: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({
L315: it("matches committed metadata and publishes fully covered compiled IR", () => {
L318: expect(definition).toBeDefined();
L319: expect(definition?.cardId).toBe("AD1-006");
L320: expect(definition?.nameEn).toBe("Shoutmon X7");
L321: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L322: expect(compiled?.effects.length).toBeGreaterThan(0);
L323: expect(compiled?.effects).toEqual(expect.any(Array));
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-006.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-006", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-007 — Siriusmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-007",
  "set": "AD1",
  "nameEn": "Siriusmon",
  "colors": [
    "Red"
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
  "effectText": "[Digivolve] Lv.5 w/[Gammamon] in text: Cost 3 \n\n＜Raid＞ \n＜Security A. +1＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] By placing 3 Digimon cards with [Gammamon] in their texts from your hand or trash as this Digimon's top or bottom digivolution cards, delete 1 of your opponent's Digimon with as much or less DP as this Digimon.\n[End of Your Turn] [Once Per Turn] This Digimon with 5 or more digivolution cards may attack without suspending.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-007"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Gammamon] in text: Cost 3 \n\n＜Raid＞ \n＜Security A. +1＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] By placing 3 Digimon cards with [Gammamon] in their texts from your hand or trash as this Digimon's top or bottom digivolution cards, delete 1 of your opponent's Digimon with as much or less DP as this Digimon.\n[End of Your Turn] [Once Per Turn] This Digimon with 5 or more digivolution cards may attack without suspending."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-007`

```text
AD1-007 Siriusmon
  Q&A (2):
    Q6064 (2026-03-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q6065 (2026-03-13): Can I place just 1 card with [Gammamon] in its text in digivolution cards for the conditions of this card's [When Digivolving] [When Attacking] effect?
      A: No, you can't. A "by" condition can't be met if only some of the required actions are performed. The conditions for this [When Digivolving] [When Attacking] effect require you to place the specified number of cards in digivolution cards.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-007.ts`; triggers Static, WhenDigivolving, WhenAttacking, EndOfYourTurn; action/condition kinds Delete, Attack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L32: trigger: "Static",
L42: trigger: "WhenDigivolving",
L45: kind: "Delete",
L49: kind: ["Digimon"],
L57: cost: {
L58: kind: "place",
L62: kind: ["Digimon"],
L75: optional: true,
L76: abortOnDecline: true,
L79: frequency: "OncePerTurn",
L80: sharedUseKey: "ir-shared-0",
L83: trigger: "WhenAttacking",
L86: kind: "Delete",
L90: kind: ["Digimon"],
L98: cost: {
L99: kind: "place",
L103: kind: ["Digimon"],
L116: optional: true,
L117: abortOnDecline: true,
L120: frequency: "OncePerTurn",
L121: sharedUseKey: "ir-shared-0",
L124: trigger: "EndOfYourTurn",
L127: kind: "Attack",
L136: optional: true,
L137: condition: {
L138: kind: "selfDigivolutionCountAtLeast",
L144: frequency: "OncePerTurn",
L149: digivolutionRequirement: [
L153: cost: 3,
L159: registerIrCard("AD1-007", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-016 (Light Dragon), BT12-043 (Light Dragon), BT13-018 (Light Dragon), BT13-020 (Light Dragon). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-007.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-007");
L13: expect(definition?.nameEn).toBe("Siriusmon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("places three qualifying Gammamon-text Digimon and deletes only within its DP ceiling", async () => {
L20: const s = setupEngine(
L42: expect(
L43: s.engine.applyIntent(0, {
L50: await settle(() => s.state.players[1]!.battleArea.length === 1);
L52: expect(s.perm("base").stack).toHaveLength(4);
L53: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
L56: it("uses the alternate level-5 Gammamon-text evolution requirement for cost 3", async () => {
L57: const s = setupEngine({
L62: expect(
L63: s.engine.applyIntent(0, {
L70: await settle(() => s.perm("canoweissmon").topCard?.cardId === "AD1-007");
L72: expect(s.state.memory).toBe(2);
L75: it("shares one use between its when-digivolving and when-attacking timings", async () => {
L76: const s = setupEngine(
L99: expect(
L100: s.engine.applyIntent(0, {
L106: await settle(() => s.state.players[1]!.battleArea.length === 1);
L107: await settle();
L108: expect(
L109: s.engine.applyIntent(0, {
L115: await settle();
L117: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L118: expect(s.perm("base").stack).toHaveLength(4);
L121: it("attacks without suspending at end of turn only with five digivolution cards", async () => {
L122: const qualified = setupEngine(
L144: expect(qualified.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
L146: expect(qualified.perm("qualified").isSuspended).toBe(true);
L148: const unqualified = setupEngine(
L170: expect(unqualified.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
L172: expect(unqualified.state.players[1]!.security).toHaveLength(1);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-007.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-007", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-008 — Gallantmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-008",
  "set": "AD1",
  "nameEn": "Gallantmon",
  "colors": [
    "Red"
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
    }
  ],
  "forms": [
    "Mega"
  ],
  "attributes": [
    "Virus"
  ],
  "types": [
    "Holy Warrior",
    "Royal Knight",
    "Hero"
  ],
  "effectText": "[Digivolve] Lv.5 w/[WarGrowlmon] in name or w/[Hero] trait: Cost 3 \n\n＜Rush＞ \n＜Raid＞ \n＜Piercing＞ \n[When Digivolving] Delete up to 10000 DP total worth of your opponent's Digimon. Then, this Digimon may attack.\n[When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's lowest DP Digimon.\n[Your Turn] Your opponent's effects don't affect this Digimon with [Takato Matsuki] in its digivolution cards and it gets +5000 DP.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-008"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[WarGrowlmon] in name or w/[Hero] trait: Cost 3 \n\n＜Rush＞ \n＜Raid＞ \n＜Piercing＞ \n[When Digivolving] Delete up to 10000 DP total worth of your opponent's Digimon. Then, this Digimon may attack.\n[When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's lowest DP Digimon.\n[Your Turn] Your opponent's effects don't affect this Digimon with [Takato Matsuki] in its digivolution cards and it gets +5000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-008`

```text
AD1-008 Gallantmon
  Q&A (7):
    Q6066 (2026-03-13): Can I activate BT12-089 [Takato Matsuki]'s [Main] effect and digivolve a [Hero] trait Guilmon into this card for a digivolution cost of 3?
      A: Yes, it can digivolve for a digivolution cost of 3. If you reference this card's 3rd digivolution requirement to digivolve, ignoring level, the digivolution cost will be 3.
      related: BT12-089
    Q6067 (2026-03-13): What does "effects don't affect" mean, exactly?
      A: This effect prevents a card from being affected by effects. For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.
    Q6068 (2026-03-13): Can a card that has an "effects don't affect" effect be chosen for an effect?
      A: Yes, it can be chosen. For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.
    Q6069 (2026-03-13): Can a card that has an "effects don't affect" effect be given an effect?
      A: Yes, it can. It won't be affected by it, but it can be given an effect. However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.
    Q6070 (2026-03-13): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
      A: As soon as it gains the "effects don't affect" effect, it will no longer be affected.
    Q6071 (2026-03-13): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
      A: It will be affected by the effect as soon as it can be affected by effects.
    Q6072 (2026-03-13): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
      A: If the Digimon isn't affected by effects upon the trigger timing, the effect won't trigger.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-008.ts`; triggers Static, WhenDigivolving, WhenAttacking, YourTurn; action/condition kinds Delete, Attack, Aura, GrantStatic. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L7: trigger: "Static",
L17: trigger: "Static",
L27: trigger: "Static",
L37: trigger: "WhenDigivolving",
L40: kind: "Delete",
L44: kind: ["Digimon"],
L52: kind: "Attack",
L61: optional: true,
L66: trigger: "WhenDigivolving",
L69: kind: "Delete",
L73: kind: ["Digimon"],
L80: frequency: "OncePerTurn",
L81: sharedUseKey: "ir-shared-0",
L84: trigger: "WhenAttacking",
L87: kind: "Delete",
L91: kind: ["Digimon"],
L98: frequency: "OncePerTurn",
L99: sharedUseKey: "ir-shared-0",
L102: trigger: "YourTurn",
L105: kind: "Aura",
L114: kind: "modifyDP",
L118: kind: "selfDigivolutionStackHasTrait",
L131: kind: "GrantStatic",
L141: duration: "permanent",
L142: condition: {
L143: kind: "selfDigivolutionStackHasTrait",
L160: digivolutionRequirement: [
L164: cost: 3,
L169: cost: 3,
L176: registerIrCard("AD1-008", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-025 (Holy Warrior/Royal Knight/Hero), BT21-036 (Holy Warrior/Royal Knight/Hero), AD1-017 (Holy Warrior/Royal Knight), AD1-018 (Holy Warrior/Royal Knight). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-008.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-008");
L13: expect(definition?.nameEn).toBe("Gallantmon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("deletes multiple Digimon totaling 10000 DP, then deletes the remaining lowest-DP Digimon", async () => {
L20: const s = setupEngine(
L38: expect(
L39: s.engine.applyIntent(0, {
L45: await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
L46: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === budgetAId)).toBe(false);
L47: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === budgetBId)).toBe(false);
L48: expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestAfterBudgetId)).toBe(
L51: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L52: expect(s.state.players[1]!.security).toHaveLength(1);
L55: it("uses either printed alternate level-5 route for cost 3", async () => {
L57: const s = setupEngine({
L62: expect(
L63: s.engine.applyIntent(0, {
L70: await settle(() => s.perm("base").topCard?.cardId === "AD1-008");
L71: expect(s.state.memory).toBe(2);
L75: it("gets +5000 DP on its turn only while Takato Matsuki is in its digivolution cards", async () => {
L76: const qualified = setupEngine({
L80: expect(qualified.perm("qualified").currentDP).toBe(17000);
L82: const unqualified = setupEngine({
L86: expect(unqualified.perm("unqualified").currentDP).toBe(12000);
L89: it("uses Rush, Raid, and Piercing together after being played", async () => {
L90: const s = setupEngine(
L99: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
L102: await settle(() => s.state.players[0]!.battleArea.length === 1);
L103: expect(
L104: s.engine.applyIntent(0, {
L110: await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);
L112: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L113: expect(s.state.players[1]!.security).toHaveLength(0);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-008.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-008", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-009 — BlitzGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-009",
  "set": "AD1",
  "nameEn": "BlitzGreymon",
  "colors": [
    "Red",
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
      "color": "Red",
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
    "ADVENTURE"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Greymon] in name or w/[ADVENTURE] trait: Cost 3 \n\n＜Alliance＞ \n＜Piercing＞ \n＜Blocker＞ \n[On Play] [When Digivolving] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, until your opponent's turn ends, their Digimon's effects don't affect this Digimon and 1 of your Digimon with [Garurumon] in its name.\n[End of Your Turn] 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, 1 of your Digimon may attack.",
  "inheritedEffectText": "＜Security A. +1＞",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-009"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Greymon] in name or w/[ADVENTURE] trait: Cost 3 \n\n＜Alliance＞ \n＜Piercing＞ \n＜Blocker＞ \n[On Play] [When Digivolving] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, until your opponent's turn ends, their Digimon's effects don't affect this Digimon and 1 of your Digimon with [Garurumon] in its name.\n[End of Your Turn] 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, 1 of your Digimon may attack."
   - Inherited: "＜Security A. +1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-009`

```text
AD1-009 BlitzGreymon
  Q&A (4):
    Q6073 (2026-03-13): When exactly is the timing for the digivolution bonus draw when a digivolution would occur by this card's [End of Your Turn] effect?
      A: You perform the digivolution bonus draw when a card is placed on top of the Digimon to digivolve. A digivolution includes the bonus draw in accordance with the rules. After the card to digivolve is stacked and the digivolution bonus draw is performed, you process the remaining effects.
    Q6074 (2026-03-13): After DNA digivolving, can the DNA digivolved Digimon attack using this card's [End of Your Turn] effect?
      A: Yes, it can attack.
    Q6075 (2026-03-13): If I choose to not use this card's [End of Your Turn] effect to DNA digivolve, can I still use it to have 1 of my Digimon attack?
      A: Yes, it can attack.
    Q6076 (2026-03-13): If I use this card's [End of Your Turn] effect to DNA digivolve, can I activate the DNA digivolved card's [When Digivolving] effect before processing the part of this card's [End of Your Turn] effect after "then"?
      A: No, you can't.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-009.ts`; triggers Static, OnPlay, WhenDigivolving, EndOfYourTurn; action/condition kinds DeDigivolve, GrantStatic, DnaDigivolve, Attack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "Static",
L41: trigger: "OnPlay",
L44: kind: "DeDigivolve",
L48: kind: ["Digimon"],
L55: kind: "GrantStatic",
L64: duration: "untilOpponentTurnEnd",
L67: kind: "GrantStatic",
L71: kind: ["Digimon"],
L82: duration: "untilOpponentTurnEnd",
L87: trigger: "WhenDigivolving",
L90: kind: "DeDigivolve",
L94: kind: ["Digimon"],
L101: kind: "GrantStatic",
L110: duration: "untilOpponentTurnEnd",
L113: kind: "GrantStatic",
L117: kind: ["Digimon"],
L128: duration: "untilOpponentTurnEnd",
L133: trigger: "EndOfYourTurn",
L136: kind: "DnaDigivolve",
L140: kind: ["Digimon"],
L154: optional: true,
L157: kind: "Attack",
L161: kind: ["Digimon"],
L166: optional: true,
L171: trigger: "Static",
L185: digivolutionRequirement: [
L189: cost: 3,
L194: cost: 3,
L201: registerIrCard("AD1-009", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-014 (Cyborg/ADVENTURE), BT21-061 (Cyborg/ADVENTURE), EX9-012 (Cyborg/ADVENTURE), ST21-11 (Cyborg/ADVENTURE). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-009.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L10: it("matches committed metadata and publishes fully covered compiled IR", () => {
L13: expect(definition).toBeDefined();
L14: expect(definition?.cardId).toBe("AD1-009");
L15: expect(definition?.nameEn).toBe("BlitzGreymon");
L16: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L17: expect(compiled?.effects.length).toBeGreaterThan(0);
L18: expect(compiled?.effects).toEqual(expect.any(Array));
L21: it("de-digivolves three sources on play and grants the same-turn Garurumon protection", async () => {
L23: const s = setupEngine(
L35: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({ ok: true });
L36: await settle(() => s.perm("stacked").stack.length === 1);
L38: expect(s.perm("stacked").stack).toHaveLength(1);
L39: expect(compiled?.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
L46: it("uses either printed alternate level-5 route for cost 3", async () => {
L48: const s = setupEngine({
L53: expect(
L54: s.engine.applyIntent(0, {
L61: await settle(() => s.perm("base").topCard?.cardId === "AD1-009");
L62: expect(s.state.memory).toBe(2);
L66: it("may attack at end of turn even when DNA digivolution is unavailable (Q6075)", async () => {
L67: const s = setupEngine(
L73: expect(s.state.players[1]!.security).toHaveLength(0);
L76: it("may attack with the unsuspended Omnimon Alter-S after DNA digivolving (Q6074)", async () => {
L77: const s = setupEngine(
L93: expect(s.state.players[0]!.battleArea).toHaveLength(1);
L94: expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX4-060");
L95: expect(s.state.players[1]!.security).toHaveLength(0);
L98: it("uses Alliance and Piercing in the same battle", async () => {
L99: const s = setupEngine(
L112: expect(
L113: s.engine.applyIntent(0, {
L120: await settle(() => combat.hasOpenAllianceDecision);
L121: expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
L124: await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);
L126: expect(s.perm("ally").isSuspended).toBe(true);
L127: expect(s.state.players[1]!.security).toHaveLength(0);
L130: it("provides inherited Security Attack +1 to its host", async () => {
L131: const s = setupEngine({
L136: expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
L138: expect(
L139: s.engine.applyIntent(0, {
L145: await settle(() => s.state.players[1]!.security.length === 0, 20000);
L146: expect(s.state.players[1]!.security).toHaveLength(0);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-009.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-009", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-010 — Garurumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-010",
  "set": "AD1",
  "nameEn": "Garurumon",
  "colors": [
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 5,
  "dp": 5000,
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
    "Vaccine"
  ],
  "types": [
    "Beast",
    "ADVENTURE"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2 \n\n[On Play] [When Digivolving] ＜Draw 1＞ \n[All Turns] When your Digimon or Tamers are played or digivolve, if any of them have [Greymon] or [Matt Ishida] in their names, this Digimon may digivolve into a Digimon card with [Garurumon] in its name in the hand without paying the cost.",
  "inheritedEffectText": "＜Jamming＞",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-010"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2 \n\n[On Play] [When Digivolving] ＜Draw 1＞ \n[All Turns] When your Digimon or Tamers are played or digivolve, if any of them have [Greymon] or [Matt Ishida] in their names, this Digimon may digivolve into a Digimon card with [Garurumon] in its name in the hand without paying the cost."
   - Inherited: "＜Jamming＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-010`

```text
AD1-010 Garurumon
  Q&A (2):
    Q6077 (2026-03-13): Can I activate this card's [All Turns] effect when this card digivolves into a card with [Greymon] in its name?
      A: No, you can't.
    Q6078 (2026-03-13): What does a card with "X in its text" refer to?
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
   - `node tools/kb/query.mjs rules "play or use Option by effect cost reduction" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-010.ts`; triggers OnPlay, WhenDigivolving, AllTurns, Static; action/condition kinds Draw, SubTrigger, Digivolve. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
L9: { trigger: "WhenDigivolving", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
L11: trigger: "AllTurns",
L14: kind: "SubTrigger",
L16: sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
L19: kind: "Digivolve",
L23: kind: ["Digimon"],
L28: optional: true,
L29: condition: {
L30: kind: "anyOf",
L33: kind: "triggerSubjectMatchesFilter",
L37: kind: "triggerSubjectMatchesFilter",
L48: kind: "SubTrigger",
L50: sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
L53: kind: "Digivolve",
L57: kind: ["Digimon"],
L62: optional: true,
L63: condition: {
L64: kind: "anyOf",
L67: kind: "triggerSubjectMatchesFilter",
L71: kind: "triggerSubjectMatchesFilter",
L83: { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
L87: digivolutionRequirement: [
L88: { level: 3, texts: ["Omnimon"], cost: 2, isAlternate: true },
L89: { level: 3, traits: ["ADVENTURE"], cost: 2, isAlternate: true },
L93: registerIrCard("AD1-010", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT21-067 (Beast/ADVENTURE), AD1-001 (ADVENTURE), AD1-004 (ADVENTURE), AD1-009 (ADVENTURE). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-010.test.ts` contains 8 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine as setup, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
L30: it("free-digivolves a chosen Digimon into Garurumon when a Greymon is played", async () => {
L44: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
L47: await settle(() => s.perm("host").topCard.cardId === "BT1-040");
L48: expect(s.perm("host").topCard.cardId).toBe("BT1-040");
L51: it("draws on play and when digivolving", async () => {
L54: expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("garurumon").instanceId })).toEqual(
L57: await settle(() => played.state.players[0]!.hand.length === 1);
L58: expect(played.state.players[0]!.hand[0]!.cardId).toBe("BT1-001");
L68: expect(
L69: evolved.engine.applyIntent(0, {
L75: await settle(() => evolved.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
L76: expect(evolved.state.memory).toBe(1);
L79: it("uses both alternate level-3 routes for cost 2", async () => {
L86: expect(
L87: s.engine.applyIntent(0, {
L93: await settle(() => s.perm("base").topCard.cardId === "AD1-010");
L94: expect(s.state.memory).toBe(1);
L98: it("free-digivolves after Matt Ishida is played", async () => {
L113: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matt").instanceId })).toEqual({ ok: true });
L114: await settle(() => s.perm("host").topCard.cardId === "BT1-040");
L115: expect(s.perm("host").topCard.cardId).toBe("BT1-040");
L118: it("does not retrigger after this Garurumon itself digivolves into Greymon (Q6077)", async () => {
L133: expect(
L134: s.engine.applyIntent(0, {
L140: await settle(() => s.perm("host").topCard.cardId === "BT10-024");
L141: await settle();
L143: expect(s.perm("host").topCard.cardId).toBe("BT10-024");
L144: expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-002")).toBe(true);
L147: it("models both play/digivolve watchers and alternate digivolution requirements", () => {
L149: expect(allTurns?.actions).toEqual(
L155: expect(compiled.digivolutionRequirement).toEqual(
L163: it("a low-DP top card stacked over AD1-010 is NOT deleted by a higher-DP Security Digimon (Jamming)", async () => {
L178: expect(
L185: expect(
L186: s.engine.applyIntent(0, {
L193: await settle(() => p1.security.length === 0);
L194: await settle(() => p0.battleArea.some((p) => p.permanentId === attacker.permanentId));
L196: expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true); // still alive
L197: expect(p0.trash.some((c) => c.instanceId === attacker.topCard?.instanceId)).toBe(false);
L201: it("negative control: AD1-010 as the TOP card (not stacked) does NOT grant itself Jamming — it is an Inherited Effect", async () => {
L209: expect(
L210: s.engine.applyIntent(0, {
L217: await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));
L219: expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false); // deleted
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-010.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-010", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-011 — Paildramon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-011",
  "set": "AD1",
  "nameEn": "Paildramon",
  "colors": [
    "Blue",
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
      "color": "Blue",
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
    "Free"
  ],
  "types": [
    "Dragonkin",
    "Hero"
  ],
  "effectText": "＜Partition (Blue Lv.4 & Green Lv.4)＞ \n[When Digivolving] Until your opponent's turn ends, this Digimon can't be deleted in battle. Then, if DNA digivolving, this Digimon's attack target can't change for the turn.\n[When Attacking] This Digimon may digivolve into a Digimon card with [Imperialdramon] in its name in the hand with the digivolution cost reduced by 2.",
  "inheritedEffectText": "＜Partition (Blue Lv.4 & Green Lv.4)＞",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-011"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Partition (Blue Lv.4 & Green Lv.4)＞ \n[When Digivolving] Until your opponent's turn ends, this Digimon can't be deleted in battle. Then, if DNA digivolving, this Digimon's attack target can't change for the turn.\n[When Attacking] This Digimon may digivolve into a Digimon card with [Imperialdramon] in its name in the hand with the digivolution cost reduced by 2."
   - Inherited: "＜Partition (Blue Lv.4 & Green Lv.4)＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-011`

```text
AD1-011 Paildramon
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-011.ts`; triggers Static, WhenDigivolving, WhenAttacking; action/condition kinds Restrict, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "WhenDigivolving",
L24: kind: "Restrict",
L33: duration: "untilOpponentTurnEnd",
L36: kind: "Restrict",
L45: duration: "forTheTurn",
L46: condition: {
L47: kind: "isDnaDigivolving",
L54: trigger: "WhenAttacking",
L57: kind: "Digivolve",
L67: kind: ["Digimon"],
L78: optional: true,
L83: trigger: "Static",
L98: registerIrCard("AD1-011", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-004 (Dragonkin/Hero), BT21-021 (Dragonkin/Hero), ST20-11 (Dragonkin/Hero), AD1-003 (Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-011.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-011");
L13: expect(definition?.nameEn).toBe("Paildramon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("protects the digivolved Paildramon from battle deletion until the opponent's turn ends", async () => {
L20: const s = setupEngine(
L29: expect(
L30: s.engine.applyIntent(0, {
L36: await settle(() => s.perm("base").topCard.cardId === "AD1-011");
L41: await settle(() => continuous.hasRestriction(s.perm("base").permanentId, "beDeletedInBattle"));
L42: expect(continuous.hasRestriction(s.perm("base").permanentId, "beDeletedInBattle")).toBe(true);
L44: expect(
L45: s.engine.applyIntent(0, {
L51: await settle();
L52: expect(
L57: it("digivolves into Imperialdramon while attacking with the cost reduced by 2", async () => {
L58: const s = setupEngine(
L67: expect(
L68: s.engine.applyIntent(0, {
L74: await settle(() => s.perm("paildramon").topCard.cardId === "BT12-030");
L76: expect(s.state.memory).toBe(3);
L77: expect(s.perm("paildramon").topCard.cardId).toBe("BT12-030");
L80: it("publishes Partition both directly and as an inherited keyword", async () => {
L81: const s = setupEngine({
L93: expect(continuous.hasKeyword(s.perm("paildramon").permanentId, "Partition")).toBe(true);
L94: expect(continuous.hasKeyword(s.perm("host").permanentId, "Partition")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-011.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-011", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-012 — CresGarurumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-012",
  "set": "AD1",
  "nameEn": "CresGarurumon",
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
    "Data"
  ],
  "types": [
    "Beast Knight",
    "ADVENTURE"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Garurumon] in name or w/[ADVENTURE] trait: Cost 3 \n\n＜Alliance＞ \n＜Evade＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's lowest level Digimon to the hand. Then, this Digimon and 1 of your Digimon with [Greymon] in its name may unsuspend.\n[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, you may change the attack target to 1 of your Digimon.",
  "inheritedEffectText": "[Your Turn] This Digimon's attack target can't change.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-012"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Garurumon] in name or w/[ADVENTURE] trait: Cost 3 \n\n＜Alliance＞ \n＜Evade＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's lowest level Digimon to the hand. Then, this Digimon and 1 of your Digimon with [Greymon] in its name may unsuspend.\n[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, you may change the attack target to 1 of your Digimon."
   - Inherited: "[Your Turn] This Digimon's attack target can't change."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-012`

```text
AD1-012 CresGarurumon
  Q&A (3):
    Q6079 (2026-03-13): When exactly is the timing for the digivolution bonus draw when a digivolution would occur by this card's [Opponent's Turn] effect?
      A: You perform the digivolution bonus draw when a card is placed on top of the Digimon to digivolve. A digivolution includes the bonus draw in accordance with the rules. After the card to digivolve is stacked and the digivolution bonus draw is performed, you process the remaining effects.
    Q6080 (2026-03-13): If I use this card's [Opponent's Turn] effect to DNA digivolve, can I activate the DNA digivolved card's [When Digivolving] effect before processing the part of this card's [Opponent's Turn] effect after "then"?
      A: No, you can't.
    Q6081 (2026-03-13): If a Digimon has an "attack targets can't be changed" effect, can I change its own attack target using <Raid> or other method?
      A: No, you can't.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-012.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, OpponentsTurn, YourTurn; action/condition kinds Return, Unsuspend, SubTrigger, DnaDigivolve, RedirectAttack, Restrict. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "Return",
L38: kind: ["Digimon"],
L44: optional: true,
L47: kind: "Unsuspend",
L55: optional: true,
L58: kind: "Unsuspend",
L62: kind: ["Digimon"],
L67: optional: true,
L70: frequency: "OncePerTurn",
L71: sharedUseKey: "ir-shared-0",
L74: trigger: "WhenDigivolving",
L77: kind: "Return",
L81: kind: ["Digimon"],
L87: optional: true,
L90: kind: "Unsuspend",
L98: optional: true,
L101: kind: "Unsuspend",
L105: kind: ["Digimon"],
L110: optional: true,
L113: frequency: "OncePerTurn",
L114: sharedUseKey: "ir-shared-0",
L117: trigger: "WhenAttacking",
L120: kind: "Return",
L124: kind: ["Digimon"],
L130: optional: true,
L133: kind: "Unsuspend",
L141: optional: true,
L144: kind: "Unsuspend",
L148: kind: ["Digimon"],
L153: optional: true,
L156: frequency: "OncePerTurn",
L157: sharedUseKey: "ir-shared-0",
L160: trigger: "OpponentsTurn",
L163: kind: "SubTrigger",
L167: kind: "DnaDigivolve",
L171: kind: ["Digimon"],
L185: optional: true,
L188: kind: "RedirectAttack",
L192: kind: ["Digimon"],
L196: optional: true,
L199: frequency: "OncePerTurn",
L202: frequency: "OncePerTurn",
L205: trigger: "YourTurn",
L208: kind: "Restrict",
L217: duration: "permanent",
L225: digivolutionRequirement: [
L229: cost: 3,
L234: cost: 3,
L241: registerIrCard("AD1-012", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-001 (ADVENTURE), AD1-004 (ADVENTURE), AD1-009 (ADVENTURE), AD1-010 (ADVENTURE). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-012.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-012");
L13: expect(definition?.nameEn).toBe("CresGarurumon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("returns exactly one opposing lowest-level Digimon to its owner's hand on play", async () => {
L20: const s = setupEngine(
L36: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cres").instanceId })).toEqual({ ok: true });
L37: await settle(() => s.state.players[1]!.battleArea.length === 1);
L38: await settle();
L39: expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
L40: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("higher").permanentId);
L41: expect(s.perm("greymon").isSuspended).toBe(false);
L44: it("returns the lowest-level Digimon and unsuspends itself plus Greymon when attacking", async () => {
L45: const s = setupEngine(
L64: expect(
L65: s.engine.applyIntent(0, {
L71: await settle(() => s.state.players[1]!.battleArea.length === 1);
L72: await settle();
L74: expect(s.perm("cres").isSuspended).toBe(false);
L75: expect(s.perm("greymon").isSuspended).toBe(false);
L76: expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
L79: it("redirects an opposing attack even when the optional DNA digivolution is unavailable", async () => {
L80: const s = setupEngine(
L90: expect(
L91: s.engine.applyIntent(1, {
L97: await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
L99: expect(s.state.players[0]!.security).toHaveLength(1);
L100: expect(
L105: it("uses either printed alternate level-5 route for cost 3", async () => {
L107: const s = setupEngine({
L112: expect(
L113: s.engine.applyIntent(0, {
L120: await settle(() => s.perm("base").topCard.cardId === "AD1-012");
L121: expect(s.state.memory).toBe(2);
L125: it("publishes Alliance, Evade, and inherited attack-target protection", async () => {
L126: const s = setupEngine({
L144: expect(continuous.hasKeyword(s.perm("cres").permanentId, "Alliance")).toBe(true);
L145: expect(continuous.hasKeyword(s.perm("cres").permanentId, "Evade")).toBe(true);
L146: expect(continuous.hasRestriction(s.perm("host").permanentId, "attackTargetChange")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-012.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-012", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-013 — ZeigGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-013",
  "set": "AD1",
  "nameEn": "ZeigGreymon",
  "colors": [
    "Blue",
    "Black"
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
    "Cyborg",
    "Blue Flare",
    "Xros Heart"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Blue Flare]/[Xros Heart] trait: Cost 3 \n\n＜Reboot＞ \n＜Blocker＞ \n[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with the fewest digivolution cards.\n[All Turns] When this Digimon would leave the battle area other than by DigiXros, you may play 1 level 5 or lower [Blue Flare] or [Xros Heart] trait Digimon card from its digivolution cards without paying the cost.",
  "inheritedEffectText": "[All Turns] For each color in this [Blue Flare] or [Xros Heart] trait Digimon's digivolution cards, it gets +1000 DP.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-013"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Blue Flare]/[Xros Heart] trait: Cost 3 \n\n＜Reboot＞ \n＜Blocker＞ \n[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with the fewest digivolution cards.\n[All Turns] When this Digimon would leave the battle area other than by DigiXros, you may play 1 level 5 or lower [Blue Flare] or [Xros Heart] trait Digimon card from its digivolution cards without paying the cost."
   - Inherited: "[All Turns] For each color in this [Blue Flare] or [Xros Heart] trait Digimon's digivolution cards, it gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-013`

```text
AD1-013 ZeigGreymon
  Q&A (1):
    Q6082 (2026-03-13): When I activate this card's [All Turns] effect and would play cards from its digivolution cards, if I would choose this card for a DigiXros on those cards, can I choose this card in the battle area?
      A: Yes, you can.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-013.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns; action/condition kinds Delete, Replacement, PlayFromZone, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "Delete",
L39: kind: ["Digimon"],
L47: trigger: "WhenDigivolving",
L50: kind: "Delete",
L55: kind: ["Digimon"],
L63: trigger: "AllTurns",
L66: kind: "Replacement",
L73: kind: "PlayFromZone",
L77: kind: ["Digimon"],
L94: optional: true,
L101: trigger: "AllTurns",
L104: kind: "ModifyDP",
L119: duration: "permanent",
L120: condition: {
L121: kind: "selfHasTrait",
L138: digivolutionRequirement: [
L142: cost: 3,
L148: registerIrCard("AD1-013", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-006 (Xros Heart/Blue Flare), BT11-018 (Xros Heart/Blue Flare), BT19-014 (Xros Heart/Blue Flare), BT19-025 (Cyborg/Blue Flare). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-013.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-013");
L13: expect(definition?.nameEn).toBe("ZeigGreymon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("deletes the opponent's Digimon with the fewest digivolution cards on play", async () => {
L20: const s = setupEngine(
L33: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeig").instanceId })).toEqual({ ok: true });
L34: await settle(() => s.state.players[1]!.battleArea.length === 1);
L35: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("with-source").permanentId);
L38: it("uses the Blue Flare alternate level-5 evolution route for cost 3 and deletes on evolution", async () => {
L39: const s = setupEngine(
L53: expect(
L54: s.engine.applyIntent(0, {
L60: await settle(() => s.state.players[1]!.battleArea.length === 1);
L62: expect(s.state.memory).toBe(2);
L63: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("with-source").permanentId);
L66: it("plays an eligible Blue Flare source when it would leave, then still leaves", async () => {
L67: const s = setupEngine(
L78: expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia-force").instanceId })).toEqual({
L81: await settle(
L85: await settle();
L87: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-013")).toBe(false);
L88: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-024")).toBe(true);
L91: it("gives a qualifying host +1000 DP per distinct color in its digivolution cards", async () => {
L92: const qualified = setupEngine({
L96: expect(qualified.perm("host").currentDP).toBe(16000);
L98: const unqualified = setupEngine({
L102: expect(unqualified.perm("host").currentDP).toBe(15000);
L105: it("publishes Reboot and Blocker on itself", async () => {
L106: const s = setupEngine({ 0: { battleArea: [{ card: "AD1-013", as: "zeig" }] } });
L110: expect(continuous.hasKeyword(s.perm("zeig").permanentId, "Reboot")).toBe(true);
L111: expect(continuous.hasKeyword(s.perm("zeig").permanentId, "Blocker")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-013.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-013", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-014 — MetalGarurumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-014",
  "set": "AD1",
  "nameEn": "MetalGarurumon",
  "colors": [
    "Blue",
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
      "color": "Blue",
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
    "Cyborg",
    "ADVENTURE",
    "Hero"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Garurumon] in name: Cost 3\n[Digivolve] Lv.5 w/[ADVENTURE]/[Hero] trait: Cost 3 \n\n＜Blocker＞ \n＜Evade＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's level 5 or lower Digimon. Then, for every 2 of your Tamers' colors, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.\n[All Turns] [Once Per Turn] When any of your Digimon suspend, this Digimon may unsuspend.",
  "inheritedEffectText": "[When Attacking] [Once Per Turn] If this Digimon has [Garurumon] or [Omnimon] in its name, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-014"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Garurumon] in name: Cost 3\n[Digivolve] Lv.5 w/[ADVENTURE]/[Hero] trait: Cost 3 \n\n＜Blocker＞ \n＜Evade＞ \n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's level 5 or lower Digimon. Then, for every 2 of your Tamers' colors, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.\n[All Turns] [Once Per Turn] When any of your Digimon suspend, this Digimon may unsuspend."
   - Inherited: "[When Attacking] [Once Per Turn] If this Digimon has [Garurumon] or [Omnimon] in its name, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-014`

```text
AD1-014 MetalGarurumon
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-014.ts`; triggers Static, OnPlay, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Delete, Restrict, SubTrigger, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "OnPlay",
L34: kind: "Delete",
L38: kind: ["Digimon"],
L48: kind: "Restrict",
L52: kind: ["Digimon", "Tamer"],
L57: duration: "untilOpponentTurnEnd",
L62: kind: ["Tamer"],
L68: frequency: "OncePerTurn",
L69: sharedUseKey: "ir-shared-0",
L72: trigger: "WhenDigivolving",
L75: kind: "Delete",
L79: kind: ["Digimon"],
L89: kind: "Restrict",
L93: kind: ["Digimon", "Tamer"],
L98: duration: "untilOpponentTurnEnd",
L103: kind: ["Tamer"],
L109: frequency: "OncePerTurn",
L110: sharedUseKey: "ir-shared-0",
L113: trigger: "WhenAttacking",
L116: kind: "Delete",
L120: kind: ["Digimon"],
L130: kind: "Restrict",
L134: kind: ["Digimon", "Tamer"],
L139: duration: "untilOpponentTurnEnd",
L144: kind: ["Tamer"],
L150: frequency: "OncePerTurn",
L151: sharedUseKey: "ir-shared-0",
L154: trigger: "AllTurns",
L157: kind: "SubTrigger",
L161: kind: ["Digimon"],
L165: kind: "Unsuspend",
L173: optional: true,
L178: frequency: "OncePerTurn",
L181: trigger: "WhenAttacking",
L184: kind: "Restrict",
L188: kind: ["Digimon", "Tamer"],
L193: duration: "untilOpponentTurnEnd",
L194: condition: {
L195: kind: "selfHasNameContaining",
L202: frequency: "OncePerTurn",
L207: digivolutionRequirement: [
L211: cost: 3,
L217: cost: 3,
L223: registerIrCard("AD1-014", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-003 (Cyborg/Hero), AD1-004 (ADVENTURE/Hero), AD1-009 (Cyborg/ADVENTURE), AD1-019 (ADVENTURE/Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-014.test.ts` contains 7 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-014");
L13: expect(definition?.nameEn).toBe("MetalGarurumon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("deletes one opposing level-five-or-lower Digimon on play and leaves a higher level intact", async () => {
L20: const s = setupEngine(
L33: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
L34: await settle(() => s.state.players[1]!.battleArea.length === 1);
L35: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
L38: it("restricts one opposing permanent for every two distinct Tamer colors", async () => {
L39: const s = setupEngine(
L60: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
L64: await settle(
L71: expect(
L76: it("does not create a suspension restriction with fewer than two Tamer colors", async () => {
L77: const s = setupEngine(
L86: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
L87: await settle();
L91: expect(continuous.hasRestriction(s.perm("target").permanentId, "suspend")).toBe(false);
L94: it("unsuspends once when one of its Digimon suspends", async () => {
L95: const s = setupEngine(
L108: expect(
L109: s.engine.applyIntent(0, {
L115: await settle(() => s.perm("metal").isSuspended === false);
L116: expect(s.perm("metal").isSuspended).toBe(false);
L119: it("uses all three printed alternate level-5 routes for cost 3", async () => {
L121: const s = setupEngine({
L126: expect(
L127: s.engine.applyIntent(0, {
L134: await settle(() => s.perm("base").topCard.cardId === "AD1-014");
L135: expect(s.state.memory).toBe(2);
L139: it("publishes Blocker and Evade", async () => {
L140: const s = setupEngine({ 0: { battleArea: [{ card: "AD1-014", as: "metal" }] } });
L144: expect(continuous.hasKeyword(s.perm("metal").permanentId, "Blocker")).toBe(true);
L145: expect(continuous.hasKeyword(s.perm("metal").permanentId, "Evade")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-014.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-014", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-015 — Beowolfmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-015",
  "set": "AD1",
  "nameEn": "Beowolfmon",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 8,
  "dp": 8000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 4,
      "memoryCost": 3
    }
  ],
  "forms": [
    "Hybrid"
  ],
  "attributes": [
    "Variable"
  ],
  "types": [
    "Warrior"
  ],
  "effectText": "[Digivolve] [Koji Minamoto] w/2 or more [Hybrid] trait cards under: Cost 3 \n\n＜Jamming＞ \n[When Digivolving] [When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.\n[End of Attack] [On Deletion] You may play 1 yellow, black or purple Tamer card with inherited effects from your hand or trash without paying the cost. Then, by placing 1 [Hybrid] or [Ten Warriors] trait card from your hand under this under this Digimon or your Tamers, ＜Draw 2＞.",
  "inheritedEffectText": "[When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-015"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Koji Minamoto] w/2 or more [Hybrid] trait cards under: Cost 3 \n\n＜Jamming＞ \n[When Digivolving] [When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.\n[End of Attack] [On Deletion] You may play 1 yellow, black or purple Tamer card with inherited effects from your hand or trash without paying the cost. Then, by placing 1 [Hybrid] or [Ten Warriors] trait card from your hand under this under this Digimon or your Tamers, ＜Draw 2＞."
   - Inherited: "[When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-015`

```text
AD1-015 Beowolfmon
  Q&A (7):
    Q6083 (2026-03-13): Can I process the part of the effect after "then" in this card's [End of Attack] [On Deletion] effect even if I don't play a Tamer?
      A: Yes, you can.
    Q6909 (2026-06-19): Does a digivolution requirement that digivolves from a Tamer mean that the Tamer that will become a digivolution card is treated as a Digimon when it digivolves?
      A: No, it digivolves from the Tamer as-is. It isn't treated as a Digimon that digivolves, therefore "when a Digimon would digivolve" effects and "when a Digimon digivolves" effects don't trigger. In addition, this digivolution requirement can be used to digivolve a Tamer even if a "Digimon can't digivolve" effect activates.
    Q6910 (2026-06-19): Is a digivolution bonus draw performed even when a Tamer digivolves?
      A: Yes, you perform a digivolution bonus draw. A digivolution bonus draw is performed for any kind of digivolution.
    Q6911 (2026-06-19): If this card digivolves from a Tamer that was played this turn, can it attack in the same turn?
      A: No, it can't. Even if a card digivolves from a card that was placed on the field in the same turn, it can't attack during that turn. It can only attack in the turns after it's played.
    Q6912 (2026-06-19): Does a Tamer card placed under a Digimon become a digivolution card?
      A: Yes, it becomes a digivolution card. If that Digimon would leave the field, the Tamer card will be trashed like a normal digivolution card.
    Q6913 (2026-06-19): Does a Digimon gain the Security effect in the lower text on a Tamer card in digivolution cards?
      A: No, it doesn't.
    Q6914 (2026-06-19): Does a Digimon gain the Inherited effect in the lower text on a Tamer card in digivolution cards?
      A: Yes, it does.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-015.ts`; triggers Static, WhenAttacking; action/condition kinds ModifyDP, PlayWithoutCost, Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: ["WhenDigivolving", "WhenAttacking"],
L24: kind: "ModifyDP",
L28: kind: ["Digimon"],
L33: duration: "forTheTurn",
L38: trigger: ["EndOfAttack", "OnDeletion"],
L41: kind: "PlayWithoutCost",
L46: kind: ["Tamer"],
L53: optional: true,
L56: kind: "Draw",
L59: cost: {
L60: kind: "place",
L81: kind: ["Tamer"],
L88: optional: true,
L93: trigger: "WhenAttacking",
L96: kind: "ModifyDP",
L100: kind: ["Digimon"],
L105: duration: "forTheTurn",
L113: digivolutionRequirement: [
L116: cost: 3,
L124: registerIrCard("AD1-015", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT13-067 (Warrior), BT16-013 (Warrior), BT17-022 (Warrior), BT17-026 (Warrior). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-015.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-015");
L13: expect(definition?.nameEn).toBe("Beowolfmon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("reduces an opposing Digimon by exactly 4000 DP when digivolving", async () => {
L20: const s = setupEngine(
L28: expect(
L29: s.engine.applyIntent(0, {
L35: await settle(() => s.perm("target").currentDP === 4000);
L36: expect(s.perm("target").currentDP).toBe(4000);
L39: it("digivolves from Koji with two Hybrid cards underneath for cost 3", async () => {
L40: const s = setupEngine({
L48: expect(
L49: s.engine.applyIntent(0, {
L55: await settle(() => s.perm("koji").topCard.cardId === "AD1-015");
L57: expect(s.state.memory).toBe(2);
L58: expect(s.perm("koji").stack.some((card) => card.cardId === "BT17-083")).toBe(true);
L61: it("continues when no Tamer is played, places a Hybrid under a Tamer, and draws two (Q6083)", async () => {
L62: const s = setupEngine(
L80: expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia-force").instanceId })).toEqual({
L83: await settle(() => s.perm("koji").stack.some((card) => card.cardId === "BT12-009"));
L84: await settle(() => s.state.players[0]!.hand.length === 2);
L86: expect(s.perm("koji").stack.some((card) => card.cardId === "BT12-009")).toBe(true);
L87: expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
L90: it("inherits the when-attacking -4000 DP effect", async () => {
L91: const s = setupEngine(
L99: expect(
L100: s.engine.applyIntent(0, {
L106: await settle(() => s.perm("target").currentDP === 4000);
L107: expect(s.perm("target").currentDP).toBe(4000);
L110: it("publishes Jamming only as its direct keyword", async () => {
L111: const s = setupEngine({ 0: { battleArea: [{ card: "AD1-015", as: "beowolf" }] } });
L115: expect(continuous.hasKeyword(s.perm("beowolf").permanentId, "Jamming")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-015.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-015", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-016 — ShineGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-016",
  "set": "AD1",
  "nameEn": "ShineGreymon",
  "colors": [
    "Yellow",
    "Red"
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
    "Light Dragon",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.5 w/[RizeGreymon] in name or w/[DATA SQUAD] trait: Cost 3 \n\n＜Alliance＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Marcus Damon] from your hand or trash without paying the cost. Then, to 1 of your opponent's Digimon, give -3000 DP for each of your Digimon and Tamers until their turn ends.\n[All Turns] [Once Per Turn] When any of your [Marcus Damon]s are played or suspend, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-016"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[RizeGreymon] in name or w/[DATA SQUAD] trait: Cost 3 \n\n＜Alliance＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Marcus Damon] from your hand or trash without paying the cost. Then, to 1 of your opponent's Digimon, give -3000 DP for each of your Digimon and Tamers until their turn ends.\n[All Turns] [Once Per Turn] When any of your [Marcus Damon]s are played or suspend, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-016`

```text
AD1-016 ShineGreymon
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-016.ts`; triggers Static, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds PlayWithoutCost, ModifyDP, SubTrigger, Delete. Clause-bearing lines:

```text
L4: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Static",
L18: trigger: "Static",
L28: trigger: "WhenDigivolving",
L31: kind: "PlayWithoutCost",
L46: optional: true,
L49: kind: "ModifyDP",
L53: kind: ["Digimon"],
L58: duration: "untilOpponentTurnEnd",
L63: kind: ["Digimon", "Tamer"],
L69: frequency: "OncePerTurn",
L70: sharedUseKey: "ir-shared-0",
L73: trigger: "WhenAttacking",
L76: kind: "PlayWithoutCost",
L91: optional: true,
L94: kind: "ModifyDP",
L98: kind: ["Digimon"],
L103: duration: "untilOpponentTurnEnd",
L108: kind: ["Digimon", "Tamer"],
L114: frequency: "OncePerTurn",
L115: sharedUseKey: "ir-shared-0",
L118: trigger: "AllTurns",
L121: kind: "SubTrigger",
L134: kind: "Delete",
L138: kind: ["Digimon"],
L146: optional: true,
L151: kind: "SubTrigger",
L164: kind: "Delete",
L168: kind: ["Digimon"],
L176: optional: true,
L181: frequency: "OncePerTurn",
L186: digivolutionRequirement: [
L190: cost: 3,
L195: cost: 3,
L202: registerIrCard("AD1-016", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-104 (Light Dragon/DATA SQUAD), ST24-07 (Light Dragon/DATA SQUAD), AD1-007 (Light Dragon), AD1-021 (DATA SQUAD). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-016.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-016");
L13: expect(definition?.nameEn).toBe("ShineGreymon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("plays Marcus Damon for free and applies -3000 DP per own Digimon or Tamer", async () => {
L20: const s = setupEngine(
L39: expect(
L40: s.engine.applyIntent(0, {
L46: await settle(() => s.perm("scaled-target").currentDP === 12001 && s.state.players[1]!.battleArea.length === 1);
L47: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT12-092")).toBe(true);
L48: expect(s.perm("scaled-target").currentDP).toBe(12001);
L49: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("scaled-target").permanentId);
L52: it("does not delete above ShineGreymon's DP when Marcus is played", async () => {
L53: const s = setupEngine(
L67: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
L70: await settle(() => s.state.players[1]!.battleArea.length === 1);
L72: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over").permanentId);
L75: it("shares one use between its when-digivolving and when-attacking timings", async () => {
L76: const s = setupEngine(
L91: expect(
L92: s.engine.applyIntent(0, {
L98: await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.currentDP === 9000));
L99: expect(
L100: s.engine.applyIntent(0, {
L106: await settle();
L108: expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 9000)).toHaveLength(1);
L109: expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 12000)).toHaveLength(1);
L112: it("uses either printed alternate level-5 route for cost 3", async () => {
L114: const s = setupEngine({
L119: expect(
L120: s.engine.applyIntent(0, {
L127: await settle(() => s.perm("base").topCard.cardId === "AD1-016");
L128: expect(s.state.memory).toBe(2);
L132: it("publishes Alliance and Blocker", async () => {
L133: const s = setupEngine({ 0: { battleArea: [{ card: "AD1-016", as: "shine" }] } });
L137: expect(continuous.hasKeyword(s.perm("shine").permanentId, "Alliance")).toBe(true);
L138: expect(continuous.hasKeyword(s.perm("shine").permanentId, "Blocker")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-016.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-016", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-017 — Dynasmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-017",
  "set": "AD1",
  "nameEn": "Dynasmon",
  "colors": [
    "Yellow",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 11000,
  "evoCosts": [
    {
      "color": "Yellow",
      "level": 5,
      "memoryCost": 3
    },
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
    "Data"
  ],
  "types": [
    "Holy Warrior",
    "Royal Knight"
  ],
  "effectText": "When this card would be played, if you have 4 or more cards with [Lucemon] or [Witchelny] in its text in your trash, reduce the play cost by 5.\n[On Play] [When Digivolving] By trashing your top or bottom security card, all of your opponent's Digimon get -6000 DP for the turn.\n[All Turns] [Once Per Turn] When your security stack is removed from, you may delete 1 of your opponent's lowest DP Digimon.",
  "securityEffectText": "[Security] Give 1 of your opponent's Digimon ＜Security A. -1＞ for the turn. Then, 1 of their Digimon gets -3000 DP until your turn ends.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-017"
}
```
2. **Exact printed surfaces:**
   - Main: "When this card would be played, if you have 4 or more cards with [Lucemon] or [Witchelny] in its text in your trash, reduce the play cost by 5.\n[On Play] [When Digivolving] By trashing your top or bottom security card, all of your opponent's Digimon get -6000 DP for the turn.\n[All Turns] [Once Per Turn] When your security stack is removed from, you may delete 1 of your opponent's lowest DP Digimon."
   - Security: "[Security] Give 1 of your opponent's Digimon ＜Security A. -1＞ for the turn. Then, 1 of their Digimon gets -3000 DP until your turn ends."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-017`

```text
AD1-017 Dynasmon
  Q&A (4):
    Q6084 (2026-03-13): If I use this card's [On Play] [When Digivolving] effect to trash a security card, can I activate this card's [All Turns] effect before giving all of my opponent's Digimon -6000 DP?
      A: No, you can't.
    Q6085 (2026-03-13): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q6086 (2026-03-13): If this card is checked from a security stack, does its [Security] effect activate, then does it battle with the attacking Digimon?
      A: Yes, its [Security] effect activates, then it battles.
    Q6087 (2026-03-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-017.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns, Security; action/condition kinds Replacement, ModifyDP, SubTrigger, Delete, GainKeyword. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "Replacement",
L21: kind: "Replacement",
L26: condition: {
L27: kind: "youHave",
L47: trigger: "OnPlay",
L50: kind: "ModifyDP",
L54: kind: ["Digimon"],
L59: duration: "forTheTurn",
L60: cost: {
L61: kind: "trash",
L76: trigger: "WhenDigivolving",
L79: kind: "ModifyDP",
L83: kind: ["Digimon"],
L88: duration: "forTheTurn",
L89: cost: {
L90: kind: "trash",
L105: trigger: "AllTurns",
L108: kind: "SubTrigger",
L112: kind: "Delete",
L116: kind: ["Digimon"],
L121: optional: true,
L126: frequency: "OncePerTurn",
L129: trigger: "Security",
L132: kind: "GainKeyword",
L136: kind: ["Digimon"],
L145: duration: "forTheTurn",
L148: kind: "ModifyDP",
L152: kind: ["Digimon"],
L157: duration: "untilYourTurnEnd",
L167: registerIrCard("AD1-017", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-008 (Holy Warrior/Royal Knight), AD1-018 (Holy Warrior/Royal Knight), AD1-025 (Holy Warrior/Royal Knight), BT1-084 (Holy Warrior/Royal Knight). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-017.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-017");
L13: expect(definition?.nameEn).toBe("Dynasmon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("trashes one security card and gives every opposing Digimon -6000 DP on play", async () => {
L20: const s = setupEngine(
L33: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
L36: await settle(() => s.decisions.some((decision) => decision.req.kind === "chooseOption"));
L38: expect(choice).toBeDefined();
L39: s.engine.applyIntent(0, {
L44: await settle(() => s.perm("target").currentDP === 2000);
L45: expect(s.state.players[0]!.security).toHaveLength(1);
L46: expect(s.perm("target").currentDP).toBe(2000);
L49: it("reduces its play cost by 5 with four Lucemon-text cards in trash", async () => {
L50: const s = setupEngine({
L60: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
L63: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-017"));
L64: expect(s.state.memory).toBe(1);
L67: it("finishes the -6000 DP effect before the security-removal deletion resolves (Q6084)", async () => {
L68: const s = setupEngine(
L86: expect(
L87: s.engine.applyIntent(0, {
L93: await settle(() => s.state.players[1]!.battleArea.length === 1);
L95: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("higher-after-reduction").permanentId);
L96: expect(s.perm("higher-after-reduction").currentDP).toBe(3000);
L99: it("reacts only when its own security is removed", async () => {
L100: const s = setupEngine(
L116: expect(
L117: s.engine.applyIntent(1, {
L123: await settle(() => s.state.players[1]!.battleArea.length === 1, 5000);
L124: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("other").permanentId);
L127: it("resolves its Security effect before battling the attacking Digimon (Q6086)", async () => {
L128: const s = setupEngine(
L137: expect(
L138: s.engine.applyIntent(1, {
L144: await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
L145: expect(s.state.players[1]!.battleArea).toHaveLength(0);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-017.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-017", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-018 — LordKnightmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-018",
  "set": "AD1",
  "nameEn": "LordKnightmon",
  "colors": [
    "Purple",
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 6,
  "playCost": 11,
  "dp": 11000,
  "evoCosts": [
    {
      "color": "Purple",
      "level": 5,
      "memoryCost": 3
    },
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
    "Holy Warrior",
    "Royal Knight"
  ],
  "effectText": "When this card would be played, if you have 4 or more cards with [Knightmon] or [Lucemon] in its text in your trash, reduce the play cost by 5.\n[On Play] [When Digivolving] Until your opponent's turn ends, their Digimon's effects don't affect 1 of your Digimon.\n[All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] or [Lucemon] in its text are played, ＜De-Digivolve 2＞ 1 of your opponent's Digimon.",
  "securityEffectText": "[Security] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, delete 1 of your opponent's Digimon with a play cost of 3 or less.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-018"
}
```
2. **Exact printed surfaces:**
   - Main: "When this card would be played, if you have 4 or more cards with [Knightmon] or [Lucemon] in its text in your trash, reduce the play cost by 5.\n[On Play] [When Digivolving] Until your opponent's turn ends, their Digimon's effects don't affect 1 of your Digimon.\n[All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] or [Lucemon] in its text are played, ＜De-Digivolve 2＞ 1 of your opponent's Digimon."
   - Security: "[Security] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, delete 1 of your opponent's Digimon with a play cost of 3 or less."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-018`

```text
AD1-018 LordKnightmon
  Q&A (10):
    Q6088 (2026-03-13): What does "effects don't affect" mean, exactly?
      A: This effect prevents a card from being affected by effects. For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.
    Q6089 (2026-03-13): Can a card that has an "effects don't affect" effect be chosen for an effect?
      A: Yes, it can be chosen. For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.
    Q6090 (2026-03-13): Can a card that has an "effects don't affect" effect be given an effect?
      A: Yes, it can. It won't be affected by it, but it can be given an effect. However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.
    Q6091 (2026-03-13): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
      A: As soon as it gains the "effects don't affect" effect, it will no longer be affected.
    Q6092 (2026-03-13): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
      A: It will be affected by the effect as soon as it can be affected by effects.
    Q6093 (2026-03-13): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
      A: If the Digimon isn't affected by effects upon the trigger timing, the effect won't trigger.
    Q6094 (2026-03-13): Does this card's [All Turns] effect also trigger when this card itself is played?
      A: Yes, it triggers.
    Q6095 (2026-03-13): If this card is checked from a security stack, does its [Security] effect activate, then does it battle with the attacking Digimon?
      A: Yes, its [Security] effect activates, then it battles.
    Q6096 (2026-03-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q6915 (2026-06-19): Multiple effects trigger when this card is played. In what order do they activate?
      A: The effects trigger simultaneously, so the player can choose the activation order.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-018.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns, Security; action/condition kinds Replacement, GrantStatic, SubTrigger, DeDigivolve, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "Replacement",
L21: kind: "Replacement",
L26: condition: {
L27: kind: "youHave",
L47: trigger: "OnPlay",
L50: kind: "GrantStatic",
L54: kind: ["Digimon"],
L59: duration: "untilOpponentTurnEnd",
L64: trigger: "WhenDigivolving",
L67: kind: "GrantStatic",
L71: kind: ["Digimon"],
L76: duration: "untilOpponentTurnEnd",
L81: trigger: "AllTurns",
L84: kind: "SubTrigger",
L88: kind: ["Digimon"],
L98: kind: "DeDigivolve",
L102: kind: ["Digimon"],
L111: frequency: "OncePerTurn",
L114: trigger: "Security",
L117: kind: "DeDigivolve",
L121: kind: ["Digimon"],
L128: kind: "Delete",
L132: kind: ["Digimon"],
L146: registerIrCard("AD1-018", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-008 (Holy Warrior/Royal Knight), AD1-017 (Holy Warrior/Royal Knight), AD1-025 (Holy Warrior/Royal Knight), BT1-084 (Holy Warrior/Royal Knight). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-018.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-018");
L13: expect(definition?.nameEn).toBe("LordKnightmon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("de-digivolves an opposing Digimon by two when a Knightmon is played", async () => {
L20: const s = setupEngine(
L28: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
L31: await settle(() => s.perm("opponent").stack.length === 0);
L32: expect(s.perm("opponent").stack).toHaveLength(0);
L35: it("triggers its own Knightmon-text watcher when LordKnightmon is played (Q6094)", async () => {
L36: const s = setupEngine(
L45: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
L46: await settle(() => s.perm("opponent").stack.length === 0);
L47: expect(s.perm("opponent").stack).toHaveLength(0);
L50: it("reduces its play cost by 5 with four Knightmon/Lucemon-text cards in trash", async () => {
L51: const s = setupEngine({
L60: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
L61: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-018"));
L62: expect(s.state.memory).toBe(1);
L65: it("grants one chosen Digimon opponent-Digimon-effect immunity through their turn", async () => {
L67: const s = setupEngine(
L76: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
L77: await settle();
L83: await settle(() => continuous.hasRestriction(s.perm("protected").permanentId, "beAffected", "Digimon"));
L84: expect(continuous.hasRestriction(s.perm("protected").permanentId, "beAffected", "Digimon")).toBe(true);
L87: it("de-digivolves before deleting the promoted low-cost attacker from security (Q6095)", async () => {
L88: const s = setupEngine(
L97: expect(
L98: s.engine.applyIntent(1, {
L104: await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
L105: expect(s.state.players[1]!.battleArea).toHaveLength(0);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-018.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-018", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-019 — Matt Ishida & T.K. Takaishi — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-019",
  "set": "AD1",
  "nameEn": "Matt Ishida & T.K. Takaishi",
  "colors": [
    "Blue",
    "Yellow"
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
    "ADVENTURE",
    "Hero"
  ],
  "effectText": "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.  [Your Turn] When any of your Digimon digivolve into an [ADVENTURE] trait Digimon, by suspending this Tamer, you may play 1 [ADVENTURE] trait card from your hand. For every 2 of your Tamers' colors, reduce this effect's play cost by 1.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-019"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.  [Your Turn] When any of your Digimon digivolve into an [ADVENTURE] trait Digimon, by suspending this Tamer, you may play 1 [ADVENTURE] trait card from your hand. For every 2 of your Tamers' colors, reduce this effect's play cost by 1."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-019`

```text
AD1-019 Matt Ishida & T.K. Takaishi
  Q&A (2):
    Q6097 (2026-03-13): 2 copies of this card are in the battle area. Can I activate the [Your Turn] effect on both copies of this card and play 1 [ADVENTURE] trait card with the play cost reduced by 2?
      A: No, you can't. You can't activate multiple card-playing effects at the same time.
    Q6098 (2026-03-13): When I activate this card's [Your Turn] effect and an [ADVENTURE] trait Digimon card would be played, can I activate ST21-13 [Matt Ishida & T.K. Takaishi]'s [Your Turn] effect and reduce the play cost by a total of 2?
      A: Yes, you can.
      related: ST21-13
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-019.ts`; triggers StartOfYourMainPhase, YourTurn; action/condition kinds GainMemory, SubTrigger, PlayFromZone. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L16: condition: {
L17: kind: "opponentHas",
L20: kind: ["Digimon"],
L28: trigger: "YourTurn",
L31: kind: "SubTrigger",
L35: kind: "PlayFromZone",
L39: kind: ["Digimon", "Tamer", "Option"],
L46: optional: true,
L47: cost: {
L48: kind: "suspend",
L62: kind: ["Tamer"],
L76: kind: ["Digimon"],
L86: registerIrCard("AD1-019", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-004 (ADVENTURE/Hero), AD1-014 (ADVENTURE/Hero), AD1-022 (ADVENTURE/Hero), AD1-025 (ADVENTURE/Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-019.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("matches committed metadata and publishes fully covered compiled IR", () => {
L12: expect(definition).toBeDefined();
L13: expect(definition?.cardId).toBe("AD1-019");
L14: expect(definition?.nameEn).toBe("Matt Ishida & T.K. Takaishi");
L15: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L16: expect(compiled?.effects.length).toBeGreaterThan(0);
L17: expect(compiled?.effects).toEqual(expect.any(Array));
L20: it("suspends itself and plays an ADVENTURE card after an ADVENTURE digivolution", async () => {
L21: const s = setupEngine(
L37: expect(
L38: s.engine.applyIntent(0, {
L44: await settle(() =>
L49: expect(s.perm("tamer").isSuspended).toBe(true);
L50: expect(s.state.memory).toBe(4);
L53: it("reduces the effect's paid play cost by 2 with four distinct Tamer colors", async () => {
L54: const s = setupEngine(
L72: expect(
L73: s.engine.applyIntent(0, {
L79: await settle(
L83: expect(s.state.memory).toBe(5);
L86: it("can play an ADVENTURE Tamer rather than only a Digimon", async () => {
L87: const s = setupEngine(
L104: expect(
L105: s.engine.applyIntent(0, {
L111: await settle(
L115: expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-019")).toHaveLength(
L120: it("gains 1 memory at start of main only while the opponent has a Digimon", async () => {
L121: const qualified = setupEngine({
L127: expect(qualified.state.memory).toBe(1);
L129: const unqualified = setupEngine({ 0: { battleArea: [{ card: "AD1-019", as: "tamer" }] } });
L132: expect(unqualified.state.memory).toBe(0);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-019.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-019", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-020 — Tommy, Takuya, & Zoe — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-020",
  "set": "AD1",
  "nameEn": "Tommy, Takuya, & Zoe",
  "colors": [
    "Blue",
    "Red",
    "Green"
  ],
  "kinds": [
    "Tamer"
  ],
  "playCost": 5,
  "dp": 0,
  "evoCosts": [],
  "types": [
    "-"
  ],
  "effectText": "[Security] Play this card without paying the cost.\n[Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞ Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory.",
  "inheritedEffectText": "[End of Your Turn] [Once Per Turn] By attacking with this Digimon with the [Hybrid] or [Ten Warriors] trait, it gains ＜Security A. +1＞ for the attack.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-020"
}
```
2. **Exact printed surfaces:**
   - Main: "[Security] Play this card without paying the cost.\n[Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞ Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory."
   - Inherited: "[End of Your Turn] [Once Per Turn] By attacking with this Digimon with the [Hybrid] or [Ten Warriors] trait, it gains ＜Security A. +1＞ for the attack."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-020`

```text
AD1-020 Tommy, Takuya, & Zoe
  Q&A (2):
    Q6099 (2026-03-13): Can I choose different combinations of red/blue 2-color cards as cards "with different colors"?
      A: Yes, you can. If referencing "with different XX" and a card has multiple instances of information for an XX card, part of the differing portions can be referenced and be treated as differing combinations.
    Q6100 (2026-03-13): Can I process the part of the effect after "then" in this card's [Start of Your Main Phase] effect without placing cards under this card?
      A: Yes, you can.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-020.ts`; triggers Security, StartOfYourMainPhase, OnPlay, EndOfYourTurn; action/condition kinds PlayWithoutCost, PlaceUnder, Draw, GainMemory, GainKeyword, Attack. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Security",
L14: kind: "PlayWithoutCost",
L27: trigger: "StartOfYourMainPhase",
L30: kind: "PlaceUnder",
L49: optional: true,
L52: kind: "Draw",
L55: condition: { kind: "ifThisEffectActed", raw: "this effect placed" },
L58: kind: "GainMemory",
L60: condition: {
L61: kind: "selfDigivolutionStackCountAtLeast",
L70: trigger: "OnPlay",
L73: kind: "PlaceUnder",
L92: optional: true,
L95: kind: "Draw",
L98: condition: { kind: "ifThisEffectActed", raw: "this effect placed" },
L101: kind: "GainMemory",
L103: condition: {
L104: kind: "selfDigivolutionStackCountAtLeast",
L113: trigger: "EndOfYourTurn",
L116: kind: "GainKeyword",
L135: duration: "forTheAttack",
L136: optional: true,
L137: abortOnDecline: true,
L140: kind: "Attack",
L150: frequency: "OncePerTurn",
L157: registerIrCard("AD1-020", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-023 (-), BT17-079 (-), BT17-080 (-), BT17-081 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-020.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("documents and encodes the four-Hybrid threshold for gaining 2 memory", () => {
L11: expect(compiled).toBeDefined();
L15: expect(gain).toMatchObject({ amount: 2, condition: { kind: "selfDigivolutionStackCountAtLeast", count: 4 } });
L16: expect((gain as { condition?: { raw?: string } }).condition?.raw).toContain("4 or more");
L20: it("places two differently colored Hybrid cards under itself and draws", async () => {
L21: const s = setupEngine(
L35: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L37: await settle(() => (tamer()?.stack.length ?? 0) === 2);
L38: await settle(() => s.state.players[0]!.hand.length === 1);
L39: expect(tamer()?.stack).toHaveLength(2);
L40: expect(s.state.players[0]!.hand).toHaveLength(1);
L43: it("can assign different colors to two identical multicolor Hybrid cards (Q6099)", async () => {
L44: const s = setupEngine(
L59: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L61: await settle(() => tamer()?.stack.length === 2);
L62: expect(tamer()?.stack).toHaveLength(2);
L65: it("gains 2 memory at four Hybrid sources even when it places nothing (Q6100)", async () => {
L66: const s = setupEngine(
L75: expect(s.state.memory).toBe(2);
L78: it("makes its qualifying Hybrid host attack with Security Attack +1 at end of turn", async () => {
L79: const s = setupEngine(
L89: expect(s.state.players[1]!.security).toHaveLength(0);
L92: it("plays itself from security without paying the cost", async () => {
L93: const s = setupEngine({ 0: { security: [{ card: "AD1-020", as: "tamer", faceUp: true }] } });
L94: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
L95: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-020")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-020.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-020", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-021 — Marcus Damon & Agumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-021",
  "set": "AD1",
  "nameEn": "Marcus Damon & Agumon",
  "colors": [
    "Yellow",
    "Red"
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
    "DATA SQUAD"
  ],
  "effectText": "[Your Turn] When this Tamer suspends, ＜Draw 1＞ Then, 1 of your Digimon may digivolve into a yellow Digimon card with [Greymon] in its name in the hand with the digivolution cost reduced by 3.\n[End of Your Turn] [Once Per Turn] If you have a yellow Digimon with [Agumon] or [Greymon] in its name, for the turn, 1 of your [Marcus Damon]s is also treated as a 6000 DP Digimon, gains ＜Rush＞ and can't digivolve. Then, 1 of your Digimon may attack.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "AD1-021"
}
```
2. **Exact printed surfaces:**
   - Main: "[Your Turn] When this Tamer suspends, ＜Draw 1＞ Then, 1 of your Digimon may digivolve into a yellow Digimon card with [Greymon] in its name in the hand with the digivolution cost reduced by 3.\n[End of Your Turn] [Once Per Turn] If you have a yellow Digimon with [Agumon] or [Greymon] in its name, for the turn, 1 of your [Marcus Damon]s is also treated as a 6000 DP Digimon, gains ＜Rush＞ and can't digivolve. Then, 1 of your Digimon may attack."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-021`

```text
AD1-021 Marcus Damon & Agumon
  Q&A (11):
    Q6101 (2026-03-13): This card has [Agumon] in its name, but is it also treated as a Digimon card or a Digimon?
      A: No, it isn't. It will only be treated as a Digimon if an effect treats it as a Digimon.
    Q6102 (2026-03-13): What does an "is also treated as a Digimon with X000 DP" effect do, exactly?
      A: It causes that card to also be treated as a Digimon with X000 DP. For example, if a Tamer is also treated as a Digimon, it can attack like a standard Digimon, and it will gain inherited effects from cards stacked under it. However, even if a Tamer is played and then treated as a Digimon in the same turn, it can't attack during that turn.
    Q6103 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, is it no longer considered a Tamer?
      A: No, it is treated as both a Digimon and a Tamer.
    Q6104 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect and it activates an effect, is it treated as both a Digimon effect and a Tamer effect?
      A: Yes, it's treated as an effect of both. Because the card is treated as both a Digimon and a Tamer, the activated effect is treated as both a Digimon effect and a Tamer effect.
    Q6105 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, then another effect causes its DP to become 0, is it deleted upon a rule check?
      A: Yes, it's deleted upon the rule check timing.
    Q6106 (2026-05-08): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, and later it gains another "is also treated as a Digimon with X000 DP" effect, what happens?
      A: If an effect has triggered and the card is affected by a "is also treated as a Digimon with X000 DP" effect, the play cost, level, and DP are overwritten by the newer effect. However, if an effect has already activated and the card is affected by a "is also treated as a Digimon with X000 DP" effect, the already activated effect will be overwritten. Any other effects such as <Rush> that are later gained will be added.
    Q6107 (2026-03-13): Can I gain memory using an effect on a Tamer that's treated as a Digimon with X000 DP due to an effect while my opponent has "your opponent can't gain memory other than by Tamer effects" activated?
      A: Yes, you can. When an effect is activated on a card that's treated as both a Digimon and a Tamer, the effect is treated as both a Digimon effect and a Tamer effect, therefore you can gain memory.
    Q6108 (2026-03-13): If an opponent's card has "isn't affected by Digimon effects" and it's chosen for an "is also treated as a Digimon with X000 DP" Tamer effect that treats it as a Digimon, will the chosen opponent Digimon be affected by effects?
      A: No, it won't be affected by effects. When an effect is activated on a card that's treated as both a Digimon and a Tamer, the effect is treated as both a Digimon effect and a Tamer effect, therefore the chosen opponent Digimon won't be affected by effects.
    Q6109 (2026-03-13): I have this card and 1 [Marcus Damon] in the battle area. I place BT21-044 [RizeGreymon] in the battle area by playing or digivolving, and the memory moved to 1 or more on my opponent's side. Can I use BT21-044 [RizeGreymon]'s [On Play] [When Digivolving] effect to have 1 of my Digimon attack, resolve the attack, then use this card's [End of Your Turn] effect to have 1 of my Digimon attack?
      A: Yes, you can. Even if you pay a cost and the memory moves to 1 or more on the opponent's side during the main phase, first any effects that triggered during that timing must resolve, then the end of the turn timing occurs. In this case, once all of the attacks from [RizeGreymon]'s [On Play] [When Digivolving] effect have resolved, then the end of the turn timing will occur. Because the attack has already resolved and isn't currently occurring, you can activate this card's [End of Your Turn] effect and have 1 of your Digimon attack.
      related: BT21-044
    Q6110 (2026-03-13): I have 2 copies of this card in the battle area. At the end of my turn, I used the [End of Your Turn] effect on the 1st copy of this card to attack. Can I then use the [End of Your Turn] effect on the 2nd copy of this card to attack?
      A: No, an attack using the 2nd effect isn't possible. A new attack declaration can't be made during an attack. In this case, the [End of Your Turn] effects on both copies of this card trigger simultaneously at the end of your turn, and you use the [End of Your Turn] effect on the 1st copy of this card to attack. The 2nd [End of Your Turn] effect can be activated before the counter timing, but because you can't declare another attack during an attack, you won't be able to attack using the 2nd effect, even if you activate it.
    Q6111 (2026-03-13): I have this card and a yellow Digimon with [Agumon] or [Greymon] in its name in the battle area. At the end of my turn, can I choose to not activate this card's [End of Your Turn] effect?
      A: No, you can't. If your turn ends while you have a yellow Digimon with [Agumon] or [Greymon] in its name in the battle area, you must choose 1 of your [Marcus Damon]s, and it will gain the "is also treated as a 6000 DP Digimon, gains <Rush>, and can't digivolve" effect. Then, you choose whether or not 1 of your Digimon will attack using the part of the effect after "then." At such times, [Once Per Turn] is considered to be used, even if you don't have 1 of your Digimon attack using the part of the effect after "then."
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-021.ts`; triggers YourTurn, EndOfYourTurn, Security; action/condition kinds SubTrigger, Draw, Digivolve, SelectBind, GrantStatic, SetBaseDP, GainKeyword, Restrict, Attack, PlayWithoutCost. Clause-bearing lines:

```text
L5: // bundle: it filtered on kind:["Digimon"] (Marcus Damon is a TAMER, so nothing ever
L11: import { registerIrCard } from "../../engine/effects/interpreter.js";
L32: kind: "youHave",
L35: kind: ["Digimon"],
L45: trigger: "YourTurn",
L48: kind: "SubTrigger",
L53: kind: "Draw",
L58: kind: "Digivolve",
L62: kind: ["Digimon"],
L68: kind: ["Digimon"],
L75: optional: true,
L82: trigger: "EndOfYourTurn",
L85: kind: "SelectBind",
L87: condition: agumonGate,
L90: kind: "GrantStatic",
L94: duration: "forTheTurn",
L97: kind: "SetBaseDP",
L100: duration: "forTheTurn",
L103: kind: "GainKeyword",
L109: duration: "forTheTurn",
L112: kind: "Restrict",
L115: duration: "forTheTurn",
L118: kind: "Attack",
L122: kind: ["Digimon"],
L127: optional: true,
L128: condition: agumonGate,
L131: frequency: "OncePerTurn",
L134: trigger: "Security",
L137: kind: "PlayWithoutCost",
L153: registerIrCard("AD1-021", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/combat.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-016 (DATA SQUAD), BT25-002 (DATA SQUAD), BT25-021 (DATA SQUAD), BT25-023 (DATA SQUAD). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-021.test.ts` contains 9 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L161: it("plays from security without paying its cost", async () => {
L162: const s = setupEngine({ 0: { security: [{ card: "AD1-021", as: "securityMarcus", faceUp: true }] } });
L164: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMarcus"));
L166: expect(
L173: it("is registered", () => {
L174: expect(module, "AD1-021 must self-register on import").toBeDefined();
L177: it("draws and may digivolve for 3 less only when this Tamer suspends", async () => {
L178: const s = setupEngine(
L194: await settle(() => s.perm("rize").topCard.cardId === "AD1-016");
L196: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
L197: expect(s.state.memory).toBe(2);
L200: it("turns one Marcus into a 6000 DP Rush Digimon that can't digivolve, then attacks", async () => {
L201: const s = setupEngine(
L215: await settle();
L225: expect(s.perm("marcus").currentDP).toBe(6000);
L226: expect(continuous.hasKeyword(s.perm("marcus").permanentId, "Rush")).toBe(true);
L227: expect(continuous.hasRestriction(s.perm("marcus").permanentId, "digivolve")).toBe(true);
L230: it("does not offer the trailing attack without the yellow Agumon/Greymon gate", async () => {
L231: const s = setupEngine(
L237: await settle();
L238: expect(s.state.players[1]!.security).toHaveLength(1);
L243: it("routes [End of Your Turn] to OnEndTurn and not to other timings", () => {
L246: expect(module!.effectsForTiming(EffectTiming.OnEndTurn, source).length).toBeGreaterThanOrEqual(1);
L248: expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
L249: expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
L257: it("[End of Your Turn] applies digivolve restriction to the chosen Marcus Damon Tamer", async () => {
L305: expect(endTurnEffects.length).toBeGreaterThanOrEqual(1);
L310: expect(restrictCalls.length).toBeGreaterThanOrEqual(1);
L311: expect(restrictCalls[0]!.args[0]).toBe("PERM#marcus");
L320: it("[End of Your Turn] grants Rush to the chosen Marcus Damon, not to a yellow Agumon/Greymon", async () => {
L368: expect(rushCalls.length).toBeGreaterThanOrEqual(1);
L370: expect(rushCalls[0]!.args[0]).toBe("PERM#marcus");
L376: it("[End of Your Turn] resolves exactly one Attack action (not two)", async () => {
L422: expect(attackCalls).toHaveLength(1);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-021.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-021", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-022 — Izzy Izumi & Tai Kamiya — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-022",
  "set": "AD1",
  "nameEn": "Izzy Izumi & Tai Kamiya",
  "colors": [
    "Green",
    "Red"
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
    "ADVENTURE",
    "Hero"
  ],
  "effectText": "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.  [Your Turn] When any of your other [ADVENTURE] trait Digimon or Tamers are played, by suspending this Tamer, 1 of your Digimon may digivolve into an [ADVENTURE] trait Digimon card in the hand. For every 2 of your Tamers' colors, reduce this effect's digivolution cost by 1.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-022"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.  [Your Turn] When any of your other [ADVENTURE] trait Digimon or Tamers are played, by suspending this Tamer, 1 of your Digimon may digivolve into an [ADVENTURE] trait Digimon card in the hand. For every 2 of your Tamers' colors, reduce this effect's digivolution cost by 1."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-022`

```text
AD1-022 Izzy Izumi & Tai Kamiya
  Q&A (1):
    Q6112 (2026-03-13): 2 copies of this card are in the battle area. Can I activate the [Your Turn] effect on both copies of this card and digivolve my Digimon into 1 [ADVENTURE] trait card with the digivolution cost reduced by 2?
      A: No, you can't. You can't activate multiple digivolving effects at the same time.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-022.ts`; triggers StartOfYourMainPhase, YourTurn; action/condition kinds GainMemory, SubTrigger, Digivolve. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "StartOfYourMainPhase",
L14: kind: "GainMemory",
L16: condition: {
L17: kind: "opponentHas",
L20: kind: ["Digimon"],
L28: trigger: "YourTurn",
L31: kind: "SubTrigger",
L36: kind: ["Digimon", "Tamer"],
L46: kind: "Digivolve",
L50: kind: ["Digimon"],
L56: kind: ["Digimon"],
L70: kind: ["Tamer"],
L74: optional: true,
L75: cost: {
L76: kind: "suspend",
L86: abortOnDecline: true,
L97: registerIrCard("AD1-022", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-004 (ADVENTURE/Hero), AD1-014 (ADVENTURE/Hero), AD1-019 (ADVENTURE/Hero), AD1-025 (ADVENTURE/Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-022.test.ts` contains 5 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("matches committed metadata and publishes fully covered compiled IR", () => {
L12: expect(definition).toBeDefined();
L13: expect(definition?.cardId).toBe("AD1-022");
L14: expect(definition?.nameEn).toBe("Izzy Izumi & Tai Kamiya");
L15: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L16: expect(compiled?.effects.length).toBeGreaterThan(0);
L17: expect(compiled?.effects).toEqual(expect.any(Array));
L20: it("suspends itself and digivolves a Digimon when another ADVENTURE card is played", async () => {
L21: const s = setupEngine(
L37: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
L40: await settle(() => s.perm("base").topCard.cardId === "AD1-001" && s.perm("tamer").isSuspended);
L41: expect(s.perm("tamer").isSuspended).toBe(true);
L42: expect(s.perm("base").topCard.cardId).toBe("AD1-001");
L43: expect(s.state.memory).toBe(4);
L46: it("reduces only this effect's digivolution cost by 2 with four Tamer colors", async () => {
L47: const s = setupEngine(
L65: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
L68: await settle(() => s.perm("base").topCard.cardId === "AD1-001");
L69: expect(s.state.memory).toBe(5);
L72: it("does not reduce an unrelated manual digivolution", async () => {
L73: const s = setupEngine({
L84: expect(
L85: s.engine.applyIntent(0, {
L91: await settle(() => s.perm("base").topCard.cardId === "AD1-001");
L92: expect(s.state.memory).toBe(3);
L95: it("gains 1 memory at start of main only if the opponent has a Digimon", async () => {
L96: const s = setupEngine({
L102: expect(s.state.memory).toBe(1);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-022.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-022", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-023 — J.P., Koji, & Koichi — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-023",
  "set": "AD1",
  "nameEn": "J.P., Koji, & Koichi",
  "colors": [
    "Black",
    "Yellow",
    "Purple"
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
    "-"
  ],
  "effectText": "[Security] Play this card without paying the cost.\n[Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞ Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When this Digimon with the [Hybrid] or [Ten Warriors] trait would leave the battle area, by adding your top security card to the hand, it doesn't leave.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "AD1-023"
}
```
2. **Exact printed surfaces:**
   - Main: "[Security] Play this card without paying the cost.\n[Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞ Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon with the [Hybrid] or [Ten Warriors] trait would leave the battle area, by adding your top security card to the hand, it doesn't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-023`

```text
AD1-023 J.P., Koji, & Koichi
  Q&A (2):
    Q6113 (2026-03-13): Can I choose different combinations of red/blue 2-color cards as cards "with different colors"?
      A: Yes, you can. If referencing "with different XX" and a card has multiple instances of information for an XX card, part of the differing portions can be referenced and be treated as differing combinations.
    Q6114 (2026-03-13): Can I process the part of the effect after "then" in this card's [Start of Your Main Phase] effect without placing cards under this card?
      A: Yes, you can.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-023.ts`; triggers Security, StartOfYourMainPhase, OnPlay, AllTurns; action/condition kinds PlaceUnder, Draw, GainMemory, PlayWithoutCost, Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: kind: "PlaceUnder",
L25: optional: true,
L28: kind: "Draw",
L31: condition: { kind: "namedCountAtLeast", countSource: "placedHybrid", count: 1, raw: "this effect placed" },
L34: kind: "GainMemory",
L36: condition: {
L37: kind: "selfDigivolutionStackCountAtLeast",
L48: trigger: "Security",
L51: kind: "PlayWithoutCost",
L57: { trigger: "StartOfYourMainPhase", actions: placeHybridBody() },
L58: { trigger: "OnPlay", actions: placeHybridBody() },
L60: trigger: "AllTurns",
L63: kind: "Replacement",
L68: kind: ["Digimon"],
L71: cost: {
L72: kind: "securityToHand",
L81: frequency: "OncePerTurn",
L88: registerIrCard("AD1-023", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-020 (-), BT17-079 (-), BT17-080 (-), BT17-081 (-). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-023.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L11: it("maps the catalog, KB color assignment, threshold, security, and inherited replacement", () => {
L14: expect(definition?.cardId).toBe(CARD_ID);
L15: expect(definition?.nameEn).toBe("J.P., Koji, & Koichi");
L16: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L20: expect(effect.actions[0]).toMatchObject({
L31: expect(effect.actions[1]).toMatchObject({
L36: expect(effect.actions[2]).toMatchObject({
L43: expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
L46: expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
L61: it("places two differently colored Hybrid cards under itself and draws", async () => {
L62: const s = setupEngine(
L78: await settle(() => tamer().stack.length === 2);
L80: expect(tamer()?.stack.map((card) => card.cardId)).toEqual(["AD1-002", "BT12-024"]);
L81: expect(s.state.players[0]!.hand).toHaveLength(1);
L82: expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT1-010");
L85: it("gains 2 memory from four existing Hybrid cards without placing another", async () => {
L86: const s = setupEngine({
L102: expect(s.state.memory).toBe(2);
L103: expect(s.perm("tamer").stack).toHaveLength(4);
L106: it("assigns different colors to two identical multicolor Hybrid cards (Q6113)", async () => {
L107: const s = setupEngine(
L122: await settle(() => s.perm("tamer").stack.length === 2);
L123: expect(s.perm("tamer").stack).toHaveLength(2);
L126: it("prevents a Hybrid Digimon from leaving by adding the top security card to hand", async () => {
L127: const s = setupEngine(
L138: expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
L139: expect(
L142: expect(s.state.players[0]!.security).toHaveLength(0);
L143: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-101")).toBe(true);
L146: it("plays itself from security without paying the cost", async () => {
L147: const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "tamer", faceUp: true }] } });
L148: await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
L149: expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID)).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-023.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-023", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-024 — Imperialdramon: Fighter Mode — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-024",
  "set": "AD1",
  "nameEn": "Imperialdramon: Fighter Mode",
  "colors": [
    "Blue",
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
      "color": "Blue",
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
    "Free"
  ],
  "types": [
    "Ancient Dragonkin",
    "Hero"
  ],
  "effectText": "[Digivolve] [Imperialdramon: Dragon Mode]: Cost 1\n[Digivolve] Lv.5 w/[Hero] trait: Cost 5 \n\n＜Security A. +1＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] Return 1 of your opponent's lowest DP Digimon to the bottom of the deck.\n[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon. Then, if played or digivolved by effects, you may return 1 of your opponent's suspended Digimon to the bottom of the deck.",
  "rarity": "UR",
  "maxCountInDeck": 4,
  "imageId": "AD1-024"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Imperialdramon: Dragon Mode]: Cost 1\n[Digivolve] Lv.5 w/[Hero] trait: Cost 5 \n\n＜Security A. +1＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] Return 1 of your opponent's lowest DP Digimon to the bottom of the deck.\n[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon. Then, if played or digivolved by effects, you may return 1 of your opponent's suspended Digimon to the bottom of the deck."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-024`

```text
AD1-024 Imperialdramon: Fighter Mode
  Q&A (4):
    Q6115 (2026-03-13): Does this card's [All Turns] effect also trigger when this card itself is played or when one of my Digimon in the battle area would digivolve into this card?
      A: Yes, it triggers. In addition, the " if played or digivolved by effects" condition will be met if it was played or digivolved by an effect.
    Q6518 (2026-05-08): If I suspend an opponent's Digimon with this card's [All Turns] effect, can I choose to not unsuspend this Digimon?
      A: No, you can't. If you suspend an opponent's Digimon with this effect, this Digimon must also unsuspend if it is possible to do so.
    Q6519 (2026-05-08): I activated this card's [All Turns] effect when a method other than an effect played or digivolved a Digimon. Can I then activate this card's [All Turns] effect again when an effect plays or digivolves a Digimon?
      A: No, you can't. This effect's [Once Per Turn] has already been used upon the 1st activation, therefore it can't activate again.
    Q6916 (2026-06-19): If this card's [All Turns] effect activates, can I unsuspend this Digimon even if I can't suspend an opponent's Digimon such as in cases where they have no Digimon?
      A: Yes, you can. However, if your opponent has a Digimon that can suspend, you must suspend it when possible.
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-024.ts`; triggers Static, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Return, SubTrigger, Suspend, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L22: trigger: "Static",
L32: trigger: "WhenDigivolving",
L35: kind: "Return",
L39: kind: ["Digimon"],
L47: frequency: "OncePerTurn",
L48: sharedUseKey: "ir-shared-0",
L51: trigger: "WhenAttacking",
L54: kind: "Return",
L58: kind: ["Digimon"],
L66: frequency: "OncePerTurn",
L67: sharedUseKey: "ir-shared-0",
L70: trigger: "AllTurns",
L73: kind: "SubTrigger",
L77: kind: ["Digimon"],
L81: kind: "Suspend",
L85: kind: ["Digimon"],
L89: optional: true,
L92: kind: "Unsuspend",
L102: kind: "Return",
L107: kind: ["Digimon"],
L112: condition: {
L113: kind: "triggerPlayedOrDigivolvedByEffect",
L116: optional: true,
L122: kind: "SubTrigger",
L126: kind: ["Digimon"],
L130: kind: "Suspend",
L134: kind: ["Digimon"],
L138: optional: true,
L141: kind: "Unsuspend",
L151: kind: "Return",
L156: kind: ["Digimon"],
L161: condition: {
L162: kind: "triggerPlayedOrDigivolvedByEffect",
L165: optional: true,
L171: frequency: "OncePerTurn",
L176: digivolutionRequirement: [
L179: cost: 1,
L185: cost: 5,
L191: registerIrCard("AD1-024", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-003 (Hero), AD1-004 (Hero), AD1-008 (Hero), AD1-011 (Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-024.test.ts` contains 6 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-024");
L13: expect(definition?.nameEn).toBe("Imperialdramon: Fighter Mode");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("suspends an opposing Digimon and unsuspends itself when a Digimon is played", async () => {
L20: const s = setupEngine(
L31: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
L34: await settle(() => s.perm("opponent").isSuspended && !s.perm("fighter").isSuspended);
L35: expect(s.perm("opponent").isSuspended).toBe(true);
L36: expect(s.perm("fighter").isSuspended).toBe(false);
L37: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L40: it("unsuspends even when there is no opposing Digimon to suspend (Q6916)", async () => {
L41: const s = setupEngine(
L52: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
L55: await settle(() => s.perm("fighter").isSuspended === false);
L56: expect(s.perm("fighter").isSuspended).toBe(false);
L59: it("self-triggers after effect-driven evolution and returns the suspended Digimon (Q6115)", async () => {
L60: const s = setupEngine(
L69: expect(
L70: s.engine.applyIntent(0, {
L76: await settle(() => s.perm("paildramon").topCard.cardId === "AD1-024");
L77: await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
L79: expect(s.state.players[1]!.battleArea).toHaveLength(0);
L80: expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-010")).toBe(true);
L83: it("shares one use between when-digivolving and when-attacking lowest-DP returns", async () => {
L84: const s = setupEngine(
L99: expect(
L100: s.engine.applyIntent(0, {
L106: await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
L107: expect(
L108: s.engine.applyIntent(0, {
L114: await settle();
L116: expect(s.state.players[1]!.battleArea).toHaveLength(1);
L117: expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
L120: it("uses both alternate evolution routes and publishes its two keywords", async () => {
L125: const s = setupEngine({
L130: expect(
L131: s.engine.applyIntent(0, {
L137: await settle(() => s.perm("base").topCard.cardId === "AD1-024");
L138: expect(s.state.memory).toBe(expectedMemory);
L141: const s = setupEngine({ 0: { battleArea: [{ card: "AD1-024", as: "fighter" }] } });
L145: expect(continuous.hasKeyword(s.perm("fighter").permanentId, "SecurityAttack")).toBe(true);
L146: expect(continuous.hasKeyword(s.perm("fighter").permanentId, "Blocker")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-024.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-024", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## AD1-025 — Omnimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "AD1-025",
  "set": "AD1",
  "nameEn": "Omnimon",
  "colors": [
    "Red",
    "White",
    "Blue"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 7,
  "playCost": 15,
  "dp": 15000,
  "evoCosts": [
    {
      "color": "Red",
      "level": 6,
      "memoryCost": 5
    },
    {
      "color": "Blue",
      "level": 6,
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
    "Holy Warrior",
    "Royal Knight",
    "ADVENTURE",
    "Hero"
  ],
  "effectText": "＜Raid＞ \n＜Blocker＞ \n＜Partition ([WarGreymon] & [MetalGarurumon])＞ \n[On Play] [When Digivolving] Return all of your opponent's Digimon with as many or fewer digivolution cards as this Digimon to the bottom of the deck. Then, delete 1 of your opponent's Digimon.\n[All Turns] [Once Per Turn] When any of your opponent's Digimon leave the battle area, trash 1 of their Option cards in the battle area and trash their top security card.",
  "rarity": "UR",
  "maxCountInDeck": 4,
  "imageId": "AD1-025"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Raid＞ \n＜Blocker＞ \n＜Partition ([WarGreymon] & [MetalGarurumon])＞ \n[On Play] [When Digivolving] Return all of your opponent's Digimon with as many or fewer digivolution cards as this Digimon to the bottom of the deck. Then, delete 1 of your opponent's Digimon.\n[All Turns] [Once Per Turn] When any of your opponent's Digimon leave the battle area, trash 1 of their Option cards in the battle area and trash their top security card."
3. **Exact card KB query:** `node tools/kb/query.mjs card AD1-025`

```text
AD1-025 Omnimon
  Q&A (3):
    Q6116 (2026-03-13): I activated this card's [On Play] [When Digivolving] effect, and when my opponent's Digimon would leave the battle area for the 1st process, an immediate-type effect such as a "when [...] would leave" effect caused this card to be removed from the battle area. Can I then process the part of the effect after "then" in this card's effect?
      A: Yes, you can. If an effect activates, it is to be fully resolved even if the card that activated the effect is removed from that area during the processing.
    Q6117 (2026-03-13): When does a "when [...] leaves the battle area" effect trigger?
      A: It triggers when a card in the battle area is placed in another area. The following areas are considered other areas: ●Deck ●Digi-Egg deck ●Breeding area ●Hand ●Trash ●Security stack ●Under a card (in a Digimon's digivolution cards or under a Tamer)
    Q6118 (2026-03-13): Does a "when [...] leaves the battle area" effect trigger even if a "when [...] would leave the battle area" effect activates and prevents it from leaving?
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
5. **Direct implementation:** `apps/api/src/cards/AD1/AD1-025.ts`; triggers Static, OnPlay, WhenDigivolving, AllTurns; action/condition kinds Return, Delete, SubTrigger, Trash. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "Static",
L41: trigger: "OnPlay",
L44: kind: "Return",
L49: kind: ["Digimon"],
L56: kind: "Delete",
L60: kind: ["Digimon"],
L68: trigger: "WhenDigivolving",
L71: kind: "Return",
L76: kind: ["Digimon"],
L83: kind: "Delete",
L87: kind: ["Digimon"],
L95: trigger: "AllTurns",
L98: kind: "SubTrigger",
L102: kind: ["Digimon"],
L106: kind: "Trash",
L111: kind: ["Option"],
L117: kind: "Trash",
L131: frequency: "OncePerTurn",
L138: registerIrCard("AD1-025", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-008 (Holy Warrior/Royal Knight/Hero), BT21-036 (Holy Warrior/Royal Knight/Hero), AD1-004 (ADVENTURE/Hero), AD1-014 (ADVENTURE/Hero). Alternate requirements and source-stack transitions were compared with the catalog; mixed complete-trait pools, near matches, invalid stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/AD1/AD1-025.test.ts` contains 4 passing test(s); observable engine evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("matches committed metadata and publishes fully covered compiled IR", () => {
L11: expect(definition).toBeDefined();
L12: expect(definition?.cardId).toBe("AD1-025");
L13: expect(definition?.nameEn).toBe("Omnimon");
L14: expect(compiled).toMatchObject({ coverage: "full", residual: [] });
L15: expect(compiled?.effects.length).toBeGreaterThan(0);
L16: expect(compiled?.effects).toEqual(expect.any(Array));
L19: it("bottom-decks opponent Digimon with no more sources than itself, then deletes one", async () => {
L20: const s = setupEngine(
L35: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
L38: await settle(
L44: expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-019");
L45: expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([]);
L46: expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT9-103")).toBe(true);
L47: expect(s.state.players[1]!.security).toHaveLength(1);
L48: expect(s.state.players[1]!.security[0]?.cardId).toBe("BT1-002");
L51: it("returns every opposing Digimon within its source-count ceiling before deleting one survivor", async () => {
L52: const s = setupEngine(
L67: expect(
L68: s.engine.applyIntent(0, {
L74: await settle(() => s.state.players[1]!.battleArea.length === 0);
L76: expect(s.state.players[1]!.deck.slice(-2).map((card) => card.cardId)).toEqual(
L79: expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-020")).toBe(true);
L82: it("publishes Raid, Blocker, and Partition", async () => {
L83: const s = setupEngine({ 0: { battleArea: [{ card: "AD1-025", as: "omnimon" }] } });
L87: expect(continuous.hasKeyword(s.perm("omnimon").permanentId, "Raid")).toBe(true);
L88: expect(continuous.hasKeyword(s.perm("omnimon").permanentId, "Blocker")).toBe(true);
L89: expect(continuous.hasKeyword(s.perm("omnimon").permanentId, "Partition")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/AD1/AD1-025.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("AD1-025", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.
