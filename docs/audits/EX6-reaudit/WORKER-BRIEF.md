# EX6 re-audit worker brief (card-only lane)

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex6-luna-20260909`. Run everything there. English only.

## Goal and sources

Independently re-audit only the assigned cards. For each card, read its exact catalog record, run `node tools/kb/query.mjs card <ID>`, inspect all linked rules/rulings, trace the direct IR and every shared primitive relied upon, strengthen behavioral tests where evidence is incomplete, and write `docs/audits/EX6-reaudit/<ID>.md`.

Use `.agents/skills/verify-card-implementation/SKILL.md` in full. Existing `docs/audits/EX6-AUDIT.md` and `EX6-LUNA-REAUDIT.md` are context only, never proof.

Accepted style exemplars: `EX6-010.test.ts`, `EX6-024.test.ts`, `EX6-031.test.ts`, and `EX6-066.test.ts`.

## Evidence standards

- Map every printed clause and every local Q&A identifier to observable behavior.
- Use public intents, `settle()`, `ready()`, `startTurnLoop()`, and state observations. Injected timing is structural only and earns no behavioral credit.
- Legal evolution proof asserts memory cost, stack identity, sources, and bonus draw; include an illegal route.
- Once-per-turn proof covers same-turn refusal and next-own-turn reset.
- No Digi-Egg in security or deck. Use inert main-deck Digimon such as BT1-009 through BT1-014.
- Exact name and trait semantics must match the printed wording.
- Every card module must register only via `registerIrCard(cardId, compiled)`; never add or retain `registerCard`.
- Reverting card-specific behavior must break focused evidence for the intended reason.

## Allowed edits

Only the assigned cards' `<ID>.ts`, `<ID>.test.ts`, and `docs/audits/EX6-reaudit/<ID>.md`.

Never edit engine/shared/catalog/other cards/ledger/RUN/REVIEW-NOTES/KB-INDEX. Never run any git write. If an engine gap exists, retain a named failing/skipped test and document the exact seam; do not weaken the contract.

## Resource and test policy

This machine has 16 GiB RAM. Run only one focused file at a time:

`pnpm --filter @aegis/api exec vitest run src/cards/EX6/<ID>.test.ts --maxWorkers=1 --no-file-parallelism`

Do not run collection, engine, build, or root typecheck suites. The coordinator owns broad gates.

## Report

For each ID: printed clauses; Q&A IDs; clause-to-test-to-IR mapping; exact focused command/result; peer/stack evidence; defects fixed or retained red; gaps; score across catalog/rules, IR trace, behavioral proof, peer/stack proof (0–2 each), with delivery gates fixed at 0.

Final response must list scores, files changed, test results, retained reds/seams, and catalog discrepancies.
