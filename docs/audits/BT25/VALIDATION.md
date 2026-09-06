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
