# Public restriction status at decision publication

Reviewed: 2026-09-27. Scope: restriction fields visible while an effect pauses for a player decision.

## Reproduction and cause

`lowestDpDeletion.test.ts` exercises ST23-09 Hinokamuy's actual evolution and attack entries through the asynchronous training policy, for both seats and either tied lowest-DP target. The effect grants immunity to opposing Digimon effects before selecting a deletion target. All eight cases failed before the correction: `engine.continuous.hasRestriction(sourceId, "beAffected", "Digimon", { byOpponentEffect: true })` was true inside the policy callback, but the observation's `immuneToOpponentDigimonEffects` was false.

The live restriction ledger was correct. `trainingObservation` read the synchronized permanent's public flag, which was refreshed only by a later continuous-effect pass. A player decision paused the effect before that pass; both model observations and the synchronized board could therefore show stale restrictions during the choice.

Reproduce against the original engine with the new regression file:

```sh
pnpm --filter @aegis/api exec vitest run src/bot/training/lowestDpDeletion.test.ts --maxWorkers=1 --no-file-parallelism
```

## Correction and bounded evidence

The GameEngine DecisionManager callback synchronizes public restrictions immediately before forwarding the decision to its external hook. It reads the existing authoritative ledger through `BoardProjection.syncRestrictions`; it does not rerun continuous effects, alter card legality, or expose hidden card identities. The same boundary serves human clients and bot policies.

The eight cases pass with the correction in a clean checkout. They verify immunity in the decision observation and after completion, exact tied candidate identities, exclusion of higher-DP/friendly/Tamer/breeding targets, exact deletion and combat zones, evolution source/draw/cost, and no security check or rejected action. Evolution followed by attack within the same turn must not reopen the shared once-per-turn deletion choice. Opposing Matt Ishida deletion prompts are explicitly declined through the opposing policy.

This proves the reproduced public restriction gap and the named Hinokamuy choice paths. It does not certify every public projection field, immunity expiration boundary, or whole-engine equivalence.

## Desktop verification

The isolated Node 26 checkout `checkouts/bt26-training-v50-decision-projection` passed API typecheck and build. A broader run across training, game-engine, restriction-enforcement, decision, mechanic, and ST23-09 suites passed 830 tests and failed one. The failure is the existing `mechanic.test.ts` BT14-083 source-order assertion (line 462); the same focused test fails in the unchanged `bt26-training-v49-habakirimon-attack` checkout. It is not counted as green evidence. Logs are `lab/v50-decision-projection-tests.log` and `lab/v50-baseline-mechanic.log` on the desktop.

Standards and spec reviews found no blocking issues. The correction publishes restriction fields at the engine decision boundary; these tests do not establish client network-delivery ordering or refresh unrelated derived fields.
