# EX12 re-audit worker brief

Worktree: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex12-astra-luna`

Audit every assigned card from printed contract to observable behavior. Read `.agents/skills/verify-card-implementation/SKILL.md` before editing. For each card, reconcile the committed catalog entry, `node tools/kb/query.mjs card <ID>`, applicable KB sources, direct compiled IR module, focused suite, shared primitives, and relevant peer/evolution-stack behavior.

Allowed files are only the assigned `apps/api/src/cards/EX12/<ID>.ts`, matching `<ID>.test.ts`, and the assigned range report under `docs/audits/EX12-reaudit/`. Do not edit engine, shared data, catalog, collection ledgers, coordinator notes, or another lane's files. Do not run any git write command. If an engine/shared/catalog gap is found, keep a faithful failing proof as `it.fails` when possible and document the exact seam for the coordinator.

All executable behavior must remain exclusively registered with `registerIrCard(cardId, compiled)`. Never introduce or preserve a second `registerCard` registration.

Treat the existing 10/10 ledger and 2026-09-05 reports as claims to falsify. Known risks requiring fresh verification include Decode host scoping, Digi-Egg counting, free Option use without hidden limits, Use Requirement zones, optional processing costs, Guard behavior, Fortitude ordering under Q6866, deletion provenance, DNA recipe gating, trait/effective-name handling, and persisted IR drift.

For each card report: catalog clauses and ruling IDs; clause-to-IR trace; behavioral cases and observed state; peer/stack evidence or why inapplicable; focused command/result; registration check; mutation/reversion sensitivity; score capped at 8/8 worker-owned points. A test must fail for the intended reason if the card-specific behavior is reverted. Avoid Digi-Eggs in deck/security, injected timing such as `advance.fire`, and assertions that prove only `{ ok: true }` without cost/stack state.

Focused command:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX12/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
```
