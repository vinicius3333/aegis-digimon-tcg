# EX5 re-audit review notes

## Coordinator decisions

- Printed behavior and locally indexed rules are the contract.
- Existing EX5 audit documents are historical context only, not current evidence.
- Card modules must register exclusively through `registerIrCard(cardId, compiled)`.

## Engine seam queue

- None open.

## Resolved investigations

- `EX5-001-Q5393-STACK-ROTATION` was a fixture legality error, not an engine defect. After rotation promotes level-2 Sunmon, Q5393 requires a level-3 destination; the retained red incorrectly used level-4 `BT1-014`. The public path passes with legal `BT1-013`, and `EX5-001-Q5393-MECHANISM.md` records the projected-base mechanics.
- `EX5-007-Q3528-OPT-IDENTITY` was a test expectation error, not an engine defect. Once Per Turn identity follows each physical source copy. Two EX5-007 copies may each activate once; after stack rotation cycles the first physical copy back into inherited scope, its second same-turn use remains blocked. A proposed permanent-level tracker was rejected because it incorrectly collapsed independent copies; all production engine edits were removed.

## Fixture traps

- No Digi-Egg cards in deck or security.
- Injected timing is structural proof only.
