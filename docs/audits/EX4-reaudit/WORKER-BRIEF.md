# EX4 re-audit worker brief (card-only lane)

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex4-luna-20260909`. Work only in this worktree. English only.

## Goal

Independently re-audit ONE assigned card using the `verify-card-implementation` skill and produce reproducible evidence for catalog/rules, IR trace, behavioral proof, and peer/stack proof. Score honestly; worker delivery gates are always 0 and a worker report claims at most 8/10.

## Sources of truth

- Catalog: `packages/shared/src/cards/data/cards.json`.
- Rulings: `node tools/kb/query.mjs card <ID>`, `node tools/kb/query.mjs rules "<phrase>"`, `data/kb/rules/comprehensive.md`, and `docs/audits/EX4-reaudit/KB-INDEX.md`.
- Direct module/test: `apps/api/src/cards/EX4/<ID>.ts` and `<ID>.test.ts`.
- Coordinator context: `docs/audits/EX4-reaudit/REVIEW-NOTES.md` and `RUN.md`.
- Useful public-flow exemplars: `EX4-030.test.ts`, `EX4-036.test.ts`, and `EX4-074.test.ts`.

## Evidence standards

- Map every printed clause and every listed Q&A to observable behavior after effects settle.
- Prove exact boundaries, meaningful negative paths, optional refusal, costs, destinations, durations, inherited/security effects, and once-per-turn reset when applicable.
- Use public intents and realistic legal stacks. Evolution assertions include cost, bonus draw, top/source identity, and an illegal-route negative.
- Never place Digi-Egg cards in deck or security. Avoid numeric `security: <n>` fixtures.
- Injected timing helpers are structural only and earn no behavioral credit.
- Reverting the card-specific implementation must break at least one focused assertion for the intended reason.

## Allowed edits

Only `<ID>.ts`, `<ID>.test.ts`, and `docs/audits/EX4-reaudit/<ID>.md`.
Never edit engine/shared/catalog/other cards/ledger/RUN/REVIEW-NOTES/brief. Never perform any git write.
If the engine lacks a seam, retain an explicit `it.fails` or `it.skip`, document expected versus actual behavior, and report the seam.

## Resource-safe commands

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX4/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api typecheck
pnpm exec oxlint apps/api/src/cards/EX4/<ID>.ts apps/api/src/cards/EX4/<ID>.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/<ID>.ts apps/api/src/cards/EX4/<ID>.test.ts
git diff --check
```

Do not run root typecheck, collection suites, or more than one Vitest process. Logs belong under `docs/audits/EX4-reaudit/logs/`.

## Report

Write `docs/audits/EX4-reaudit/<ID>.md` with printed clauses, Q&A ids, clause-to-test-to-IR mapping, exact command results, defects fixed or retained reds, remaining gaps, and a 0–2 score for each worker rubric column plus 0 for delivery gates.
