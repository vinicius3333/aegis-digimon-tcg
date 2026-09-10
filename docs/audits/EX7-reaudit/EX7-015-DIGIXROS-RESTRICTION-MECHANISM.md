# EX7-015 Q3840 DigiXros restriction mechanism

## Result

**Fixed and verified.** Q3840 now passes as an ordinary public card test.

## Causal diagnosis

`RestrictCostReduction` records a seat-level play-cost block in the continuous
effect ledger. The normal modifier and pay-time paths already consult that
ledger. `validateDigiXros`, however, calculated the printed/continuously
adjusted base and then unconditionally subtracted DigiXros's per-material
reduction. That made the intrinsic DigiXros reduction bypass the generic
all-player play-cost restriction.

The pre-fix public fixture used BT12-074 (printed play cost 4) with one legal
BT10-008 material and 10 memory. The observed result was memory 8 (4 - 2),
while Q3840 requires memory 6: the play remains legal, but the material's
cost reduction is suppressed.

## Narrow fix

`DigiXrosDeps` now has an optional `canReducePlayCost(state, seat)` predicate.
`GameEngine.digiXrosDeps()` binds it to
`!continuous.blocksCostReduction(seat, "play")`. The validator uses a zero
per-material reduction when the predicate is false, while preserving material
legality, placement, payment, and the existing finalize-cost hook.

The predicate is optional for compatibility with direct action consumers; in
its absence, prior unrestricted DigiXros behavior remains unchanged.

## Regression proof

Red baseline before the fix:

- EX7-015 focused suite: **1 file passed; 5 passed, 1 expected fail**.
- The failing Q3840 assertion received memory 8 instead of 6.

Green after the fix:

- EX7-015 plus this mechanism test: **2 files passed; 8 passed**.
- Relevant interaction/conformance set: **3 files passed; 56 passed**.
- Full engine suite: **260 files passed; 7,301 passed**.
- Workspace/API typecheck: passed.
- Scoped Oxlint, Oxfmt check, and `git diff --check`: passed.

The mechanism test has two cases: the restricted path pays 4 and retains the
material under BT12-074; the unrestricted path still pays 2 after the same
single-material DigiXros reduction. The test includes a
`FAILS-WHEN-REVERTED` note tied to the new dependency predicate.

No retained seam remains for Q3840. No git write was performed, and no ledger,
RUN, REVIEW-NOTES, catalog, shared, or other-card file was edited.
