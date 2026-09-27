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

## Repeated watcher occurrences

Reproduced with LadyDevimon BT3-088 discarding two cards after digivolving from Devimon
ST6-08, with one Matt Ishida ST16-14 in play. Before the fix, No for the first activation
and Yes for the second left Matt unsuspended and memory at 7 instead of 8. The second
occurrence's preset was addressed by a suffixed prompt key, but execution used the base
key and the stack retired both occurrences as one effect.

`CollectedEffect.activationIdentity` now carries the armed event occurrence.
`ResolutionPlan.keyFor` preserves its key across reconstructed collected wrappers;
ordering, optional answers, and the stack's retirement bookkeeping use that same key.
The plan is still local to a timing window. Once-per-turn ledgers remain unchanged.

Proof:

- `repeatedOptionalPresets.test.ts`: the public LadyDevimon digivolution with both
  orders, plus three deferred Matt occurrences resolved middle-first through the
  watcher-only path.
- `decisions/resolutionPlan.test.ts`: stable reconstructed keys, fresh unanswered
  later occurrences, three occurrences resolved middle-first, and preserved shared
  once-per-turn limits.
- `optionalEffectPresetScenarios.test.ts`: live Davis & Ken, Ukkomon, King Drasil,
  and repeated Matt scenarios with Yes, No, Ask, mixed answers, and reverse order.
- `rikaOptionalEffectPresetsScenario.test.ts`: the original live Rika scenario.

The five numbered arena scenarios and bilingual steps are listed in
`docs/effect-resolution-plan.md`. No card module or registration was changed.

Expanded validation: 218 tests passed across 19 files, covering decisions, the stack,
subtriggers, optional once-per-turn behavior, rule-check pools, attack ordering, pending
trigger interactions, and the live scenarios:

```sh
pnpm --filter @aegis/api exec vitest run \
  src/engine/decisions \
  src/engine/effects/stack.test.ts src/engine/effects/subtriggers.test.ts \
  src/engine/subTriggerOptionalOncePerTurn.test.ts src/engine/subTriggerSeams.test.ts \
  src/engine/ruleCheckPool.test.ts src/engine/attackTriggerOrdering.test.ts \
  src/engine/optionalEffectPresets.test.ts src/engine/optionalEffectPresetCards.test.ts \
  src/engine/repeatedOptionalPresets.test.ts src/engine/optionalEffectPresetScenarios.test.ts \
  src/engine/rikaOptionalEffectPresetsScenario.test.ts \
  src/engine/gateDeadlySinsEffectOrderScenario.test.ts \
  src/engine/conformance/interaction-pending-trigger-matrix.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

Another 15 tests passed in `audit-docs.test.ts`, `ST16-14.test.ts`, `BT3-088.test.ts`,
and `endOfTurnOrderingSites.test.ts`. API and web typechecks, targeted lint, and
`git diff --check` passed. Playwright opened each of the five live arena URLs, verified
the selected scenario and breeding controls, and observed no page errors. Full effect
resolution is covered by the engine-driven live scenario tests above.

This remains focused engine evidence, not an exhaustive audit of the entire catalog
or separately conferred effect copies.
