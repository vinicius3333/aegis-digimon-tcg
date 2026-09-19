# "If during an attack" after a mid-attack digivolve

## Printed clause

EX13-057 Grademon and BT20-053 both print an [On Play]/[When Digivolving] rider of the form
"If during an attack, ... +5000 DP and it isn't affected by your opponent's Digimon
effects". EX13-055 Raptordramon's [When Attacking] clause digivolves its own attacker
into EX13-057, so the rider's window opens while an attack is open.

## Where it lives

- `apps/api/src/engine/effects/interpreter/conditions.ts` — `evaluateCondition`,
  `case "duringAttack"`, reads both `ctx.trigger.attackerPermanentId` and the live combat
  controller through `ctx.fx.isAttackResolving()`.
- `apps/api/src/engine/GameEngine.ts` — `fireEnteredByEffect` copies
  `this.combat?.currentAttackerId` onto every effect-driven entry trigger, including the
  [When Digivolving] one.

## Verified paths

Driven through the public `attack` intent, a mid-attack digivolution copies the current
attacker onto the [When Digivolving] trigger, and the rider applies: recipient at 14000 DP
with a Digimon-sourced `beAffected` immunity.

The failure reported against `conditions.ts` came from the test fixture, which opened the
[When Attacking] window with `advance().fireForPermanent(EffectTiming.OnUseAttack, ...)`.
That injected timing declares no attack, so `combat.currentAttackerId` is undefined and the
rider correctly does not apply — the game is not inside an attack.

The EX13-060 path is different. Alphamon plays Grademon, then its simultaneous watcher is
ordered first and makes that Grademon attack. Grademon's already-pending [On Play] trigger
resolves inside the open combat window, but its trigger object predates the attack and has
no `attackerPermanentId`. Checking only that local trigger incorrectly rejected the rider.

## Fix

`duringAttack` now accepts either form of truthful evidence: an attack-carrying trigger or
the combat controller's currently open attack. It remains false when neither exists.

The EX13-057 proof declares a real attack:

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

`apps/api/src/cards/EX13/EX13-060.test.ts` — "lets BT20-053/EX13-057 resolve its pending
[On Play] rider during the attack Alphamon triggers".

`apps/api/src/engine/effects/interpreter.test.ts` — "recognizes both an attack-carrying
trigger and the live combat window".

## Red then green

- EX13-060/Grademon reproduction before the fix: both variants attacked and removed
  Security, but remained at 7000 DP instead of 12000 DP and had no immunity.
- After: both variants gain +5000 DP and Digimon-effect immunity in the live attack window.
- The earlier injected-timing failure remains invalid: without a trigger attacker or open
  combat window, the condition correctly stays false.

## Production trace

A read-only review of the API logs around the report found the exact BT20-053 sequence on
2026-09-19 (identifiers omitted):

1. 18:03:58Z — EX13-060's [End of Your Turn] effect played BT20-053 and opened an
   `orderTriggers` decision containing BT20-053 [On Play] and EX13-060 [Your Turn].
2. 18:04:03Z — EX13-060 was ordered first and offered its optional attack.
3. 18:04:09Z — BT20-053 declared the attack, then its pending [On Play] triggered inside
   that attack.
4. 18:04:13Z — BT20-053's [On Play] resolved, but the following Security battle recorded
   the attacker at 7000 DP instead of the expected 12000 DP.

This trace proves the report's ordering and symptom independently of the regression fixture.
