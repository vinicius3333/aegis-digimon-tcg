# BT20 re-audit review notes

## Baseline defects

- BT20-003: focused proof waits for an `orderTriggers` decision that never appears after the public memory-gain reopening flow. Determine whether the test milestone is stale or production behavior is wrong.
- BT20-028: three focused assertions reference opposing permanents after the effect has removed them. Determine whether fixtures/assertions are stale or the implementation deletes beyond the printed contract.

## Coordinator decisions

- Existing `apps/api/src/cards/BT20/AUDIT.md` and `internal-docs/audits/BT20/revalidation/*` are historical evidence only.
- No card receives gate credit until the full collection, affected mechanisms, typecheck, scoped static checks, commits, and pushed branch are all reproduced.
