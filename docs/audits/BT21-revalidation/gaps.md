# Open findings

## BT21-062: optional cost without an available Option

Observed during BT21-006 legal stack construction: digivolving Snatchmon into Galacticmon with sufficient Vemmon-text trash but no Ragnarok Cannon leaves the sources unchanged. Supplying more trash did not help (`logs/review-004-006-v2.log`).

Trace: `BT21-062.ts` attaches the four-card placement cost to `UseOptionWithoutCost` without `allowCostWithoutTarget`. `interpreter/actions/runAction.ts` calls `canAttemptUseOptionWithoutCost` before payment; an empty eligible Option pool returns early. `data/kb/rules/comprehensive.md` §15-7-5 permits optional processing costs even when the subsequent processing cannot be executed. The existing `allowCostWithoutTarget: true` seam appears sufficient; confirm with a public card regression before changing the module. Do not award full IR/behavioral points until resolved. Separately inspect Galacticmon's return-four protection filter (`match: "name"`) against the exact printed [Vemmon] identity.

## First batch proof revisions

BT21-001–009 remain under review. Red runs exposed fixture defects, including wrong evolution stage, top/source confusion, unrelated inherited draws, unsettled optional decisions, and stale permanent aliases after deletion. These are evidence defects, not presumed engine defects. Only passing, reviewed final assertions may earn behavioral points.

BT21-006's legal stack must obey the printed four-copy limit for BT21-056; use other Vemmon card numbers or a mixed Vemmon-text placement cost to reach exactly four named sources legally. Its original direct continuous-DP boundary fixtures remain supplemental.
