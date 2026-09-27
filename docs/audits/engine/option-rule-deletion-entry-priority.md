# Option rule-deletion and entry priority

Discord report `1553619008077430804` was matched against read-only Oracle application
logs for match `ac76720f-b004-416f-be95-3bbeac02d049`, room `_OCTzg-HN`, on
2026-09-27. The server file is
`/opt/aegis-rollout/logs/api-2026-09-27-a011d6d2-d535-43fc-9997-07fc7ab54a87.jsonl`.
Raw logs stay outside the repository.

At 04:05 UTC, event 391 activates BT8-109 Flame Hellscythe, event 393 plays
BT1-060 MagnaAngemon, event 402 activates the opponent's BT15-036 Wizardmon
On Deletion, and event 406 finally activates MagnaAngemon's On Play. These exact
card IDs establish that the report's “death scythe” means Flame Hellscythe.

Catalog contracts: BT8-109 first gives an opposing Digimon -6000 DP, then may
play a purple/yellow Digimon with at most 6000 DP from trash without paying.
BT1-060 recovers one card On Play. BT15-036 may pay a top/bottom security trash
cost On Deletion to give an opposing Digimon -6000 DP. Local KB BT8-109 errata
(2022-05-27) confirms revival is optional; BT1-060 Q919 concerns its inherited
DP effect and does not change entry timing. BT15-036 has no card-specific KB Q&A.

The controlling rule is CR §15-4-3-2/3: effects triggered during one resolving
effect and its rule check are simultaneous. Under §15-4-3-5-1/2 the turn player's
pending effects activate before the non-turn player's. §17-1-2-2 retains the
existing prohibition on a state-based sweep between clauses of one effect.
See `data/kb/rules/comprehensive.md` around lines 1983–2015 and 3423.

Root cause: the Option completion seam resolved rule deletions while
`optionResolutionDepth` was still positive. The pending-pool collector deliberately
hides printed On Play effects until the Option completes its post-use routing.
Consequently a complete opponent deletion window resolved before the existing
entry queue was made visible. The fix collects rule movements/reactions first,
then drains those reactions and the already pending entry effects in one resolver
window. It preserves rule movement timing, post-use routing, source residency,
optional revival and turn-player priority. No card module or registration changed.

`hellscythePriority.test.ts` first failed with observed order
`[BT2-070, BT1-060]` instead of `[BT1-060, BT2-070]`. Coverage includes both turn
seats, a neutral Tapirmon comparative case, declined revival (deletion still
resolves), the exact Wizardmon/MagnaAngemon arena, and Security activation where
the attacking turn player's deletion correctly precedes the defender's recovery.

The selectable arena scenario is
`/dev/arena?scenario=arena-hellscythe-onplay-priority`. Bilingual notes instruct
playing Hellscythe, reducing Wizardmon, and reviving MagnaAngemon. Its integration
test starts the actual turn loop and proves recovery, paid opposing security cost,
Wizardmon's final zone, and the two effects' activation order.

Focused verification: nine files / 80 tests passed, covering rule processing,
Option use, Arts Digivolve pending On Play, Chapter 15 timing, cross-card timing,
and all three involved cards. The full engine run passed 8,942 tests with three
pre-existing failures: BT14-083 top-source trash in `mechanic.test.ts`,
`state/syncedArrayMutators.guard.test.ts` (plain-array splice in state/access.ts),
and `state/mutationSeam.guard.test.ts` (the existing Kotone scenario's raw security
clear in devScenario.ts). This scenario uses the mutation seam. The final additional
Security regression passed in the focused run. This is bounded bug evidence, not
collection certification.

Workspace typecheck, scoped Oxlint/Oxfmt, and `git diff --check` passed. Coordinator
review found the production change appropriately scoped. The coordinator will
replace the older Kotone scenario's raw mutation during integration.
