# EX7 card-lane brief

Audit exactly one assigned card using `verify-card-implementation`. Read that skill in full first.

Sources: `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, the comprehensive rules knowledge base, the direct module/test, and coordinator notes.

Every printed clause and every Q&A requires observable behavioral proof through public intents. Evolution tests must assert legal route, source stack identity, cost, bonus draw, and an illegal-source negative. Once-per-turn behavior requires same-turn refusal and next-turn reset through the real turn loop. Injected timing is structural only.

Fixtures must not put Digi-Eggs in deck/security. Use inert main-deck Digimon such as BT1-009 through BT1-014. `Permanent.stack` contains only cards beneath the top card.

Allowed edits are exclusively:

- `apps/api/src/cards/EX7/<ID>.ts`
- `apps/api/src/cards/EX7/<ID>.test.ts`
- `docs/audits/EX7-reaudit/<ID>.md`

Never edit engine/shared/catalog/ledger/RUN/REVIEW-NOTES or another card. Never perform any git write. Preserve an engine gap as `it.fails` with a named seam and report it.

Executable behavior must remain exclusively registered with `registerIrCard(cardId, compiled)`; never add or preserve a duplicate `registerCard`.

Focused command:
`pnpm --filter @aegis/api exec vitest run src/cards/EX7/<ID>.test.ts --maxWorkers=1 --no-file-parallelism`

Report printed clauses, Q&A ids, clause-to-test-to-IR mapping, exact commands/results, defects, retained reds, remaining gaps, and rubric scores (0–2 for the first four columns, gates always 0; maximum 8/10).
