# EX12 audit plan — 2026-09-05

## Objective and baseline

Revalidate and correct all 77 EX12 cards on `audit-ex12-20260905`, created from main
at `675edc356bf351b852e64da1b38cd45c5123c35f`. Preserve unrelated main checkout edits.
The latest ledger reports 76/77 at 10/10; EX12-065 remains 9/10 because Fortitude
is missing from the simultaneous deletion ordering pool (Q6866). Older strict
closeout prose claiming 77/77 is historical evidence, not current proof.

## Approach

A structural rerun alone cannot validate printed semantics. Rewriting all cards
would discard useful existing proof. Instead, three Luna auditors independently
reconcile each assigned card with catalog, local KB, direct compiled IR, runtime
semantics, peer/stack risks and behavioral assertions, then fix demonstrated gaps.
The coordinator integrates shared mechanisms and runs final collection gates.

## Ownership

- Luna 1: EX12-001–026; report `docs/audits/EX12-20260905-001-026.md`.
- Luna 2: EX12-027–052; report `docs/audits/EX12-20260905-027-052.md`.
- Luna 3: EX12-053–077, including Q6866 reproduction; report `docs/audits/EX12-20260905-053-077.md`.
- Coordinator: shared engine changes, aggregate synchronization, ledger recalculation,
  final regression, atomic commits, push, review PR and Orca status.

Workers own disjoint card modules/tests and their reports. Shared engine changes
must be coordinated before editing. Only the coordinator commits. All executable
card registration remains exclusively `registerIrCard(cardId, compiled)`.

## Evidence and completion

Every card needs clause-level source and executable mapping, observable positive,
negative/boundary, applicable refusal/cost/zone/timing/OPT, and peer/stack proof.
Document unsupported behavior explicitly and keep its score below 10/10.
Run focused suites with bounded workers, affected mechanism regressions, the entire
EX12 collection, catalog-sync and ledger checks, workspace typecheck, changed-file
lint/format and `git diff --check`. Record actual commands and results.

Recalculate all 77 scores from the new reports. Completion requires all 77 at 10/10,
green focused/mechanism/collection checks, clean diff validation, atomic commits and
pushed branch. Create a review PR without merging. Only then update the EX12 Orca
worktree to completed with `COLLECTION COMPLETE: EX12; 100% 10/10; branch pushed`.
