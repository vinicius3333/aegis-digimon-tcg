# Main action readiness guard

The production start-main regression is `apps/api/src/engine/mainPhaseReadiness.test.ts`. It holds a real `startOfYourMainPhase` watcher on a promise, then attempts public `playCard` and `endPhase` while `Phase.Main` is open and `pendingDecision` is absent.

With the `GameEngine.applyIntent` guard removed, the held test failed: `playCard` returned `{ok:true}` instead of `{ok:false, reason:"wrong-phase"}`. The test was then restored with the guard, and the focused suite passed 2/2. The guard rejects ordinary Main actions while `activeWindowToken`, `effectResolutionDepth`, or `optionResolutionDepth` is active; decision and combat response intents remain available.

Validation command: `pnpm --filter @aegis/api exec vitest run src/engine/mainPhaseReadiness.test.ts --maxWorkers=1 --no-file-parallelism` — actual result with guard: 1 file, 2 passed. `git diff --check` passes.

Coordinator integration: `pnpm --filter @aegis/api exec vitest run src/engine/mainPhaseReadiness.test.ts src/engine/TurnStateMachine.test.ts src/engine/subTriggerSeams.test.ts src/engine/effects/stack.test.ts src/engine/effectOptionUseCost.test.ts src/engine/combat src/engine/combatBattle.test.ts --maxWorkers=1 --no-file-parallelism` passed 21 files / 361 tests in 4.24s. The logged UnsupportedEffectError for synthetic AD1-002 is the intentional throw-path regression in combat/attackIntegration.test.ts. Independent Luna review found no production regression and requested explicit phase/turn/decision preconditions, which were added. Oxlint, Oxfmt and git diff --check passed; final typecheck/collection gates remain pending.
