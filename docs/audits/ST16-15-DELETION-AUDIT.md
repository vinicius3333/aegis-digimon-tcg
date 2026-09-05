# ST16-15 deletion grant correction

Audit branch: `audit-st-20260905`. Baseline: `b2c75b6bf`.

The Q824 focused scenario plays Lament of Friendship on Garurumon, legally evolves the recipient into Sandiramon (BT10-079), then deletes that permanent. The granted mandatory On Deletion effect must play the deleted top card without paying its cost. The original assertion failed: Sandiramon stayed in trash.

A temporary event probe established that `reanchorCustomEffectGrants` already moved the grant to Sandiramon's instance ID. The grant itself therefore survived evolution. The deletion snapshot instead retained `isActive`, a live callback that checked whether the recipient still existed in the battle area. By trigger collection time the recipient had been removed, so the callback returned false and suppressed the grant.

The deletion primitive now captures the activation result alongside each deleted recipient’s grant before batch removal. The callback stored in the event snapshot returns that captured result. Live ledger entries retain their original callbacks, so later unrelated aura checks still evaluate live immunity. Temporary probes were removed.

## Verification

- Original isolated command: `pnpm --filter @aegis/api exec vitest run src/cards/ST16/ST16-15.test.ts --maxWorkers=1 --no-file-parallelism`: 2 passed, Q824 failed.
- Same focused command after correction: 3 passed.
- Affected regression command: `pnpm --filter @aegis/api exec vitest run src/cards/ST16/ src/cards/BT12/BT12-072.test.ts src/cards/EX1/EX1-068.test.ts src/engine/effects/collect.test.ts src/engine/effects/grantAuraOwnership.test.ts src/engine/effects/grantedEffectLibrary.test.ts src/engine/effects/primitives.test.ts --maxWorkers=1 --no-file-parallelism`: 23 files, 217 tests passed; log `/tmp/aegis-st-grant-regression.log`.

This fixes the identified Q824 failure. It does not certify the entire ST16 collection's printed clauses or the broader ST audit. Independent review accepted this effect-deletion fix and identified an adjacent battle-deletion path that still needs its own snapshot. A Luna worker owns that follow-up. API typecheck, targeted lint/format, and diff validation passed. Surviving recipients retain their live gates; only deleted recipients are frozen.
