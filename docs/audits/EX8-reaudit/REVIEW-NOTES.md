# EX8 Re-audit Review Notes

## Coordinator decisions

- Fresh evidence is required for every card despite the historical EX8 audit.
- Card registration must remain exclusively through `registerIrCard(cardId, compiled)`.
- Every card module must finish without `@ts-nocheck`.
- Shared engine changes are serialized and require a named mechanism report.

## Engine seam queue

None recorded yet.

## Closed card-local defects

- EX8-026: replaced invalid `whileCondition` duration with a typed permanent duration plus live memory gate.
- EX8-029: added the required aggregate target count and replaced an invalid activation restriction with the supported timing-disable action.
- EX8-044: explicitly typed the interpreter's suspended-by-this-effect receipt marker.
- EX8-048: restored the missing Lv.3 Mineral alternate evolution requirement at cost 2.
- EX8-052: corrected SecurityManipulation shape and required effect placement for both Q3935 Option costs.
- EX8-060: corrected the NSo DNA watcher scope and bound its result to the follow-up attack.
- EX8-062 and EX8-074: replaced invalid `controllerDefault: "both"` with typed `"any"` semantics.
- EX8-063, EX8-066, and EX8-073: added precise IR annotations to prevent literal widening.
- EX8-064: corrected play-cost budget and either-controller fields.
- EX8-067: made bottom placement explicit.

No shared engine seam remains open from this collection audit.

## Fixture traps

Use public intents and legal stacks; do not place Digi-Eggs in deck or security and do not use injected timing as behavioural proof.
