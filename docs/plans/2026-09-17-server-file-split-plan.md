# Split the oversized files in `apps/api/src`

Branch: `worktree-game-file-split` · Worktree: `.claude/worktrees/game-file-split`

The web pass (`2026-09-16-game-file-split-plan.md`) finished; the server has 57
files over 400 lines. This plan takes them in risk order, lowest first, one
commit per file.

## Conventions

The web plan's conventions apply verbatim — file names, folder names, folder
shape, no default exports, no `utils.ts`. Two rules earn their keep here:

- **The old name stays as the barrel.** `EffectContext.ts` has 177 import sites
  and `costs.ts` has 16. A split that moves those is a split that has to be
  reviewed at 190 call sites instead of one. Both keep their path and re-export.
- **A guard that reads source as text is part of the split.** Three of them
  (`restrictionConsumers`, `subTriggerFireSites`) parse the declaration file;
  they move with the declaration, and the test suite is what proves it.

## Order

| #   | File                                  | Lines | Risk                                  | State   |
| --- | ------------------------------------- | ----- | ------------------------------------- | ------- |
| 1   | `engine/effects/EffectContext.ts`     | 2,244 | none — types only                     | done    |
| 2   | `engine/effects/interpreter/costs.ts` | 2,491 | low — a switch per cost kind          | done    |
| 3   | `engine/combat/controller.ts`         | 1,964 | types out; class blocked              | partial |
| 4   | `engine/effects/primitives.ts`        | 7,033 | medium — 146 mutually recursive verbs | done    |
| 5   | `engine/effects/continuous.ts`        | 1,895 | shapes out; ledger blocked            | partial |
| 6   | `engine/GameEngine.ts`                | 8,634 | the whole class body out              | done    |

`shared/effects/data.ts` (2,141), `SeriesStore.ts` (1,454) and `AegisRoom.ts`
(1,199) sit below that line.

## 1. `EffectContext.ts` → `effects/context/`

2,244 lines of pure types. One file per subject: `restrictions` (53),
`triggers` (395), `subTriggers` (144), `replacements` (165), `gameAccess` (84),
`decisions` (65), `effectContext` (250).

The `Primitives` interface was 1,071 of those lines. It becomes
`context/primitives/`, one port per subject — `resources`, `board`, `removal`,
`deck`, `continuous`, `security`, `combat`, `delayed` — recomposed by the
folder's barrel as `interface Primitives extends …`. The verb signatures and
their order did not change, so `createPrimitives` and every card module still
typecheck against the same contract.

The section-marker comments inside the old interface
(`// --- combat (attack-and-block subsystem) ---`) became the files' doc
comments; that is where the subsystem names now live.

## 2. `costs.ts` → `interpreter/cost/`

`payCostInner` was a 1,969-line switch over 22 cost kinds. Each kind is now a
payer, grouped by subject, and a `PAYERS` map keyed by `Cost["kind"]` replaces
the switch. A kind absent from the map fails the cost — the answer the old
`default` gave, so `attack` and `digivolveSelf` are deliberately not listed.

Two branches held most of the mass and got their own file: the
digivolution-stack trash and the routed place. Both return `undefined` for a
cost that is not theirs, which is how the caller reproduces falling past the
old `if`.

**The one real bug this pass produced**, caught by the suite: `payCostInner`
had a fast path BEFORE the switch for a `place` cost sourced from the deck.
Extracting the `case "place"` body alone dropped it, and 14 EX9 tests failed.
It now opens `payPlaceCost`. A pre-switch guard is part of the case it guards —
check for one before cutting any other switch in this repo.

`canPayCost` is untouched and merely moved: it is an if-chain keyed on cost kind
AND target shape, not a switch, so it does not split along the same seam. It is
the next thing to do to `cost/` if the 400-line target is taken further.

## 3. `controller.ts` → the 300 lines of types only

`combat/types.ts` takes the decision windows, `CombatTrigger` and the 200-line
`CombatHooks` seam. controller.ts re-exports the two public ones, so its
consumers did not move.

**The class did not split, and should not be forced.** The two candidates —
`resolveDigimonBattleResult` (527 lines) and `resolveAttack` (332) — are not
standalone functions hiding inside a class. `resolveDigimonBattleResult` alone
touches ten members, six of them private (`hasKeyword`, `emitDeletionPrevented`,
`suspendInCombat`, `fireSuspended`, `currentAttack`, `completedCombat`).
Extracting it means widening those to reach them from a module, or threading a
ten-member context object through 527 lines of the engine's combat core. Either
is a design decision about how `CombatController` is composed, not a file move,
and it needs to be taken deliberately rather than as a side effect of a
line-count target.

## 4. `primitives.ts` → `effects/verbs/`

Two passes. The first moved what closed over nothing: the ports
(`verbs/types.ts`) and the state-only helpers (`looseInstances`,
`digivolveCost`, `cardPlacement`). The second took `createPrimitives` itself —
6,130 lines holding 146 verbs — into 28 modules grouped by subject, leaving
primitives.ts at 116 lines to assemble them.

### The seam

The verbs were one closure, so every name was in scope for every other, and they
use it: 139 cross-section references, including cycles (digivolve ↔ trash,
trash ↔ continuous, reveal ↔ return). Independent factories cannot express that.

`verbs/context.ts` carries the shared state plus two late-bound slots — `fx`,
the assembled verb set, and `helpers`, the non-verb logic more than one module
needs. Both are filled before any verb can run, and each module opens with
forwarding aliases that read them at call time:

```ts
const trash: Primitives["trash"] = (...args) => pc.fx.trash(...args);
```

That keeps every verb body byte-identical, which is the point: a
whitespace-insensitive comparison of the old closure against the 28 modules
removes zero characters.

### What the split surfaced

`draw` takes a `drawReason` and `relocatePermanent` an `emitMovementEvents` that
the published `Primitives` contract does not mention. Inside one closure nobody
noticed; routing through `fx` fails to compile. `InternalVerbs` in context.ts
records the gap rather than papering over it — deciding whether the contract or
the implementation is wrong is a separate question.

### Still over 400

`deletion.ts` (685) is one 640-line `deletePermanent`. `dnaDigivolve.ts` (421)
and `play.ts` (413) are two and four functions. Each is a function-size problem,
not a grouping problem.

## 5. `continuous.ts` → the shapes only

`continuous/` takes the 440 lines of entry interfaces and the 75 lines of
readers. `ContinuousEffectLedger` (1,300 lines) stays whole, for the same reason
`CombatController` did: 42 private arrays, one per grant kind, with `allEntries`,
the boundary sweep and the battle-scope machinery walking all of them. One
sub-ledger per grant kind is a plausible design — and a design decision.

## 6. `GameEngine.ts` → `engine/gameEngine/`

8,634 lines, one class of 207 methods plus the free functions around it. Four
passes, one commit each, the full API suite green after every one.

| Pass | What moved                                                    | Lines |
| ---- | ------------------------------------------------------------- | ----- |
| 1    | the module helpers and shapes around the class                | 554   |
| 2    | the §17-1-3 rule-check sweeps (`RuleChecks`) + `boardQueries` | 331   |
| 3    | the board projections (`BoardProjection`)                     | 567   |
| 4    | the digivolution support paths (`DigivolveSupport`)           | 373   |

GameEngine.ts is 6,872 and keeps its path: `securityStrikeCount`,
`mergeRuleDeletions`, `GameEngineHooks` and `SeatJoinOptions` still re-export
from it, so none of the 35 import sites moved.

### The seam

A class is not a closure, so the primitives' late-bound context does not
transfer: a method cannot read another module's `private`. Each pass therefore
takes the seam this repo already uses for `actions/` — a collaborator over an
explicit deps interface (`RuleCheckDeps`, `ProjectionDeps`,
`DigivolveSupportDeps`), built once in the constructor. Collaborators and
mutable state are passed by reference; anything that must be read live (the
`ruleProcessing` latch, the lazily built `primitives`) is passed as a thunk.

That makes the deps interface the measure of whether a group is a file move or
a design decision. Counting each candidate's distinct `this.` references
outside itself:

| Candidate            | Lines | External refs | Verdict                      |
| -------------------- | ----- | ------------- | ---------------------------- |
| projections          | 573   | 17            | moved                        |
| digivolve support    | 394   | 14            | moved                        |
| rule checks          | 331   | 10            | moved                        |
| turn-boundary sweeps | 176   | 12            | left: the ratio stops paying |
| security check       | 394   | 36            | left                         |
| sub-triggers         | 783   | 28            | left                         |
| timing windows       | 941   | 51            | left                         |
| intent handlers      | 947   | 47            | left                         |
| deps builders        | 1,143 | 92            | left                         |

**The class core did not split in these four passes** — see "The class core did
split after all" below for the seam that took it, and for why the verdict here was
right about deps interfaces and wrong about the conclusion. The four groups
left are the engine's own composition: the deps builders exist to hand `this`
to `actions/`, and the timing / sub-trigger / intent trio shares the window
bookkeeping (`activeWindowToken`, the pending and parked pools, the resolution
depths) that makes one effect resolution ONE event. Threading 50–90 members
through a deps object would not separate them; it would name the coupling and
keep it. Splitting them means deciding how the engine is composed — the same
verdict `CombatController` and `ContinuousEffectLedger` got.

### What the split surfaced

Three tests reached the moved methods through `as unknown as` casts
(`doRuleProcess`, `anyExcessLinkCards`, `syncActivatableEffects` at 14 sites).
They now reach the same methods on `engine.ruleChecks` / `engine.projection`,
and `testkit/internals.ts` — the repo's declared internal seam — carries
`projection` so the harness has one route rather than fourteen.

`parseLinkCategory` came out as a pure function and got the unit test it never
had: the four printed `[Link]` header shapes, plus the unrecognized shape that
must invent no gate.

### Still over 400

`GameEngine.ts` (6,872), `projections.ts` (661) and `digivolveSupport.ts` (442).
Inside the class the mass is now in single methods — the constructor (342),
`digivolveDeps` (281), `fireBeforePayCost` (253), `buildPrimitives` (198) — which
are function-size problems, not grouping problems.

### The class core did split after all — and what it cost

The verdict above ("should not be forced") was right about the DEPS INTERFACE and wrong
about the conclusion. Threading 92 members through a `TimingDeps` would have named the
coupling and kept it. A second seam does not:

```ts
// gameEngine/timing.ts
export async function fireTiming(engine: GameEngine, timing: EffectTiming, …) { … }
```

The method body moves byte-identical and takes the engine as its first parameter. Nothing
is threaded, because nothing is narrowed — and that is the price: the ~130 members those
bodies read cannot stay `private`. The class doc now says so, and names the public surface
(`seatPlayer`, `startMatch`, `applyIntent`, the view and connection methods) so "no
`private` marker" reads as "engine-internal", not "call this".

Eleven more passes, one commit each, the full API suite (43,692 tests) green after every one.

| Pass | What moved                       | Lines |
| ---- | -------------------------------- | ----- |
| 5    | the security check               | 333   |
| 6    | the action deps builders         | 887   |
| 7    | the intent handlers              | 1,220 |
| 8    | the timing windows               | 1,275 |
| 9    | the sub-trigger bus              | 859   |
| 10   | the rule-process fixpoint        | 327   |
| 11   | the resolving-window bookkeeping | 173   |
| 12   | the effect context builders      | 493   |
| 13   | the turn-boundary sweeps         | 232   |
| 14   | the continuous recompute         | 237   |
| 15   | the match lifecycle              | 353   |
| 16   | the combat hooks                 | 241   |

`GameEngine.ts` is 795 lines and keeps its path: its imports, its fields, the constructor,
and the methods that must stay methods.

### The one thing that decides whether a method may leave

Not the deps count — **whether anything replaces the method on the instance.** A module
calling another module walks straight past a replacement, so an intercepted method has to
stay the call route, with every caller going through `engine.<name>(…)` and the body
delegating to the module. Nine do:

| Seam                                              | Who replaces it              | Why                        |
| ------------------------------------------------- | ---------------------------- | -------------------------- |
| `fireTiming`                                      | 86 test sites                | count windows opened       |
| `fireTimingForInstance`, `reactivateOnPlay`       | card tests                   | same                       |
| `fireSubTrigger`                                  | `testkit/observe.ts`         | record every watcher fire  |
| `runContinuousPass`, `recomputeContinuousEffects` | tests + the room             | count passes               |
| `unsuspendForActivePhase`, `unsuspendAllForSeat`  | `opponentTurnFrequency`      | which seam fired           |
| `consultLeavePrevention`                          | `ex7VolcanicdramonMechanism` | force a prevented material |

**The compiler cannot see any of this.** Every one of those reaches the method through
`as unknown as` or `Reflect.set`, so `tsc` stayed green while 1,415 tests went red. Two
more — `hasAnyMainPhaseAction` and the four `internals.fireTiming*` sites — were found the
same way. The suite is the only instrument that reads this seam; a pass verified by
typecheck alone is not verified.

### What else the split surfaced

- **Three statics were not state.** `BREEDING_SUBJECT_EVENTS`, `MAX_RULE_PROCESS_PASSES`
  and the combat hook object never touched `this`. The first two became module consts
  beside the code that reads them. The third — 218 of the constructor's 342 lines — became
  `buildCombatHooks(engine)`, which is most of why the constructor now reads as a
  collaborator list.
- **A cap that is a test knob is part of the contract.** `ch18-other-information` lowers
  `MAX_RULE_PROCESS_PASSES` to 0 to reach the §18-3-2 draw branch without building 1000
  passes. A plain module const silently ignored the override and the draw never happened.
  It is now `rulePassCap`, a holder the fixpoint reads and the test writes.
- **The fire-site guard moved with the declarations**, as the conventions require: its
  `withPendingSubTriggers([…])` pattern now allows the leading engine parameter.

### Still over 400

`timing.ts` (1,275), `intents.ts` (1,220), `actionDeps.ts` (887), `subTriggers.ts` (859),
`projections.ts` (661) and `effectContext.ts` (493). These are grouping decisions that can
be taken further; inside them the mass is again single functions — `fireBeforePayCost`
(262), `digivolveDeps` (274), `applyIntent` (146) — which are function-size problems.
