# Seams 9 and 21 — simultaneous trigger ordering, and pending activation across windows

## Seam 9 `simultaneous-same-timing-trigger-ordering`

### Mechanism

Two independent defects hid behind one symptom ("no `orderTriggers` prompt").

**9a — the activation gate kept a mandatory effect out of the ordering tier.**
`drainCurrentTimingWindow` (`apps/api/src/engine/effects/stack.ts`) groups collected effects by
*activation tier*: everything that becomes activatable in the same pass shares a tier, and only the
newest tier is offered to `chooseOrder`. `canActivateEffect`
(`apps/api/src/engine/effects/interpreter/effect.ts`) refused any effect whose every action is
board-targeted when the board holds no candidate ("Board-targeted actions gate activation", citing
BT3-014). EX10-023 Quartzmon prints two `[When Digivolving]` clauses — suspend everything, then
delete 1 *suspended* opposing Digimon. On pass 1 nothing is suspended yet, so only the suspend
clause was activatable; the delete clause entered a later tier and resolved alone. The controller
never chose an order.

**9b — the `whenAttacking` watcher bus fired outside the attack's timing window.**
`CombatController.resolveAttack` (`apps/api/src/engine/combat/controller.ts`) ran
`fireTiming(OnUseAttack)` first and the `whenAttacking` / `whenOpponentAttacks` SubTrigger bus
afterwards. Every other event already folds its watchers into its window through
`GameEngine.withPendingSubTriggers` (play, digivolve, unsuspend, turn end, opponent draw); attack
declarations did not. So EX10-009 Creepymon's printed `[When Attacking]` and BT24-078's
`{Trash} [Your Turn]` watcher, which react to the same declaration, reached the player as three
independent `optional` prompts in engine order.

The second half of the EX10-009 red (a queued `[When Attacking]` entry whose source stops being the
top card must be retired) needed no new code: `stack.ts`'s presence diff plus
`identityAtFirstCollect` / `permanentIdentityOf` already implement CR §15-4-4-3. It simply never saw
the watcher, because the watcher was not in the window. Once 9b lands, the latch retires
EX10-009's entry the moment BT24-078 becomes the permanent's top card.

### Ruling implemented

The coordinator's ruling (CR §15-4-2, and the existing ＜Alliance＞ precedent in `GameEngine`,
`canActivate: () => true`): a triggered effect whose only action currently has no legal board target
**still triggers**, takes its place in the ordered set, and fizzles at resolution if it is still
targetless.

### Fix

1. `interpreter/effect.ts` — `canActivateEffect` takes a third argument, `ActivationGateOptions`.
   `collectsMandatoryTrigger: true` skips the empty-board refusal; everything else about the gate is
   unchanged.
2. `interpreter/registration/module.ts` — the general trigger build site computes
   `isMandatoryTrigger` and passes it. A clause counts as mandatory only when it is not an
   `OnDeclaration` (`[Main]`) activation, the clause itself is not `optional`, **and no action in
   it is `optional`**. Optionality is printed both ways in the IR — BT21-045's "you may delete 1 of
   your opponent's Digimon with 9000 DP or less" carries `optional` on the `Delete` action, not on
   the clause — and either form makes an empty-board prompt a UI wart rather than a rules
   requirement, so both keep the gate (seams 18 / 27 stay as they are). The ＜Delay＞ build sites are
   untouched.
3. `combat/controller.ts` — new optional hook `withPendingAttackSubTriggers(payload, runWindows)`.
   When the engine supplies it, the `OnUseAttack` / `OnAllyAttack` windows run inside it and the
   trailing prepared-bus fire is skipped; the legacy sequence is kept verbatim for the combat unit
   tests, which supply minimal hooks.
4. `GameEngine.ts` — implements that hook as
   `withPendingSubTriggers(["whenAttacking", "whenOpponentAttacks"], payload, runWindows,
   { onlyInitiallyArmed: true })`. `onlyInitiallyArmed` preserves the event-time watcher snapshot
   the old `prepareSubTrigger` call gave, so a watcher armed *during* the windows still does not
   retroactively react to this declaration.
5. `engine/testkit/harness.ts` — `preferTriggerKeys` now also matches a trigger's source card id
   (`options.triggerCardIds`), not only its opaque key. A SubTrigger watcher's key is
   `subtrigger/<subscription id>/<description>`, which no test can name; the card id is the only
   stable handle. Without this the EX10-009 proof could not choose the BT24-078 branch.
6. `apps/api/src/cards/BT24/BT24-078.ts` — `@ts-nocheck` removed; the file typechecks as written.

### Red / green

Reds reproduced on the current tree by turning both `it.fails` into `it`:

```
pnpm --filter @aegis/api exec vitest run src/cards/EX10/EX10-009.test.ts \
  src/cards/EX10/EX10-023.test.ts --maxWorkers=1 --no-file-parallelism
  -> Tests  2 failed | 31 passed (33)
     × EX10-023 "Q5074 raises an orderTriggers decision for the two simultaneous
       [When Digivolving] effects"
       settle: predicate never held within 500 ticks.
       Predicate: () => s.decisions.some(({ req }) => req.kind === "orderTriggers")
     × EX10-009 "Q5656 loses its When Attacking window when the trash digivolve is ordered first"
       EX10-009.test.ts:576  expect(s.decisions.some(...kind === "orderTriggers")).toBe(true)
       AssertionError: expected false to be true
```

Green with the fix, both now plain `it`:

```
pnpm --filter @aegis/api exec vitest run src/cards/EX10/EX10-009.test.ts \
  src/cards/EX10/EX10-023.test.ts --maxWorkers=1 --no-file-parallelism
  -> Test Files 2 passed (2); Tests 33 passed (33)
```

The EX10-009 proof now shows both halves: one `orderTriggers` offering
`triggerCardIds: ["EX10-009", "BT24-078"]`, and — after the BT24-078 branch is ordered first —
an empty breeding area with BT1-013 still in the trash, because EX10-009's own pending
`[When Attacking]` was retired when it stopped being the top card.

## Seam 21 `pending-activation-lapses-when-source-leaves`

### Mechanism

CR §15-4-4-3 / §15-4-4-5 retire a pending triggered effect whose source left its area before the
effect activates. `stack.ts` enforces this *inside the timing window it is draining* (the `departed`
latch, the presence diff, `identityAtFirstCollect`), because it re-collects from live state on every
pass.

A trigger parked **between** windows does not go through that loop. `GameEngine.fireTiming` defers a
window opened inside a resolving effect body (`shouldDeferNestedTiming`), and
`deferNestedTimingEffects` captures the collected list *now* into `pendingNestedTimingEffects`.
That captured list is replayed later by `pendingWindowCollected()` with no fresh residency check.
The sibling `deferredTimingWindows` queue does not have this problem: it stores the *event*, not the
effects, and re-runs `gatherTriggeredEffects` at flush time.

### Fix

`GameEngine.ts` records `permanentIdentityOf(source)` for each parked entry at defer time
(`nestedTriggerSourceIdentity`, a `WeakMap`) and filters the list at replay through
`nestedTriggerSourceStillResident`: an entry whose source card is no longer the same thing on the
same permanent it was when the trigger was collected is dropped. `permanentIdentityOf` is now
exported from `effects/stack.ts` via `effects/index.ts` so both boundaries use one definition of
"same card, same permanent, same role".

Two deliberate opt-outs:

- A source that was **not on a permanent** at defer time (`null`) makes no residency claim and is
  never filtered — a trash- or hand-resident clause, or an `[On Deletion]` whose card is already
  gone.
- `pendingPlayCostDeletionEffects` (seam 23) is a different field and is not filtered at all. Its
  source is gone by design: it was deleted to pay the play cost (Q5131). EX10-048's proof stays
  green.

### Coverage, and an honest limitation

New conformance case in `apps/api/src/engine/conformance/ch15-02-timing-and-resolution.test.ts`:
`§15-4-4 Pending Activation (comprehensive-0165)` →
`15-4-4-3: a trigger parked between windows lapses when its source becomes a digivolution card`.
BT16-097's `[Main]` plays BT16-019 Angemon from hand (parking its `[On Play]` "unsuspend 1 of your
Lv.4 or lower Digimon") and then DNA digivolves it into BT16-012 in the same resolution; the
suspended decoy must still be suspended afterwards. Driven entirely through the public `playCard`
intent.

**This test does not isolate the new gate.** With the filter reverted it still passes: the built
effect's `onField` base guard also refuses to activate an effect whose source is now a digivolution
card, so the endpoint is produced twice over. I could not construct a case in the current corpus
where the base guard passes and only the residency gate stops the replay — that needs an inherited
or granted clause whose source moves between permanents while remaining collectable (Q5160's exact
shape, which EX10-058's lane also could not reach through public intents). The gate is therefore
correct-by-construction and strictly one-way, but its own red is outstanding. Recorded rather than
faked.

The filter is not inert in practice: instrumenting it across `src/cards` + `src/engine` shows it
dropping entries in BT16-019 (`perm-1 top -> perm-2 stack`, the case above), BT26-016, EX12-046,
BT24-019, BT24-010 and BT16-031 (all `-> undefined`, the source left the battle area). No test
outcome changes in any of them.

## Production behaviour changes

1. **Corpus-wide.** A mandatory (no `optional` on the clause and none on any of its actions)
   triggered effect whose every action is board-targeted now enters the
   ordering tier on an empty board, and fizzles at resolution if it is still targetless. Before it
   was simply not collected. Player-visible consequence: such an effect now appears in an
   `orderTriggers` prompt alongside its simultaneous siblings, and can be ordered ahead of an effect
   that would have created its target — which is what CR §15-4-2 requires. Optional ("you may")
   clauses and `[Main]` activations are unchanged.
2. **Every attack declaration.** `whenAttacking` / `whenOpponentAttacks` watchers now resolve inside
   the `OnUseAttack` window rather than after it, so a printed `[When Attacking]` effect and a
   watcher reacting to the same declaration are ordered together by their controller (one prompt)
   instead of running in a fixed engine order. Watchers armed during the windows still fire
   afterwards, unchanged.
3. **Deferred nested triggers.** A trigger parked while another effect resolves is dropped at flush
   time if its source card changed permanent or role in the meantime (§15-4-4-3).

### Corpus check

The whole card suite was run with all three of this lane's changes on and again with them
neutralised, and the failing-test name sets diffed:

```
pnpm --filter @aegis/api exec vitest run src/cards --maxWorkers=1 --no-file-parallelism
  baseline (changes neutralised): 455 failing tests
  with the fix:                   453 failing tests
  diff: the only two entries that changed are the two reds this lane flipped;
        no test failed that was not already failing.
```

The first cut of the mandatory test — `effect.optional !== true` alone — did produce one
regression: BT21-045 ShineGreymon prints two `[When Attacking]` clauses, and its "you may delete"
clause carries `optional` on the action. With an opponent holding no Digimon that clause started
triggering, raised an `orderTriggers` and then an extra `optional` prompt, and the test's scripted
single decline no longer matched. That is the seam-18/27 family the ruling deliberately excludes, so
the action-level `optional` check was added rather than the test being changed. No card test needed
editing in the end.

## Tests updated because of the ruling

None. BT3-014's test — the citation the old gate leaned on — asserts only that exactly one opposing
Lv.4-or-lower Digimon is set to 1000 DP when a legal target exists. It never asserted "no prompt on
an empty board", so the ruling does not contradict it and the file is untouched. `BT3-014.test.ts`
passes unchanged.

The two EX10 reds changed from `it.fails` to `it` and their comment blocks were rewritten to
describe the mechanism that was fixed rather than the defect.

## Gate

```
pnpm --filter @aegis/api exec vitest run src/cards/EX10/EX10-009.test.ts \
  src/cards/EX10/EX10-023.test.ts src/cards/EX10/EX10-044.test.ts \
  src/cards/EX10/EX10-048.test.ts src/cards/EX10/EX10-058.test.ts \
  src/cards/BT24/BT24-078.test.ts src/cards/BT3/BT3-014.test.ts \
  src/engine/conformance src/engine/effects src/engine/combat \
  --maxWorkers=1 --no-file-parallelism
  -> Test Files  3 failed | 111 passed (114); Tests  9 failed | 1932 passed (1941)

pnpm typecheck                                  -> exit 0
pnpm exec oxlint <changed files>                -> clean on every changed line
pnpm exec oxfmt --check <changed files>         -> clean (GameEngine.ts reformatted once)
```

All 9 failures are category (b) — seam-32 hollow settles in files this lane does not touch. The
identical 9 fail with all three of this lane's changes neutralised:

| File | Test | Why |
| --- | --- | --- |
| `src/cards/EX10/EX10-058.test.ts` | 7 tests | `settle(() => s.state.pendingDecision === null)`. `pendingDecision` is `undefined` when idle, never `null`, so the predicate can never hold. Nine such call sites in the file. |
| `src/engine/conformance/ch11-attacking.test.ts` | `11-3-1: a real [Counter] card activates through the window …` | Pre-existing; also reported by the seam-25 lane. |
| `src/engine/combat/keywords.test.ts` | `BT6-054 can't block merely because its text references or conditionally grants Blocker` | Pre-existing settle timeout. |

Two pre-existing lint findings in touched files, neither on a changed line:
`GameEngine.ts:4` unused `AsyncLocalStorage` import, and
`ch15-02-timing-and-resolution.test.ts:536` `no-useless-concat` (the seam-25 lane's test).

## Files changed

- `apps/api/src/engine/effects/interpreter/effect.ts` — `ActivationGateOptions`, the gated
  empty-board refusal.
- `apps/api/src/engine/effects/interpreter/registration/module.ts` — pass the option for mandatory
  triggers.
- `apps/api/src/engine/combat/controller.ts` — `withPendingAttackSubTriggers` hook and the reworked
  attack-window sequence.
- `apps/api/src/engine/GameEngine.ts` — implement that hook; the between-windows residency gate.
- `apps/api/src/engine/effects/stack.ts`, `apps/api/src/engine/effects/index.ts` — export
  `permanentIdentityOf`.
- `apps/api/src/engine/testkit/harness.ts` — `preferTriggerKeys` matches source card ids.
- `apps/api/src/engine/conformance/ch15-02-timing-and-resolution.test.ts` — new §15-4-4-3 case.
- `apps/api/src/cards/EX10/EX10-009.test.ts`, `apps/api/src/cards/EX10/EX10-023.test.ts` — reds
  flipped.
- `apps/api/src/cards/BT24/BT24-078.ts` — `@ts-nocheck` removed.
