# BT18 Card Audit Ledger

Status: complete — all 102 cards are verified at 10/10.

The authoritative completion report is `docs/audits/BT18-AUDIT.md`. Each card
from `BT18-001` through `BT18-102` has:

- one direct executable module registered exclusively through `registerIrCard`;
- one focused test file with positive behavior and applicable boundary/stack proof;
- one persisted-equality assertion in `BT18-catalog-sync.test.ts`;
- `coverage: "full"`, no residual clauses, and green bounded collection/mechanism gates.

Final collection result: 108 files and 656 tests passed. Mechanism result: 500
tests passed across the selected digivolution, combat, timing, targeting,
continuous-effect, subtrigger, leave-prevention, and primitive suites. Shared
build, workspace typechecks, lint, formatting, and `git diff --check` passed.
