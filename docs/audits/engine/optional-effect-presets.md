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

## Remaining coverage boundary

Different physical copies are covered. Multiple pending activations of the **same
effect on the same physical card** are not equivalent: the existing limitation in
`docs/effect-resolution-plan.md` assigns `/activation-N` prompt keys while preset
lookup still uses the base key. This verification does not resolve or claim behavioral
coverage of that limitation, nor does it exhaustively test the full card catalog.
