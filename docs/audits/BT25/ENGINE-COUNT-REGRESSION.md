# Breeding information in ordinary effect counts

BT25-018's public On Play scenario exposed a shared counting defect. With two own battle-area Digimon and one breeding Digimon, an opponent's 17000 DP Digimon became 11000 rather than 13000. `countMatching` included breeding by default, affecting both per-card scaling and conditions such as `opponentHas`.

The committed comprehensive rules §§3-4-7-7/8 prohibit using breeding cards to satisfy ordinary activation conditions or reference their information. Explicit references to breeding remain permitted.

The regression in `apps/api/src/engine/effects/interpreter.test.ts`, named `excludes breeding from ordinary scaling and conditions but honors explicit references`, failed with expected count 1 and observed count 2 before the fix. It checks ordinary scaling, opponent existence, both-player counting, explicit breeding, and an explicit battle-area/breeding union. The fix keeps the existing loose-card and explicit single-zone branches and only admits breeding in the fallback scan when the zone union explicitly includes it.

Commands and observed results:

- `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts --maxWorkers=1 --no-file-parallelism -t 'breeding references in effect counts'`: **FAIL before fix**, expected 1, observed 2.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/cards/BT25/BT25-018.test.ts --maxWorkers=1 --no-file-parallelism`: **220 tests passed** after fix at that checkpoint.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts src/engine/effects/subtriggers.test.ts src/engine/effects/modifiers.test.ts src/engine/effects/continuous.test.ts src/engine/effects/interpreter/scaling.test.ts src/engine/opponentTurnImmunityDuration.test.ts src/engine/conformance/ch04-basic-terminology.test.ts --maxWorkers=1 --no-file-parallelism`: **444 tests passed**.
- Expanded BT25-018 focused suite: **11 tests passed**, including public breeding-only discount rejection and Q6267 zero-DP target selection before the final rule check.

BT25-017's separate red test was a fixture defect: its responder omitted the evolution-cost `chooseOption` answer. Adding that answer passed the reproduction. The final fixture uses real red-to-blue and blue-to-red evolution intents, no manually fired fallback event, and explicit top-card, source-stack, hand, and memory assertions. Its 13 focused tests pass.

These checks are integration evidence, not collection completion. The final collection and delivery gates remain required.
