# EX11 complete audit plan

## Contract and baseline

Audit all 74 EX11 cards against the committed catalog and local rules KB, using
`.agents/skills/verify-card-implementation/SKILL.md` one card at a time.
Worktree: `audit-ex11-20260905`, based on main `675edc356`.
Prior 73/74 perfect scores are hypotheses to revalidate. Resolve EX11-033's
documented gap against primary sources, along with any newly reproduced gap.
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
Official sources disproved the previous play-as-link diagnosis: EX11-033/042
play Maquinamon from hand or their own link cards. Use ordinary PlayWithoutCost
with exact names and host scoping, preserving the played card's On Play window.
EX11-029/033 need WhenMoving rather than OnPlay. Existing engine seams passed
Q5850/Q5878 rule-check tests; no additional Link mode is warranted.

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

All three Luna range reviews and coordinator integration review are recorded in
the dated reports. Final validation passed 81 files/649 collection tests,
61 shared-mechanism tests, 106 shared evolution tests, full repository typecheck,
API typecheck after the final fixtures, lint/format and diff checks.
All 74 persisted records match, with zero changes outside EX11 in effects.json.
The recalculated ledger records 74/74 at 10/10. Delivery uses focused planning,
catalog, Assembly mechanism, card-fidelity and audit-evidence commits, then a
branch push and review PR. The Orca completion update follows those steps.
