# EX10 Card Implementation Audit

Branch `audit/ex10-card-by-card-20260901`, stacked on the EX12 branch and merged with the EX11
branch so every engine fix from those audits is present. Every one of the 74 EX10 cards was
re-audited against `.agents/skills/verify-card-implementation/SKILL.md` by eight independent batch
auditors. The previous ledger, which already claimed 74/74 at 10/10, was treated as a claim to
falsify. Per-card evidence is in the eight range reports under `internal-docs/audits/EX10/`.

## Result

70 of 74 cards at 10/10. Four cards hold 9/10 with a named, unresolved risk: EX10-010 (the
continuous pass has no fixpoint, so Q5202's mutual loop diverges), EX10-059 (no blind-selection
primitive for "without looking"), EX10-062 (the once-per-turn limit cannot be isolated by the
harness), EX10-064 (the ledger-side DigiXros zone expansion has no single-card fixture).

## What the previous ledger missed

| Class                               | Cards                        | Finding                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dead clauses                        | 025, 057, 064                | An inherited watcher with no gate fired on every stack trash (025); "can only digivolve into [Apocalymon]" was an unread node so Piedmon could digivolve into anything (057); a zone name the interpreter never reads killed the under-Tamers half of a DigiXros (064).                  |
| Fabricated or invented content      | 029, 030, 015, 056, 058      | An invented alternate route with a nonexistent trait (029); a link effect the card does not print, granting free trash recursion on every attack (030); restated EvoCost rows registered as unprinted routes (015, 056, 058).                                                            |
| Free or forced effects              | 009, 013, 034, 060, 071, 074 | A free unsuspended extra attack (009); a mandatory "by returning 5 cards" that could not be declined (013, CR 15-7-4), likewise 060, 071; an uncapped DigiXros discount and a granted attack with no subject (034).                                                                      |
| Scope and targets                   | 001, 022, 031, 032, 044, 059 | Board-wide link-trash watcher (001); a Rage Mode host satisfied its own Sleep Mode gate through text matching (022); protection and DP buff on two different targets, plays from any stack (031); placement under the opponent's copy (032); "any opposing permanent" host filter (059). |
| Rules                               | 003, 004, 023, 041, 065, 069 | Digi-Egg cards excluded from "cards" (003, 065); memory gain gated on a draw (004); a debuff lasting through the opponent's turn instead of the turn (041); a trait pair read as OR instead of AND (069); Use Req. counting only Tamers (023).                                           |
| Dead fields hidden by `@ts-nocheck` | 24 modules                   | 49 type errors; several were live defects (031, 034, 057, 059, 064).                                                                                                                                                                                                                     |
| Persisted IR                        | 66 records                   | Stale generator output. All 74 records regenerated from the modules; `EX10-catalog-sync.test.ts` now enforces equality.                                                                                                                                                                  |
| Structural-only suite               | 058                          | The old test never ran the engine; replaced with an eight-case behavioral suite.                                                                                                                                                                                                         |

## Engine and shared changes on this branch

| Commit      | Change                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `11a373a47` | `whenSecurityBattleEnded` added to the shared SubTrigger union                                                           |
| `d7db03755` | `ReplacementAction.amountPerPlaced` declared; `GrantStaticAction.copyTrigger` confers only one printed trigger's effects |
| `62dccef0e` | `DeleteByDPBudgetAction.upTo` declared                                                                                   |
| `1dc162593` | rule-based link trashes (`byRule`) no longer fire `whenLinkTrashed` watchers (Q5088, Q5172, Q5188)                       |
| `84f0fcdb9` | merge of the EX11 branch: link-identity condition, fail-closed match modes, EX11-026 override removal                    |
| `435e424c9` | `EX10-catalog-sync.test.ts` and an honest `EX10.audit.test.ts`                                                           |

## Pre-existing failures found on main

`EX10-042.test.ts > mills 2, places only a Gammamon-name trash card at stack bottom, and triggers
the reduced Regulusmon evolution` failed on the untouched branch: an unanswered evolution-route
`chooseOption` prompt. Fixture defect; the module was right.

## Delivered gates

| Gate                                                                                             | Result                                                                                              |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX10/`                                       | 76 files, 583 tests passed                                                                          |
| `EX10.audit.test.ts` + `EX10-catalog-sync.test.ts`                                               | passed; 74 modules equal their persisted records                                                    |
| `pnpm --filter @aegis/api exec vitest run src/engine/effects src/engine/subTriggerSeams.test.ts` | 38 files, 1052 tests passed                                                                         |
| `pnpm typecheck`                                                                                 | passed for EX10 and all changed seams; 14 pre-existing errors in two engine sync test files on main |
| `oxlint`, `oxfmt --check`, `git diff --check`                                                    | passed on every changed file                                                                        |

## Open items outside EX10

- `matchingAlternateDigivolutionRequirement` treats every `digivolutionRequirement` entry as an
  alternate route regardless of `isAlternate`; restated EvoCost rows register unprinted routes.
- `digivolutionRequirementsFor` reads only the persisted records and override tables.
- `CardEffect.timing` is read by no interpreter file (EX8-035, ST20-05 rely on it).
- `DigiXrosMaterial` has no `kind`, so "Digimon cards" materials accept Tamers (015, 034).
- The continuous pass resolves each effect exactly once with no fixpoint iteration, so mutual
  continuous grants never converge (EX10-010, Q5202).
- `Restriction` has one unscoped `unsuspend` member shared by the unsuspend phase and effect
  unsuspends, so EX10-023 over-blocks mid-turn effect unsuspends.
- `primitives.ts` reads `cantBeDeDigivolved` without `byOpponentEffect` (031 over-blocks).
- `"place"` is absent from `STRUCTURED_REDUCER_COSTS`, so two spellings of "reduce per card paid"
  diverge (061).
- `observe().keywordAmount` sums `amount ?? 0` while the consumer reads `amount ?? 1`.
- No blind-selection flag exists for "without looking" choices (059).
- EX10-030's lower-box text sits in `inheritedEffectText` although the rulings call it the link
  effect (Q5086, Q5089); catalog data question.
- `DigiXrosMaterialZoneExpansion.zones` tokens are not validated at registration (064's dead
  `tamerCards` went unnoticed).
