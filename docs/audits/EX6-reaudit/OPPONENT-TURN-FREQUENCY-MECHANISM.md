# Opponent-turn frequency reset — EX6-052

## Seam

EX6-052's inherited `[Opponent's Turn][Once Per Turn]` watcher listens for an opponent Digimon deletion and may play one Purple level-4-or-lower Digimon from trash. The frequency belongs to the inherited source copy and must reject later matching deletions during that same opponent turn, then re-arm when the next opponent turn begins.

The shared implementation is the `UseTracker` subtrigger ledger. The turn machine calls `clearDurations("ownerTurnStart")` at every real Active phase; `GameEngine` resets that ledger there, before the turn's timing windows and public effect verbs run.

## Red → green evidence

The card lane originally carried the unresolved seam as a named skipped test: `resets the inherited revival on the next opponent turn (engine turn-boundary seam)`.

The restored test drives the production `runOneTurn()` loop for the first opponent turn, deletes two opposing Digimon through the effect-driven public verb, completes a full owner turn, and drives the next opponent turn. The first deletion revives one Purple level-4 Digimon, the second same-turn deletion is refused, and a deletion on the next opponent turn revives the remaining Purple level-4 Digimon.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-052.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 7 tests

pnpm --filter @aegis/api exec vitest run src/engine/opponentTurnFrequency.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 1 test
```

The red diagnostic removed `this.tracker.resetForNewTurn()` from the `ownerTurnStart` hook. Both focused tests then failed at the next-opponent-turn revival assertion. Restoring that production line returned both tests to green.

## Scope decision

No production engine behavior required correction: the existing `ownerTurnStart` reset already follows the real turn machine and the restored behavioral proof is green. The delivered change closes the stale skipped seam with a card-level turn-loop assertion, a reusable engine regression, and this mechanism record.
