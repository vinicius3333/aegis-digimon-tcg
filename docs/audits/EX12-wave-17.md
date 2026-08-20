# EX12-053 Audit Wave

## EX12-053 — Hagurumon — 10/10

Catalog and implementation evidence: the committed catalog was checked for the alternate level-2 ME evolution at cost 0, the On Play reveal-three/add-one-of-each-filter effect, bottom-deck placement of the rest, and inherited Blocker. The direct IR maps all printed clauses without residuals.

Cross-card evidence: the Machine/Cyborg/Mutant filter and the separate ME filter remain distinct, so a card satisfying only one branch is not silently reused for both additions. The inherited keyword is marked on the evolution card rather than the current top card's own effect window.

Verification: a colocated test now asserts reveal count, both exact trait branches, bottom-deck remainder, inherited Blocker, and the evolution requirement. Static catalog/IR inspection and `git diff --check` pass. Focused Vitest execution remains unavailable because Vitest is not installed in the workspace; no card-specific ambiguity remains.
