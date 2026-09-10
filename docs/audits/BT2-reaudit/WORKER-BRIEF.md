# BT2 worker brief

Work only in `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt2-luna-20260910`; execute `cd` plus an exact `pwd` assertion before any read or write.

Fully read and follow `.agents/skills/verify-card-implementation/SKILL.md`. Assigned edits are limited to each card module, colocated test, and per-card report. Do not edit git state, engine/shared/catalog files, ledger, or RUN.

Evidence requires the exact catalog and KB/Q&A contract, direct/canonical IR mapping, natural public behavior and negative boundaries, public legal lifecycle/stack and peer/reset proof where applicable, exclusive `registerIrCard`, and no `@ts-nocheck`. Direct `under` fixtures alone do not earn full stack credit. Digi-Eggs may appear only in `eggDeck` or a legal evolved stack, never main deck/Security. Do not inject `advance.fire`, `fireTiming`, or `fireSubTrigger`.

Do not run Vitest/typecheck/build/collection until coordinator release. Released focused tests must use `--maxWorkers=1 --no-file-parallelism` after separate process and `memory_pressure` gates.
