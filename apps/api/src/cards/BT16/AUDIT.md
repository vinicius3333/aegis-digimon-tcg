# BT16 Card Audit Ledger

Status: complete — all 102 cards are verified at 10/10.

The authoritative completion report is `docs/audits/BT16-AUDIT.md`. Each card
from `BT16-001` through `BT16-102` has:

- one direct executable module registered exclusively through `registerIrCard`;
- one focused test file with positive behavior and applicable boundary/stack
  proof;
- one persisted-equality assertion in `BT16-catalog-sync.test.ts`;
- `coverage: "full"`, no residual clauses, and green bounded
  collection/mechanism gates.

Typed revalidation removed all `// @ts-nocheck` suppressions from the set,
strengthened the shared IR contracts they had hidden, and added natural DNA
watcher coverage. Final collection result: 107 files and 638 tests passed.
Mechanism result: 774 tests passed across the selected restriction,
effect-resolution, combat, subtrigger, activation, and primitive-consumer
suites. Shared and API builds, shared/API/web typechecks, lint, formatting, and
`git diff --check` passed.

The persisted catalog is generated from the authoritative modules with
`pnpm effects:sync:set -- --set BT16` and verified with the matching
`effects:check:set` command plus `--base origin/main`. The scoped synchronization
changed 89 BT16 records and no semantic or byte content outside the set.
