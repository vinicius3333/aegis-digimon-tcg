# EX6 Runtime and Collection Gate Checklist

Run only after the active unrelated Vitest PID/PGIDs 82901 and 97051 have both cleared. PID group 43774 references in the audit ledger are historical evidence for the original embargo. Use one explicit file per process with `--pool=forks --poolOptions.forks.singleFork=true --fileParallelism=false`; do not run these in parallel.

## Focused reconciliation

Verification confirmed the focused EX6 queue through EX6-074 complete.
The numbered groups below are retained as the source-audit inventory, not as
remaining permission to launch additional files. Current-dispatch exact evidence:

- EX6-023: 1 file, 3 passed (2.43s); EX6-024: 1 file, 3 passed (2.67s);
  EX6-026: 1 file, 3 passed (2.49s).
- EX6-050: 1 file, 2 passed (2.44s); EX6-051: 1 file, 2 passed (2.42s);
  EX6-055: 1 file, 2 passed (2.68s).
- EX6-071: 1 file, 1 passed (2.95s); EX6-072: 1 file, 2 passed (2.65s);
  EX6-073: 1 file, 5 passed (7.93s); EX6-074: 1 file, 2 passed (8.16s).

EX6-073 additionally proves the shared `Delete.trackCount` fix: actual
post-resolution deletions now drive `amountFromNamedCount`, so its Q3827
security result is `max(0, 7 - actuallyDeleted)`.

## Exact remaining gates

1. Reconfirm a clean worktree and the static baseline: 74 modules, 74 colocated
   tests, 74 `registerIrCard` registrations, and zero EX6 `registerCard` uses.
2. Verify that all focused and applicable mechanism tests passed.
3. Run exactly one serial collection process:

   ```sh
   pnpm --filter @aegis/api exec vitest run src/cards/EX6 --pool=forks --poolOptions.forks.singleFork=true --fileParallelism=false
   ```

4. Record exact file/test counts and duration. If green, run typecheck and
   `git diff --check`, push any correction, and re-verify branch cleanliness.
5. Only reproducible collection evidence plus every card's 10/10 assessment
   permits the required Orca worktree completion status and report.

1. Payment and owner-security routing: `EX6-018.test.ts`, `EX6-029.test.ts`.
2. Opponent-hand and count boundaries: `EX6-023.test.ts`, `EX6-024.test.ts`, `EX6-026.test.ts` (optional Security Attack head and one-of DigiXros material ceilings), `EX6-050.test.ts`, `EX6-051.test.ts`, `EX6-055.test.ts`, `EX6-071.test.ts`.
3. Stack/leave/replacement mechanics: `EX6-015.test.ts` (permanent relocation to its explicit self host before mandatory scaled return), `EX6-054.test.ts` (host-only Lucemon source cost), `EX6-058.test.ts`, `EX6-060.test.ts`, `EX6-061.test.ts`, `EX6-065.test.ts`, `EX6-069.test.ts`.
4. Trigger and delayed-action mechanics: `EX6-062.test.ts`, `EX6-063.test.ts`, `EX6-064.test.ts` (any-own-Digimon effect-suspension watcher scope), `EX6-070.test.ts` (passed 1 file, 2/2, 7.53s in the authorized forks/singleFork/no-file-parallelism window; prevented Delay source trash with a visible legal Delete target), `EX6-074.test.ts`.
5. Ogudomon per-activation/count boundaries: `EX6-073.test.ts` — exact Q3827 security count; duplicate names; unrelated stack; ordinary loose `isSelfRef`; zero/prevented delete; and a second activation after a blocked/zero placement.
6. Historical source-audit grouping retained for traceability; the focused queue
   is closed reconciliation, with collection still gated above.

Every failing file must be diagnosed and corrected before advancing; a green subset is not collection completion.
