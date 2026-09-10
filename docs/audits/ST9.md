---
set: ST9
cards: 15
status: verified
verified_at: 2026-09-05
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# ST9 audit

## Status

All 15 committed ST9 cards are verified at a 10/10 evidence score. Every card has a direct compiled IR module registered exclusively through `registerIrCard`, a colocated focused test, reviewed printed-clause evidence and applicable KB rulings. The winning source is the starter-deck reaudit closeout of 2026-09-05 (`ST-REAUDIT-RESULTS.md` and the per-card `ST-REAUDIT-EVIDENCE.json` ledger), backed by `ST9-PROOF-AUDIT.md` of the same date. Earlier reports are historical: the `ST9-AUDIT.md` ledger (2026-08-31). Where they disagree with the closeout, the closeout wins, and every disagreement is listed under Open items. The reviewed batch for this set was pushed as `2a84edfbf`.

## Gates

Final combined serial run (`ST-REAUDIT-RESULTS.md`, `ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

440 files / 1955 tests passed, 0 failed, 0 skipped, 61.61 seconds. ST9 contributed 17 files / 42 tests to that run (`ST-REAUDIT-EVIDENCE.json`).

Workspace typecheck (`ST-REAUDIT-EVIDENCE.json`, 2026-09-05):

```text
NODE_OPTIONS=--max-old-space-size=3072 pnpm -r --workspace-concurrency=1 typecheck
```

The shared, API and web projects passed serially.

`ST-REAUDIT-PLAN.md` (2026-09-05) records the engine conformance baseline `pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism` as passing 28 files / 387 tests, and records changed-file lint, changed-file format check and `git diff --check` as required and satisfied for the final closeout.

### Earlier collection gates (`ST9-AUDIT.md`, 2026-08-31)

Date: 2026-08-30. All 15 catalog cards were read and queried against the local
KB in ascending order, then traced through direct IR, shared DNA/evolution and
trait primitives, peers, and colocated stack tests. Every component is 2/2 and
every card is 10/10.

#### Verification commands

- All 15 focused card tests passed serially, one process per card.
- Collection gate `src/cards/ST9/collection.audit.test.ts` passed 3/3.
- `pnpm typecheck`, repository lint (pre-existing warnings only), changed-file format check, and `git diff --check` passed; repo-wide formatting retains pre-existing baseline findings.

### Proof review notes (`ST9-PROOF-AUDIT.md`, 2026-09-05)

Date: 2026-09-05

This report records the focused behavioral proof for every ST9 catalog card.
Each ST9 module remains IR-only through `registerIrCard`; no engine or catalog
files were changed for this audit.

Reproducible focused command, run serially in this audit worktree:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST9 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 17 test files passed, 42 tests passed. `git diff --check` passed.

Final combined-run correction: ST9-13 duration evidence now uses ST9-12 as neutral evolution material. ST9-11 has a real inherited +1000 DP effect, which must not be mistaken for the expired +4000 temporary boost. The test awaits the completed evolution action, proves the boost first and then its expiry. Full ST9/ST20 regression passed 33 files / 132 tests; ST9 remains 17 files / 42 tests.

## Card ledger

### ST9-01 — Minomon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-01.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-01.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Inherited Your Turn blue-in-play +1000 DP, no-blue negative, opponent-turn gate
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q705; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-01.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-01.test.ts): blue-in-play +1000; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-02 — Veemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-02.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-02.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Free search, exact bottom order, and no-Free negative
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q706/Q707; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-02.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-02.test.ts): top-3 Free search and bottom cards; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-03 — Betamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-03.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-03.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Catalog vanilla identity/evolution contract
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-03.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-03.test.ts): vanilla contract; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-04 — ExVeemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-04.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-04.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Positive and full-cost reduction boundary, inherited DP
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q708; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-04.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-04.test.ts): green cost reduction and inherited DP; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-05 — Paildramon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-05.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-05.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: DNA legality, 6000 boundary, attack unsuspend/OPT
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q709; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-05.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-05.test.ts): DNA materials, bottom-deck 6000 boundary, unsuspend; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-06 — Imperialdramon: Dragon Mode

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-06.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-06.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Optional source replay, source filters, full DNA stack
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q710; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-06.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-06.test.ts): source plays one blue and one green level-4; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-07 — KoKabuterimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-07.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-07.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Blue-gated Blocker and loss after blue deletion
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q711; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-07.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-07.test.ts): opponent-turn blue gate Blocker; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-08 — Wormmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-08.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-08.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Optional end-turn DNA and normal-result exclusion
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q712–Q714; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-08.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-08.test.ts): end-turn optional DNA evolution; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-09 — Stingmon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-09.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-09.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Hand reduction boundary and inherited blue-gated draw
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q715; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-09.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-09.test.ts): blue cost reduction and inherited draw; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-10 — Snimon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-10.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-10.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Security timing and On Play suspension
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q716–Q718; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-10.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-10.test.ts): security play and suspend; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-11 — Dinobeemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-11.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-11.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Ordinary/DNA distinction, freeze, and two-color DP
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q719/Q720; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-11.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-11.test.ts): DNA suspend/unsuspend lock and multicolor DP; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-12 — JewelBeemon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-12.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-12.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Catalog vanilla identity/evolution contract
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-12.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-12.test.ts): vanilla contract; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-13 — GranKuwagamon

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-13.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-13.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: +4000 DP, printed Security Attack +1, two checks, expiry
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: none; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-13.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-13.test.ts): Security Attack and digivolve +4000; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-14 — Megadeath

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-14.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-14.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: Suspend/return distinct-target boundary and Security Main activation
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q721; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-14.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-14.test.ts): suspend then suspended return; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

### ST9-15 — Hell Masquerade

- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2) — ST-REAUDIT-EVIDENCE.json, 2026-09-05.
- Module: `apps/api/src/cards/ST9/ST9-15.ts`
- Focused test: `apps/api/src/cards/ST9/ST9-15.test.ts`
- Proof review (ST9-PROOF-AUDIT.md, 2026-09-05):
  - Evidence-supported score: 10/10
  - Proof basis: +2000 target, blue-gated Piercing negative, expiry, Security add-to-hand
- Original ledger row (ST9-AUDIT.md):
  - Catalog: 2/2
  - KB/rules: Q722; 2/2
  - Module: [module](../../apps/api/src/cards/ST9/ST9-15.ts); 2/2
  - Behavioral evidence: [test](../../apps/api/src/cards/ST9/ST9-15.test.ts): DP then green-gated Piercing and security hand return; 2/2
  - Gates: focused/gate/type/lint/format/diff; 2/2
  - Total: 10/10

## Mechanisms

No `*-MECHANISM.md` file exists for ST9; this set has no reaudit directory. The shared engine seams that the starter-deck reaudit changed are recorded in `ST-REAUDIT-RESULTS.md` (2026-09-05): play-cost reduction prohibitions that block reduction activation costs, granted deletion effects that keep the departing host's identity, and printed or granted Vortex attacks scheduled at the real end of the owner's turn.

## Knowledge base index

No `KB-INDEX.md` file exists for ST9. The applicable KB Q&A identifiers are recorded per card in the Card ledger above; they were produced with `node tools/kb/query.mjs card <CARD-ID>`.

## Open items

- No ST9 card scores below 10/10 in `ST-REAUDIT-EVIDENCE.json` (2026-09-05).
- `ST-REAUDIT-PLAN.md` (2026-09-05) names two different push commits for the reviewed ST9 batch: `82690ac36` in the earlier collection checkpoint and `2a84edfbf` in the ownership table. Both are recorded here; the ownership table is the later statement.
- `ST-REAUDIT-RESULTS.md` (2026-09-05) records that an earlier combined run exposed a weak ST9 fixture, where the inherited +1000 DP was not distinguished from the temporary boost. The fixture was corrected and ST9 was rerun before the final green run.

## History

- `docs/audits/ST9-AUDIT.md` — last commit `097d012aa`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST9-PROOF-AUDIT.md` — last commit `2a84edfbf`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST9: commit `2d4034697`.
