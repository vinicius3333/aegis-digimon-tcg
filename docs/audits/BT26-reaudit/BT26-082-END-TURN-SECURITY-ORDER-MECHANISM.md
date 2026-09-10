# BT26-082 Q7122 end-of-turn security ordering

## Red reproduction

The retained test manually declared Phantomon's attack during Main. That made the security check run before the end-of-opponent-turn window, so face-up Ravemon was removed from security and the test could not observe Q7122's sequence.

## Public correction

The test now drives only the production turn loop. Seat 1 ends Main with the printed `<Execute>` Phantomon in play. At the resulting end-of-turn window, the face-up Ravemon Security effect plays Ravemon from security first; this reduces its owner's security stack to zero. Execute then performs its end-of-turn player attack. Because the attack succeeds against an empty security stack, the empty-security rule declares seat 0 the loser and seat 1 the winner.

This is not an engine ordering bug. The existing `OnEndTurn` window and empty-security win check already produce the ruling when the test uses the card's real end-of-turn attack flow. No shared engine file or engine regression was added.

## Validation

Focused command:

`pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-082.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 18 tests passed, with no retained red.
