# EX8 Re-audit Review Notes

## Coordinator decisions

- Fresh evidence is required for every card despite the historical EX8 audit.
- Card registration must remain exclusively through `registerIrCard(cardId, compiled)`.
- Every card module must finish without `@ts-nocheck`.
- Shared engine changes are serialized and require a named mechanism report.

## Engine seam queue

None recorded yet.

## Fixture traps

Use public intents and legal stacks; do not place Digi-Eggs in deck or security and do not use injected timing as behavioural proof.
