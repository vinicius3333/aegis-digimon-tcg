# Effect-Played Assembly Design

## Problem

The September 19 Assembly correction covered `PlayWithoutCost`, including Wizardmon playing
Aegiochusmon: Dark from trash. It did not cover `PlayMultiple`, which is the action used by
Mervamon, or every other interpreter path that can play a selected Digimon by an effect. As a
result, the same printed Assembly declaration is available or unavailable depending on which IR
action happened to initiate the play.

## Contract

Whenever an effect is about to play one or more Digimon, each selected Digimon with a printed
Assembly requirement may independently use that requirement. The player is offered eligible
materials from their trash, may decline, and must select a complete legal recipe for the reduction
and source placement to apply. Materials cannot also be played by the same batch or reused by a
second Assembly declaration. Materials are placed under the corresponding Digimon before On Play
processing. Free plays still permit Assembly and source placement even though the reduction has no
memory consequence.

The public test seam is the game intent and decision protocol. Tests initiate the source card through
`playCard`, answer the resulting selection prompts, settle the effect stack, and assert only
observable `GameState`: zones, stack identity, memory, and On Play results.

## Design

Extract the existing Assembly preparation loop from `PlayWithoutCost` into a shared interpreter
helper. The helper receives the selected play instances, the candidate pool, and any base per-play
cost deltas. It returns per-play Assembly material assignments and updated per-play deltas. It owns
recipe discovery, trash filtering, complete-recipe validation, optional selection, batch reservation,
and the `assemblyCardId` decision metadata.

Call the helper from every interpreter action that selects ordinary card instances and delegates to
`playInstances`: `PlayMultiple`, all `PlayWithoutCost` branches, and `PlayFromZone`. Specialized
Reveal actions that already implement the same behavior will be migrated to the helper when their
selection context is compatible; otherwise they retain their existing proven preparation and gain a
mechanism regression. Security self-play and token play are excluded because neither can legally
consume a loose trash Assembly recipe at that point.

## Behavioral proof

The tracer regression is Mervamon playing Aegiochusmon: Dark from trash and assembling a legal
level-4 TS material before Aegiochusmon's On Play decision. A refusal case proves the material stays
in trash and the Digimon is still played. Batch tests prove distinct materials are reserved per play
and cannot be reused. Representative `PlayWithoutCost`, `PlayFromZone`, and Reveal regressions guard
the other entry states. Existing focused Assembly and card suites then verify no behavior regresses.

All Vitest commands run with `--maxWorkers=1 --no-file-parallelism`; broader suites and typechecks run
sequentially to keep peak memory bounded.
