---
set: ST4
cards: 16
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST4 audit

## Status

All 16 committed ST4 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST4-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST4-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `60f348a33`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST4 contributed 19 files / 37 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST4-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. All 16 ST4 catalog contracts were read in ascending order;
each local KB query was run, applicable Q&A was traced, and every direct
module, shared primitive, and colocated proof was inspected. All cards are
full, residual-free compiled IR with exclusive `registerIrCard` registration.

#### Verification commands

- All 16 focused card tests passed serially, one process per card, using `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST4/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3/3 passed).
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed for the collection changes; repo-wide formatting retains pre-existing baseline findings.

### Proof review notes (`ST4-PROOF-AUDIT.md`, 2026-09-05)

This ledger maps the committed ST4 catalog clauses to direct IR and observable
card tests. Scores require a live state assertion for effect behavior; structural
IR checks alone are not treated as proof.

The ST4-04 and ST4-06 Blocker cases specifically preserve the catalog Q647/Q649
boundary: a player attack does not become an opponent-Digimon attack merely
because a blocker redirects it.

Verification command (run serially after shared regression work completes):

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST4 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Focused changed-card run: 4 files passed, 11 tests passed. Full collection:
19 files passed, 37 tests passed.

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

### ST4-01 — Motimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-01.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-01.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live level-6 inherited +1000 DP and level/turn negatives.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-01.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-01.test.ts): level-6 inherited +1000; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-01.test.ts): level-6 inherited +1000; 2/2

### ST4-02 — Floramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-02.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-02.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live vanilla identity and residual-free empty IR.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-02.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-02.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-02.test.ts): vanilla contract; 2/2

### ST4-03 — Tentomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-03.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-03.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live green Digimon add and non-green deck-bottom paths.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q3192; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-03.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-03.test.ts): top-card green reveal/add or bottom; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-03.test.ts): top-card green reveal/add or bottom; 2/2

### ST4-04 — Palmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-04.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-04.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live opponent-Digimon attack bonus, player-attack negative, and Blocker redirection negative.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q647/Q648; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-04.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-04.test.ts): opponent-Digimon attack +2000; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-04.test.ts): opponent-Digimon attack +2000; 2/2

### ST4-05 — Kunemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-05.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-05.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live vanilla identity and residual-free empty IR.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-05.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-05.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-05.test.ts): vanilla contract; 2/2

### ST4-06 — Togemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-06.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-06.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live opponent-Digimon attack bonus, player-attack negative, and Blocker redirection negative.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q649/Q650; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-06.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-06.test.ts): opponent-Digimon attack +2000; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-06.test.ts): opponent-Digimon attack +2000; 2/2

### ST4-07 — Kuwagamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-07.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-07.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live vanilla identity and residual-free empty IR.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-07.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-07.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-07.test.ts): vanilla contract; 2/2

### ST4-08 — Kabuterimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-08.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-08.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live Blocker keyword and completed attack with exact −2 memory.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q651; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-08.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-08.test.ts): Blocker and -2 memory; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-08.test.ts): Blocker and -2 memory; 2/2

### ST4-09 — Okuwamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-09.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-09.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live vanilla identity and residual-free empty IR.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-09.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-09.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-09.test.ts): vanilla contract; 2/2

### ST4-10 — Lillymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-10.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-10.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live evolution reveal, level-6 add, and five-card deck consumption.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-10.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-10.test.ts): top-5 level-6 search and bottom order; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-10.test.ts): top-5 level-6 search and bottom order; 2/2

### ST4-11 — MegaKabuterimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-11.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-11.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live battle deletion survivor reward, security effect non-activation, and empty-security rule.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q652/Q653; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-11.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-11.test.ts): battle deletion survival and security trash; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-11.test.ts): battle deletion survival and security trash; 2/2

### ST4-12 — Rosemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-12.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-12.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live restriction through opponent evolution and expiry after the opponent’s next turn.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q654–Q656; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-12.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-12.test.ts): opponent next-turn attack/block restriction; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-12.test.ts): opponent next-turn attack/block restriction; 2/2

### ST4-13 — HerculesKabuterimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-13.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-13.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live Digi-Burst source removal, suspension, Piercing combat, and security sequencing.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-13.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-13.test.ts): Piercing plus Digi-Burst 2 suspend; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-13.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-13.test.ts): Piercing plus Digi-Burst 2 suspend; 2/2

### ST4-14 — Izzy Izumi

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-14.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-14.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live optional memory gain, Blocker-trigger path, refusal, and Security play.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q657; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-14.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-14.test.ts): optional self-suspend after opponent suspension and security play; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-14.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-14.test.ts): optional self-suspend after opponent suspension and security play; 2/2

### ST4-15 — Needle Spray

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-15.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-15.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live Main suspension and Security Main-plus-return path.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-15.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-15.test.ts): suspend and security main; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-15.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-15.test.ts): suspend and security main; 2/2

### ST4-16 — Electro Shocker

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST4/ST4-16.ts`
- Focused test: `apps/api/src/cards/ST4/ST4-16.test.ts`
- Proof review (ST4-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Live suspended target return with all-source trash and Security activation.
  - Score: 10/10
- Original ledger row (ST4-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST4/ST4-16.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST4/ST4-16.test.ts): suspended target return/source trash; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST4/ST4-16.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST4/ST4-16.test.ts): suspended target return/source trash; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST4; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST4. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST4 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST1-8-LUNA-REAUDIT.md` (2026-09-05) says it is a checkpoint and not a collection certification. `ST4-PROOF-AUDIT.md` (2026-09-05) requires a live state assertion per effect and does not accept structural IR checks as proof. The proof audit and the final results ledger win.

## History

- `docs/audits/ST4-AUDIT.md` — last commit `097d012aa`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST4-PROOF-AUDIT.md` — last commit `60f348a33`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST4: PR #4591; commit `9ddd1b002`.
