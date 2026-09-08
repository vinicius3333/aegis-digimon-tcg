# Seam 33 — once-per-turn consumed before the trigger condition is checked

REVIEW-NOTES entry 33 (`once-per-turn-consumed-before-condition`).

## Mechanism

A `[Once Per Turn]` continuous clause compiles to a `SubTrigger` watcher.
`withSubTriggerFrequency` (`apps/api/src/engine/effects/interpreter/effect.ts:409`) copies
the printed frequency onto the watcher as `oncePerTurnKey`, and
`SubTriggerRegistry.fireInto` (`apps/api/src/engine/effects/subtriggers.ts`) calls
`markFired` — spending the turn budget — before it runs the watcher body.

`markFired` runs after the subscription-level `matches` gate, so a gate expressed on the
subscription is safe. It runs *before* the per-action `condition` gate inside the body,
which `runAction` evaluates (`interpreter/actions/runAction.ts:255`). BT11-008, BT11-010
and BT11-014 put their whole trigger condition there:

```ts
{ kind: "SubTrigger", event: "whenAttackTargetSwitched",
  actions: [{ kind: "ModifyDP", ..., condition: { kind: "triggerAttackerIsSelf" } }] }
```

So any attack-target switch on the board — a blocker redirecting a *different* Digimon's
attack — fired the watcher, spent the once-per-turn use, then had its only action rejected
by `triggerAttackerIsSelf`. A later, qualifying switch in the same turn was skipped by the
turn ledger and paid nothing.

Rules stance: §15-5-1 — an effect triggers only when its trigger conditions are met.
§15-14-1-2 — an `[X Per Turn]` effect stops triggering only once it has been *activated* X
times. An event the clause rejects is not an activation, so it must not consume the budget.

## Fix

`apps/api/src/engine/effects/interpreter/actions/subTrigger.ts`, inside the watcher `run`
body:

- Track `activationCostPaid` — true when the intrinsic `＜Delay＞` branch trashed its source,
  or when the ordinary branch actually had an activation cost to pay.
- While iterating `action.actions`, evaluate each top-level action's gate
  (`condition`, or `while`, mirroring `runAction`'s own exclusion of `RawUnparsed` and
  `ConditionalBranch`) and record whether any gate held.
- After the loop, when no cost was paid and no top-level gate held, set
  `subCtx.oncePerTurnActivationDeclined = true`.

`fireInto` already rolls the provisional mark back on that flag (`subtriggers.ts:581`), so
the fix reuses the existing rollback path rather than moving `markFired`. Moving `markFired`
after the body is not an option: it guards unbounded async re-entry (see its doc comment).

Deliberately unchanged behaviour:

- A declined optional activation still rolls back its use — the pre-existing engine
  convention, untouched by this change.
- A watcher that paid an activation cost keeps the use consumed even if every action gate
  then fails.
- A shared-key sibling that already succeeded keeps the budget consumed
  (`successfulOncePerTurnKeys`).

## Red / green

Card lane — `apps/api/src/cards/BT11/BT11-008.test.ts:121`
"keeps its [Once Per Turn] budget when another Digimon's target is switched first":
one blocker switches an unrelated Digimon's attack target, then a second blocker switches
BT11-008's host's. Public intents only (`attack`, `declareBlock`).

- Red: `expected 20000 to be 23000` at `BT11-008.test.ts:166`.
- Green: host reaches 23000 DP.

Engine conformance — `apps/api/src/engine/conformance/ch15-04-continuous-and-static.test.ts:113`
"15-14-1-2: an event that fails the clause's own trigger condition spends no [Once Per Turn]
use", under `§15-14-1 [X Per Turn] (comprehensive-0193)`. Generalises the case with
BT11-014's security-trash clause so the assertion is a zone count, not a DP number.

- Red: `settle: predicate never held` on `players[1].security.length === 1`.
- Green: the opponent's security drops from 2 to 1 on the qualifying switch only.

## Production behaviour change

A `[Once Per Turn]` sub-trigger watcher whose every action gate rejects an event stays armed
for the rest of the turn instead of being spent. Nothing else about the watcher changes: it
still fires, still marks provisionally, and still consumes the use as soon as one action gate
holds or an activation cost is paid.

## Other cards affected

The three cards named in the review note — BT11-008, BT11-010, BT11-014 — all print
`[Your Turn][Once Per Turn] When this Digimon's attack target is switched, ...` and were
mispriced identically. Beyond those, the fix reaches any `[X Per Turn]` sub-trigger clause
whose trigger condition sits on the action rather than on the subscription; the whole
`effects.json` corpus was run (`src/cards/BT11`, `src/engine/conformance`,
`src/engine/effects`, EX10-002, EX10-008) with no new failures.

## Verification

`pnpm --filter @aegis/api exec vitest run src/cards/BT11 src/cards/EX10/EX10-008.test.ts
src/cards/EX10/EX10-002.test.ts src/engine/conformance src/engine/effects --maxWorkers=1
--no-file-parallelism` — 2241 tests, 11 failures, all reproduced on the unmodified tree and
owned by other concurrent lanes (BT11-056, BT11-069, BT11-074, BT11-085 x2, four
BT11 catalog-sync IR mismatches, comprehensive-0146, comprehensive-0204).

`pnpm typecheck` clean. `oxlint` and `oxfmt --check` clean on all three changed files
(the three pre-existing warnings in the conformance file are outside the added block).
