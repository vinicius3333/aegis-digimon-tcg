# Open findings

## Resolved: BT21-062 optional cost without an available Option

Observed during BT21-006 legal stack construction: digivolving Snatchmon into Galacticmon with sufficient Vemmon-text trash but no Ragnarok Cannon leaves the sources unchanged. Supplying more trash did not help (`logs/review-004-006-v2.log`).

Trace: `BT21-062.ts` attaches the four-card placement cost to `UseOptionWithoutCost` without `allowCostWithoutTarget`. `interpreter/actions/runAction.ts` calls `canAttemptUseOptionWithoutCost` before payment; an empty eligible Option pool returns early. `data/kb/rules/comprehensive.md` §15-7-5 permits optional processing costs even when the subsequent processing cannot be executed. The existing `allowCostWithoutTarget: true` seam appears sufficient; confirm with a public card regression before changing the module. Do not award full IR/behavioral points until resolved. Separately inspect Galacticmon's return-four protection filter (`match: "name"`) against the exact printed [Vemmon] identity.

Resolution: commit `6ef79ab3c` adds `allowCostWithoutTarget: true` and exact Vemmon-name protection. Public legal evolution tests prove accepting and refusing the four-card placement with no Ragnarok Cannon available; all 11 assertions passed in `logs/focused-056-062-v2.log`. Final collection gates and exhaustive clause review remain pending.

## First batch proof revisions

BT21-001–009 remain under review. Red runs exposed fixture defects, including wrong evolution stage, top/source confusion, unrelated inherited draws, unsettled optional decisions, and stale permanent aliases after deletion. These are evidence defects, not presumed engine defects. Only passing, reviewed final assertions may earn behavioral points.

BT21-006's legal stack must obey the printed four-copy limit for BT21-056; use other Vemmon card numbers or a mixed Vemmon-text placement cost to reach exactly four named sources legally. Its original direct continuous-DP boundary fixtures remain supplemental.

## Shared grant duration ownership — fix under integration

BT21-057 exposed a custom effect grant expiring at the granter turn end. The interpreter framed duration from the recipient seat instead of the granter seat. `grantStatic.ts` now passes `ctx.source.ownerSeat`; trigger ownership remains attached to the recipient instance. The card test passed 7/7 (`logs/focused-057-grant-duration-v4.log`), and a real `startTurnLoop` mechanism regression passed 1/1 (`logs/mechanism-grant-duration-v4.log`). The affected mechanism and whole-collection run is pending. Q4561 unaffected-target behavior still requires dedicated card evidence.

## BT21-069 and BT21-070 security timing — fixes under integration

Both Digimon printed end-of-battle play effects executed before security battle completion. One-shot `whenSecurityBattleEnded` subscriptions now defer the play. Public security attack tests passed in `logs/focused-063-071-grant-v2.log`; final synchronization and collection gates are pending. Tamer security free play remains immediate.
