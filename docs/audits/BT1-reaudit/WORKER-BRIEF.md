# BT1 re-audit worker brief (card-only lane)

Repository: current dedicated audit worktree. English only. Read and fully follow `.agents/skills/verify-card-implementation/SKILL.md` before each card.

## Goal

Audit each assigned card one at a time. For each, verify every printed clause against the catalog and local KB, trace compiled IR behavior, strengthen observable behavioral tests, compare peers/evolution stacks, and write `docs/audits/BT1-reaudit/<ID>.md`. Worker score is at most 8/10; delivery gates remain 0.

## Sources and exemplars

Use `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, relevant `data/kb` rules, the direct module/test, and nearby accepted-style tests. Start with `BT1-001.test.ts`, `BT1-003.test.ts`, `BT1-010.test.ts`, and `BT1-082.test.ts` as structural references, but independently verify their fixture quality.

## Hard requirements

- Executable behavior registers exclusively with `registerIrCard(cardId, compiled)`; never add/preserve duplicate `registerCard`.
- Remove any real `@ts-nocheck` in assigned production/test files.
- No Digi-Egg in deck/security; no numeric security shorthand; no behavioral credit for injected timing.
- Real legal evolution stacks must prove routes, costs, draw, source identity, inherited effects, and illegal negatives where applicable.
- Once-per-turn requires same-turn refusal and next-own-turn reset. Resolve full stacks before observable state assertions.
- Engine gaps stay retained red with a named seam and report; do not edit engine/shared/catalog/coordinator docs.
- Never perform git stash/checkout/restore/reset/worktree or any other git write.
- Heavy/focused Vitest commands must include `--maxWorkers=1 --no-file-parallelism`; never run collection or engine suites. Coordinate so only one test process runs at a time.

## Allowed edits

Only each assigned `apps/api/src/cards/BT1/<ID>.ts`, `<ID>.test.ts`, and `docs/audits/BT1-reaudit/<ID>.md`. Do not edit ledger, RUN, REVIEW-NOTES, KB-INDEX, engine, shared, catalog, other cards, or scratch tests.

## Per-card verification

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/<ID>.test.ts --maxWorkers=1 --no-file-parallelism`; then bounded typecheck/diff/format checks. Report exact results, clauses, Q&A ids, IR map, peer/stack proof, gaps, score, and changed files.
