# EX8 re-audit worker brief (card-only lane)

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex8-luna-20260910`. English only.

Independently re-audit exactly one assigned card using `.agents/skills/verify-card-implementation/SKILL.md`. Read the catalog entry, run `node tools/kb/query.mjs card <ID>`, trace every printed clause to compiled IR, and prove it through observable public-intent tests. Remove `// @ts-nocheck` from the assigned module and fix its types without weakening behaviour. Registration must remain exclusively `registerIrCard(cardId, compiled)`; never add `registerCard`.

Allowed edits: only `apps/api/src/cards/EX8/<ID>.ts`, `apps/api/src/cards/EX8/<ID>.test.ts`, and `docs/audits/EX8-reaudit/<ID>.md`. Never edit engine/shared/catalog/other cards/coordinator docs. Never run any git write command.

Use legal evolution stacks, exact zones and endpoints, meaningful negatives, optional refusal, once-per-turn reset, duration expiry, Security/inherited behaviour, and trait peers when applicable. Injected timing is structural only. No Digi-Egg may be placed in deck or security.

Run only the focused test with `--maxWorkers=1 --no-file-parallelism`; do not run collection suites or repository-wide typecheck. Report any type error or engine gap precisely for coordinator serialization. Run scoped `oxlint`, `oxfmt --check`, and `git diff --check` for your allowed files.

The report must contain printed clauses, Q&A ids, clause-to-test-to-IR mapping, exact commands/results, defects, remaining gaps, and scores for catalog/rules, IR trace, behavioural proof, and peer/stack proof (0-2 each); delivery gates remain 0, so worker maximum is 8/10.
