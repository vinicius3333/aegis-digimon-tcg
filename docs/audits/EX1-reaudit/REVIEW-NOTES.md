# EX1 re-audit review notes

## Coordinator decisions

- The older `docs/audits/EX1-AUDIT.md` is historical context only. Current scores require fresh per-card reports and coordinator reruns.
- Every card module must end without `// @ts-nocheck` and register executable behavior exclusively through `registerIrCard(cardId, compiled)`.
- Delivery credit remains zero until collection-wide gates, atomic commits, and branch push pass.

## Engine seam queue

- None at initialization.

## Fixture traps

- Do not place Digi-Eggs in deck or security.
- Do not use numeric `security: <n>` shortcuts.
- Injected timings such as `advance.fire`, `fireSubTrigger`, or `fireTiming` do not prove behavior.
