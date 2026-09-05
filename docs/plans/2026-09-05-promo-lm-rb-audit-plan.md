# Promo, LM and RB audit plan — 2026-09-05

## Scope and baseline

Audit all 338 committed catalog cards: P (243, P-226 absent), LM (62), and RB1 (33; use catalog IDs, not assumed contiguous numbering). Worktree/branch: `audit-promo-lm-rb-20260905`, based on main `7209adb8984fa3b8f28d974e6ac5ec1657091aba`. Existing unrelated main modifications are excluded. Previous ledger scores are claims to revalidate, not acceptance evidence.

## Execution and ownership

Three gpt-5.6-luna workers operate in this shared isolated checkout:

- Promo early: P-001 through P-122; owns those direct modules/tests and `docs/audits/P-20260905-001-122.md`.
- Promo late: P-123 through P-244 (excluding absent P-226); owns those direct modules/tests and `docs/audits/P-20260905-123-244.md`.
- LM/RB: all 62 LM and 33 RB1 cards; owns those direct modules/tests and `docs/audits/LM-RB1-20260905.md`.
- Coordinator: shared engine seams, catalog synchronization, canonical ledger recalculation, collection gates, review, atomic commits, push and PR.

Workers read the verify-card-implementation skill, work one card at a time, and identify every printed main, inherited, Security and alternate evolution clause in catalog/KB/rules. Trace executable IR and primitives. Inspect existing proof critically; add observable positive, negative, boundary, optional-refusal, cost/zone, duration/OPT and comparative trait/evolution-stack proof where applicable. Do not award 10/10 from registration or file-presence tests. Record specific test names and source/implementation mapping per card, as well as unresolved limitations and honest scores.

Workers do not commit or edit shared engine/catalog/canonical ledger files. Request shared changes with a failing reproduction; coordinator owns integration. Registration is exclusively `registerIrCard(cardId, compiled)`; no second handwritten registration. Limit concurrent test workers to one per worker process and avoid broad suites during concurrent focused work. Coordinator performs final aggregate runs after workers finish.

## Validation and delivery

Run focused behavioral proof, affected mechanism regressions, all three collection suites, effects sync/check for changed sets, workspace typecheck, changed-file lint/format and `git diff --check`. Resolve failures; document any independently reproduced unrelated baseline failure. Recalculate each canonical ledger from actual new evidence, preserving below-10 scores for limitations. Completion requires every card at reproducible 10/10, green focused/mechanism/collection tests, atomic commits and pushed branch. Open a review PR without merging. Mark the Orca worktree completed only after the full collection acceptance is proven, with `COLLECTION COMPLETE: P, LM, RB1; 100% 10/10; branch pushed`.
