# Player-wide DP modifier mechanism (Q5629)

## Read-only reproduction

The retained BT24-041 test was run without modifying the engine:

```text
pnpm --filter @aegis/api exec vitest run src/cards/BT24/BT24-041.test.ts -t 'future-entrant' --maxWorkers=1 --no-file-parallelism
```

The first failing assertion was:

```text
AssertionError: expected 12000 to be 7000
  BT24-041.test.ts:190:44
```

The existing permanent had already recomputed to 5000 after EX4-074's
player-wide -5000 effect, while the later-played Minervamon remained at its
printed 12000 DP.

## Mechanism trace

`board.ts` routes a `ModifyDP` action with `playerWide: true` to
`ctx.fx.modifyPlayerDP`. `ModifierLedger.addPlayerDpModifier` immediately
recomputes every currently present permanent for the affected seat. Future
entrants are expected to receive the same player-wide delta when their DP is
initialized or recomputed.

## Qualified cause and fix

The corrected BT24-041 reproduction removed the illegal Digi-Egg setup, uses a
real turn, and drains the entry windows completely (`memory=3`, Main phase,
seat 0, no pending decision). With the Homeros confounder removed, the
existing BT24-011 is correctly `5000`, while the newly played Minervamon stays
at its printed `12000` instead of `7000`. EX4-074 and Minervamon effects have
both resolved, so this is not a stale UI projection or timing race.

The cause is the entrant lifecycle: the manual-play and shared effect
`placePermanent` constructors seed
`currentDP = baseDP`, while `addPlayerDpModifier` only recomputes permanents
already present when the player-wide modifier is installed. Continuous passes
also only revisit their seeded/live IDs; they do not automatically apply the
existing player-wide ledger to a newly created ID. The smallest fix is an
entrant-local recompute immediately after each new permanent is appended, before
entry timing and rule processing. Manual play uses an injected callback;
effect-driven hand/security/token/DigiXros-style placement uses the existing
`PrimitivesEngine.modifiers` ledger directly. This preserves the existing
DP-zero rule ordering. DNA digivolution has a separate constructor and is not
claimed by this regression; its existing continuous-recompute path remains
unchanged and requires independent coverage.

## Independent acceptance

Root reproduced the fully drained 12000-versus-7000 red before the fix and
then passed the complete BT24-041 suite (12 tests). The public sequence still
performs three De-Digivolve operations before the effect-played 0-DP Iliad
leaves; Minervamon now exposes currentDP 7000.

Root action/primitive/modifier/card verification passed 4 files / 221 tests.
The added primitive cases cover negative and positive player-wide DP on a
hand entrant, negative DP on a security entrant, duration expiry, and a second
entrant after expiry. Existing modifier tests cover ledger immunity behavior;
these new tests do not independently prove every printed immunity-on-entry
combination or the separate DNA constructor.

The full BT24/conformance/combat/effects/cards gate passed 228 files / 3200
tests, and fresh shared/API/web typecheck passed. Scoped engine lint and
formatting are clean. A pre-existing unused AsyncLocalStorage import was
removed from GameEngine after confirming it was unused in HEAD as well.
