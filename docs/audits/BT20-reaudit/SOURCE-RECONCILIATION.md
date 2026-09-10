# BT20 source reconciliation

Reconciled on 2026-09-10 against the committed card catalog, the local rules/errata knowledge
base (`node tools/kb/query.mjs card <ID> --json`), the executable TypeScript modules, synchronized
IR manifest, focused behavioral tests, and peer engine tests.

- Scope: BT20-001 through BT20-102 (102 executable card records).
- Registration: 102/102 use `registerIrCard`; no BT20 module uses `registerCard`.
- Suppressions: no `@ts-nocheck` or `@ts-ignore` remains in the collection.
- Catalog correction: BT20-098 now contains the authoritative 2025-03-07 erratum, requiring
  exactly 9 total levels rather than “up to 9”; Q4439–Q4441 are covered behaviorally.
- Timing correction: BT20-097 uses the pre-leave `wouldLeavePlay` replacement window so its
  Dorumon source cost is paid from the intact triggering stack.
- Timing correction: BT20-102 drains the active attack window before another simultaneous
  End-of-Your-Turn attack may be declared, matching Q4419.
- Manifest reconciliation: `effects:sync:set` synchronized 102 BT20 records; the base-SHA check
  reports 37 semantic BT20 changes and zero semantic or byte changes outside BT20.
- Each card's exact source mapping, Q&A result, negative boundaries, and focused command are in
  `docs/audits/BT20-reaudit/BT20-<NNN>.md`.

No unresolved card-fidelity limitation remains.
