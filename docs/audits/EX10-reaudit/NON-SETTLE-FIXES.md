# EX10 re-audit — the 36 non-settle failures

Scope: every line in `docs/audits/EX10-reaudit/logs/post-wave2-failures.txt` that does **not**
contain `settle: predicate never held`. Three groups: persisted-IR drift, stale link-DP test
baselines, and one seam-9 ruling change.

## Method — the pristine HEAD baseline

To separate "this session broke it" from "it was already red at HEAD", the 11 files were run
against an unmodified copy of `HEAD`:

```
mkdir -p docs/audits/EX10-reaudit/logs/pristine
git archive HEAD | tar -x -C docs/audits/EX10-reaudit/logs/pristine
# node_modules symlinked from the worktree (root, apps/api, packages/shared);
# @aegis/shared built inside the copy so the tests read the copy's effects.json.
```

Pristine HEAD result:

```
 Test Files  8 failed | 3 passed (11)
      Tests  33 failed | 970 passed (1003)
```

The pristine tree was deleted after the run.

| Failure | Red at HEAD? |
| --- | --- |
| BT10 / BT11 / BT12 / BT14 / BT19 catalog-sync (30 tests) | yes — pre-existing |
| `BT22-009` link DP, `BT23-009` link DP, `appFusionLinkPlacement` | yes — pre-existing |
| `EX10-catalog-sync`, `promo-lm-rb.catalog-parity` (P-107) | no — caused by this session's card fixes |
| `irKindTier2Cluster` Tier-2 A3 | no — caused by seam 9 |

## 1. Persisted IR out of sync (32 tests)

`packages/shared/src/effects/effects.json` had drifted from the authoritative card modules.
Resynchronised with the repo tool, one set at a time:

```
node tools/sync-effects-from-card-modules.mjs --set <SET>
```

Sets the tool reported stale and synchronised: **BT10, BT11, BT12, BT14, BT19, BT21, EX10, P**.
BT1 was checked as well (the seam-15 note flagged it) and reported `BT1: 115 records already
synchronized` — a sibling agent had already resynced it.

The whole diff is 96 insertions / 65 deletions and every hunk traces to a card module or to a
landed engine change:

- **36 x `"position": "bottom"`** on the `PlaceUnder` action of ＜Save＞ effects. This is the
  committed normalizer at `apps/api/src/engine/effects/interpreter/registration/normalize.ts:105`
  (landed in `0c247d8c9`, "close EX10 audit seams in save, costs and triggers"); the persisted IR
  was simply never resynced after it. `apps/api/src/engine/effects/saveKeywordPlacement.test.ts`
  is the unit proof of that default.
- **`BT1-070`** gained `allowUnaffectableChoice: true` — already present in the worktree before
  this work (a sibling agent's BT1 fix), carried through unchanged.
- **`EX10-052`** — the `trash 1 card in your hand` cost moved from the `Delete` action up to the
  clause, matching this session's `EX10-052.ts` fix.
- **`P-107`** — the `Replacement` / `wouldDigivolve` / `reduceCost` sub-block collapsed into
  `reduceCost: 2` plus `allowNoTarget: true` on the `Digivolve` action, matching this session's
  `P-107.ts` fix (`P-107-FIX.md`).

No drift was persisted that does not come from a card module.
`pnpm --filter @aegis/shared build` was rerun afterwards.

## 2. Stale link-DP test baselines (3 tests)

All three were red at pristine HEAD. They are fallout from the committed **seam 7 part 2**
(`setupEngine` now runs `recomputeDP` for seeded links — see `ENGINE-LANE-1.md`, "Seam 7").
Before that change a seeded link contributed no DP, so each test's baseline recorded the bare
printed DP. The engine is right in all three; the test baselines were wrong.

| Test | Was | Now | Arithmetic |
| --- | --- | --- | --- |
| `BT22-009.test.ts` "adds the printed 3000 link DP" | `8000` | `11000` | BT22-035 Entermon prints 8000 DP + BT22-009 Effecmon's printed 3000 link DP |
| `appFusionLinkPlacement.test.ts` | `4000` | `6000` | BT26-051 Gomimon prints 4000 DP + the seeded EX10-024 Kabemon's 2000 link DP |
| `BT23-009.test.ts` link replacement | `baseDp + 6000` | `10000` | BT23-009 Coachmon prints 4000 DP + the replacement BT23-007 Musclemon's 2000 link DP + the 4000 DP Coachmon's own link trigger grants |

The BT23-009 case is the clearest: the *engine* value never changed (10000 both before and
after). Only the captured `baseDp` moved, from 4000 to 6000, because the seeded link now counts —
so `baseDp + 6000` double-counted the link. The capture was replaced with the absolute value and
its derivation.

## 3. Seam 9 ruling — `irKindTier2Cluster.test.ts`

`Tier-2 A3 — SetBaseDP (BT3-014 ...) REVERT-CONFIRM-RED` asserted `canActivate(ctx) === false`
for a board holding only an ineligible Lv.5 opponent Digimon.

Seam 9 changed that ruling (see `SEAM-9-21-MECHANISM.md`, "Ruling implemented", CR §15-4-2): a
**mandatory** triggered effect whose only action currently has no legal board target still
triggers, takes its place in the ordered set, and fizzles at resolution. So activation is now
`true`.

The test now asserts the ruling rather than the old gate:

- `canActivate(ctx)` is `true` — a mandatory trigger activates even with no legal target;
- no `setBaseDP` call is recorded — it resolves as a no-op;
- the ineligible Lv.5 Digimon keeps its printed 11000 DP.

The rest of the file is untouched.

## Gates

Files changed:

- `packages/shared/src/effects/effects.json`
- `apps/api/src/cards/BT22/BT22-009.test.ts`
- `apps/api/src/cards/BT23/BT23-009.test.ts`
- `apps/api/src/engine/appFusionLinkPlacement.test.ts`
- `apps/api/src/engine/cards/irKindTier2Cluster.test.ts`

All 11 affected files, after the fixes:

```
 Test Files  11 passed (11)
      Tests  1003 passed (1003)
```

`pnpm exec oxlint <changed files>` — exit 0.
`pnpm exec oxfmt --check <changed files>` — "All matched files use the correct format."

`pnpm typecheck` does **not** pass on this tree, but for reasons outside this work: 36 errors,
all of them in `src/cards/BT6/BT6-017,019,072` and `src/cards/BT7/BT7-063,066,078` test files
being edited concurrently by sibling agents. None of the five files changed here appears in the
error list. Earlier attempts also hit transient `TS6053: File 'src/cards/EX3/zzz-debug.test.ts'
not found` / `src/cards/EX12/zzdbg.test.ts` from siblings' scratch files.
