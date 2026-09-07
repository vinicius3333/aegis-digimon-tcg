# End-of-turn processing order: KB Q5564 / Q5566 / Q5568

## The rule

All three rulings ask the same question in different words: an effect that triggers at the end
of the turn, and the delayed deletion of a Digimon played by an earlier effect, happen at the
same moment. All three give the same answer:

> The pending processing for the effect that triggers at the end of the turn and the deletion at
> the end of the turn are considered to be processing that triggers simultaneously. Therefore,
> the turn player can choose the processing order.

The turn player chooses **whoever controls the Digimon that is about to be deleted**. Q5566
(BT23-037 Tentomon) and Q5568 (BT23-048 Gotsumon) both describe a board where the deletion
belongs to the non-turn player, and the answer is unchanged.

## Why that is not simply §15-4-3-5

Comprehensive Rules §15-4-3-5 splits simultaneous **activated effects** into two buckets: the
turn player orders and exhausts theirs, then the non-turn player orders theirs. Cross-player
order is fixed, never chosen.

A delayed deletion is not in either bucket. The effect that scheduled it activated earlier, on a
previous turn in Q5568's case; what happens at the turn end is *pending processing*, the leftover
of an already-resolved effect. The rulings put that pending processing into the turn player's
ordering set, which is the only reading that makes "the turn player can choose" true when the
deleted Digimon is the opponent's.

The engine therefore keeps §15-4-3-5 exactly as it was for activated effects, and gives pending
processing an explicit ordering seat.

## Design

`CollectedEffect` gains an optional `orderingSeat`. The resolver reads it through one helper:

```
orderingSeatOf(collected) = collected.orderingSeat ?? collected.source.ownerSeat
```

used in both places that decide who orders — `orderTurnPlayerFirst` (which bucket an entry falls
into) and the frontmost-group filter in `drainCurrentTimingWindow` (who is prompted). Every entry
that does not set the field behaves exactly as before, so no activated effect changes bucket.

`SubTriggerSubscription` gains the matching flag, `orderedByTurnPlayer`. `delayedDeletePlayed`
sets it on the one-shot `endOfTurn` watcher it installs. `subTriggerAsCollected` turns the flag
into `orderingSeat: state.turnSeat` when the watcher is folded into a timing window, and
`runSubTriggersInChosenOrder` applies the same substitution on the plain SubTrigger-bus path so
the two paths cannot disagree.

The flag is about ordering only. The body still resolves against its own source and controller,
its `matches` / `once` / `expiresOnTurnEndOf` lifecycle is untouched, and the deletion is still
performed as its controller's effect.

### Why no new window was needed

The combined end-of-turn window already existed. `runTimingWindow` fires the `OnEndTurn`
System-A window inside
`withPendingSubTriggers(["endOfTurn", "endOfOpponentTurn"], …)`, which arms the matching watchers
and exposes them to the resolver through `pendingWindowCollected`, so a delayed deletion has
always been in the same simultaneous pool as the printed [End of Your Turn] effects. That is why
Q5564 (both effects the turn player's) already worked. The only thing missing was the ordering
seat, which is why the fix is a field rather than a new collection pass.

## Modes preserved

`delayedDeletePlayed`'s three timings — `endOfOwnerTurn` (default), `endOfOpponentTurn`
(BT23-048, Q5567) and `endOfCurrentTurn` (BT23-025, Q5563/Q5564) — are untouched:
`src/engine/effects/delayedDeletePlayed.test.ts` covers all three from both seats plus both
Q5564 ordering answers, and passes unchanged.

## Files changed

- `apps/api/src/engine/effects/collect.ts` — `CollectedEffect.orderingSeat`.
- `apps/api/src/engine/effects/stack.ts` — `orderingSeatOf`; used by `orderTurnPlayerFirst` and
  the frontmost-group filter.
- `apps/api/src/engine/effects/subtriggers.ts` — `SubTriggerSubscription.orderedByTurnPlayer`.
- `apps/api/src/engine/effects/primitives.ts` — `delayedDeletePlayed` sets the flag.
- `apps/api/src/engine/GameEngine.ts` — `subTriggerAsCollected` projects the flag onto
  `orderingSeat`; `runSubTriggersInChosenOrder` derives its priority seat the same way.

## Proof

- `BT23-037.test.ts` "offers the turn player the end-of-turn processing order" (Q5566): seat 1's
  BanchoLeomon [End of Your Turn] against seat 0's delayed deletion. Asserts a real pending
  `orderTriggers` decision addressed to seat 1 carrying two trigger keys, with
  `autoOrderTriggers: false` so no automation can hide it.
- `BT23-048.test.ts` "offers the turn player the order of the end-of-turn trigger and this
  deletion (Q5568)": seat 1's EX9-033 Kaguyamon against seat 0's delayed deletion; same
  assertions, then answers the decision (deletion first) and lets the turn finish.

## Fixture note: `settleAcrossTimers`

Both reproducers previously waited with `settle`, which drains only the microtask queue. The turn
loop parks on a timer between phases, so a decision raised on the far side of a phase boundary is
invisible to `settle` however long it spins — the reason both tests reported "no decision" even
after the seam was fixed. `settleAcrossTimers` (new, in `engine/testkit/harness.ts`) alternates
`settle` with a real timer tick and returns as soon as the predicate holds.
