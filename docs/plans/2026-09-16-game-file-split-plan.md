# Split the four oversized files in `apps/web/src/game`

Branch: `worktree-game-file-split` · Worktree: `.claude/worktrees/game-file-split`

Orchestrated plan: Sonnet subagents do the extraction; the session manages,
integrates, and owns every commit.

## Scope

| File              | Lines | Comment lines | Shape                                                           |
| ----------------- | ----- | ------------- | --------------------------------------------------------------- |
| `useMatchCues.ts` | 3612  | 864 (24%)     | one ~3100-line hook; `presentBatch` is ~1300 of it              |
| `GameScreen.tsx`  | 4185  | 265 (6%)      | one ~3480-line component + 4 smaller ones                       |
| `overlays.tsx`    | ~3900 | —             | 29 exports: 17 components + 8 pure text functions + 4 constants |
| `boardPieces.tsx` | ~1600 | —             | 17 exports: 13 components + 3 constants + 1 pure function       |

Mirror tests: `useMatchCues.test.ts` (~4400), `decisionOverlay.test.tsx` (~3200).

Exit targets: no source file over 400 lines, no function over 120 lines, no
component over 250 lines, every folder matching the pattern below.

Comment density is judged per file, not capped at a number. An earlier flat 8%
target was wrong: `overlay/effectText.ts` is legitimately 25% comment because its
job is encoding per-card exceptions to the printed-clause rules (AD1-001,
EX3-026, EX3-054, BT26-016, BT16-101/EX12-019), and that reasoning is recorded
nowhere else. The binding rule is rule 2 below — no comment restates the code —
not an arithmetic target.

Out of scope: `game.css` and every class name — the Tailwind migration owns those
on `worktree-tailwind-migration`.

---

## Conventions

This is the normative pattern. Every agent gets it verbatim, and it applies to
files this plan creates _and_ files it moves.

### `.ts` vs `.tsx`

A file is `.tsx` **only** if it contains JSX. A file with no JSX is `.ts`, even
when it lives beside components and imports React types.

This is the rule `overlays.tsx` breaks worst: `effectClauseForTiming`,
`cardEffectClauseForTiming`, `printedTimingLabel`, `resolvedEffectClause`,
`playerFacingPromptText`, `playerFacingEffectClause`, `TIMING_LABELS`,
`SUPPORTED_COMBAT_PROMPTS` and `SUPPORTED_DECISION_KINDS` are pure and belong in
`.ts`. Same for `shieldShards` and `handOverlap` in `boardPieces.tsx`.

### File names

| Kind       | Name                                                                         | Example                  |
| ---------- | ---------------------------------------------------------------------------- | ------------------------ |
| Component  | `PascalCase.tsx`, one component per file, named export matching the filename | `BlockOverlay.tsx`       |
| Hook       | `useCamelCase.ts`                                                            | `useArenaLayout.ts`      |
| Pure logic | `camelCase.ts`, named after what it returns                                  | `memoryPreviewInputs.ts` |
| Types      | `types.ts`, one per folder                                                   | `match/types.ts`         |
| Enums      | `enums.ts`, one per folder                                                   | `screen/enums.ts`        |
| Constants  | `constants.ts`, one per folder                                               | `match/constants.ts`     |
| Barrel     | `index.ts`, re-exports only, no logic                                        | `match/index.ts`         |
| Test       | `<subject>.test.ts` / `.test.tsx`, colocated                                 | `batchFacts.test.ts`     |
| Styles     | `<folder>.css` at the folder root                                            | `overlays/overlays.css`  |

No default exports. No file exporting more than one component. No `utils.ts`,
`helpers.ts`, `common.ts`, `misc.ts` — a name that does not say what is inside is
not a name.

### Folder names

`camelCase`, singular, named for the domain concept, not the technical layer.
`security/`, not `securityUtils/`. `present/`, not `presentation-helpers/`.

### Folder shape

Every feature folder has the same five slots. Missing slots are simply absent —
never empty files.

```
<feature>/
  index.ts          barrel
  types.ts          the shapes
  enums.ts          the closed sets
  constants.ts      the fixed values
  <modules>         components / hooks / pure logic, per the naming table
  <subfolders>      only when a sub-area has 4+ files of its own
```

Depth is capped at three under `game/` (`game/screen/overlays/BlockOverlay.tsx`).
A fourth level means the area wanted to be its own feature folder.

### Import direction

`index.ts` barrels are for consumers outside the folder. Inside a folder, modules
import each other by file path, never through their own barrel — that is how
cycles get in.

Allowed direction: `layout/` and `overlays/` may import `model/`, `hooks/`,
`types.ts` and `enums.ts`. Nothing in `model/` may import a component or a hook.

---

## The four rules every agent gets

**1. No behavior change.** Moving code, renaming a binding, and deleting a
comment are allowed. Changing an order, a condition, a default, or a dependency
array is not. Anything that looks like a bug is reported, not fixed.

**2. Comments.** Delete a comment when it restates the code beneath it. Keep a
comment that explains _why_ an ordering, a hold, a baseline read, or a
deliberate exclusion exists — and lift it to the new module's header, where it
now covers the whole file. Where three call sites repeat one rule, the rule is
stated once in the header and the call sites say nothing.

A lifted comment is **rewritten, not relocated**. Comments in these files encode
their own position — "the overlays above dispatch on", "DecisionOverlay below
branches on" — and those claims turn false the moment the code moves. Name the
file or the symbol instead. Net comment lines must go down or stay flat; a new
module header that merely adds to the per-function docs it was supposed to
absorb is a failed extraction.

`useMatchCues.ts` is 24% comment because the same ordering rules are re-explained
at each site. That is where most of the reduction comes from; the prose itself is
good and must survive at module level.

**3. Pure by default.** An extracted function takes its inputs as one object
parameter and returns a value. No `useState`, no `useRef`, no module-level
mutable state, no reading `document` or `window` outside `environment.ts`. When
a function genuinely needs React, it is a named hook in `hooks/` and says so.

**4. Types and enums move out of the implementation file**, into the folder's
`types.ts` and `enums.ts`.

### Enums

House style is a string-valued `export enum` (`packages/shared/src/schema/enums.ts`).
Replace these inline unions:

| Inline union today                   | Becomes                                          |
| ------------------------------------ | ------------------------------------------------ |
| `"you" \| "opp"` (5 sites)           | `enum Side { Viewer = "you", Opponent = "opp" }` |
| `"arm" \| "break"`                   | `enum SecurityBreakPhase`                        |
| `"up" \| "down"`                     | `enum LungeDirection`                            |
| `"pending" \| "done"`                | `enum OpeningDealState`                          |
| `"win" \| "loss" \| "draw"`          | `enum MatchOutcome`                              |
| `"board" \| "dialog"`                | `enum DecisionSurface`                           |
| `DragState.kind: "play" \| "attack"` | `enum DragKind`                                  |
| `DropTarget` (`dragIntents.ts`)      | `enum DropTarget`                                |
| track id string constants            | `enum CueTrack`                                  |

`Side` lands **last**, not first. Measurement killed the original wave-0 plan:
`"you" | "opp"` spans ~30 files and ~200 literal sites, most of them in tests
outside the four files in scope, and a string enum is not assignable from a bare
`"you"`. Introducing it up front would have meant a 30-file diff colliding with
every later wave. Once the giants are decomposed it is a cheap sweep over many
small files.

`PrintedTiming` is dropped. `TIMING_LABELS` is keyed by two external vocabularies
at once — the shared `EffectTiming` enum keys and the IR trigger names, mapped
many-to-one — so an enum there would duplicate `EffectTiming`. It stays
`Record<string, string>`.

### Naming

Renames happen as code moves, never as a separate pass.

| Now                                     | Becomes                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `selPerm`                               | `selectedAttackerPermanentId`                                     |
| `handSel`                               | `selectedHandInstanceId`                                          |
| `selEntry` / `selCardId` / `selDef`     | `selectedHandEntry` / `selectedCardId` / `selectedCardDefinition` |
| `clearSel`                              | `clearSelection`                                                  |
| `you` / `opp`                           | `viewer` / `opponent`                                             |
| `presentedYouBase` / `presentedOppBase` | `presentedViewer` / `presentedOpponent`                           |
| `shownYou` / `shownOpp` / `shownHand`   | `displayedViewer` / `displayedOpponent` / `displayedHand`         |
| `ping`                                  | `showTransientNotice`                                             |
| `fresh` (in `presentBatch`)             | `batchEvents`                                                     |
| `blockWindowRaw` and siblings           | `projectedBlockWindow` and siblings                               |
| `permId` (in `DragState`)               | `permanentId`                                                     |
| `shieldShards`                          | `buildShieldShards` (it returns data, not JSX)                    |

---

## Target layout

```
game/match/                          (was useMatchCues.ts)
  index.ts  types.ts  enums.ts  constants.ts
  tracks.ts            BOARD_HOLDING_TRACKS, holdsTheBoard            [pure]
  environment.ts       prefersReducedMotion, isTouchLayout, documentHidden, liveMode
  eventLookup.ts       lastIndexOfKind, hasTurnStartDraw, segment helpers [pure]
  cardSiteIndex.ts     buildCardSiteIndex                             [pure]
  useMatchCues.ts      composition only
  state/               useCueState.ts, useCueRefs.ts
  queue/               usePresentationQueue.ts, useDecisionBarrier.ts, usePhaseOrder.ts
  narration/           useNarrationStream.ts, presentableNarration.ts  [pure]
  security/            useSecurityHold.ts, revealScene.ts, destructions.ts, deal.ts
  steps/               shieldBreakStep.ts, deleteBurstStep.ts,
                       deckRiffleStep.ts, zoneChangeStep.ts
  flights/             useCueFlights.ts
  present/             presentBatch.ts, segments.ts [pure], batchFacts.ts [pure],
                       combat.ts, arrivals.ts, deletions.ts, sounds.ts
  watchers/            useDpPulses.ts, useRestrictionPulses.ts,
                       useDrawWatcher.ts, useSecurityCountWatcher.ts

game/screen/                         (was GameScreen.tsx)
  index.ts  types.ts  enums.ts  queries.ts
  GameScreen.tsx       gates + composition
  model/               dropZones.ts, presentedBoard.ts, actionGuards.ts,
                       decisionPicks.ts, memoryPreviewInputs.ts, eligibility.ts,
                       spotlightIds.ts, stackCards.ts, gameOutcome.ts,
                       handEntries.ts                                 [all pure]
  hooks/               useArenaLayout.ts, useBoardMeasurements.ts,
                       useTrackingArrow.ts, useDragPlumbing.ts,
                       useSelectionState.ts, useMatchIntents.ts,
                       useCombatWindows.ts
  layout/              BoardShell.tsx, OpponentBar.tsx, FieldColumns.tsx,
                       BottomStrip.tsx, ActionBar.tsx, Sidebar.tsx,
                       HandCardPreview.tsx, ArrowLayer.tsx, DragIntentLabel.tsx

game/overlay/                        (was overlays.tsx)
  index.ts  types.ts  enums.ts  constants.ts
  effectText.ts        effectClauseForTiming, cardEffectClauseForTiming,
                       printedTimingLabel, resolvedEffectClause,
                       playerFacingPromptText, playerFacingEffectClause  [pure, .ts]
  combat/              BlockOverlay.tsx, CounterOverlay.tsx, AllianceOverlay.tsx,
                       EvadeOverlay.tsx, BarrierOverlay.tsx
  choice/              DualPlayChoiceOverlay.tsx, ActionConfirmationOverlay.tsx,
                       EvoCostChoiceOverlay.tsx, DigiXrosMaterialOverlay.tsx,
                       AssemblyMaterialOverlay.tsx, DecisionOverlay.tsx
  viewer/              CardZoomOverlay.tsx, StackViewerOverlay.tsx,
                       TrashViewerOverlay.tsx, PrintedCardInfo.tsx,
                       PermanentDetailInspector.tsx, CardActionMenu.tsx
  match/               MulliganOverlay.tsx, WaitingOverlay.tsx, GameOverOverlay.tsx

game/piece/                          (was boardPieces.tsx)
  index.ts  types.ts  constants.ts    HAND_CARD_WIDTH, HAND_CARD_WIDTH_COMPACT,
                                      HAND_MIN_EXPOSURE_TOUCH
  handLayout.ts        handOverlap                                    [pure, .ts]
  shieldShards.ts      buildShieldShards                              [pure, .ts]
  Pile.tsx  Hand.tsx  PermanentView.tsx  BreedingSlot.tsx
  MemoryGauge.tsx  MemoryArc.tsx  MemoryPredictionArc.tsx
  TurnControl.tsx  AttackArrow.tsx  BoardInputLock.tsx
  ClawSlash.tsx  DpPulseParticles.tsx
```

`game/useMatchCues.ts`, `game/GameScreen.tsx`, `game/overlays.tsx` and
`game/boardPieces.tsx` become re-export barrels until the last wave, so none of
the import sites move mid-flight.

### The `presentBatch` contract

`presentBatch` reads and writes ~25 refs inline. Extraction passes one context
built per batch, so each `present/*.ts` exports a single `presentX(context)`:

```ts
type BatchContext = {
  batchId: string;
  batchEvents: readonly ServerEvent[];
  facts: BatchFacts; // batchFacts.ts, pure
  enqueue: (step: AnimationStep) => void;
  refs: CueRefs;
  actions: CueActions;
};
```

`presentBatch` then reads as the ordered list of what the screen plays.

---

## Orchestration

### Roles

**Subagents (Sonnet, `general-purpose`).** One narrow extraction each. They write
new files and their tests, run the verification commands themselves, and report.

**Session (manager).** Owns the specs, the integration edits to the four large
files, every commit, and the go/no-go on each wave. Never delegates the
integration edit — that is where the merge hazards are.

### Concurrency rule

Two agents must never edit the same file. That gives two modes:

- **Author mode.** Agents create new files only; they never touch the source
  file. The manager then deletes the original range and rewires imports in one
  commit per wave. High parallelism — 4 to 8 agents at once.
- **Owner mode.** For hooks and JSX, where the new module and the hole it leaves
  cannot be separated. One agent owns one source file for a whole wave.

`overlays.tsx` and `boardPieces.tsx` are almost entirely already-separate
top-level exports, so they run in author mode throughout — that is the cheap,
wide part of this refactor and it should go first.

### Spec template

Every agent prompt carries exactly this, filled in:

```
TASK    Extract <what> from apps/web/src/game/<file> lines <A>–<B>
        into apps/web/src/game/<area>/<target>.<ts|tsx>

MODE    author  (create the new file; DO NOT edit <file>)
   or   owner   (create the new file AND delete the range from <file>,
                 rewiring its call sites)

EXPORTS <exact list of exported names and their signatures>

RULES   1. No behavior change: no reordered statements, no changed conditions,
           defaults, or dependency arrays. Report anything that looks wrong;
           do not fix it.
        2. Comments: delete restatements; lift every "why" comment to the module
           header and state each rule once.
        3. Pure: one object parameter, a return value, no React, no globals.
        4. Types and enums go in <area>/types.ts and <area>/enums.ts.
        5. Conventions: <the Conventions section, verbatim>
        6. Use these names: <renames that apply>
        7. Use Side/CueTrack/<enums> instead of string literals.

TESTS   Write <target>.test.<ts|tsx> covering <the branches listed>. Reuse
        fixtures from <existing test file> where they exist.

VERIFY  pnpm --filter @aegis/web typecheck
        pnpm --filter @aegis/web test
        pnpm check:style
        All three must pass before you report.

REPORT  - files created, with line counts
        - exported names and signatures
        - comments dropped vs. lifted, with a count
        - anything that could not be made pure, and why
        - anything that looks like a pre-existing bug (do not fix)
        - verification output
```

### Waves

| #   | Wave                                                                                                                | Mode   | Agents           | Manager's commit                                |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------ | ---------------- | ----------------------------------------------- |
| 1   | `overlay/effectText.ts` + `types.ts` + `constants.ts` — the pure text layer out of `overlays.tsx` ✅ done           | author | 2                | `refactor(web): extract the overlay text layer` |
| 2a  | `overlay/Scrim.tsx` + `overlay/printedCardName.ts` — the shared internals every component below needs               | author | 1                | one                                             |
| 2b  | `overlay/combat/`, `choice/`, `viewer/`, `match/` — the 13 components that are a straight move                      | author | 8                | two                                             |
| 2c  | The 4 components that blow the 250-line cap and need internal decomposition                                         | author | 4                | one each                                        |
| 3   | `piece/` — 12 components + `handLayout.ts` + `shieldShards.ts`                                                      | author | 7                | two                                             |
| 4   | `match/` and `screen/` types, enums, constants, queries                                                             | author | 4                | one per area                                    |
| 5   | `match/` pure core: `tracks`, `environment`, `eventLookup`, `cardSiteIndex`, `presentableNarration`                 | author | 5                | one                                             |
| 6   | `match/steps/*` — the four step builders                                                                            | author | 4                | one                                             |
| 7   | `screen/model/*` — 10 pure derivations                                                                              | author | 8                | two, batched                                    |
| 8   | `match/present/*` — `segments`, `batchFacts`, then `combat`, `arrivals`, `deletions`, `sounds`, then `presentBatch` | owner  | 1, sequential    | one per module                                  |
| 9   | `match/` hooks: `state`, `queue`, `narration`, `security`, `flights`, `watchers`                                    | owner  | 1                | one per module                                  |
| 9'  | `screen/` hooks + `layout/`                                                                                         | owner  | 1, parallel to 9 | one per module                                  |
| 10  | `Side` enum sweep, then delete the four barrels and rewrite every import site                                       | mixed  | 2                | two                                             |

Wave 2c's four: `DecisionOverlay` (642 lines), the `StackViewerOverlay` cluster
(493, counting its three private parts), `DigiXrosMaterialOverlay` (386) and
`CardActionMenu` (377). Each needs its internals named and split, not just moved,
so each gets its own agent and its own commit.

### What the wave gate must catch

Author mode cannot see the hole it leaves. After every integration the manager
runs `pnpm lint:files` over the touched files specifically to catch imports that
went dead when the declarations left — wave 1 left three (`CombatPromptEvent`,
`DecisionKind`, and a self-import). Typecheck does not flag those; lint does.

Waves 1–3 are wide and low-risk, and they build the folder pattern that waves
4–9 then follow. Waves 8 and 9 are the ordering-sensitive ones: `useMatchCues`
depends on the order of its effects (the card-site index refreshes before the
event effect; the phase baseline lands before paint). Those agent reports get
read against the diff before the commit, not skimmed.

### Test splitting

`useMatchCues.test.ts` (4400 lines), `decisionOverlay.test.tsx` (3200 lines) and
the smaller mirror tests split to match the modules, in the same commit as the
module they cover. No orphan tests. `game.mobile.test.ts` and
`presentationActions.test.tsx` stay as whole-screen integration tests.

### Gate between waves

The manager does not open the next wave until all three verify commands pass on
the integrated tree, the wave's diff contains no logic change, and every agent
report has been read. A failed wave is reverted whole, not patched.

---

## Open question

The Tailwind migration is live on `worktree-tailwind-migration`. This plan
touches no class names, but waves 2, 3 and 9' move JSX between files, which will
conflict on merge. Land this branch first, land Tailwind first, or freeze
`layout/` until Tailwind merges?

---

## Outcome

All waves landed on `worktree-game-file-split`, twelve commits, the suite green at
177 files / 2138 tests throughout.

| File              | Before | After                  |
| ----------------- | ------ | ---------------------- |
| `overlays.tsx`    | 3994   | `overlay/index.ts`, 57 |
| `boardPieces.tsx` | 1643   | `piece/index.ts`, 30   |
| `useMatchCues.ts` | 3612   | 2407                   |
| `GameScreen.tsx`  | 4185   | 3580                   |

131 files under `overlay/`, `piece/`, `match/` and `screen/`. The largest is
`match/present/securityRevealScene.ts` at 389 lines; nothing else clears 400.

Five enums replaced sixteen inline unions and three competing aliases: `Side`,
`CueTrack`, `LungeDirection`, `SecurityBreakPhase`, `DragKind`.

### What the gate actually caught

Typecheck never caught a dead import. `pnpm lint:files` over the touched files
caught them in every single wave — 30-odd across the run, including a whole
adapter (`cheapestDigivolveCost`) whose only caller had moved out from under it.
Author mode cannot see the hole it leaves; the manager has to look.

`game.mobile.test.ts` asserts on source text and broke in four consecutive waves.
Each time the fix was to point it at the decomposed folder, and each time its
assertions then passed unchanged — which is a stronger statement about fidelity
than any diff of ours.

### Known flakes, pre-existing

`test/digivolveNormal.scenario.test.tsx` and `test/block.scenario.test.tsx` both
fail intermittently in a full run and pass in isolation. Neither is related to
this work; both were observed failing before it and are timing assertions around
DOM renders.

### Not done

The two mirror tests were not split. `useMatchCues.test.ts` (4035 lines) and
`decisionOverlay.test.tsx` (3431) still exercise the whole surface through the
old entry points, which is exactly why they were a usable safety net for every
wave. Splitting them is its own piece of work and wants its own plan.
