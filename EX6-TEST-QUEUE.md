# EX6 Serial Test Queue

Run only after PID group 43774 has cleared and the coordinator authorizes the gate. Use one explicit file per process with `--pool=forks --poolOptions.forks.singleFork=true --fileParallelism=false`; do not run these in parallel.

1. Payment and owner-security routing: `EX6-018.test.ts`, `EX6-029.test.ts`.
2. Opponent-hand and count boundaries: `EX6-050.test.ts`, `EX6-051.test.ts`, `EX6-055.test.ts`, `EX6-071.test.ts`.
3. Stack/leave/replacement mechanics: `EX6-058.test.ts`, `EX6-060.test.ts`, `EX6-061.test.ts`, `EX6-065.test.ts`, `EX6-069.test.ts`.
4. Trigger and delayed-action mechanics: `EX6-062.test.ts`, `EX6-063.test.ts`, `EX6-064.test.ts`, `EX6-070.test.ts` (prevented Delay source trash with a visible legal Delete target), `EX6-074.test.ts`.
5. Ogudomon per-activation/count boundaries: `EX6-073.test.ts` — exact Q3827 security count; duplicate names; unrelated stack; ordinary loose `isSelfRef`; zero/prevented delete; and a second activation after a blocked/zero placement.
6. Remaining focused EX6 files in ascending card-ID order, followed by the explicitly approved collection gate.

Every failing file must be diagnosed and corrected before advancing; a green subset is not collection completion.
