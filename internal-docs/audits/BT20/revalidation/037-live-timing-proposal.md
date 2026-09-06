# BT20-037 live timing-lock proposal

## Finding

CR 15-11-2-2 and KB Q4348 require BT20-037's “none of their Digimon can activate [On Play] effects” rule to apply to qualifying Digimon that enter after the When Digivolving effect resolves. The current IR action resolves a permanent target list, and `runRestrictionAction` currently calls `disableTimingEffect(id, ...)` once per resolved id. `EffectTimingDisable` therefore stores only a `permanentId`; unlike `Restrict` with `whileMatchesTargetFilter: true`, it cannot see later entrants. This is a confirmed shared-engine fidelity gap, independent of the card's existing `unsuspend` player restriction.

## Smallest suggested patch

Reuse the player-scoped pattern already used by `ContinuousEffectLedger.addPlayerRestriction` and `ctx.fx.restrictPlayer`:

1. Add `whileMatchesTargetFilter?: boolean` to `DisableTimingEffectAction` in `packages/shared/src/effects/ir/actions/statics.ts`, with the same meaning as the existing `RestrictAction` field: the target filter remains live for the duration and includes later matching permanents.
2. Add an optional `disableTimingEffectsForPlayer?(seat, timings, duration, matches)` method to `EffectContext`. Its callback should be the same `permanentMatchesFilter(ctx, permanent, filter, ctx.source)` closure used by `Restrict`.
3. Add a `PlayerTimingDisable` ledger entry beside `PlayerRestrictionEntry`:

```ts
interface PlayerTimingDisable {
  seat: Seat;                 // restricted controller
  ownerSeat: Seat;            // source owner; frames UntilOpponentTurnEnd
  timings: DisableTimingMask[];
  duration: EffectDuration;
  matches: (permanentId: string) => boolean;
  sourcePermanentId?: string; // provenance/debugging only
  sourceCardId?: string;
}
```

Provide `addPlayerTimingDisable(...)` and make `isTimingEffectDisabled(permanentId, timing)` check both the existing permanent entries and player entries. Resolve a permanent's controller with `anyControllerSeatOf`, then require matching timing, seat, and live predicate. Keep the predicate evaluated at read time so new arrivals are covered and cards that stop matching cease to be covered.
4. In `runRestrictionAction`'s `DisableTimingEffect` case, when `whileMatchesTargetFilter === true`, require `target.filter` and `target.count === "all"`; enumerate `seatsForController(ctx, filter)` and call the new player-scoped verb with a callback that checks `permanentMatchesFilter`. Return without resolving a snapshot. For other DisableTimingEffect actions, preserve the current per-permanent path unchanged. Reject or report malformed dynamic actions rather than silently widening a non-`all` target.
5. Use the existing duration framing: the player entry stores `ownerSeat`, so `sweep` calls `clearsAt(entry.duration, boundary, entry.ownerSeat, sweepSeat)`, matching `playerRestrictions`. Add the new collection to `clearContinuous` only if it is explicitly marked continuous; this one-shot duration grant must survive ordinary recomputes. Add filtering to `reset`; do not drop it merely because a newly affected permanent leaves play. If source provenance is retained, `dropPermanent` may clear only entries whose `sourcePermanentId` is intentionally source-anchored; BT20-037's resolved “until end of their turn” rule should remain through source departure just like the existing player restriction.
6. Keep `isTimingEffectDisabled`'s existing `beAffected` immunity check in `primitives.ts`; the new player lookup belongs inside the ledger, so all timing consumers automatically share the same immunity and timing-mask behavior. Add a focused ledger test for a matching permanent entering after installation, a nonmatching permanent, duration sweep, and reset. Add an interpreter test proving the dynamic action calls the player-scoped verb rather than snapshotting IDs.

This avoids a second ad hoc “future On Play” flag and preserves the existing owner-seat duration and source provenance conventions. A separate `disableTimingEffectsForPlayer` name is preferable to overloading `disableTimingEffect` with an optional permanent ID because it makes the restricted-controller semantics explicit at the context boundary.

## Public BT20-037 mechanism proof

Add a public test in `BT20-037.test.ts` after the engine patch:

```ts
// Build Valdur through the legal two-level-6 post-DNA route already documented by BT20-037.
// Resolve its When Digivolving lock against an opponent's existing Digimon/Tamer.
const before = opponent.hand.length;
expect(applyIntent(1, { type: "playCard", instanceId: newLiollmon })).toEqual({ ok: true });
await settle(() => opponent.battleArea.some((p) => p.topCard.instanceId === newLiollmon));
expect(opponent.hand.length).toBe(before - 1);
expect(opponent.deck.map((c) => c.instanceId)).toEqual(deckBefore.map((c) => c.instanceId));
expect(opponent.hand).not.toContainEqual(expect.objectContaining({ cardId: "BT20-030" }));
```

Use `BT20-030` (Liollmon) with a deck containing a known ACCEL Digimon card so its On Play reveal would produce a visible hand/deck change. The Liollmon must be played by the opponent after the lock resolves; the final assertion must show it entered the battle area while its On Play effect did not activate. Use neutral security and enough deck cards. A companion assertion should place or play a newly arriving opponent Digimon with a Reboot/unsuspend-relevant state, then verify the same live player lock blocks unsuspend until the opponent-turn boundary. After `endMainPhaseIfOpen(1)` and a completed real opponent turn, repeat the On Play fixture and assert the effect now resolves, proving duration expiry.

The test must also retain an existing nonmatching/own-controller control and assert its On Play/unsuspend behavior is unaffected. All assertions occur after `settle()` has no pending decision and the final zones/deck/hand are observable; a restriction-ledger predicate alone is insufficient.

## Affected paths and acceptance

- `packages/shared/src/effects/ir/actions/statics.ts`: action field/type documentation.
- `apps/api/src/engine/effects/EffectContext.ts` and `context.ts`: optional player-scoped timing-disable verb and static-context refusal wiring.
- `apps/api/src/engine/effects/continuous.ts`: entry, live lookup, duration sweep, continuous-clear policy, reset, and source provenance.
- `apps/api/src/engine/effects/primitives.ts`: verb implementation and existing immunity boundary.
- `apps/api/src/engine/effects/interpreter/actions/restrictions.ts`: dynamic target dispatch.
- `apps/api/src/engine/effects/continuous.test.ts` and interpreter mechanism tests: later entrant, filter, expiry, reset, and snapshot-vs-live regression.
- `apps/api/src/cards/BT20/BT20-037.test.ts`: public BT20-037 acceptance, nonmatching/controller control, and post-expiry resolution.

The shared change is complete only when a later matching Digimon's On Play effect is suppressed, a nonmatching/controller control resolves normally, the same restriction blocks the relevant unsuspend window, and the live entry disappears exactly at the opponent-turn boundary. No engine files were changed as part of this proposal.
