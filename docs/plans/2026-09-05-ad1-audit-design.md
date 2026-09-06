# AD1 audit plan

## Scope and contract

Re-audit all 25 catalog cards AD1-001 through AD1-025 from main commit
1fd29ef3642054d686bc406b778cad248514bafb on branch audit-ad1-20260905.
The prior AD1-AUDIT.md scores are claims to verify, not accepted evidence.
Printed catalog clauses, local KB rulings, and observable game state define fidelity.

## Execution

Three gpt-5.6-luna workers own disjoint card modules, tests, and evidence reports:

- AD1-001–009: luna_a, AD1-001-009-LUNA-AUDIT.md.
- AD1-010–017: luna_b, AD1-010-017-LUNA-AUDIT.md.
- AD1-018–025: luna_c, AD1-018-025-LUNA-AUDIT.md.

Each worker audits one card at a time using verify-card-implementation, queries the
KB, maps every printed clause to executable IR, traces shared primitive semantics,
and proves positive, boundary, negative, optional, timing, trait, and legal stack
behavior as applicable. Tests must assert observable state and fail meaningfully
when the implementation is reverted. Unsupported clauses lower the score.

The coordinator owns dependencies, shared-engine change allocation, cross-range
review, collection verification, canonical ledger recalculation, commits and push.
Workers request shared-file ownership before modifying engine seams. All audited
modules must register exclusively through registerIrCard(cardId, compiled).

## Design choices

Retain the compiled IR architecture and correct the smallest reusable primitive
when a printed clause cannot be expressed. Handwritten duplicate registrations are
forbidden. Blanket score regeneration from file presence or passing smoke tests is
insufficient. Separate worker evidence documents avoid concurrent ledger writes.

## Validation and delivery

Run focused tests first, affected mechanism regression suites next, then the entire
AD1 collection, typecheck, applicable lint/format checks, and git diff --check.
Inspect exact assertions supporting all five two-point score components (catalog,
KB/rules, executable module, behavior, verification) per card. Recalculate all 25
rows after integration; every 10/10 requires reproducible clause-level evidence.
Use an observable UI harness for exposed stack flows when applicable, or explicitly
record an unsupported limitation. Investigate failures against the unchanged base.

Commit logical changes atomically, push the branch, and open a review PR without
merging. Only once the entire collection meets the gates update the Orca worktree:

`orca worktree set --worktree active --workspace-status completed --comment "COLLECTION COMPLETE: AD1; 100% 10/10; branch pushed" --json`

## Workspace constraints

Initial Orca checkout failed with ENOSPC and rolled back the checkout. The existing
new branch was recovered using a sparse Git worktree at Orca's intended path;
Orca recognizes it. Public web assets are excluded. Dependencies are reused through
local symlinks with @aegis/shared resolved to this worktree, preserving isolation of
compiled shared code. No user files or other audit worktrees were deleted.
