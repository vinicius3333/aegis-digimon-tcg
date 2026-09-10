# EX2 re-audit worker brief (card-only lane)

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex2-luna-20260909`; work only there. English only.

Read `.agents/skills/verify-card-implementation/SKILL.md` completely before editing. Independently re-audit ONE assigned card against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, comprehensive rules, its direct module/test, and relevant peers. Every printed clause and Q&A must have observable behavioral proof; use public intents and legal evolution stacks. Remove `// @ts-nocheck` from the assigned module and correct every exposed type error using the current IR schema. Registration must remain exclusively `registerIrCard(cardId, compiled)`.

Allowed edits are only `apps/api/src/cards/EX2/<ID>.ts`, `apps/api/src/cards/EX2/<ID>.test.ts`, and `docs/audits/EX2-reaudit/<ID>.md`. Never edit engine/shared/catalog/other cards/ledger/RUN/REVIEW-NOTES. Never run any Git write command. If an engine gap appears, retain a named failing/skipped test and report the seam; do not weaken expectations.

Evidence rules: no Digi-Egg in deck/security; no numeric `security: <n>` shortcut; injected timing/internal verbs are structural only; exact names and traits use exact matching; once-per-turn needs same-turn refusal and real next-own-turn reset; evolution needs legal source, paid cost, stack identity/draw, and an illegal-source negative; settle all effects and assert exact observable endpoints.

Run only the focused suite with `--maxWorkers=1 --no-file-parallelism`; do not run workspace typecheck or broad suites because the coordinator serializes them for RAM safety. Run scoped Oxlint/Oxfmt checks and `git diff --check`. The report must include clauses, Q&A ids, clause-to-test-to-IR mapping, exact commands/results, changes, remaining gaps, and rubric scores for catalog/rules, IR trace, behavioral proof, peer/stack proof (0-2 each), with gates fixed at 0.
