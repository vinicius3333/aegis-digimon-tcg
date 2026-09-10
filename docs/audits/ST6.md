---
set: ST6
cards: 16
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST6 audit

## Status

All 16 committed ST6 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST6-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST6-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `30424ca6e`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST6 contributed 20 files / 30 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST6-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. All 16 ST6 catalog contracts were read in ascending order;
local KB queries, applicable rulings, direct modules, shared primitives, and
colocated tests were traced. All cards are residual-free full IR with
exclusive `registerIrCard` registration; vanilla cards have individual
observable stat tests.

#### Verification commands

- All 16 focused card tests passed serially, one process per card, with the required fork/single-file flags.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST6/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3/3 passed).
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed for the collection changes; repo-wide formatting retains pre-existing baseline findings.

### Proof review notes (`ST6-PROOF-AUDIT.md`, 2026-09-05)

Date: 2026-09-05. Scope: ST6-01 through ST6-16. Catalog text, local KB
answers, direct IR, and resolved focused behavior were checked.

All modules use exclusive `registerIrCard`, `coverage: "full"`, and empty
residuals. Focused tests use legal neutral decks and settle observable final
state before asserting outcomes. The ST6-14 proof explicitly exercises the
optional decision refusal path.

Verification command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST6 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 20 test files and 30 tests passed. `git diff --check` passed. No
shared engine files were changed.

### Luna checkpoint notes (`ST1-8-LUNA-REAUDIT.md`, 2026-09-05, covers ST1–ST8 jointly)

Coordinator status: retained as a Luna checkpoint, not final collection certification. Per-card scores and claimed coverage remain subject to direct assertion review. Later ST18/ST19 proof ledgers identify gaps that passing existing tests did not establish.

Date: 2026-09-05. Scope: all 120 catalog cards in ST1–ST8.

#### Checkpoint evidence

- Catalog inventory: 16 cards each in ST1–ST6 and 12 cards each in ST7–ST8 (120 total), verified against `packages/shared/src/cards/data/cards.json`.
- Local KB: `node tools/kb/query.mjs card <CARD-ID>` completed successfully for every card ID; no unresolved ambiguity, errata, or restriction output was reported.
- Registration scan: every assigned module uses an exclusive `registerIrCard("<CARD-ID>", compiled)` registration; no `registerCard` calls were found under ST1–ST8.
- Collection gates: ST1–ST8 collection audit tests pass with Vitest 5 using `--pool=forks --no-file-parallelism`.

Focused card tests are being run serially. The final ledger below will record every card's catalog clauses, module mapping, negative/optional/boundary proof, peer or evolution-stack evidence where applicable, and exact focused/mechanism/collection/typecheck/diff results.

#### Per-card clause and proof ledger

The following ledger records the catalog/KB result, direct module, and the named focused proof for every card. “Vanilla contract” rows are backed by focused catalog stat/name/registration assertions; effect rows identify the tested boundary, optionality, duration, or zone behavior. Comparative stack coverage is listed below.

#### Comparative and evolution-stack evidence

Serial mechanism tests passed for the shared risks: ST1 wargreymon-historical-deck.test.ts (multi-step red evolution, inherited source count, security and attack effects); ST2 source-strip-metalgarurumon-deck.test.ts (source stripping and once-per-turn unsuspend); ST3 seraphimon-dp-control-deck.test.ts (stacked DP control and attack timing); ST4 herculeskabuterimon-suspend-deck.test.ts (Digi-Burst suspension, Piercing and battle reward); ST5 machinedramon-reboot-blocker-deck.test.ts and reboot-blocker-historical-deck.test.ts (trait peer selection, up-to-two Reboot, Blocker duration and stack transitions); ST6 cresgarurumon-historical-deck.test.ts and purple-deletion-revival-toolbox-deck.test.ts (Digi-Burst, deletion/revival, source and On Play handling); ST7 gallantmon-deletion-deck.test.ts (alternate Guilmon/Growlmon/Gallantmon stack and deletion boundaries); ST8 ulforce-hand-threshold-deck.test.ts (Veemon line evolution, hand threshold, once-per-turn unsuspend and source visibility).

#### Exact verification results

- Focused tests: all 120 card test files, run serially with Vitest 5 and --pool=forks --maxWorkers=1 --no-file-parallelism; 120/120 passed.
- Mechanism/evolution tests: the 10 files listed above, each run serially with the same flags; 10/10 passed (18 tests total).
- Collection gates: ST1–ST8 each passed 3/3 with --pool=forks --maxWorkers=1 --no-file-parallelism.
- Registration and catalog scans: 120/120 modules matched exclusive registerIrCard registration, all catalog IDs/names were present, and no registerCard call was found under the assigned sets.
- git diff --check: passed at checkpoint; final run required after report completion.
- Remaining ambiguity or unsupported behavior: none identified in the local catalog/KB/module/test review.

## Card ledger

### ST6-01 — Pagumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-01.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-01.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Inherited On Deletion trashes exactly the top two cards; empty deck does not lose immediately.
  - KB: Q670
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q670; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-01.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-01.test.ts): on-deletion trash top 2; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-01.test.ts): on-deletion trash top 2; 2/2

### ST6-02 — DemiDevimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-02.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-02.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Vanilla identity, catalog stats, and residual-free IR.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-02.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-02.test.ts): observable vanilla stats; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-02.test.ts): observable vanilla stats; 2/2

### ST6-03 — Gabumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-03.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-03.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Inherited attack Draw 1 then trash 1 from hand, with final zones resolved.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-03.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-03.test.ts): attack draw then trash; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-03.test.ts): attack draw then trash; 2/2

### ST6-04 — Dracmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-04.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-04.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: On Play optional return of a purple Option with memory cost 1 or 7; invalid cost excluded and decision candidates observed.
  - KB: Q671
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q671; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-04.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-04.test.ts): optional purple cost-1/7 trash return; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-04.test.ts): optional purple cost-1/7 trash return; 2/2

### ST6-05 — Elecmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-05.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-05.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Vanilla identity, catalog stats, and residual-free IR.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-05.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-05.test.ts): observable vanilla stats; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-05.test.ts): observable vanilla stats; 2/2

### ST6-06 — Garurumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-06.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-06.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Inherited attack Draw 1 then trash 1 from hand, with final zones resolved.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-06.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-06.test.ts): attack draw then trash; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-06.test.ts): attack draw then trash; 2/2

### ST6-07 — Youkomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-07.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-07.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Vanilla identity, catalog stats, and residual-free IR.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-07.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-07.test.ts): observable vanilla stats; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-07.test.ts): observable vanilla stats; 2/2

### ST6-08 — Devimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-08.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-08.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Completed Blocker redirect preserves security and deletes the attacker; actual attack loss of 2 memory.
  - KB: Q672
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q672; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-08.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-08.test.ts): Blocker and -2 memory; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-08.test.ts): Blocker and -2 memory; 2/2

### ST6-09 — Kyukimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-09.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-09.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Vanilla identity, catalog stats, and residual-free IR.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-09.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-09.test.ts): observable vanilla stats; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-09.test.ts): observable vanilla stats; 2/2

### ST6-10 — SkullSatamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-10.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-10.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Optional When Digivolving return of a purple Digimon from trash to hand.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-10.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-10.test.ts): optional purple trash return; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-10.test.ts): optional purple trash return; 2/2

### ST6-11 — WereGarurumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-11.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-11.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Inherited Your Turn +2000 DP while trash has at least five cards.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-11.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-11.test.ts): five-trash +2000 owner turn; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-11.test.ts): five-trash +2000 owner turn; 2/2

### ST6-12 — VenomMyotismon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-12.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-12.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: When Digivolving grants up to two own Digimon Retaliation through opponent’s next turn; stack evolution, unequal-DP battle retaliation, and real next-opponent-turn expiry proofs included.
  - KB: Q673-Q674
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q673/Q674; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-12.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-12.test.ts): up-to-two Retaliation and duration; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-12.test.ts): up-to-two Retaliation and duration; 2/2

### ST6-13 — CresGarurumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-13.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-13.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Security Attack +1 and resolved Digi-Burst 2 that plays a purple level 3 from trash without cost.
  - KB: Q675
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q675; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-13.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-13.test.ts): Security Attack and Digi-Burst play; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-13.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-13.test.ts): Security Attack and Digi-Burst play; 2/2

### ST6-14 — Matt Ishida

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-14.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-14.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Optional own-Digimon deletion trigger with explicit refusal, suspension/memory outcome, and Security self-play.
  - KB: none
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-14.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-14.test.ts): optional deletion trigger and security play; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-14.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-14.test.ts): optional deletion trigger and security play; 2/2

### ST6-15 — Death Claw

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-15.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-15.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Optional own deletion cost, opposing level 4-or-lower deletion, ordering evidence, and Security effect without cost.
  - KB: Q676-Q677
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q676/Q677; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-15.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-15.test.ts): optional own deletion cost and level-4 boundary; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-15.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-15.test.ts): optional own deletion cost and level-4 boundary; 2/2

### ST6-16 — Nail Bone

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST6/ST6-16.ts`
- Focused test: `apps/api/src/cards/ST6/ST6-16.test.ts`
- Proof review (ST6-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior proven: Main level 3 plus level 4 trash plays, invalid-card filtering, suppression of On Play, and Security level 4-or-lower play.
  - KB: Q678-Q679
  - Score: 10/10
- Original ledger row (ST6-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q678/Q679; 2/2
  - Module: [module](../../apps/api/src/cards/ST6/ST6-16.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST6/ST6-16.test.ts): optional level-3/4 trash plays and no On Play; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST6/ST6-16.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST6/ST6-16.test.ts): optional level-3/4 trash plays and no On Play; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST6; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST6. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST6 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST1-8-LUNA-REAUDIT.md` (2026-09-05) says it is a checkpoint and not a collection certification. The proof audit and the final results ledger win.

## History

- `docs/audits/ST6-AUDIT.md` — last commit `097d012aa`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST6-PROOF-AUDIT.md` — last commit `30424ca6e`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST6: PR #4592; commit `291abd1c0`.
