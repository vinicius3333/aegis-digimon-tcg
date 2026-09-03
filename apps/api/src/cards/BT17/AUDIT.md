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

The post-reconciliation typed revalidation removed all 100 remaining
`@ts-nocheck` directives, leaving zero suppressions in the collection. The
persisted snapshot is generated from the executable modules rather than edited
manually.

Final collection result: 109 files and 675 tests passed. Selected mechanism
results: 645 core/cross-cutting tests, 138 primitive tests, 133 shared-effect
tests, 128 web projection tests, and 18 synchronized-state tests passed. Shared,
API, and web typechecks, lint, formatting, and `git diff --check` passed.
