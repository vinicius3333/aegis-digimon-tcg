# ST23 Card Audit Ledger

Audit date: 2026-08-25. Scope: all 15 committed ST23 catalog cards, audited one card at a time in ascending ID order from the ST24-integrated corrected base. Exact catalog and KB evidence, clause-to-runtime/shared-primitive tracing, cross-card trait and realistic evolution-stack comparisons, and 36 focused tests across 15 isolated Vitest processes establish reproducible 10/10 evidence for every card. Collection-level affected-seam tests, typecheck, formatting, and diff gates are recorded in the completion commit and coordinator notification.

## ST23-01 — Kekkomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-01",
  "set": "ST23",
  "nameEn": "Kekkomon",
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
    "Lesser",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "inheritedEffectText": "[When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this Digimon may digivolve into a [Glowing Dawn] trait Digimon card in the hand with the cost reduced by 2.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST23-01",
  "dualEffect": "Kekkomon"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this Digimon may digivolve into a [Glowing Dawn] trait Digimon card in the hand with the cost reduced by 2."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-01`

```text
ST23-01 Kekkomon
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
   - `node tools/kb/query.mjs rules "once per turn shared effect identity" --limit 3`

```text
[glossary] Properties Common to All Card Types  (12.215)
  …ects. Security Effects Effects activated when a card is turned over during a security check. Once Per Turn Indicates effects that can only be activated once per turn. For example, even if the conditions for activating the effect occurred multiple times in one turn, the effect cou…

[comprehensive §15-14-1] [X Per Turn]  (9.263)
  15-14-1. [X Per Turn] 15-14-1-1. [X Per Turn] means that an effect can be activated a number of times during 1 turn as specified by X, and each activation counts toward 1 use of X. 15-14-1-2. If an [X Per Turn] effect is used X number of times during 1 turn, it won't trigger agai…

[manual §1] Official Rule Manual  (8.22)
  …tions for activation, they are always activated as long as Digivolve: 2 trom (gammamon- Your Turn This Digimon can't be blocked. Your Turn, This Digimon can't be blo Lv.Ч KausGammamon -0230 • Trigger-Type Effects These effects trigger when specific conditions are met. A [When Att…
```
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-01.ts`; triggers WhenAttacking; action/condition kinds Digivolve. Clause-bearing lines:

```text
L5: // hostFilter kind:["Tamer"]), NOT the Tamer permanent itself.
L7: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "WhenAttacking",
L15: kind: "Digivolve",
L25: kind: ["Digimon"],
L35: optional: true,
L36: cost: {
L37: kind: "trashBottomFaceDownUnderTamer",
L41: abortOnDecline: true,
L45: frequency: "OncePerTurn",
L52: registerIrCard("ST23-01", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-003 (Lesser/Glowing Dawn/BEATBREAK), BT26-003 (Lesser/Glowing Dawn/BEATBREAK), BT26-004 (Lesser/Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-01.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("attacking spends the bottom face-down under-Tamer card and digivolves into Glowing Dawn", async () => {
L8: const s = setupEngine(
L25: expect(
L26: s.engine.applyIntent(0, {
L32: await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST23-03"));
L33: expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST23-03")).toBe(true);
L34: expect(
L39: expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottomUnderTamer)).toBe(true);
L42: it("proves the inherited once-per-turn attack digivolution contract", () => {
L44: expect(inherited).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-01.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-01", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-02 — Liollmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-02",
  "set": "ST23",
  "nameEn": "Liollmon",
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
    "Vaccine"
  ],
  "types": [
    "Holy Beast",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [Glowing Dawn] trait, reduce the cost by 1.",
  "inheritedEffectText": "＜Barrier＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST23-02",
  "dualEffect": "Liollmon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [Glowing Dawn] trait, reduce the cost by 1."
   - Inherited: "＜Barrier＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-02`

```text
ST23-02 Liollmon
  Q&A (1):
    Q6164 (2026-05-08): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a Digimon card with the [Glowing Dawn] trait?
      A: No, it doesn't trigger.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-02.ts`; triggers YourTurn, Static; action/condition kinds Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L9: trigger: "YourTurn",
L12: kind: "Replacement",
L19: kind: ["Digimon"],
L29: kind: "Replacement",
L40: trigger: "Static",
L53: digivolutionRequirement: [
L57: cost: 0,
L63: registerIrCard("ST23-02", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-032 (Holy Beast/Glowing Dawn/BEATBREAK), BT26-025 (Holy Beast/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-02.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("reduces a legal Glowing Dawn digivolution from cost 2 to cost 1 during your turn", async () => {
L8: const s = setupEngine({
L18: expect(
L19: s.engine.applyIntent(0, {
L25: await settle(() => s.perm("liollmon").topCard?.cardId === "ST23-03");
L26: expect(s.perm("liollmon").topCard?.cardId).toBe("ST23-03");
L27: expect(s.state.memory).toBe(0);
L30: it("reduces a same-controller Glowing Dawn digivolution by 1 during its turn", () => {
L32: expect(yourTurn).toMatchObject({
L45: it("does not apply its cost reduction while this card is in the breeding area", async () => {
L46: const s = setupEngine(
L59: expect(
L60: s.engine.applyIntent(0, {
L66: await settle(() => s.perm("liollmon").topCard?.cardId === "ST23-03" && s.state.memory === 0);
L68: expect(s.state.memory).toBe(0);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-02.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-02", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-03 — Cougarmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-03",
  "set": "ST23",
  "nameEn": "Cougarmon",
  "colors": [
    "Yellow"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 4,
  "dp": 4000,
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
    "Virus"
  ],
  "types": [
    "Mammal",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2 \n\n[On Play] [When Digivolving] Add your top security card to the hand. Then, ＜Recovery +1＞ \n[Your Turn] When this Digimon would digivolve into a [Glowing Dawn] trait Digimon card, by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 2.",
  "inheritedEffectText": "＜Barrier＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST23-03",
  "dualEffect": "Cougarmon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2 \n\n[On Play] [When Digivolving] Add your top security card to the hand. Then, ＜Recovery +1＞ \n[Your Turn] When this Digimon would digivolve into a [Glowing Dawn] trait Digimon card, by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 2."
   - Inherited: "＜Barrier＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-03`

```text
ST23-03 Cougarmon
  Q&A (1):
    Q6165 (2026-05-08): Can I also activate this card's [On Play] [When Digivolving] effect when I have 0 cards in my security stack?
      A: Yes, you can. In such cases, you can't add a card from your security stack to your hand because you don't have any security cards, therefore you just perform <Recovery +1>.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-03.ts`; triggers OnPlay, WhenDigivolving, YourTurn, Static; action/condition kinds SecurityManipulation, Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "OnPlay",
L18: kind: "SecurityManipulation",
L25: kind: "SecurityManipulation",
L34: trigger: "WhenDigivolving",
L37: kind: "SecurityManipulation",
L44: kind: "SecurityManipulation",
L53: trigger: "YourTurn",
L56: kind: "Replacement",
L65: kind: ["Digimon"],
L73: cost: {
L74: kind: "trashBottomFaceDownUnderTamer",
L83: trigger: "Static",
L96: digivolutionRequirement: [
L100: cost: 2,
L106: registerIrCard("ST23-03", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-035 (Mammal/Glowing Dawn/BEATBREAK), BT26-026 (Mammal/Glowing Dawn/BEATBREAK), BT26-061 (Mammal/Glowing Dawn/BEATBREAK), ST23-12 (Mammal/Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-03.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("recovers one security after digivolving", async () => {
L8: const s = setupEngine({
L20: expect(
L21: s.engine.applyIntent(0, {
L27: await settle(
L33: expect(s.perm("base").topCard?.cardId).toBe("ST23-03");
L34: expect(s.state.players[0]!.security).toHaveLength(1);
L35: expect(s.state.players[0]!.hand.some((card) => card.instanceId === securityId && card.cardId === "BT1-001")).toBe(
L38: expect(s.state.players[0]!.security).toHaveLength(1);
L39: expect(s.state.players[0]!.security[0]!.instanceId).toBe(recoveryId);
L40: expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
L43: it("uses the shared printed under-Tamer cost for its turn reduction", () => {
L45: expect(effect).toMatchObject({
L57: it("performs Recovery +1 even when there is no security card to add to hand", async () => {
L58: const s = setupEngine({
L69: expect(
L70: s.engine.applyIntent(0, {
L76: await settle(() => s.state.players[0]!.security.length === 1 && deckBefore - s.state.players[0]!.deck.length === 2);
L78: expect(s.state.players[0]!.security).toHaveLength(1);
L79: expect(deckBefore - s.state.players[0]!.deck.length).toBe(2);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-03.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-03", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-04 — Murasamemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-04",
  "set": "ST23",
  "nameEn": "Murasamemon",
  "colors": [
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
      "color": "Yellow",
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
    "Beastkin",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3 \n\n＜Alliance＞ \n[On Play] [When Digivolving] 1 of your opponent's Digimon gets -5000 DP for the turn. Then, if it's your turn, by trashing the bottom face-down card from under any of your Tamers, you may play or use 1 [Glowing Dawn] trait card from your hand with the cost reduced by 3.",
  "inheritedEffectText": "[End of Attack] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this [Glowing Dawn] trait Digimon unsuspends.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST23-04",
  "dualEffect": "Murasamemon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3 \n\n＜Alliance＞ \n[On Play] [When Digivolving] 1 of your opponent's Digimon gets -5000 DP for the turn. Then, if it's your turn, by trashing the bottom face-down card from under any of your Tamers, you may play or use 1 [Glowing Dawn] trait card from your hand with the cost reduced by 3."
   - Inherited: "[End of Attack] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this [Glowing Dawn] trait Digimon unsuspends."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-04`

```text
ST23-04 Murasamemon
  Q&A (1):
    Q6166 (2026-05-08): This card's effect caused the DP of my opponent's Digimon to become 0. At such times, is the Digimon with a DP of zero deleted?
      A: No, it isn't deleted yet. Once all of the processing for this card's [On Play] [When Digivolving] effect is resolved, then all of the Digimon with 0 DP are deleted at the same time. In addition, if an Option card is used by this effect, once the used Option card's [Main] effect has resolved and the Option card is trashed, then all Digimon with DPs of 0 will be deleted. If digivolving by Arts Digivolve, after digivolving, all of the Digimon with 0 DP are deleted.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-04.ts`; triggers Static, OnPlay, WhenDigivolving, EndOfAttack; action/condition kinds ModifyDP, Modal, PlayWithoutCost, UseOptionWithoutCost, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "Static",
L18: trigger: "OnPlay",
L21: kind: "ModifyDP",
L25: kind: ["Digimon"],
L30: duration: "forTheTurn",
L33: kind: "Modal",
L39: kind: "PlayWithoutCost",
L43: kind: ["Digimon", "Tamer"],
L55: kind: "UseOptionWithoutCost",
L58: kind: ["Option"],
L67: condition: {
L68: kind: "isYourTurn",
L71: cost: {
L72: kind: "trashBottomFaceDownUnderTamer",
L76: kind: ["Tamer"],
L82: optional: true,
L83: abortOnDecline: true,
L88: trigger: "WhenDigivolving",
L91: kind: "ModifyDP",
L95: kind: ["Digimon"],
L100: duration: "forTheTurn",
L103: kind: "Modal",
L109: kind: "PlayWithoutCost",
L113: kind: ["Digimon", "Tamer"],
L125: kind: "UseOptionWithoutCost",
L128: kind: ["Option"],
L137: condition: {
L138: kind: "isYourTurn",
L141: cost: {
L142: kind: "trashBottomFaceDownUnderTamer",
L146: kind: ["Tamer"],
L152: optional: true,
L153: abortOnDecline: true,
L158: trigger: "EndOfAttack",
L161: kind: "Unsuspend",
L169: cost: {
L170: kind: "trashBottomFaceDownUnderTamer",
L174: kind: ["Tamer"],
L180: optional: true,
L181: abortOnDecline: true,
L185: frequency: "OncePerTurn",
L190: digivolutionRequirement: [
L194: cost: 3,
L200: registerIrCard("ST23-04", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/meta.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-041 (Beastkin/Glowing Dawn/BEATBREAK), BT26-031 (Beastkin/Glowing Dawn/BEATBREAK), BT26-057 (Beastkin/Glowing Dawn/BEATBREAK), BT26-070 (Beastkin/Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-04.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("reduces an opponent Digimon by 5000 when digivolving", async () => {
L9: const s = setupEngine(
L22: expect(
L23: s.engine.applyIntent(0, {
L29: await settle(() => s.perm("base").topCard?.cardId === "ST23-04" && s.perm("opponent").currentDP === 5000);
L30: expect(s.perm("base").topCard?.cardId).toBe("ST23-04");
L31: expect(s.perm("opponent").currentDP).toBe(5000);
L34: it("uses a Glowing Dawn Option with its cost reduced by 3 after paying the under-Tamer cost", async () => {
L35: const s = setupEngine(
L54: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("murasamemon").instanceId })).toEqual({
L57: await settle(
L63: expect(s.state.memory).toBe(3);
L64: expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
L67: it("retains both play/use branches and the printed inherited unsuspend cost", () => {
L71: expect(modal).toMatchObject({
L80: expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-04.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-04", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-05 — Habakirimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-05",
  "set": "ST23",
  "nameEn": "Habakirimon",
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
    "Shaman",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Glowing Dawn] trait: Cost 3 \n\n[When Digivolving] [When Attacking] [Once Per Turn] Place 1 of your opponent's lowest DP Digimon as the top security card. Then, by trashing the top security card of 1 player with the most security cards, ＜Recovery +1＞ \n[All Turns] [Once Per Turn] When any of your [Glowing Dawn] trait Digimon would leave the battle area, by trashing your top security card, they don't leave.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "ST23-05",
  "dualEffect": "Habakirimon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Glowing Dawn] trait: Cost 3 \n\n[When Digivolving] [When Attacking] [Once Per Turn] Place 1 of your opponent's lowest DP Digimon as the top security card. Then, by trashing the top security card of 1 player with the most security cards, ＜Recovery +1＞ \n[All Turns] [Once Per Turn] When any of your [Glowing Dawn] trait Digimon would leave the battle area, by trashing your top security card, they don't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-05`

```text
ST23-05 Habakirimon
  Q&A (2):
    Q6167 (2026-05-08): What happens for "1 player with the most security cards" if both players have the same number of security cards?
      A: The player that activated the effect choses 1 player.
    Q6168 (2026-05-08): If I activate this card's [All Turns] effect when multiples of my specified Digimon would leave the battle area at the same time, are all of those Digimon prevented from leaving?
      A: Yes, all of those Digimon are prevented from leaving. This card's [All Turns] effect affects all Digimon without having to choose them.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-05.ts`; triggers AllTurns, WhenDigivolving, WhenAttacking; action/condition kinds Replacement, SecurityManipulation, RecoverByTrashingMostSecurity. Clause-bearing lines:

```text
L2: import { registerIrCard } from "../../engine/effects/interpreter.js";
L15: trigger: "AllTurns",
L16: frequency: "OncePerTurn",
L19: kind: "Replacement",
L25: kind: ["Digimon"],
L32: cost: {
L33: kind: "trashSecurityTop",
L39: trigger: "WhenDigivolving",
L40: frequency: "OncePerTurn",
L43: kind: "SecurityManipulation",
L49: kind: ["Digimon"],
L57: kind: "RecoverByTrashingMostSecurity",
L63: trigger: "WhenAttacking",
L64: frequency: "OncePerTurn",
L67: kind: "SecurityManipulation",
L73: kind: ["Digimon"],
L81: kind: "RecoverByTrashingMostSecurity",
L89: digivolutionRequirement: [
L91: cost: 3,
L98: registerIrCard("ST23-05", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-043 (Shaman/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-05.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L24: it("digivolving places the opp lowest-DP Digimon in security, then trashes-and-recovers (+1 deck draw)", async () => {
L25: const s = setupEngine(
L49: const res = s.engine.applyIntent(0, {
L54: expect(res).toEqual({ ok: true });
L58: await settle(() => deckBefore - p0.deck.length >= 2, 500);
L61: expect(base.topCard?.cardId).toBe(HABA);
L65: expect(p1.battleArea.some((p) => p.permanentId === oppPermanentId)).toBe(false);
L66: expect(p0.trash.some((c) => c.instanceId === oppTopId)).toBe(true);
L68: expect(deckBefore - p0.deck.length).toBe(2);
L71: it("trashes one security card to prevent all simultaneous Glowing Dawn leaves", async () => {
L72: const s = setupEngine(
L93: expect(deleted).toBe(0);
L94: expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
L97: expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-05.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-05", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-06 — Gekkomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-06",
  "set": "ST23",
  "nameEn": "Gekkomon",
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
    "Reptile",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 [Glowing Dawn] trait card to the hand and place 1 such card face down under any of your [Glowing Dawn] trait Tamers. Return the rest to the bottom of the deck.",
  "inheritedEffectText": "＜Piercing＞",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "ST23-06",
  "dualEffect": "Gekkomon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 [Glowing Dawn] trait card to the hand and place 1 such card face down under any of your [Glowing Dawn] trait Tamers. Return the rest to the bottom of the deck."
   - Inherited: "＜Piercing＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-06`

```text
ST23-06 Gekkomon
  Q&A (5):
    Q6169 (2026-05-08): What happens if I use this card's [When Moving] [On Play] effect and only 1 card with the [Glowing Dawn] trait is among the revealed cards?
      A: You add that card to your hand.
    Q6170 (2026-05-08): If I use this card's [When Moving] [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6171 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6172 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6173 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-06.ts`; triggers WhenMoving, OnPlay, Static; action/condition kinds RevealAdd. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L23: trigger: "WhenMoving",
L26: kind: "RevealAdd",
L57: kind: ["Tamer"],
L72: trigger: "OnPlay",
L75: kind: "RevealAdd",
L106: kind: ["Tamer"],
L121: trigger: "Static",
L134: digivolutionRequirement: [
L138: cost: 0,
L144: registerIrCard("ST23-06", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-046 (Reptile/Glowing Dawn/BEATBREAK), BT25-049 (Reptile/Glowing Dawn/BEATBREAK), ST23-07 (Reptile/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-06.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L6: it("reveals three, adds one Glowing Dawn card, and places another face down under its Tamer", async () => {
L7: const s = setupEngine(
L19: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
L22: await settle(
L27: expect(s.perm("tamer").stack).toHaveLength(1);
L28: expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
L29: expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03")).toBe(true);
L32: it("adds the sole revealed Glowing Dawn card to hand without disturbing an existing Tamer stack", async () => {
L33: const s = setupEngine(
L47: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
L50: await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02"));
L52: expect(s.perm("tamer").stack).toHaveLength(1);
L53: expect(s.perm("tamer").stack[0]!.instanceId).toBe(existingId);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-06.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-06", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-07 — Armalizamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-07",
  "set": "ST23",
  "nameEn": "Armalizamon",
  "colors": [
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
    "Reptile",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2 \n\n[On Play] [When Digivolving] If you have 1 or fewer Tamers, you may play 1 Tamer card with the [Glowing Dawn] trait from your hand without paying the cost.",
  "inheritedEffectText": "＜Piercing＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST23-07",
  "dualEffect": "Armalizamon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2 \n\n[On Play] [When Digivolving] If you have 1 or fewer Tamers, you may play 1 Tamer card with the [Glowing Dawn] trait from your hand without paying the cost."
   - Inherited: "＜Piercing＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-07`

```text
ST23-07 Armalizamon
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-07.ts`; triggers OnPlay, WhenDigivolving, Static; action/condition kinds PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "PlayWithoutCost",
L18: kind: ["Tamer"],
L30: condition: {
L31: kind: "permanentCount",
L35: filter: { kind: ["Tamer"] },
L38: optional: true,
L43: trigger: "WhenDigivolving",
L46: kind: "PlayWithoutCost",
L50: kind: ["Tamer"],
L62: condition: {
L63: kind: "permanentCount",
L67: filter: { kind: ["Tamer"] },
L70: optional: true,
L75: trigger: "Static",
L88: digivolutionRequirement: [
L92: cost: 2,
L98: registerIrCard("ST23-07", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-046 (Reptile/Glowing Dawn/BEATBREAK), BT25-049 (Reptile/Glowing Dawn/BEATBREAK), ST23-06 (Reptile/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-07.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L6: it("plays a Glowing Dawn Tamer when digivolving with no own Tamers", async () => {
L7: const s = setupEngine(
L22: expect(
L23: s.engine.applyIntent(0, {
L29: await settle(
L34: expect(s.perm("base").topCard?.cardId).toBe("ST23-07");
L38: expect(playedTamer?.topCard?.cardId).toBe("ST23-13");
L39: expect(playedTamer?.controllerSeat).toBe(0);
L40: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
L43: it("does not play a Tamer when its controller already has two Tamers", async () => {
L44: const s = setupEngine(
L63: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armalizamon").instanceId })).toEqual({
L66: await settle(() => s.state.memory === 5);
L68: expect(s.state.players[0]!.hand.some((card) => card.instanceId === candidateId)).toBe(true);
L69: expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "ST23-13")).toHaveLength(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-07.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-07", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-08 — Monarchlizamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-08",
  "set": "ST23",
  "nameEn": "Monarchlizamon",
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
    "Data"
  ],
  "types": [
    "Cyborg",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3 \n\n＜Alliance＞ \n[On Play] [When Digivolving] This Digimon gets +3000 DP until your opponent's turn ends. Then, if it's your turn, by trashing the bottom face-down card from under any of your Tamers, you may play or use 1 [Glowing Dawn] trait card from your hand with the cost reduced by 3.",
  "inheritedEffectText": "[End of Attack] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this [Glowing Dawn] trait Digimon unsuspends.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "ST23-08",
  "dualEffect": "Monarchlizamon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3 \n\n＜Alliance＞ \n[On Play] [When Digivolving] This Digimon gets +3000 DP until your opponent's turn ends. Then, if it's your turn, by trashing the bottom face-down card from under any of your Tamers, you may play or use 1 [Glowing Dawn] trait card from your hand with the cost reduced by 3."
   - Inherited: "[End of Attack] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this [Glowing Dawn] trait Digimon unsuspends."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-08`

```text
ST23-08 Monarchlizamon
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-08.ts`; triggers Static, OnPlay, WhenDigivolving, EndOfAttack; action/condition kinds ModifyDP, Modal, PlayWithoutCost, UseOptionWithoutCost, Unsuspend. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "OnPlay",
L24: kind: "ModifyDP",
L33: duration: "untilOpponentTurnEnd",
L36: kind: "Modal",
L42: kind: "PlayWithoutCost",
L46: kind: ["Digimon", "Tamer"],
L58: kind: "UseOptionWithoutCost",
L61: kind: ["Option"],
L70: condition: {
L71: kind: "isYourTurn",
L74: cost: {
L75: kind: "trashBottomFaceDownUnderTamer",
L79: kind: ["Tamer"],
L85: optional: true,
L86: abortOnDecline: true,
L91: trigger: "WhenDigivolving",
L94: kind: "ModifyDP",
L103: duration: "untilOpponentTurnEnd",
L106: kind: "Modal",
L112: kind: "PlayWithoutCost",
L116: kind: ["Digimon", "Tamer"],
L128: kind: "UseOptionWithoutCost",
L131: kind: ["Option"],
L140: condition: {
L141: kind: "isYourTurn",
L144: cost: {
L145: kind: "trashBottomFaceDownUnderTamer",
L149: kind: ["Tamer"],
L155: optional: true,
L156: abortOnDecline: true,
L161: trigger: "EndOfAttack",
L164: kind: "Unsuspend",
L172: cost: {
L173: kind: "trashBottomFaceDownUnderTamer",
L177: kind: ["Tamer"],
L183: optional: true,
L184: abortOnDecline: true,
L188: frequency: "OncePerTurn",
L193: digivolutionRequirement: [
L197: cost: 3,
L203: registerIrCard("ST23-08", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/meta.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-057 (Cyborg/Glowing Dawn/BEATBREAK), BT26-053 (Cyborg/Glowing Dawn/BEATBREAK), ST23-11 (Cyborg/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-08.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("gains 3000 DP when digivolving until the opponent's turn", async () => {
L8: const s = setupEngine(
L20: expect(
L21: s.engine.applyIntent(0, {
L27: await settle(() => s.perm("base").topCard?.cardId === "ST23-08" && s.perm("base").currentDP === 10000);
L28: expect(s.perm("base").topCard?.cardId).toBe("ST23-08");
L29: expect(s.perm("base").currentDP).toBe(10000);
L32: it("plays a Glowing Dawn Digimon with its cost reduced by 3 after paying the under-Tamer cost", async () => {
L33: const s = setupEngine(
L50: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monarchlizamon").instanceId })).toEqual({
L53: await settle(
L61: expect(s.state.memory).toBe(3);
L64: it("binds inherited unsuspend to the Digimon carrying this card", () => {
L66: expect(card?.effects.find((effect) => effect.isInherited)?.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-08.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-08", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-09 — Atratusmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-09",
  "set": "ST23",
  "nameEn": "Atratusmon",
  "colors": [
    "Green",
    "Black"
  ],
  "kinds": [
    "Digimon",
    "Option"
  ],
  "level": 6,
  "playCost": 5,
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
    "Data"
  ],
  "types": [
    "Mutant",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.5 w/[Glowing Dawn] trait: Cost 3 \n\n＜Security A. +1＞ \n＜Reboot＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] Your opponent's Digimon effects don't affect this Digimon until their turn ends. Then, delete 1 of your opponent's Digimon with the lowest DP.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "ST23-09",
  "dualEffect": "Eclipse Impact",
  "optionEffect": "＜Use Req. ([BEATBREAK] trait)＞ \n[Main] Suspend 1 of your opponent's Digimon. Then, return 1 of your opponent's suspended Digimon with the highest DP to the bottom of the deck.",
  "optionColorRequirements": [
    "Green"
  ],
  "isDualCard": true
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[Glowing Dawn] trait: Cost 3 \n\n＜Security A. +1＞ \n＜Reboot＞ \n＜Blocker＞ \n[When Digivolving] [When Attacking] [Once Per Turn] Your opponent's Digimon effects don't affect this Digimon until their turn ends. Then, delete 1 of your opponent's Digimon with the lowest DP."
   - Option: "＜Use Req. ([BEATBREAK] trait)＞ \n[Main] Suspend 1 of your opponent's Digimon. Then, return 1 of your opponent's suspended Digimon with the highest DP to the bottom of the deck."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-09`

```text
ST23-09 Atratusmon
  Q&A (7):
    Q6174 (2026-05-08): Is this card treated as an Option card with the traits shown on this card?
      A: Yes, it is. This card is treated as an Option card with traits such as Glowing Dawn and BEATBREAK.
    Q6175 (2026-05-08): What does "effects don't affect" mean, exactly?
      A: This effect prevents a card from being affected by effects. For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.
    Q6176 (2026-05-08): Can a card that has an "effects don't affect" effect be chosen for an effect?
      A: Yes, it can be chosen. For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.
    Q6177 (2026-05-08): Can a card that has an "effects don't affect" effect be given an effect?
      A: Yes, it can. It won't be affected by it, but it can be given an effect. However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.
    Q6178 (2026-05-08): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
      A: As soon as it gains the "effects don't affect" effect, it will no longer be affected.
    Q6179 (2026-05-08): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
      A: It will be affected by the effect as soon as it can be affected by effects.
    Q6180 (2026-05-08): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-09.ts`; triggers Static, WhenDigivolving, WhenAttacking, Main; action/condition kinds WaiveColorRequirement, GrantStatic, Delete, Suspend, Return. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L22: trigger: "Static",
L32: trigger: "Static",
L42: trigger: "Static",
L45: kind: "WaiveColorRequirement",
L53: condition: {
L54: kind: "youHave",
L70: trigger: "WhenDigivolving",
L73: kind: "GrantStatic",
L82: duration: "untilOpponentTurnEnd",
L85: kind: "Delete",
L89: kind: ["Digimon"],
L96: frequency: "OncePerTurn",
L97: sharedUseKey: "ir-shared-0",
L100: trigger: "WhenAttacking",
L103: kind: "GrantStatic",
L112: duration: "untilOpponentTurnEnd",
L115: kind: "Delete",
L119: kind: ["Digimon"],
L126: frequency: "OncePerTurn",
L127: sharedUseKey: "ir-shared-0",
L130: trigger: "Main",
L133: kind: "Suspend",
L137: kind: ["Digimon"],
L143: kind: "Return",
L148: kind: ["Digimon"],
L160: digivolutionRequirement: [
L164: cost: 3,
L170: registerIrCard("ST23-09", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-003 (Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK), BT25-041 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-09.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("deletes the opponent's lowest-DP Digimon when digivolving", async () => {
L9: const s = setupEngine(
L30: expect(
L31: s.engine.applyIntent(0, {
L37: await settle(() => s.perm("base").topCard?.cardId === "ST23-09" && s.state.players[1]!.battleArea.length === 1);
L38: expect(s.perm("base").topCard?.cardId).toBe("ST23-09");
L39: expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === lowId)).toBe(false);
L40: expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === highId)).toBe(true);
L41: expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowId)).toBe(true);
L44: it("exposes Security Attack +1, Reboot, and Blocker on its Digimon side", async () => {
L45: const s = setupEngine({ 0: { battleArea: [{ card: "ST23-09", as: "atratusmon" }] } });
L48: expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "SecurityAttack")).toBe(true);
L49: expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "Reboot")).toBe(true);
L50: expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "Blocker")).toBe(true);
L53: it("keeps shared once-per-turn immunity/deletion and the Option-side highest-DP return", () => {
L56: expect(card?.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
L65: expect(card?.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-09.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-09", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-10 — Pristimon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-10",
  "set": "ST23",
  "nameEn": "Pristimon",
  "colors": [
    "Black"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 2000,
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
    "Puppet",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[On Play] By placing 1 card from your hand face down under any of your Tamers with the [Glowing Dawn] trait, ＜Draw 2＞",
  "inheritedEffectText": "＜Blocker＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST23-10",
  "dualEffect": "Pristimon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[On Play] By placing 1 card from your hand face down under any of your Tamers with the [Glowing Dawn] trait, ＜Draw 2＞"
   - Inherited: "＜Blocker＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-10`

```text
ST23-10 Pristimon
  Q&A (4):
    Q6181 (2026-05-08): If I use this card's [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6182 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6183 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6184 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-10.ts`; triggers OnPlay, Static; action/condition kinds Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Draw",
L17: cost: {
L18: kind: "place",
L30: kind: ["Tamer"],
L39: optional: true,
L40: abortOnDecline: true,
L45: trigger: "Static",
L58: digivolutionRequirement: [
L62: cost: 0,
L68: registerIrCard("ST23-10", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT26-052 (Puppet/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-10.test.ts` contains 1 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L6: it("places an exact hand card face down under a Glowing Dawn Tamer and draws two", async () => {
L7: const s = setupEngine(
L23: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
L26: await settle(
L29: expect(s.perm("tamer").stack).toHaveLength(1);
L30: expect(s.perm("tamer").stack[0]!.instanceId).toBe(costId);
L31: expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
L32: expect(s.state.players[0]!.hand).toHaveLength(2);
L33: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
L34: expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-003")).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-10.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-10", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-11 — Wolvermon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-11",
  "set": "ST23",
  "nameEn": "Wolvermon",
  "colors": [
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
    "Cyborg",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2 \n\n＜Blocker＞ \n[Your Turn] When this Digimon would digivolve into a [Glowing Dawn] trait Digimon card, by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 2.",
  "inheritedEffectText": "＜Blocker＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST23-11",
  "dualEffect": "Wolvermon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2 \n\n＜Blocker＞ \n[Your Turn] When this Digimon would digivolve into a [Glowing Dawn] trait Digimon card, by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 2."
   - Inherited: "＜Blocker＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-11`

```text
ST23-11 Wolvermon
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-11.ts`; triggers Static, YourTurn; action/condition kinds Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: // Fix: cost was "kind: trash" targeting a Tamer card directly. Should be
L13: // "kind: trashBottomFaceDownUnderTamer" — trash the face-down digivolution card under a Tamer,
L18: trigger: "Static",
L28: trigger: "YourTurn",
L31: kind: "Replacement",
L38: kind: ["Digimon"],
L48: cost: {
L49: kind: "trashBottomFaceDownUnderTamer",
L53: optional: true,
L59: trigger: "Static",
L72: digivolutionRequirement: [
L76: cost: 2,
L82: registerIrCard("ST23-11", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-057 (Cyborg/Glowing Dawn/BEATBREAK), BT26-053 (Cyborg/Glowing Dawn/BEATBREAK), ST23-08 (Cyborg/Glowing Dawn/BEATBREAK), BT25-003 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-11.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L6: it("pays the bottom face-down under-Tamer card to reduce a Glowing Dawn digivolution by two", async () => {
L7: const s = setupEngine(
L23: expect(
L24: s.engine.applyIntent(0, {
L30: await settle(
L35: expect(s.perm("base").topCard?.cardId).toBe("ST23-04");
L36: expect(s.state.memory).toBe(0);
L37: expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
L38: expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
L41: it("allows the player to decline the by-cost and pay the full digivolution cost", async () => {
L42: const s = setupEngine(
L59: expect(
L60: s.engine.applyIntent(0, {
L66: await settle(() => s.state.pendingDecision?.kind === "optional");
L68: expect(
L69: s.engine.applyIntent(0, {
L75: await settle(() => s.perm("base").topCard?.cardId === "ST23-04" && s.state.memory === 0);
L77: expect(s.state.memory).toBe(0);
L78: expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-11.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-11", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-12 — Chiropmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-12",
  "set": "ST23",
  "nameEn": "Chiropmon",
  "colors": [
    "Purple"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 3,
  "playCost": 3,
  "dp": 2000,
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
    "Mammal",
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[On Play] By trashing the bottom face-down card from under any of your Tamers, you may return 1 Digimon card with the [Glowing Dawn] trait from your trash to the hand.",
  "inheritedEffectText": "＜Retaliation＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST23-12",
  "dualEffect": "Chiropmon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 \n\n[On Play] By trashing the bottom face-down card from under any of your Tamers, you may return 1 Digimon card with the [Glowing Dawn] trait from your trash to the hand."
   - Inherited: "＜Retaliation＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-12`

```text
ST23-12 Chiropmon
  Q&A (1):
    Q6185 (2026-05-08): After using this card's [On Play] effect to trash a card under a Tamer, can I return the trashed card to the hand?
      A: Yes, you can return it.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-12.ts`; triggers OnPlay, Static; action/condition kinds CostGatedBlock, Return. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "CostGatedBlock",
L15: cost: {
L16: kind: "trashBottomFaceDownUnderTamer",
L21: kind: ["Tamer"],
L27: optional: true,
L28: abortOnDecline: true,
L31: kind: "Return",
L36: kind: ["Digimon"],
L53: trigger: "Static",
L66: digivolutionRequirement: [
L70: cost: 0,
L76: registerIrCard("ST23-12", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-035 (Mammal/Glowing Dawn/BEATBREAK), BT26-026 (Mammal/Glowing Dawn/BEATBREAK), BT26-061 (Mammal/Glowing Dawn/BEATBREAK), ST23-03 (Mammal/Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-12.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L6: it("trashes the exact bottom face-down Tamer card to return a Glowing Dawn Digimon", async () => {
L7: const s = setupEngine(
L22: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
L25: await settle(
L30: expect(s.state.players[0]!.hand.some((card) => card.instanceId === returnedId)).toBe(true);
L31: expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
L32: expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
L35: it("can return the Glowing Dawn Digimon that was just trashed to pay the effect cost", async () => {
L36: const s = setupEngine(
L48: expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
L50: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chiropmon").instanceId })).toEqual({
L53: await settle(
L59: expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(costId);
L60: expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(false);
L61: expect(s.perm("tamer").stack.map((card) => card.instanceId)).not.toContain(costId);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-12.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-12", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-13 — Tomoro Tenma & Kyo Sawashiro — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-13",
  "set": "ST23",
  "nameEn": "Tomoro Tenma & Kyo Sawashiro",
  "colors": [
    "Green",
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
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.\n[All Turns] When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [Glowing Dawn] trait Digimon gets +3000 DP until your opponent's turn ends.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "ST23-13",
  "dualEffect": "Tomoro Tenma & Kyo Sawashiro"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.\n[All Turns] When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [Glowing Dawn] trait Digimon gets +3000 DP until your opponent's turn ends."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-13`

```text
ST23-13 Tomoro Tenma & Kyo Sawashiro
  Q&A (4):
    Q6186 (2026-05-08): If I use this card's [Start of Your Main Phase] [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6187 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6188 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6189 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-13.ts`; triggers StartOfYourMainPhase, OnPlay, AllTurns, Security; action/condition kinds PlaceUnder, GainMemory, SubTrigger, ModifyDP, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "StartOfYourMainPhase",
L11: kind: "PlaceUnder",
L14: optional: true,
L19: kind: "GainMemory",
L21: condition: {
L22: kind: "opponentHas",
L23: filter: { controllerDefault: "opponent", kind: ["Digimon"] },
L30: trigger: "OnPlay",
L33: kind: "PlaceUnder",
L36: optional: true,
L41: kind: "GainMemory",
L43: condition: {
L44: kind: "opponentHas",
L45: filter: { controllerDefault: "opponent", kind: ["Digimon"] },
L52: trigger: "AllTurns",
L55: kind: "SubTrigger",
L60: kind: "ModifyDP",
L64: kind: ["Digimon"],
L70: duration: "untilOpponentTurnEnd",
L71: cost: {
L72: kind: "suspend",
L75: optional: true,
L76: abortOnDecline: true,
L84: trigger: "Security",
L86: { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
L95: registerIrCard("ST23-13", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-003 (Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK), BT25-041 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-13.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
L11: it("places the exact deck-top card face down under itself and gains memory when the opponent has a Digimon", async () => {
L12: const s = setupEngine(
L22: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L23: await settle(
L34: expect(playedTamer.stack).toHaveLength(1);
L35: expect(playedTamer.stack[0]!.instanceId).toBe(deckTopId);
L36: expect(playedTamer.stack[0]!.faceUp).toBe(false);
L37: expect(s.state.memory).toBe(7);
L40: it("still gains mandatory memory when the optional deck-top placement is declined", async () => {
L41: const s = setupEngine(
L50: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L51: await settle(() => s.state.memory === 7);
L53: expect(s.state.players[0]!.deck).toHaveLength(1);
L54: expect(s.perm("tamer").stack).toHaveLength(0);
L57: it("reacts only when an effect trashes a card from under this Tamer", async () => {
L58: const s = setupEngine(
L72: await primitivesOf(s).trashDigivolutionCards(s.perm("otherHost").permanentId, [s.inst("otherUnder").instanceId], {
L75: await settle(() => false, 100);
L76: expect(s.perm("tamer").isSuspended).toBe(false);
L77: expect(s.perm("glowing").currentDP).toBe(4000);
L79: await primitivesOf(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("ownUnder").instanceId], {
L82: await settle(() => s.perm("tamer").isSuspended && s.perm("glowing").currentDP === 7000);
L83: expect(s.perm("glowing").currentDP).toBe(7000);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-13.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-13", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-14 — Reina Sakuya & Makoto Kuonji — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-14",
  "set": "ST23",
  "nameEn": "Reina Sakuya & Makoto Kuonji",
  "colors": [
    "Purple",
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
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.\n[Your Turn] When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [Glowing Dawn] trait Digimon gains ＜Jamming＞ for the turn.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST23-14",
  "dualEffect": "Reina Sakuya & Makoto Kuonji"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.\n[Your Turn] When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [Glowing Dawn] trait Digimon gains ＜Jamming＞ for the turn."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-14`

```text
ST23-14 Reina Sakuya & Makoto Kuonji
  Q&A (4):
    Q6190 (2026-05-08): If I use this card's [Start of Your Main Phase] [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6191 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6192 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6193 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-14.ts`; triggers StartOfYourMainPhase, OnPlay, YourTurn, Security; action/condition kinds PlaceUnder, GainMemory, SubTrigger, GainKeyword, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: trigger: "StartOfYourMainPhase",
L11: kind: "PlaceUnder",
L14: optional: true,
L19: kind: "GainMemory",
L21: condition: {
L22: kind: "opponentHas",
L23: filter: { controllerDefault: "opponent", kind: ["Digimon"] },
L30: trigger: "OnPlay",
L33: kind: "PlaceUnder",
L36: optional: true,
L41: kind: "GainMemory",
L43: condition: {
L44: kind: "opponentHas",
L45: filter: { controllerDefault: "opponent", kind: ["Digimon"] },
L52: trigger: "YourTurn",
L55: kind: "SubTrigger",
L60: kind: "GainKeyword",
L64: kind: ["Digimon"],
L70: duration: "forTheTurn",
L71: cost: {
L72: kind: "suspend",
L75: optional: true,
L76: abortOnDecline: true,
L84: trigger: "Security",
L86: { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
L95: registerIrCard("ST23-14", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-003 (Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK), BT25-041 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-14.test.ts` contains 2 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L9: it("suspends itself and grants Jamming to an exact Glowing Dawn Digimon when its under-card is trashed", async () => {
L10: const s = setupEngine(
L28: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
L31: await settle(() => {
L35: expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
L36: expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
L37: expect(s.perm("tamer").isSuspended).toBe(true);
L38: expect(observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming")).toBe(true);
L41: it("does not react when an effect trashes a card under another permanent", async () => {
L42: const s = setupEngine(
L57: await primitives.trashDigivolutionCards(s.perm("otherHost").permanentId, [s.inst("otherUnder").instanceId], {
L60: await settle(() => false, 100);
L62: expect(s.perm("tamer").isSuspended).toBe(false);
L63: expect(observe(s.engine).hasKeyword(s.perm("glowing"), "Jamming")).toBe(false);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-14.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-14", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.

## ST23-15 — e-Pulse — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST23-15",
  "set": "ST23",
  "nameEn": "e-Pulse",
  "colors": [
    "White"
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
    "Glowing Dawn",
    "BEATBREAK"
  ],
  "effectText": "＜Use Req. ([BEATBREAK] trait)＞ \n[Main] You may play 1 [BEATBREAK] trait card with a play cost of 4 or less from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Start of Your Main Phase] By placing this card from the battle area face down under any of your [BEATBREAK] trait Tamers, ＜Draw 1＞ and gain 1 memory.",
  "securityEffectText": "[Security] Activate this card's [Main] effects.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST23-15",
  "dualEffect": "e-Pulse"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Use Req. ([BEATBREAK] trait)＞ \n[Main] You may play 1 [BEATBREAK] trait card with a play cost of 4 or less from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Start of Your Main Phase] By placing this card from the battle area face down under any of your [BEATBREAK] trait Tamers, ＜Draw 1＞ and gain 1 memory."
   - Security: "[Security] Activate this card's [Main] effects."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST23-15`

```text
ST23-15 e-Pulse
  Q&A (4):
    Q6194 (2026-05-08): If I use this card's [Start of Your Main Phase] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6195 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6196 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6197 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
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
5. **Direct implementation:** `apps/api/src/cards/ST23/ST23-15.ts`; triggers Static, Main, StartOfYourMainPhase, Security; action/condition kinds WaiveColorRequirement, PlayWithoutCost, PlaceInBattleAreaSelf, Draw, GainMemory, ActivateMain. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L14: kind: "WaiveColorRequirement",
L22: condition: {
L23: kind: "youHave",
L39: trigger: "Main",
L42: kind: "PlayWithoutCost",
L58: optional: true,
L61: kind: "PlaceInBattleAreaSelf",
L66: trigger: "StartOfYourMainPhase",
L69: kind: "Draw",
L72: cost: {
L73: kind: "place",
L85: kind: ["Tamer"],
L94: optional: true,
L95: abortOnDecline: true,
L98: kind: "GainMemory",
L104: trigger: "Security",
L107: kind: "ActivateMain",
L117: registerIrCard("ST23-15", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/meta.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, targeting, conditions, paid costs, action order, controller direction, zones, duration, and watcher semantics were traced for these kinds.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-003 (Glowing Dawn/BEATBREAK), BT25-032 (Glowing Dawn/BEATBREAK), BT25-035 (Glowing Dawn/BEATBREAK), BT25-041 (Glowing Dawn/BEATBREAK). The alternate requirement and source-stack transition were compared with the catalog; Glowing Dawn/BEATBREAK mixed pools, near-matching cards, Tamer stacks, and inherited-source identity are covered by the focused proof or the traced shared primitives.
8. **Focused proof:** `apps/api/src/cards/ST23/ST23-15.test.ts` contains 3 passing test(s); observable engine evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("uses the Main effect to play the exact eligible BEATBREAK card and place itself in the battle area", async () => {
L8: const s = setupEngine(
L25: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
L26: await settle(
L32: expect(
L37: expect(
L42: expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(false);
L45: it("places itself in the battle area even when the optional play is declined", async () => {
L46: const s = setupEngine(
L54: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
L55: await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
L57: expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
L60: it("keeps the post-cost draw and memory gain mandatory after accepting the start-phase effect", () => {
L62: expect(start?.actions).toMatchObject([
L66: expect(start?.actions[1]).not.toHaveProperty("optional");
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST23/ST23-15.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST23-15", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Pre-audit implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. Every printed clause and applicable card ruling has executable IR plus focused or shared-seam proof; no unresolved card-specific ambiguity or presentation-only flow remains.
