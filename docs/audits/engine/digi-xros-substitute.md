# DigiXros Substitute lifecycle audit

## Scope and sources

The current executable catalog has one self-granting consumer of `DigiXrosSubstitute`: `apps/api/src/cards/BT10/BT10-111.ts` (BT10-111 Shoutmon [King Version]). Its On Play effect grants the keyword to itself for the turn after returning one distinct Digimon with a DigiXros requirement from its controller's trash. The scan found no second current consumer or separate inherited/granted producer; the self-grant is the only current runtime-grant form.

The public rules anchors are comprehensive-0117 (§7-2-2-10, SHA-256 `1ebbe9afb14fc39b5aee3c498e606dd9178970b2425fd882f84777cdfac157ae`) and comprehensive-0118 (§7-2-3-3, SHA-256 `b69edb2cf7ad45544307bbc8650afb7eaa424284b67933c8bb3a4a73c0c4e973`). The test cites both chunks at runtime. This is a bounded consumer proof, not a certification of all DigiXros recipes.

## Public evidence

`apps/api/src/cards/BT10/BT10-111.test.ts` has nine passing cases. The public replacement case plays BT10-111, returns the exact BT10-024 instance from trash, then publicly plays BT10-024 with exact physical BT10-111 and BT10-021 material IDs. After the King Version play establishes memory 5, the BT10-024 play pays exactly 3 (printed cost 7 reduced by 2 for two DigiXros materials), ending at memory 2. The resulting stack is exactly the two selected instances; the MetalGreymon hand card and both source field permanents leave their original positions after the completed effect.

The natural-boundary case starts the engine's turn loop, plays BT10-111, confirms the grant is active, ends player 0's and player 1's main phases through public `endPhase` intents, and waits for player 0's next main phase. The grant is absent then. A public BT10-024 play using BT10-111 as the substitution material returns `{ ok: false, reason: "invalid-material" }`; memory, hand, and both field instances remain unchanged. This proves expiry without manual flag mutation or a partial payment.

The same file also proves that BT10-111 cannot be added as an extra material when the printed DigiXros requirement is already satisfied, and that the On Play return filter does not return an ordinary non-DigiXros card. The provider is the native printed BT10-111 self-grant; no separate inherited or runtime-granted provider exists in the current scan.

## Bounded status

- **Proved:** one-turn grant; public trash-to-hand setup; exact physical replacement IDs; public cost and completed stack; extra-material rejection; natural turn-boundary expiry before movement/payment.
- **Bounded discovery:** no additional current consumer or separate inherited/granted producer exists in the reviewed scan, so those forms are N/A for the current implementation. Other DigiXros recipe shapes and source-zone combinations remain outside this one-consumer proof.
- **Not claimed:** whole DigiXros or whole-catalog certification from this one consumer.

Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-111.test.ts` — 9 tests passed.
