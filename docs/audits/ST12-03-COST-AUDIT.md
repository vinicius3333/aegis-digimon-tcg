# ST12-03 Solarmon cost-activation audit

The committed catalog and local KB Q752–Q755 require both players to pay full
play costs, including when the reducer resides in breeding. Reduction activation
costs cannot be paid under this prohibition. Free plays and digivolution-cost
reductions remain legal. Solarmon's existing exclusive `registerIrCard`
implementation expresses the restriction correctly; the defect was in pay-time
activation.

`GameEngine.fireBeforePayCost` now skips prohibited self, resident, breeding,
interactive, and cross-permanent play reducers before their payment. Compiled
effects carry a reducer marker; classification follows immediately executing
`CostGatedBlock` bodies, without treating future granted effects as current
reductions. Unrelated BeforePayCost effects still resolve.

The ten ST12-03 behavioral cases cover both controllers, normal/full costs,
Togemon suspension under a lock and without a lock, an unaffordable play with
no payment, free play, inherited digivolution reduction, EX9-043 hand-trash
payment suppression, and King Drasil's breeding reduction (Q754).
`playCostBlockActivation.test.ts` additionally exercises nested payment with
and without the restriction while a separate non-reducing pay-time effect
continues to resolve. Its initial failing control was a fixture error: the
trash cost needed `filter.zone: "hand"`; no additional engine defect was found.

## Verification

All Vitest invocations below used `--pool=forks --maxWorkers=1
--no-file-parallelism` in the audit worktree.

- ST12-03 and BT13-007: 2 files, 15 tests passed on the final focused revision.
- EX9-043, BT14-046, playCard, passivePlayCostReduction, registration/module,
  and the earlier nine-case ST12-03 revision: 6 files, 70 tests passed.
- playCostBlockActivation: 1 file, 2 tests passed after correcting the fixture.
- digiXrosPreparation: 1 file, 2 tests passed; optional non-reduction material
  preparation is preserved.
- Engine conformance: 28 files, 387 tests passed after the shared change.
- Workspace typecheck passed for shared/web; API initially found four new
  ST20-14 test typing errors. Those were corrected and API typecheck then passed.
- Independent Luna review found no remaining concrete defect in this change.

ST12-03's reviewed evidence score is 10/10. This card-level result does not
certify the full ST12 collection or the overall starter-deck audit.
