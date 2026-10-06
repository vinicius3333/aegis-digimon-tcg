# Effect prompt layout mapping

Implementation scope: [#5013](https://github.com/vinicius3333/aegis-digimon-tcg/issues/5013), [#5018](https://github.com/vinicius3333/aegis-digimon-tcg/issues/5018), and the October 6 request to standardize every match effect prompt, simplify the choices, and evaluate the result in the Orca browser.

The canonical visual contract is `apps/web/src/design/DESIGN.md`. Prompts use the existing semantic Aegis surface, foreground, border, accent and focus tokens. Gameplay colors remain card identity. The decision must be recognizable through position, text, selected state and the available action; color alone never communicates legality.

## Two destinations

- **Left:** accepting or declining an effect, choosing a printed clause, confirming an already selected action, and choosing the price of an already selected evolution. Artwork explains the action and does not create another card selection step.
- **Center:** selecting, ordering or comparing cards, targets, hosts, materials, counter sources, and pending effect cards from the field, trash, security, digivolution stack or multiple zones.
- **Hand-only follow-up:** `selectCards` and `chooseTargets` whose complete visible and selectable sets consist of actual instances in the viewer's hand use the existing hand highlight and selection state, with instructions and confirmation on the left. No duplicate card gallery appears. Unknown or revealed-only identities, mixed zones, card ordering and special decisions retain the central gallery. The authoritative candidates, count limits, budgets and callback identities remain unchanged.

Prompt geometry remains consistent for each interaction type; pure-hand selections keep the physical hand available. On narrow screens the same component adapts to the available space, with readable content and reachable actions. Viewing the board temporarily hides the prompt while preserving its selection and offers an explicit return action.

## Reproducible gallery

`/dev/effect-prompts?case=<case>` is a development-only route with 43 scenarios. It renders an actual `GameScreen` arena behind actual production prompt components. Append `&controls=0` for a full-screen arena without the development toolbar. The hand-only cases pass server-shaped requests with real hand instance IDs through `GameScreen`; all other cases retain their isolated production-component fixtures. Exactly one prompt fixture is active; submitting an action shows its intent, and Replay opens a fresh fixture. The toolbar switches English/Portuguese and light/dark themes. Case labels are development tooling; player-facing prompt copy comes from production translations and the committed card catalog.

| Case                  | Production component / decision                                       | Destination   | Validation interaction                                       |
| --------------------- | --------------------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `optional-field`      | `BoardOptionalPrompt` via `DecisionPrompts`                           | Left          | Accept, decline, open dialog                                 |
| `optional-hidden`     | `DecisionOverlay`, `optional`                                         | Left          | Accept, decline, view board / return                         |
| `choose-yes-no`       | `DecisionOverlay`, `chooseOption`, decline index                      | Left          | Choose use or decline                                        |
| `choose-clauses`      | `DecisionClauseChoice`                                                | Left          | Choose a printed bullet or decline                           |
| `choose-effects`      | `DecisionEffectChoice`                                                | Center        | Compare card effects, choose one                             |
| `choose-revealed`     | `DecisionChoiceCards` + `DecisionChooseFooter`                        | Left          | Review revealed context, choose top/bottom                   |
| `select-hand`         | `GameScreen` hand highlights + `BoardSelectionRail`, `selectCards`    | Hand + left   | Select eligible subset; excluded hand cards remain disabled  |
| `choose-targets-hand` | `GameScreen` hand highlights + `BoardSelectionRail`, `chooseTargets`  | Hand + left   | Select optional hand targets, confirm, choose none           |
| `select-field`        | `DecisionCandidateGrid`, `chooseTargets`                              | Center        | Toggle targets, read live DP / stack badges                  |
| `select-mixed`        | `DecisionCandidateGrid`, mixed zones                                  | Center        | Compare cards across zones, confirm                          |
| `select-player`       | `DecisionCandidateGrid`, abstract player target                       | Center        | Select player target, confirm                                |
| `select-dp-budget`    | `DecisionCandidateGrid`, maximum total DP                             | Center        | Reach budget, see disabled confirmation                      |
| `select-cost-budget`  | `GameScreen` hand highlights + `BoardSelectionRail`, play cost budget | Hand + left   | Select within cost 7; over-budget hand cards stay disabled   |
| `select-empty`        | `DecisionCandidateGrid`, empty optional selection                     | Center        | Empty state, choose none                                     |
| `order-cards`         | `DecisionOrderCardsPanel`                                             | Center        | Move cards up/down, confirm order                            |
| `order-triggers`      | `DecisionTriggerChooser`, next trigger                                | Center        | Choose the next effect                                       |
| `order-same-card`     | `DecisionTriggerChooser`, same permanent                              | Center        | Distinguish timings of the same card                         |
| `resolution-plan`     | `DecisionTriggerChooser`, complete resolution plan                    | Center        | Reorder, set optional presets, inspect older waiting effects |
| `partition`           | `DecisionOptionalFooter`, partition activation                        | Left          | Accept / decline while viewing contextual card               |
| `confirm-action`      | `ActionConfirmationOverlay`                                           | Left          | Confirm / cancel, view board / return                        |
| `dual-play`           | `DualPlayChoiceOverlay`                                               | Left          | Confirm Option use / cancel                                  |
| `evo-cost`            | `EvoCostChoiceOverlay`                                                | Left          | Choose numeric cost, review memory outcome                   |
| `effect-evo-cost`     | `DecisionDigivolveCostChoice`                                         | Left          | Choose an effect-adjusted evolution cost                     |
| `assembly`            | `AssemblyMaterialOverlay`                                             | Center        | Select legal trash materials, confirm / normal play / cancel |
| `digixros`            | `DigiXrosMaterialOverlay`                                             | Left → center | Answer expander, select hand/field/under-Tamer materials     |
| `digixros-expander`   | `DigiXrosExpanderPrompt`                                              | Left          | Reserve / decline Tamer effect                               |
| `app-fusion`          | `AppFusionChoiceOverlay` in `CardPromptFrame`                         | Center        | Choose linked material, confirm / normal evolution / cancel  |
| `app-fusion-empty`    | `AppFusionChoiceOverlay` in `CardPromptFrame`, stale/empty routes     | Center        | Disabled confirm, recovery controls                          |
| `block`               | `BlockOverlay`                                                        | Center        | Choose blocker / decline                                     |
| `collision-empty`     | `BlockOverlay`, no eligible blockers                                  | Left          | Take attack remains available after blockers disappear       |
| `collision`           | `BlockOverlay`, mandatory block                                       | Center        | Choose blocker; cannot decline mandatory block               |
| `alliance`            | `AllianceOverlay`                                                     | Center        | Choose ally / pass                                           |
| `alliance-empty`      | `AllianceOverlay`, empty allies                                       | Left          | Pass remains available when no eligible ally remains         |
| `counter-sources`     | `CounterOverlay`, source selection                                    | Center        | Select hand or field source; back / pass                     |
| `counter-blast`       | `CounterOverlay`, multiple Blast routes                               | Center        | Choose a server-provided host route                          |
| `counter-empty`       | `CounterOverlay`, empty offers                                        | Left          | Pass remains available with no legal action                  |
| `counter-field`       | `CounterOverlay`, single field activation                             | Left          | Activate / pass                                              |
| `barrier`             | `BarrierOverlay`                                                      | Left          | Use / decline                                                |
| `evade`               | `EvadeOverlay`                                                        | Left          | Use / decline                                                |
| `source-host`         | `DecisionPrompts`, host step then source cards                        | Center        | Choose host, select source, change host                      |
| `mulligan-first`      | `MulliganOverlay`, first player                                       | Center        | Keep / mulligan, view board / return                         |
| `mulligan-second`     | `MulliganOverlay`, second player                                      | Center        | Keep / mulligan, verify turn-order copy                      |
| `inherited-inspector` | `ArenaPermanentInspector`                                             | Inspector     | Inspect full inherited clauses, zoom / close                 |

`digixros` is a two-step fixture: the initial Tamer activation is a simple action on the left; after accepting or declining that activation, the material selector appears in the center. Validate each step separately rather than classifying its initial activation as card selection.

### Related surfaces

`OpponentSelectingPill` is passive waiting information, never another interactive prompt. `DecisionBoardReturn` and `useBoardPreview` are continuations of the current decision; returning must preserve it. `BoardSelectionRail` provides the left instruction/confirmation panel for pure-hand match selections; eligible cards are selected directly from the hand. Other card-picking match decisions route through the central gallery. The arena inspector is a read-only detail view with existing positional behavior, so it is not classified as an effect choice. Trash, stack and full-card viewers remain inspection surfaces. Waiting, disconnect and game-over panels are match lifecycle surfaces rather than effect prompts.

The three production entry points that must follow this mapping are `DecisionPrompts`, `PlayChoicePrompts` and `CombatWindowPrompts`. The authoritative `DecisionRequest` and server combat windows remain responsible for legality, mandatory actions and offered identities.

## Browser validation checklist

Use the Orca browser through the Orca CLI. The gallery's `case` query makes each observation repeatable without a live multiplayer match.

1. Open each table row at desktop width. Confirm that simple actions dock left and card-picking/ordering surfaces appear in the center, with one dominant title, one readable effect clause, and a clear primary action. For pure-hand fixtures, verify highlights on the physical hand and the left rail rather than a duplicate central gallery.
2. Exercise each validation interaction. Observe the returned intent. Replay between independent submissions. For multi-step prompts verify Back, Change host, view board / return, and preserved selections before confirmation.
3. Repeat representative left, center, material, resolution-plan, mulligan and inspector cases at a narrow phone width and a landscape phone height. Inspect clipping, scrolling and reachability of the last action.
4. Repeat representative cases in light and dark themes, English and Portuguese. Read the full effect passage and the final action label. Confirm that contrast and focus use the semantic theme values.
5. Test keyboard entry, Tab and Shift+Tab, initial focus, focus containment where modal, explicit cancel, and focus return after viewing the board. Required decisions must keep their required action.
6. Verify long effect clauses, several candidate cards, mixed zones, disabled candidates, budgets, zero candidates, stale App Fusion routes, and mandatory Collision.
7. Enable reduced motion and verify that every decision is still visible, understandable and usable.
8. Capture the final Orca browser observations and automated check results in the change review. Do not store screenshots or audit reports under `docs/audits`.

## Original October 6 verified result

The measurements below describe the original 42-case layout overhaul before the hand-only follow-up.

The coordinator used the Orca browser through the Orca CLI against the local Vite preview. All 42 cases passed panel placement, viewport bounds and horizontal overflow checks at 1440×900, 1024×768, 768×1024, 390×844, 320×740 and 844×390: **252 successful checks**. Screenshots of action, card, material, resolution-plan, mulligan and inherited-inspector surfaces were inspected. Mixed-zone selections show compact labeled columns rather than one long section per card.

Interactive verification used the production callbacks: optional accept/decline, two-card confirmation, Source Host → source selection → Change Host, Counter source → Blast route → Back, Assembly materials and AppFusion linked materials. Viewing the board and returning preserved the active selections. Keyboard checks covered both destinations and AppFusion radios. Representative phone checks also covered English, dark theme and reduced motion; desktop checks covered Portuguese and light theme.

Validation commands:

- `pnpm --filter @aegis/web build` and `pnpm --filter @aegis/web typecheck` passed.
- `pnpm --filter @aegis/web exec vitest run --exclude test/pacing/pacing.budget.test.ts` passed: 289 files, 2,856 tests, one skipped.
- The latest six-file prompt/accessibility run passed all 127 tests after the left-dialog keyboard changes. Earlier focused runs included server-backed material, reconnect, forced-attack and selection-budget scenarios.
- Modified-file lint, formatting and `git diff --check` passed. Independent code review found no remaining important defects.

The unchanged pacing budget suite was run separately and reproduced its six existing baseline failures with identical measurements; its budgets were preserved. Those measurements and the original failing baseline were compared without changing the animation pipeline, engine or pacing fixtures.

## Hand-only follow-up verification

The gallery now exercises the real arena decision pipeline for three hand-only cases. Orca interaction verified that the eligible subset receives highlights, excluded hand cards cannot be picked, and confirming two highlighted cards returns their exact instance IDs (`hand-0`, `hand-4`) in a `selectCards` response. The optional `chooseTargets` case returned an empty `instanceIds` list through its explicit no-selection action. Keyboard focus and Enter selected Buraimon in the cost-budget case; the live total became 5 / 7, and candidates costing more than the remaining two were disabled while Fire Rocket stayed eligible.

All 43 fixtures passed placement, viewport bounds and horizontal overflow checks across the same six viewports: **258 successful checks**. The three live-hand fixtures also passed hand-clearance and budget-text overlap checks. The phone inspector initially measured outside the viewport during its entrance animation; a settled recheck at 1,000 ms confirmed its bottom at exactly 844 px. Eligible hand cards use the existing cyan rim, selected cards use gold with an ordinal badge, and excluded cards are darkened and disabled.

The focused regression run passed **15 files and 191 tests**, including server-backed Yuuki, Assembly, reconnection, selection budgets and touch selection. Production build, TypeScript, modified-file lint, formatting and `git diff --check` passed. Independent review found no remaining important defects. A regression test exposed selections persisting across different decision IDs; the fix clears picks for each new decision while preserving them across reconnection to the same decision.
