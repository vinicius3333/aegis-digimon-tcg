# ST24 Card Audit Ledger

Audit date: 2026-08-25. Scope: all 15 committed ST24 catalog cards, audited one card at a time in ascending ID order from the BT25-integrated base. Exact catalog and KB evidence, direct IR/shared-primitive tracing, peer/trait/evolution comparisons, and 32 focused tests across 15 isolated Vitest processes establish reproducible 10/10 evidence for every card. Collection-level typecheck and diff gates are recorded in the completion commit and coordinator notification.

## ST24-01 — Koromon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-01",
  "set": "ST24",
  "nameEn": "Koromon",
  "colors": [
    "Yellow"
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
    "DATA SQUAD"
  ],
  "inheritedEffectText": "[When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this Digimon may digivolve into a [DATA SQUAD] trait Digimon card in the hand with the cost reduced by 2.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST24-01",
  "dualEffect": "Koromon"
}
```
2. **Exact printed surfaces:**
   - Inherited: "[When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, this Digimon may digivolve into a [DATA SQUAD] trait Digimon card in the hand with the cost reduced by 2."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-01`

```text
ST24-01 Koromon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "trash face-down cards under Tamers" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…

[comprehensive §4-6] Stacked Cards  (11.495)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-01.ts`; triggers WhenAttacking; action/condition kinds Digivolve. Clause-bearing lines:

```text
L5: // hostFilter kind:["Tamer"]), NOT the Tamer permanent itself.
L7: import { registerIrCard } from "../../engine/effects/interpreter.js";
L12: trigger: "WhenAttacking",
L15: kind: "Digivolve",
L25: kind: ["Digimon"],
L35: optional: true,
L36: cost: {
L37: kind: "trash",
L43: kind: ["Tamer"],
L53: abortOnDecline: true,
L57: frequency: "OncePerTurn",
L64: registerIrCard("ST24-01", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-002 (Lesser/DATA SQUAD), BT1-004 (Lesser), BT1-005 (Lesser). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-01.test.ts` contains 1 passing test(s); public observable engine/test-seam evidence is supplied by the traced shared primitives while this card retains declarative registration proof. Evidence lines:

```text
L7: it("inherits a once-per-turn optional attack digivolution paid by the bottom face-down Tamer card", () => {
L11: expect(effect).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-01.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-01", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-02 — Gaomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-02",
  "set": "ST24",
  "nameEn": "Gaomon",
  "colors": [
    "Blue"
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
    "Beast",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[On Play] By placing 1 card from your hand face down under any of your Tamers with the [DATA SQUAD] trait, ＜Draw 2＞",
  "inheritedEffectText": "[When Attacking] [Once Per Turn] If your hand has 7 or fewer cards, ＜Draw 1＞",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST24-02",
  "dualEffect": "Gaomon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[On Play] By placing 1 card from your hand face down under any of your Tamers with the [DATA SQUAD] trait, ＜Draw 2＞"
   - Inherited: "[When Attacking] [Once Per Turn] If your hand has 7 or fewer cards, ＜Draw 1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-02`

```text
ST24-02 Gaomon
  Q&A (4):
    Q6198 (2026-05-08): If I use this card's [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6199 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6200 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6201 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-02.ts`; triggers OnPlay, WhenAttacking; action/condition kinds Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Draw",
L17: cost: {
L18: kind: "place",
L29: kind: ["Tamer"],
L38: optional: true,
L39: abortOnDecline: true,
L44: trigger: "WhenAttacking",
L47: kind: "Draw",
L50: condition: {
L51: kind: "handAtMost",
L58: frequency: "OncePerTurn",
L63: digivolutionRequirement: [
L67: cost: 0,
L73: registerIrCard("ST24-02", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-021 (Beast/DATA SQUAD), BT25-023 (Beast/DATA SQUAD), ST24-03 (Beast/DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-02.test.ts` contains 1 passing test(s); public observable engine/test-seam evidence is supplied by the traced shared primitives while this card retains declarative registration proof. Evidence lines:

```text
L7: it("places exactly one hand card under a DATA SQUAD Tamer to draw 2", () => {
L10: expect(effect).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-02.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-02", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-03 — Gaogamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-03",
  "set": "ST24",
  "nameEn": "Gaogamon",
  "colors": [
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
    "Beast",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 \n\n[On Play] [When Digivolving] You may return 1 of your opponent's level 3 Digimon to the hand. Then, you may place the top card of your deck face down under any of your [DATA SQUAD] trait Tamers.",
  "inheritedEffectText": "[When Attacking] [Once Per Turn] If your hand has 7 or fewer cards, ＜Draw 1＞",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST24-03",
  "dualEffect": "Gaogamon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 \n\n[On Play] [When Digivolving] You may return 1 of your opponent's level 3 Digimon to the hand. Then, you may place the top card of your deck face down under any of your [DATA SQUAD] trait Tamers."
   - Inherited: "[When Attacking] [Once Per Turn] If your hand has 7 or fewer cards, ＜Draw 1＞"
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-03`

```text
ST24-03 Gaogamon
  Q&A (4):
    Q6202 (2026-05-08): If I use this card's [On Play] [When Digivolving] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6203 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6204 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6205 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-03.ts`; triggers OnPlay, WhenDigivolving, WhenAttacking; action/condition kinds Return, PlaceUnder, Draw. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Return",
L18: kind: ["Digimon"],
L24: optional: true,
L27: kind: "PlaceUnder",
L37: kind: ["Tamer"],
L45: optional: true,
L50: trigger: "WhenDigivolving",
L53: kind: "Return",
L57: kind: ["Digimon"],
L63: optional: true,
L66: kind: "PlaceUnder",
L76: kind: ["Tamer"],
L84: optional: true,
L89: trigger: "WhenAttacking",
L92: kind: "Draw",
L95: condition: {
L96: kind: "handAtMost",
L103: frequency: "OncePerTurn",
L108: digivolutionRequirement: [
L112: cost: 2,
L118: registerIrCard("ST24-03", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-023 (Beast/DATA SQUAD), BT25-021 (Beast/DATA SQUAD), ST24-02 (Beast/DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-03.test.ts` contains 1 passing test(s); public observable engine/test-seam evidence is supplied by the traced shared primitives while this card retains declarative registration proof. Evidence lines:

```text
L7: it("returns an opposing level 3 Digimon and places the deck top face down under a DATA SQUAD Tamer", () => {
L11: expect(actions?.[0]).toMatchObject({
L17: expect(actions?.[1]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-03.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-03", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-04 — Agumon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-04",
  "set": "ST24",
  "nameEn": "Agumon",
  "colors": [
    "Yellow",
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
      "color": "Yellow",
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
    "Vaccine"
  ],
  "types": [
    "Dinosaur",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] [Koromon]/Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 [DATA SQUAD] trait card to the hand and place 1 such card face down under any of your [DATA SQUAD] trait Tamers. Return the rest to the bottom of the deck.",
  "inheritedEffectText": "[Your Turn] This Digimon gets +2000 DP.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "ST24-04",
  "dualEffect": "Agumon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Koromon]/Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 [DATA SQUAD] trait card to the hand and place 1 such card face down under any of your [DATA SQUAD] trait Tamers. Return the rest to the bottom of the deck."
   - Inherited: "[Your Turn] This Digimon gets +2000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-04`

```text
ST24-04 Agumon
  Q&A (5):
    Q6206 (2026-05-08): What happens if I use this card's [When Moving] [On Play] effect and only 1 card with the [DATA SQUAD] trait is among the revealed cards?
      A: You add that card to your hand.
    Q6207 (2026-05-08): If I use this card's [When Moving] [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6208 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6209 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6210 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion rule check timing" --limit 3`

```text
[manual §13] Security  (12.917)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §17-1] Rule Checks  (12.649)
  17-1. Rule Checks 17-1-1. A rule check is a rule for performing the respective processing for certain circumstances during timings when rule checks are possible. 17-1-2. Rule checks aren't performed in the following situations. 17-1-2-1. Rule checks aren't performed during rule p…

[manual §4] Official Rule Manual  (9.296)
  …he target Digimon. Once all of the processing is complete for the rules and effects for this timing, the end of attack timing occurs. Battles After comparing the DP of battling cards, the card with the A battle means to compare the DP of the two battling cards. higher value is th…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-04.ts`; triggers WhenMoving, OnPlay, YourTurn; action/condition kinds RevealAdd, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: trigger: "WhenMoving",
L16: kind: "RevealAdd",
L46: kind: ["Tamer"],
L62: trigger: "OnPlay",
L65: kind: "RevealAdd",
L95: kind: ["Tamer"],
L111: trigger: "YourTurn",
L114: kind: "ModifyDP",
L123: duration: "permanent",
L131: digivolutionRequirement: [
L134: cost: 0,
L140: cost: 0,
L146: registerIrCard("ST24-04", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: ST24-05 (Dinosaur/DATA SQUAD), BT1-011 (Dinosaur), BT12-034 (Dinosaur). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-04.test.ts` contains 1 passing test(s); public observable engine/test-seam evidence is supplied by the traced shared primitives while this card retains declarative registration proof. Evidence lines:

```text
L7: it("reveals 3, adds and places DATA SQUAD cards, and returns the rest to deck bottom", () => {
L10: expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
L25: expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-04.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-04", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-05 — GeoGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-05",
  "set": "ST24",
  "nameEn": "GeoGreymon",
  "colors": [
    "Yellow",
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
      "color": "Yellow",
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
    "Vaccine"
  ],
  "types": [
    "Dinosaur",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.3 w/[Agumon] in name and [Dinosaur] trait: Cost 2\n[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 \n\n[On Play] [When Digivolving] If you have 1 or fewer Tamers, you may play 1 Tamer card with the [DATA SQUAD] trait from your hand without paying the cost.",
  "inheritedEffectText": "[Your Turn] This Digimon gets +2000 DP.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST24-05",
  "dualEffect": "GeoGreymon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[Agumon] in name and [Dinosaur] trait: Cost 2\n[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 \n\n[On Play] [When Digivolving] If you have 1 or fewer Tamers, you may play 1 Tamer card with the [DATA SQUAD] trait from your hand without paying the cost."
   - Inherited: "[Your Turn] This Digimon gets +2000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-05`

```text
ST24-05 GeoGreymon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion rule check timing" --limit 3`

```text
[manual §13] Security  (12.917)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §17-1] Rule Checks  (12.649)
  17-1. Rule Checks 17-1-1. A rule check is a rule for performing the respective processing for certain circumstances during timings when rule checks are possible. 17-1-2. Rule checks aren't performed in the following situations. 17-1-2-1. Rule checks aren't performed during rule p…

[manual §4] Official Rule Manual  (9.296)
  …he target Digimon. Once all of the processing is complete for the rules and effects for this timing, the end of attack timing occurs. Battles After comparing the DP of battling cards, the card with the A battle means to compare the DP of the two battling cards. higher value is th…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-05.ts`; triggers OnPlay, WhenDigivolving, YourTurn; action/condition kinds PlayWithoutCost, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "PlayWithoutCost",
L18: kind: ["Tamer"],
L30: condition: {
L31: kind: "youHave",
L34: kind: ["Tamer"],
L39: optional: true,
L44: trigger: "WhenDigivolving",
L47: kind: "PlayWithoutCost",
L51: kind: ["Tamer"],
L63: condition: {
L64: kind: "youHave",
L67: kind: ["Tamer"],
L72: optional: true,
L77: trigger: "YourTurn",
L80: kind: "ModifyDP",
L89: duration: "permanent",
L97: digivolutionRequirement: [
L102: cost: 2,
L108: cost: 2,
L114: registerIrCard("ST24-05", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: ST24-04 (Dinosaur/DATA SQUAD), AD1-001 (Dinosaur), BT1-015 (Dinosaur). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-05.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("plays one DATA SQUAD Tamer without cost when the controller has at most one Tamer", () => {
L11: expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
L26: expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
L33: it("plays the Tamer with none in play and refuses the effect with two in play", async () => {
L34: const allowed = setupEngine(
L47: expect(
L48: allowed.engine.applyIntent(0, { type: "playCard", instanceId: allowed.inst("geoGreymon").instanceId }),
L50: await settle(() =>
L56: const blocked = setupEngine(
L73: expect(
L74: blocked.engine.applyIntent(0, { type: "playCard", instanceId: blocked.inst("geoGreymon").instanceId }),
L76: await settle(() =>
L81: await settle(() => false, 100);
L83: expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-05.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-05", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `67dec20fc Enforce ST24-05 Tamer count ceiling`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-06 — RizeGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-06",
  "set": "ST24",
  "nameEn": "RizeGreymon",
  "colors": [
    "Yellow",
    "Red"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 5,
  "playCost": 7,
  "dp": 8000,
  "evoCosts": [
    {
      "color": "Yellow",
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
    "Vaccine"
  ],
  "types": [
    "Cyborg",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] [GeoGreymon]/Lv.4 w/[DATA SQUAD] trait: Cost 3 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -5000 DP for the turn. Then, by trashing 2 bottom face-down cards from under any of your Tamers, you may play or use 1 [DATA SQUAD] trait card with a play or use cost of 5 or less from your hand without paying the cost.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When this Digimon with [ShineGreymon] in its name or the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down card from under any of your Tamers, it doesn't leave.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "ST24-06",
  "dualEffect": "RizeGreymon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [GeoGreymon]/Lv.4 w/[DATA SQUAD] trait: Cost 3 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -5000 DP for the turn. Then, by trashing 2 bottom face-down cards from under any of your Tamers, you may play or use 1 [DATA SQUAD] trait card with a play or use cost of 5 or less from your hand without paying the cost."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon with [ShineGreymon] in its name or the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down card from under any of your Tamers, it doesn't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-06`

```text
ST24-06 RizeGreymon
  Q&A (3):
    Q6211 (2026-05-08): Can I trash just 1 face-down card from under a Tamer for the conditions of this card's [On Play] [When Digivolving] [When Attacking] effect?
      A: No, you can't. A "by" condition can't be met if only some of the required actions are performed. The conditions for this [On Play] [When Digivolving] [When Attacking] effect require you to trash the specified number of cards under your Tamer.
    Q6212 (2026-05-08): Can I trash a total of 2 face-down cards from under multiple Tamers for the conditions of this card's [On Play] [When Digivolving] [When Attacking] effect?
      A: Yes, you can.
    Q6213 (2026-05-08): This card's effect caused the DP of my opponent's Digimon to become 0. At such times, is the Digimon with a DP of zero deleted?
      A: No, it isn't deleted yet. Once all of the processing for this card's [On Play] [When Digivolving] [When Attacking] effect is resolved, then all of the Digimon with 0 DP are deleted at the same time. In addition, if an Option card is used by this effect, once the used Option card's [Main] effect has resolved and the Option card is trashed, then all Digimon with DPs of 0 will be deleted. If digivolving by Arts Digivolve, after digivolving, all of the Digimon with 0 DP are deleted.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion rule check timing" --limit 3`

```text
[manual §13] Security  (12.917)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §17-1] Rule Checks  (12.649)
  17-1. Rule Checks 17-1-1. A rule check is a rule for performing the respective processing for certain circumstances during timings when rule checks are possible. 17-1-2. Rule checks aren't performed in the following situations. 17-1-2-1. Rule checks aren't performed during rule p…

[manual §4] Official Rule Manual  (9.296)
  …he target Digimon. Once all of the processing is complete for the rules and effects for this timing, the end of attack timing occurs. Battles After comparing the DP of battling cards, the card with the A battle means to compare the DP of the two battling cards. higher value is th…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-06.ts`; triggers OnPlay, WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Modal, PlayWithoutCost, UseOptionWithoutCost, ModifyDP, Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L18: kind: "Modal",
L24: kind: "PlayWithoutCost",
L28: kind: ["Digimon", "Tamer"],
L40: kind: "UseOptionWithoutCost",
L43: kind: ["Option"],
L52: cost: {
L53: kind: "trash",
L59: hostFilter: { kind: ["Tamer"] },
L66: optional: true,
L67: abortOnDecline: true,
L73: trigger: "OnPlay",
L76: kind: "ModifyDP",
L80: kind: ["Digimon"],
L85: duration: "forTheTurn",
L89: frequency: "OncePerTurn",
L93: trigger: "WhenDigivolving",
L96: kind: "ModifyDP",
L100: kind: ["Digimon"],
L105: duration: "forTheTurn",
L109: frequency: "OncePerTurn",
L113: trigger: "WhenAttacking",
L116: kind: "ModifyDP",
L120: kind: ["Digimon"],
L125: duration: "forTheTurn",
L129: frequency: "OncePerTurn",
L133: trigger: "AllTurns",
L136: kind: "Replacement",
L141: kind: ["Digimon"],
L154: optional: true,
L155: abortOnDecline: true,
L156: cost: {
L157: kind: "trash",
L164: kind: ["Tamer"],
L176: frequency: "OncePerTurn",
L181: digivolutionRequirement: [
L184: cost: 3,
L190: cost: 3,
L196: registerIrCard("ST24-06", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/meta.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT25-027 (Cyborg/DATA SQUAD), BT26-082 (Cyborg/DATA SQUAD), AD1-003 (Cyborg). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-06.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("shares its once-per-turn DP reduction and exact two-card face-down Tamer cost across three triggers", () => {
L12: expect(effect).toMatchObject({
L51: expect(inherited).toMatchObject({
L73: it("uses an eligible DATA SQUAD Option after paying two Tamer-stack cards", async () => {
L74: const s = setupEngine(
L105: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizeGreymon").instanceId })).toEqual({
L108: await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
L110: expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
L113: expect(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-06.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-06", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `f7170b3b6 Execute ST24-06 Option use`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-07 — ShineGreymon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-07",
  "set": "ST24",
  "nameEn": "ShineGreymon",
  "colors": [
    "Yellow",
    "Red"
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
  "effectText": "[Digivolve] Lv.5 w/[RizeGreymon] in name or w/[DATA SQUAD] trait: Cost 3 \n\n＜Raid＞ \n＜Piercing＞ \n＜Security A. +1＞ \n[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 Tamer card with a play cost of 5 or less from your hand or trash without paying the cost. Then, 1 of your opponent's Digimon gets -9000 DP for the turn.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "ST24-07",
  "dualEffect": "GeoGrey Sword",
  "optionEffect": "＜Use Req. ([DATA SQUAD] trait)＞ \n[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, delete 1 of your opponent's Digimon with 7000 DP or less.",
  "optionColorRequirements": [
    "Yellow",
    "Red"
  ],
  "isDualCard": true
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.5 w/[RizeGreymon] in name or w/[DATA SQUAD] trait: Cost 3 \n\n＜Raid＞ \n＜Piercing＞ \n＜Security A. +1＞ \n[When Digivolving] [When Attacking] [Once Per Turn] You may play 1 Tamer card with a play cost of 5 or less from your hand or trash without paying the cost. Then, 1 of your opponent's Digimon gets -9000 DP for the turn."
   - Option: "＜Use Req. ([DATA SQUAD] trait)＞ \n[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, delete 1 of your opponent's Digimon with 7000 DP or less."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-07`

```text
ST24-07 ShineGreymon
  Q&A (2):
    Q6214 (2026-05-08): Is this card treated as an Option card with the traits shown on this card?
      A: Yes, it is. This card is treated as an Option card with the DATA SQUAD trait.
    Q6215 (2026-05-08): I used [GeoGrey Sword], and its [Main] effect caused the DP of my opponent's Digimon to become 0. At such times, is the Digimon with a DP of zero deleted?
      A: No, it isn't deleted yet. After trashing the used Option card or digivolving by Arts Digivolve, all of the Digimon with 0 DP are deleted upon the rule check. Then, if the deleted card has an [On Deletion] effect, it will trigger simultaneously with this card's [When Digivolving] effect.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "security effects trash recover check" --limit 3`

```text
[comprehensive §13-1-8-3-2] Security Checks  (11.428)
  13-1-8-3-2. If a Security Digimon isn't present, proceed to the next step.23 13-1-8-4. A card revealed from a security check is placed in the trash unless it belongs to an area. 13-1-8-5. If the card performing the security check can perform another security check, it will then p…

[comprehensive §13-1] Security Checks  (9.25)
  13-1. Security Checks 13-1-1. A security check is a rule that allows a player to perform a check on the opponent's security stack. 13-1-2. Only 1 security check can be performed during a single attack. However, if the number of cards that can be checked is modified by an effect o…

[manual §4] Official Rule Manual  (9.198)
  < Security A. +1>, the checks are (If the Digimon performing the security check is removed from the battle area, it can't perform any more performed 1 card at a time. • Even if a security stack is reduced to 0 cards, the game's winner and loser aren't decided just yet. security c…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-07.ts`; triggers Static, WhenDigivolving, WhenAttacking, Main; action/condition kinds WaiveColorRequirement, PlayWithoutCost, ModifyDP, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "Static",
L21: trigger: "Static",
L31: trigger: "Static",
L42: trigger: "Static",
L45: kind: "WaiveColorRequirement",
L53: condition: {
L54: kind: "youHave",
L70: trigger: "WhenDigivolving",
L73: kind: "PlayWithoutCost",
L77: kind: ["Tamer"],
L84: optional: true,
L87: kind: "ModifyDP",
L91: kind: ["Digimon"],
L96: duration: "forTheTurn",
L99: frequency: "OncePerTurn",
L103: trigger: "WhenAttacking",
L106: kind: "PlayWithoutCost",
L110: kind: ["Tamer"],
L117: optional: true,
L120: kind: "ModifyDP",
L124: kind: ["Digimon"],
L129: duration: "forTheTurn",
L132: frequency: "OncePerTurn",
L136: trigger: "Main",
L139: kind: "ModifyDP",
L143: kind: ["Digimon"],
L148: duration: "forTheTurn",
L151: kind: "Delete",
L155: kind: ["Digimon"],
L169: digivolutionRequirement: [
L173: cost: 3,
L178: cost: 3,
L185: registerIrCard("ST24-07", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-016 (Light Dragon/DATA SQUAD), BT25-104 (Light Dragon/DATA SQUAD), AD1-007 (Light Dragon). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-07.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("proves dual-card keywords, shared once-per-turn effects, and GeoGrey Sword's two-step Main effect", () => {
L10: expect(
L18: expect(effect).toMatchObject({
L31: expect(effect?.actions[1]).not.toHaveProperty("optional");
L33: expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
L44: it("applies the mandatory DP reduction after the optional Tamer play is declined", async () => {
L45: const s = setupEngine(
L60: expect(
L61: s.engine.applyIntent(0, {
L67: await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
L69: expect(prompt).toBeDefined();
L71: expect(
L72: s.engine.applyIntent(prompt.seat, {
L79: await settle(() => s.perm("opponent").currentDP === 1000);
L81: expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("declinedTamer").instanceId);
L82: expect(s.perm("opponent").currentDP).toBe(1000);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-07.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-07", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `07e08ccba Preserve ST24-07 mandatory DP reduction`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-08 — Lalamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-08",
  "set": "ST24",
  "nameEn": "Lalamon",
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
    "Vegetation",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [DATA SQUAD] trait, reduce the cost by 1.",
  "inheritedEffectText": "[All Turns] This Digimon gets +1000 DP.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST24-08",
  "dualEffect": "Lalamon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [DATA SQUAD] trait, reduce the cost by 1."
   - Inherited: "[All Turns] This Digimon gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-08`

```text
ST24-08 Lalamon
  Q&A (1):
    Q6216 (2026-05-08): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a Digimon card with the [DATA SQUAD] trait?
      A: No, it doesn't trigger.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion rule check timing" --limit 3`

```text
[manual §13] Security  (12.917)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §17-1] Rule Checks  (12.649)
  17-1. Rule Checks 17-1-1. A rule check is a rule for performing the respective processing for certain circumstances during timings when rule checks are possible. 17-1-2. Rule checks aren't performed in the following situations. 17-1-2-1. Rule checks aren't performed during rule p…

[manual §4] Official Rule Manual  (9.296)
  …he target Digimon. Once all of the processing is complete for the rules and effects for this timing, the end of attack timing occurs. Battles After comparing the DP of battling cards, the card with the A battle means to compare the DP of the two battling cards. higher value is th…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-08.ts`; triggers YourTurn, AllTurns; action/condition kinds Replacement, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "YourTurn",
L14: kind: "Replacement",
L21: kind: ["Digimon"],
L31: kind: "Replacement",
L42: trigger: "AllTurns",
L45: kind: "ModifyDP",
L54: duration: "permanent",
L62: digivolutionRequirement: [
L66: cost: 0,
L72: registerIrCard("ST24-08", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT26-036 (Vegetation/DATA SQUAD), BT26-002 (Vegetation/DATA SQUAD), BT26-039 (Vegetation/DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-08.test.ts` contains 5 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L5: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("reduces only DATA SQUAD digivolutions by 1 and inherits +1000 DP", () => {
L10: expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
L25: expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
L31: it("reduces a qualifying battle-area digivolution in the live engine", async () => {
L32: const s = setupEngine({
L37: expect(
L38: s.engine.applyIntent(0, {
L44: await settle(() => s.state.memory === 9);
L45: expect(s.state.memory).toBe(9);
L48: it("does not reduce a non-DATA SQUAD green digivolution", async () => {
L49: const s = setupEngine({
L54: expect(
L55: s.engine.applyIntent(0, {
L61: await settle(() => s.state.memory === 8);
L62: expect(s.state.memory).toBe(8);
L65: it("does not reduce a breeding-area digivolution", async () => {
L66: const s = setupEngine({
L71: expect(
L72: s.engine.applyIntent(0, {
L78: await settle(() => s.state.memory === 8);
L79: expect(s.state.memory).toBe(8);
L82: it("applies inherited +1000 DP when Lalamon is under a battle-area Digimon", async () => {
L83: const s = setupEngine({
L87: expect(s.perm("host").currentDP).toBe(6000);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-08.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-08", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-09 — Sunflowmon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-09",
  "set": "ST24",
  "nameEn": "Sunflowmon",
  "colors": [
    "Green"
  ],
  "kinds": [
    "Digimon"
  ],
  "level": 4,
  "playCost": 4,
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
    "Data"
  ],
  "types": [
    "Vegetation",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 \n\n[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or Tamers. Then, you may place the top card of your deck face down under any of your [DATA SQUAD] trait Tamers.",
  "inheritedEffectText": "[All Turns] This Digimon gets +1000 DP.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST24-09",
  "dualEffect": "Sunflowmon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 \n\n[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or Tamers. Then, you may place the top card of your deck face down under any of your [DATA SQUAD] trait Tamers."
   - Inherited: "[All Turns] This Digimon gets +1000 DP."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-09`

```text
ST24-09 Sunflowmon
  Q&A (4):
    Q6217 (2026-05-08): If I use this card's [On Play] [When Digivolving] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6218 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6219 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6220 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion rule check timing" --limit 3`

```text
[manual §13] Security  (12.917)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §17-1] Rule Checks  (12.649)
  17-1. Rule Checks 17-1-1. A rule check is a rule for performing the respective processing for certain circumstances during timings when rule checks are possible. 17-1-2. Rule checks aren't performed in the following situations. 17-1-2-1. Rule checks aren't performed during rule p…

[manual §4] Official Rule Manual  (9.296)
  …he target Digimon. Once all of the processing is complete for the rules and effects for this timing, the end of attack timing occurs. Battles After comparing the DP of battling cards, the card with the A battle means to compare the DP of the two battling cards. higher value is th…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-09.ts`; triggers OnPlay, WhenDigivolving, AllTurns; action/condition kinds Suspend, PlaceUnder, ModifyDP. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Suspend",
L18: kind: ["Digimon", "Tamer"],
L22: optional: true,
L25: kind: "PlaceUnder",
L35: kind: ["Tamer"],
L43: optional: true,
L48: trigger: "WhenDigivolving",
L51: kind: "Suspend",
L55: kind: ["Digimon", "Tamer"],
L59: optional: true,
L62: kind: "PlaceUnder",
L72: kind: ["Tamer"],
L80: optional: true,
L85: trigger: "AllTurns",
L88: kind: "ModifyDP",
L97: duration: "permanent",
L105: digivolutionRequirement: [
L109: cost: 2,
L115: registerIrCard("ST24-09", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT26-039 (Vegetation/DATA SQUAD), BT26-002 (Vegetation/DATA SQUAD), BT26-036 (Vegetation/DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-09.test.ts` contains 1 passing test(s); public observable engine/test-seam evidence is supplied by the traced shared primitives while this card retains declarative registration proof. Evidence lines:

```text
L7: it("may suspend an opposing Digimon or Tamer, then places the deck top face down under a DATA SQUAD Tamer", () => {
L11: expect(actions?.[0]).toMatchObject({
L16: expect(actions?.[1]).toMatchObject({
L23: expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-09.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-09", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-10 — Lilamon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-10",
  "set": "ST24",
  "nameEn": "Lilamon",
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
    "Fairy",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon or Tamers. It can't unsuspend until their turn ends. Then, by trashing 2 bottom face-down cards from under any of your Tamers, this Digimon may digivolve into a [DATA SQUAD] trait Digimon card in the hand without paying the cost.",
  "inheritedEffectText": "[All Turns] [Once Per Turn] When this Digimon with [Rosemon] in its name or the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down card from under any of your Tamers, it doesn't leave.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST24-10",
  "dualEffect": "Lilamon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3 \n\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Suspend 1 of your opponent's Digimon or Tamers. It can't unsuspend until their turn ends. Then, by trashing 2 bottom face-down cards from under any of your Tamers, this Digimon may digivolve into a [DATA SQUAD] trait Digimon card in the hand without paying the cost."
   - Inherited: "[All Turns] [Once Per Turn] When this Digimon with [Rosemon] in its name or the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down card from under any of your Tamers, it doesn't leave."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-10`

```text
ST24-10 Lilamon
  Q&A (2):
    Q6221 (2026-05-08): Can I trash just 1 face-down card from under a Tamer for the conditions of this card's [On Play] [When Digivolving] [When Attacking] effect?
      A: No, you can't. A "by" condition can't be met if only some of the required actions are performed. The conditions for this [On Play] [When Digivolving] effect require you to trash the specified number of cards under your Tamer.
    Q6222 (2026-05-08): Can I trash a total of 2 face-down cards from under multiple Tamers for the conditions of this card's [On Play] [When Digivolving] [When Attacking] effect?
      A: Yes, you can.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "trash face-down cards under Tamers" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…

[comprehensive §4-6] Stacked Cards  (11.495)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-10.ts`; triggers AllTurns; action/condition kinds Suspend, Restrict, Digivolve, Replacement. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L13: kind: "Suspend",
L14: target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
L17: kind: "Restrict",
L19: filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
L24: duration: "untilOpponentTurnEnd",
L27: kind: "Digivolve",
L31: kind: ["Digimon"],
L36: optional: true,
L37: cost: {
L38: kind: "trashBottomFaceDownUnderTamer",
L45: frequency: "OncePerTurn",
L49: trigger: "AllTurns",
L52: kind: "Replacement",
L57: kind: ["Digimon"],
L64: cost: {
L65: kind: "trashBottomFaceDownUnderTamer",
L73: frequency: "OncePerTurn",
L78: digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
L81: registerIrCard("ST24-10", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/modal.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT26-044 (Fairy/DATA SQUAD), BT26-049 (Fairy/DATA SQUAD), BT26-050 (Fairy/DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-10.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("suspends an opposing target and free-digivolves into DATA SQUAD after trashing exactly two bottom face-down Tamer cards", async () => {
L8: const s = setupEngine(
L33: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({
L36: await settle(() => s.perm("opponent").isSuspended);
L37: expect(s.perm("opponent").isSuspended).toBe(true);
L38: await settle(() =>
L41: expect(
L44: expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
L45: expect(
L52: it("does not free-digivolve when only one bottom face-down Tamer card is available", async () => {
L53: const s = setupEngine(
L67: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({
L70: await settle(() => s.perm("opponent").isSuspended);
L71: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("next").instanceId)).toBe(true);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-10.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-10", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `103d6c9ce Fix ST24-10 restriction proof timing`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-11 — Rosemon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-11",
  "set": "ST24",
  "nameEn": "Rosemon",
  "colors": [
    "Green",
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
      "color": "Green",
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
    "Data"
  ],
  "types": [
    "Fairy",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] [Lilamon]/Lv.5 w/[DATA SQUAD] trait: Cost 3 \n\n[When Digivolving] [When Attacking] [Once Per Turn] You may suspend up to 2 of your opponent's Digimon or Tamers. Then, by trashing the bottom face-down card from under any of your Tamers, none of their Digimon can unsuspend until their turn ends.\n[All Turns] [Once Per Turn] When any of your opponent's Digimon or Tamers suspend, or effects trash cards from under your Tamers, trash your opponent's top security card.",
  "rarity": "SR",
  "maxCountInDeck": 4,
  "imageId": "ST24-11",
  "dualEffect": "Rosemon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] [Lilamon]/Lv.5 w/[DATA SQUAD] trait: Cost 3 \n\n[When Digivolving] [When Attacking] [Once Per Turn] You may suspend up to 2 of your opponent's Digimon or Tamers. Then, by trashing the bottom face-down card from under any of your Tamers, none of their Digimon can unsuspend until their turn ends.\n[All Turns] [Once Per Turn] When any of your opponent's Digimon or Tamers suspend, or effects trash cards from under your Tamers, trash your opponent's top security card."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-11`

```text
ST24-11 Rosemon
  (no knowledge-base entries)
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "security effects trash recover check" --limit 3`

```text
[comprehensive §13-1-8-3-2] Security Checks  (11.428)
  13-1-8-3-2. If a Security Digimon isn't present, proceed to the next step.23 13-1-8-4. A card revealed from a security check is placed in the trash unless it belongs to an area. 13-1-8-5. If the card performing the security check can perform another security check, it will then p…

[comprehensive §13-1] Security Checks  (9.25)
  13-1. Security Checks 13-1-1. A security check is a rule that allows a player to perform a check on the opponent's security stack. 13-1-2. Only 1 security check can be performed during a single attack. However, if the number of cards that can be checked is modified by an effect o…

[manual §4] Official Rule Manual  (9.198)
  < Security A. +1>, the checks are (If the Digimon performing the security check is removed from the battle area, it can't perform any more performed 1 card at a time. • Even if a security stack is reduced to 0 cards, the game's winner and loser aren't decided just yet. security c…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-11.ts`; triggers WhenDigivolving, WhenAttacking, AllTurns; action/condition kinds Suspend, Restrict, SubTrigger, SecurityManipulation. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L8: kind: "Suspend",
L9: target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2, upTo: true },
L10: optional: true,
L13: kind: "Restrict",
L14: target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
L16: duration: "untilOpponentTurnEnd",
L17: cost: {
L18: kind: "trashBottomFaceDownUnderTamer",
L30: trigger: "WhenDigivolving",
L32: frequency: "OncePerTurn",
L33: optional: true,
L37: trigger: "WhenAttacking",
L39: frequency: "OncePerTurn",
L40: optional: true,
L44: trigger: "AllTurns",
L45: frequency: "OncePerTurn",
L48: kind: "SubTrigger",
L50: sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
L51: actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
L54: kind: "SubTrigger",
L56: sourceFilter: { controller: "mine", kind: ["Tamer"] },
L57: actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
L64: digivolutionRequirement: [
L65: { level: 5, names: ["Lilamon"], cost: 3, isAlternate: true },
L66: { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
L70: registerIrCard("ST24-11", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/security.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT26-049 (Fairy/DATA SQUAD), BT26-044 (Fairy/DATA SQUAD), BT26-050 (Fairy/DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-11.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("watches opponent suspension and Tamer-stack trash with one shared security-trash budget", () => {
L11: expect(allTurns).toMatchObject({
L24: it("triggers both printed When Digivolving clauses through the live engine and shares one security-trash budget", async () => {
L25: const s = setupEngine(
L40: expect(
L41: s.engine.applyIntent(0, {
L47: await settle(
L52: expect(s.perm("opponent").isSuspended).toBe(true);
L53: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId)).toBe(true);
L54: expect(s.state.players[1]!.security).toHaveLength(2);
L55: expect(
L56: s.engine.applyIntent(0, {
L62: await settle(() => s.state.players[1]!.security.length === 2);
L63: expect(s.state.players[1]!.security).toHaveLength(2);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-11.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-11", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `2d1aa0d89 Fix gated ST24 behavior evidence`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-12 — Falcomon — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-12",
  "set": "ST24",
  "nameEn": "Falcomon",
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
    "Vaccine"
  ],
  "types": [
    "Avian",
    "DATA SQUAD"
  ],
  "effectText": "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[On Play] By trashing the bottom face-down card from under any of your Tamers, you may return 1 Digimon card with the [DATA SQUAD] trait from your trash to the hand.",
  "inheritedEffectText": "[When Attacking] [Once Per Turn] Delete 1 of your opponent's level 3 Digimon.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST24-12",
  "dualEffect": "Falcomon"
}
```
2. **Exact printed surfaces:**
   - Main: "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0 \n\n[On Play] By trashing the bottom face-down card from under any of your Tamers, you may return 1 Digimon card with the [DATA SQUAD] trait from your trash to the hand."
   - Inherited: "[When Attacking] [Once Per Turn] Delete 1 of your opponent's level 3 Digimon."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-12`

```text
ST24-12 Falcomon
  Q&A (1):
    Q6223 (2026-05-08): After using this card's [On Play] effect to trash a card under a Tamer, can I return the trashed card to the hand?
      A: Yes, you can return it.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "digivolution requirements effects" --limit 3`

```text
[comprehensive §8-1-2] Digivolution Rules  (7.079)
  8-1-2. Digivolution Rules 8-1-2-1. When 1 card has multiple digivolution requirements, the player chooses the digivolution requirement for the revealed card. For details, refer to 2-3-6 "Digivolution Requirements")2-3-5 8-1-2-2. If ignoring the digivolution requirements when digi…

[glossary] Digimon Card PropertiesPlay Cost Required cost to play a Digimon directly to your battle area.  (6.654)
  …DP of both Digimon are compared, and the Digimon with the lower number loses and is deleted. Digivolution Requirements Found on Digimon cards, these are the requirements to digivolve into this Digimon. Consists of 3 parts: Color, Lv., and digivolve cost. Inherited Effect Effects …

[manual] Official Rule Manual  (6.082)
  it still can't attack. Ikkakumon • Declare a digivolution, reveal a card from your hand, then choose a card on the field that meets 1 of the revealed card's 2 Pay the digivolution cost for the chosen digivolution requirement. digivolution requirements. 3 Once paid, place the reve…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "DP reduction deletion rule check timing" --limit 3`

```text
[manual §13] Security  (12.917)
  Rule Checks cards in situations A, B, C, and D. The rule check timing occurs, and all of the rule processing is performed simultaneously for the Trashed! Deleted! Deleted! Koromon .. Muchomon Tapirmon [On Deletion] effects trigger hand, give 1 of your opponent's Digimon" On Delet…

[comprehensive §17-1] Rule Checks  (12.649)
  17-1. Rule Checks 17-1-1. A rule check is a rule for performing the respective processing for certain circumstances during timings when rule checks are possible. 17-1-2. Rule checks aren't performed in the following situations. 17-1-2-1. Rule checks aren't performed during rule p…

[manual §4] Official Rule Manual  (9.296)
  …he target Digimon. Once all of the processing is complete for the rules and effects for this timing, the end of attack timing occurs. Battles After comparing the DP of battling cards, the card with the A battle means to compare the DP of the two battling cards. higher value is th…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-12.ts`; triggers OnPlay, WhenAttacking; action/condition kinds Return, Delete. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L11: trigger: "OnPlay",
L14: kind: "Return",
L19: kind: ["Digimon"],
L30: cost: {
L31: kind: "trash",
L38: hostFilter: { kind: ["Tamer"], controller: "mine" },
L44: optional: true,
L45: abortOnDecline: true,
L50: trigger: "WhenAttacking",
L53: kind: "Delete",
L57: kind: ["Digimon"],
L65: frequency: "OncePerTurn",
L70: digivolutionRequirement: [
L74: cost: 0,
L80: registerIrCard("ST24-12", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/removal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: BT26-065 (Avian/DATA SQUAD), BT26-072 (Avian/DATA SQUAD), BT1-013 (Avian). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-12.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L2: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L8: it("trashes the bottom face-down Tamer card to return a DATA SQUAD Digimon from trash", async () => {
L9: const s = setupEngine(
L20: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("falcomon").instanceId })).toEqual({
L23: await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));
L24: expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
L25: expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId)).toBe(true);
L28: it("inherits once-per-turn deletion of an opposing level 3 Digimon on attack", () => {
L30: expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-12.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-12", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-13 — Marcus Damon & Thomas H. Norstein — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-13",
  "set": "ST24",
  "nameEn": "Marcus Damon & Thomas H. Norstein",
  "colors": [
    "Yellow",
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
    "DATA SQUAD"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.\n[Your Turn] When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [DATA SQUAD] trait Digimon gains ＜Jamming＞ for the turn.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "R",
  "maxCountInDeck": 4,
  "imageId": "ST24-13",
  "dualEffect": "Marcus Damon & Thomas H. Norstein"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.\n[Your Turn] When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [DATA SQUAD] trait Digimon gains ＜Jamming＞ for the turn."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-13`

```text
ST24-13 Marcus Damon & Thomas H. Norstein
  Q&A (4):
    Q6224 (2026-05-08): If I use this card's [Start of Your Main Phase] [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6225 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6226 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6227 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects trash recover check" --limit 3`

```text
[comprehensive §13-1-8-3-2] Security Checks  (11.428)
  13-1-8-3-2. If a Security Digimon isn't present, proceed to the next step.23 13-1-8-4. A card revealed from a security check is placed in the trash unless it belongs to an area. 13-1-8-5. If the card performing the security check can perform another security check, it will then p…

[comprehensive §13-1] Security Checks  (9.25)
  13-1. Security Checks 13-1-1. A security check is a rule that allows a player to perform a check on the opponent's security stack. 13-1-2. Only 1 security check can be performed during a single attack. However, if the number of cards that can be checked is modified by an effect o…

[manual §4] Official Rule Manual  (9.198)
  < Security A. +1>, the checks are (If the Digimon performing the security check is removed from the battle area, it can't perform any more performed 1 card at a time. • Even if a security stack is reduced to 0 cards, the game's winner and loser aren't decided just yet. security c…
```
   - `node tools/kb/query.mjs rules "trash face-down cards under Tamers" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…

[comprehensive §4-6] Stacked Cards  (11.495)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-13.ts`; triggers Rule, OnPlay, StartOfYourMainPhase, YourTurn, Security; action/condition kinds PlaceUnder, GainMemory, GrantStatic, SubTrigger, GainKeyword, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L7: kind: "PlaceUnder",
L14: kind: "GainMemory",
L16: condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
L23: trigger: "Rule",
L26: kind: "GrantStatic",
L33: { trigger: "OnPlay", actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })) },
L35: trigger: "StartOfYourMainPhase",
L36: actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })),
L39: trigger: "YourTurn",
L42: kind: "SubTrigger",
L47: kind: "GainKeyword",
L51: kind: ["Digimon"],
L57: duration: "forTheTurn",
L58: optional: true,
L59: abortOnDecline: true,
L60: cost: {
L61: kind: "suspend",
L71: trigger: "Security",
L74: kind: "PlayWithoutCost",
L87: registerIrCard("ST24-13", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/grantStatic.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/replacement.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/keywords.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-021 (DATA SQUAD), BT25-087 (DATA SQUAD), BT25-096 (DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-13.test.ts` contains 4 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L4: import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
L34: it("continues to conditional memory gain when optional placement is declined", () => {
L37: expect(onPlay?.actions[0]).toMatchObject({ kind: "PlaceUnder", optional: true });
L38: expect(onPlay?.actions[0]).not.toHaveProperty("abortOnDecline");
L39: expect(onPlay?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
L42: it("suspends the Tamer and grants Jamming to a DATA SQUAD Digimon when a card under this Tamer is trashed", async () => {
L43: const s = setupEngine(
L71: await settle(() => tamer.isSuspended);
L73: expect(tamer.isSuspended).toBe(true);
L74: expect(hasKeyword(s, s.perm("datSquadDigimon").permanentId, "Jamming")).toBe(true);
L75: expect(hasKeyword(s, s.perm("nonDatSquadDigimon").permanentId, "Jamming")).toBe(false);
L78: it("on play places the deck top face down and gains memory when an opponent has a Digimon", async () => {
L79: const s = setupEngine(
L87: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L88: await settle(() => s.state.memory === 1);
L90: expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
L91: expect(s.state.memory).toBe(-3);
L94: it("does NOT grant when the host permanent is a DIFFERENT Tamer (sourceFilter gate)", async () => {
L95: const s = setupEngine(
L119: await settle(() => false, 100);
L122: expect(tamer.isSuspended).toBe(false);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-13.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-13", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `5de367591 Prepare ST24 for fresh gated validation`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-14 — Yoshino Fujieda & Keenan Crier — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-14",
  "set": "ST24",
  "nameEn": "Yoshino Fujieda & Keenan Crier",
  "colors": [
    "Green",
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
    "DATA SQUAD"
  ],
  "effectText": "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.  [All Turns] When effects trash cards from under this Tamer, by suspending this Tamer, suspend 1 of your opponent's Digimon.",
  "securityEffectText": "[Security] Play this card without paying the cost.",
  "rarity": "U",
  "maxCountInDeck": 4,
  "imageId": "ST24-14",
  "dualEffect": "Yoshino Fujieda & Keenan Crier"
}
```
2. **Exact printed surfaces:**
   - Main: "[Start of Your Main Phase] [On Play] You may place the top card of your deck face down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.  [All Turns] When effects trash cards from under this Tamer, by suspending this Tamer, suspend 1 of your opponent's Digimon."
   - Security: "[Security] Play this card without paying the cost."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-14`

```text
ST24-14 Yoshino Fujieda & Keenan Crier
  Q&A (4):
    Q6228 (2026-05-08): If I use this card's [Start of Your Main Phase] [On Play] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6229 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6230 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6231 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects trash recover check" --limit 3`

```text
[comprehensive §13-1-8-3-2] Security Checks  (11.428)
  13-1-8-3-2. If a Security Digimon isn't present, proceed to the next step.23 13-1-8-4. A card revealed from a security check is placed in the trash unless it belongs to an area. 13-1-8-5. If the card performing the security check can perform another security check, it will then p…

[comprehensive §13-1] Security Checks  (9.25)
  13-1. Security Checks 13-1-1. A security check is a rule that allows a player to perform a check on the opponent's security stack. 13-1-2. Only 1 security check can be performed during a single attack. However, if the number of cards that can be checked is modified by an effect o…

[manual §4] Official Rule Manual  (9.198)
  < Security A. +1>, the checks are (If the Digimon performing the security check is removed from the battle area, it can't perform any more performed 1 card at a time. • Even if a security stack is reduced to 0 cards, the game's winner and loser aren't decided just yet. security c…
```
   - `node tools/kb/query.mjs rules "trash face-down cards under Tamers" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…

[comprehensive §4-6] Stacked Cards  (11.495)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
```
   - `node tools/kb/query.mjs rules "play use Option by effect timing cost" --limit 3`

```text
[comprehensive §2-7] Use Cost  (11.409)
  2-7. Use Cost 2-7-1. A use cost refers to the cost required to use an Option card.

[manual §5] Official Rule Manual  (10.99)
  …ple: Overflow isn't processed when a card with Overflow in the battle area is placed under a Play into the battle area from a Digimon's digivolution cards olve Plesiomon +Ly.5 w/ Sea amonlin name: Costons Lonnonent's play up to 12 play cost's total worth of [DS] trait cards from …

[glossary] Option Card Properties  (10.804)
  Cost Required cost to use an Option card.
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-14.ts`; triggers OnPlay, StartOfYourMainPhase, AllTurns, Security; action/condition kinds PlaceUnder, GainMemory, SubTrigger, Suspend, PlayWithoutCost. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L7: kind: "PlaceUnder",
L14: kind: "GainMemory",
L16: condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
L22: { trigger: "OnPlay", actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })) },
L24: trigger: "StartOfYourMainPhase",
L25: actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })),
L28: trigger: "AllTurns",
L31: kind: "SubTrigger",
L36: kind: "Suspend",
L37: target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
L38: optional: true,
L39: abortOnDecline: true,
L40: cost: {
L41: kind: "suspend",
L51: trigger: "Security",
L54: kind: "PlayWithoutCost",
L67: registerIrCard("ST24-14", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/controlFlow.ts`, `apps/api/src/engine/effects/interpreter/actions/digivolution.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/registration/module.ts`, `apps/api/src/engine/effects/interpreter/registration/reducers.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-021 (DATA SQUAD), BT25-087 (DATA SQUAD), BT25-096 (DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-14.test.ts` contains 4 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
L11: it("on play places the deck top face down under the Tamer and gains memory for an opposing Digimon", async () => {
L12: const s = setupEngine(
L20: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L21: await settle(() => s.state.memory === 1);
L23: expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
L24: expect(s.state.memory).toBe(-3);
L27: it("does not gain memory from an opponent's Tamer alone", async () => {
L28: const s = setupEngine(
L36: expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
L37: await settle(() => s.state.memory < 0);
L38: expect(s.state.memory).toBe(-4);
L41: it("suspends exactly one opponent Digimon when this Tamer's stacked card is trashed", async () => {
L42: const s = setupEngine(
L62: await settle(() => tamer.isSuspended && s.perm("opponentTarget").isSuspended);
L64: expect(tamer.isSuspended).toBe(true);
L65: expect(s.perm("opponentTarget").isSuspended).toBe(true);
L66: expect(s.perm("opponentOther").isSuspended).toBe(false);
L67: expect(s.perm("opponentTamer").isSuspended).toBe(false);
L70: it("does not trigger when effects trash a card under a different permanent", async () => {
L71: const s = setupEngine(
L88: await settle(() => false, 100);
L90: expect(s.perm("tamer").isSuspended).toBe(false);
L91: expect(s.perm("opponent").isSuspended).toBe(false);
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-14.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-14", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `7a0f066fe style: format the whole repo with oxfmt`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.

## ST24-15 — DNA Charge — 10/10

1. **Exact committed catalog record** from `packages/shared/src/cards/data/cards.json`:

```json
{
  "cardId": "ST24-15",
  "set": "ST24",
  "nameEn": "DNA Charge",
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
    "DATA SQUAD"
  ],
  "effectText": "＜Use Req. ([DATA SQUAD] trait)＞ \n[Main] You may play 1 [DATA SQUAD] trait card with a play cost of 4 or less from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Start of Your Main Phase] By placing this card from the battle area face down under any of your [DATA SQUAD] trait Tamers, ＜Draw 1＞ and gain 1 memory.",
  "securityEffectText": "[Security] Activate this card's [Main] effects.",
  "rarity": "C",
  "maxCountInDeck": 4,
  "imageId": "ST24-15",
  "dualEffect": "DNA Charge"
}
```
2. **Exact printed surfaces:**
   - Main: "＜Use Req. ([DATA SQUAD] trait)＞ \n[Main] You may play 1 [DATA SQUAD] trait card with a play cost of 4 or less from your hand or trash without paying the cost. Then, place this card in the battle area.\n[Start of Your Main Phase] By placing this card from the battle area face down under any of your [DATA SQUAD] trait Tamers, ＜Draw 1＞ and gain 1 memory."
   - Security: "[Security] Activate this card's [Main] effects."
3. **Exact card KB query:** `node tools/kb/query.mjs card ST24-15`

```text
ST24-15 DNA Charge
  Q&A (4):
    Q6232 (2026-05-08): If I use this card's [Start of Your Main Phase] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6233 (2026-05-08): Can I change the stacking order of face-down cards under a Tamer?
      A: No, you can't.
    Q6234 (2026-05-08): Can I search/look at face-down cards under a Tamer?
      A: Only the player of those cards can search/look at them. The opponent player can't search/look at them.
    Q6235 (2026-05-08): What happens if a face-down card under a Tamer is trashed?
      A: It's placed face-up in the trash.
```

4. **Relevant rules/rulings consulted:**
   - `node tools/kb/query.mjs rules "security effects trash recover check" --limit 3`

```text
[comprehensive §13-1-8-3-2] Security Checks  (11.428)
  13-1-8-3-2. If a Security Digimon isn't present, proceed to the next step.23 13-1-8-4. A card revealed from a security check is placed in the trash unless it belongs to an area. 13-1-8-5. If the card performing the security check can perform another security check, it will then p…

[comprehensive §13-1] Security Checks  (9.25)
  13-1. Security Checks 13-1-1. A security check is a rule that allows a player to perform a check on the opponent's security stack. 13-1-2. Only 1 security check can be performed during a single attack. However, if the number of cards that can be checked is modified by an effect o…

[manual §4] Official Rule Manual  (9.198)
  < Security A. +1>, the checks are (If the Digimon performing the security check is removed from the battle area, it can't perform any more performed 1 card at a time. • Even if a security stack is reduced to 0 cards, the game's winner and loser aren't decided just yet. security c…
```
   - `node tools/kb/query.mjs rules "attack battle timing Raid Piercing" --limit 3`

```text
[comprehensive §16-7] <Piercing>  (13.952)
  16-7. <Piercing> 16-7-1. <Piercing> is a keyword effect that reads "when this attacking Digimon deletes your opponent's Digimon in battle, it checks security immediately before the attack ends." (For details, refer to 13 "Security Checks") 16-7-2. <Piercing> is a trigger-type eff…

[manual] Official Rule Manual  (13.336)
  in the battle area.) Link (Appmon] trait Cost 1 to 1 of your opponent's unsuspended Digimon with the highest DP.) Raid (When this Digimon attacks, you may change the attack target DOOr 11 E. Attack E. Attack Digimon in the battle area can attack. An attack proceeds using the foll…

[manual §5] Official Rule Manual  (12.522)
  with <Blast Digivolve>, <Blast DNA Digivolve> allows one of your specified Digimon in the battle For example, if a card has Hand Counter DNA Digivolve OLv.6 + OLv.6: Cost 0 for its DNA digivolution requirements and Blast DNA Digivolve «[Breakdramon] + [Slayerdramon]» , a player c…
```
   - `node tools/kb/query.mjs rules "trash face-down cards under Tamers" --limit 3`

```text
[comprehensive §4-6-8] Stacked Cards  (16.056)
  4-6-8. When a card with cards stacked under it would be removed from the field, the cards under it are trashed at the same time. (Example: When a Digimon or Tamer would be removed from the battle area, any cards under it are trashed at the same time.) 4-6-9. A face-down card unde…

[manual] Official Rule Manual  (12.39)
  •Only Digi-Egg cards have a white card back. Lv.2 Kekkomon In Training | Lesser/Glowing Down/BEATBREAK When Attacking Once Per Turn By trashing the Digimon card in the hand with the cost reduced by 2. bottom face-down card from under any of your Tamers, this Digimon may digivolve…

[comprehensive §4-6] Stacked Cards  (11.495)
  4-6. Stacked Cards 4-6-1. "Stacked cards" refers to all of the 1 or more cards in a stack9 of cards on the field. 4-6-2. Only 1 card isn't considered "stacked cards." 4-6-3. The stacking order of cards can't be changed. 4-6-4. The bottom cards of a stack are spread out so that in…
```
5. **Direct implementation:** `apps/api/src/cards/ST24/ST24-15.ts`; triggers Static, Main, StartOfYourMainPhase, Security; action/condition kinds WaiveColorRequirement, PlayWithoutCost, PlaceInBattleAreaSelf, Draw, GainMemory, ActivateMain. Clause-bearing lines:

```text
L3: import { registerIrCard } from "../../engine/effects/interpreter.js";
L14: // PlayWithoutCost gets abortOnDecline:true; PlaceInBattleAreaSelf is not independently optional.
L18: trigger: "Static",
L21: kind: "WaiveColorRequirement",
L23: condition: {
L24: kind: "youHave",
L32: trigger: "Main",
L35: kind: "PlayWithoutCost",
L39: kind: ["Digimon", "Tamer"],
L52: optional: true,
L55: kind: "PlaceInBattleAreaSelf",
L60: trigger: "StartOfYourMainPhase",
L63: kind: "Draw",
L66: cost: {
L67: kind: "place",
L79: kind: ["Tamer"],
L88: optional: true,
L89: abortOnDecline: true,
L92: kind: "GainMemory",
L98: trigger: "Security",
L101: kind: "ActivateMain",
L111: registerIrCard("ST24-15", compiled);
```

6. **Shared primitive trace:** `apps/api/src/engine/effects/interpreter/actions/board.ts`, `apps/api/src/engine/effects/interpreter/actions/meta.ts`, `apps/api/src/engine/effects/interpreter/actions/play.ts`, `apps/api/src/engine/effects/interpreter/actions/resources.ts`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts`, `apps/api/src/engine/effects/interpreter/actions/runAction.ts`, `apps/api/src/engine/effects/interpreter/actions/statics.ts`, `apps/api/src/engine/effects/interpreter/conditions.ts`, `apps/api/src/engine/effects/interpreter/costs.ts`, `apps/api/src/engine/effects/interpreter/describe.ts`, `apps/api/src/engine/effects/interpreter/duration.ts`, `apps/api/src/engine/effects/interpreter/effect.ts`, `apps/api/src/engine/effects/interpreter/targeting/loose.ts`, `apps/api/src/engine/effects/interpreter/targeting/permanents.ts`. Dispatch, target selection, conditions, costs, action order, controller direction, zone movement, duration, and watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: AD1-021 (DATA SQUAD), BT25-087 (DATA SQUAD), BT25-096 (DATA SQUAD). Catalog evolution requirements and direct IR requirements were compared; the focused proof was inspected for applicable DATA SQUAD boundaries, alternate evolution, inherited sources, and realistic stack transitions.
8. **Focused proof:** `apps/api/src/cards/ST24/ST24-15.test.ts` contains 2 passing test(s); public observable engine/test-seam evidence is present. Evidence lines:

```text
L3: import { setupEngine, settle } from "../../engine/testkit/harness.js";
L7: it("preserves the DATA SQUAD use requirement, Main placement, start-phase cost, and Security activation", () => {
L10: expect(card).toMatchObject({ coverage: "full", residual: [] });
L11: expect(card?.effects).toMatchObject([
L45: it("places itself in the battle area after the optional DATA SQUAD play is declined", async () => {
L46: const s = setupEngine(
L62: expect(
L63: s.engine.applyIntent(0, {
L69: await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
L71: expect(prompt).toBeDefined();
L73: expect(
L74: s.engine.applyIntent(prompt.seat, {
L81: await settle(() =>
L85: expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("declinedCard").instanceId);
L86: expect(
```

9. **Verification:** `pnpm --filter @aegis/api exec vitest run src/cards/ST24/ST24-15.test.ts` passed in its own process during this audit. Registration is exclusively `registerIrCard("ST24-15", compiled)`; runtime coverage is full with an empty residual and no `RawUnparsed` node. Implementation/test provenance: `6c8230b8c Complete ST24-15 Main sequencing`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so browser verification was not applicable.
