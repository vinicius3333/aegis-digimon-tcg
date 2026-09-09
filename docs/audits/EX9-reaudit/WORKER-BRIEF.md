# EX9 re-audit worker brief

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex9-luna-20260909`. Work only there. English only.

Audit assigned cards one at a time using `.agents/skills/verify-card-implementation/SKILL.md` and the set protocol in `.agents/skills/audit-card-set/SKILL.md`.

Sources: catalog `packages/shared/src/cards/data/cards.json`; `node tools/kb/query.mjs card <ID>`; comprehensive rules and linked KB entries; direct module/test; `REVIEW-NOTES.md`; applicable mechanism docs. Existing EX9 audit documents are historical hints only.

For each card, map every printed clause and every Q&A id to executable IR and observable behavioral proof. Exercise public legal evolution routes, costs, stack identity, negative boundaries, optional refusal, durations, inherited/security behavior and once-per-turn reset where applicable. Peer/stack proof must use realistic mixed fixtures. Never count `advance.fire`, `fireTiming`, or `fireSubTrigger` as behavioral proof.

Fixtures: no Digi-Egg in deck/security; use inert main-deck Digimon. Exact names use `nameExact`/`namesExact`; exact traits use `match: "trait"`; substring only when printed. Resolve all effects before final assertions.

Card modules must register exclusively with `registerIrCard(cardId, compiled)`; never add or preserve a duplicate `registerCard`.

Allowed edits are only the assigned card's `apps/api/src/cards/EX9/<ID>.ts`, `<ID>.test.ts`, and `docs/audits/EX9-reaudit/<ID>.md`. Do not edit engine/shared/catalog/other cards/ledger/RUN/notes/KB index. Never run any Git write.

If an engine gap blocks fidelity, retain a named `it.fails` or `it.skip`, document expected vs actual and the exact seam, and continue. Do not weaken assertions.

Verify each card with focused Vitest, API typecheck, Oxlint/Oxfmt on touched files, and `git diff --check`. The report must include printed clauses, Q&A ids, clause→test→IR mapping, commands/results, defects, gaps and an honest score of at most 8/10 with delivery gates fixed at 0.
