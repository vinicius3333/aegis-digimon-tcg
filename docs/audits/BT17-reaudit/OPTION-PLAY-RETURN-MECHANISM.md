# Playing an Option that returns a permanent is not broken (lanes 25, 66, 24)

Status: **not an engine defect.** A regression test now pins the endpoint:
`apps/api/src/engine/optionPlayReturn.test.ts`.

## The report

Three lanes recorded the same shape: BT15-090 Fox Fire (and BT6-098) "played as an Option
leaves the hand and spends memory, but never returns the target — no decision is raised and
the card ends in no zone". BT17-092 (Q2876), BT17-100 (Q2898) and BT17-025 all cite it.

## What actually happens

The path works. Playing Fox Fire with a blue Digimon on the field, against a level 3
opponent:

```
{"ba1":[], "hand1":["BT1-010"], "trash0":["BT15-090"], "mem":6}
```

The target is in the opponent's hand, the used Option is in its owner's trash, and 4 memory
was charged from 10. `GameEngine.continueMainVerb` is a plain promise chain with no timer
boundary, so an ordinary `settle` reaches this state.

## The two ways the reported symptom is produced

**A rejected declaration.** An Option needs a Digimon or Tamer of a matching colour on the
field (comprehensive.md §4-22-2). Fox Fire is blue; with a red-only board `playCard` answers
`{ ok: false, reason: "color-requirement-unmet" }` and nothing moves — no card leaves hand,
no memory is spent. A test that does not assert the intent result reads this as "the effect
did nothing". This was the first thing the reproducer hit.

**A settle that never polls.** `settle(predicate, maxTicks = 500)` takes its budget as a
POSITIONAL NUMBER. `settle(pred, { maxTicks: 200 })` coerces to `NaN`, polls zero times and
returns the pre-resolution board — which shows exactly the reported "memory gone, nothing
moved, card in no zone" snapshot, because the play verb's continuation has not run yet.

## Regression test

`src/engine/optionPlayReturn.test.ts` pins both: the full endpoint of a successful
option-with-return (target in hand, Option in trash, memory charged, no pending decision),
and the refusal with no matching-colour Digimon (nothing moved, nothing charged).

```
pnpm --filter @aegis/api exec vitest run src/engine/optionPlayReturn.test.ts --maxWorkers=1 --no-file-parallelism
Tests  2 passed (2)
```

## Action left for the coordinator

The bounce cases BT17-092 (Q2876), BT17-100 (Q2898) and BT17-025 gave up on can be authored:
give the controller a matching-colour Digimon and use the positional `settle` budget.
