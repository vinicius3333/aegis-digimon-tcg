# EX2 re-audit review notes

## Coordinator decisions

- Printed behavior and locally indexed rules are the contract.
- Existing EX2 audit documents are historical context only, not current evidence.
- Every EX2 module must register exclusively through `registerIrCard(cardId, compiled)`.
- Every EX2 `// @ts-nocheck` must be removed and the resulting errors corrected without whole-file suppression.

## Engine seam queue

- None identified yet.

## Fixture traps

- No Digi-Egg cards in deck or security.
- Injected timing and internal verbs are structural proof only.
