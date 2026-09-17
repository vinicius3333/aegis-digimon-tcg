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

| # | File | Lines | Risk | State |
| - | ---- | ----- | ---- | ----- |
| 1 | `engine/effects/EffectContext.ts` | 2,244 | none — types only | done |
| 2 | `engine/effects/interpreter/costs.ts` | 2,491 | low — a switch per cost kind | done |
| 3 | `engine/combat/controller.ts` | 1,964 | types out; class blocked | partial |
| 4 | `engine/effects/primitives.ts` | 7,033 | medium — one object literal, split by port | next |
| 5 | `engine/effects/continuous.ts` | 1,895 | medium |
| 6 | `engine/GameEngine.ts` | 8,634 | high — its own plan, one slice per commit |

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
