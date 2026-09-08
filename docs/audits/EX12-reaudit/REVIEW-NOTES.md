# EX12 re-audit review notes

## Coordinator decisions

- No card receives delivery-gate credit until collection gates pass on committed state and the branch is pushed.
- Existing 2026-09-05 evidence may guide risk selection but does not replace fresh evidence.
- Coordinator acceptance reruns supersede stale worker aggregates: 266 tests for EX12-001–026, 268 for EX12-027–052, and 251 for EX12-053–077.
- The audit found no reproducible card, catalog, shared, or engine behavior defect. The delivered changes strengthen behavioral proof and remove invalid fixtures.

## Engine and shared seam queue

None reported yet.

## Fixture traps

- Do not place Digi-Egg cards in deck or security.
- Do not prove triggers through injected timing helpers.
- Resolve the full effect stack and assert observable cost, zone, stack, duration, and reset behavior.
- Fresh sweep found Digi-Egg cards used as neutral deck/security filler in 14 focused suites. They were replaced with neutral Digimon, while intentional Digi-Egg uses in breeding, evolution stacks, trash-payment rulings, and digivolution-card counts were preserved.
