# EX10 full collection audit

## Contract and scope

Revalidate all 74 committed EX10 cards on branch `audit-ex10-20260905`, based on
main at `675edc356`. Printed catalog clauses and local KB rulings are the contract;
existing scores are claims to verify. The current ledger reports 70/74 perfect cards,
while an older runtime report claims 74/74. Neither proves current completion.

## Execution

1. Install locked dependencies and capture collection/typecheck baseline.
2. Three Luna workers audit one card at a time in disjoint ranges: 001–025,
   026–050, and 051–074. Each reads the exact catalog, queries the KB, traces IR
   and shared primitives, and records clause-level evidence in a dated range report.
3. Workers own their direct modules and behavioral tests. The coordinator owns
   shared engine changes, catalog synchronization, the collection ledger, integration,
   commits, and delivery. Shared edits require explicit ownership assignment.
4. Prove positive, negative, numeric, optional-cost, duration, once-per-turn,
   inherited, Security, trait-comparison, and legal evolution-stack cases wherever
   applicable. Use public engine intents and observable final state. Add reproductions
   before fixing known gaps, including 010 continuous dependencies, 059 blind choice,
   062 once-per-turn isolation, and 064 DigiXros zone expansion.
5. Synchronize persisted IR after direct-module corrections. Recalculate every
   score from the new evidence and replace stale completion claims.
6. Run focused, affected-mechanism, and entire EX10 suites; repository typecheck;
   lint/format for changed files; and `git diff --check`. Inspect actual coverage,
   not only passing status. Review shared changes for cross-collection regressions.
7. Commit logical changes atomically, push the branch, and open a review PR.
   Mark the Orca worktree complete only when all 74 cards have reproducible 10/10
   evidence and all required gates pass, with the required collection-complete comment.

## Constraints

- Exclusive `registerIrCard(cardId, compiled)` registration for every audited card.
- No completion based on partial batches, historical reports, or structural tests.
- Any unsupported clause stays explicitly below 10/10 until resolved.
- GitHub issue content is English. No main-branch edits or direct push to main.
- Worker reports include executed commands, test results, unresolved risks, and
  clause-to-test evidence. Coordinator verifies evidence before accepting scores.

## Status

Planning complete; baseline validation and all three Luna audit ranges started.

## Baseline evidence

- Locked dependency installation succeeded. An initial collection invocation before
  the shared build failed package resolution and ran no tests; it is not card evidence.
- After building shared, `pnpm --filter @aegis/api exec vitest run src/cards/EX10/
  --maxWorkers=2`: 75 files passed, one failed; 582 tests passed, one failed.
  EX10-033's Q5097–Q5100 case reads `perm("chosen")` after the 0-DP permanent leaves
  the board. The range owner will verify the behavior and correct the proof.
- `pnpm typecheck`: shared, API, and web passed.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects
  src/engine/subTriggerSeams.test.ts src/engine/continuousLapse.test.ts
  src/engine/continuousLifecycle.test.ts src/engine/continuousRecomputeConcurrency.test.ts
  src/engine/decisions/visibleIdentities.test.ts --maxWorkers=2`: 45 files,
  1,126 tests passed.
- The current `runContinuousPass` clears continuous ledgers and resolves each
  persistent effect once. Q5202 dependency persistence needs a reproduction and a
  shared correction. Worker 001–025 owns this seam after coordinator assignment.
- Opponent face-down hand identities are already withheld by
  `decisions/visibleIdentities.ts`; EX10-059's historical visibility exception must
  be verified against actual decision serialization before introducing new IR.
