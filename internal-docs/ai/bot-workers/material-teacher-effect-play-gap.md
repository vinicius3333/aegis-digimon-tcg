# Effect DigiXros teacher gap: optional free effect play

Base: feature commit `93db25fb50b0900a8ae89d4bdaab205693a13f7a`. Its `apps/api` and `packages` trees are identical to frozen source `1cec011c0`; only operator scripts and docs differ. No tracked source was changed. This note is a handoff for a ROOT decision. It contains no model, remote, or acceptance evidence.

## Finding

The original teacher declines LordKnightmon's free effect play. That refusal is the precursor that keeps effect DigiXros labels out of the corpus.

| Step | Public request | Original teacher |
| --- | --- | --- |
| Digivolve into EX13-064 LordKnightmon | — | — |
| [When Digivolving] "You may play or use 1 … [Knightmon] text card from your hand or trash without paying the cost" | `selectCards`, `min 0`, `max 1`, `timing: "WhenDigivolving"`, no `purpose`, no preceding `optional` prompt | `[]` (declines) |

**Cause.**

1. The compiler merges the play/use Modal into one `PlayWithoutCost` (`modal.ts` `mergedPlayOrUseAction`). That action has `optional: false` and `target.upTo: true, minimum: 0`.
2. `play.ts` therefore asks one up-to-1 pick with no prompt before it. `decisionApi.ts` `backOutPurpose` adds `acceptedOptional` only when it lowers `min` itself, which it does not do here.
3. `policy.ts` `pickInstances` returns `[]` for an own `min 0` pick with no `purpose`.
4. `materialTeacherDecision` handles only requests that already carry `digiXrosCardId`, so it never runs.

**Correction to the actual evidence.** The two actual refusal rows are not equivalent. Fixture: `bagra-effect-play-refusals.actual.json`, SHA256 `24b14f7d…7433ab`.

| Episode | Seat, fold | DeadlyAxemon (DigiXros material) | Effect DigiXros reachable? |
| --- | --- | --- | --- |
| 216 | 0, training | hand `s0-18` | Yes |
| 260 | 1, validation | trash `s1-19` only. The hand holds DarkKnightmon `s1-23`, Rie Kishibe `s1-42` and others, but no material | No |

A synthetic engine probe on the unchanged source confirms this. If the effect play chooses DarkKnightmon while DeadlyAxemon is only in the trash, no DigiXros material picker opens; DarkKnightmon's [On Play] runs directly. Episode 260 is therefore a plain free-play refusal. **There is still no actual seat-1 effect DigiXros precursor.** Fixing the teacher creates the opportunity in both seats, but only new collection can show a seat-1 window.

## Recommendation: external expert decorator, no API change

This route is viable and needs no edit to frozen source. `collect.py --worker` accepts any JS entry.

### Admission rule

`effectPlayCandidates(observation, request)` admits a request only when every check below holds. Otherwise the decorator returns `undefined` and the original teacher answers unchanged. Its inputs are the public request fields and the learner's own seat observation. It reads no prompt or `effectText` and no opponent hidden state.

1. **Request shape.** The request is `selectCards` for the learner's own seat and is the current `pendingDecision`. It has `min 0`, `max 1`, a `timing`, and `isInherited` not true. None of these are set: `purpose`, Assembly or DigiXros fields, cost or DP budgets, distinctness flags, `targetFate`, `selectionContext`.
2. **Source permanent.** `sourcePermanentId` is on the learner's own board.
3. **Compiled effect.** `runtimeCompiledCard(sourceCardId)` has exactly one effect whose `trigger === timing`. That effect is not inherited, linked or security, has no whole-effect `optional` or `cost`, and has exactly one action. That action is a Modal accepted by the engine's own `mergedPlayOrUseAction`: one `PlayWithoutCost` branch plus one `UseOptionWithoutCost` branch.
4. **Merged play action.** It has `upTo: true`, `minimum 0`, `count 1` and `payCost: false`. It has no action cost and no opponent chooser. Its `from` lists only `hand` and/or `trash`.
5. **Candidate pool.** Every offered id is unique and is an own physical card in one of those zones. Each card's single kind is Digimon or Tamer, and its play cost is at or below the printed ceiling. One Option in the pool rejects the whole request, because only the use branch could own an Option.

### Ranking

A candidate with a DigiXros recipe outranks every other free card when the learner's current hand holds a card that fills one recipe slot (`materialsSatisfyRecipe`). Within each tier, the unchanged `scoreCandidate` and `DEFAULT_BOT_PROFILE` decide, using a zero-cost `playDigimon` or `playTamer`. A candidate needs a score above 0. If no candidate qualifies, the original teacher answers.

The physical materials are still labelled by the original `materialTeacherDecision` and its solver proof. The fixed heuristic opponent and the model action space do not change.

### Remaining ambiguity

The rule relies on two things holding:

- **Gained effects.** A gained [When Digivolving] effect reported under the same `sourceCardId`, with an own hand/trash Digimon or Tamer pool and the same `min 0`/`max 1` shape, would pass the request checks. The IR check binds only the printed effect. I found no such case for EX13-064, but the rule cannot rule it out from public fields alone.
- **Text gate.** The candidate check enforces kind, zone, owner and cost ceiling. It does not re-check the `[Knightmon]` text gate; it trusts the engine to offer only legal cards.

Requiring an exact card ID allowlist (EX13-064) would remove the generality risk. ROOT should decide whether to add it.

### Entry and admission implications

`effectPlayExpertCli.local.ts` is the original `cli.ts` with exactly three changes:

1. It imports `createEffectPlayExpertTeacher` instead of `createTrainingTeacher`.
2. It passes that factory to the existing `createTrainingPolicy`.
3. `--describe` adds `expertTeacher: "effectPlayExpert.local"`.

No loader or source transform is used, and the original CLI and helper files are byte-identical.

- **Not the original producer.** This entry must not be treated as the original producer. `engineSha256` is identical because the engine modules are the same. `collect.py` copies only `engineSha256`, so `expertTeacher` does not reach the collected outputs. A ROOT-reviewed operator must declare the entry and decorator pins itself.
- **Separate collection.** Expert-teacher data is a new collection. Do not merge it into the consumed 436-game or 880-game corpora, and do not move validation folds.
- **Wider label shift.** The decorator changes teacher labels on every admitted free play, not only DigiXros routes.
- **Fingerprint mismatch to check.** The local `--describe` of the original `cli.js` built from this tree reports `engineSha256` `cc00dc7c27267cbeeac488d62fc14a796056d4b69b6509545fb4eeb108d9b1f2`. That differs from the qualified runtime fingerprint `9a8d2d5f…` that ROOT reported. ROOT should compare this against its own describe of the frozen worker; I did not recompute that fingerprint.

## Local verification (synthetic only)

All runs used Node 26.10.0 with one Vitest fork per run. Two runs overlapped once, for about 2 seconds.

| Test | Result |
| --- | --- |
| `effectPlayExpert.local.test.ts`, actual fixture windows | Fixture bytes match their pin. Episode 216 is admitted and ranks `s0-22` DarkKnightmon first (hand material `s0-18`). Episode 260 is admitted, and every candidate shows no hand material. |
| `effectPlayExpert.local.test.ts`, live synthetic route, both seats | The original teacher and the fixed opponent both answer `[]`. The decorator picks DarkKnightmon. The original material teacher then labels DeadlyAxemon, and DarkKnightmon enters with DeadlyAxemon under it. |
| `effectPlayExpert.local.test.ts`, delegation, both seats | 14 request variants and an Option-bearing pool all return the original teacher's answer. |
| `effectPlayPrecursor.local.test.ts` | A hand material opens the `digiXrosCardId: EX10-031` picker; a trash-only material does not. |
| Typecheck and smoke | `tsc --noEmit` passes. `tsc --noCheck` builds the entry, and `node …/effectPlayExpertCli.local.js --describe` emits the metadata. |

In total, 11 of 11 tests pass. These are teacher-contract tests only, not primary, model or mastery proof. No full bridge episode was run.

## Fallback: typed purpose (needs new qualified source)

If ROOT rejects the IR route, the general fix is a public `purpose: "effectPlay"` set around the `play.ts` effect-play pick, plus a teacher branch. The full diff is in commit `4c3a228d1` of this branch and in the ignored patch below. With that patch: focused suites 82 files / 1,830 tests pass, and `FAST=1` `src/engine` + `src/bot` 542 files / 10,145 tests pass. This changes source and engine bytes, so it needs a new qualified source. It was not built or pushed.

## Ignored local files (not committed)

Worktree root: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-effect-digixros-teacher-fix`. All files below are excluded through `.git/info/exclude`.

| Path | SHA256 |
| --- | --- |
| `apps/api/src/bot/training/effectPlayExpert.local.ts` | `2eab5e6b13b21d7a71c769b3c8f615fb31f33fbc06506d284c151ee06346d7b9` |
| `apps/api/src/bot/training/effectPlayExpert.local.test.ts` | `2fa40f30c48b0594a623fbb6d76d52d0f62f8203f4ef29dcf8f2617c559eaf53` |
| `apps/api/src/bot/training/effectPlayExpertCli.local.ts` | `d5ea3d3f02804c1a04ffc37f3fcd458d3d8eaa0e42a44242b45f662456ea324e` |
| `apps/api/src/bot/training/effectPlayPrecursor.local.test.ts` | `5d7a2deaf997ab0e65396df60a5afe5d1c6d3aea5e90a664c2beae82ab35275e` |
| `internal-docs/ai/bot-workers/material-teacher-effect-play-gap.patch` (fallback) | `d03395998636dfc6ae9839e369a3b16f7052756ae6788746d06681e34305eb5b` |
| `internal-docs/ai/bot-workers/material-teacher-effect-play-gap.guard.test.ts` (fallback guard; typechecks only with the patch) | `48fd48aad13f93d529eb94a6276e61570d804b592c63808540b867019050f126` |

These original files are unchanged: `cli.ts` `2140c324…2a96` and `referencePolicy.ts` `c47278f1…157e`.
