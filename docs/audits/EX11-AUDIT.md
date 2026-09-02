# EX11 Card Implementation Audit

Branch `audit/ex11-card-by-card-20260901`, stacked on `audit/ex12-card-by-card-20260901` so the
EX12 engine fixes (Decode host scope, SubTrigger grants, Rule Name aliases) are present. Every
one of the 74 EX11 cards was re-audited against `.agents/skills/verify-card-implementation/SKILL.md`
by eight independent batch auditors. The previous ledger, which already claimed 74/74 at 10/10,
was treated as a claim to falsify. Per-card evidence is in the eight range reports under
`internal-docs/audits/EX11/`.

## Result

73 of 74 cards at 10/10. EX11-033 Maneuvermon holds 9/10: its "play ... to 1 of your Digimon"
clause is implemented as a link without the played card's On Play window (Q5850), because the
interpreter cannot open that window for a linked card today.

## What the previous ledger missed

| Class                               | Cards                                            | Finding                                                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dead clauses                        | 006, 058, 072                                    | An invented condition kind evaluated to false (006); no catalog card carries a bare `[Aqua]` trait so exact matching never fired (058); ＜Delay＞ was free and repeatable and a misspelled match mode accepted any LIBERATOR-text Digimon (072).                       |
| Missing or wrong clauses            | 027, 030, 032, 045                               | The printed link effect was absent (027); a host trait gate was missing (032); ＜Blocker＞ was a keyword flag nothing registered (045).                                                                                                                                |
| Security stack handling             | 025, 041, 043, 063                               | "Top stacked card" removed the whole permanent (041, 043); "top card" ignored face state (025, 063).                                                                                                                                                                   |
| Scope                               | 029, 033, 040, 042, 070                          | Board-wide `whenLinked` (029); plays and links from every controlled stack instead of this Digimon's (033, 040, 042, 070).                                                                                                                                             |
| Rules                               | 021, 026, 044, 053, 065, 066                     | Memory gains gated on a draw (021, 066); exact trait match and wrong condition plus an invented colorless alternate route in the shared overrides (026); unpayable cost still offered (044); mandatory placement declinable (053); Digi-Egg cards excluded (058, 065). |
| Dead fields hidden by `@ts-nocheck` | 004, 007, 012, 031, 034, 046, 056, 070, 073, 074 | 21 type errors; two were live semantic defects (034 selection source, 072 match mode).                                                                                                                                                                                 |
| Persisted IR                        | 69 records                                       | Stale generator output with `RawUnparsed` actions and `raw` conditions that never match. All 74 records regenerated from the modules.                                                                                                                                  |

## Engine and shared changes on this branch

| Commit      | Change                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `1d73daf1d` | `selfLinkedMatchesFilter` condition kind; `whenFaceUpCardsAddedToOpponentSecurity` added to the shared SubTrigger union |
| `e52703ede` | invented EX11-026 alternate route removed from `ALTERNATE_DIGIVOLUTION_OVERRIDES`                                       |
| `ce901e52e` | unknown `nameOrTrait` match modes fail closed; doc comment corrected to "always a union"                                |
| `257c34911` | P-012 used the misspelled `nameContains` mode and would have gone dead under the guard                                  |
| `1ebd2a71f` | `EX11-catalog-sync.test.ts` and an honest `EX11.audit.test.ts`                                                          |

## Pre-existing failures found on main

Five EX11 tests failed on the untouched branch: 022 (fixture partner all-gated, so no ordering
decision opened), 049, 064, 069 (unanswered evolution-route `chooseOption` prompt), 053
(auto-selected deletion removed the card under test). All were fixture defects; the modules were
right.

## Claims checked and rejected

- EX11-055 "cost paid before the no-candidate preflight": a test with no legal target shows the
  Tamer does not suspend; the optional block preflights before payment. Test kept.
- Mind Link "optional refusal never offered": the generic optional prompt runs before
  `runMindLink`; a passing decline case sits in `EX11-070.test.ts`.

## Delivered gates

| Gate                                                       | Result                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX11/` | 77 files, 609 tests passed                                                                          |
| `EX11.audit.test.ts` + `EX11-catalog-sync.test.ts`         | passed; 74 modules equal their persisted records                                                    |
| `pnpm typecheck`                                           | passed for EX11 and all changed seams; 14 pre-existing errors in two engine sync test files on main |
| `oxlint`, `oxfmt --check`, `git diff --check`              | passed on every changed file                                                                        |

## Open items outside EX11

- Play-as-link: `LinkAction` needs an `asPlay` mode that opens the linked card's own On Play
  window (EX11-033, EX11-042; Q5850).
- `digivolutionRequirementsFor` reads only the persisted records and the override tables, never
  the module, so every module-side requirement fix is live only through record regeneration.
- `matchingAlternateDigivolutionRequirement` treats every `digivolutionRequirement` entry as an
  alternate route regardless of `isAlternate`.
- `SecurityManipulationAction` reads an untyped `filter` through a cast (BT25-037, BT19-036).
- BT24-093 encodes "this Digimon's top stacked card" with `fromDigivolutionTop`, which the
  EX11-041 rulings (Q5875, Q5887) suggest is the wrong card.
- `CardEffect.timing` is read by no interpreter file; EX8-035 and ST20-05 rely on it.
- ＜Fortitude＞ never enters the trigger-ordering pool (see the EX12 ledger).
