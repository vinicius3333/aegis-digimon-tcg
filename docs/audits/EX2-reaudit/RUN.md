# EX2 re-audit run

## 2026-09-09 start

- User requested a fresh worktree/branch, a complete EX2 audit, removal of every EX2 `@ts-nocheck`, and Luna workers.
- Orca created `audit-ex2-luna-20260909` from `origin/main` at `e66ac37dbb3c649a74678e9926edd722b8735066`.
- Historical EX2 audit claims are context only; all 74 rows start Queued and must earn fresh evidence.
- Resource policy: at most three card lanes; each lane owns one card at a time; all Vitest runs use one worker and no file parallelism; broad tests and workspace typecheck are coordinator-only and serialized.
- Disk at start: 8.8 GiB available. Memory: 16 GiB installed, about 4.5 GiB immediately free plus reclaimable inactive/speculative pages.
- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused.
- First API typecheck attempt before dependency installation failed with `tsc: command not found`; this was environment setup, not a source failure.

## Baseline measured before worker acceptance

- First collection attempt after install found missing built `@aegis/shared` output; all 85 files failed import before tests. This was reproduced and corrected by building shared, without source changes.
- `pnpm --filter @aegis/shared build`: exit 0.
- Serial EX2 collection with one worker: 85 files / 328 tests passed.
- Serial workspace typecheck with a 4096 MB heap: shared, API, and web passed.

## First Luna lanes

- `EX2-002`: coordinator rejected the first post-edit result because the new stack test called an undefined `settle` at line 42; 3 existing tests passed and the new test failed. Returned to the same Luna lane for correction.
- `EX2-001`: coordinator rejected the first post-edit result because the public route stalled before seat 1 Main at line 132; 5 tests passed and the new turn-loop test failed. Returned to the same Luna lane for correction.
- Resource guard paused worker test execution when unrelated TypeScript/Jest processes reduced immediately free memory; analysis and edits continued without broad concurrent tests.
- `EX2-002` correction accepted at 8/10 before delivery gates: 4/4 focused tests, scoped Oxlint/Oxfmt, fixture scan and diff check pass; typed IR retains exclusive `registerIrCard`.
- `EX2-005` behavior passes 6/6 focused tests, but acceptance is pending a scoped Oxfmt correction.
- `EX2-001` second rerun reaches the public route but decks out the opponent before cleanup (5 passed, 1 failed); returned for fixture correction.
- `EX2-003` second rerun improved to 6 passed / 2 failed; legal egg-stack sequencing and Option color requirement remain incorrect and were returned.
- `EX2-004` has 5 passing behavioral tests but its IR assertion imports an undefined non-exported `compiled`; returned.
- `EX2-006` has 3 passing tests / 2 fixture failures: missing Option color source and a breeding loop that never evolves/moves; returned.
- Subsequent focused reruns made `EX2-001`, `EX2-004`, and `EX2-005` behavior green at 6/6 each, but acceptance was rejected because their fixtures still put Digi-Egg `BT1-001` in deck/security. Exact offending lines were returned to the Luna lanes.
- `EX2-003` improved to 7/8 but still used direct phase mutation that left public digivolution in `wrong-phase`; the lane was directed to copy EX2-005's real turn-loop pattern.
- `EX2-006` improved to 4/5 with the same direct-phase-mutation defect and received the same correction.
- `EX2-008` improved from 7/9 to 8/9; its remaining assertion resolves an alias after that permanent was correctly deleted. Returned to capture identity before deletion.

## First atomic checkpoint

- `EX2-001` through `EX2-006`, `EX2-008`, `EX2-009`, and `EX2-010` have accepted 8/10 card evidence before delivery gates; all focused tests, scoped lint/format, fixture scans and diff checks pass.
- `EX2-007` focused suite passes 12/12 after a typed IR conversion, but it remains at 7/10 because several indexed interaction rulings still need direct confirmation.
- API typecheck passed with a 4096 MB heap after removing suppression from EX2-001 through EX2-011.
- Atomic checkpoint `678273a53` commits EX2-001 through EX2-010 plus the audit ledger, KB index, run log, review notes and worker brief.
- `EX2-011` passes 8 tests with one retained Q3295 seam: a generic deletion-ceiling bonus incorrectly affects `totalDpCapFromSourceDp`. A single serialized Luna engine lane owns the investigation; Oxlint remains red until the skipped test is flipped.

## Second atomic checkpoint preparation

- The Q3295 shared targeting seam was fixed in commit `e9ea49d62`; EX2-011 plus the interpreter regression suite pass 223 tests.
- EX2-011 through EX2-012 and EX2-014 through EX2-021 have reproducible 8/10 card evidence before delivery gates.
- EX2-013 initially exposed a retained-red turn-loop scenario. Investigation proved there was no engine defect: the fixture attempted to gain above the memory cap, used a stale Option-cost endpoint, and observed memory after unrelated gauge movement. The corrected public loop passes 5/5 and proves first activation, same-turn suppression, and next-owner-turn reset.
- Focused coordinator results: EX2-012 9/9, EX2-013 5/5, EX2-014 5/5, EX2-015 6/6, EX2-016 7/7, EX2-017 6/6, EX2-018 7/7, EX2-019 6/6, EX2-020 6/6, and EX2-021 5/5. EX2-011 is covered by the 223-test mechanism run above.
- Every accepted card in this checkpoint passes scoped Oxlint, Oxfmt, fixture-policy scanning, and `git diff --check`; all use typed compiled IR with exclusive `registerIrCard` registration.
- API typecheck passed after EX2-011 through EX2-021 stabilized. Ledger aggregate is 167/740; delivery remains 0/2 for every card until collection-wide gates, commit chain, and branch push complete.

## Full-card evidence checkpoint preparation

- EX2-022 through EX2-074 were re-audited with typed compiled IR, exclusive `registerIrCard`, sanitized fixtures, per-card reports, and coordinator-run focused tests.
- The remaining shared seams were resolved with focused regression evidence: opponent-turn unsuspend watcher lifecycle (EX2-037), nested modal reactivation continuation (EX2-038), verified self-reducer registration (EX2-041), post-interruption digivolution affordability and retained Blitz (EX2-056/Q3348), detached-target digivolution cancellation (EX2-064/Q3350), and Digi-Egg deletion routing (EX2-007/Q3281).
- Every EX2 module now has zero `@ts-nocheck`, exactly one `registerIrCard`, and no `registerCard` registration.
- All 74 cards have reproducible 8/10 evidence before delivery gates. Ledger aggregate is 592/740; final 2/2 delivery credit remains blocked on the serialized collection/typecheck/effects/gate run, atomic commits, and pushed branch.
- Broad final validation is temporarily paused because an unrelated external `tsc --watch` reduced immediately free memory below 1 GiB; no external process was killed.
