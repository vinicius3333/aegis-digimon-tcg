# Repository Instructions

## GitHub Issues

- Always write all GitHub issue content in English, including titles, descriptions, comments, status updates, and verification reports.

## Card Registration

- Card modules under `apps/api/src/cards` must register their executable behavior exclusively with `registerIrCard(cardId, compiled)`.
- Auditors must not add or preserve a second `registerCard` registration for the same card. When an audited card is still handwritten, port it to compiled IR or record the unresolved limitation and keep it below 10/10.
- `registerCard` is reserved for existing legacy compatibility, engine tests, and explicitly justified internal seams; it must not be introduced in new card implementations or audit fixes.

## Audit Child Worktree Completion

- An audit child worktree must not finish silently. Only after its entire collection is recalculated and every card has reproducible 10/10 evidence, green focused/mechanism/collection tests, clean `git diff --check`, atomic commits, and pushed branches, it must notify the coordinator before becoming idle.
- The completion notification must update the Orca card and comment:

  `orca worktree set --worktree active --workspace-status completed --comment "COLLECTION COMPLETE: <SET>; 100% 10/10; branch pushed" --json`

- It must also send a coordinator message containing the collection, card count, test results, latest commit, push result, and remaining queue. Prefer `orca orchestration send --type status` when a Run is bound; otherwise use `orca terminal send` to the coordinator terminal handle from the active orchestration context.
- After notifying, the worker must remain available for coordinator instructions and must not claim completion from a single card, checkpoint, timeout, or partial regression.
