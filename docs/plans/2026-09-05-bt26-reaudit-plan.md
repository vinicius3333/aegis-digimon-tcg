# BT26 independent re-audit plan

## Scope and baseline

Audit all 104 catalog cards, BT26-001 through BT26-104, on branch `audit-bt26`, created from main at `9ba114cc7f196db6f71c13a85f743677c0a4e18c`. Existing historical and executed ledgers claim complete coverage; those claims are inputs to inspect, not current proof.

The user authorized planning and execution with Luna subagents. The coordinator owns integration, shared engine seams, collection recalculation, and delivery. No changes are made in the main checkout.

## Approach

A static-only pass would be inexpensive but cannot prove execution. A serial full audit provides proof but underuses the requested workers. Use three bounded Luna audits in parallel, one card at a time within each range, followed by coordinated mechanism and whole-collection verification.

- Luna low: BT26-001–036; report `docs/audits/BT26-001-036-REAUDIT.md`.
- Luna mid: BT26-037–072; report `docs/audits/BT26-037-072-REAUDIT.md`.
- Luna high: BT26-073–104; report `docs/audits/BT26-073-104-REAUDIT.md`.

Workers own only their direct card modules, colocated tests, and individual reports. Shared engine fixes must first be coordinated to prevent concurrent edits. The coordinator makes atomic commits after verification.

## Per-card contract

Read the complete catalog record, query local KB, inspect applicable rulings, and map every printed clause to actual IR and primitive semantics. Verify timing, controller, optionality, costs, limits, target boundaries, zones, durations, inherited and Security effects. Registration must exclusively use `registerIrCard`.

Use observable state assertions, legal evolution stacks, mixed trait pools, relevant peers, refusal and negative cases. Existing tests may supply proof only after inspection. Record unsupported or ambiguous behavior below 10/10; do not infer fidelity from file presence or test counts.

## Integration and acceptance

Install locked dependencies and build shared package. Run current collection baseline and preserve results. After fixes, execute focused files, affected mechanism suites, all BT26 files, workspace typecheck, scoped lint/format, and `git diff --check`. Recalculate the complete 104-card ledger from individual evidence and final test results.

Completion requires every card at reproducible 10/10, green focused/mechanism/collection checks, clean diff validation, atomic commits, pushed branch, and a reviewable PR. Update the Orca card to completed only then, using `COLLECTION COMPLETE: BT26; 100% 10/10; branch pushed`. Partial progress remains in-progress.
