# Starter deck reaudit plan

Date: 2026-09-05. Branch/worktree: audit-st-20260905. Base: 18156eceec8a544010c8b98cdbd5b3a859b4d6d1 (origin/main at creation).

## Scope and ownership

Reaudit all 343 committed cards across 23 ST sets. ST11 has no distinct card IDs in the committed catalog; do not fabricate an implementation collection. Previous ledgers are historical claims requiring current verification.

Three gpt-5.6-luna workers share this isolated worktree, with disjoint card/report ownership. The coordinator owns planning, shared engine changes, integration, final validation, atomic commits and pushing the branch. Workers do not commit or alter shared files without coordination.

| Set  | Cards | Luna worker | Current status                  |
| ---- | ----: | ----------- | ------------------------------- |
| ST1  |    16 | st01_08     | Pending fresh per-card evidence |
| ST2  |    16 | st01_08     | Pending fresh per-card evidence |
| ST3  |    16 | st01_08     | Pending fresh per-card evidence |
| ST4  |    16 | st01_08     | Pending fresh per-card evidence |
| ST5  |    16 | st01_08     | Pending fresh per-card evidence |
| ST6  |    16 | st01_08     | Pending fresh per-card evidence |
| ST7  |    12 | st01_08     | Pending fresh per-card evidence |
| ST8  |    12 | st01_08     | Pending fresh per-card evidence |
| ST9  |    15 | st09_17     | Pending fresh per-card evidence |
| ST10 |    15 | st09_17     | Pending fresh per-card evidence |
| ST12 |    16 | st09_17     | Pending fresh per-card evidence |
| ST13 |    16 | st09_17     | Pending fresh per-card evidence |
| ST14 |    12 | st09_17     | Pending fresh per-card evidence |
| ST15 |    16 | st09_17     | Pending fresh per-card evidence |
| ST16 |    16 | st09_17     | Pending fresh per-card evidence |
| ST17 |    13 | st09_17     | Pending fresh per-card evidence |
| ST18 |    15 | st18_24     | Pending fresh per-card evidence |
| ST19 |    15 | st18_24     | Pending fresh per-card evidence |
| ST20 |    15 | st18_24     | Pending fresh per-card evidence |
| ST21 |    15 | st18_24     | Pending fresh per-card evidence |
| ST22 |    14 | st18_24     | Pending fresh per-card evidence |
| ST23 |    15 | st18_24     | Pending fresh per-card evidence |
| ST24 |    15 | st18_24     | Pending fresh per-card evidence |

## Execution and evidence

1. Read every printed clause and local KB references, one exact card ID at a time.
2. Trace the direct module and shared interpreter mechanisms; exclusively registerIrCard(cardId, compiled), complete IR, no residual or legacy second registration.
3. Prove positive paths, meaningful negatives, exact boundaries, optional refusal, durations, costs/zones and applicable trait-peer/evolution-stack interactions through observable state. Record ambiguities below 10/10.
4. Run focused proofs and affected mechanism regressions serially with a single test worker; rerun the entire collection after changes. Collection inventory/static gates alone do not prove behavior.
5. Recalculate all per-card scores with concrete evidence in the three ST*-LUNA-REAUDIT reports; do not copy old scores or use file presence as behavioral proof.
6. Coordinator runs workspace typecheck, relevant lint/format and git diff --check, inspects changes, creates atomic commits, pushes the audit branch and opens a review PR. No merge into main.
7. Mark the Orca audit worktree complete only when the whole scope has reproducible 10/10 evidence, green focused/mechanism/collection tests and pushed commits. Until then keep in-progress and report unfinished cards explicitly.

## Initial state

- Clean main checkout; separate audit worktree created successfully via Orca.
- Frozen lockfile dependency installation succeeded.
- All three Luna workers launched; no fresh collection is certified yet.
