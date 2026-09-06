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

## Resolved: BT21-079 two-player trash scaling

The retained split-trash cost-5 Growlmon regression fails in `logs/focused-073-079-luna-v4.log` (BT21-079 8/9). `applyPlayCostCeiling` recognizes controller `both` or omitted but treats `any` as the controller's seat. BT21-079 correctly expresses an unrestricted controller with `any`. Commit `bd9d34e5d` adds `any` to the two-seat branch. The retained BT21-079 card regression passes 10/10 and the controller-scope mechanism passes 6/6 in `logs/focused-gap-closure-102-v3.log`. Both are pushed; final collection gates remain pending.

## BT21-073: natural granted-attack lifecycle proof incomplete

The current public link/grant tests pass 11/11, but the attempted full-turn forced-attack test did not terminate and was removed by the worker. This is missing proof, not a completed clause. Reconstruct a real loop using the green BT21-057 mechanism pattern, preserve recipient eligibility and phase-entry completion, and diagnose the precise pending decision or resolution if it still hangs.

## Integration and typecheck evidence defects

`focused-065-102-v2.log` preserves 14 failing assertions. Corrections include relative opponent-turn memory (065), valid attack targets (094), stale instance aliases around Option use (090/093/099), the initial, subsequently rejected split Delay activation model (091), lifecycle Main auto-pass (085/087), and missing imports. API typecheck also found raw deck strings in036/037/043; root replaced them with `Zone.Deck`. The corrected 036/037/043 focused tests and shared/API/web typecheck passed in `logs/focused-gap-closure-102-v3.log` and `logs/typecheck-checkpoint-102-v2.log`. Other results are tracked per card; those partial runs are not a final collection gate.


## Reactive Delay timing correction: BT21-091/093/094/100

The printed event is the Delay activation window. Splitting an arming `GainKeyword` watcher from a later plain `AllTurns` payload (091/094) leaves no declarable action; treating the reward as a future Main activation (093/100) also fails the printed timing contract. Existing `withIntrinsicDelayGate` supports a Delay-keyworded reactive SubTrigger, with source-trash payment, optional activation, and the same-placement-turn prohibition. Luna C is correcting these card modules using that seam. Prior passing manual-activation assertions do not prove printed timing.

BT21-094 additionally required a generic `whenDigimonTopTrashed` producer with the removed top card's printed identity and controller. The mechanism passes 3/3 in `logs/focused-top-trash-delay-v4.log`, and shared/API/web typecheck passes in `logs/typecheck-top-trash-v2.log`. This shared change remains uncommitted pending its final affected regressions and corrected card test.

## Second-pass evidence review: BT21-022–025 and 073

022's second deletion originally lacked both the inherited source and enough remaining sources to pay again; this did not independently prove once-per-turn. 023's second target exceeded the DP ceiling; it likewise did not test the limit. 025's alleged public Raid proof placed Lamiamon underneath a host, where its main target-switch effect was inactive, and used an illegal level-5-over-level-5 inherited fixture. Revisions must isolate each printed gate, preserve a valid second opportunity, and assert the full observable outcome.

073's first replacement originally trashed Charismon itself, removing the effect before its purported once-per-turn check. The revised fixture uses Gaiamon's printed Link +1, pays with Gossipmon, and retains Charismon for the second attempt. Its real opponent-Main forced-attack lifecycle and revised protection assertions still await focused execution.

## End of Attack source scope — fixed, broader regression pending

BT21-079 exposed broadcast End of Attack effects resolving for nonattacking hosts, including the defender against Armor Purge. `logs/end-attack-scope-red-v4.log` records six reproducible wrong-source board-state failures. `builderForTrigger` now routes EndOfAttack through the existing attacker guard. `logs/end-attack-scope-green-v1.log` passes 13 BT21-079 assertions and four mechanism assertions, including the own-attacker positive. Player security combat does not emit combatResolved; its complete boundary is a securityChecked event plus cleared currentAttackerId. Final broader collection validation remains pending.

## Pushed mechanism resolutions and current second-pass limits

Progress opponent-effect mutation immunity is fixed in `469ebba48`; granted triggered-effect attachment to unaffected Digimon is fixed in `639ce9ce4`. Top-card-trash event production and BT21-094 reactive Delay are delivered by `f6744a054`; reactive BT21-091/093/100 Delay by `ba7e6cc65`. Canoweissmon's optional cost without payoff is fixed by `6db83a6d5`. End of Attack source scope is fixed by `3946efa7d`. All are pushed through `9794ac695`.

DigiXros-only identity is corrected by `542c55229` in both BT21-021/027 IR and the shared printed-text name parser. Siriusmon optional cost without a deletion target is fixed by `baab7eb59`. The name fix has 8/8 shared parser assertions, 14/14 for each affected card, and green shared/API/web typecheck. The initial full second-pass checkpoint is 1142 passed / 7 failed; each of those remaining failures now has a passing focused correction. The combined collection/mechanism rerun remains pending.

Proof limitations remain explicit. BT21-042's purported public once-per-turn repetition was removed because evolving its host removes its main effect; an independently valid same-source repeat still requires proof. BT21-038 inherited target-lock, BT21-044 Tamer deletion/recovery once-per-turn, and BT21-051 Blast Digivolve still rely on supplemental or structural coverage. BT21-004/005 public negatives that are rejected before their trigger cannot alone prove the card's filter/turn gate. App Fusion public declaration support remains a collection-level review item. None of these cards may be promoted solely from test counts.

Stable snapshot update: `logs/collection-mechanisms-second-pass-v4.log` resolves all prior execution failures with 1819/1819 passes. This closes the regression-run issue, not the remaining printed-clause proof gaps. Public BT21-084 link-triggered App Fusion can replace several direct-primitive test paths; dedicated normal App Fusion declaration support remains under review.
