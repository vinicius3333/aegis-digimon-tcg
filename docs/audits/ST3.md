---
set: ST3
cards: 16
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST3 audit

## Status

All 16 committed ST3 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST3-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST3-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `b5370e8bd`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST3 contributed 19 files / 44 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST3-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. All 16 ST3 catalog contracts were read in ascending order;
each local KB query was run, applicable Q&A was traced, and every direct
module, shared primitive, and colocated proof was inspected. All cards are
full, residual-free compiled IR with exclusive `registerIrCard` registration.

#### Verification commands

- All 16 focused card tests passed serially, one process per card, using `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST3/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3/3 passed).
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed for the collection changes; repo-wide formatting retains pre-existing baseline findings.

ST3-12's Security play proof now uses a real opposing attack and settles the card's battle-area
arrival; the Security DP aura remains covered on both turn boundaries.

### Proof review notes (`ST3-PROOF-AUDIT.md`, 2026-09-05)

Date: 2026-09-05. Scope: ST3-01 through ST3-16. Catalog metadata, local KB
answers, direct IR modules, and resolved behavioral tests were reviewed.

The collection-level catalog proof asserts exact colors, kind/level where
applicable, play cost, DP, and evolution costs for all 16 cards. Focused
behavior passed with legal neutral decks and settled final state assertions.

Verification command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST3 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 19 test files and 44 tests passed. The collection gate alone passed 4
tests, and `git diff --check` passed. No shared engine files were changed.

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

### ST3-01 — Tokomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-01.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-01.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Inherited Your Turn once-per-turn +1000 after an opponent is deleted by 0 DP; effect-deletion negative; multiple hosts and late target stack proof.
  - KB: Q630
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q630; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-01.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-01.test.ts): once-per-turn 0-DP deletion +1000; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-01.test.ts): once-per-turn 0-DP deletion +1000; 2/2

### ST3-02 — Salamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-02.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-02.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Empty IR; exact catalog stats and yellow Lv.2 evolution resolved with source stack preserved.
  - KB: none
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-02.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-02.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-02.test.ts): vanilla contract; 2/2

### ST3-03 — Tapirmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-03.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-03.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Empty IR; exact catalog stats and yellow Lv.2 evolution resolved with source stack preserved.
  - KB: none
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-03.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-03.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-03.test.ts): vanilla contract; 2/2

### ST3-04 — Patamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-04.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-04.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Inherited Your Turn once-per-turn +1 memory after 0-DP deletion; effect-deletion negative; independent host copies.
  - KB: Q631
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q631; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-04.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-04.test.ts): 0-DP deletion memory and once-per-turn; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-04.test.ts): 0-DP deletion memory and once-per-turn; 2/2

### ST3-05 — Angemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-05.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-05.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Inherited attack memory gain at 4+ security and exact below-4 negative.
  - KB: Q632
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q632; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-05.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-05.test.ts): four-security attack memory boundary; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-05.test.ts): four-security attack memory boundary; 2/2

### ST3-06 — Gatomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-06.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-06.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Empty IR; exact catalog stats and yellow Lv.3 evolution cost/stack proof.
  - KB: none
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-06.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-06.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-06.test.ts): vanilla contract; 2/2

### ST3-07 — Unimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-07.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-07.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Printed Blocker redirects a real opponent attack through blocker timing; the attack memory loss and security resolution are also proven.
  - KB: Q633
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q633; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-07.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-07.test.ts): Blocker and -2 memory; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-07.test.ts): Blocker and -2 memory; 2/2

### ST3-08 — MagnaAngemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-08.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-08.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Inherited attack target selection, -1000 DP, and exact 1000-DP deletion before battle.
  - KB: Q634-Q636
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q634–Q636; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-08.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-08.test.ts): attack target -1000 DP; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-08.test.ts): attack target -1000 DP; 2/2

### ST3-09 — Angewomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-09.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-09.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Recovery +1 at 3 or fewer security and exact 4-security refusal boundary.
  - KB: none
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-09.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-09.test.ts): three-security Recovery +1 boundary; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-09.test.ts): three-security Recovery +1 boundary; 2/2

### ST3-10 — Magnadramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-10.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-10.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Empty IR; exact catalog stats and complete yellow evolution stack/cost proof.
  - KB: none
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-10.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-10.test.ts): vanilla contract; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-10.test.ts): vanilla contract; 2/2

### ST3-11 — Seraphimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-11.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-11.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Attack target -4000 DP and exact 4000-DP deletion before battle.
  - KB: Q637-Q639, Q973
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q637–Q639/Q973; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-11.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-11.test.ts): attack -4000 DP; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-11.test.ts): attack -4000 DP; 2/2

### ST3-12 — T.K. Takaishi

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-12.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-12.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Opponent-turn +2000 Security Digimon aura, own-turn negative, and Security play resolved from an actual attack.
  - KB: Q640-Q641
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q640/Q641; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-12.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-12.test.ts): opponent-turn security +2000 and security play; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-12.test.ts): opponent-turn security +2000 and security play; 2/2

### ST3-13 — Heaven's Gate

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-13.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-13.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Main single-Digimon +3000; Security all-Digimon/Security Digimon +5000, stacking, and add-to-hand resolution.
  - KB: Q642
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q642; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-13.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-13.test.ts): main/security DP and hand return; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-13.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-13.test.ts): main/security DP and hand return; 2/2

### ST3-14 — Heaven's Charm

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-14.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-14.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Main opponent target -2000 with exact 0-DP deletion and Security add-to-hand.
  - KB: Q643
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q643; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-14.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-14.test.ts): target -2000 and duration; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-14.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-14.test.ts): target -2000 and duration; 2/2

### ST3-15 — Holy Flame

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-15.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-15.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Main Security Attack -3 is observed initially and expires after the opponent's next turn; Security all-opponent -1 is observed and expires after the real turn boundary; direct-win prevention at zero checks is proven.
  - KB: Q644-Q645
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q644/Q645; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-15.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-15.test.ts): main -3 and security -1; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-15.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-15.test.ts): main -3 and security -1; 2/2

### ST3-16 — Seven Heavens

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST3/ST3-16.ts`
- Focused test: `apps/api/src/cards/ST3/ST3-16.test.ts`
- Proof review (ST3-PROOF-AUDIT.md, 2026-09-05):
  - Clauses and observable proof: Main/Security -10000 DP and exact lethal resolution from Main.
  - KB: Q646
  - Score: 10/10
- Original ledger row (ST3-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q646; 2/2
  - Module: [module](../../apps/api/src/cards/ST3/ST3-16.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST3/ST3-16.test.ts): -10000 DP and security activation; 2/2
  - Verification: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST3/ST3-16.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST3/ST3-16.test.ts): -10000 DP and security activation; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST3; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST3. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST3 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST-REAUDIT-PLAN.md` (2026-09-05) records that a combined coordinator regression first failed one ST3-15 fixture case (memory perspective when the turn is handed off manually) and that the corrected full ST3 rerun passed 19 files / 44 tests. The corrected rerun is the recorded result.
- `ST1-8-LUNA-REAUDIT.md` (2026-09-05) says it is a checkpoint and not a collection certification. The proof audit and the final results ledger win.

## History

- `docs/audits/ST3-AUDIT.md` — last commit `68b539ae2`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST3-PROOF-AUDIT.md` — last commit `b5370e8bd`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST3: PR #4591; commit `9ddd1b002`.
