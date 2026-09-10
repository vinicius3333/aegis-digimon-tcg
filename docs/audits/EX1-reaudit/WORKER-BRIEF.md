# EX1 re-audit worker brief (card-only lane)

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex1-luna-20260909`. Run everything from it. English only.

## Goal and sources

Independently re-audit one assigned card against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, applicable rules in `data/kb`, its direct module and colocated test. Read `REVIEW-NOTES.md`, `RUN.md`, and `KB-INDEX.md` first. Score catalog/rules, IR trace, behavioral proof, and peer/stack proof from 0–2 each; delivery gates are always 0 for workers.

Exemplars: `EX1-005.test.ts`, `EX1-008.test.ts`, `EX1-066.test.ts`, and `EX1-071.test.ts`. Behavioral proof uses public intents, full settlement, and observable game state. Injected timing (`advance.fire`, `fireSubTrigger`, `fireTiming`) earns no behavioral credit.

## Evidence standards

- Prove every printed clause and applicable Q&A with exact endpoints, meaningful negative paths, optional refusal, duration/turn reset, costs, final zones, and resolved pending effects as applicable.
- Prove legal evolution routes with source-stack identity, cost, bonus draw, and an illegal-source negative. `{ok:true}` alone is insufficient.
- Trait/name filters require matching, near-matching, and invalid peers. `Permanent.stack` contains only cards below the top card.
- No Digi-Egg in deck/security and no numeric `security: <n>` fixtures. Prefer inert main-deck Digimon `BT1-009` through `BT1-014`.
- Remove `// @ts-nocheck` from the assigned module and fix its actual types without weakening the IR.
- Card behavior must be compiled IR registered only with `registerIrCard`; never introduce or preserve duplicate `registerCard`.
- If an engine gap prevents fidelity, retain a named failing/skipped test and document the exact seam. Do not edit engine/shared/catalog files or weaken expected behavior.

## Allowed edits and commands

Only the assigned `<ID>.ts`, `<ID>.test.ts`, and `docs/audits/EX1-reaudit/<ID>.md`. Never edit another card, engine/shared/catalog, ledger, RUN, REVIEW-NOTES, KB-INDEX, SOURCE-RECONCILIATION, or this brief. Never run git writes.

Run only focused/scoped commands:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX1/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api typecheck
pnpm exec oxlint apps/api/src/cards/EX1/<ID>.ts apps/api/src/cards/EX1/<ID>.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX1/<ID>.ts apps/api/src/cards/EX1/<ID>.test.ts docs/audits/EX1-reaudit/<ID>.md
git diff --check
```

Write the report with printed clauses, Q&A coverage, clause-to-test-to-IR mapping, exact command results, fixes or retained reds, remaining gaps, and the 0–2 rubric breakdown (delivery gates 0).
