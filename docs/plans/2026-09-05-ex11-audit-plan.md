# EX11 complete audit plan

## Contract and baseline

Audit all 74 EX11 cards against the committed catalog and local rules KB, using
`.agents/skills/verify-card-implementation/SKILL.md` one card at a time.
Worktree: `audit-ex11-20260905`, based on main `675edc356`.
Prior 73/74 perfect scores are hypotheses to revalidate. EX11-033's documented
play-as-link On Play gap must be resolved, along with any newly reproduced gap.
Main's uncommitted changes are outside this checkout.

## Execution

Three user-requested gpt-5.6-luna workers own disjoint modules, tests and new reports:

- EX11-001–025: `internal-docs/audits/EX11/2026-09-05-001-025.md`.
- EX11-026–050: `internal-docs/audits/EX11/2026-09-05-026-050.md`.
- EX11-051–074: `internal-docs/audits/EX11/2026-09-05-051-074.md`.

Coordinator owns shared engine/IR changes, persisted effects synchronization,
collection ledger, integration tests, review, atomic commits, push and PR.
Workers request shared seams instead of concurrently modifying engine files.

## Correction design

Prefer the smallest reusable compiled-IR seam that implements printed behavior.
A card-specific callback or a second legacy registration would evade the contract.
For play-as-link, inspect current engine semantics and Q5850 before selecting a
representation: it must preserve linked placement while honoring all printed play
and linking timing. Tests must distinguish this from ordinary linking.

## Per-card evidence

Record catalog clauses, relevant KB/rules, actual IR trace, positive and negative
behavioral tests, optional refusal, costs/zones, numeric boundaries, duration and
once-per-turn where applicable. Trait and evolution-source clauses require mixed
peer pools and realistic valid/invalid evolution stacks. Name ambiguity explicitly.
Run focused tests after each correction and relevant mechanism regressions.

## Delivery gates

Recalculate all 74 scores from new evidence, without inflating structural checks
into behavioral proof. Require exclusive registerIrCard registration, no unresolved
clauses, focused/mechanism/whole-EX11 suites green, persisted catalog sync,
`pnpm typecheck`, appropriate lint/format checks, and `git diff --check`.
Review shared changes and collection evidence, make atomic commits, push branch,
and open a review PR. Never merge without instruction.
Only then mark the Orca worktree completed with:

`orca worktree set --worktree active --workspace-status completed --comment "COLLECTION COMPLETE: EX11; 100% 10/10; branch pushed" --json`

## Status

Planning complete; three Luna range audits dispatched. All scores pending current
verification. Collection completion is unproven.
