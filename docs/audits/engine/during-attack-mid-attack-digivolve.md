# "If during an attack" after a mid-attack digivolve

## Printed clause

EX13-057 Grademon and BT20-053 both print a [When Digivolving] rider of the form
"If during an attack, ... +5000 DP and it isn't affected by your opponent's Digimon
effects". EX13-055 Raptordramon's [When Attacking] clause digivolves its own attacker
into EX13-057, so the rider's window opens while an attack is open.

## Where it lives

- `apps/api/src/engine/effects/interpreter/conditions.ts` — `evaluateCondition`,
  `case "duringAttack"`, reads `ctx.trigger.attackerPermanentId`.
- `apps/api/src/engine/GameEngine.ts` — `fireEnteredByEffect` copies
  `this.combat?.currentAttackerId` onto every effect-driven entry trigger, including the
  [When Digivolving] one.

## Expected vs actual

No engine gap. Driven through the public `attack` intent, the combat controller holds the
open attack, `fireEnteredByEffect` puts its attacker on the raised trigger, and the rider
applies: recipient at 14000 DP with a Digimon-sourced `beAffected` immunity.

The failure reported against `conditions.ts` came from the test fixture, which opened the
[When Attacking] window with `advance().fireForPermanent(EffectTiming.OnUseAttack, ...)`.
That injected timing declares no attack, so `combat.currentAttackerId` is undefined and the
rider correctly does not apply — the game is not inside an attack.

## Fix

Engine unchanged. The EX13-057 proof now declares a real attack:

```ts
s.engine.applyIntent(0, {
  type: "attack",
  attackerPermanentId: s.perm("raptor").permanentId,
  target: { kind: "player" },
});
```

This also satisfies the set's own evidence rule that injected `advance.fire*` timings earn
no behavioural credit.

## Tests

`apps/api/src/cards/EX13/EX13-057.test.ts` — "applies the rider when EX13-055 digivolves
into it mid-attack".

## Red then green

- Before, with the injected timing: `AssertionError: expected 9000 to be 14000`.
- Probe: the same fixture driven by the `attack` intent passed against **unmodified**
  engine code, which is what identified the fixture as the cause.
- After: `EX13-057.test.ts` 16 passed.
