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

## Integration checkpoints

- `46e24da21` adds `apps/web/test/ex10EvolutionStack.scenario.test.tsx`. The real
  rendered game client and Colyseus room exercise EX10-006 into EX10-007: the
  alternate 2-memory route is chosen over the printed 3-memory route, memory is
  +1, Agumon remains in the stack, and DP is 8000 (4000 printed + 1000 inherited
  + 3000 evolution effect). No decision remains. Focused web test: 1/1 passed;
  changed-file lint/format and diff checks passed.
- Inspection found the specific EX10-059 visibility bypass: generic PlaceUnder
  passes explicit card identities to the picker, overriding ordinary hidden-hand
  enrichment. Worker 051–074 now owns the PlaceUnder/IR seam and card-specific
  payload proof. This supersedes treating default redaction as sufficient evidence.
- EX10-023's printed prohibition is limited to the unsuspend phase, whereas its
  current IR uses the general `unsuspend` restriction. Worker 001–025 owns the
  phase-specific correction, including both normal unsuspend and Reboot.
- All three ranges remain in progress. No new per-card perfect scores have been
  accepted by the coordinator yet.
- `d747eb610` records the reviewed EX10-026–050 range: 25 files and 151 tests
  passed in the coordinator's rerun, and the four changed tests pass lint/format.
  EX10-031 now actually attempts opposing De-Digivolve on the protected stack,
  compares an unprotected stack, and executes a controller-owned neutral IR
  De-Digivolve effect. The report includes KB IDs and named per-card tests. Whole
  collection acceptance still awaits integrated gates and remaining ranges.
- The initial continuous dependency correction passed 6 files/49 focused tests and
  42 files/1101 broader effect/conformance tests. A subsequently added true Q5013
  case failed: the opposing EX10-010 remains at 18000 instead of 15000 because
  its prior opponent-origin +3000 modifier remains effective after immunity.
  This is a distinct gap from Q5202, and EX10-010 cannot be accepted at 10/10 yet.
- Further review requires EX10-062's second once-per-turn attempt to choose a
  second genuinely legal host, and EX10-064 to exercise the effect-side material
  expansion rather than only the explicit intent expander shortcut. Worker
  051–074 owns those proofs and the EX10-058 paid-source follow-up target gap.

- Integration checkpoint: the current whole-collection run reached 591/593 tests.
  Its two failures were EX10-062's incomplete turn fixture and a catalog read racing
  the sync command. Neither result is a final collection acceptance. The catalog
  has been regenerated and must be checked again after all module edits finish.
- EX10-062 now passes 9/9 with a distinct second host/card and the real production
  turn machine resetting usage. Removing the IR frequency in a temporary test
  registry fails the exact same-turn second-host assertion. Commit `46d397fd3`
  records the proof; `0a7b5c6ca` fixes the EX10-031 fixture literal type. Both are
  pushed to `audit-ex10-20260905`.
- Root verified EX10-058/060 plus interpreter mechanisms: 3 files, 226 tests
  passed. EX10-059 plus visible-identity/discarded-source mechanisms: 3 files,
  27 tests passed, including wrong-seat rejection and final-zone proof. Independent
  review of these seams is assigned before acceptance.
- Independent review of EX10-010/023 found incomplete default DP provenance and
  an effect-driven unsuspend consumer missing the Active-phase restriction. Worker
  001–025 owns the corrections, two-seat/negative controls, and the reproduced
  Link-DP/large-board integration failures.
- EX10-064's new effect-play test still uses the static expander registry. Worker
  026–050 confirmed the compiled nested zone expansion lacks a generic consumer
  and now owns that shared engine seam. EX10-064 remains below 10/10 until
  compiled behavior, per-play payment/quotas and mutation evidence are proven.
- `44f9b855d` records EX10-059's blind PlaceUnder option and the verified actual
  decision/zone behavior. Independent Luna review accepted the implementation;
  EX10-058 was sent back for refusal/invalid-target cost invariants and a play-ban
  boundary check. The EX10-059 commit is not yet pushed: SSH reports `No user
  exists for uid 501`, and an HTTPS attempt using the existing credential helper
  reports DNS resolution failure for github.com. Earlier commits through
  `0a7b5c6ca` were successfully pushed. This is a temporary publication failure,
  not collection completion or an implementation blocker.
- Follow-up checkpoint: EX10-058 refusal/invalid-target/play-prohibition proofs
  passed with its interpreter mechanism suite (2 files, 220 tests). Commit
  `3a0896153` records the cost-created target correction. Network/user resolution
  recovered, and commits through `3a0896153` are now pushed successfully.
- The original broad engine run was superseded after the DP implementation changed;
  it also reported a worker heap failure/definitionKeyword termination timeout and
  has been terminated (exit 143), not counted as green.
- An isolated archive of HEAD's unchanged engine passed the original ch04 and
  interactionAudit suites (82/82). This disproves the initial fixture-only diagnosis
  for the Link-DP/large-board failures. Those tests must remain unchanged while the
  introduced DP regression is corrected.
- The engine-owned seed cache plus an explicit undefined-value guard resolves both
  introduced DP failures: the unchanged ch04/interaction suites now pass 82/82 on
  the audit worktree as well as the isolated baseline. No fixture weakening was
  accepted. The current UI evolution scenario also passes 1/1 with the updated
  engine, preserving alternate cost, inherited source and final DP.
- The current workspace typecheck passes shared/web; remaining errors are localized
  to the in-progress EX10-064 consumer/tests (pending-decision payload typing,
  replacement-union narrowing and primitive coverage map). Worker 026–050 owns
  these and worker 051–074 is reviewing the semantics independently.
- A new concrete EX10-010 negative control exposed a separate player-wide DP
  provenance gap: BT23-035's real compiled security-paid -6000 effect lowers the
  immune EX10-010 from 15000 to 9000 while an ordinary target correctly becomes
  4000. `continuousDpImmunity.test.ts` is red-capable; worker 051–074 now owns the
  PlayerDpModifier correction, separate from worker 001–025's individual-DP/phase
  work. EX10-010 is not accepted until both paths pass.
- Independent EX10-064 review confirms that the one-copy effect-play case passes,
  but additive compiled quotas, optional per-Tamer activation and cleanup scope
  remain unresolved. The direct-intent Q5178 test does not prove effect-path parity.
