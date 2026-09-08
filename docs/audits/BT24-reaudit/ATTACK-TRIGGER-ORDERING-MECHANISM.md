# Attack-trigger ordering mechanism (Q5656 / Q5775)

## Scope

This note records the engine seam for simultaneous attack triggers. It is limited to the
combat controller and `GameEngine` attack-window composition; card implementations remain
unchanged.

## Qualified reproduction

The retained public Q5656 fixtures use EX10-009 Creepymon as the attacker and BT24-078 as the
already-armed trash watcher, with explicit attacker-first and trash-watcher-first metadata. The
pre-fix controller always resolved the attacker’s System-A `OnUseAttack` window before the
System-B `whenAttacking` bus.
The public regression is now a normal test; the pristine comparison below supplies the old
engine’s literal red result.

The relevant pre-fix flow in `combat/controller.ts` was:

1. prepare the attack-time watcher snapshot;
2. resolve `OnUseAttack`;
3. resolve `OnAllyAttack`;
4. resolve the prepared watcher callbacks.

That ordering made the watcher non-orderable with the attacker’s own attack effect. The late
entry rule remains distinct: a watcher entering trash after declaration is not in the snapshot
and must not be added to this attack.

## Fix

`CombatHooks.fireAttackTiming` now accepts the declaration-time `TriggerInfo` and a flag to fold
the initially armed `whenAttacking` / `whenOpponentAttacks` subscriptions into the same
`withPendingSubTriggers(..., { onlyInitiallyArmed: true })` window as the attacker’s
`OnUseAttack` effects. The controller skips the deferred bus callback only when that combined
window reports it consumed the snapshot, preventing duplicate firing. `OnAllyAttack` effects are
collected into that same initial pending pool, so the attacking seat can order its own
`OnAllyAttack`/`OnUseAttack` effects before the non-turn watcher pool under CR §15-4-3-5-1.
Nested effect-driven attacks retain the existing fallback because their timing window is deferred.

The original declaration payload (including `attackerDPAtDeclaration` and `attackSequence`) is
passed into the snapshot; it is not reconstructed after System-A resolution. This preserves
Q5775’s event-time eligibility and turn-player ordering. Alliance still uses its existing
combined path and legacy fallback.

## Regression evidence

`apps/api/src/engine/attackTriggerOrdering.test.ts` covers:

- EX10-009-first and BT24-078-first public resolver preferences, both ending with the expected
  BT24-078 evolution and source stack;
- a public late-entry case based on Q5775, where BT24-078 enters trash after declaration and
  does not retroactively trigger;
- a public Kyubimon attack with EX2-060 `OnAllyAttack` and an opponent BT12-023 watcher,
  asserting both source events and the turn-player event's relative order.
- paired public Sakuyamon/Rika cases selecting each own `OnUseAttack`/`OnAllyAttack` effect first,
  with both trigger cards offered together and exact Plug-In, DP, suspension, and security
  endpoints.

The focused mechanism run passes all 6 tests. The two Q5656 order cases assert both the evolved
top/source stack and the candidate’s exact breeding-versus-trash destination; the two own-choice
cases assert both trigger IDs are offered and verify the selected relative order, DP, Plug-In,
suspension, and security endpoints. The controller payload regression also passes in the focused
engine run (39 tests across the mechanism and controller suites).

For a pristine old-engine comparison, the current mechanism test was copied into a temporary
`git archive HEAD` checkout at commit `2d79f54a7` (`/tmp/attack-order-head.FbTKPW`, removed after
the run) and executed with the existing linked dependencies using:

```sh
scratch=$(mktemp -d /tmp/attack-order-head.XXXXXX)
git archive 2d79f54a7 | tar -x -C "$scratch"
cp apps/api/src/engine/attackTriggerOrdering.test.ts "$scratch/apps/api/src/engine/attackTriggerOrdering.test.ts"
pnpm --dir "$scratch/apps/api" exec vitest run src/engine/attackTriggerOrdering.test.ts --reporter=verbose
rm -r "$scratch"
```

```text
Test Files  1 failed (1)
Tests       4 failed | 2 passed (6)
```

The four old-engine failures are literal missing `orderTriggers` requests: both EX10-009/BT24-078
Q5656 order cases report `expected undefined` for the trigger-card list, and both paired
Sakuyamon/Rika cases fail reading the undefined pending order request. The late-entry Q5775 case
and the opponent-priority case pass on `HEAD`. Thus the old/new comparison proves the meaningful
pooled-order behavior while identifying the two compatibility cases that are intentionally
unchanged.

## Known compatibility checks

The controller test suite confirms `OnUseAttack`, `OnAllyAttack`, and end-of-attack timing still
fire. The dedicated Alliance and legacy attack-trigger regressions for EX2-055, EX2-060, ST16-05,
and RB1-033 also pass (34 tests). The engine suite passes 215 files/6,735 tests, conformance
passes 28 files/388 tests, and API typecheck passes. A legacy unsupported-effect log is emitted
by one combat unit fixture, but the engine suite remains green.

The controller regression directly asserts declaration-time DP and attack-sequence payloads.

The subsequent root broad gate reports 351 files/8,558 tests passing, and the full API
typecheck passed at 09:04:56.
