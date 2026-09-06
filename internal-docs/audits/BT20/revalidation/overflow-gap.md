# BT20-004: reproduced Overflow origin bug

The public Pinamon once-per-turn reset fixture reveals BT20-045 Examon ACE with BT20-030's On Play search. Returning the unselected card to the deck bottom charges Overflow 5 even though that card has never entered the battle area or been under a card. A later search repeats this penalty.

Reproduction: `pnpm --filter @aegis/api exec vitest run src/cards/BT20/BT20-004.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=15000`.

Evidence: `004-memory-diagnostic.log`. Expected final memory is 10 - 3 play - 1 reduced evolution = 6. Actual events show 10 → 7 play, 7 → 2 Overflow, 2 → 1 evolution. CR 4-19-1 requires departure from the field or from under a card (3-4-6 includes breeding in the field). `returnToHand` and `returnToDeck` currently call `applyOverflow` for all moved cards without retaining their origins. Lead owns the serialized engine correction and mechanism regression. BT20-004 remains below 10/10 until fixed and rerun.

## Correction and verification

The lead corrected both return primitives to capture exact field-origin identities before collecting the move, then charge only moved field/attachment cards. The field includes battle and breeding areas. Loose ACE cards selected from hand, deck, trash or security retain their printed Overflow rule but do not incur it for these returns. Luna A independently reviewed the change against CR 4-19-1 / 3-4-6 and found no concrete issue.

- `overflow-origins-red.log`: 9 intended failures, 2 positive field-source controls passed before the correction.
- `overflow-affected-green.log`: 6 files, 492 tests passed. Command: `pnpm --filter @aegis/api exec vitest run src/engine/overflowOrigins.test.ts src/engine/overflow.test.ts src/engine/effects/primitives.test.ts src/engine/deckInteractions.test.ts src/cards/BT20/BT20-002.test.ts src/cards/BT20/BT20-004.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=15000`.
- `security-reviewed-typecheck.log`: API typecheck passed with the Overflow correction present.

This origin bug is resolved; BT20-004's expected final memory remains 6. Final collection delivery gates are still pending.
