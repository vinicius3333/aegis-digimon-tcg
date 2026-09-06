# DNA digivolve destination audit

Date: 2026-09-06
Scope: every card that runs a `DnaDigivolve` action.
Tool: `node tools/audit-dna-into-filters.mjs` (run after `pnpm --filter @aegis/api build`).

## The defect

`dnaDigivolveCostFor` (`apps/api/src/engine/effects/primitives.ts:6063`) falls back to the best
printed **normal** digivolve cost when the destination card has no structured DNA requirement:

```ts
const requirements = dnaDigivolutionRequirementsFor(evolving.cardId);
if (requirements.length > 0) return matchingDnaDigivolveCost(evolving, materials);
// legacy fallback: best single-base digivolve cost
```

So any card the `into` filter admits becomes a legal DNA result as soon as one material happens to
satisfy its ordinary evo cost. The `into` filter must carry `hasDnaDigivolutionRequirement: true`
to close that path (matched in `interpreter/matching/definition.ts:101`, stripped from the shown
pool in `interpreter/actions/dna.ts:34`).

Reported case: EX12-003 Kapurimon offered EX12-059 Machinedramon (ME, Black Lv.5 evo cost 4) as a
DNA result, even though Machinedramon prints no DNA recipe.

## Results

| | Count |
| --- | --- |
| `DnaDigivolve` `into` filters total | 74 |
| Carrying the flag | 19 (16 already + 3 fixed here) |
| Missing the flag, pool contains cards without a DNA recipe | 54 filters / 42 cards |
| Missing the flag, harmless (pool is fully DNA-gated) | 1 (EX11-070) |

Fixed in this pass: **EX12-003, EX12-001, EX12-017**.

Still leaking (42 cards):

AD1-009, AD1-012, BT12-021, BT12-047, BT16-036, BT16-065, BT16-091, BT16-092, BT16-097, BT17-095,
BT17-101, BT20-011, BT20-016, BT20-036, BT20-043, BT20-066, BT20-074, BT20-093, BT21-046, BT23-027,
BT23-050, BT24-035, BT25-011, BT25-018, BT25-028, EX11-059, EX3-008, EX3-058, EX4-049, EX4-051,
EX5-065, EX6-072, EX7-047, EX8-027, EX8-060, EX9-013, EX9-020, EX9-044, P-118, P-119, P-121, P-191.

The widest are the `kind: ["Digimon"]` filters ("DNA digivolve into a Digimon card") — BT12-021,
BT12-047, BT16-091/092/097, BT17-101, BT21-046, EX3-008, EX3-058, EX4-049, EX4-051, EX5-065,
P-118, P-119, P-121 — which currently admit 3224 of 3263 Digimon.

## Backfill (2026-09-06)

The blocker was data, not the filters. Only 37 cards carried a structured `dnaDigivolveRequirement`
and only 12 printed `[DNA Digivolve]` in `effectText` (EX9: 1, EX11: 1, EX12: 10). The importer
folds the community DB's `dnaDigivolve` header into `effectText`
(`tools/import-taka-cards.mjs:79`), but the pre-EX9 imports ran without it, so those recipes were
absent. That absence is what the legacy fallback in `dnaDigivolveCostFor` compensated for.

The community DB (`TakaOtaku/Digimon-Card-App`, `src/assets/cardlists/DigimonCards.json`) has
**72** cards printing a `[DNA Digivolve]` header, all present in `cards.json`. 39 already resolved;
the remaining **33** were transcribed into `DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES`
(`packages/shared/src/effects/data.ts`), each with the printed line as its comment. A slashed color
list ("Blue/Yellow Lv.5") expands into one requirement per color pair, since a material spec holds
a single color — the same shape the already-shipped EX12 records use.

BT20-081 Fenriloogamon: Takemikazuchi needed a new predicate: its second material is
"Yellow Lv.6 w/[Pulsemon] **in text**". Added `namesInText` to the material spec
(`ir/requirements/fusion.ts`) and to `dnaMaterialSpecMatches` (`primitives.ts`), matching against
`effectText` + `inheritedEffectText`.

Coverage is now 72/72, guarded by `packages/shared/src/effects/dnaDigivolutionCoverage.test.ts`.

Note out of scope: BT18-019 Millenniummon's stored requirement is `Red Lv.5 + Black Lv.6` while the
printed line reads `[Kimeramon] + [Machinedramon]`. It already had a requirement, so the backfill
did not touch it — worth a separate look.

## A correction from the backfill

The first pass assumed the flag would strand real destinations — that BT25-011's pool would lose
BT3-014 Silphymon and BT23-027's would lose BT3-040 Shakkoumon. The community DB shows both print
`-` for `dnaDigivolve`: they are plain multicolor Digimon with two ordinary digivolve costs, not
DNA cards. Every genuine DNA destination is one of the 72, and all 72 now resolve.

## The fix

With all 72 destinations resolving, the legacy fallback had nothing left to cover, so it is gone —
in both places that carried it:

- `dnaDigivolveCostFor` now returns `matchingDnaDigivolveCost` alone. No printed DNA requirement
  means no legal DNA digivolve, so `canDnaDigivolve` drops the card from the candidate pool.
- `dnaDigivolveInto`'s apply-time cost choice had the same fallback (best single-base digivolve
  cost when the card had no structured requirement). Removed, so the gate and apply cannot drift.

This closes all 54 `into` filters at once, on the legality path, rather than by editing 38 card
modules. It also closes the player-action DNA verb, which binds `matchingCost` to the same
function. `hasDnaDigivolutionRequirement` on an `into` filter is now only a pool-display nicety:
worth adding as cards are touched, no longer load-bearing.

## Remaining work

1. Reconcile BT18-019 Millenniummon's stored requirement (`Red Lv.5 + Black Lv.6`) with its
   printed line (`[Kimeramon] + [Machinedramon]`).
2. Optionally add `hasDnaDigivolutionRequirement: true` to the 54 `into` filters as those cards are
   touched, so the shown pool matches the legal one. Cosmetic now; run
   `node tools/audit-dna-into-filters.mjs` for the list.
