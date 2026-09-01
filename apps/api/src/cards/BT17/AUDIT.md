# BT17 Card Audit Ledger

Status: complete — all 102 cards are verified at 10/10.

The authoritative completion report is `docs/audits/BT17-AUDIT.md`. Each card
from `BT17-001` through `BT17-102` has:

- one direct executable module registered exclusively through `registerIrCard`;
- one focused test file with positive behavior and applicable boundary/stack
  proof;
- one persisted-equality assertion in `BT17-catalog-sync.test.ts`;
- `coverage: "full"`, no residual clauses, and green bounded
  collection/mechanism gates.

Final collection result: 109 files and 674 tests passed. Mechanism result: 854
tests passed across the selected continuous-effect, DNA, timing, targeting,
leave-replacement, event-publication, and primitive suites. Shared and API
builds, workspace typechecks, lint, formatting, and `git diff --check` passed.
