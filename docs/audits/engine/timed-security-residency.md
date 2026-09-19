# Timed security residency

## Contract and cause

BT25-039's Security End of Your Turn effect operates from face-up security, not trash. Local KB Q7117 (BT26-082) explicitly confines these effects to face-up security cards. The interpreter previously routed timed Security clauses through the ordinary security-check builder, whose unconditional source guard allowed hand, trash, and battle-area instances to announce and resolve end-turn effects.

## Correction

`securityTiming` in `apps/api/src/engine/effects/builders.ts` requires the exact source instance to be face up in an actual player's security stack. `builderForTrigger` selects it for timed Security clauses. Plain Security check effects and the existing continuous `securityStatic` branch keep their original behavior. Card registrations remain unchanged.

## Behavioral proof

- `BT25-039.test.ts`: `gates the end-of-turn security play with Sirenmon in %s` runs a complete production turn, asserting both the trigger announcement count and Ceresmon's resulting presence. Hand and trash stay silent; face-up security plays Ceresmon. Existing face-down and opponent-turn tests remain green.
- `securityTiming.test.ts`: 35 cases cover all five other timed Security cards found by scanning object properties in the committed TypeScript modules: BT20-052, BT20-055, EX11-041, EX11-043, BT26-082. Each has positive face-up security play, negative hand/trash/battle/stack/face-down cases, and wrong-turn rejection. Assertions include exact `effectTriggered` counts to catch announcements even when an action cannot move its source.
- Reverting only the interpreter routing makes 15 peer cases fail: hand, trash, and battle-area announcements for every peer. The original Sirenmon trash reproduction also failed before the correction.
- Focused Sirenmon and peer matrix: 65 tests, comprising 30 Sirenmon tests and 35 peer cases.
- Broader regression: 1,742 tests passed across 106 files, covering engine effects, security, timing/security conformance, all six affected card suites, and trash activation.

Reproduce with `pnpm --filter @aegis/api exec vitest run src/engine/securityTiming.test.ts src/cards/BT25/BT25-039.test.ts --maxWorkers=1 --no-file-parallelism`.

Additional verification: 194 tests passed across 12 files, including the focused regression matrix, legitimate end-turn trash effects (BT24-080, EX10-071, EX4-011, P-250), continuous Security peers, and audit-document validation. Repository typecheck, changed-file lint/format, and `git diff --check` passed.

This report covers the shared residency defect only and does not recalculate collection scores.
