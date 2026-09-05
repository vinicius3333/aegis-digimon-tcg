# EX9 final audit plan

## Contract and current evidence

Audit all 74 catalog cards EX9-001 through EX9-074 on the existing
`audit-ex9-card-by-card-20260904` branch. The user requested planning by the
coordinator and implementation by Luna subagents. Later collections mentioned
in historical checkpoints are outside this request.

Preserve the existing implementation and proof where sound. The current ledger
explicitly leaves final fidelity reconciliation and delivery open. Passing test
counts alone do not establish fidelity. Each card must map its printed clauses,
KB rulings, legal evolution routes and applicable boundaries to behavioral proof.
Executable registration must use `registerIrCard` exclusively.

## Approach

A full rewrite would discard substantial verified work. Merely rerunning the
suite would leave historical residuals and weak assertions unresolved. Instead,
review existing evidence card by card, reproduce remaining risks, and make
minimal corrections with regression proof.

Three Luna workers own disjoint ranges: 001–025, 026–050, and 051–074. Each reads
the catalog, local KB, direct module and tests, corrects its own files, runs
focused proof, and records a per-card final evidence report. Shared engine
changes are coordinated centrally to avoid conflicting implementations.
Workers do not stage, commit, push or edit the shared ledger.

The coordinator owns shared mechanisms, integration, final inventory, scoped
style checks, typecheck, effects synchronization, atomic commits and delivery.
Preserve the existing EX9-001 comment cleanup and audit ledger edits.

## Gates and delivery

1. Reconcile all historical residuals against current reproductions.
2. Review all three per-card reports; resolve every unsupported clause before
   awarding 10/10. Keep ambiguities explicit.
3. Run focused tests for corrections, affected mechanisms, exact EX9 collection,
   typecheck, effects synchronization check and changed-file style checks.
4. Recalculate catalog coverage, registration invariants and executed tests.
5. Update the ledger with current evidence; commit logical changes separately.
6. Push the existing branch and verify its remote hash; provide a reviewable PR.
7. Only with all 74 cards proven complete and all gates green, update the Orca
   worktree completion status and notify the coordinator with counts, commands,
   commit, push result and remaining queue.
