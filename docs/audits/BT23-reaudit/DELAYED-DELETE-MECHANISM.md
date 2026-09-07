# Current-turn delayed deletion mechanism

BT23-025 Q5563/Q5564 require deletion at the current turn end, orderable with simultaneous end-turn effects. The existing default meant the owner turn end, so a MarineAngemon played from Security during the opponent turn survived one boundary too long.

The reusable IR and primitive now accept explicit `endOfCurrentTurn`, capturing the active seat at installation. Existing owner/opponent modes and their defaults are preserved. The card's IR correction is delivered separately with its remaining card-level evidence.

`apps/api/src/engine/effects/delayedDeletePlayed.test.ts` covers all three modes from both seats, exact physical-card trash identity, an identical untouched control, and both Q5564 simultaneous ordering choices using public endPhase/respondDecision and real combat. The test seam installs the pending deletion; the production turn loop drives its processing. BanchoLeomon first checks one security before deletion; deletion first prevents the attack.

Coordinator validation:

- `pnpm --filter @aegis/api exec vitest run src/engine/effects/delayedDeletePlayed.test.ts src/cards/BT23/BT23-025.test.ts src/cards/BT23/BT23-036.test.ts src/cards/BT23/BT23-048.test.ts src/engine/effects/interpreter.test.ts src/engine/subTriggerSeams.test.ts src/engine/effects/subTriggers.test.ts --maxWorkers=1 --no-file-parallelism`: 7 files, 300 passed, 3.42s. Working-tree integration includes the pending BT23-025 correction.
- `pnpm typecheck`: shared/web passed; the coordinator's attempt to use an absent advance.verb adapter failed API typing. Restored the existing typed internals seam; `pnpm --filter @aegis/api typecheck` passed.
- Applicable Oxfmt and `git diff --check` passed. Oxlint passed with one warning in the separate uncommitted App Fusion change, outside this mechanism.
- BT23-only effects sync/check passed: 102 records synchronized, 5 semantic changes from baseline, zero changes outside BT23. Card/catalog updates remain staged separately.

Logs: `logs/delayed-delete-integration.log`, `logs/typecheck-025-timing.log`, `logs/typecheck-025-timing-api-rerun.log`, `logs/effects-sync-025-timing.log`, `logs/effects-check-025-timing.log`.

This mechanism checkpoint does not complete MarineAngemon or the collection.
