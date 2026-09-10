---
set: ST2
cards: 16
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST2 audit

## Status

All 16 committed ST2 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST2-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST2-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `e4cae2ca2`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST2 contributed 18 files / 53 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST2-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. Scope: all 16 catalog cards in ascending order. Printed
contracts were read from `packages/shared/src/cards/data/cards.json`, every
card was queried with the local KB, and each module/test/shared primitive was
traced. The audit corrected nine legacy generated modules to bind a local
`compiled` value before their exclusive `registerIrCard` call.

#### Verification commands

- All 16 focused card tests were run serially, one process per card, with `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`; all passed.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST2/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3 tests passed).
- The gate derives all 16 IDs/names, verifies every index import and colocated proof, and enforces exclusive `registerIrCard(cardId, compiled)`, full coverage, empty residuals, and no `RawUnparsed` nodes.

ST2-12 now proves both start-of-turn memory and Security play through the production turn and
attack operations, including the exact memory result and card identity.

### Proof review notes (`ST2-PROOF-AUDIT.md`, 2026-09-05)

Date: 2026-09-05. All 16 starter cards retain exclusive direct IR registration.
The current review covers committed catalog clauses, local rulings and observable
test outcomes. This supersedes historical completion claims for this collection.

The new evolution-line proof evolves Gabumon through Garurumon and WereGarurumon
into MetalGarurumon, paying 2/3/4 memory and drawing three exact instances. Two
completed attacks strip both opposing sources, apply the extra security check only
after the last source leaves, and respect MetalGarurumon's once-per-turn unsuspend.

Tsunomon's `whenBlocked` watcher previously matched the original attacker as an
opponent and checked the wrong battle participant. It now binds its own attacking
host and checks the source-less opposing blocker. Real printed 7000-DP combat
proves the inherited +1000 changes the outcome; on the opponent's turn the tied
battle instead deletes both Digimon.

Kaiser Nail pays exactly its printed cost of 4. The new Digimon has printed DP and
does not inherit the old host's temporary +4000 DP. Egg/Tamer sources remain under
the host, and the selected physical Digimon instance enters play unsuspended.

Serial validation (`--pool=forks --maxWorkers=1 --no-file-parallelism`):

- Full ST2: 18 files, 53 tests passed.
- Tsunomon plus affected Vortex/mechanism regression: 10 files, 79 tests passed.
- Changed-file lint, format and diff checks passed at integration.

The overall 343-card audit and pending shared-engine changes remain incomplete.

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

### ST2-01 — Tsunomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-01.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-01.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Exact battle bonus against source-less opponents, blocked attack survival, opponent-turn negative; corrected blocker event subjects
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-01.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-01.test.ts): no-source battle +1000 owner turn; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-01.test.ts): no-source battle +1000 owner turn; 2/2

### ST2-02 — Gomamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-02.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-02.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Vanilla identity and printed costs
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-02.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-02.test.ts): exact vanilla contract; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-02.test.ts): exact vanilla contract; 2/2

### ST2-03 — Gabumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-03.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-03.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Bottom-source removal and level boundary
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-03.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-03.test.ts): bottom-source trash level boundary; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-03.test.ts): bottom-source trash level boundary; 2/2

### ST2-04 — Bearmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-04.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-04.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Vanilla identity and printed costs
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-04.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-04.test.ts): exact vanilla contract; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-04.test.ts): exact vanilla contract; 2/2

### ST2-05 — Ikkakumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-05.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-05.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Vanilla identity and printed costs
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-05.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-05.test.ts): exact vanilla contract; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-05.test.ts): exact vanilla contract; 2/2

### ST2-06 — Garurumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-06.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-06.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Exact bottom-source attack removal
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-06.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-06.test.ts): bottom-source trash; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-06.test.ts): bottom-source trash; 2/2

### ST2-07 — Grizzlymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-07.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-07.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Blocker combat and attack memory cost
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q610; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-07.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-07.test.ts): Blocker and -2 memory; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-07.test.ts): Blocker and -2 memory; 2/2

### ST2-08 — WereGarurumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-08.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-08.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Source-less opponent gate; actual extra security check after stripping the final source
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q611–Q614; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-08.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-08.test.ts): no-source opponent gate and Security Attack; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-08.test.ts): no-source opponent gate and Security Attack; 2/2

### ST2-09 — Zudomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-09.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-09.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Exact two-bottom-source evolution removal
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q615; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-09.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-09.test.ts): exact two bottom cards; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-09.test.ts): exact two bottom cards; 2/2

### ST2-10 — Plesiomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-10.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-10.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Vanilla identity and printed costs
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-10.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-10.test.ts): exact vanilla contract; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-10.test.ts): exact vanilla contract; 2/2

### ST2-11 — MetalGarurumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-11.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-11.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Real attack unsuspend, second-attack once-per-turn restriction, legal evolution stack
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q616–Q618; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-11.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-11.test.ts): once-per-turn attack unsuspend; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-11.test.ts): once-per-turn attack unsuspend; 2/2

### ST2-12 — Matt Ishida

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-12.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-12.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Start-turn memory and actual Security play
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q619–Q622; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-12.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-12.test.ts): start-turn conditional memory/security play; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-12.test.ts): start-turn conditional memory/security play; 2/2

### ST2-13 — Hammer Spark

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-13.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-13.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Main and Security memory outcomes
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q623/Q881/Q1081/Q1088/Q1098/Q1416; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-13.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-13.test.ts): main +1 and security +2 memory; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-13.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-13.test.ts): main +1 and security +2 memory; 2/2

### ST2-14 — Sorrow Blue

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-14.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-14.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Source-less target, retained restrictions after source addition, separate duration boundaries
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q624/Q625; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-14.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-14.test.ts): no-source target and opponent-turn duration; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-14.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-14.test.ts): no-source target and opponent-turn duration; 2/2

### ST2-15 — Kaiser Nail

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-15.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-15.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Exact host/source identity, printed Option cost, free source play, DP isolation, unsuspended entry, attack prohibition, Security
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q626–Q629; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-15.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-15.test.ts): source-card play and zone/stack boundary; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-15.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-15.test.ts): source-card play and zone/stack boundary; 2/2

### ST2-16 — Cocytus Breath

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST2/ST2-16.ts`
- Focused test: `apps/api/src/cards/ST2/ST2-16.test.ts`
- Proof review (ST2-PROOF-AUDIT.md, 2026-09-05):
  - Reviewed evidence: Opponent return-to-hand and source trash
  - Score: 10/10
- Original ledger row (ST2-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-16.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST2/ST2-16.test.ts): opponent return to hand and source trash; 2/2
  - Gates: focused + gate + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST2/ST2-16.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST2/ST2-16.test.ts): opponent return to hand and source trash; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST2; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST2. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST2 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST1-8-LUNA-REAUDIT.md` (2026-09-05) says it is a checkpoint and not a collection certification; `ST2-PROOF-AUDIT.md` (2026-09-05) says it supersedes historical completion claims. The proof audit and the final results ledger win.
- `ST2-AUDIT.md` (2026-08-31) records the serial flag `--poolOptions.forks.singleFork=true`, which `ST-REAUDIT-PLAN.md` (2026-09-05) records as rejected by the installed Vitest 5.

## History

- `docs/audits/ST2-AUDIT.md` — last commit `68b539ae2`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST2-PROOF-AUDIT.md` — last commit `e4cae2ca2`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST2: PR #4591; commit `9ddd1b002`.
