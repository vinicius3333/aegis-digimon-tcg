# EX12 Card Implementation Audit

Current revalidation (2026-09-05): **77/77 cards at 10/10**. See
[the latest evidence and three Luna range reports](./EX12-20260905.md).
The Fortitude/Q6866 exception described below was resolved in that revalidation.

The remainder of this document preserves the 2026-09-01 audit history.

Branch `audit/ex12-card-by-card-20260901`, cut from `origin/main` at `b0f19af8a`. Every one of
the 77 EX12 cards was re-audited against `.agents/skills/verify-card-implementation/SKILL.md`
by eight independent batch auditors. The previous ledger, which already claimed 77/77 at
10/10, was treated as a claim to falsify. Per-card evidence (clauses, rulings, IR trace,
mutation checks, tests added) is in the eight range reports under `internal-docs/audits/EX12/`.

## What the previous ledger missed

| Class                                    | Cards                                       | Finding                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ＜Decode＞ scope (CR 16-36-1)            | 014, 016, 017, 028, 031, 032, 035, 036, 044 | The replacement's `PlayWithoutCost` from digivolution cards had no `hostFilter`, so `targeting/loose.ts` pooled every stack the controller owned. Now `hostFilter: { isSelfRef: true }`, with a neighbor-stack negative test per card.                        |
| Digi-Egg counting                        | 018, 060                                    | `kind: ["Digimon"]` on a digivolution-card scaling or a "cards" placement cost excluded Digi-Eggs (catalog kind `DigiEgg`). Siriusmon was short 2000 DP on every bred stack.                                                                                  |
| Option use ceilings                      | 041, 043, 050                               | `UseOptionWithoutCost` defaulted to a play-cost ceiling of 5 and rejected multicolor Options; neither cap is printed.                                                                                                                                         |
| ＜Use Req.＞ scope (CR 16-42-3)          | 071, 072, 073, 074, 075                     | The requirement counted battle-area Options; it must count Digimon and Tamers only. Reachable in-set because EX12 Options stay on the field.                                                                                                                  |
| Optional processing conditions (CR 15-7) | 047, 052                                    | 047's "by returning 2 cards" could not be declined; 052's mandatory DP and battle clause could be.                                                                                                                                                            |
| Cost and gate shape                      | 021, 026, 077                               | 021 gated its memory gain on a draw and lacked the hand zone on its trash cost; 026 emulated `attackOrBlock` with a two-step chain and dropped the digivolution-card filter; 077 limited a "cards" cost to Digimon and pooled from Tamer and breeding stacks. |
| Inert keyword                            | 072                                         | ＜Guard＞ was a `GainKeyword` flag nothing read. It is now an executable face-up-security replacement with a delete cost (Q6888 to Q6891).                                                                                                                    |
| Persisted IR drift                       | 23 records                                  | `effects.json` disagreed with the modules; several persisted forms were dead (`raw` conditions that never match, missing attacks, missing DNA lines). All 77 records regenerated from the modules.                                                            |
| Type safety                              | all 77                                      | `// @ts-nocheck` hid 16 type errors in 9 modules. Every error was traced; two were semantic (052, 072).                                                                                                                                                       |

## Engine and shared changes

| Commit                   | Seam                                          | Reason                                                                                                                                                                  |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0a716a54a`              | `interpreter/actions/subTrigger.ts`           | Q6740: a granted trigger may be given to a permanent already unaffected by effects; the grant-time resolution dropped it. Proven by EX12-016.                           |
| `8c057337d`              | `packages/shared/src/cards/effectiveNames.ts` | The catalog prints `[Rule] Name:` as well as `(Rule) Name:`; only the latter was parsed. Thirteen cards, EX12-041 among them, gain their alias in every zone (KB Q759). |
| audit fixes commit       | `packages/shared/src/effects/ir/keywords.ts`  | `Guard` added to the keyword union.                                                                                                                                     |
| `2223cb640`, `a5e34620d` | `EX12-catalog-sync.test.ts`                   | Module-equals-persisted gate, canonical comparison.                                                                                                                     |

## Pre-existing failures found on main

`EX12-002.test.ts` (2 tests) and `EX12-046.test.ts` (3 tests) failed on pristine `origin/main`:
digivolving into a card with a printed and an alternate requirement now raises a `chooseOption`
route prompt that those suites never answered. The suites now pass `autoChooseOption: true`.

## Delivered gates

| Gate                                                       | Result                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX12/` | 79 files, 858 tests passed                                                                                                               |
| `EX12.audit.test.ts` + `EX12-catalog-sync.test.ts`         | passed; 77 modules equal their persisted records                                                                                         |
| `packages/shared` `effectiveNames.test.ts`                 | passed                                                                                                                                   |
| `pnpm typecheck`                                           | passed for EX12 and all changed seams; 14 pre-existing errors in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts` on main |
| `oxlint`, `oxfmt --check`, `git diff --check`              | passed on every changed file                                                                                                             |

## Result

76 of 77 cards at 10/10. EX12-065 Kaguyamon holds 9/10: its own IR and player-ordered
`[On Deletion]` sequencing are proven, but Q6866's ＜Fortitude＞-first ordering is a shared
engine deviation (see below). EX12-069's Q6881 (a trait removed mid-attack) is unreachable
because no engine primitive removes a trait; the reachable half, trait grants read through
`effectiveTraits`, is proven.

## Open items outside EX12

- ＜Fortitude＞ replays unconditionally after every deletion timing has fired (`primitives.ts`),
  so it never enters the `orderTriggers` pool. Q6866 lets the player resolve it first and strand
  the card's other pending effects. Affects every ＜Fortitude＞ card.

- Resolved on this branch: `applyDecodeHostScope` in `interpreter/actions/play.ts` scopes every `playedByDecode` play from digivolution cards to the resolving permanent unless the IR already scopes the host. BT19-024, BT19-027, BT22-015, EX11-018, and P-214 relied on the unscoped default; BT19-024 carries the regression test.
- 176 `kind: "return"` activation costs across the catalog are mandatory; CR 15-7-4 makes them declinable. Only EX12-047 was corrected here.
- Declining an optional cost without `abortOnDecline` lets the payload run for free in `runAction.ts`; EX12-047 sets the flag explicitly. Consider making the flag implicit.
- `Target.fromSelectionRef` and `ReplacementAction.target` require `count`, which the interpreter never reads for those shapes.
- Catalog oddity: EX12-035 `nameEn` is MetalGarurumon but `nameJp` is ウォーグレイモン.
