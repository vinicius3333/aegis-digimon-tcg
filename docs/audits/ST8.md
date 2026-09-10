---
set: ST8
cards: 12
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST8 audit

## Status

All 12 committed ST8 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST8-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST8-AUDIT.md` ledger (2026-08-31) and the provisional `ST1-8-LUNA-REAUDIT.md` checkpoint. Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `80da9e750`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST8 contributed 15 files / 30 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST8-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. All 12 catalog cards were read and queried against the local
KB in ascending order, then traced through direct IR, shared primitives, peer
cards, and evolution-stack tests. Every component is 2/2 and every card is 10/10.

#### Verification commands

- All 12 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST8/collection.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed; repo-wide formatting retains pre-existing baseline findings.

### Proof review notes (`ST8-PROOF-AUDIT.md`, 2026-09-05)

Date: 2026-09-05. Scope: ST8-01 through ST8-12. Catalog text, local KB
answers, direct IR modules, and resolved behavior were reviewed.

The focused proofs use legal neutral decks, settle effect and combat windows,
and assert final zones. ST8-07 now includes an actual Blocker redirection proof;
the existing mixed-line suite proves the hand-threshold dependencies across
the Ulforce line.

Verification command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST8 \
  --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 15 test files and 30 tests passed. `git diff --check` passed. No
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

### ST8-01 — DemiVeemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-01.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-01.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Inherited Your Turn +1000 DP while hand has 8 or more cards.
  - KB: Q695
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q695; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-01.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-01.test.ts): hand-8 owner-turn +1000; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-01.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-01.test.ts): hand-8 owner-turn +1000; 2/2

### ST8-02 — Gabumon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-02.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-02.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Inherited All Turns +1000 DP while hand has 8 or more cards.
  - KB: Q696
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q696; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-02.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-02.test.ts): all-turn hand-8 +1000; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-02.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-02.test.ts): all-turn hand-8 +1000; 2/2

### ST8-03 — Dracomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-03.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-03.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Reveals 3, adds a Dramon-name Digimon, and returns the rest to deck bottom.
  - KB: none
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-03.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-03.test.ts): top-3 Dramon search/bottom placement; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-03.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-03.test.ts): top-3 Dramon search/bottom placement; 2/2

### ST8-04 — Veemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-04.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-04.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Alternate UlforceVeedramon evolution for 4 with opponent level 6+, plus attack Draw 1 at hand 7 or fewer.
  - KB: Q697
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q697; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-04.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-04.test.ts): Ulforce alternate evolution and inherited draw; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-04.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-04.test.ts): Ulforce alternate evolution and inherited draw; 2/2

### ST8-05 — Veedramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-05.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-05.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Inherited attack return of an opposing level 3 and trash of all its sources at hand 8.
  - KB: Q698
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q698; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-05.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-05.test.ts): hand-8 level-3 return boundary; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-05.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-05.test.ts): hand-8 level-3 return boundary; 2/2

### ST8-06 — Coredramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-06.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-06.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: On Play Draw 2; Security play is resolved after battle and its On Play draw resolves before attack completion.
  - KB: Q699-Q701
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q699–Q701; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-06.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-06.test.ts): security play and Draw 2; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-06.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-06.test.ts): security play and Draw 2; 2/2

### ST8-07 — Wingdramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-07.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-07.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Blocker keyword and actual opponent player-attack redirection through Blocker combat; attacker is deleted and security is preserved.
  - KB: none
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-07.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-07.test.ts): Blocker; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-07.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-07.test.ts): Blocker; 2/2

### ST8-08 — AeroVeedramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-08.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-08.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Jamming and inherited Your Turn Security Attack +1 at hand 8.
  - KB: Q702
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q702; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-08.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-08.test.ts): Jamming and inherited hand-8 Security Attack; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-08.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-08.test.ts): Jamming and inherited hand-8 Security Attack; 2/2

### ST8-09 — Slayerdramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-09.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-09.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: When Digivolving Security Attack +1 and Your Turn unblockable attack through an actual blocker present.
  - KB: Q703
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q703; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-09.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-09.test.ts): digivolve Security Attack and unblockable; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-09.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-09.test.ts): digivolve Security Attack and unblockable; 2/2

### ST8-10 — UlforceVeedramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-10.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-10.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Return opposing level 4 or lower with all sources trashed; once-per-turn hand-8 attack unsuspend and second attack.
  - KB: Q704
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q704; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-10.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-10.test.ts): level-4 return and once-per-turn hand-8 unsuspend; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-10.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-10.test.ts): level-4 return and once-per-turn hand-8 unsuspend; 2/2

### ST8-11 — Victory Sword

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-11.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-11.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Main unsuspends one own blue Digimon; Security adds itself to hand.
  - KB: none
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-11.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-11.test.ts): blue unsuspend and security hand return; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-11.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-11.test.ts): blue unsuspend and security hand return; 2/2

### ST8-12 — V-Wing Blade

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST8/ST8-12.ts`
- Focused test: `apps/api/src/cards/ST8/ST8-12.test.ts`
- Proof review (ST8-PROOF-AUDIT.md, 2026-09-05):
  - Printed behavior and evidence: Main returns opposing level 6 or lower after trashing its full stack; Security activates Main.
  - KB: none
  - Score: 10/10
- Original ledger row (ST8-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST8/ST8-12.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST8/ST8-12.test.ts): level-6 return and security activation; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10
- Luna checkpoint (ST1-8-LUNA-REAUDIT.md, 2026-09-05):
  - Direct module: [module](../../apps/api/src/cards/ST8/ST8-12.ts); 2/2
  - Focused clause evidence: [test](../../apps/api/src/cards/ST8/ST8-12.test.ts): level-6 return and security activation; 2/2

## Mechanisms

No `*-MECHANISM.md` file exists for ST8; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST8. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST8 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST1-8-LUNA-REAUDIT.md` (2026-09-05) says it is a checkpoint and not a collection certification. The proof audit and the final results ledger win.

## History

- `docs/audits/ST8-AUDIT.md` — last commit `097d012aa`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST8-PROOF-AUDIT.md` — last commit `80da9e750`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST8: PR #4592; commit `77c634af0`.
