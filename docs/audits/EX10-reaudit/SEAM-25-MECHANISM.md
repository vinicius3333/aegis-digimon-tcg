# Seam 25 — `whole-clause-cost-gate`

## Mechanism

`Action.cost` gates only the action that carries it. EX10-052 Lucemon: Chaos Mode prints

> [When Digivolving] [When Attacking] By trashing 1 card in your hand, your opponent may delete 1
> of their Digimon or Tamers. If this effect didn't delete, ＜Recovery +1 (Deck)＞

The trash is a whole-clause optional processing condition (Comprehensive §15-7-2: "if the content
of the optional processing conditions isn't executed, the processing after the conditions can't be
executed"). The IR carried it on the `Delete` action only, so with an empty hand the `Delete` was
skipped — correctly — and the next action, the `ifThisEffectDidNotDelete` `SecurityManipulation`,
still resolved. The card recovered a security card without ever paying its printed cost.

`CardEffect` had `condition` but no `cost`, so there was no place to say "this cost gates the
clause".

## Fix

1. **Shared IR** — `packages/shared/src/effects/ir/card.ts`: new optional `CardEffect.cost?: Cost`,
   documented as paid once for the whole clause. `Action.cost` keeps its per-action meaning.
2. **Interpreter** — `apps/api/src/engine/effects/interpreter/effect.ts`:
   - `runEffect`: after the `condition`/`turnCondition` gates and on the same context the actions
     run on, `canPayCost` then `payCost` the clause cost. Failure returns before any action runs
     (restoring the caller's `effectRestrictions`). Because payment happens before the action loop,
     an action that aborts inside the clause — an opponent declining the optional Delete — cannot
     refund it.
   - `canActivateEffect`: an unpayable clause cost refuses the declaration outright, matching the
     resolution gate (CR §15-8-4-3-1).
3. **Card** — `apps/api/src/cards/EX10/EX10-052.ts`: the hand-trash cost moved from each
   `Delete` action to its `CardEffect` for both the `WhenDigivolving` and `WhenAttacking` clauses.
   The `AllTurns` leave-replacement clause is unchanged (it has no printed cost).

## Red / green

Red was reproduced by disabling the `runEffect` payment block while keeping the new card IR:

```
pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch15-02-timing-and-resolution.test.ts \
  src/cards/EX10/EX10-052.test.ts --maxWorkers=1 --no-file-parallelism
  -> Test Files  2 failed (2)
  -> Tests  6 failed | 31 passed (37)
     × 15-7-1: a payable clause cost is paid exactly once and the whole clause then resolves
     × 15-7-2: declining the opponent's optional inside the clause does not refund the paid cost
```

Green, with the fix in place:

```
pnpm --filter @aegis/api exec vitest run src/cards/EX10/EX10-052.test.ts \
  src/engine/conformance/ch15-02-timing-and-resolution.test.ts src/engine/effects \
  --maxWorkers=1 --no-file-parallelism
  -> Test Files  65 passed (65)
  -> Tests  1230 passed (1230)

pnpm typecheck                            -> exit 0
oxlint <changed files>                    -> clean
oxfmt --check <changed files>             -> All matched files use the correct format.
```

The wider gate

```
pnpm --filter @aegis/api exec vitest run src/cards/EX10/EX10-052.test.ts src/engine/conformance \
  src/engine/effects --maxWorkers=1 --no-file-parallelism
  -> Test Files  2 failed | 90 passed (92); Tests  2 failed | 1600 passed (1602)
```

fails only in two other lanes' files, reproducibly and independently of this change (both are
`settle` timeouts now that seam 32 makes `settle` throw):
`ch11-attacking.test.ts` "11-3-1: a real [Counter] card activates through the window" and
`ch15-03-targeting-and-selection.test.ts` "offers the choice even when the immune permanent is the
ONLY candidate" (the targeting lane is editing `interpreter/targeting/permanents.ts` in the same
tree). Neither card carries a `CardEffect.cost`, so the new code path never runs for them.

## New coverage

`apps/api/src/engine/conformance/ch15-02-timing-and-resolution.test.ts` gains
`§15-7-2 Whole-clause optional processing conditions (comprehensive-0169)` with three cases driven
through the public attack intent on EX10-052:

- an unpayable clause cost skips every action of the clause (no deletion offer, no Recovery);
- a payable clause cost is paid exactly once and the whole clause resolves;
- the opponent declining the optional Delete inside the clause does not refund the paid cost.

## Production behaviour change

Only cards that carry `CardEffect.cost` change behaviour, and today that is EX10-052 alone:

- with an empty hand its `[When Digivolving]`/`[When Attacking]` clause now does nothing at all —
  previously it recovered a security card for free;
- with a payable hand, the trash is paid once at the head of the clause instead of at the `Delete`
  action, so the cost is spent even when the opponent declines the deletion (this was already the
  observed behaviour, and the existing suites pin it).

`canActivateEffect` additionally refuses to offer a clause whose clause cost cannot be paid.

## Candidates to migrate

Not re-authored here. Heuristic sweep over `packages/shared/src/effects/effects.json` for
"cost on the first action, further actions after it, no `abortOnDecline` gate":

```
node -e "const e=require('./packages/shared/src/effects/effects.json');
for(const [id,rec] of Object.entries(e))for(const eff of rec.effects||[]){const a=eff.actions||[];
if(a.length>1&&a[0]&&a[0].cost&&!a.slice(1).some(x=>x.cost)&&a[0].abortOnDecline!==true)
console.log(id,eff.trigger,a.map(x=>x.kind).join('+'));}"
```

19 cards, 23 clauses: BT4-062, BT8-102, BT9-102, BT15-100, BT16-081, BT19-084, BT19-092, BT20-098,
BT25-014, EX4-071, EX5-069, EX7-064, EX10-052 (done), EX12-030, LM-005, P-243, ST4-13, ST5-13,
ST6-13.

Each needs its printed text read before migration: a leading "by X," that governs the sentence is a
clause cost, whereas a cost belonging only to the first of two independent sentences is not. Cards
whose first action already carries `abortOnDecline: true` (139 further clauses) get the ordered
abort for free and are excluded above, but the abort only fires on a DECLINE — an unpayable cost on
one of those is worth a second look during the sweep.

Related and still open: seam 17 `return-with-cost-skips-cost-without-target` wants the same ruling.
