# BT12 Audit Evidence

BT12 is complete: all 112 catalog cards are verified at 10/10.

## Invariants

- 112 catalog IDs, 112 direct modules, and 112 focused test files.
- Every module exports full compiled IR with no residual clauses.
- Every module registers exactly once through `registerIrCard(cardId,
compiled)`.
- No BT12 module uses `registerCard`, a handwritten timing override, or an
  empty compiled placeholder.
- `effects.json` is generated from the executable modules with a set-scoped,
  atomic, byte-idempotent synchronization command.

## Final proof

- Catalog sync: 115/115 tests.
- BT12 collection: 114/114 files and 703/703 tests.
- Targeted engine capability and rule-check batch: 659/659 tests.
- Broad engine mechanisms: 17/17 files and 484/484 tests.
- Engine conformance: 28/28 files and 386/386 tests.
- Sync utility: 7/7 tests.
- API and shared typechecks: passed.
- Scoped Oxlint/Oxfmt and `git diff --check`: passed.
- Effects scope check: 76 semantic BT12 changes and zero changes outside
  BT12 against `origin/main`.

Commands and the score ledger are recorded in
`docs/audits/BT12-STATIC-AUDIT.md`.
