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
