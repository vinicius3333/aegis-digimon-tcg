# BT22 Card Implementation Audit

> Historical report. The independent audit started on 2026-09-06 is incomplete;
> current evidence and scores are tracked in [BT22-reaudit/PLAN.md](BT22-reaudit/PLAN.md)
> and [BT22-reaudit/ledger.json](BT22-reaudit/ledger.json). Claims below are not
> carried forward without revalidation.

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
- Type safety: zero BT22 production modules use `@ts-nocheck`; 94 stale suppressions were removed and the API typecheck passes
- Coverage: all authoritative modules and persisted records have `coverage: "full"` and an empty residual list
- Persistence: 93 stale BT22 records refreshed; zero semantic changes outside BT22
- Exact equality: `BT22-catalog-sync.test.ts` checks the complete 102-key set, module/catalog equality, full coverage, and empty residuals

## Executable corrections

| Card     | Correction                                                                                     | Reproducible boundary                                                             |
| -------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| BT22-001 | Require the effect-added Aqua/Sea Animal source to be a Digimon card                           | Non-Digimon source does not trigger                                               |
| BT22-004 | Require the effect-added CS source to be a Digimon card                                        | Both legal evolution routes settle; non-Digimon source is excluded                |
| BT22-015 | Bind both Decode plays to Omnimon's own digivolution stack                                     | Eligible card in a decoy stack is preserved                                       |
| BT22-019 | Require the inherited protection carrier to have Veedramon in its live name                    | Non-Veedramon carrier is deleted normally                                         |
| BT22-022 | Bind inherited Veedramon protection to the carrying Digimon                                    | Unrelated Veedramon remains unprotected                                           |
| BT22-027 | Require effect provenance for the added-source watcher                                         | Manual placement does not trigger                                                 |
| BT22-038 | Match the self-reducing digivolution destination by exact card ID                              | Near-name Monzaemon destinations receive no reduction                             |
| BT22-041 | Explicitly self-scope the play-cost replacement                                                | Another card receives no reduction                                                |
| BT22-043 | Require the added CS source to be a Digimon card                                               | CS Tamer negative passes                                                          |
| BT22-044 | Require the added CS source to be a Digimon card                                               | CS Tamer negative passes                                                          |
| BT22-081 | Restrict Yuuko play to this Eater Eve's stack                                                  | Public leave flow preserves a decoy stack                                         |
| BT22-082 | Restrict Arata play to this Eater Adam's stack                                                 | Public leave flow coexists with Arata's real redirect and preserves a decoy stack |
| BT22-090 | Use the legal alternate route for Rie and filter level-less bases before destination selection | Illegal LordKnightmon print is never offered                                      |

The BT22-090 finding exposed a generic preflight gap: a level-less base previously bypassed destination legality. The interpreter now accepts only a printed alternate or base-granted route for such bases. The synthetic test definitions in BT19-084 and BT25-026 now declare their intended levels/evolution data, and their focused regressions pass. Those adjacent changes are test fixtures for the generic engine correction; this audit does not resynchronize persisted BT19, BT23, or BT25 records.

The BT22-078 proof exposed a second shared gap: stack-effect conferrals were consumed by triggered timings but not by the player-facing `[Main]` activation path. The live conferral collector now feeds both the synchronized activation affordance and authoritative validation, preserves host/granter provenance, and checks the provenance-specific Once Per Turn key before offering the copied effect.

The persistence statement above describes the semantic branch diff against `main`: exactly 93 changed records, all BT22. It does not assert that pre-existing persisted records for collections outside BT22 already equal their direct modules.

## Strengthened behavioral evidence

The audit added or replaced evidence across the collection for:

- legal evolution and App Fusion stacks instead of impossible pre-seeded stacks;
- public play, attack, evolution, Link, Overclock, Delay, and Security flows;
- same-host and decoy-stack source scoping;
- effect provenance versus manual placement;
- deletion prevention and leave replacement;
- real Flame/CS play and evolution for BT22-092 without a synthetic `registerCard` stub;
- copied Flame `[Main]` activation on BT22-078, including host targeting, exact memory cost, non-Flame exclusion, and Once Per Turn consumption;
- exact BT22-038 self-destination matching and BT22-067 Option exclusion under the distinct play/use rules;
- real evolution publication for BT22-093;
- public Delay flows for BT22-096 through BT22-099;
- optional acceptance, refusal, exact cost, destination, ownership, trait, level, turn, and once-per-turn boundaries.

Direct production seams remain only where the engine has no player-facing equivalent, notably App Fusion execution, face-down source setup, and a direct opponent-effect deletion helper. These paths are paired with focused mechanism tests and are not represented as public intents.

## Reproducible verification

- Full BT22 collection:
  - command: `timeout 300s pnpm --filter @aegis/api exec vitest run src/cards/BT22 --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`
  - result after reconciling current `main` and removing suppressions: 103 files, 565/565 tests passed in 13.43 seconds
- Shared mechanisms:
  - digivolve actions/candidate legality, card evolution data, cannot-ignore rules, digivolve locks, interpreter, primitives, state synchronization, effect collection, and activated effects
  - result: 11 files, 467/467 tests passed in isolated single-fork processes
- Serial workspace typecheck:
  - shared, API, and web passed under a 300-second hard limit
- Repository lint:
  - exited successfully with zero errors and historical warnings under a 180-second hard limit
- Delivery:
  - scoped formatting passed
  - `git diff --check` passed
  - persisted semantic diff is BT22-only
  - independent Luna/high production review reported no high-confidence findings

### Current-main reconciliation (2026-09-02)

- Merged current `origin/main` normally; the sole textual conflict was the adjacent BT25-026 test fixture, resolved by preserving the current-main option choice together with the explicit synthetic level/evolution data required by the shared legality seam.
- Rechecked all 102 cards in three non-overlapping Luna/high lanes with one valid KB query per card, removed all 94 `@ts-nocheck` directives, and replaced the nine stale IR shapes exposed by strict typechecking with supported typed equivalents.
- Added the scoped snapshot generator lineage and ran `effects:sync:set` followed by `effects:check:set`; 102 BT22 records are synchronized, with 93 semantic changes and zero semantic or byte changes outside BT22.
- Re-ran eleven affected mechanism/state files in isolated single-fork processes: 467/467 tests passed. The resolution seam also passed 7/7 focused tests. The snapshot tool's 13/13 tests and the API typecheck also passed.
- Full repository lint exited with zero errors and historical warnings only; scoped formatting and `git diff --check` passed.

## Remaining queue

None for BT22. The chronological collection campaign continues with BT21.
