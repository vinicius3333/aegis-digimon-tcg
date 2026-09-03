# BT14 Card Audit Ledger

Status: complete — all 102 cards are verified at 10/10, including typed revalidation.

The authoritative completion report is `docs/audits/BT14-AUDIT.md`. Each card
from `BT14-001` through `BT14-102` has:

- one direct executable module registered exclusively through `registerIrCard`;
- one focused test file with positive behavior and applicable boundary/stack
  proof;
- one persisted-equality assertion in `BT14-catalog-sync.test.ts`;
- `coverage: "full"`, no residual clauses, no `@ts-nocheck`, and green bounded
  collection/mechanism gates.

Typed revalidation result: 17 focused files and 90 tests passed. Final collection
result: 103 files and 540 tests passed. Mechanism result: 774 tests passed across
the selected effect, targeting, continuous-effect, subtrigger, card-data, and
evolution-lock suites. The shared suite passed 133 tests, synchronized state
arrays passed 49 tests, the web effect projection passed 131 tests, and the
synchronization tool passed 10 tests. The shared build and all workspace
typechecks passed serially. Oxlint, Oxfmt, generated-data validation, and
`git diff --check` passed.

The persisted catalog is generated from the authoritative modules with
`pnpm effects:sync:set -- --set BT14` and verified with the matching
`effects:check:set` command plus `--base origin/main`. The scoped synchronization
recalculated all 102 BT14 records, changed 59 of them semantically, and changed no
semantic or byte content outside the set. `effects.json` was not edited manually.
