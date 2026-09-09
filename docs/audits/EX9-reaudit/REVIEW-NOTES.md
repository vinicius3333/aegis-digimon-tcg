# EX9 re-audit review notes

## Coordinator decisions

- Printed behavior and locally indexed rules are the contract.
- Existing September audit documents are historical context only, not current evidence.

## Engine seam queue

- None identified.

## Resolved investigations

- `EX9-003-OPT-RESET` was not an engine defect. EX9-030 has matching normal and alternate routes; the retained test omitted `useAlternateCost: true`. Explicit route selection made the public next-turn proof green, with 33/33 EX9-003/EX9-070 tests and 66/66 mechanism regressions passing.

## Fixture traps

- No Digi-Egg cards in deck or security.
- Injected timing is structural proof only.
