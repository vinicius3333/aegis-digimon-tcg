# BT24 coordinator review notes

## Resume contract

User requests full audit with Luna subagents. Three worker slots available. Card work stays isolated by card; engine work must be serialized. Coordinator owns ledger, shared data, integration gates and commits.

## Evidence reconciliation

All 102 reports exist but ledger is stale. Existing ledger script expects separate score columns, while this ledger stores a combined score expression; do not run it unchanged because it would corrupt evidence links. Reconcile the schema before automated updates.

Resolved: ledger now has separate rubric columns and retains all existing evidence links and provisional scores.

## Sonic Shot evidence gap

BT24-095 still proves Security and Q5701 with injected timing and its linked OPT with a direct private fireTiming call. The breeding color-waiver test ends with settle(predicate) without an explicit suspension assertion. Full 8/10 behavioral claim is not accepted until natural public origins, endpoint assertions, and next-turn OPT reset are demonstrated. Queue a card lane after the initial three return.

## Additional acceptance findings

- BT24-001 focused rerun passes 10 tests. Public legal breeding evolution now asserts both costs. Report overstates same-turn suppression in its public reset scenario (one attack per owner turn); require correction before full behavior acceptance.
- BT24-003 added seat-negative test also has no eligible Shaman, so it does not isolate seat gating. It injects timing and cannot earn behavioral credit. Public P-194 source stacks need a legal level-3 intermediary. Returned for correction.
- BT24-072 deletion case calls the direct delete primitive and ends at settle with no assertion. Queue public-origin and endpoint correction.
- BT24-081 alternate revival and BT24-084 Security tests also end at settle without explicit final assertions. Queue full public-origin review.
- BT24-018 report itself acknowledges unsuspend only through injected timing; required natural suspended-host evolution, public security-removal OPT/reset and leave-replacement proof remain to review.
- BT24-019 has public paid routes but only observes Jamming keyword; require actual security battle and exact evolved stacks/draws, plus illegal source.
- BT24-028 free evolution and inherited play are injected; free evolution ends at memory-only assertion after settle. Require natural Active-phase evolution, public attack source play/reset, placement entry/refusal/boundaries and actual battle protection/expiry.

## Rejected worker engine claims

BT24-002 worker changed Q5575 to expected-failure with a final unsuspended assertion even though the trailing attack should suspend the host. Its reset fixture relied on pre-Active suspension and did not attack/pay on both turns. Both were returned as fixture corrections; neither currently establishes an engine defect. Never weaken a valid expected result or classify an incomplete fixture as an engine seam.

## Medusamon continuation

Preserved local test/report changes pass the restart focused check. Full acceptance and collection gates still required.
