# BT25 Card Implementation Audit

This ledger records evidence in ascending card-ID order. A card receives 10/10 only after its complete catalog contract and local knowledge-base record are inspected, every clause is traced through its direct compiled-IR module and relevant shared primitives, and existing observable behavioral proof passes. In accordance with the requested audit policy, an already-correct card does not receive newly created tests; tests are added or strengthened when the audit finds a defect.

## BT25-001 — Tokomon — 10/10

- Catalog evidence: Red level-2 Digi-Egg, `In-Training` form, `Lesser` type, `TS` trait, no evolution recipe, no main or Security text, and inherited `[When Attacking] [Once Per Turn] If this Digimon has the [TS] trait, <Draw 1>`.
- Knowledge base: `node tools/kb/query.mjs card BT25-001` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT25-001.ts` contains one inherited `WhenAttacking`, `OncePerTurn` effect whose conditional `Draw 1` uses `selfHasTrait(TS)`. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-001", compiled)`.
- Behavioral proof: the existing focused suite uses realistic Tokomon-under-host stacks, draws exactly once for a TS carrier across two attacks in the same turn, and does not draw for a non-TS carrier. The audit found no defect, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; shared package build — passed in the delegated audit; `git diff --check` — passed. Workspace typecheck currently reports unrelated pre-existing errors in `EX6-010.test.ts` and shared removal, `runAction`, and targeting primitives; no BT25-001 file or shared seam changed.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-001
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-001.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-001.test.ts
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-001.

## BT25-002 — Wanyamon — 10/10

- Catalog evidence: Blue level-2 Digi-Egg, `In-Training` form, `Lesser` and `DATA SQUAD` traits, no evolution recipe, no main or Security text, and inherited `[Your Turn] [Once Per Turn] When you play a [DATA SQUAD] trait Tamer, both players draw 1 card`.
- Knowledge base: `node tools/kb/query.mjs card BT25-002` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT25-002.ts` installs an inherited `YourTurn`, `OncePerTurn` `whenPlayed` watcher, restricts the event subject to the controller's `DATA SQUAD` Tamer, then draws exactly 1 for `mine` and 1 for `opponent`. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-002", compiled)`.
- Behavioral proof: the existing focused suite proves both players draw from the controller's first matching Tamer, a second matching Tamer does not retrigger that turn, and an opponent-owned matching Tamer does not trigger it. The audit found no defect, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; shared subtrigger regression — 23 passed; green-Tamer mechanism selection — 2 passed; `git diff --check` — passed. Workspace typecheck reports only the already-recorded unrelated pre-existing errors and no BT25-002 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-002
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-002.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-002.test.ts
pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts
pnpm --filter @aegis/api exec vitest run src/engine/mechanic.test.ts -t 'green Tamer'
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-002.
