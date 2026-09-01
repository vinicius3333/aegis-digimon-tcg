# BT14 Card Audit Ledger

Status: complete — all 102 cards are verified at 10/10.

The authoritative completion report is `docs/audits/BT14-AUDIT.md`. Each card
from `BT14-001` through `BT14-102` has:

- one direct executable module registered exclusively through `registerIrCard`;
- one focused test file with positive behavior and applicable boundary/stack
  proof;
- one persisted-equality assertion in `BT14-catalog-sync.test.ts`;
- `coverage: "full"`, no residual clauses, and green bounded
  collection/mechanism gates.

Final collection result: 103 files and 537 tests passed. Mechanism result: 700
tests passed across effect registration, reducer projection, primitives,
resolution, combat, targeting, and leave-prevention suites. The focused
correction suite passed 56 tests, while the synchronized-array and
synchronization-tool suites passed 7 and 5 tests respectively. Shared and API
builds, workspace typechecks, lint, changed-file formatting, generated-data
validation, and `git diff --check` passed.

The persisted catalog is generated from the authoritative modules with
`pnpm effects:sync:set -- --set BT14` and verified with the matching
`effects:check:set` command plus `--base origin/main`. The scoped synchronization
changed 57 BT14 records and no record outside the set.
