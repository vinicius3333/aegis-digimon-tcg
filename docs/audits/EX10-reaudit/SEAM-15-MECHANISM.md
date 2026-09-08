# Seam 15 `unaffectable-still-choosable` — FIXED (flag-gated)

## Mechanism

Comprehensive Rules §15-15-5-3: a permanent that "isn't affected by effects" can still be CHOSEN
for an effect; the effect then does nothing to it. The rules' own worked example is BT1-070
Kuwagamon's "[On Play] Suspend 1 of your opponent's Digimon".

The candidate pool was never the problem. `resolvePermanentTargets`
(`apps/api/src/engine/effects/interpreter/targeting/permanents.ts`) already calls
`candidatePermanents` with `includeUnaffectable: true` and strips immune ids from the RESULT via
`filterAffectable`, so an immune permanent is offered whenever a prompt happens at all.

The gap was the auto-resolve shortcut. When the pool is no larger than the wanted count and the
target is not `upTo`/`forceSelection`, the function resolves silently without asking. With the
opponent's only Digimon immune, the pool is `[immune]`, `want` is 1, so no `chooseTargets`
decision was ever raised — the player was never offered the choice §15-15-5-3 grants them. The
end state (nothing suspended) was already correct; only the decision was missing.

## Fix

1. New IR field `Target.allowUnaffectableChoice`
   (`packages/shared/src/effects/ir/filters/filter.ts`, beside the existing `forceSelection`).
2. `resolvePermanentTargets` skips the auto-resolve shortcut when the flag is set AND the pool
   holds a permanent this source cannot affect (`holdsUnaffectableCandidate`, computed with the
   same `filterAffectable` used to strip the result). Everything else is unchanged: the prompt
   still offers the full pool and the result is still filtered, so the observable outcome of a
   choice never changes — only whether a choice is presented.
3. Flag set on BT1-070's Suspend target, in the card module and in its `effects.json` record.

Plain mandatory targeting without the flag keeps the quieter auto-resolve, as the ENGINE-LANE-1
design proposal asked.

## Red → green

```
pnpm --filter @aegis/api exec vitest run src/cards/EX10/EX10-021.test.ts \
  src/engine/conformance src/engine/effects --maxWorkers=1 --no-file-parallelism
```

EX10-021 `KB Q5067` before the fix (with `it.fails` flipped to `it`):

```
AssertionError: expected [] to include 'inst-1'
 Tests  1 failed | 14 skipped (15)
```

New conformance case
(`src/engine/conformance/ch15-03-targeting-and-selection.test.ts` §15-15-5, "offers the choice
even when the immune permanent is the ONLY candidate") with the flag removed from BT1-070:

```
Error: settle: predicate never held within 500 ticks ... Predicate: () => s.decisions.some((d) => d.req.kind === "chooseTargets")
 Tests  1 failed | 10 skipped (11)
```

After:

```
src/cards/EX10/EX10-021.test.ts                       Tests  15 passed (15)
src/engine/conformance/ch15-03-targeting-and-selection.test.ts   Tests  11 passed (11)
full run: Test Files 1 failed | 91 passed (92) | Tests 1 failed | 1600 passed (1601)
```

The single failure is `ch11-attacking.test.ts` "11-3-1: a real [Counter] card activates through
the window via the respondCounter verb (EX12-033)", which fails identically on a re-run and does
not reference BT1-070. It comes from concurrent edits by other lanes in this tree
(`engine/testkit/harness.ts`, `interpreter/effect.ts`, `interpreter/actions/subTrigger.ts` are all
modified by other agents); it is not caused by this seam.

`pnpm typecheck` passes; `oxlint` and `oxfmt --check` are clean on every changed file.

## Test-assertion correction

The retained red asserted `candidateInstanceIds` would contain the immune permanent's
`topCard.instanceId`. A `chooseTargets` request for permanent targets carries PERMANENT ids
(`decisionApi.ts` passes `resolvePermanentTargets`' `permanentId` list straight through, as the
existing §15-15-5 conformance case already asserts). The assertion now checks
`s.perm("sleep").permanentId` and adds an end-state check that the immune Digimon stays
unsuspended. The rule under test is unchanged.

## Production behaviour change

Only for targets carrying the flag (today: BT1-070). Where an opponent-effect target pool
contains an immune permanent and would previously have auto-resolved, the controller now gets a
`chooseTargets` decision. The chosen permanent is still filtered out of the effect's result, so
no game outcome changes; what changes is that an extra decision is raised (clients must answer
it) and the play is recorded as an explicit choice.

## Cards that should adopt the flag (not edited)

219 printed cards match a "select 1 of your opponent's Digimon … Then, / That Digimon …" shape,
where burning the effect on an immune target is a real decision. Full list reproducible with a
scan of `packages/shared/src/cards/data/cards.json` for
`1 of your opponent's Digimon[^.\[\]]{0,90}[.,]\s*(Then,|That Digimon)`. First 24:

AD1-006, AD1-009, AD1-018, AD1-024, BT10-066, BT10-102, BT10-103, BT11-009, BT11-055, BT11-057,
BT11-097, BT11-099, BT12-057, BT12-099, BT12-100, BT12-101, BT12-103, BT12-111, BT13-033,
BT13-053, BT13-059, BT13-095, BT13-104, BT13-105.

Adoption needs a per-card judgement (does the second clause actually depend on the first
selection?), so it is deliberately left to a follow-up pass. A durable alternative worth
considering at closeout: drop the flag and make `resolvePermanentTargets` always prompt when the
auto-resolve pool is entirely unaffectable. That is engine-wide conformance with no per-card
bookkeeping, at the cost of a new mandatory decision on boards that used to no-op silently.
