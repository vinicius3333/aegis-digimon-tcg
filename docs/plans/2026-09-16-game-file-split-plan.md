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

Stylesheets are in scope as of the fifth pass below: `game.css` (8,433 lines) and
its neighbours get the same treatment as the `.tsx` files. Class names themselves
are not renamed — the split moves rule blocks between files and nothing else.

There is no `worktree-tailwind-migration` branch, locally or on `origin`; an
earlier version of this plan deferred the stylesheets to it.

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

---

## Second pass: the two hooks that were left

The first pass emptied `overlays.tsx` and `boardPieces.tsx` but left the two
behaviour files well over the 400-line target. This pass took them apart the same
way, twelve commits, the suite green at 177 files / 2138 tests after every one.

| File              | First pass | Second pass |
| ----------------- | ---------- | ----------- |
| `useMatchCues.ts` | 2407       | 1308        |
| `GameScreen.tsx`  | 3580       | 3183        |

### What came out of `useMatchCues.ts`

`presentBatch` was ~1030 lines of one function. It is now the ordered list of
what a batch plays, each beat in its own module under `match/present/`:

`sounds`, `announcements` (the one pass that raises the batch's panels and
notices), `arrivals`, `effectSources`, `deckRiffles`, `securityGrowth`,
`optionDock`, `noticeRouting` (which beat the batch's notices wait for),
`attackAnnouncement`, `attackLunge`, `securityReveal`, `securityClose`,
`securityDestructions`, `combatImpact`, `deletionBursts`.

The four state watchers became hooks under `match/watchers/`: `useDpPulses`,
`useRestrictionPulses`, `useDrawWatcher`, `useSecurityCountWatcher`. The phase and
turn ribbons — the ordering-sensitive part — moved whole into
`match/queue/usePhaseBanners.ts`.

New shared shapes: `RevealOnStage` in `match/types.ts`, `OpeningDealState` in
`match/enums.ts`, `SecurityRevealStage` exported from `securityRevealScene.ts`.

### What came out of `GameScreen.tsx`

`screen/hooks/useArenaLayout.ts` (every measurement the viewport decides),
`screen/hooks/useTrackingArrow.ts` (the per-frame endpoint solver),
`screen/hooks/useBoardMeasurements.ts` (permanent centres and the targeting mask),
`screen/model/combatWindows.ts` (the five combat prompts),
`screen/model/prePlayPrompt.ts` (what a play must settle before it is sent),
`screen/model/decisionView.ts` (the open decision as the board shows it).

### One deliberate reorder

`cueFlights(...)` moved above the watchers in `useMatchCues`. `useDrawWatcher`
takes `launchDrawFlight` as an argument at render time, where the old inline
effect closed over it lazily, so the factory has to run first. It calls no hooks
and reads only values declared far above it, so the hook order is unchanged.

### The gate, again

`pnpm lint:files` over the touched files caught a dead import after every single
extraction — 40-odd across the run — and typecheck caught none of them.

`game.mobile.test.ts` broke twice. Once because its source loader read only the
top-level files of `./screen/`, which the new `hooks/` and `model/` subfolders sit
below; the loader now recurses, and its assertions passed unchanged. Once because
an assertion matched `const collapseNotices = ...` and the extraction had turned
it into an object property — the hook keeps the `const`, so that assertion is
unchanged too.

### Still not done

`GameScreen.tsx` is 3183 lines, of which ~1600 are the two JSX blocks (`overlays`
and the board itself). Splitting those means naming the props each layer actually
needs, which is design work, not extraction — it wants its own plan. The drag
plumbing (`startHandDrag`, `handleTap`, `handleDrop` and their siblings, ~150
lines) is a clean next extraction. `useMatchCues.ts` is 1308 lines: `presentBatch`
composition, the decision barrier and stall watchdog, and ~200 lines of `useState`
and `useRef` declarations that the plan's `state/` slot was meant to take.

The two mirror tests are still unsplit, for the same reason as before: they were
the safety net for every commit here.

---

## Third pass: both files under 1000 lines

The target this pass was set: `useMatchCues.ts` and `GameScreen.tsx` both under a
thousand lines. Nine commits, the suite green at 177 files / 2138 tests after
every one.

| File              | Second pass | Third pass |
| ----------------- | ----------- | ---------- |
| `useMatchCues.ts` | 1308        | 900        |
| `GameScreen.tsx`  | 3183        | 989        |

### `useMatchCues.ts`

`presentBatch` — still ~400 lines of one function — moved whole into
`match/present/presentBatch.ts`. The hook keeps the wrapper that names the sixty
refs, setters and collaborators the pass reads. They are gathered at call time
rather than at render time, because the flight launchers are declared after the
effect that starts the pass; a context object built during render would hit the
temporal dead zone.

The board budget, the snapshot barrier, the stall watchdog and the two releases
were five effects; they are `match/queue/useDecisionBarrier.ts` now, called where
they used to sit so the effect order is unchanged.

### `GameScreen.tsx`

The component is composition now. What came out, in order:

- `screen/model/pendingMatchNotice.ts` + `screen/layout/PendingMatchBoard.tsx` —
  what the board says before there is a match.
- `screen/hooks/useDragPlumbing.ts` — the press-to-drag gesture, the window
  listeners and the two drag starters.
- `screen/hooks/useAttackPreviewArrow.ts` — the per-frame endpoint solver.
- `screen/hooks/useBoardSelection.ts` and `screen/hooks/useOverlayState.ts` — what
  the viewer has picked up, and every surface the board can have open.
- `screen/matchIntents.ts` — the ten senders and the prompts a play settles first.
- `screen/boardActions.ts` — what a tap or a drop means.
- `screen/model/`: `presentedSeats`, `actionGuards`, `handEntries`,
  `triggerDetails`, `appFusionLive`, `memoryPreviewInputs`, `spotlightRequest`.
- `screen/combatAnswers.ts` and `screen/playChoiceAnswers.ts` — how each prompt is
  answered, so the overlay stack reads as a list of surfaces.
- `screen/layout/`: fifteen board components (the opponent bar, the ticker, the
  turn banner, the two pile columns, the three parts of the battle zones, the
  raising dock, the player dock, the arrow, ghost and burst layers, the drag
  ghost), nine overlay components, and then `MatchOverlays.tsx` and
  `BoardStage.tsx`, which compose them.

One component per file throughout.

### Two deliberate reorders

The pointer listeners now register with the drag state instead of after the cue
hook. They have no dependencies, read no state and only attach window handlers.

The selection and overlay effects — Escape, the attacker the server took the
attack away from, and the reset on a new decision — moved above `useMatchCues`
with the state they belong to. None of them is read by a cue effect; the cue
hook's own inputs are computed during render, not from this state.

### What the gate caught

`pnpm lint:files` again caught every dead import, and typecheck caught none of
them. Two real regressions surfaced in the suite rather than in review: a demo
connection with no `respondDecision` stopped acknowledging its own decisions when
the guard was narrowed from `demoConnection` to that one function, and the
opponent's shield lost its seat check when the break cue was passed pre-filtered.
Both were caught by the full run and fixed before the commit.

Five source-text tests moved with the code: `boardInputLock.test.ts` and
`opponentSleeves.test.ts` now read `GameScreen.tsx` together with `./screen`, the
way `game.mobile.test.ts` already did, and three assertions were re-pointed at the
names the decomposition gave them.

### Still not done

The two mirror tests — `useMatchCues.test.ts` (4035 lines) and
`decisionOverlay.test.tsx` (3431) — are still unsplit, for the third time and the
same reason: they were the safety net for every commit here.

`screen/layout/BoardStage.tsx` (466), `screen/boardActions.ts` (370) and
`screen/layout/MatchOverlays.tsx` (369) all clear the plan's 400-line target or sit
just under it. They are composition and routing rather than logic, but they are
the next things to look at.

---

## Fourth pass: the rest of `apps/web/src`

The three earlier passes cleared `game/`'s screen surface. This one took the five
files that were still oversized anywhere in the app.

| File                      | Before | After   |
| ------------------------- | ------ | ------- |
| `dev/CardEffectsDemo.tsx` | 19,411 | 87      |
| `game/boardModel.ts`      | 1,608  | 317     |
| `dev/BoardShowcase.tsx`   | 1,414  | 950     |
| `screens/DeckBuilder.tsx` | 1,071  | 49      |
| `screens/cardLibrary.tsx` | 905    | removed |

### `CardEffectsDemo.tsx`

275 fixture builders and a 2,300-line `if (cardId === …)` chain in one file. The
fixtures moved to `dev/cardEffects/<SET>/<CARD-ID>.ts`, which is the layout
`apps/api/src/cards` already uses, and each set exports a
`Record<string, CardEffectsFixtureBuilder>` that `dev/cardEffects/index.ts`
merges. Three builders serve cards across several sets (`vanillaBt3Demo`,
`effectBt3Demo`, `vanillaPlayDemo`) and live in `dev/cardEffects/vanilla.ts`;
`fixture.ts` holds the fixture type and the `card`/`permanent`/`player`
primitives. The screen is a registry lookup and the same demo connection it
always was.

### `boardModel.ts`

Four subjects, one file. Each left with the helpers only it used:

- `decisionModel.ts` — what a decision prompt shows and how to find what it
  points at.
- `digivolveModel.ts` — routes from hand or stack, and what each one costs.
- `matchLog.ts` — `describeEvent` and the log it builds.
- `combatWindowModel.ts` — the block, counter and mirrored windows.

`boardModel.ts` keeps the board's own projections: attacks, breeding, seats,
memory and the link slots. Twenty-eight files had their imports re-pointed;
`uiCompleteness.test.ts` reads `describeEvent` out of the source by path, so it
now reads `game/matchLog.ts`.

### The two screens

`DeckBuilder.tsx` became one component per file (`DeckList`, `DeckEditor`,
`PoolCard`, `CountChip`, `DeckTextModals`, `ColorBalance`) over a shared
`deckCounts.ts` that holds the count map and the 50/5 targets — the targets live
there rather than in `DeckBuilder.tsx` so the editor does not import its own
parent. `cardLibrary.tsx` was a grab bag with no screen of its own, so it is gone:
`cardFilters.ts`, `cardSorting.ts`, `FilterRail.tsx` and `CardDetailDrawer.tsx`
replace it, and its five importers name the piece they want.

### `BoardShowcase.tsx`

Only the mechanical half: the fixed board it renders (`boardShowcaseFixtures.tsx`)
and its own section frame (`boardShowcaseLayout.tsx`). The remaining 950 lines are
one component whose body is the list of cases — splitting that is a judgement
call about how the showcase is organised, not a move.

### The gate

`pnpm lint:files` again caught every dead import that typecheck accepted, and the
arrow parameters the new registries introduced. The full suite ends with
`test/block.scenario.test.tsx` failing — the same known flake recorded above,
confirmed by a run at `HEAD` without any of this work, which failed that test and
`digivolveNormal.scenario.test.tsx` as well.

### Still not done

The two mirror tests (`useMatchCues.test.ts`, `decisionOverlay.test.tsx`) and
`CardEffectsDemo.test.tsx` (4,660 lines) are unsplit, again as the safety net.
`dev/ArenaDemo.tsx` (868), `dev/arenaVisualScenarios.ts` (1,018) and
`screens/Lobby.tsx` (684) are the next candidates; the i18n tables are data and
stay whole.

---

## Fifth pass: the stylesheets

`game.css` is the largest file left in the repo. It is already sectioned by
`/* --- Subject --- */` banners, so the split is mechanical: each banner becomes a
file, in the folder that owns the markup it styles.

| File                    | Lines             |
| ----------------------- | ----------------- |
| `game/game.css`         | 8,433 → 22 (done) |
| `game/arenaMobile.css`  | 1,064             |
| `game/arena.css`        | 1,023             |
| `design/primitives.css` | 761               |
| `screens/lobby.css`     | 473               |

Target: no stylesheet over 400 lines, matching the source-file target.

### Conventions

The naming table already carries the rule — `<folder>.css` at the folder root —
and the fifth pass applies it:

- One stylesheet per feature folder, named after the folder, sitting beside its
  `index.ts`. `game/overlay/overlay.css`, `game/screen/layout/layout.css`.
- A component whose styles are its own and nowhere else keeps the existing
  `PascalCase.css` pattern (`EffectText.css`, `AppFusionChoiceOverlay.css`).
- The stylesheet is imported by the folder's top component, never by `main.tsx`.
  Only `design/` loads globally.
- Custom properties and keyframes stay where they are declared today:
  `design/tokens.css` for tokens, and a `@keyframes` block moves with the one
  rule that uses it. A keyframe used from two files goes to the nearest shared
  ancestor stylesheet, not back to a global.
- Media queries move with their rule. `arenaMobile.css` stays a separate file
  only where the phone layout is a wholesale replacement rather than an override.

### Rules

Rule 1 applies unchanged and is stricter here than in TypeScript: **cascade order
is behavior**. Two rules with the same specificity are resolved by source order,
so the import order in the owning component must reproduce the order the blocks
had inside `game.css`. Any block that only works because of where it sat gets a
header comment saying so, or gets its specificity raised deliberately and that is
recorded as a reorder, the way the earlier passes recorded theirs.

Dead rules are reported, not deleted — `timings.test.ts` already proves which
animation names are unused, and removing them is a separate commit.

### What the gate must catch

- `game/timings.test.ts` reads `./game.css` from disk by URL and asserts every
  `--t-*` duration and selector is present. It has to read the set of new files
  instead; that change lands in the same commit as the first split.
- Every class name that exists today still exists, and no rule changed position
  relative to another rule of equal specificity. A sorted dump of selectors
  before and after must match exactly.
- The visual dev screens (`dev/BoardShowcase.tsx`, `dev/ArenaDemo.tsx`) are the
  manual check; the board showcase covers most of the board surface.

### What came out of `game.css`

8,433 lines became a 22-line manifest of `@import`s and seventeen files under
`game/style/`, each named for its subject and none over 1,000 lines:

`cardCues` (930), `feedbackPort` (767), `decisionPrompts` (697),
`dialogsAndNarration` (676), `desktopNotices` (595), `responsivePhoneStrip`
(590), `gameLayout` (547), `effectSources` (545), `responsivePhone` (495),
`responsiveLandscape` (440), `battleBoard` (435), `securityShatter` (382),
`responsivePortrait` (354), `securityClash` (337), `boardZones` (329),
`responsiveDesktop` (220), `reducedMotion` (127).

The cut points are the file's own `/* --- Subject --- */` banners, so every part
is a run of consecutive lines and the manifest lists them in their original
order. Re-concatenating the parts in that order reproduces the old file line for
line — that diff is the proof that no rule moved relative to another, and it is
worth re-running after any later move.

### One deliberate split

`@media (width < 600px), (height < 520px) and (orientation: landscape)` was 1,075
lines — the one block that could not fit under the target whole. It is now two
consecutive blocks with the identical condition, cut at a rule boundary:
`responsivePhone.css` and `responsivePhoneStrip.css`. Two adjacent blocks with the
same query behave as one, and each file's header names the other.

### The gate

`timings.test.ts` and `game.mobile.test.ts` read the stylesheet from disk. Both
now go through `style/gameCssSource.ts`, which reads the manifest and joins the
parts in its order, so the text they assert against is the cascade order.

`game.mobile.test.ts` also sliced media blocks with regexes anchored on whatever
text followed them — a file boundary between two blocks broke six of them at
once. They are one `mediaRules(condition)` helper now, which finds each matching
header, balances braces, and joins every block sharing that condition; the two
phone halves come back as one string, and the assertions did not change.

`pnpm -r typecheck`, `vite build`, `oxlint`, `oxfmt --check` and the full web
suite (178 files, 2,153 tests) all pass — including `test/block.scenario.test.tsx`,
the flake the earlier passes recorded.

### Still not done

`arenaMobile.css` (1,064) and `arena.css` (1,023) are the next two, and
`design/primitives.css` (761) after them.
