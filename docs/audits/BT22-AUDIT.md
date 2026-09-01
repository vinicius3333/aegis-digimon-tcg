# BT22 Card Implementation Audit

Date: 2026-09-01

Status: complete — 102/102 cards verified at 10/10

## Scope and method

The audit reconciled every card from `BT22-001` through `BT22-102` against the committed card catalog, the local rules knowledge base, its direct TypeScript module, colocated behavioral tests, representative peer/stack paths, shared interpreter mechanisms, and the persisted effects catalog.

Three Luna/high agents reviewed non-overlapping ranges. Independent challenge reviews then re-audited the ranges they did not implement, and a final read-only review examined all production changes. A provisional score was never promoted merely because a focused test passed: public gameplay causality was added where the engine exposes an intent, while production seams were retained only where no public equivalent exists.

The historical range reports under `internal-docs/audits/BT22/` are superseded by this report and `docs/audits/BT22-STATIC-AUDIT.md`.

## Result

- Cards audited: 102
- Cards at 10/10: 102
- Unresolved or ambiguous cards: 0
- Registration: 102 direct modules use `registerIrCard(cardId, compiled)`; zero BT22 card modules use `registerCard`
- Coverage: all authoritative modules and persisted records have `coverage: "full"` and an empty residual list
- Persistence: 93 stale BT22 records refreshed; zero semantic changes outside BT22
- Exact equality: `BT22-catalog-sync.test.ts` checks the complete 102-key set, module/catalog equality, full coverage, and empty residuals

## Executable corrections

| Card | Correction | Reproducible boundary |
| --- | --- | --- |
| BT22-001 | Require the effect-added Aqua/Sea Animal source to be a Digimon card | Non-Digimon source does not trigger |
| BT22-004 | Require the effect-added CS source to be a Digimon card | Both legal evolution routes settle; non-Digimon source is excluded |
| BT22-015 | Bind both Decode plays to Omnimon's own digivolution stack | Eligible card in a decoy stack is preserved |
| BT22-019 | Require the inherited protection carrier to have Veedramon in its live name | Non-Veedramon carrier is deleted normally |
| BT22-022 | Bind inherited Veedramon protection to the carrying Digimon | Unrelated Veedramon remains unprotected |
| BT22-027 | Require effect provenance for the added-source watcher | Manual placement does not trigger |
| BT22-041 | Explicitly self-scope the play-cost replacement | Another card receives no reduction |
| BT22-043 | Require the added CS source to be a Digimon card | CS Tamer negative passes |
| BT22-044 | Require the added CS source to be a Digimon card | CS Tamer negative passes |
| BT22-081 | Restrict Yuuko play to this Eater Eve's stack | Public leave flow preserves a decoy stack |
| BT22-082 | Restrict Arata play to this Eater Adam's stack | Public leave flow coexists with Arata's real redirect and preserves a decoy stack |
| BT22-090 | Use the legal alternate route for Rie and filter level-less bases before destination selection | Illegal LordKnightmon print is never offered |

The BT22-090 finding exposed a generic preflight gap: a level-less base previously bypassed destination legality. The interpreter now accepts only a printed alternate or base-granted route for such bases. The synthetic test definitions in BT19-084 and BT25-026 now declare their intended levels/evolution data, and their focused regressions pass. Those adjacent changes are test fixtures for the generic engine correction; this audit does not resynchronize persisted BT19, BT23, or BT25 records.

The persistence statement above describes the semantic branch diff against `main`: exactly 93 changed records, all BT22. It does not assert that pre-existing persisted records for collections outside BT22 already equal their direct modules.

## Strengthened behavioral evidence

The audit added or replaced evidence across the collection for:

- legal evolution and App Fusion stacks instead of impossible pre-seeded stacks;
- public play, attack, evolution, Link, Overclock, Delay, and Security flows;
- same-host and decoy-stack source scoping;
- effect provenance versus manual placement;
- deletion prevention and leave replacement;
- real Flame/CS play and evolution for BT22-092 without a synthetic `registerCard` stub;
- real evolution publication for BT22-093;
- public Delay flows for BT22-096 through BT22-099;
- optional acceptance, refusal, exact cost, destination, ownership, trait, level, turn, and once-per-turn boundaries.

Direct production seams remain only where the engine has no player-facing equivalent, notably App Fusion execution, face-down source setup, and a direct opponent-effect deletion helper. These paths are paired with focused mechanism tests and are not represented as public intents.

## Reproducible verification

- Full BT22 collection:
  - command: `timeout 300s pnpm --filter @aegis/api exec vitest run src/cards/BT22 --maxWorkers=1 --no-file-parallelism`
  - result: 103 files, 563/563 tests passed in 12.69 seconds
- Shared mechanisms:
  - interpreter, capabilities, subtrigger seams, digivolve actions/candidate legality, BT19-084, and BT25-026
  - result: 7 files, 564/564 tests passed in 9.35 seconds
- State synchronization regressions:
  - result: 2 files, 7/7 tests passed
- Serial workspace typecheck:
  - shared, API, and web passed under a 300-second hard limit
- Repository lint:
  - exited successfully with zero errors and historical warnings under a 180-second hard limit
- Delivery:
  - scoped formatting passed
  - `git diff --check` passed
  - persisted semantic diff is BT22-only
  - independent Luna/high production review reported no high-confidence findings

## Remaining queue

None for BT22. The chronological collection campaign continues with BT21.
