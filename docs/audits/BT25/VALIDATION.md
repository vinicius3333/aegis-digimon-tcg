# BT25 validation record — 2026-09-06

Collection remains incomplete. Baseline checkout `a924de971`.

| Command                                                                                        | Actual result                                                                                            | Interpretation                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --maxWorkers=1 --no-file-parallelism` | First attempt exit 254: vitest not found                                                                 | Checkout had no dependencies; no tests executed                       |
| `pnpm typecheck`                                                                               | First attempt exit 1: tsc not found                                                                      | Checkout had no dependencies                                          |
| `pnpm install --frozen-lockfile`                                                               | PASS, pnpm 10.30.1                                                                                       | Lockfile unchanged                                                    |
| `pnpm typecheck`                                                                               | Exit 2 from shared build: TS5033 ENOSPC writing `packages/shared/dist/schema/index.js` and other outputs | Host disk full; typecheck gate has not passed                         |
| `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --maxWorkers=1 --no-file-parallelism` | 107 failed suites, zero tests; cannot find `./schema/index.js` from shared dist                          | Incomplete shared build prevents loading; not 107 behavioral failures |
| `pnpm --filter @aegis/shared build`                                                            | Shell cannot create redirected log: no space left on device                                              | Reproducible environment blocker                                      |

`df -h .` reports the Data volume at 100%, with free space fluctuating around
117–135 MiB. User notified to free several GB. No files outside this worktree
are deleted. Luna agents continue inspection and preserve edits where possible;
focused testing awaits a successful shared build and test lane clearance.

Local raw logs: `/tmp/bt25-audit-logs/install.log`,
`/tmp/bt25-audit-logs/baseline-typecheck.log`, and
`/tmp/bt25-audit-logs/baseline-collection.log`.

## Recovery and first executable collection run

Disk space returned to about 11 GiB. TypeScript had cached the ENOSPC emit diagnostics in this worktree's ignored `packages/shared/dist/.tsbuildinfo`; removing that generated cache allowed the shared build to complete. No source or other worktree was deleted.

- `pnpm typecheck`: shared build and shared/web typechecks passed. API found five first-wave errors: unsupported `security` CardZone in 003 test, missing shared `preserveOncePerTurnOnDecline` action type in 005/006, and missing scaling unit in 008 (two entries). Fixes are in progress; workspace gate remains unpassed.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT25 --maxWorkers=1 --no-file-parallelism`: **754 passed, 13 failed; 100 files passed, 7 failed; 36.84 seconds**. All failures were in newly expanded first-wave fixtures (001/002/003/005/010/011/012). This is an initial working-tree run, not a pristine baseline and not collection completion.
- `pnpm exec oxlint apps/api/src/cards/BT25`: exit 0 with warnings. One new underscore-name warning in 004 sent to its owner; historical warnings remain for later card batches.
- `git diff --check`: passed for the initial documentation commit and first-wave working edits.

Focused lane released to three Luna workers, each restricted to one process and one worker. Astra owns shared type correction, subsequent builds/catalog sync, and integration review.

Raw executable results: `/tmp/bt25-audit-logs/initial-collection.log` and `/tmp/bt25-audit-logs/recovered-typecheck.log`.

## First-wave integration checkpoint

- `pnpm typecheck`: **PASS** for shared, API, and web after the shared optional-decline property type and Coronamon paid-count scaling unit corrections. Log: `/tmp/bt25-audit-logs/first-wave-typecheck.log`.
- `pnpm effects:sync:set -- --set BT25 --base a924de971`: **PASS**, all 104 BT25 records synchronized. Compared with the base, 23 records changed semantically, including pre-existing stale snapshots; zero semantic or byte changes outside BT25. Log: `/tmp/bt25-audit-logs/first-wave-effects-sync.log`. The separate check command and final suite remain pending.
- Astra reviewed the green first-wave fixtures independently. Empty-deck draw checks, illegal second evolution candidates, an eligible unsuspended target mislabeled absent, and union branches never actually selected were sent back for stronger causal proof. Focused success is recorded per card and does not override these gaps.
- Seven cards have provisional dimension scores; none is verified 10/10. The generated ledger reports the exact current inventory, rather than retaining historical collection completion claims.

- Affected mechanism command: `pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/targeting/colorMatching.test.ts src/engine/effects/interpreter/scaling.test.ts --maxWorkers=1 --no-file-parallelism` — **4 files, 246 tests passed**. Log: `/tmp/bt25-audit-logs/first-wave-mechanisms.log`.

- `pnpm effects:check:set -- --set BT25 --base a924de971` — **PASS**, 104 records already synchronized, zero semantic or byte changes outside BT25. Log: `/tmp/bt25-audit-logs/first-wave-effects-check.log`.
- Astra focused integration reruns: 002/004 **16/16**, 001/003/006/007/008 **36/36**, 009–012 **41/41**. Logs: `/tmp/bt25-audit-logs/integration-002-004.log`, `integration-eggs-rookies.log`, `integration-trait-unions.log`. Targeted Oxlint and Oxfmt passed.
- Testkit caution: `settle(predicate)` drains microtasks and silently returns when its tick budget is exhausted; it does not assert the predicate. Each claimed outcome must have an explicit state assertion afterward. The 017 color fixtures failed this review despite a green focused count and remain incomplete pending repair.
