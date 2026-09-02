# BT15 Card Audit Ledger

Status: complete — all 102 cards are verified at 10/10, including typed revalidation.

The authoritative completion report is `docs/audits/BT15-AUDIT.md`. Each card
from `BT15-001` through `BT15-102` has:

- one direct executable module registered exclusively through `registerIrCard`;
- one focused test file with positive behavior and applicable boundary/stack
  proof;
- one persisted-equality assertion in `BT15-catalog-sync.test.ts`;
- `coverage: "full"`, no residual clauses, no `@ts-nocheck`, and green bounded
  collection/mechanism gates.

Typed revalidation result: 25 focused files and 143 tests passed. Final collection result: 103
files and 646 tests passed. Mechanism result: 774 tests passed across the selected restriction,
effect-resolution, combat, action, targeting, continuous-effect, subtrigger, and
leave-prevention suites. The shared suite passed 133 tests, synchronized state arrays passed 49
tests, the web effect projection passed 131 tests, and the synchronization tool passed 10 tests.
The shared build and all workspace typechecks passed serially. Oxlint, Oxfmt, generated-data
validation, and `git diff --check` passed.

The persisted catalog is generated from the authoritative modules with
`pnpm effects:sync:set -- --set BT15` and verified with the matching
`effects:check:set` command plus `--base origin/main`. The scoped synchronization recalculated all
102 BT15 records, changed 80 of them semantically, and changed no semantic or byte content outside
the set. `effects.json` was not edited manually.
