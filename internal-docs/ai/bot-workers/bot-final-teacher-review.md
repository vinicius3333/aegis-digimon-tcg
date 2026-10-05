# Independent material teacher review

Date: 2026-10-05. Task `task_70f692370a07`, dispatch `ctx_fcb34657c1d9`.
Review worktree: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-runtime`; branch `bot-final-runtime`.

**Verdict: bounded teacher implementation review green; no unresolved critical, important or minor findings.** One important effect count guard gap was independently reproduced, corrected by the implementation worker and verified against stable pushed bytes. This is source and focused engine evidence, not actual model mastery or runtime qualification.

## Stable review inputs

- Main repair: `27e35e02986f3c090aea2d9baee366ed9f632dcf` (immutable, pushed).
- Effect repair: `dd567f43e22788f8eef53210e60c7632778943bc` (immutable, pushed).
- Accepted guard correction: `5089dfabc92c6baed32fc558711661edab3d5e2d` (immutable, pushed; verified with `git ls-remote`).

Final training source SHA256 pins: `referencePolicy.ts` = `c47278f1e1430fb16946ab461f3151d13c963b1305fc8f49e297ab2d2d2d157e`; `teacher.ts` = `96260d53ecf224abee96a605f92cee5a12b23453af77ff4de52bb1a19b16458c`; `policy.ts` = `4e32fefff0435f076d7cd0b0142442092abfe22502b663a050bade0f1e4b118b`.

## Main review

No Main findings. The training teacher reuses `mainActions()` validated Assembly/DigiXros declarations and projected costs. Exact material declaration rejection keys preserve alternate legal routes and clear on turn start. Private Assembly supervision checks the originating destination, ordered selected prefix, duplicate material identities and semantic material/finish markers. Missing labels stay explicitly null; they never become action zero. The selected completed intent alone reaches the engine.

Main commit scope is four training TypeScript files plus its worker handoff. The benchmark heuristic, legal action enumeration, existing material solver, observation/window/action schema, model/features/inference, card/rules engine and shared source have no delta in the Main repair.

Independent Main verification: 85 focused tests in seven files passed, including actual-engine Assembly and DigiXros stacks, costs, completion and both learner seats. Six additional reviewer fixtures passed, exercising hidden-opponent hand/deck/security identity invariance, another legal destination with unavailable private labels, and a legal learner material order diverging from the teacher prefix, with exact physical stack order. These use the real engine, not mocked card behavior or model output.

## Effect review

The effect commit passes 254 focused tests across nine files. Its training-only wrapper uses the current decision ID, learner seat, explicit material flags and public `selectionCards`; the unchanged material and general constraint solvers supply the choices. Actual BT26-096/BT26-073/BT25-008 Assembly and BT10-084/BT10-077/BT10-076 DigiXros continuations cover both seats, positive material/finish labels, cost and physical stacks.

**Important finding, corrected in `5089dfabc`:** a hostile variant of a genuine pending material request with candidates `[materialId, materialId]`, `min: 2` and `max: 2` caused the wrapper to emit one material, below the requested floor. The initial bound counted duplicate entries, while unchanged generic decision selection deduplicated and clamped its floor; replay equality was therefore insufficient proof of the declared minimum. Independent fixtures reproduced four failures: Assembly and DigiXros in both seats. Each fixture also completed the unmodified actual continuation without rejection; the hostile request itself was never applied to the engine. The correction counts unique offered identities and explicitly checks final uniqueness, membership and min/max before accepting a repaired response. All four original regressions now pass while preserving delegation and solver/window/benchmark bytes.

Final verification: **254 focused tests in nine files plus 10 independent engine/guard tests in two files passed**. Main private prefixes and exact stack order, both effect continuations, costs, material and finish labels, duplicates, unavailable constrained routes, alternate DigiXros quotas, stale/unrecognized decisions and concealed opponent identity invariance are covered. The teacher is constructed only under the training CLI's existing opt-in teacher flag. A zero diff confirms the fixed benchmark, legal action/decision programs, observation and CLI wiring, model/features/inference, engine/cards and shared sources are unchanged across the repair range. The unrelated planner-driver ancestor is outside this teacher review.

## Commands, evidence and limits

Supported local Node: `/tmp/aegis-supported-node26/node-v26.10.0-darwin-arm64/bin` prepended to PATH. Every Vitest run uses `--pool=forks --maxWorkers=1 --no-file-parallelism`.

Main command: `pnpm --filter @aegis/api exec vitest run src/bot/training/materialTeacher.test.ts src/bot/training/referencePolicy.test.ts src/bot/training/teacher.test.ts src/bot/training/assembly.test.ts src/bot/training/digiXros.test.ts src/bot/training/actions.test.ts src/bot/training/policy.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism`.

Final focused command: `pnpm --filter @aegis/api exec vitest run src/bot/training/effectMaterialTeacher.test.ts src/bot/training/materialTeacher.test.ts src/bot/training/referencePolicy.test.ts src/bot/training/teacher.test.ts src/bot/training/assembly.test.ts src/bot/training/digiXros.test.ts src/bot/training/decisions.test.ts src/bot/training/policy.test.ts src/bot/training/payments.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism`.

Reviewer fixture command: `pnpm --filter @aegis/api exec vitest run --config ../../artifacts/bot-training/bot-final-teacher-review/vitest.review.config.mts --pool=forks --maxWorkers=1 --no-file-parallelism`.

Focused lint and format checks on the five target TypeScript files and `git diff --check` pass. Normal Node26 pre-push workspace typecheck is required; its final result and review-document commit/push status are reported in the dispatch completion.

Ignored source fixtures and execution logs live only under `artifacts/bot-training/bot-final-teacher-review/`, including the preserved failing `independent-before-fix.log` and `independent-all-before-fix.log`, green `final-focused.log` and `independent-final.log`, `protected-source-diff.log`, and before/final source pin JSON. No card audit evidence is recorded here. No sibling/root worktree, sealed runtime, remote process, checkpoint or final seed was modified. Teacher supervision and focused engine tests do not establish current model mastery, held-out strength, all-card acceptance or deployment readiness. ROOT owns integration and supported fresh source qualification because these repairs change API source bytes; the full 104 BT26/77 EX13, 479-card, 44-recipe, both-seat, shared-policy acceptance scope remains intact.
