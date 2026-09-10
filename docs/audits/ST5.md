---
set: ST5
cards: 16
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST5 audit

## Status

All 16 committed ST5 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST5-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST5-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `990a208af`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST5 contributed 19 files / 43 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST5-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. Scope: all 16 catalog cards in ascending order. Every
catalog field and printed clause was checked against the local catalog and
`node tools/kb/query.mjs card <ID>`; every direct module is exclusive
compiled IR with no residual or raw nodes.

#### Verification commands

Material evidence correction: ST5-13 now proves Digi-Burst activation and duration expiry through the public `activateEffect` intent and turn lifecycle, with no direct effect resolver call.

- Every focused card test was run serially, one process per card, with `--pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism`.
- Stack regressions: `machinedramon-reboot-blocker-deck.test.ts` and `reboot-blocker-historical-deck.test.ts` both passed.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/ST5/collection.audit.test.ts --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` (3 tests passed).
- The gate derives all 16 IDs/names, verifies every index import and colocated proof, and enforces `registerIrCard(cardId, compiled)`, full coverage, empty residuals, and no `RawUnparsed` nodes.

### Proof review notes (`ST5-PROOF-AUDIT.md`, 2026-09-05)

Date: 2026-09-05. Scope: ST5-01 through ST5-16. Catalog text and card records
were checked against `packages/shared/src/cards/data/cards.json`; card-specific
KB queries were run with `node tools/kb/query.mjs card <ID> --json`.

All sixteen direct modules use one `registerIrCard` call, declare `coverage:
"full"`, and have an empty `residual`. The colocated tests exercise the
printed costs, DP, evolution sources, inherited placement, target boundaries,
security branches, durations, and source-specific turn activity where the
card has those clauses.

Focused serial validation:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST5 --pool=forks \
  --maxWorkers=1 --no-file-parallelism
```

Result: 19 files passed, 43 tests passed. `git diff --check` also passes.

The ST5 collection result is bounded to these 16 cards and their colocated
deck/collection tests; it is not a claim about any other starter set.

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

### ST5-01 — Kapurimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-01.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-01.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Inherited +1000 DP is proven on a Blocker host through a real stack.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-01.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-01.test.ts): Blocker inherited +1000; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-01.test.ts): Blocker inherited +1000; 2/2

### ST5-02 — Jazamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-02.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-02.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Catalog and full IR registration gate.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-02.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-02.test.ts): vanilla stats/IR registration; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-02.test.ts): vanilla stats/IR registration; 2/2

### ST5-03 — Agumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-03.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-03.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Printed Blocker is consumed by the live keyword reader and redirects a real opponent attack at Blocker timing, with completed combat.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-03.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-03.test.ts): exact Blocker; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-03.test.ts): exact Blocker; 2/2

### ST5-04 — ToyAgumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-04.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-04.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Inherited end-opponent-turn Draw is proven when the opponent did not attack, refused after an attack, and resets across turns.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q658/Q659/Q660; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-04.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-04.test.ts): end-opponent-turn no-attack draw and boundaries; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-04.test.ts): end-opponent-turn no-attack draw and boundaries; 2/2

### ST5-05 — Commandramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-05.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-05.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Catalog and full IR registration gate.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-05.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-05.test.ts): vanilla stats/IR registration; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-05.test.ts): vanilla stats/IR registration; 2/2

### ST5-06 — Greymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-06.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-06.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Inherited no-attack Draw is proven at the real end-opponent-turn timing.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q661/Q662/Q663; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-06.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-06.test.ts): inherited no-attack draw; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-06.test.ts): inherited no-attack draw; 2/2

### ST5-07 — Jazardmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-07.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-07.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Catalog and full IR registration gate.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-07.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-07.test.ts): vanilla stats/IR registration; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-07.test.ts): vanilla stats/IR registration; 2/2

### ST5-08 — DarkTyrannomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-08.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-08.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Blocker and When Attacking −2 memory are proven through a real player attack.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q664; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-08.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-08.test.ts): Blocker and attack memory loss; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-08.test.ts): Blocker and attack memory loss; 2/2

### ST5-09 — MetalGreymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-09.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-09.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: When Digivolving grants Blocker to one selected own Digimon, including self and persistence through a later evolution.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q665/Q666; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-09.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-09.test.ts): temporary target Blocker; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-09.test.ts): temporary target Blocker; 2/2

### ST5-10 — MetalTyrannomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-10.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-10.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Catalog and full IR registration gate.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-10.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-10.test.ts): vanilla stats/IR registration; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-10.test.ts): vanilla stats/IR registration; 2/2

### ST5-11 — Megadramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-11.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-11.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Inherited Blocker is consumed from a legal Machinedramon stack and redirects a real opponent attack, with completed combat.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-11.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-11.test.ts): inherited Blocker; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-11.test.ts): inherited Blocker; 2/2

### ST5-12 — Machinedramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-12.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-12.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: When Digivolving grants up to two own Digimon Reboot; a selected Digimon unsuspends during the opponent's real Active phase and the grant expires after that opponent turn.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q667/Q668; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-12.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-12.test.ts): up-to-two Reboot and duration; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-12.test.ts): up-to-two Reboot and duration; 2/2

### ST5-13 — BlitzGreymon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-13.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-13.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Security Attack +1 and optional Digi-Burst 2 cost/target/DP duration are proven; the two cards are trashed from the source stack.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-13.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-13.test.ts): Security Attack, Digi-Burst, DP duration; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-13.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-13.test.ts): Security Attack, Digi-Burst, DP duration; 2/2

### ST5-14 — Tai Kamiya

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-14.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-14.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Blocker watcher suspends Tai to unsuspend the selected Digimon, and Security plays Tai.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: Q669; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-14.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-14.test.ts): Blocker-use trigger, optional unsuspend, security play; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-14.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-14.test.ts): Blocker-use trigger, optional unsuspend, security play; 2/2

### ST5-15 — Laser Eye

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-15.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-15.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Main and Security De-Digivolve 1 are proven against two opposing stacks with the level-3 stop boundary.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-15.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-15.test.ts): up-to-two De-Digivolve and security; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-15.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-15.test.ts): up-to-two De-Digivolve and security; 2/2

### ST5-16 — Dark Side Attack

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST5/ST5-16.ts`
- Focused test: `apps/api/src/cards/ST5/ST5-16.test.ts`
- Proof review (ST5-PROOF-AUDIT.md, 2026-09-05):
  - Evidence: Main and Security deletion are proven with the play-cost-7 inclusive boundary and a cost-8 survivor.
  - Score: 10/10
- Original ledger row (ST5-AUDIT.md):
  - Catalog contract: 2/2
  - KB/rules: none; 2/2
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-16.ts); 2/2
  - Behavioral proof: [test](../../apps/api/src/cards/ST5/ST5-16.test.ts): inclusive play-cost-7 deletion and security; 2/2
  - Gates: focused + gate + stack + repo checks; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST5/ST5-16.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST5/ST5-16.test.ts): inclusive play-cost-7 deletion and security; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST5; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST5. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST5 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST1-8-LUNA-REAUDIT.md` (2026-09-05) says it is a checkpoint and not a collection certification. The proof audit and the final results ledger win.

## History

- `docs/audits/ST5-AUDIT.md` — last commit `68b539ae2`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST5-PROOF-AUDIT.md` — last commit `990a208af`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST5: commit `61996f74b`.
