# BT20 re-audit worker brief

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt20-luna-20260910`. Work only there. English only.

Audit assigned cards one at a time using `.agents/skills/verify-card-implementation/SKILL.md` and the set protocol in `.agents/skills/audit-card-set/SKILL.md`. Existing BT20 audit documents are historical hints only and must be independently checked.

For every card, reconcile the catalog, `node tools/kb/query.mjs card <ID>`, linked rules/Q&A, the direct module, compiled IR, and observable tests. Cover every printed clause, legal evolution routes and costs, realistic stacks, meaningful negative boundaries, optional refusal, durations, inherited/security behavior, and once-per-turn reset when applicable. Injected timing is structural evidence only.

Card modules must register exclusively with `registerIrCard(cardId, compiled)` and contain no `@ts-nocheck`; never add or preserve `registerCard`.

Fixtures must not put Digi-Eggs in deck or security. Exact names and traits must use exact matching. Resolve all effects before final assertions.

Card lanes may edit only their assigned card's module, colocated test, and `docs/audits/BT20-reaudit/<ID>.md`. Never edit engine, shared data, catalog, another card, ledger, RUN, notes, or KB index. Never run Git writes. If an engine gap exists, retain a named failing/skipped proof and document the exact seam instead of weakening behavior.

Do not run broad suites or typecheck concurrently. Run only the assigned focused test with `--maxWorkers=1 --no-file-parallelism` when the coordinator explicitly permits it; otherwise inspect and edit, then report the exact focused command needed. Logs belong under the ignored `docs/audits/BT20-reaudit/logs/` directory.

Each report must include printed clauses, Q&A ids, clause-to-test-to-IR mapping, commands/results, defects, gaps, and an honest score up to 8/10 with gates fixed at 0.
