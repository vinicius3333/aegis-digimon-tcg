# Round 5 production review: source choice and trash activation

Reviewed the current coordinator changes in the play interpreter, IR registration, BT20-083, and BT20-096, together with `sourcePlayChoice.test.ts`, `optionTrashActivation.test.ts`, and the focused card tests. Catalog/KB contracts used here are BT20-083 Q4409–Q4411 and BT20-096 Q4438.

## Findings

### BT20-083 nested optional source play

The current shape is contract-correct. The inherited `[Breeding][Opponent's Turn]` watcher is mandatory as a triggered timing, while its `PlayWithoutCost` action is optional and owns the suspend cost. Removing the outer `optional`, removing `upTo`, and placing `optional: true` on the play action gives the required ordering: first offer/refuse the play, then pay the suspend cost only when accepted. With `fromOwnDigivolutionStack: true`, the source is restricted to the triggering breeding permanent's stack; the source-choice path prompts when multiple eligible Omekamon cards exist. No production defect was found in this change.

### BT20-096 explicit trash source

Adding `from: ["trash"]` to the `[Trash][Main]` return cost is consistent with Q4438 and the printed cost: the physical BT20-096 instance must be returned from its owner's trash, after the six-memory cost is paid. The companion registration change excluding `isFromTrash` clauses from the first ordinary Option play body correctly leaves the trash clause available through `OnDeclaration` while keeping the ordinary hand-play clause on `OnUseOption`. No production defect was found in these changes.

### Focused regression quality

`optionTrashActivation.test.ts` exercises the public `activatableEffectsJson` projection, exact source identity, six-memory payment, unsuspended-target deletion, five-card hand rejection, hand/opponent-turn rejection, and ordinary hand play. This is sufficient to catch the original registration failure and does not rely on a structural assertion alone.

`sourcePlayChoice.test.ts` records the public source-selection request and verifies the candidate set contains exactly the three DigiXros material instances, while the refusal case verifies the host and every source are trashed. The positive case uses the real play route and a later opponent turn. Its selection is auto-resolved by the harness (`autoSelectCards` plus `preferInstanceIds`) before the historical decision record is inspected, so the absence of an explicit response is not itself a pending-decision defect.

## Conclusion

No blocking contract defect or missing regression was found in the reviewed production changes. Remaining failures, if any, should be triaged from coordinator execution results rather than inferred from these diffs. This review did not execute tests or modify production code.
