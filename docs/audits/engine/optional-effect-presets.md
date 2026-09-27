# Optional effect preset regression coverage

## Scope

Verify saved Yes/No answers across watcher families after forwarding the resolution
context's `presetOptionalAnswer` in `armedAsPendingCollected`. This is focused engine
regression evidence, not a full-card audit or a change to collection scores.

The original reproducer is Rika Nonaka (EX2-060) sharing Sakuyamon's attack window.
`optionalEffectPresets.test.ts` verifies Yes, Yes to all, No, and Ask, including the
remaining Plug-In card selection. `rikaOptionalEffectPresetsScenario.test.ts` exercises
the same choices through `/dev/arena?scenario=arena-rika-optional-effect-presets`.

## Additional cards

Contract sources: committed `packages/shared/src/cards/data/cards.json`, direct compiled
card modules, and `node tools/kb/query.mjs card <ID>` for each card below.

`optionalEffectPresetCards.test.ts` runs Yes for both copies, No for both copies, and
No for the first / Yes for the second:

| Card                                  | Clause and verified outcome                                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BT8-088 Davis Motomiya & Ken Ichijoji | Optional suspension after a multicolor digivolution. The chosen Tamers pay the suspension cost; the evolved Digimon unsuspends when accepted. Copies retain independent answers alongside the evolved card's printed trigger.                             |
| BT16-082 Ukkomon                      | Moving from breeding triggers both copies. Both mandatory reveals still add a card even with No; only the optional hatch is skipped. Card selection remains visible. Q2669 places resolution in breeding, before Main.                                    |
| BT23-072 King Drasil_7D6              | Playing a CS Digimon triggers both copies. Only accepted copies suspend; the played card receives Rush, Raid, Reboot, and Blocker when at least one accepts. Q5347 confirms the watcher also applies to its own play, covered by the existing card suite. |

Each new case also asserts one order prompt and no repeated optional confirmation.
No additional production change was needed for these scenarios.

## Validation

```sh
pnpm --filter @aegis/api exec vitest run \
  src/engine/optionalEffectPresetCards.test.ts \
  src/engine/optionalEffectPresets.test.ts \
  src/engine/rikaOptionalEffectPresetsScenario.test.ts \
  src/engine/decisions/resolutionPlan.test.ts \
  src/engine/gateDeadlySinsEffectOrderScenario.test.ts \
  src/cards/BT8/BT8-088.test.ts \
  src/cards/BT16/BT16-082.test.ts \
  src/cards/BT23/BT23-072.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

Result: 51 tests passed across 8 files, including 9 new comparative cases.

## Correction: simultaneous discard is one trigger

The earlier LadyDevimon/Matt example was invalid. CR 15-5-2 says one trigger
condition triggers once when satisfied multiple times simultaneously; CR 3-1-3-3
moves cards leaving an area together simultaneously. LadyDevimon BT3-088's
"trash 2 cards" is one such action. The previous two-activation assertions are
withdrawn and replaced, not retained as evidence of correct game behavior.

ST16-14 now uses the existing `whenHandTrashed` event (one event per hand per
trash action), instead of `whenTrashedFromHand` (per-card identity notifications).
This preserves its own-hand and own-effect gates and self-suspension cost.
Registration remains exclusively `registerIrCard`.

- `ST16-14.test.ts`: LadyDevimon's simultaneous discard asks once on both acceptance
  and refusal, with no ordering prompt; two physical Matts each trigger once; two
  separate discard actions can ask again after refusal.
- `optionalEffectPresetScenarios.test.ts`: the live Matt scenario now requires one
  confirmation, no duplicate ordering panel, and memory 8 when accepted / 7 when
  declined. The historical URL remains valid and its instructions are corrected.
- `repeatedOptionalPresets.test.ts`: explicitly models three separate discard
  actions through the bus seam. It no longer presents one simultaneous discard as
  evidence for repeated activations.
- `decisions/resolutionPlan.test.ts`: retains mechanism tests for independently
  identified occurrences, reconstructed keys, fresh later occurrences, and shared
  once-per-turn limits. These tests do not claim that simultaneous discarded cards
  produce separate triggers.

The Rika, Davis & Ken, Ukkomon, and King Drasil scenarios retain their independent
card-copy coverage. This remains focused engine evidence, not a catalog-wide audit.

Validation for this correction: 270 tests passed across 38 files, covering the ST16
collection, LadyDevimon, decisions, stack/subtrigger mechanisms, optional presets,
arena scenarios, pending-trigger conformance, and audit-document layout. API and web
typechecks and changed-source lint passed. The browser smoke check confirmed the
corrected Matt instructions and a live match reaching breeding with no page errors;
acceptance/refusal resolution is covered by the engine-driven arena tests above.
