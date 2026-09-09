# EX9-003-OPT-RESET mechanism audit

## Result

No engine lifecycle defect exists in the current engine. The inherited
`wouldDigivolve` replacement is re-derived after the owner-turn boundary, and
its once-per-turn ledger is reset at `ownerTurnStart`.

The retained proof now selects EX9-030's alternate Machine/DM cost explicitly.
That matters because EX9-030 also matches its normal Yellow Lv.4 cost; without
`useAlternateCost: true`, the engine correctly chooses cost 4 and memory 3→0.
With the explicit alternate route, Tokomon's reduction applies and memory 3→1.

## Evidence

- Focused EX9-003: 7/7 passed.
- EX9-003 plus EX9-070: 33/33 passed.
- Relevant engine regressions: `subtriggers.test.ts`,
  `continuousRecomputeConcurrency.test.ts`, and `modifiers.test.ts` — 66/66
  passed.
- `pnpm typecheck`: passed, including the API typecheck and EX9-005 typing.
- `oxlint`, `oxfmt --check`, and `git diff --check`: passed.

## Conclusion

The named `EX9-003-OPT-RESET` seam is green through public intents and requires
no reusable engine change. The fix is confined to selecting the intended
alternate evolution cost and retaining the now-green reset regression.

No Git writes were performed.
