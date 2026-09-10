---
set: ST1
cards: 16
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST1 audit

## Status

All 16 committed ST1 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST1-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST1-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `2ae4cde25`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST1 contributed 18 files / 45 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST1-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. Scope: all 16 catalog cards in ascending order. Every
catalog clause was read, queried with `node tools/kb/query.mjs card <ID>`,
traced through the direct module and shared interpreter, and proven by the
colocated focused test or the documented vanilla registration proof. No ST1
errata or restrictions apply; KB Q&A IDs are listed where present.

#### Collection verification

- Focused card tests were run serially, one process per card, with `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST1/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3 tests passed).
- The gate derives all 16 IDs/names from the committed catalog, checks every index import and colocated test, and proves exclusive `registerIrCard(cardId, compiled)` with `coverage: "full"`, empty residuals, and no `RawUnparsed` nodes.
- Cross-card/evolution evidence is retained in `wargreymon-historical-deck.test.ts`; shared keyword, source-count, turn-duration, security, and attack seams are exercised by the focused tests and existing engine suites.

ST1-12's Security play proof now uses a real opposing attack and settles the revealed card's
arrival in the battle area.

### Proof review notes (`ST1-PROOF-AUDIT.md`, 2026-09-05)

Coordinator review: 2026-09-05. The 16 committed ST1 catalog records, local KB
queries, direct IR modules and focused assertions were reviewed. All modules
retain exclusive `registerIrCard` registration. This report supersedes the
uniform `2/2` counts in the provisional ST1–ST8 report.

The added historical-deck case legally evolves Agumon → Greymon → MetalGreymon
→ WarGreymon. It verifies each memory payment, draw, physical source order,
inherited DP/check activation and the completed four-check attack. The two
previous cases cover prebuilt stacks; they did not themselves prove the
multi-step evolution claimed by the provisional report.

Validation in the audit worktree, with `--pool=forks --maxWorkers=1
--no-file-parallelism`: focused historical deck 1 file / 3 tests passed; full
ST1 collection 18 files / 45 tests passed. The new test received independent
Luna review. Shared engine conformance passed 28 files / 387 tests, and all
workspace projects passed typechecking (API after the unrelated ST20 fixture
typing correction).

ST1 is 16/16 at the reviewed 10/10 evidence score. Overall completion still
requires the remaining 22 collections and final integrated validation.

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

### ST1-01 — Koromon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-01.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-01.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Three/four source boundary including the egg, owner-turn gate, and activation during a real evolution line.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q601; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-01.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-01.test.ts): 4-source +1000 DP, turn boundary; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-01.test.ts): 4-source +1000 DP, turn boundary; 2/2

### ST1-02 — Biyomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-02.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-02.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Observable printed DP and exact vanilla level/color/play/evolution contract.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-02.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-02.test.ts): exact vanilla contract; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-02.test.ts): exact vanilla contract; 2/2

### ST1-03 — Agumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-03.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-03.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Inherited +1000, opponent-turn removal, and source transition after legal evolution.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-03.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-03.test.ts): inherited owner-turn +1000 DP; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-03.test.ts): inherited owner-turn +1000 DP; 2/2

### ST1-04 — Dracomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-04.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-04.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Observable printed DP and exact vanilla level/color/play/evolution contract.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-04.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-04.test.ts): exact vanilla contract; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-04.test.ts): exact vanilla contract; 2/2

### ST1-05 — Birdramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-05.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-05.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Observable printed DP and exact vanilla level/color/play/evolution contract.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-05.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-05.test.ts): exact vanilla contract; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-05.test.ts): exact vanilla contract; 2/2

### ST1-06 — Coredramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-06.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-06.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Live Blocker; actual blocking in ST1-09; attack memory loss and attack completion after crossing memory (Q602).
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q602; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-06.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-06.test.ts): Blocker, -2 memory, no turn switch; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-06.test.ts): Blocker, -2 memory, no turn switch; 2/2

### ST1-07 — Greymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-07.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-07.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Inherited check absent on top, present under a host; real additional security checks after evolution.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-07.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-07.test.ts): inherited Security Attack +1 source visibility; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-07.test.ts): inherited Security Attack +1 source visibility; 2/2

### ST1-08 — Garudamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-08.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-08.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Legal evolution, self-selected +3000, unchanged ally, and turn-end expiry (Q603).
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q603; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-08.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-08.test.ts): exact own-Digimon target and turn expiry; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-08.test.ts): exact own-Digimon target and turn expiry; 2/2

### ST1-09 — MetalGreymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-09.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-09.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Actual Blocker intervention gains 3; a direct Digimon attack does not (Q604); legal source transition.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q604/Q942; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-09.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-09.test.ts): blocked-only inherited +3 memory; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-09.test.ts): blocked-only inherited +3 memory; 2/2

### ST1-10 — Phoenixmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-10.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-10.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Observable printed DP and exact vanilla level/color/play/evolution contract.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-10.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-10.test.ts): exact vanilla contract; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-10.test.ts): exact vanilla contract; 2/2

### ST1-11 — WarGreymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-11.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-11.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Two/three/four source rounding, opponent-turn removal, and four actual checks with inherited Greymon (Q605).
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q605; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-11.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-11.test.ts): floor(source count/2), owner turn; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-11.test.ts): floor(source count/2), owner turn; 2/2

### ST1-12 — Tai Kamiya

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-12.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-12.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Two copies stack only on own Digimon/turn; actual Security attack plays the Tamer (Q606).
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q606/Q1494; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-12.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-12.test.ts): own-team +1000 and security play; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-12.test.ts): own-team +1000 and security play; 2/2

### ST1-13 — Shadow Wing

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-13.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-13.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Main +3000; Security grant also reaches later entrants and expires after the next own turn (Q607). Main uses the same turn-duration DP mechanism exercised by ST1-08.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q607/Q974; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-13.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-13.test.ts): main target and security next-turn duration; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-13.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-13.test.ts): main target and security next-turn duration; 2/2

### ST1-14 — Starlight Explosion

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-14.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-14.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Main/Security +7000 security-DP ledger values and both distinct expiry boundaries.
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-14.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-14.test.ts): security-Digimon +7000 main/security; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-14.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-14.test.ts): security-Digimon +7000 main/security; 2/2

### ST1-15 — Giga Destroyer

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-15.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-15.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Two eligible targets including 4000, stronger survivor, optional zero selection, Security activation and source trash (Q608).
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q608; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-15.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-15.test.ts): up-to-two inclusive 4000 DP and optionality; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-15.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-15.test.ts): up-to-two inclusive 4000 DP and optionality; 2/2

### ST1-16 — Gaia Force

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST1/ST1-16.ts`
- Focused test: `apps/api/src/cards/ST1/ST1-16.test.ts`
- Proof review (ST1-PROOF-AUDIT.md, 2026-09-05):
  - Behavioral evidence: Selected high-DP opponent deleted, other opponent preserved, source trash and Security activation (Q609).
  - Score: 10/10
- Original ledger row (ST1-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q609; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-16.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST1/ST1-16.test.ts): unrestricted main/security deletion; 2/2
  - Gates: focused + collection + type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST1/ST1-16.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST1/ST1-16.test.ts): unrestricted main/security deletion; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST1; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST1. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST1 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST1-PROOF-AUDIT.md` (2026-09-05) states that it supersedes the uniform 2/2 counts of the provisional ST1–ST8 report. `ST1-8-LUNA-REAUDIT.md` (2026-09-05) itself says it is a checkpoint and not a collection certification. The proof audit and the final results ledger win.
- `ST1-AUDIT.md` (2026-08-31) records the serial flag `--poolOptions.forks.singleFork=true`. `ST-REAUDIT-PLAN.md` (2026-09-05) records that the installed Vitest 5 rejects that flag and that the current serial invocation is `--pool=forks --maxWorkers=1 --no-file-parallelism`. The newer flags are the reproducible ones.

## History

- `docs/audits/ST1-AUDIT.md` — last commit `68b539ae2`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST1-PROOF-AUDIT.md` — last commit `2ae4cde25`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST1: PR #4591; commit `9ddd1b002`.
