---
set: BT6
cards: 112
status: verified
verified_at: 2026-09-10
catalog_commit: efbecc002fb9000789123e2f91f201466e1e5b0a
evidence_commit: eabe99351
---

# BT6 audit

## Status

All 112 BT6 cards are verified at 10/10. The winning source is the 2026-09-10 re-audit run
(`docs/audits/BT6-reaudit/RUN.md`, commit `a1e49c5df`), whose final strict recalc records 112/112 at
10/10 and aggregate 1120/1120 after the exact 122-file BT6 collection, effects sync and check,
affected mechanisms, full workspace typecheck, scoped lint and format, and the registration,
suppression, raw-action, and diff gates all passed. The score table inside
`docs/audits/BT6-REAUDIT-LEDGER.md` was never updated from the worker cap and still shows gates 0
and 8/10 on every row, contradicting its own summary line in the same file; that stale column is
recorded under Open items and does not change the result. The 2026-09-05 closeout
(`docs/audits/BT6-STATIC-AUDIT.md`) independently reached 112/112 at 10/10. The range reports under
`internal-docs/audits/BT6/` and `docs/audits/BT6-audit.md` (2026-08-26) are earlier passes; their
clause traces are merged into the card ledger for the detail, not for the score.

## Gates

### Final re-audit run, 2026-09-10

Source: `docs/audits/BT6-reaudit/RUN.md` (commit a1e49c5df).

#### 2026-09-10 initialization

- Dedicated branch/worktree: `audit-bt6-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt6-luna-20260910`.
- Cumulative base: pushed BT5 completion `6dde01ed6a518c1d5139beea3f33933e3065b84a`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and single-worker Vitest.

#### Static reconciliation

- Two read-only Luna lanes independently reviewed BT6-001 through BT6-112 against the committed catalog, compiled IR, focused tests, and rules evidence.
- Coordinator reconciled all 112 rows to worker-cap 8/10 against the existing focused evidence.
- A reported BT6-093 catalog mismatch was rejected after direct coordinator inspection: the committed catalog contains the Sistermon Security free-play and self-to-hand text implemented by the module and tests.
- BT6 has 112 cards; BT6-113 through BT6-115 do not exist and are outside this collection.
- Runtime gates remain pending. A malformed repository-root Vitest invocation was discarded because no Vitest binary was resolved, and later retries were held while system-wide memory pressure remained below the required 50%.

#### Prepared manifests

- Ledger/report coverage check: 112 unique ledger card IDs and 112 unique card IDs across the 12 grouped BT6 reports, with no difference.
- Exact BT6 collection manifest: 122 test files from `apps/api/src/cards/BT6`; every path's immediate parent basename was validated as exactly `BT6`.
- Prepared affected-mechanism manifest:
  - `src/engine/decisions/decisions.test.ts`
  - `src/engine/decisions/visibleIdentities.test.ts`
  - `src/engine/effectOptionUseCost.test.ts`
  - `src/engine/cards/securityActivateCluster.test.ts`
  - `src/engine/effects/continuous.test.ts`
  - `src/engine/effects/handTrashCost.test.ts`
  - `src/engine/effects/interpreter.test.ts`
  - `src/engine/effects/interpreter/registration/module.test.ts`
  - `src/engine/effects/nameExactMatch.test.ts`
  - `src/engine/revealAddCostBudget.test.ts`
- These cover BT6's decision visibility, Option use, Security activation, continuous grants, hand-trash provenance, IR execution/registration, exact-name matching, and reveal budgets.
- BT6-113 through BT6-115 were a worker prompt overshoot and are outside the exact 112-card catalog inventory, not blockers.

#### Light static preflight

- Exact production scope: 112 card modules and 112 `registerIrCard` registrations.
- Zero `registerCard`, zero `@ts-nocheck`, and zero `RawUnparsed` occurrences in the 112 production modules.
- `git diff --check` passed.
- Heavy gates remained closed while system-wide memory pressure was below 50% and an external EX8 collection run was active.

#### Runtime collection

- Discarded one malformed `pnpm test -- --maxWorkers=1 ...` invocation: the extra `--` caused Vitest to ignore the intended exact filters and begin unrelated repository tests. It was interrupted immediately and provides no BT6 evidence.
- After a fresh standalone process poll and `memory_pressure` result of 55%, the corrected pre-expanded 122-path command passed: 122/122 files and 382/382 tests with `--maxWorkers=1 --no-file-parallelism`.
- The first effects-sync attempt failed before synchronization because the dedicated worktree lacked the shared dependency link; it is discarded setup evidence.
- After restoring the attributable shared dependency symlink and a fresh two-call gate, `effects:sync:set -- --set BT6 --base 6dde01ed6a518c1d5139beea3f33933e3065b84a` passed: 112 records already synchronized, zero BT6 semantic changes, and zero semantic or byte changes outside BT6.
- `effects:check:set` passed with the same 112-record, zero-change result.
- The exact recorded affected-mechanism manifest passed: 10/10 files and 294/294 tests, serial.
- Full workspace `pnpm typecheck` passed for shared, API, and web.
- Scoped Oxlint, Oxfmt, `git diff --check`, registration, suppression, and raw-action smell gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.

### Earlier campaign closeout, 2026-09-05

Source: `docs/audits/BT6-STATIC-AUDIT.md` (commit eb1a58b75).


- Static registration/catalog gate: 112 modules, 112 direct focused test
  files, exactly 112 `registerIrCard` calls, zero `registerCard`, zero
  TypeScript suppressions, and zero `RawUnparsed` actions.
- BT6 collection: 122 test files and 382 tests passed with one fork, no file
  parallelism, and a 240-second timeout.
- Shared mechanisms: 7 files / 443 tests, the isolated primitives file / 138
  tests, and the isolated capabilities file / 290 tests passed under the same
  serial constraints.
- Tooling: 18 Node tests passed with `--test-concurrency=1`, covering atomic
  replacement, duplicate rejection, idempotence, out-of-set byte stability,
  base-aware byte restoration, and semantic-change refusal.
- TypeScript: shared build and typecheck passed. API typecheck reports only the
  unchanged `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`
  baseline diagnostics already present on `origin/main`; every changed API
  file is type-clean.
- Quality: scoped Oxlint completed with zero errors; scoped Oxfmt check passed
  on one thread; `git diff --check` passes.
- Snapshot: `effects:check:set` reports 112 synchronized records, 58 semantic
  BT6 changes, and zero semantic or byte changes outside BT6.

The closeout corrects Arbormon/Petaldramon Tamer evolution costs,
Forbidden Trident and Raddle Star stack teardown, Impmon's discard-result
binding, exact bracket-only name filters, and typed Security-battle deferral.
No completion blocker remains.

## Card ledger

### BT6-001 — DemiMeramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Red Digi-Egg, level 2, In-Training/Flame. Inherited text is `[When Attacking] When this Digimon attacks a player, it gets +1000 DP for the turn.`

Direct module: `apps/api/src/cards/BT6/BT6-001.ts:11-37` uses `WhenAttacking`, a self-targeted `ModifyDP` of 1000 with `forTheTurn`, and `attackTargetsPlayer`. It is inherited, has no frequency duplication, has full coverage, and has exactly one `registerIrCard` registration.

Static behavior proof: `BT6-001.test.ts` covers a player attack, a Digimon attack negative, a different attacker negative, and Q1398 Blocker redirection. Fixtures now use the legal egg → red level 3 BT6-007 stack rather than placing the egg directly under a level 5 card. `conditions.ts:53-69` reads the declared target before redirection, matching comprehensive rules 11-2-7-6 and Q1398.

Peer/legal-stack proof: BT2-012 uses the same player-target condition; BT3-004 covers the opposite opponent-Digimon boundary. The corrected focused stack is legal under the catalog’s red level-2-to-level-3 evolution route.

Snapshot: `effects.json` retains an older extra `SubTrigger` wrapper and omits the direct `attackTargetsPlayer` condition. The snapshot is stale and was intentionally left untouched.

Score: 8/10 provisional (2/2 catalog/rules, 2/2 direct IR, 2/2 static behavior evidence, 2/2 peer/legal-stack evidence, 0/2 executed gates).

### BT6-002 — Kyaromon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Blue Digi-Egg, level 2, Lesser. Inherited text is `[Your Turn][Once Per Turn] When one of your opponent's digivolution cards is trashed, trigger <Draw 1>.`

Direct module: `apps/api/src/cards/BT6/BT6-002.ts:8-34` installs a `YourTurn` inherited `SubTrigger` for `whenDigivolutionTrashed`, filters the event to opponent-owned Digimon source cards, and draws one. The effect is once per turn and registers only through `registerIrCard`.

Static behavior proof: `BT6-002.test.ts` covers an opponent source, rejects an own source, limits two opponent trash events to one draw, and rejects a rules-based bounce discard (Q1399). Fixtures now use the legal egg → blue level 3 BT6-019 stack. The trigger’s turn scope/frequency and ownership gates were traced through `effect.ts:384-403` and `subTrigger.ts:582-595`.

Peer/legal-stack proof: the `whenDigivolutionTrashed` implementations in BT2-085, BT5-022, and BT12-026 were compared for event shape; BT6-073 was also compared for ownership and once-per-turn watcher semantics. `primitives.ts:2184-2261` confirms effect-caused trash emission, while bounce uses the separate stack-removal path.

Snapshot: direct behavior matches the snapshot for the relevant fields; no correction was needed.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-003 — Bibimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow Digi-Egg, level 2, Lesser. Inherited text is `[When Attacking][Once Per Turn] If you have 3 security cards, gain 1 memory.`

Proven correction: the original direct IR used `youHave` with only a controller filter. `conditions.ts:204-210` makes that condition count matching permanents (battle area/breeding by default), not security cards, and the default threshold is at least one. It could therefore produce a false positive whenever the player had a matching permanent. The module now uses `allOf(securityAtLeast 3, securityAtMost 3)` at `BT6-003.ts:16-23`, matching the established exact-three implementation in BT6-033.

Static behavior proof: `BT6-003.test.ts` now uses a legal egg → yellow level 3 BT6-033 stack, retains the exactly-three positive, and adds two and four security negatives. The security conditions resolve through `conditions.ts:262-265` and the security-count path rather than permanent enumeration.

Peer/legal-stack proof: BT6-033 is the direct same-mechanism peer and uses the same exact-three `allOf` shape; its focused tests cover four versus three security. Comprehensive rules 13-1 and the security-count interpreter path were checked.

Snapshot: `effects.json` still contains the former `youHave` condition. This is a documented direct-vs-generated snapshot drift; the snapshot was not edited and the direct module is authoritative.

Score: 8/10 provisional (2/2, 2/2 after correction, 2/2 static behavior evidence, 2/2 peer/legal-stack evidence, 0/2 executed gates).

### BT6-004 — Pinamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Green Digi-Egg, level 2, Bird. Inherited text is `[When Attacking][Once Per Turn] If you attack an opponent's Digimon, trigger <Draw 1>.`

Direct module: `apps/api/src/cards/BT6/BT6-004.ts:11-35` uses a once-per-turn inherited `WhenAttacking` Draw 1 with `attackTargetMatchesFilter` for an opponent Digimon. The condition checks the original declared target, not the eventual blocker.

Static behavior proof: `BT6-004.test.ts` covers a legal green level 3 BT6-047 host attacking a suspended opponent Digimon. Q1400 and rules 11-2-7-6 establish that a player-directed attack does not satisfy this condition merely because Blocker redirects it.

Peer/legal-stack proof: BT3-004 covers the same declared-Digimon versus player boundary; BT2-012 covers the complementary player-target condition. The host fixture is a legal egg → green level 3 stack.

Snapshot: direct behavior matches the snapshot; no correction was needed.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-005 — Pagumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Black Digi-Egg, level 2, Lesser. Inherited text is `[On Deletion] Reveal the top card of your deck. Add it to your hand if it's a black Digimon card. Otherwise, place it at the bottom of your deck.`

Proven correction: the original `RevealAdd` candidate filter had only `controllerDefault: "mine"`, so it accepted any revealed card. The direct module now requires `kind: ["Digimon"]` and `colors: ["Black"]` at `BT6-005.ts:17-23`; the remainder continues to `deckBottom`.

Static behavior proof: `BT6-005.test.ts` now uses a legal egg → black level 3 BT6-055 stack, retains the black Digimon-to-hand positive, and adds red Digimon and black Option negatives that must remain at the deck bottom. Reveal matching and remainder movement were traced through `reveal.ts:108-121`, `:202-220`, and `:684-713`.

Peer/legal-stack proof: BT3-073 and BT4-096 were compared for black-color definition filters and reveal/deck-bottom behavior. The catalog confirms BT5-059 is a black Digimon, BT1-010 is a red Digimon, and BT6-104 is a black Option, giving independent color and kind boundaries.

Snapshot: `effects.json` retains the old generic controller-only filter. This is documented snapshot drift; it was not edited.

Score: 8/10 provisional (2/2, 2/2 after correction, 2/2 static behavior evidence, 2/2 peer/legal-stack evidence, 0/2 executed gates).

### BT6-006 — Tsunomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Purple Digi-Egg, level 2, Lesser. Inherited text is `[Your Turn][Once Per Turn] When you trash a card in your hand using one of your effects, trigger <Draw 1>.`

Direct module: `apps/api/src/cards/BT6/BT6-006.ts:11-35` uses a `YourTurn` inherited once-per-turn `whenTrashedFromHand` watcher with `bySourceController: "mine"`, then draws one. This correctly distinguishes the effect controller from the affected card’s owner.

Static behavior proof: `BT6-006.test.ts` covers a hand card trashed by the owner’s effect and now uses a legal egg → purple level 3 BT6-069 stack. `subTrigger.ts:582-595` proves the ownership gate; `:690-713` proves hand ownership/self handling. Q1401 confirms the expected draw-after-trash sequence.

Peer/legal-stack proof: BT6-069 and BT6-073 were compared as purple hand-trash watcher peers; BT6-073 also covers once-per-turn behavior. The direct fixture stack is legal.

Snapshot: `effects.json` omits `bySourceController: "mine"` from the generated watcher. Direct registration remains authoritative; the snapshot was not edited.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-007 — Agumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Red level 3 Rookie/Vaccine/Reptile. Main effect: `[All Turns][Once Per Turn] When you play a Tamer with [Tai Kamiya] in its name, gain 1 memory.` Inherited effect: `[Your Turn] While this Digimon is [Agumon - Bond of Bravery], it gains <Security Attack +1>.`

Direct module: `BT6-007.ts:11-70` has an all-turn once-per-turn `whenPlayed` watcher restricted to owner-controlled Tamers whose name contains Tai Kamiya, plus a self-targeted Your Turn Aura using exact top-card `selfHasName` for Agumon - Bond of Bravery. `definition.ts` name matching and `conditions.ts:458-464` preserve the exact-name boundary.

Static behavior proof: `BT6-007.test.ts` covers Tai play and inherited Security Attack +1 on a Bond host. The card-specific KB results Q1402 and Q1403 were checked for copy independence and memory-crossing resolution.

Peer/legal-stack proof: BT6-019 is a same-family inherited-name/trait boundary peer; BT9-068 was compared for dynamic Blitz/stack identity. The focused Bond fixture follows the card’s special Bond stack, while all ordinary egg-to-Rookie assumptions use the catalog’s legal red routes.

Snapshot: direct behavior matches the snapshot; no correction was needed.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-008 — Shoutmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Red level 3 Rookie/Data/Mini Dragon. Inherited text is `[When Attacking][Once Per Turn] If this Digimon has <Blitz>, trigger <Draw 1>.`

Direct module: `BT6-008.ts:11-32` uses an inherited once-per-turn When Attacking Draw 1 gated by live `selfHasKeyword: "Blitz"`. The keyword condition is evaluated on the current host, including keywords provided by the stack.

Static behavior proof: `BT6-008.test.ts` fires the host’s When Digivolving effect, then attacks and checks the draw. The fixture was corrected from an illegal same-level under-card to the legal red level 3 → level 4 BT6-011 → level 5 BT5-014 → level 6 BT9-068 stack. Q1404 establishes that a normal attack is still eligible when Blitz is present.

Peer/legal-stack proof: BT9-068 is the same-mechanism dynamic-Blitz provider; BT6-014 is a direct Blitz-granting peer. `statics.ts`/keyword-ledger live resolution was traced to ensure the inherited watcher sees the granted keyword.

Snapshot: direct behavior matches the snapshot; no correction was needed.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-009 — Huckmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Red level 3 Rookie/Data/Mini Dragon. On Play effect: reveal five cards, add up to two Digimon with [Huckmon], [Jesmon], or [Sistermon] in their names, then place the remainder at the bottom in any order.

Direct module: `BT6-009.ts:11-52` uses On Play `RevealAdd` with `revealCount: 5`, a Digimon filter, a name-or-trait union of Huckmon/Jesmon and Sistermon name matches, count 2, `optional: true`, and `deckBottom` remainder. `definition.ts:68-88` supplies the kind and name union semantics; `reveal.ts:277-309` supplies the 0–2 bounded choice and `:684-713` supplies ordering/remainder movement.

Static behavior proof: `BT6-009.test.ts` covers adding two, declining all eligible cards, and explicit bottom ordering. Q1405 confirms duplicate matching cards are independently eligible. No evolution stack is required to trigger this On Play effect; the card’s ordinary red level-2-to-level-3 route was checked in the catalog.

Peer/legal-stack proof: BT5-009 provides the same reveal/add/remainder mechanism and optional selection comparison; BT6-016 supplies a same-set Sistermon/name matching comparison. The tests explicitly verify `min: 0`, `max: 2`, and the three unchosen cards’ order.

Snapshot: `effects.json` omits `optional: true`, making the generated record stale for the printed “up to 2” behavior. The snapshot was not edited.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-010 — Flamemon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-001–010 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Red level 3 Hybrid/Variable/Wizard. Inherited text is `[Your Turn] While this Digimon has [Hybrid] or [Ten Warriors] in its form or type, it gains <Piercing>.`

Direct module: `BT6-010.ts:11-50` uses a self-targeted Your Turn Aura with `selfHasTrait` and a trait union containing Hybrid and Ten Warriors, then grants Piercing. The matcher reads the current top card’s form/attribute/type union, which is the printed form/type boundary rather than a name substring.

Static behavior proof: `BT6-010.test.ts` checks Piercing on a Hybrid host. Its fixture now uses the legal red level 3 BT6-010 → level 4 BT6-011 → level 5 AD1-002 stack. Comprehensive rules 16-7 confirms the granted keyword’s battle-triggered mandatory security check semantics; `statics.ts` handles the live Aura keyword ledger.

Peer/legal-stack proof: BT4-005 is the same self-trait Aura pattern with positive, negative, and turn-window coverage; BT6-037 is a same-set security/keyword condition peer. `conditions.ts:438-448` confirms trait union matching over the live top card.

Snapshot: direct behavior matches the snapshot; no correction was needed.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively).

### BT6-011 — BaoHuckmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:57987-58010` confirms a red level-4
  Champion with the inherited When Attacking/Once Per Turn Sistermon gate,
  one opposing Digimon at 5000 DP or less. Q1406 confirms that multiple
  Sistermon cards do not increase the deletion count.
- **IR.** `BT6-011.ts:8-49` marks the clause inherited, uses an own battle-area
  Digimon name matcher for Sistermon, restricts the target to one opposing
  Digimon at `dp lte 5000`, and declares `frequency: "OncePerTurn"`.
- **Proof and stack.** `BT6-011.test.ts:6-35` now uses two Sistermon copies
  and two 5000-DP opposing targets, then asserts only one target remains.
  The host is a legal red level-5 BT6-015 over red level-4 BT6-011. BT6-009
  supplies the same Sistermon/Huckmon name-and-count boundary.
- **Status.** No direct fidelity gap remains; snapshot and direct IR agree.

### BT6-012 — Deltamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58012-58034` identifies red level-4
  Champion/Virus/Composite Deltamon, with no effect text and a red level-3
  evolution requirement for 2.
- **IR and proof.** `BT6-012.ts:5-9` is an empty full-coverage record with
  exclusive IR registration. `BT6-012.test.ts:4-9` checks the neutral DP
  baseline. The legal red level-3-to-level-4 lane and adjacent vanilla
  Deltamon peers were checked from the catalog.
- **Status.** No direct fidelity gap or snapshot drift was found.

### BT6-013 — Megadramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58036-58065` confirms the alternate red
  or black level-4 evolution requirements, the Your Turn black-color effect,
  and inherited Your Turn +2000 DP. Q1407/Q1408 establish the battle-area
  versus breeding-area boundary.
- **IR.** `BT6-013.ts:9-49` grants the self permanent the `Black` color during
  the turn and gives the self host +2000 DP permanently while the inherited
  effect's turn scope is active. The direct token is a color, not a trait.
- **Proof and stack.** `BT6-013.test.ts:15-34` checks black in the battle
  area, no black in breeding, and the inherited +2000 DP. The inherited proof
  now uses legal red level-5 BT6-013 under red level-6 BT6-016.
- **Snapshot.** `effects.json:109997-110027` says `grant: "trait"` with
  lowercase `black`; this is documented generated drift. The direct
  registered module is authoritative and no snapshot edit was made.

### BT6-014 — Asuramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58067-58090` confirms red level-5
  Ultimate/Vaccine/Wizard Asuramon and When Digivolving `<Blitz>`. Rules
  `16-16` require opponent memory of at least 1 when Blitz is activated and
  distinguish the later attack from the activation condition.
- **IR and proof.** `BT6-014.ts:8-23` declares a When Digivolving Blitz
  keyword with full coverage. `BT6-014.test.ts:6-20` evolves legal red level-4
  AD1-001 into Asuramon and checks the keyword.
- **Peers and status.** BT5-017 was checked for the same Blitz timing and
  memory boundary. No implementation gap or snapshot drift was found.

### BT6-015 — SaviorHuckmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58092-58116` confirms the optional free
  Sistermon play on digivolution and inherited optional self-unsuspend on
  attack while Sistermon is in play. The historical restriction was lifted
  effective 2023-11-17; no current banlist limit or erratum applies.
- **IR.** `BT6-015.ts:8-69` plays one own hand Digimon whose name contains
  Sistermon without cost and binds the inherited attack action to self with
  `OncePerTurn` frequency and an own-board Sistermon condition.
- **Proof and stack.** `BT6-015.test.ts:9-37` evolves AD1-001 into SaviorHuckmon
  and checks a free hand play. `:39-65` uses legal BT6-015 under red level-6
  BT6-016, attacks, verifies one unsuspend/re-attack, and checks the second
  trigger is unavailable that turn. BT6-082/084 provide same-family peers.
- **Status.** No direct fidelity gap or snapshot drift was found.

### BT6-016 — Jesmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Focused batch and independent static evidence green.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58118-58141` requires an optional
  Sistermon play from hand or trash on attack and a Your Turn/Once Per Turn
  trigger when another Digimon is played, granting +3000 DP and Piercing for
  the turn. Q1409 confirms the Sistermon played by the attack effect also
  satisfies the second clause. Rules `15-3`, `15-4`, `15-5`, `15-8`, and
  `16-7` govern the inherited/source, trigger, once-per-turn, and Piercing
  semantics.
- **Correction.** `BT6-016.ts:8-79` was corrected from a one-shot `once`
  watcher, a global once-per-turn key, and all-own-Jesmon targeting to a
  persistent frequency-bound watcher whose ModifyDP and GainKeyword actions
  both target `{ filter: { isSelfRef: true }, count: 1, isSelf: true }`.
  This restores “this Digimon” and gives each physical Jesmon copy its own
  once-per-turn ledger, while allowing the watcher to trigger again on later
  turns. The module remains exclusively registered with `registerIrCard`.
- **Proof and stack.** `BT6-016.test.ts:8-20` statically guards the absence of
  `once` and `oncePerTurnKey` and asserts self-only targets; `:23-57` checks
  the attack-play path, +3000 DP, Piercing, and no second same-turn stack.
  `jesmon-sistermon-historical-deck.test.ts:8-78` checks two legal Jesmon
  copies share each event but do not stack a second +3000/Piercing grant from
  the second Sistermon play; its stale +5000 expectation was corrected to
  +3000.
- **Status.** One direct behavior gap was corrected. The generated BT6-016
  shape now agrees with the corrected direct IR; no snapshot file was edited.

### BT6-017 — MagnaKidmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58143-58166` confirms Security Attack +1
  and the optional “use a cost-7 Option” versus fallback delete at 4000 DP or
  less. Q1410 confirms that declining an eligible Option is an intentional
  legal choice. Comprehensive Rules `9-1` requires a used Option's Main effect
  and subsequent trashing, rather than playing the Option as a Digimon.
- **IR.** `BT6-017.ts:6-58` declares Security Attack +1 and uses
  `UseOptionWithoutCost` for a hand Option filtered by `playCostOneOf: [7]`.
  The following delete is gated by `not ifThisEffectUsed`, so the fallback
  occurs only when no Option was used.
- **Proof and stack.** `BT6-017.test.ts:8-42` checks Security Attack +1 and
  legal red level-5 AD1-002 to MagnaKidmon use of a cost-7 Option; `:44-73`
  declines the optional use, deletes a 4000-DP target, and leaves the Option
  in hand. BT6-095 and BT6-109 were checked as Option-use peers.
- **Snapshot.** `effects.json:110129-110166` still serializes a
  `PlayWithoutCost` Option target and raw “you don't” condition. The direct
  registered `UseOptionWithoutCost` module is authoritative; the snapshot was
  not edited.

### BT6-018 — Agumon - Bond of Bravery

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58168-58191` confirms the Tamer-gated
  When Attacking deletion at 13000 DP or less and the Your Turn/Once Per Turn
  opponent-deletion watcher that trashes the top security card. Q1411 confirms
  that the deletion caused by the attack can activate the security effect.
- **IR and proof.** `BT6-018.ts:8-63` checks an own battle-area Tamer,
  deletes one opposing Digimon at the exact DP ceiling, and watches opposing
  Digimon deletions with once-per-turn frequency to trash one opposing
  security card. `BT6-018.test.ts:7-43` deletes a 13000-DP target, confirms
  one security card is trashed, deletes another opposing Digimon, and confirms
  the once-per-turn ceiling. The Agumon-Bond historical suite was checked for
  its legal source/evolution and security interactions.
- **Status.** No direct fidelity gap or snapshot drift was found.

### BT6-019 — Gabumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58193-58217` confirms the All Turns
  once-per-turn Matt Ishida memory trigger and inherited Bond-of-Friendship
  attack unsuspend. Q1412 requires separate physical copies to each gain 1
  memory; Q1413 corroborates the no-matching-Digimon interpretation used by
  the neighboring BT6-020 condition.
- **IR.** `BT6-019.ts:9-63` watches own Tamers whose names contain Matt
  Ishida, gains 1 memory with per-copy OncePerTurn frequency, and uses a
  self-only inherited Unsuspend gated by exact self name
  `Gabumon - Bond of Friendship`.
- **Proof and stack.** `BT6-019.test.ts:7-27` adds two Gabumon copies and one
  Matt Ishida, asserting the total +2 memory result from Q1412. `:29-55`
  retains the one-copy/second-Matt once-per-turn negative, and `:57-90`
  completes the legal blue level-3 BT6-019 -> level-4 BT6-023 -> level-5
  BT6-026 -> level-6 BT6-028 -> level-7 BT6-030 Bond stack before checking
  attack unsuspend. BT6-030, BT6-087, and BT2-069 were checked as Bond and
  inherited-stack peers.
- **Status.** No direct fidelity gap or snapshot drift was found.

### BT6-020 — Gizamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-011–020 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog and rules.** `cards.json:58219-58266` confirms blue level-3
  Rookie/Virus/Sea Animal Gizamon and its inherited Your Turn +2000 DP aura
  while the opponent has no Digimon with digivolution cards. Q1414 makes the
  empty-opponent-board case explicitly positive; Q1413 gives the same generic
  no-matching-card interpretation.
- **IR.** `BT6-020.ts:8-42` applies a self-only inherited Aura with +2000 DP
  and an opponent-scoped `opponentHasNone` filter requiring
  `digivolutionCards: "hasAny"`. The primitive therefore excludes only
  opposing Digimon that actually have a source.
- **Proof and stack.** `BT6-020.test.ts:6-35` now checks an empty opponent
  board, an opposing source-less Digimon (bonus remains), and an opposing
  Digimon with a source (bonus is absent). The first two fixtures use legal
  blue level-3 BT6-020 under blue level-4 BT6-023.
- **Status.** No direct fidelity gap or snapshot drift was found.

### BT6-021 — ModokiBetamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58244-58268` identifies an all-turns continuous lock: the opponent cannot gain memory except from a Tamer effect. Q1415 covers Option/Digimon effect gains and specified memory losses; Q1416 covers Security Hammer Spark, so the exception is about the effect source's kind rather than the destination or timing of the memory change.

IR and trace: `apps/api/src/cards/BT6/BT6-021.ts:8-26` is full coverage with no residual. Its AllTurns action is `RestrictMemoryGain`, scoped to `seat: "opponent"`, `exceptTamerEffects: true`, and permanent duration. `continuous.ts:739-759` records and consumes the policy by checking `CardKind.Tamer`; the controller's own gains remain legal. Registration is exclusively `registerIrCard("BT6-021", compiled)` at `:26`.

Behavioral and peer/stack proof: `BT6-021.test.ts:6-14` checks opponent Digimon false, opponent Tamer true, and own Digimon true. The BT3-046 mechanism test additionally checks the policy's source-kind boundary and the policy's seat scope. No trait or inherited stack condition applies; the catalog's blue level-2 evolution is the only legal stack boundary. The snapshot at `effects.json:110252-110263` matches the direct record.

### BT6-022 — Strabimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58269-58293` identifies an inherited When Attacking/Once Per Turn gain of 1 memory when this Digimon has Hybrid or Ten Warriors in its form or type. The comprehensive trait rules treat form, attribute, and type as traits (`comprehensive.md:228-238`), so both named tokens must be matched against the live host's trait union, not only its name or the inherited source's form.

IR and trace: `BT6-022.ts:9-39` is full/no residual and registers only through `registerIrCard`. The inherited action has `trigger: "WhenAttacking"`, `frequency: "OncePerTurn"`, `GainMemory: 1`, and a structured `selfHasTrait` condition whose trait references are Hybrid and Ten Warriors (`:12-32`). `selfHasTrait` checks the source permanent's live top card and uses shared form/attribute/type matching (`conditions.ts:438-449`, `matching/permanent.ts:29-42`); `module.ts:274-295` supplies the once-per-turn usage key.

Behavioral and peer/stack proof: `BT6-022.test.ts:5-23` places BT6-022 under a host and attacks that live host, observing exactly one memory gain. The inherited source is resolved from the legal evolution stack, while peer inherited watchers BT6-025 and BT6-027 use the same timing/frequency shape. The generated snapshot at `effects.json:110264-110281` has the same effect but stores the trait condition as raw prose; this is snapshot drift, not direct-module ambiguity, and the direct structured condition is authoritative. No card-specific errata or restrictions apply.

### BT6-023 — Octomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58294-58317` identifies a blue level-4 vanilla Champion/Virus/Mollusk with no effects, play cost 5, 7,000 DP, and blue level-3 evolution for 2. No card-specific KB entry, errata, or restriction applies.

IR and trace: `BT6-023.ts:5-11` is the complete empty compiled record (`effects: []`, `coverage: "full"`, `residual: []`) with one `registerIrCard("BT6-023", compiled)` call. There is no trigger, target, duration, inherited effect, or source/deck behavior to dispatch.

Behavioral and peer/stack proof: `BT6-023.test.ts:4-9` checks that an isolated Octomon retains its catalog base DP. The normal blue level-3 evolution row is the only applicable legal stack path; no trait-based effect or same-mechanism boundary exists. The snapshot at `effects.json:110282` agrees with the direct module.

### BT6-024 — Mojyamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58318-58343` contains two clauses. During the controller's turn, Mojyamon gains Jamming while the opponent has no Digimon with digivolution cards in play; its inherited When Attacking effect trashes one bottom source from one opponent Digimon. Q1417 confirms the no-Digimon board satisfies the “no Digimon with sources” condition, and comprehensive §16-9 defines Jamming as protection from deletion in battles against Security Digimon.

IR and trace: `BT6-024.ts:8-63` is full/no residual and registers exclusively at `:65`. The YourTurn Aura grants Jamming to self while `opponentHasNone` counts opponent Digimon with `digivolutionCards: "hasAny"` (`:11-38`). Its inherited When Attacking action targets exactly one opponent Digimon with at least one source and trashes `amount: 1` from the bottom (`:41-59`). The condition is recomputed through the continuous layer, and `runTrashDigivolution` uses the stack's front card for bottom removal (`placeUnder.ts:517-542`).

Behavioral and peer/stack proof: `BT6-024.test.ts:6-12` proves Jamming when the opponent has no Digimon; `:14-46` attacks with Mojyamon inherited under a host against a target with bottom and top sources and proves only the bottom source is trashed. BT6-020 is the same `opponentHasNone` mechanism and provides the complementary no-source boundary. The snapshot at `effects.json:110283-110318` matches the direct record. No trait or errata ambiguity applies.

### BT6-025 — Panjyamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58344-58368` identifies an inherited When Attacking/Once Per Turn effect that gains 1 memory. No card-specific KB, errata, or restriction entry applies; Once Per Turn means one activation per turn (`glossary.md:148-155`).

IR and trace: `BT6-025.ts:8-24` is full/no residual. The inherited When Attacking action is `GainMemory: 1` with `frequency: "OncePerTurn"` (`:11-20`), and registration is exclusively `registerIrCard("BT6-025", compiled)` at `:26`. The registration module carries the frequency into `maxPerTurn: 1` (`module.ts:274-295`), while inherited-effect collection anchors the source to the live host stack.

Behavioral and peer/stack proof: `BT6-025.test.ts:5-23` places Panjyamon under a host and proves the attacker's memory becomes exactly 1 from a zero baseline. BT6-022 and BT6-027 provide same-mechanism inherited attack watchers with explicit once-per-turn metadata. The snapshot at `effects.json:110319-110330` matches the direct module. There is no trait filter or additional stack ambiguity.

### BT6-026 — Dragomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58369-58393` identifies a When Digivolving return of one opposing level-4-or-lower Digimon with no digivolution cards to its owner's hand. The level ceiling is inclusive, the source-less condition excludes any stacked Digimon, and return-to-hand of a permanent carries its attached cards to trash as rules teardown under `collectForReturn`.

IR and trace: `BT6-026.ts:8-36` is full/no residual and has one `registerIrCard` call. Its When Digivolving Return action filters `controller: "opponent"`, `kind: ["Digimon"]`, `digivolutionCards: "none"`, and `levelComparison: { op: "lte", value: 4 }`, with `count: 1` and `to: "hand"` (`:11-29`). `removal.ts:574-689` resolves the permanent and calls `returnToHand`; `primitives.ts:3523-3600` moves the top to hand and attached cards to the owner's trash without using the dedicated source-trash event.

Behavioral and peer/stack proof: `BT6-026.test.ts:5-25` legally digivolves into Dragomon and returns an opposing source-less level-4 Digimon to hand. The fixture exercises a real evolution stack and the exact inclusive level boundary on a legal target; a sourced target and level 5 target remain outside the filter by the direct IR. The snapshot at `effects.json:110331-110354` matches. No card-specific KB, errata, or restriction entry applies.

### BT6-027 — Majiramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58394-58419` identifies a When Digivolving top-source trash and an inherited When Attacking/Once Per Turn self-unsuspend when the opponent has no Digimon with sources. Q1418 confirms that no opposing Digimon also satisfies the condition. Comprehensive stack rules establish top-source identity, while glossary Once Per Turn supplies the per-card frequency boundary.

IR and trace: `BT6-027.ts:8-57` is full/no residual and registers only through `registerIrCard("BT6-027", compiled)` at `:59`. The When Digivolving action targets one opponent Digimon with any source and trashes one from the top (`:11-26`). The inherited When Attacking action targets self, has a structured `opponentHasNone` condition over opponent Digimon with `digivolutionCards: "hasAny"`, and is Once Per Turn (`:29-53`). The source-trash path uses the dedicated primitive, while the condition is evaluated against the live board at the attack window.

Behavioral and peer/stack proof: `BT6-027.test.ts:6-27` performs a legal evolution and proves a two-source opposing stack retains its bottom source after the top source is trashed. Its inherited proof at `:29-52` uses a BT6-029 host with BT6-027 in the stack, attacks twice, and proves exactly one reattack. BT6-024 is the same source-removal direction/target shape, and BT6-020 is the same no-source condition. The snapshot at `effects.json:110355-110390` matches the direct record. No trait or errata ambiguity applies.

### BT6-028 — Pukumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58420-58444` identifies a Main Digi-Burst 2 cost followed by “Your Digimon can't be blocked by your opponent's Digimon this turn.” Comprehensive §16-14.1 defines Digi-Burst as trashing the specified number of sources from the Digimon with the effect, and §16-14.2 makes that activation processing optional. Q1419 clarifies that the result prevents opponent Digimon from changing the attack target by blocking.

Correction and IR trace: `BT6-028.ts:22-56` is full/no residual. Its Main action uses a `Restrict` over all own Digimon, `restriction: "cantBeBlocked"`, and `duration: "forTheTurn"`; its cost is a self-referenced trash of exactly two cards from the source's digivolution zone (`:25-43`). `legality.ts:350-366` consumes `cantBeBlocked` on the attacker and rejects every block, exactly matching Q1419. This direct implementation also corrects the stale comment that described Pukumon as a Black level-7 card; the catalog identifies it as Blue level 6.

Behavioral and peer/stack proof: `BT6-028.test.ts:8-51` activates the effect from a Pukumon stack with two sources, proves both sources are paid, proves both Pukumon and a second own Digimon carry the restriction, and submits an attack. The shared combat cluster at `combatRestrictCluster.test.ts:157-212` proves the meaningful block-legality consumer and distinguishes `cantBeBlocked` from the unused target-change dead store. The generated snapshot at `effects.json:110391-110417` is stale: it still has a generic own-Digimon `Trash` action with count 2 and a `beBlocked` restriction on one own Digimon. It was not edited; the direct `cantBeBlocked`/all-own-Digimon shape is authoritative.

### BT6-029 — Azulongmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58445-58469` identifies three linked pieces: When Digivolving trash one bottom source from all opponent Digimon, gain 1 memory for each opponent Digimon with no sources; and a Your Turn continuous grant of Security Attack +1 for each opponent Digimon in play with no sources. Comprehensive §16-4 makes Security Attack a persistent modification to the number of checks, and the stack rules define bottom-source order.

IR and trace: `BT6-029.ts:8-76` is full/no residual and has exclusive `registerIrCard` registration. The When Digivolving action targets all opponent Digimon and trashes one bottom source from each (`:11-24`), followed by `GainMemory` scaled per matching source-less opponent Digimon (`:25-37`). The YourTurn action grants self Security Attack +1 permanently, scaled per source-less opponent Digimon in the battle area (`:40-68`). The source-trash primitive processes each target independently, and `scaleFactor` counts the post-trash live board for the memory clause and the dynamically recalculated board for the Your Turn aura.

Behavioral and peer/stack proof: `BT6-029.test.ts:6-33` legally evolves into Azulongmon, gives one opposing Digimon a source and one none, and proves both bottom sources are gone while memory changes from 5 to 2 (digivolution cost 3 plus two source-less Digimon). Its Your Turn proof at `:35-43` supplies two source-less and one sourced opponent Digimon and observes Security Attack amount 2. The Security Attack peer/mechanism coverage and `scaleFactor` path establish persistent dynamic scaling. The snapshot at `effects.json:110418-110464` matches the direct module. No trait, errata, or restriction ambiguity applies.

### BT6-030 — Gabumon - Bond of Friendship

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-021–030 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58470-58492` identifies two separate When Attacking clauses. The first is optional and Once Per Turn: if the controller has a Tamer, unsuspend this Digimon. The second returns exactly one opponent level-5-or-lower Digimon to the bottom of its owner's deck and states that all of that Digimon's sources are trashed. Attack timing occurs at declaration and all When Attacking processing resolves before block timing (`comprehensive.md:1695-1702,2717-2720`). Evidence from BT6-002 Q1399 resolves the source-trash wording as explanatory teardown; it must not be represented as a dedicated `TrashDigivolution` action that emits `whenDigivolutionTrashed`.

Correction and IR trace: `BT6-030.ts:11-70` is a hand-fixed full/no-residual record with exclusive `registerIrCard` at `:72`. The first When Attacking action is an optional self Unsuspend gated by `youHave` a Tamer and frequency Once Per Turn (`:14-36`). The second selects exactly one opposing Digimon at level 5 or lower and binds it as `returnTarget`, then returns that same selection to `deckBottom` (`:38-65`). The explicit `TrashDigivolution` action was removed. This is intentional: `returnToDeck` uses `collectForReturn` to move the selected top card to its owner's deck bottom and attached sources to trash as canonical rules cleanup (`primitives.ts:3678-3757,5547-5587`), without firing the effect-driven source-trash watcher. `returnDigivolutionCardsFirst` remains unset because that alternate path would put sources into the deck instead of trash.

Behavioral and peer/stack proof: `BT6-030.test.ts:8-57` proves a Tamer permits the first optional unsuspend and that the second attack removes an opposing level-5 target while its two sources reach trash and the top card reaches deck bottom. The added Q1399 negative at `:59-86` places BT6-002 under Bond, arms BT6-002's watcher, performs Bond's return, and asserts no draw while still asserting the target source reaches trash. Under the former explicit `TrashDigivolution`, BT6-002 would have drawn; under canonical Return cleanup, it correctly does not. The BT6-002 focused Q1399 proof and `subTriggerSeams.test.ts:310-335` are the same-mechanism controls.

The generated snapshot at `effects.json:110465-110505` is stale and was not edited: it retains an unbound Return followed by a generic own-Digimon `Trash`. The direct registered module is authoritative. The card has no trait/name boundary beyond the level ceiling, and its BT6-030 test exercises a legal level-5 target with a real attached stack; no card-specific local KB, errata, or restriction entry applies.

### BT6-031 — Tinkermon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 3 Digimon, play cost 3, 2000 DP, evolving from a
Yellow level 2 for 0, Rookie/Virus/Fairy. Its main effect is `[On Deletion] 1
of your opponent's Digimon gains <Security Attack -1> until the end of your
opponent's next turn.`

Direct module: `apps/api/src/cards/BT6/BT6-031.ts:11-36` uses an On Deletion
targeted `GainKeyword` with one opposing Digimon, `SecurityAttack` amount -1,
and `untilOpponentTurnEnd`. It has full coverage, an empty residual list, and
one `registerIrCard` call. Target ownership and the duration are explicit.

Static behavior evidence: `BT6-031.test.ts` retains the deletion/target
assertion and now adds the Q1420 turn-window check: the debuff remains through
the owner's turn and expires after the opponent's turn ends. The test uses
Tinkermon and a target as battle-area permanents; the duration path was traced
to the shared `untilOpponentTurnEnd` cleanup. No test was executed.

Peer and boundary evidence: BT5-036 and BT9-038 use the same opponent-Digimon
Security Attack reduction and opponent-turn-end duration; BT3-040 was checked
as a keyword-duration peer. The direct target count is one and the target is
opponent-owned, with no name/trait condition. No legal evolution stack is
needed for an On Deletion fixture.

Snapshot: the generated record matches the direct behavior for the relevant
fields; no snapshot file was edited.

Score: 8/10 provisional (Catalog/rules 2/2, Direct IR 2/2, Static behavior
2/2, Peer/legal-stack 2/2, Executed gates 0/2). No ambiguity found.

### BT6-032 — Tapirmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 3 Digimon, play cost 3, 2000 DP, evolving from a Yellow
level 2 for 0, Rookie/Vaccine/Holy Beast. Its inherited effect is `[Your
Turn][Once Per Turn] When a card is removed from your security stack, trigger
<Draw 1>`.

Direct module: `apps/api/src/cards/BT6/BT6-032.ts:12-37` places the watcher in
the inherited area with Your Turn and Once Per Turn scope. Its security
removal gate has `sourceFilter: { controller: "mine" }`, and its nested action
draws one card for the effect owner. It has full coverage, empty residuals,
and exactly one `registerIrCard` call.

Static behavior evidence: `BT6-032.test.ts` exercises the watcher through a
legal stack with BT6-032 (level 3) under BT6-035 (level 4), under BT6-041
(level 5), and retains the source's security-removal action. This replaces
the prior illegal direct level-3-under-level-5 fixture. Q1421 was checked for
independent copies and Once Per Turn behavior. No test was executed.

Peer and boundary evidence: BT9-016 and BT6-087/BT6-088 were compared for
security-removal watchers, source ownership, and stack identity. The direct
source controller gate ensures an opponent's security removal cannot satisfy
the effect.

Snapshot drift: `effects.json` contains the same watcher but omits the direct
`sourceFilter: { controller: "mine" }`. This is documented drift; the
snapshot was not edited and the direct registered module remains authority.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-033 — Pulsemon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 3 Digimon, play cost 3, 2000 DP, evolving from a Yellow
level 2 for 0, Rookie/Vaccine/Beastkin. Its On Play effect allows trashing any
number of cards from the top of the owner's Security Stack until three or
more remain, gaining one memory for each card trashed. Its inherited effect is
`[Your Turn] While you have 3 security cards, this Digimon gains <Jamming>`.

Direct module: `apps/api/src/cards/BT6/BT6-033.ts:8-69` uses
`SecurityManipulation` `trashTop`, owner-controlled security, `leaveCount: 3`,
`upTo: true`, and an actual `securityTrashed` count. The follow-up Gain Memory
scales by that named count and is conditioned on the effect having acted. The
inherited Aura uses `allOf(securityAtLeast 3, securityAtMost 3)`, so it is
exactly three rather than at least three or a permanent-count condition. The
module is full coverage with empty residuals and one `registerIrCard` call.

Static behavior evidence: `BT6-033.test.ts` has the positive On Play behavior
and now statically documents the exact-three Aura boundary through the direct
condition shape. Q1422 confirms that zero cards may be selected when the
owner already has three; Q1423 confirms no card can be selected at three or
fewer; Q1424 confirms that five security cards allows exactly one removal and
one memory per removed card. The interpreter's `leaveCount`, `upTo`, and
track-count paths were traced; tests were not executed.

Peer and boundary evidence: the exact same `allOf` security-bound condition
and transition behavior appear in the BT6-033 peer fixture itself; BT6-037
was compared for a lower-bound security Aura. `securityAtLeast` and
`securityAtMost` are checked against the owner's security stack, not a
permanent count.

Snapshot drift: the generated snapshot retains an older `youHave`/controller
condition instead of the direct exact-three security-count `allOf`. This
snapshot was not edited; direct registration is authoritative.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-034 — Wizardmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 4 Digimon, play cost 4, 4000 DP, evolving from a Yellow
level 3 for 2, Champion/Data/Wizard. Its inherited effect is `[Your
Turn][Once Per Turn] When a card is removed from your security stack, gain 1
memory.`

Direct module: `apps/api/src/cards/BT6/BT6-034.ts:12-36` uses an inherited,
Your Turn, Once Per Turn security-removal watcher with the explicit owner
source filter and a nested Gain Memory of one. It has full coverage, empty
residuals, and one `registerIrCard` call.

Static behavior evidence: `BT6-034.test.ts` now uses a legal stack with BT6-031
(level 3) under BT6-034 (level 4), under BT6-041 (level 5), replacing the
prior illegal level-4-under-level-5 arrangement. The host effect removes the
owner's security card, and the focused assertion checks the memory gain.
Q1425 confirms the effect-caused security-removal event. No test was executed.

Peer and boundary evidence: BT6-032 is the same-set draw watcher, while
BT9-016 and BT6-087/BT6-088 cover security removal, owner filtering, and
Once Per Turn behavior. The direct source controller gate prevents opponent
security removal from activating the watcher.

Snapshot drift: `effects.json` omits the direct `sourceFilter: { controller:
"mine" }`. The generated file was not edited.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-035 — Baluchimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 4 Digimon, play cost 4, 5000 DP, evolving from a Yellow
level 3 for 2, Champion/Data/Holy Beast. Its On Play effect is: if the owner
has three or fewer security cards, trigger Draw 2.

Direct module: `apps/api/src/cards/BT6/BT6-035.ts:11-33` uses On Play Draw for
the owner with amount two and an owner-security `zoneCount` less-than-or-equal
to three condition. Coverage is full, residuals are empty, and registration
is exclusively one `registerIrCard` call.

Static behavior evidence: the existing positive focused test covers drawing
two at the allowed threshold. `BT6-035.test.ts` now adds a four-security
negative that plays the card and verifies the deck is unchanged. This
directly checks the upper-bound condition and uses the card's legal level-3
to-level-4 route. No test was executed.

Peer and boundary evidence: BT6-036 is the same-set three-or-fewer security
On Play peer with a memory action; BT7-041 provides a matching threshold
pattern. The condition is owner-scoped and no name/trait matching is involved.

Snapshot: the generated record matches the direct condition/action shape;
there is no correction or snapshot edit.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-036 — Mimicmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 4 Digimon, play cost 4, 3000 DP, evolving from a Yellow
level 3 for 2, Champion/Virus/Mutant. Its On Play effect is: if the owner has
three or fewer security cards, gain two memory.

Direct module: `apps/api/src/cards/BT6/BT6-036.ts:11-32` uses an On Play
Gain Memory amount two with an owner-security `zoneCount` less-than-or-equal
to three condition. The direct module has full coverage, no residuals, and
one `registerIrCard` call.

Static behavior evidence: the positive focused test checks the memory gain at
the allowed count. `BT6-036.test.ts` now adds a four-security negative and
verifies that playing the card changes memory only by its play cost, not by
the conditional two-memory gain. No test was executed.

Peer and boundary evidence: BT6-035 is the same-set draw counterpart and
BT7-041 provides a same-threshold On Play comparison. The card has no
name/trait target, and the condition is explicitly the owner's security
stack.

Snapshot: direct behavior matches the snapshot; no file was edited.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-037 — Bulkmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 4 Digimon, play cost 5, 5000 DP, evolving from a Yellow
level 3 for 2, Champion/Vaccine/Dragonkin. Its main effect is `[Your Turn]
While you have 3 or more security cards, this Digimon gains <Security Attack
+1>`.

Direct module: `apps/api/src/cards/BT6/BT6-037.ts:11-42` uses a Your Turn,
self-targeted live Aura with `securityAtLeast: 3` and Security Attack amount
one. It has full coverage, empty residuals, and exactly one `registerIrCard`
registration.

Static behavior evidence: `BT6-037.test.ts` corrected the stale test label and
alias from Manticoremon to Bulkmon and adds a fewer-than-three negative. The
positive test checks the Aura at three security; the negative checks that two
security does not gain the keyword. No test was executed.

Peer and boundary evidence: BT6-033 is the exact-three security Aura peer;
BT7-041 and BT6-087/BT6-088 were compared for live security-dependent effects
and keyword ledgers. `statics.ts` was traced to confirm that the Aura
re-evaluates after security changes. No name/trait matching is involved.

Snapshot: direct behavior matches the snapshot; no edit was made.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-038 — Apemon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 4 Digimon, play cost 6, 8000 DP, evolving from a Yellow
level 3 for 2, Champion/Vaccine/Beastkin. It has no printed effect or
inherited effect.

Direct module: `apps/api/src/cards/BT6/BT6-038.ts:8-11` compiles an empty
effects array with full coverage and empty residuals, and registers exactly
once through `registerIrCard`. No synthetic effect was added.

Static behavior evidence: `BT6-038.test.ts` already describes the no-effect
behavior and now imports `./BT6-038.js`, ensuring its focused test actually
loads the direct module registration. No test was executed.

Peer and boundary evidence: empty-effect Digimon modules in the same card
catalog were compared; the catalog confirms that the absence of text is
intentional. The card's standard Yellow level-3-to-level-4 evolution route
was checked, but no stack is necessary to prove an empty effect list.

Snapshot: the snapshot also has an empty effect list; no edit was made.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-039 — Mammothmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 5 Digimon, play cost 5, 6000 DP, evolving from a Yellow
level 4 for 3, Ultimate/Vaccine/Ancient Animal. Its inherited effect is `[All
Turns] While you have 3 or fewer security cards, this Digimon gets +1000 DP.`

Direct module: `apps/api/src/cards/BT6/BT6-039.ts:11-43` uses an inherited,
All Turns self Aura with owner security `zoneCount` less-than-or-equal-to
three and Modify DP +1000. It has full coverage, empty residuals, and one
`registerIrCard` registration.

Static behavior evidence: `BT6-039.test.ts` corrected the stale Pulsemon
description and alias to Mammothmon. It now uses a legal BT6-039 level-5
under BT1-062 level-6 stack, starts at four security to verify no buff, then
removes one security and recomputes continuous effects to verify +1000 DP.
No test was executed.

Peer and boundary evidence: BT6-033 and BT6-037 provide same-set
security-dependent live Aura comparisons; `statics.ts` was traced for DP
ledger reevaluation. The lower-bound side is not present in this card: three
or fewer includes zero through three exactly as the catalog text states.

Snapshot: direct behavior matches the snapshot; no edit was made.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-040 — Mistymon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-031–040 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog: Yellow level 5 Digimon, play cost 6, 7000 DP, evolving from a Yellow
level 4 for 3, Ultimate/Virus/Magic Warrior. Its inherited effect is `[Your
Turn][Once Per Turn] When a card is removed from your security stack, 1 of
your opponent's Digimon gets -2000 DP for the turn.`

Direct module: `apps/api/src/cards/BT6/BT6-040.ts:12-44` uses an inherited,
Your Turn, Once Per Turn security-removal watcher with explicit owner source
filter. Its nested Modify DP targets one opposing Digimon for -2000 with
`forTheTurn`. It has full coverage, empty residuals, and exactly one
`registerIrCard` call.

Static behavior evidence: `BT6-040.test.ts` corrected the stale Bulkmon
description and now uses BT13-046 (level 6) over BT6-040 (level 5), a legal
stack. BT13-046's On Attacking effect removes the owner's top security card;
the focused assertion expects both that card's -7000 DP and Mistymon's -2000
DP, for a total -9000. Q1426 confirms that effect-caused removal activates
Mistymon's watcher. No test was executed.

Peer and boundary evidence: BT6-032 and BT6-034 are same-set security-removal
watchers; BT9-016 and BT6-087/BT6-088 were compared for owner filtering,
Once Per Turn, and opponent-Digimon targeting. The direct target count and
opponent controller are explicit; no name/trait boundary is involved.

Snapshot drift: `effects.json` contains the watcher but omits its explicit
`sourceFilter: { controller: "mine" }`. The generated snapshot was not
edited, and the direct module remains executable authority.

Score: 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 respectively). No ambiguity
found.

### BT6-041 — Manticoremon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58745-58767`) is Yellow, Lv.5, 7000 DP, with a Yellow Lv.4 evolution for 3 and the printed text “You may trash the top card of your security stack to have 1 of your opponent's Digimon get -5000 DP for the turn.” The direct module (`apps/api/src/cards/BT6/BT6-041.ts:8-45`) models a `WhenAttacking` optional `ModifyDP` against one opposing Digimon, `-5000` for the turn, with a cost targeting exactly one card in the controller’s security zone at `position: "top"`. This matches Q1427: the cost is unavailable at zero security and cannot be bypassed.

The focused test was mislabeled “Mistymon”; it now names Manticoremon. Its existing positive path proves that the top security card is trashed and one opposing Digimon loses 5000 DP. A new negative path attacks a suspended opposing Digimon while the source has no security; the source loses the battle, but the opposing Digimon remains and no security card enters trash, proving the optional effect cannot fire without its cost. The target filter and DP modifier were compared with the inherited security-removal peer BT6-040 and the generic attack/ModifyDP primitives.

The generated snapshot record (`effects.json:110713-110735`) omits the direct cost filter’s `zone: "security"` and `position: "top"`, leaving only `controller: "mine"`. This is documented snapshot drift; the direct registered module is executable authority and was not weakened to match the stale snapshot.

### BT6-042 — Babamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58770-58797`) is Yellow Lv.6, 10000 DP, with Yellow or Green Lv.5 evolution for 3. Its On Deletion text allows one Rosemon or up to two Yellow Lv.3 Digimon from hand without paying memory. The direct module (`BT6-042.ts:5-56`) uses one optional `Modal` choice: one free `Rosemon` Digimon, or an `upTo` count-two free-play filter for own Yellow Lv.3 Digimon. Both the name boundary and the color/level boundary are explicit.

The two focused tests cover each modal branch: one Rosemon, and two Yellow Lv.3 Digimon. The up-to semantics were checked against comprehensive §15-10-2 and `runRevealAdd`/`PlayWithoutCost` target selection behavior. Same-mechanism comparison included the free-play On Deletion path on BT6-054 and the shared modal/free-play action dispatch. No KB, errata, snapshot, or stack ambiguity was found.

### BT6-043 — SkullMammothmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58800-58822`) is Yellow Lv.6, 11000 DP, with Yellow Lv.5 evolution for 3. The direct module (`BT6-043.ts:8-52`) exposes intrinsic `Blocker` and an All Turns self Aura granting +2000 DP while the controller has three or fewer security cards. This is the correct persistent, conditional shape under §15-8-2 and §16-5.

The focused test proves both Blocker and the +2000 DP state at exactly three security. It now also tests four security: Blocker remains, while the DP bonus is absent. The Aura boundary was compared with inherited threshold peer BT6-039 and the shared `runStaticAction` zone-count gate. The snapshot agrees with the direct module; no KB, errata, or stack ambiguity was found.

### BT6-044 — Dynasmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58825-58847`) is Yellow Lv.6, 12000 DP, with Yellow Lv.5 evolution for 4. The direct module (`BT6-044.ts:11-79`) models an optional When Digivolving `RevealAdd` of six cards, adding up to two own Digimon at level 6 or lower to hand and trashing the rest, with a `trashSecurityTop` cost. Its All Turns Once Per Turn sub-trigger watches `whenSecurityRemoved` only for the source controller and adds the top deck card to that security stack when the post-removal count is at most three.

The focused positive test digivolves legally from AD1-015, verifies the security cost, verifies that six cards are revealed before the pending Recovery reaction, adds two eligible Digimon, and trashes the remainder. The second test pays the security cost and chooses zero eligible additions, proving the “up to two” branch. Q1428–Q1432 were checked against the comments in the direct module, the `trashSecurityTop` cost primitive, `runRevealAdd`, `runSecurityManipulation`, and the GameEngine deferred `whenSecurityRemoved` trigger seam (`GameEngine.ts:2248-2260`). Same-mechanism peers BT6-040, BT6-032, BT6-034, and BT15-038 confirm own-security watcher direction and Once Per Turn placement.

The snapshot (`effects.json:110806-110865`) is stale in two behavior-bearing fields: it encodes a generic `trash` cost with only `controller: "mine"` rather than the direct `trashSecurityTop` cost, and it omits the direct `sourceFilter: { controller: "mine" }` on the security-removal watcher. The direct module is authoritative; no snapshot edit was made.

### BT6-045 — Bakomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58850-58872`) is Green Lv.3, 2000 DP, with Green Lv.2 evolution for 0. Its only text is inherited: when attacking, if the opponent has two or more suspended Digimon, gain one memory. The direct module (`BT6-045.ts:8-35`) marks the effect inherited and uses a `WhenAttacking` `GainMemory` action gated by `opponentHas`, `suspended: true`, `kind: ["Digimon"]`, and count two.

The focused test suite was mislabeled “Pomumon” and used an illegal red Lv.3 host under Bakomon. It now names Bakomon and uses a legal Green Lv.4 BT6-048 host over BT6-045, preserving the inherited lower effect in a legal stack. The existing two-suspended positive path proves the memory gain; a new one-suspended negative path proves the exact threshold. The filter was compared with inherited attack peers and the `opponentHas` condition interpreter. The snapshot agrees, with no KB, errata, or stack ambiguity remaining.

### BT6-046 — Pomumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58875-58897`) is Green Lv.3, 5000 DP, with Green Lv.2 evolution for 1 and no effect text. The direct module (`BT6-046.ts:5-11`) has an empty full-coverage effect list and one IR registration. The focused baseline test confirms no card effect by recomputing continuous effects and checking unchanged DP. The empty snapshot record agrees. Its legal ordinary stack is Green Lv.2 to this Green Lv.3; no alternate path, trait/name filter, KB entry, errata, or restriction applies.

### BT6-047 — Morphomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58899-58921`) is Green Lv.3, 1000 DP, with Green Lv.2 evolution for 0. On Deletion it reveals five cards, adds one Menoa Bellucci and one Digimon with Eosmon in its name, and places the rest at the deck bottom. The direct module (`BT6-047.ts:8-54`) has two independent `RevealAdd` slots, each count one, with the correct name and Digimon-kind boundary, and `rest: "deckBottom"`.

The original focused test proves both targets are found and the remaining three return to the deck. A new test covers Q1433 by revealing only Menoa plus four fillers and confirming Menoa is added while the four fillers are bottomed; the Eosmon slot has no candidate and does not block the available name slot. This was compared with the independent-slot semantics in `runRevealAdd` and the dual-slot RevealAdd peer BT7-046. The snapshot agrees and no direct behavior ambiguity was found.

### BT6-048 — Parasaurmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58924-58945`) is Green Lv.4, 5000 DP, with Green Lv.3 evolution for 2 and no effect text. The direct module (`BT6-048.ts:5-11`) is an empty full-coverage IR card with one registration; its focused baseline test confirms no effect and unchanged DP. The empty snapshot agrees. The legal ordinary stack is Green Lv.3 to this Green Lv.4, with no alternate path, KB entry, errata, or restriction.

### BT6-049 — Arbormon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58948-58970`) is Green Lv.4, 5000 DP, with Green Lv.3 evolution for 2. Its text allows this card from hand to digivolve onto one of the player’s Green Tamers as if the Tamer were a level 3 Digimon. The direct module (`BT6-049.ts:8-42`) registers a typed Static metadata-only `Digivolve` action with `onto: { kind: ["Tamer"], colors: ["Green"] }`, `asLevel: 3`, and `from: ["hand"]`; its required self target is inert metadata and preserves the action schema.

The focused positive test proves the legal Green Tamer path and two-memory payment (the card’s normal Green Lv.3 cost). A new negative test rejects a Red Tamer and leaves that Tamer unchanged. The shared trace is `runDigivolve`’s intentional no-target return for metadata-only Static actions (`digivolve.ts:203-207`), `registerTamerOntoFromEffects`, and `cardData.ts:538-556`, which derives the alternate requirement from the registered `asLevel` action and the matching-color evo cost. Same-mechanism proofs include BT4-027, BT7-046, `engine/cards/digivolve-lock.test.ts`, and the Tamer-onto mechanics conformance tests. Comprehensive §4-3, §4-7, and §8-1 support Tamer-as-base stack semantics, inherited-card behavior, and the normal evolution draw.

The snapshot (`effects.json:110925-110942`) carries the Static action but has a stale alternate requirement lacking `baseColors: ["Green"]`. The shared card-data seam explicitly ignores that stale gateless entry for Tamer-onto cards and derives the correct Green gate from the direct module. The snapshot was not edited.

### BT6-050 — Petaldramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-041–050 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:58973-58995`) is Green Lv.4, 7000 DP, with Green Lv.3 evolution for 3. Its text has the same Green-Tamer-as-level-3 path as Arbormon and intrinsic Piercing. The direct module (`BT6-050.ts:8-54`) registers the same typed Green-Tamer Static metadata-only Digivolve shape (`onto`, `asLevel: 3`, `from: ["hand"]`) and Piercing both as intrinsic keyword metadata and a self-targeted permanent `GainKeyword` action. The two Piercing representations resolve to the same intrinsic capability: keyword projection is set-based and the combat seam reads Piercing as a boolean capability.

The focused tests prove the legal Green Tamer path, the three-memory cost, and Piercing; the negative test rejects a Red Tamer. The direct behavior was traced through `runDigivolve`, `cardData.ts:538-556`, `tamerOntoDigivolve.ts`, `runStaticAction`, the continuous/modifier ledgers, `GameEngine`’s Piercing read seam, and comprehensive §16-7. Same-mechanism peers BT4-027 and BT7-046 establish the Green Tamer gate and normal stack behavior. Q1441–Q1446 and Q4638 were checked for inherited/security text boundaries, mandatory declaration, draw, and stack removal semantics.

The snapshot (`effects.json:110943-110966`) retains the Green-gated alternate requirement and intrinsic keyword metadata but omits the direct self `GainKeyword(Piercing)` action. This is generated snapshot drift, not a reason to replace the registered module: the direct module remains executable authority and no duplicate `registerCard` route was added or preserved.

### BT6-051 — Toropiamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:58998-59020` identifies an inherited When Attacking effect that suspends one opposing Digimon at live DP 5,000 or less. The green level-4 evolution for 3 is the applicable stack route.

IR and trace: `apps/api/src/cards/BT6/BT6-051.ts:8-35` is full/no residual. It is an inherited `WhenAttacking` `Suspend` with `controller: "opponent"`, `kind: ["Digimon"]`, and `dp: { op: "lte", value: 5000 }`; the only registration is `registerIrCard("BT6-051", compiled)` at `:35`. The shared matcher evaluates current DP, preserving the printed inclusive threshold.

Behavioral and peer/stack proof: `BT6-051.test.ts:5-25` attacks with a legal green stack (`BT1-080` green level 6 over BT6-051 green level 5) and suspends an opponent target at exactly 5,000 DP. The snapshot at `effects.json:110962-110980` matches the direct module. No card-specific KB, errata, restriction, or trait/name ambiguity applies.

### BT6-052 — Entmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59023-59045` identifies a Your Turn, Once Per Turn unsuspend after this Digimon deletes an opponent Digimon in battle and survives. The green level-4 evolution for 3 is the legal stack entry when the inherited clause is tested.

IR and trace: `BT6-052.ts:9-41` is full/no residual. Its continuous Your Turn watcher uses `event: "whenDeletesInBattle"`, a self source filter, self Unsuspend, and `frequency: "OncePerTurn"`. The identity gate and combat publication path in the shared engine ensure the event belongs to Entmon itself and only exists after its survival/deletion condition; registration is exclusively `registerIrCard` at `:41`.

Behavioral and peer/stack proof: `BT6-052.test.ts:6-31` uses a battle-area Entmon, deletes an opponent Digimon in battle, observes unsuspension, and confirms it can attack again. The snapshot at `effects.json:110981-110999` omits the direct `sourceFilter: { isSelfRef: true }` anchor; that is snapshot drift, not a direct-module ambiguity. BT6-025 and BT6-027 provide same-mechanism inherited attack watchers with Once Per Turn frequency. No errata or restriction applies.

### BT6-053 — Eldradimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59048-59070` identifies Security Attack +1 and an opponent-turn protection against the opponent's DP-reduction effects. Security Attack is persistent, while the restriction is scoped only to negative DP changes.

IR and trace: `BT6-053.ts:9-43` is full/no residual. Its Static effect grants Security Attack +1, and its OpponentsTurn effect restricts self with `dpImmune`; the sole registration is at `:43`. `primitives.ts:625-655` consumes `dpImmune` for negative deltas, allowing positive buffs and preventing opponent effect reductions as printed.

Behavioral and peer/stack proof: `BT6-053.test.ts:6-15` sets the opponent's turn, recomputes the continuous layer, and observes Security Attack amount 1 plus `dpImmune`. The snapshot at `effects.json:111000-111020` uses stale `haveDPReducedByEffects`; the direct `dpImmune` restriction is the executable authority. No card-specific KB, errata, restriction, or trait/name ambiguity applies.

### BT6-054 — AncientTroymon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59073-59095` contains an opponent-turn attack watcher that suspends up to two opposing Digimon without Blocker, plus an optional On Deletion play from hand of one green level-4-or-lower Digimon with Hybrid in its form. Comprehensive trait rules distinguish form from attribute and type, so the latter clause must use an exact form boundary.

Correction and IR trace: `BT6-054.ts:11-65` is full/no residual and registers exclusively at `:65`. The attack watcher targets opponent Digimon with `excludeKeywords: ["Blocker"]`, count 2, `upTo: true`. The On Deletion action is optional, from hand, free, green, level at most 4, and now uses `forms: ["Hybrid"]` (`:42-51`) instead of a broad trait-union predicate. This is one direct behavior correction: “Hybrid in its form” cannot match an attribute/type-only card.

Behavioral and peer/stack proof: `BT6-054.test.ts:6-63` proves up-to-two non-Blocker suspension, plays BT6-049 Arbormon as a legal green level-4 Hybrid, and negatively rejects BT6-048 Parasaurmon, a green level-4 non-Hybrid. The snapshot at `effects.json:111021-111061` omits both the Blocker exclusion and Hybrid requirement; it was not edited. No card-specific KB, errata, or restriction applies.

### BT6-055 — Junkmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59098-59120` identifies the inherited On Deletion gain of 1 memory. Inherited effects are Digimon effects and trigger from the host's deleted stack under comprehensive §15-3.

IR and trace: `BT6-055.ts:8-25` is full/no residual with inherited `OnDeletion` and `GainMemory: 1`; registration is exclusively `registerIrCard("BT6-055", compiled)` at `:25`. The deletion primitive's On Deletion timing supplies the host/source context.

Behavioral and peer/stack proof: `BT6-055.test.ts:6-15` deletes a legal black stack (`BT5-062` black level 4 over BT6-055 black level 3) and observes memory increase from 0 to 1. The snapshot at `effects.json:111062-111066` matches the direct module. No card-specific KB, errata, restriction, or trait/name ambiguity applies.

### BT6-056 — Chikurimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59123-59145` and Q1448/Q1449 specify a Security De-Digivolve 1 at the end of the Security battle, regardless of battle outcome, before the next check. Security effects resolve while face-up in security, while the delayed action waits for the battle to finish.

Correction and IR trace: `BT6-056.ts:10-41` is full/no residual and now encodes `trigger: "Security"`, `timing: "endOfBattle"`, and a once-only `SubTrigger` for `whenSecurityBattleEnded`, whose body De-Digivolves one opponent Digimon by 1. The direct correction replaces the former immediate Security De-Digivolve, which would have acted before the Security battle. Registration remains exclusively `registerIrCard("BT6-056", compiled)` at `:41`.

Behavioral and peer/stack proof: `BT6-056.test.ts:7-68` first asserts the delayed direct IR shape, then exercises a winning Security battle against a legal red stack (`BT6-016` red level 6 over BT1-021 red level 5) and confirms the source is promoted. A second production attack uses a 500-DP attacker that loses while another opponent stack remains; the effect still De-Digivolves that remaining target, covering Q1448's outcome boundary. The snapshot at `effects.json:111067-111082` remains the old immediate action and is documented drift only. Delayed Security peers BT3-024/082 and BT5-065 use the same watcher shape; no errata or restriction applies.

### BT6-057 — ToyAgumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59148-59170` identifies an inherited All Turns +1,000 DP effect while this Digimon has Blocker. The condition reads the live host's effective keyword state, including printed and granted keywords.

IR and trace: `BT6-057.ts:9-41` is full/no residual. Its inherited AllTurns Aura targets self, adds 1,000 DP, and uses structured `selfHasKeyword` for Blocker; registration is exclusively at `:41`. `conditions.ts:185-189` consumes that condition through `game.hasKeyword`, and the continuous layer applies the Aura while the keyword is present.

Behavioral and peer/stack proof: `BT6-057.test.ts:6-13` uses the legal black stack BT5-062 over BT6-057 and observes host DP increased by exactly 1,000. The snapshot at `effects.json:111083-111100` retains a raw condition string instead of the direct structured condition; direct runtime IR is authoritative. No card-specific KB, errata, restriction, or trait/name ambiguity applies.

### BT6-058 — Nanimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59173-59195` and Q1450-Q1452 specify that Nanimon is played after the Security battle, regardless of outcome, before the next check, and is then a normal battle-area Digimon rather than a Security Digimon.

Correction and IR trace: `BT6-058.ts:10-42` is full/no residual and now encodes Security plus `timing: "endOfBattle"` and a once-only `whenSecurityBattleEnded` watcher. The body plays this exact source from `trash` without paying cost; registration remains exclusively `registerIrCard("BT6-058", compiled)` at `:42`. The direct correction replaces the former immediate play, which would have moved Nanimon before its Security battle and failed the post-battle zone semantics.

Behavioral and peer/stack proof: `BT6-058.test.ts:7-68` asserts the delayed IR shape and runs full Security attacks for both a winning and losing attacker. Both cases play the exact card after battle, and the losing-attacker case confirms the attacker is deleted while Nanimon still plays. The snapshot at `effects.json:111101-111116` remains the old immediate action and was not edited. BT3-082, BT5-065, BT6-111, and BT14-034 provide the same delayed self-play mechanism. Q1450's normal-Digimon boundary is represented by playing into battle area through `PlayWithoutCost`, not as a lingering Security Digimon.

### BT6-059 — Machmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59198-59220` and the errata record identify Machmon's corrected Decoy (Black): another black Digimon would be deleted by an opponent's effect, and Machmon may be deleted to prevent that deletion. Decoy is an immediate replacement, not a normal triggered action, and its “by an opponent's effect” restriction is consumed by the shared deletion primitive.

IR and trace: `BT6-059.ts:9-26` is full/no residual and carries a Static Decoy keyword marker with raw `＜Decoy (Black)＞`; registration is exclusively at `:26`. `keywords.ts:135-180` parses the printed black specifier and `primitives.ts:2800-2885` enforces opposing effect cause, target color, optional holder deletion, and prevention. The direct module therefore faithfully defers the errata's semantic qualifier to the canonical Decoy implementation.

Behavioral and peer/stack proof: `BT6-059.test.ts:6-13` now uses the correct Machmon name and alias and observes Decoy. Same-mechanism `advancedKeywords.test.ts:297-349` exercises BT6-059 alongside another Decoy origin, while `cards/errataCluster.test.ts:273-284` confirms the direct Decoy grant. The snapshot at `effects.json:111117-111133` stores an equivalent Static self GainKeyword action; direct keyword metadata is authoritative and avoids introducing a duplicate action path. No additional restriction applies.

### BT6-060 — Deputymon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-051–060 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59223-59245` specifies On Play reveal of four, one Digimon with Three Musketeers in its traits, one cost-7 Option, and trash the remaining cards. Its Your Turn effect digivolves this Digimon into a hand Three Musketeers Digimon for cost 6 while ignoring requirements. Traits include form, attribute, and type; the direct `nameOrTrait` trait matcher correctly covers the catalog's Three Musketeers type. Q1453 supports adding one available category when the other is missing, Q1454/Q6237 support the activated digivolution, and Q6236 excludes a used DUAL Option that is no longer in hand.

IR and trace: `BT6-060.ts:5-61` is full/no residual. RevealAdd reveals four, has separate Digimon trait and Option cost-7 slots, and trashes the remainder. The Your Turn action targets self, takes a matching Digimon from hand, pays `costOverride: 6`, and sets `ignoreRequirements: true`; `effectKey: "BT6-060/digivolve-three-musketeers"` makes the activated action discoverable. Registration is exclusively `registerIrCard("BT6-060", compiled)` at `:61`.

Behavioral and peer/stack proof: `BT6-060.test.ts:6-145` proves both reveal slots and remaining trash, preserves all four revealed identities through both decisions, performs the alternate digivolution into BT6-112 BeelStarmon, and suppresses the activation when no eligible hand card exists. The hand target is a genuine Three Musketeers type, and no illegal stack is required because the effect explicitly ignores requirements. The snapshot at `effects.json:111134-111190` matches the broad action shape but marks the Your Turn Digivolve action `optional: true`; the direct activated-effect surface already makes declaration optional, so this is documented snapshot drift rather than a direct behavior gap. Q2624/Q4402's legacy `[All Turns]` wording does not apply to the current `[Your Turn]` clause; the direct module has no spurious event watcher.

### BT6-061 — Gigadramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 5, play cost 6, 7000 DP, Black or Red level-4
evolution for 3, Virus/Cyborg. The main effect is `[Your Turn] This Digimon is
also treated as red`; the inherited effect is `[Opponent's Turn] This Digimon
gets +2000 DP`.

The direct module (`apps/api/src/cards/BT6/BT6-061.ts:9-49`) maps the main text
to a self `GrantStatic` color `Red` under `YourTurn`, and maps the inherited
text to self `ModifyDP` +2000 under `OpponentsTurn` with permanent duration.
The inherited flag is on the second effect, and the module is full with no
residual. The color grant is intentionally not a trait grant despite the
generated snapshot drift. The Q1455/Q1456-focused tests verify battle-area
color identity and no color grant in breeding; the inherited test now uses the
legal BT6-065 level-6 top over BT6-061 level 5 rather than an invalid level-3
fixture (`BT6-061.test.ts:15-35`).

Evolution requirements and the battle-area/breeding boundary are consistent
with the rules. No range erratum or restriction applies. Score: **8/10
provisional** — catalog 2/2, rules/rulings 2/2, executable fidelity 2/2,
focused/cross-card evidence 2/2, executed gates 0/2.

### BT6-062 — Volcanomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 5, play cost 6, 7000 DP, Black level-4 evolution
for 3, Data/Cyborg. Its sole inherited clause is `[Your Turn] While your
opponent has an unsuspended Digimon in play, this Digimon gains Security Attack
+1`.

The direct module (`BT6-062.ts:8-47`) uses an inherited YourTurn Aura on self,
with a dynamic opponent battle-area Digimon filter requiring `unsuspended: true`
and the SecurityAttack +1 keyword. This is the correct interpretation of “in
play” under the no-area battle-area rule. The focused test (`BT6-062.test.ts:7-19`)
uses a legal BT6-065 over BT6-062 stack and recomputes after suspending the
opponent, proving the Q1457 state transition. No erratum or restriction applies.
Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2 respectively.

### BT6-063 — BigMamemon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 5, play cost 7, 10000 DP, Black level-4
evolution for 3, Data/Mutant, with no main or inherited effects. The direct
module (`BT6-063.ts:5-9`) intentionally has an empty full effect list and one
IR registration. Its focused test now imports the module before constructing
the card and verifies unchanged DP (`BT6-063.test.ts:1-10`), closing the prior
registration-loading gap in the test fixture. No local KB entry, erratum, or
restriction applies. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-064 — Mamemon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 5, play cost 7, 6000 DP, Black level-4 evolution
for 3, Data/Mutant. It has Decoy (Black), with the errata qualifier “by an
opponent's effect” and “that deletion”, followed by `[On Deletion] Delete 1 of
your opponent's Digimon with a play cost of 7 or less.`

The direct module (`BT6-064.ts:8-39`) carries the Decoy (Black) keyword marker
and an OnDeletion opponent-Digimon deletion filter with inclusive
`playCostLte: 7`, count 1. The Decoy peer and engine semantics cover the errata
boundary; no extra handwritten action is appropriate. The focused test
(`BT6-064.test.ts:8-28`) now places both a play-cost-7 BigMamemon and an
out-of-range play-cost-8 Digimon, verifies the Decoy marker, and confirms only
the cost-7 target is deleted. No other restriction applies. Score: **8/10
provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-065 — Gundramon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 6, play cost 11, 11000 DP, Black level-5
evolution for 4, Virus/Machine/Three Musketeers. It has Blocker and
`[When Digivolving] Reveal the top 5 cards of your deck. You may use 1 Option
card with a memory cost of 7 among them without paying its memory cost. Trash
the remaining cards. If you don't use an Option card with this effect, delete 1
of your opponent's Digimon with a play cost of 4 or less.`

The direct module (`BT6-065.ts:5-54`) carries Blocker, then uses a reveal-five
action filtered to Option and exact play cost 7, destination `useOption`, no
cost payment, and (after this audit) `optional: true`; remaining revealed cards
go to trash. The fallback deletion targets one opposing Digimon with inclusive
play-cost <=4 and is guarded by `ifThisEffectDidNotAct`. This maps Q1458's
optional choice and Q1459's short-deck behavior. The direct correction is one
line: omitting `optional: true` made the bounded use choice mandatory despite
“You may use”.

The three focused cases (`BT6-065.test.ts:10-91`) cover use without payment,
publication of all five revealed identities, and decline leading to the <=4
deletion. Fixtures now use the legal level-6 BT6-065 top over level-5 BT6-061.
The cost-7 Option peers and reveal/use interpreter were cross-checked. No
erratum or restriction applies. Score: **8/10 provisional** — 2/2, 2/2, 2/2,
2/2, 0/2.

### BT6-066 — PileVolcamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 6, play cost 11, 11000 DP, Black level-5
evolution for 3, Data/Cyborg. It has Reboot and
`[Opponent's Turn][Once Per Turn] When one of your other Digimon is deleted,
trigger De-Digivolve 1 on 1 of your opponent's Digimon.`

The direct module (`BT6-066.ts:9-52`) represents Reboot with the static keyword
marker and uses an Opponent's Turn SubTrigger for `onDeletionOf`, filtering the
source to the controller's other Digimon. The nested De-Digivolve action targets
one opposing Digimon and peels one card; frequency is OncePerTurn. The Reboot
marker is correct because the shared effect interpreter skips the legacy
snapshot's explicit Unsuspend action and `GameEngine` executes mandatory Reboot
at the opponent's unsuspend phase.

The focused test (`BT6-066.test.ts:9-55`) checks the Reboot marker and that the
attacker remains suspended during its own turn. It also uses a legal
BT6-067-over-BT6-064-over-BT6-058-over-BT6-056 stack and proves one deletion
peels exactly one card while a second same-turn deletion does not peel again.
The source alias and previously illegal stack were corrected during this
audit. No local erratum or restriction applies. Score: **8/10 provisional** —
2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-067 — Gankoomon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black level 6, play cost 12, 12000 DP, Black level-5
evolution for 4, Data/Holy Warrior/Royal Knight. Its When Digivolving clause
deletes all opposing Digimon with the lowest play cost; its Your Turn clause
grants Security Attack +1 while the opponent has an unsuspended Digimon.

The direct module (`BT6-067.ts:8-61`) uses a WhenDigivolving Delete with
opponent Digimon, `superlative: lowestPlayCost`, and count `all`, which includes
ties. Its YourTurn Aura dynamically gates self SecurityAttack +1 on an
unsuspended opposing Digimon. The focused tests (`BT6-067.test.ts:7-41`) cover
all tied minimum-cost targets and removal of the bonus when the opponent's last
unsuspended Digimon is suspended. The superlative matcher, exact controller,
and same-mechanism Volcanomon aura were cross-checked. No erratum or restriction
applies. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-068 — Impmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple level 3, play cost 3, 2000 DP, Purple level-2
evolution for 0, Virus/Evil. Its On Play text optionally trashes one card from
hand, then only if that optional process occurs returns one trash Digimon whose
type is Seven Great Demon Lords or Three Musketeers.

The direct module (`BT6-068.ts:9-53`) makes the hand trash optional and binds
the discarded card; the Return action targets the owner's trash for a Digimon
whose exact trait matches either allowed type and requires `bindingExists`.
This explicitly preserves Q1462's “if you do” dependency. The focused tests
(`BT6-068.test.ts:7-57`) cover successful trash/return, keep an unmatched
Fallen Angel in the trash, and decline the optional trash without returning the
matching candidate. Trait matching and the direct trait-vs-name boundary were
cross-checked against the catalog rules and Three Musketeers peers. No erratum
or restriction applies. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2,
0/2.

### BT6-069 — Goblimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple level 3, play cost 3, 2000 DP, Purple level-2
evolution for 0, Virus/Demon. Its inherited Your Turn Once Per Turn clause
grants +2000 DP for the turn when its controller's effect trashes a card from
hand.

The direct module (`BT6-069.ts:9-40`) places the watcher under YourTurn,
marks it inherited and OncePerTurn, listens for `whenTrashedFromHand`, requires
`bySourceController: mine`, and modifies self for `forTheTurn`. This matches
the hand-trash event's effect-controller data and does not incorrectly trigger
on an opponent's effect. The focused test (`BT6-069.test.ts:7-25`) now uses the
legal level-4 BT6-071 top over Goblimon, checks the first +2000 DP, then checks
that a second same-turn trash cannot add another +2000. The BT6-073 watcher
peer and hand-trash event primitive were cross-checked. No erratum or
restriction applies. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-070 — Elecmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-061–070 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple level 3, play cost 4, 2000 DP, Purple level-2
evolution for 0, Virus/Mammal. Its On Deletion clause deletes one opposing
level-3 Digimon.

The direct module (`BT6-070.ts:8-29`) maps OnDeletion to one opponent Digimon
target with exact `levels: [3]`; no broad level boundary or non-Digimon target
is allowed. The focused test (`BT6-070.test.ts:7-25`) now includes both a level
3 and a level 4 opposing Digimon and confirms only level 3 is deleted. No
erratum or restriction applies. Score: **8/10 provisional** — 2/2, 2/2, 2/2,
2/2, 0/2.

### BT6-071 — Kinkakumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59503-59525`) is Purple Lv.4, 5000 DP, with a Purple Lv.3 evolution for 2 and play cost 4. Its inherited text says that when attacking, the player may trash one card from hand to delete one opposing Lv.3 Digimon. The direct module (`apps/api/src/cards/BT6/BT6-071.ts:8-44`) models an inherited `WhenAttacking` optional generic hand-trash cost followed by `Delete` targeting one opposing Digimon at level exactly 3. The condition is represented as a level set `[3]`, so the boundary is not an “up to level 3” interpretation.

The focused test fixture now evolves a legal Purple Lv.5 BT6-076 over BT6-071, preserving the inherited effect in a valid stack; the former unrelated red host was not a legal proof of this Purple inherited card. Its attack path proves the hand cost and opposing Lv.3 deletion. The target and cost were compared with same-mechanism attack/delete peers such as BT6-070 and the shared `WhenAttacking` action path. The legal stack is Purple Lv.3 to BT6-071, then a Purple Lv.5 such as BT6-076; breeding-area trigger restrictions and inherited-effect boundaries were checked.

The generated snapshot (`effects.json:111422-111442`) agrees with the direct module for this card. No KB, errata, restriction, trait/name, or snapshot ambiguity remains.

### BT6-072 — Ogremon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59528-59550`) is Purple Lv.4, 4000 DP, with a Purple Lv.3 evolution for 2 and play cost 5. Its On Play text may trash one card from hand to delete one opposing Digimon at level 4 or lower. The direct module (`BT6-072.ts:8-46`) uses an optional hand-trash cost and `Delete` with an opponent Digimon level comparison `lte: 4`.

The focused tests cover the positive own-hand/opponent-Lv.4 path and Q1463’s empty-hand negative: with no hand card available, the optional effect does not pay its cost or delete a target. The level boundary was compared with the direct BT6-070 delete peer and the shared level-comparison matcher. The legal ordinary stack is Purple Lv.3 into this Purple Lv.4; no alternate evolution path, trait/name exception, or breeding-area behavior applies.

The generated snapshot (`effects.json:111444-111470`) agrees with the direct module. No KB, errata, restriction, or snapshot ambiguity remains.

### BT6-073 — Ginkakumon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59553-59575`) is Purple Lv.4, 5000 DP, with a Purple Lv.3 evolution for 2 and play cost 5. Its inherited text is `[Your Turn][Once Per Turn] When one of your effects trashes a card from your hand, gain 1 memory.` The direct module (`BT6-073.ts:9-34`) uses an inherited `whenTrashedFromHand` sub-trigger with `bySourceController: "mine"`, a self/source-card boundary, `YourTurn`, `OncePerTurn`, and `GainMemory(1)`.

The focused test fixture now uses legal Purple Lv.5 BT6-076 over BT6-073. Tests prove one gain on the first own effect-caused hand trash, no second gain in the same turn, and no gain from an independently trashed card copy. The `bySourceController` field is behavior-bearing: it excludes an opponent-caused trash event even when the named Ginkakumon card itself belongs to this player. Same-mechanism peers BT6-069 and BT6-081 use the same own-effect hand-trash provenance pattern. The ordinary legal stack is Purple Lv.3 into this Purple Lv.4, with the inherited effect unavailable while the card is in breeding.

The generated snapshot (`effects.json:111472-111484`) omits `bySourceController: "mine"`. This is documented snapshot drift; the direct registered module is executable authority and was not weakened to match the snapshot. No KB, errata, restriction, or unresolved behavior ambiguity remains.

### BT6-074 — Boogiemon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59578-59599`) is Purple Lv.4, 7000 DP, with a Purple Lv.3 evolution for 2 and play cost 5 and no effect text. The direct module (`BT6-074.ts:5-11`) is an empty full-coverage IR card with one registration. Its focused baseline confirms that no effect is emitted and that the card has no runtime behavior beyond ordinary card state.

The legal stack is Purple Lv.3 into this Purple Lv.4. No trait/name boundary, alternate evolution path, KB entry, errata, restriction, or snapshot ambiguity applies. The empty generated snapshot record (`effects.json:111486`) agrees with the direct module.

### BT6-075 — Ginkakumon Promote

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59602-59629`) is Purple Lv.4, 6000 DP, with Purple Lv.3 evolution for 2 or Purple Lv.4 evolution for 1 and play cost 6. It has Rush. Its On Play effect may place up to two exact-name cards, one Kinkakumon and one Ginkakumon, from the player’s trash under this Digimon in any order; if two cards were placed, draw one and gain one memory.

The direct module (`BT6-075.ts:5-62`) registers Rush and an optional `PlaceUnder` from own trash with exact `requiredNamesExactUpTo: ["Kinkakumon", "Ginkakumon"]`, `count: 2`, `order: "any"`, and bottom placement under the source. The follow-up Draw and GainMemory actions are gated by the tracked placement count being at least two. Exact-name filtering excludes Ginkakumon Promote itself, as Q1464 requires; Q1465’s optional and up-to semantics permit declining the placement or selecting only one available exact card, while the two-card branch places both when selected.

Focused tests cover same-turn Rush attack, both exact cards and the draw/memory bonus, either placement order, one-name partial placement, the no-name negative, and the Q1464/Q1465 boundaries. The direct `PlaceUnder` selection and bottom position were compared with the shared place-under action and the exact-name peer implementations. Legal evolution paths are Purple Lv.3 to this Lv.4 or Purple Lv.4 to this Lv.4, with the normal stack bottom/top rules preserved.

The generated snapshot (`effects.json:111487-111520`) agrees with the direct module. No KB, errata, restriction, trait/name, or snapshot ambiguity remains.

### BT6-076 — Feresmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59632-59653`) is Purple Lv.5, 9000 DP, with a Purple Lv.4 evolution for 3 and play cost 6 and no effect text. The direct module (`BT6-076.ts:5-11`) is an empty full-coverage IR card with one registration. Its baseline test confirms no effect behavior.

The legal ordinary stack is Purple Lv.4 into this Purple Lv.5. This card is used as the legal Purple host in the BT6-071 and BT6-073 inherited-effect tests. No trait/name boundary, alternate path, KB entry, errata, restriction, or snapshot ambiguity applies; the empty snapshot record (`effects.json:111522`) agrees.

### BT6-077 — Rebellimon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59656-59683`) is Ultimate/Virus/Cyborg, Purple Lv.5, 7000 DP, with play cost 7 and either a Purple Lv.4 or Black Lv.4 evolution for 3. Its When Digivolving text may trash one card from hand to have this Digimon gain Blocker and Retaliation until the opponent’s next turn. Its All Turns text treats this Digimon as black.

The original direct IR had two behavior gaps. Both keyword actions targeted a generic own Digimon rather than the source, so a decoy could receive the keywords; and Blocker and Retaliation were represented as separate optional actions, permitting the cost/choice semantics to diverge from the single printed “have this Digimon gain both” effect. The corrected module (`BT6-077.ts:8-67`) has one optional self-targeted `GainKeyword` action with the hand-trash cost, Blocker as its primary keyword and Retaliation in the combined keyword list, followed by an All Turns self-targeted `GrantStatic` color Black action. The direct module remains a single `registerIrCard` path with full coverage.

Focused tests add a decoy Digimon and prove only the source gains Blocker and Retaliation, and add a decline path proving that declining the optional effect neither trashes a hand card nor grants either keyword. Q1466’s breeding-area boundary and Q1467’s empty-hand cost boundary were checked. A legal historical stack is covered by `titamon-historical-deck.test.ts:18-23`, where BT6-077 evolves over Purple Lv.4 sources including BT6-006 and BT6-073; its downstream assertions at `:57-86` exercise the resulting keywords. The two evolution colors and level-4 bases were checked against the catalog; All Turns color treatment was compared with BT6-013’s direct `GrantStatic` color pattern.

The generated snapshot (`effects.json:111523-111563`) is stale in behavior-bearing fields: it targets a generic own Digimon for the Blocker and Retaliation grants, splits the grants into separate optional actions, and uses `grant: "trait", tokens: ["black"]` rather than the direct self-targeted `grant: "color", tokens: ["Black"]`. The direct registered module is executable authority; the snapshot was not edited. No KB, errata, restriction, or unresolved ambiguity remains after the correction.

### BT6-078 — SkullGreymon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59686-59709`) is Purple Lv.5, 7000 DP, with a Purple Lv.4 evolution for 3 and play cost 8. It has an effect allowing the player to trash this card from hand using one of their effects and then optionally place it at the bottom of one of their Purple Digimon’s digivolution stacks. When attacking, it may trash one card from hand to give itself +3000 DP for the turn; its inherited effect is Retaliation.

The direct module (`BT6-078.ts:7-87`) watches `whenTrashedFromHand` with `bySourceController: "mine"`, `once: true`, and `sourceFilter: { isSelfRef: true }`, then optionally places the exact source under one own Purple Digimon at the bottom. Its When Attacking action is self-targeted +3000 DP for the turn with an optional generic hand-trash cost, and its inherited static keyword is Retaliation. The added negative test trashes SkullGreymon through an opponent-caused effect and proves it does not place itself; the inherited host was corrected to legal Purple Lv.6 BT6-080 over BT6-078, and the attack path proves the +3000 modifier.

The `bySourceController` correction is required because the hand-trash primitive records both the hand owner and the effect-causing seat; matching only the source card would allow an opponent’s effect to satisfy “one of your effects.” Same-mechanism peers BT6-069 and BT6-081 establish own-effect hand-trash provenance, while the place-under interpreter establishes bottom-stack placement and source identity. The legal ordinary stack is Purple Lv.4 into BT6-078 and Purple Lv.5 into BT6-080.

The generated snapshot (`effects.json:111564-111609`) is stale: its hand-trash watcher omits `bySourceController`, `once`, and the source self filter, and its attack DP action has a generic rather than direct self target. The direct registered module is executable authority and was not changed to match the snapshot. No KB, errata, restriction, trait/name, or unresolved behavior ambiguity remains.

### BT6-079 — Murmukusmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59712-59734`) is Purple Lv.6, 10000 DP, with a Purple Lv.5 evolution for 3 and play cost 11. It has intrinsic Retaliation. Its On Deletion effect may play one exact-name Ornismon from the player’s trash without paying its cost when the player has at least ten cards in trash.

The direct module (`BT6-079.ts:8-56`) registers Retaliation and an optional On Deletion `PlayWithoutCost` for own exact-name Ornismon from own trash, gated by a current trash `zoneCount` greater than or equal to ten and `payCost: false`. The focused boundary test starts with exactly nine cards in trash, deletes Murmukusmon so it becomes the tenth, and proves Ornismon is then free-played, confirming Q1468 and the interpreter’s post-deletion timing. The existing positive path proves the ten-card free-play. Retaliation was compared with the battle controller’s holder-side deletion rule and static keyword peers.

The legal ordinary stack is Purple Lv.5 into this Purple Lv.6, and the exact Ornismon name boundary was checked against the play target matcher. The generated snapshot (`effects.json:111610-111638`) agrees with the direct module. No KB, errata, restriction, trait/name, or snapshot ambiguity remains.

### BT6-080 — Ornismon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-071–080 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

The catalog record (`cards.json:59737-59759`) is Purple Lv.6, 12000 DP, with a Purple Lv.5 evolution for 4 and play cost 12. It has Security Attack +1. Its On Play effect deletes one opposing Digimon at level 5 or lower.

The direct module (`BT6-080.ts:8-45`) registers static Security Attack +1 and an On Play `Delete` against one opposing Digimon with level comparison `lte: 5`. The focused test now places an opposing Lv.4 BT6-075 and a Lv.6 BT6-079, verifies only the Lv.4 target is deleted, and verifies the Lv.6 remains. The legal stack is Purple Lv.5 into this Purple Lv.6; Security Attack persistence and the level-5 ceiling were compared with shared combat and delete primitives.

The generated snapshot (`effects.json:111640-111665`) agrees with the direct module. No KB, errata, restriction, trait/name, or snapshot ambiguity remains.

### BT6-081 — Titamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59762-59785` identifies a purple level-6 Mega/Virus/Shaman, play cost 12, with purple level-5 evolution cost 4. Its When Digivolving effect trashes one hand card and may play a purple level-4-or-lower Digimon from trash without paying the cost. Its Your Turn, Once Per Turn clause reacts when one of the controller's effects trashes a hand card, giving this Digimon +2000 DP and Security Attack +1 for the turn.

IR and trace: `apps/api/src/cards/BT6/BT6-081.ts:8-89` is full with no residual. The first effect uses `Trash` from the controller's hand followed by optional free `PlayWithoutCost` from the controller's trash, constrained to purple Digimon at level 4 or lower. The second effect is a Your Turn `SubTrigger(event: "whenTrashedFromHand")`, source-controller constrained to the controller, with self +2000 and Security Attack +1 for the turn and Once Per Turn frequency. Registration is exclusively at `:89`.

Focused/peer proof: `BT6-081.test.ts:9-67` covers the legal level-5-to-level-6 evolution, hand trash, free purple level-4 play, same-turn +2000/Security Attack bonus, and Once Per Turn limit. The snapshot at `effects.json:111667-111717` has the same action structure but omits the direct `bySourceController: "mine"` and self identity on the watcher; the direct source-controller/self-scoped record is authoritative. No errata, restriction, trait/name, or stack ambiguity remains.

### BT6-082 — Sistermon Blanc

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59787-59805` identifies a white level-3 Vaccine/Puppet Digimon, play cost 3 and 3000 DP. All Turns, while the controller has a Huckmon-named or Royal Knight-type Digimon in the battle area, the controller's Sistermon-named Digimon gain Blocker; On Play draws one.

IR and trace: `apps/api/src/cards/BT6/BT6-082.ts:8-72` is full with no residual. The All Turns Aura targets all own Digimon whose names contain Sistermon and continuously gates on a battle-area own Huckmon name or Royal Knight trait. The On Play Draw is a direct one-card draw. Registration is exclusively at `:72`.

Focused/peer proof: `BT6-082.test.ts:9-124` covers the positive Huckmon aura, no-enabler negative, a real Blocker response, removal of the last enabler, and On Play draw. Q2044-Q2045 provide pending On Play activation and deletion-before-activation boundaries. The snapshot at `effects.json:111718-111754` matches the direct module. No errata, restriction, trait/name ambiguity, or evolution stack is applicable.

### BT6-083 — Eosmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59806-59831` identifies a white level-4 Eosmon, play cost 4 and 4000 DP, with green level-3 evolution cost 2. On Play it may play a white Tamer costing 4 or less from the controller's hand without paying, then the opponent may play a Tamer from their hand without paying. The inherited When Attacking clause may play another qualifying own white Tamer from hand.

IR and trace: `apps/api/src/cards/BT6/BT6-083.ts:8-68` is full with no residual and registers exclusively at `:68`. It preserves the two sequential but independently optional On Play branches and the inherited free white-Tamer When Attacking branch. Q1469 confirms the second branch remains available when the first is declined. The target filters correctly distinguish own white cost-4-or-less Tamers from any opponent Tamer.

Focused/peer/stack proof: `BT6-083.test.ts:7-60` covers inherited free play and the own-then-opponent On Play sequence. Its attack fixture was corrected to a legal level-5 BT6-085 host over level-4 BT6-083; the prior BT6-086-over-BT6-083 fixture skipped the required level-5 evolution stage. Q2845 confirms that related live DP is read at resolution. The snapshot at `effects.json:111755-111797` matches the direct module. No errata, restriction, or trait/name ambiguity remains.

### BT6-084 — Sistermon Ciel

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59832-59850` identifies a white level-4 Data/Virus/Puppet Digimon, play cost 4 and 5000 DP, with no ordinary evolution requirement. All Turns gives own Huckmon-named or Royal Knight-type Digimon +2000 DP; On Play gains one memory. Q1470 is decisive: it always treats BT6-084 as additionally named Sistermon Noir and traited Virus. Q5224 confirms the alias participates in same-name prohibitions.

Correction and IR trace: `apps/api/src/cards/BT6/BT6-084.ts:8-82` is full with no residual and includes a Rule effect with self-targeted `GrantStatic` name `Sistermon Noir` and trait `Virus`. The direct IR does not duplicate that Rule as free-form `ruleText`. The shared `packages/shared/src/cards/effectiveNames.ts:17-19` alias entry is necessary because the committed catalog effect text predates the standardized Rule wording and ordinary definition matching must see the alias in every zone. The All Turns +2000 target remains an OR of Huckmon name and Royal Knight trait, and On Play gains one memory. Registration is exclusively at `:82`.

Focused/peer proof: `BT6-084.test.ts:8-38` now checks Q1470's effective name/trait boundary and direct universal alias, then covers the two +2000 target families and On Play memory. The snapshot at `effects.json:111798-111825` omits the Rule alias/trait grants; it was not edited. The direct Rule and shared alias seam are authoritative, and no errata, restriction, or legal stack ambiguity remains.

### BT6-085 — Eosmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59851-59881` identifies a white level-5 Eosmon, play cost 5 and 6000 DP, with white/green level-4 evolution cost 3. Q1471 confirms that up to 50 copies of this card number are legal in a deck, while Q1494 confirms that effects referencing a played Eosmon see its modified/live DP.

IR and trace: `apps/api/src/cards/BT6/BT6-085.ts:5-59` is full with no residual. Its When Attacking effect may play one own level-5-or-lower Eosmon from hand without paying, and its inherited Your Turn effect gives its host +1000 DP persistently while that inherited effect is active. The non-effect 50-copy deck rule remains authoritative catalog metadata at `maxCountInDeck: 50`; the direct IR does not duplicate it as `ruleText`. Registration is exclusively at `:59`.

Focused/peer/stack proof: `BT6-085.test.ts:6-34` covers the legal BT6-086-over-BT6-085 inherited stack and the free level-5 Eosmon play. The catalog's `maxCountInDeck: 50` is consumed by deck validation; the rule is not an effect-time battlefield action. The generated snapshot is synchronized from the direct module and carries its executable full-coverage effects, while deck construction continues to read the catalog metadata. No errata, restriction, trait/name, or stack ambiguity remains.

### BT6-086 — Eosmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59882-59911` identifies a white level-6 Eosmon, play cost 13 and 13000 DP, with white/green level-5 evolution cost 5. When Digivolving, for each Tamer in play it may place one level-5-or-lower Eosmon from trash at the top of this Digimon's stack in any order; if at least two cards were placed, it deletes one opponent Digimon. Its Your Turn effect grants Security Attack +1 for every three cards in this stack.

Correction and IR trace: `apps/api/src/cards/BT6/BT6-086.ts:5-95` is full with no residual and registers exclusively at `:95`. Its PlaceUnder action counts all Tamers from both controllers, selects up to that many own-trashing Eosmon cards at level 5 or lower, places them at the top, tracks the placed count, and now explicitly uses `order: "any"` so the controller can choose their order. The subsequent opponent Digimon deletion is gated at placed-count 2, and the Your Turn Security Attack scaling uses the canonical `digivolutionCards` unit per three.

Focused/peer/stack proof: `BT6-086.test.ts:7-75` uses the legal level-5 BT6-085-to-level-6 stack, two Tamers, two Eosmon cards in trash, and a deletion target; the placement test now explicitly exercises an orderCards response. The added controller-boundary case at `BT6-086.test.ts:77-114` uses one own and one opposing Tamer and proves both count toward placement. The snapshot at `effects.json:111875-111918` has a residual RawUnparsed placement action and a broad raw condition; direct PlaceUnder/count tracking is executable authority. No errata, restriction, trait/name, or additional stack ambiguity remains.

### BT6-087 — Tai Kamiya

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59912-59927` identifies a red Tamer costing 3. On the controller's turn, a Digimon with Agumon or Greymon in its name moving from breeding to battle grants one memory and Draw 1. Its Once Per Turn Main effect digivolves an exact `[Agumon]` into `[Agumon - Bond of Bravery]` from hand for cost 3 while ignoring level, then trashes the top two Security cards; if at least one Security card remained when the effect finished activating, that Bond is deleted at the end of the turn. Security plays this card free.

Correction and IR trace: `apps/api/src/cards/BT6/BT6-087.ts:5-140` is full with no residual. The movement watcher intentionally uses substring `name` for “Agumon or Greymon in its name,” while the Main activation's outer prerequisite now uses `nameExact: "Agumon"`, matching Q1473; its Digivolve target was already exact. The action keeps red color, hand source, cost override 3, ignore-requirements, conditional top-two Security trash, and a player-scoped end-of-turn deletion watcher bound to the selected host. The direct activated surface is an effect-keyed Your Turn Digivolve routed through the shared activated builder, not a second registration path. Registration is exclusively at `:140`.

Focused/peer/stack proof: `BT6-087.test.ts:9-149` covers breeding movement, Security free play, Bond evolution/security trash, red-color rejection, exact Agumon rejection for Agumon Expert, one-Security Q1472 behavior, and delayed deletion. The Bond host starts from a legal red Agumon; the action intentionally ignores level as printed. The snapshot at `effects.json:111919-111969` retains RawUnparsed movement/Main clauses and marks the action `Main`; the direct executable module is authoritative. No errata, restriction, trait/name, or remaining legal-stack ambiguity applies.

### BT6-088 — Matt Ishida

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59928-59943` identifies a blue Tamer costing 3, mirroring BT6-087 for Gabumon/Garurumon and Gabumon - Bond of Friendship. It grants one memory and Draw 1 when a matching Digimon moves breeding-to-battle, has the same Once Per Turn Main evolution/security/deletion structure, and plays free from Security.

Correction and IR trace: `apps/api/src/cards/BT6/BT6-088.ts:5-140` is full with no residual. The movement watcher retains substring matching for “Gabumon or Garurumon in its name,” while the Main prerequisite now uses exact `Gabumon`; the Digivolve host target was already exact. Blue color, hand source, cost override 3, ignored requirements, Security trash, and the player-scoped end-of-turn host deletion all remain constrained. Registration is exclusively at `:140`.

Focused/peer/stack proof: `BT6-088.test.ts:9-172` covers breeding movement, Security free play, legal Bond evolution/security trash, blue-color rejection, an exact Gabumon-only activation boundary rejecting Gabumon X, and delayed deletion after Matt leaves. The duplicate-Bond test proves selection is per source copy. The snapshot at `effects.json:111970-112020` retains RawUnparsed movement/Main clauses and a stale `Main` trigger; direct executable IR is authoritative. No errata, restriction, trait/name, or legal-stack ambiguity remains.

### BT6-089 — T.K. Takaishi & Kari Kamiya

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59944-59959` identifies a yellow Tamer costing 4. Start of Your Turn gains two memory only when the controller has fewer Security cards than the opponent. On the controller's turn, when an own yellow Digimon attacks, this Tamer may suspend to give one opposing Digimon -1000 DP for the turn. Security plays it free. Q1479 explicitly excludes equal Security counts.

IR and trace: `apps/api/src/cards/BT6/BT6-089.ts:5-86` is full with no residual. The StartOfYourTurn condition is a strict `securityCompare` less-than; the Your Turn watcher is constrained to own yellow Digimon attacks and uses an optional self-suspend cost on a one-target opposing-Digimon DP reduction; the Security branch is free self-play. Registration is exclusively at `:86`.

Focused/peer proof: `BT6-089.test.ts:8-42` covers the attack-triggered suspend/DP reduction and fewer-Security memory gain. The shared optional-cost path keeps a decline from applying the debuff, and Q1479 supplies the equal-count negative boundary. The snapshot at `effects.json:112021-112075` matches the direct action shape. No errata, restriction, trait/name, or evolution stack is applicable.

### BT6-090 — Izzy Izumi & Joe Kido

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-081–090 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:59960-59972` identifies a black Tamer costing 4. Start of Your Turn gains two memory when the opponent has at least two Digimon in play. During the opponent's turn, when one of the controller's black Digimon is deleted, this Tamer may suspend to Draw 1. Security plays it free.

Correction and IR trace: `apps/api/src/cards/BT6/BT6-090.ts:8-84` is full with no residual and registers exclusively at `:84`. The StartOfYourTurn condition counts opponent battle-area Digimon at two or more. The opponent-turn deletion watcher is constrained to own black Digimon and now marks its optional self-Suspend action `abortOnDecline: true` before the mandatory Draw, so declining the cost correctly declines the entire “may suspend to Draw 1” clause. Security remains free self-play.

Focused/peer proof: `BT6-090.test.ts:8-64` covers the two-opponent-Digimon memory condition, the successful suspend-and-draw branch, and a new optional-decline negative proving no suspension and no draw. The snapshot at `effects.json:112076-112145` omits the direct Draw following Suspend and is therefore stale; it was not edited. The direct module's complete body plus abort semantics is executable authority. No errata, restriction, trait/name, or evolution stack is applicable.

### BT6-091 — Sora Takenouchi & Mimi Tachikawa

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple Tamer, play cost 4. Its start-of-turn clause gains
2 memory if the opponent does not have a level 4 or lower Digimon in play.
Its Your Turn clause triggers when one of its controller's Purple Digimon
attacks: it may suspend this Tamer to Draw 1, then trash one hand card.
Security plays the Tamer without paying its play cost.

The direct module (`apps/api/src/cards/BT6/BT6-091.ts:8-94`) represents the
start condition with `OpponentHasNone` over opponent Digimon at level <=4
and gains two memory. The attack watcher is a source-controller-own Purple
Digimon filter; its nested optional self-suspend has `abortOnDecline: true`
and contains both Draw 1 and Trash 1. The security clause is a free play.
This nesting is important: declining the optional suspend must not proceed to
Draw or trash under the optional-processing rules. The direct module is full
with no residual.

The focused test (`BT6-091.test.ts`) retains the positive higher-level
opponent boundary and attack behavior and now adds an opponent level-3
Digimon case proving that the start-of-turn condition does not gain memory
when a level 4-or-lower opponent Digimon exists. This also exercises the
Q1480 battle-area interpretation. No erratum or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-092 — Menoa Bellucci

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: White Tamer, play cost 4. At the start of its controller's
turn, if memory is 2 or less, memory becomes 3. During its turn, when its
controller plays an Eosmon, it may suspend Menoa to reveal three cards, add
one Tamer or one Digimon with Eosmon in its name, and bottom-deck the rest.
During the opponent's turn, while its controller has an Eosmon in play,
opponent Tamers do not unsuspend. Security plays Menoa for free.

The direct module (`BT6-092.ts:5-132`) maps the start trigger to
`memoryAtMost: 2` and `SetMemory: 3`. The Eosmon watcher is source-controller
scoped, and its optional suspend cost gates a RevealAdd of three cards. The
eligible filter is the union of the controller's Tamer kind and the
controller's Eosmon name; one selected card goes to hand and the rest go to
the bottom of the deck. The opponent-turn Aura dynamically targets all
opponent Tamers and restricts unsuspend while an owned Eosmon is present.
Security is a free play. The module is full with no residual.

The proven gap was the prior `count: 3, upTo: true` add specification. The
interpreter's `upTo` path permits zero through three eligible cards, while
the card says add one. The direct module now uses `count: 1`, leaving the
remaining revealed cards to the explicit deck-bottom destination. This is
direct correction 1 of 2.

The focused test (`BT6-092.test.ts`) now supplies two eligible cards among
the three revealed cards and asserts that exactly one is selected and the
second eligible card remains in the expected deck order. Existing tests
cover the memory reset, Eosmon watcher, opponent Tamer restriction, and free
security play. No erratum or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-093 — Judgement of the Blade

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Red Option, memory cost 1. Its main effect lets one of its
controller's Digimon with Huckmon in its name or Royal Knight in its type
attack an opponent's unsuspended Digimon for the turn. Security may play one
Sistermon from hand or trash without paying its cost, then returns this card
to hand.

The direct module (`BT6-093.ts:5-71`) uses
`GrantCanAttackUnsuspended` with a controller-own name-or-trait union and a
for-the-turn duration. The security branch uses the shared free-play action
from hand or trash, followed by AddToHandSelf. It is full with no residual.

The proven gap was an omitted `controller: "mine"` on the Royal Knight
alternative. Target enumeration unions the primary filter and `orFilters`,
so the missing scope could admit an opponent's Royal Knight. The alternative
now carries the same own-controller scope as the Huckmon branch. This is
direct correction 2 of 2.

The focused test (`BT6-093.test.ts`) now presents two own Huckmon Digimon,
one own Royal Knight, one own non-match, and one opponent Royal Knight, and
asserts that the chooser contains exactly the three legal own candidates.
Existing tests cover the attack grant and Sistermon security sequence. The
BT6-082 peer confirms the same name-or-trait boundary. No erratum or
restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-094 — Red Reamer

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Red Option, memory cost 4. Its main effect deletes one
opponent Digimon with 6000 DP or less; if the opponent has three or more
Digimon, the limit is instead 13000 DP. Security activates the main effect.

The direct module (`BT6-094.ts:7-72`) uses mutually exclusive branches: the
<=6000 deletion is gated by not having three opponent Digimon, and the
<=13000 deletion is gated by having at least three. Both target one opposing
Digimon and the security branch calls ActivateMain. This is the correct
conditional replacement behavior; the direct module is full with no
residual.

Focused tests cover the fewer-than-three branch, the three-or-more upgrade,
the contrasting DP outcomes, and security activation. The snapshot's unconditional
first deletion is recorded as stale semantic drift and is not executable
authority. No local KB entry, erratum, or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-095 — Happy Bullet Showering

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Red Option, memory cost 7. If its controller has a Three
Musketeers Digimon in play, it may be used without meeting its color
requirements. Its main effect deletes all opponent Digimon with the lowest
DP. Security activates the main effect.

The direct module (`BT6-095.ts:8-69`) adds an optional source-instance color
waiver while a controller-owned Three Musketeers Digimon is in the battle
area, then deletes every opposing Digimon at the dynamically lowest DP. The
security branch uses ActivateMain. The module is full with no residual.

The color waiver follows the shared source-instance color requirement gate;
it is not a permanent change to the Option's printed color. The lowest-DP
selection is a tied minimum, so every opposing Digimon at that minimum is
included, matching Q1482. The focused tests cover off-color use with a Three
Musketeers source, lowest-DP deletion, and security activation. The
interpreter's dynamic minimum selection handles
tied minima as required by Q1482. BT6-110/BT6-112 provide same-mechanism
peers. No erratum or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-096 — Forbidden Trident

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Blue Option, memory cost 1. Its main effect gives one own
Digimon +2000 DP for the turn and grants that Digimon a when-attacking
effect to return one opponent level-3 Digimon to hand, trashing all of that
Digimon's digivolution cards. Security returns this Option to hand.

The direct module (`BT6-096.ts:7-80`) binds the selected own Digimon,
applies +2000 DP through the turn, and anchors a nested when-attacking
SubTrigger to that same selected source for the turn. The nested action binds
one opposing level-3 Digimon and returns it to its owner's hand. The Return
primitive performs the explanatory stack cleanup by rule and, per Q1399, does
not emit effect-driven `whenDigivolutionTrashed`. Security uses AddToHandSelf.
The module is full with no residual.

Focused tests cover the security return, exact +2000 modification, the
for-the-turn attack grant, the level-3-only target boundary with a level-4
bystander, two-card attached-stack cleanup, and a BT6-002 watcher negative.
The worker-pass snapshot omitted the granted attack effect, so the direct
module and shared interpreter trace were authoritative. No erratum or
restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-097 — Howling Memory Boost!

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Blue Option, memory cost 3. Its main effect trashes two
digivolution cards from the bottom of one opposing Digimon's stack, then
makes one opposing Digimon with no digivolution cards unable to attack or
block until the end of the opponent's next turn, then places this card in
the battle area. Its Delay effect later trashes itself to gain 2 memory, and
it cannot be activated on the same turn it entered. Security places it in the
battle area.

The direct module (`BT6-097.ts:8-81`) uses bottom-oriented
TrashDigivolution with amount 2, then an independent Restrict target whose
stack has no digivolution cards and whose `attackOrBlock` scope maps to both
attack and block through the end of the opponent's next turn. It places the
Option and defines a separate Delay intrinsic action with the shared
same-turn guard. Security placement is also explicit. The module is full
with no residual.

The two clauses intentionally select independently: Q1484 permits the
second no-source Digimon to differ from the first target, and Q1483 says the
restriction does not disappear if a source is later added. The shared
continuous restriction evaluates its activation/dynamic gate and duration
as recorded, rather than re-running a source-removal undo. Focused tests
cover bottom-card order, the no-stack restriction, Delay timing, and security
placement; the independent-target and source-addition behavior is confirmed
by the KB rulings and interpreter trace. No erratum or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-098 — Raddle Star

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Blue Option, memory cost 5. Its main effect returns one
opponent level-5-or-lower Digimon to its owner's hand; if the opponent has
three or more Digimon, it instead returns one opponent Digimon to the bottom
of its owner's deck and trashes all of that Digimon's digivolution cards.
Security activates the main effect.

The direct module (`BT6-098.ts:11-85`) encodes exclusive branches: the hand
return applies when the opponent has fewer than three Digimon, and the deck
bottom return applies at three or more. Each branch binds its chosen Digimon,
then moves only that Digimon to the printed destination. Return performs the
attached-stack rules cleanup without emitting effect-driven
`whenDigivolutionTrashed`. Security uses ActivateMain. The module is full with
no residual.

Focused tests cover both opponent-count branches, the level-5 target boundary
(including a too-high bystander), deck-bottom ordering, security activation,
two-card attached-stack cleanup in both destinations, and BT6-002 watcher
negatives for both destinations. The worker-pass snapshot's unconditional
first branch and missing conditional branch were documented drift; the direct
module's ConditionalBranch/SelectBind sequence is authoritative. No erratum
or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-099 — Acid Injection

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Yellow Option, memory cost 1. Its main effect trashes the
top card of its controller's security stack, then gives one opponent
Digimon -5000 DP for the turn. Security returns the Option to hand.

The direct module (`BT6-099.ts:8-45`) sequences SecurityManipulation
`trashTop` amount 1 followed by a separate opponent-Digimon ModifyDP -5000
for-the-turn action. Security uses AddToHandSelf. The module is full with no
residual.

The security primitive treats an empty security stack as a no-op and permits
the following action to resolve, which is the Q1485 ruling. Focused tests
cover normal security trash plus DP reduction and security activation; the
zero-security continuation is confirmed by the shared action trace. The
snapshot matches the direct shape. No erratum or restriction applies.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-100 — Reinforcing Memory Boost!

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-091–100 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-091-100.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Yellow Option, memory cost 6. Its main effect reveals the
top two cards of its controller's deck, places one revealed card on top of
security face-down, adds the remaining revealed card to hand, then places
this Option in the battle area. Its Delay later trashes itself to gain 3
memory and cannot be activated on the same turn it entered. Security places
it in the battle area. The banlist restricts this card to one copy.

The direct module (`BT6-100.ts:8-78`) uses RevealAdd with reveal count 2,
one card to the top of security face-down, one card to hand, and remaining
cards to the bottom of the deck. It then places the source in the battle
area. A separate Delay branch trashes the source and gains 3 memory; the
shared Delay guard blocks same-turn activation. Security placement is
explicit. The module is full with no residual.

Reveal processing shows the selected security card first, then stores it
face-down, matching Q1486. Its bounded reveal supports Q1487 by revealing
only available cards when the deck has fewer than two; the remaining
destination actions then continue with the available selection. Focused
tests cover reveal publication, security face-down placement, hand receipt,
Delay timing, and security placement; the one-copy restriction is confirmed
by the committed banlist entry. Short-deck
continuation is confirmed by the shared primitive trace. The snapshot's
generic hand-only shape is stale and the direct module is authoritative. No
erratum applies; the one-copy restriction is the only banlist entry in this
range.

Score: **8/10 provisional** — catalog 2/2, rules/rulings/errata 2/2,
executable fidelity 2/2, focused/cross-card evidence 2/2, executed gates
0/2.

### BT6-101 — Wyvern's Breath

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Yellow Option, play cost 8. Main gives one opponent Digimon
−15000 DP for the turn; Security activates Main.

The direct module (`apps/api/src/cards/BT6/BT6-101.ts:8-41`) uses one
opponent-Digimon `ModifyDP` target, amount −15000, duration `forTheTurn`, and a
Security `ActivateMain`. This is an individual one-target effect, not an
all-target reduction. The focused test (`BT6-101.test.ts`) supplies a legal
Yellow source and an opponent target, proves the modified DP, and checks the
Security path through a target whose resulting DP is deleted. The target
controller, temporary duration, Option Main, and Security timing match the
rules and same-mechanism DP-modifier peers. No trait, name, or evolution-stack
exception applies; it is an Option with no evolution path.

The snapshot agrees with the direct module. Score: **8/10 provisional** —
catalog/rules 2/2, IR trace 2/2, behavioral proof 2/2, peer/stack proof 2/2,
executed gates 0/2.

### BT6-102 — Tropical Venom

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Green Option, play cost 0. Main gives one opponent Digimon
`[On Deletion] Lose 2 memory` until the end of that Digimon's next turn.

The direct module (`BT6-102.ts:8-32`) uses the shared
`GrantAuraToOpponents` literal-effect route, targets exactly one opponent
Digimon, carries the printed effect text, and uses
`untilOpponentTurnEnd`. The interpreter's granted-effect library recognizes
`[On Deletion] Lose 2 memory`, anchors it to the selected Digimon, and expires
the grant at the correct opponent-turn boundary. Q1488 confirms that the
opponent loses the memory when the granted Digimon is deleted.

The focused test (`BT6-102.test.ts`) uses a Green source, proves the selected
recipient's deletion changes memory by −2 for its controller, and proves an
unrelated bystander is not granted the watcher. The controller, one-target,
duration, deletion timing, and literal grant were compared with the
`GrantStatic`/custom-effect peer BT6-104 and the shared continuous-effect
ledger. No trait/name or evolution-stack exception applies.

The snapshot agrees with the direct module's current literal-effect shell; the
shared interpreter route is the executable implementation. Score: **8/10
provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-103 — Blasted Disaster

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Green Option, play cost 6. Main suspends all opponent
Digimon, then gains one memory for each opponent Digimon that is suspended;
Security suspends one opponent Digimon.

The direct module (`BT6-103.ts:8-59`) sequences an opponent-Digimon `Suspend`
with `count: "all"`, followed by `GainMemory` amount 1 scaling one per
opponent suspended Digimon, then supplies a Security one-target Suspend. The
scaling action is evaluated after the first action, so Digimon that were
already suspended and those newly suspended are counted, consistent with the
printed “your opponent's suspended Digimon.” Q1820's simultaneous-suspension
case was checked against the board event and overall-processing seams.

The focused suite's description was corrected from the unrelated “Ancient
Troymon” to “Blasted Disaster.” Its Main test has one unsuspended and one
already-suspended opponent Digimon and verifies both remain suspended and the
memory gain counts both; its Security test verifies exactly one target is
suspended. The action sequence, all-target semantics, scaling, Security timing,
and green Option source were compared with same-mechanism suspend/scaling
cards. This is an Option with no evolution stack.

The snapshot agrees with the direct module. Score: **8/10 provisional** — 2/2,
2/2, 2/2, 2/2, 0/2.

### BT6-104 — Parabolic Junk

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black Option, play cost 0. Main gives one of your Digimon
`[On Deletion] Gain 2 memory` until the end of your opponent's next turn;
Security adds this card to its owner's hand. The catalog's `maxCountInDeck` is
4, but the current banlist separately restricts this card to one copy.

The direct module (`BT6-104.ts:10-44`) is already the corrected executable
implementation on this branch. It uses `GrantStatic` with `grant: "effects"`,
the `OnDeletionGain2Memory` custom token, one own Digimon target, and
`untilOpponentTurnEnd`; Security uses `AddToHandSelf`. The custom-effect
library and continuous ledger retain the grant through the selected Digimon's
deletion and expire it at the framed turn boundary. The correction is
pre-existing on the base branch and is not counted as a new direct edit in
this range.

The focused test (`BT6-104.test.ts`) proves deletion of the chosen own Digimon
gains 2 memory and that Security returns the Option to hand. The own-versus-
opponent target boundary, On Deletion token, duration, and the corrected
shared `GrantStatic` path were compared with RB1-030-style duration-scoped
custom-effect peers. No evolution stack applies. Q/banlist evidence confirms
the one-copy restriction.

The snapshot drift is behavior-bearing: it still grants the wrong opponent
target and wrong literal effect text, as described above. The direct module is
authoritative and the snapshot was not edited. Score: **8/10 provisional** —
2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-105 — Gewalt SchwxE4rmer

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black Option, play cost 7. If the player has a Digimon with
the exact `[Three Musketeers]` trait in play, the Option may be used without a
black source. Main deletes all Digimon, yours and your opponent's, with play
cost 7 or less; Security adds the card to its owner's hand. The committed
catalog name is encoding-corrupted (`Gewalt SchwxE4rmer`); the direct card ID
and effect text remain the authority for implementation.

The direct module (`BT6-105.ts:7-69`) installs a conditional self-targeted
`WaiveColorRequirement` keyed to an own battle-area Digimon whose type contains
Three Musketeers. Its Main Delete uses `controller: "any"`, kind Digimon,
`playCostLte: 7`, and `count: "all"`; Security uses `AddToHandSelf`. The
condition is a trait match, not a name match, and the waiver affects using
this Option rather than Security activation.

The focused test (`BT6-105.test.ts`) was strengthened to use red
BT6-017 MagnaKidmon (a level-6 Three Musketeers Digimon with play cost 12) as
the own high-cost witness. This removes the prior accidental purple source
and proves the waiver is granted by the trait. It retains own and opponent
low-cost targets and high-cost survivors, proving “both players,” inclusive
cost 7-or-less deletion, and preservation above 7; Security still proves the
hand return. BT6-065 Gundramon supplies a same-trait peer, and the shared color
waiver and any-controller targeting seams were inspected. As an Option, this
card has no evolution stack.

The snapshot is stale: it omits `playCostLte: 7` and defaults the deletion to
opponent-only. The direct module is executable authority. Q1489 and Q1490
confirm the waiver and both-player cost boundary. Score: **8/10 provisional**
— 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-106 — Iron-Fisted Onslaught

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Black Option, play cost 8. Main deletes all opponent
Digimon with the highest play cost; Security activates Main.

The direct module (`BT6-106.ts:8-40`) uses an opponent-Digimon Delete with
`superlative: "highestPlayCost"` and `count: "all"`, plus Security
`ActivateMain`. The shared target resolver first narrows the opponent set to
the maximum play cost and retains every tied permanent. Q1491 confirms that
ties are all deleted, not selected one at a time.

The focused Main test (`BT6-106.test.ts`) was strengthened from a weak
“fewer than two remain” assertion to waiting for and requiring zero opponent
Digimon. Its two opponent fixtures share the highest play cost, so the exact
empty result proves both tied targets are removed. The Security test retains a
two-target board and verifies the Security Main path. Superlative tie behavior
was compared with BT6-067 and other highest/lowest-cost peers. No trait/name
or evolution-stack exception applies.

The snapshot agrees with the direct module. Score: **8/10 provisional** — 2/2,
2/2, 2/2, 2/2, 0/2.

### BT6-107 — Glaive Memory Boost!

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple Option, play cost 3. Main returns one purple Digimon
card from the player's trash to hand, then places this Option in the battle
area. Its separate `[Delay]` Main effect trashes the placed Option and gains 2
memory, unavailable during the turn it entered play. Security places this card
in its owner's battle area.

The direct module (`BT6-107.ts:8-70`) sequences a one-card own-trash Purple
Digimon Return to hand and `PlaceInBattleAreaSelf`; it marks the second Main
action group with the effect-level `Delay` keyword and sequences self-trash
before `GainMemory(2)`; Security uses `PlaceInBattleAreaSelf`. The Option-use
pending/trash rule and Delay activation window were traced through
`playCard.ts` and the action dispatcher.

The focused tests (`BT6-107.test.ts`) cover Security placement, the normal
purple-Digimon return plus Option placement, and later-turn Delay trash/memory
gain. A new test covers Q1492's empty-trash case: with no eligible purple
Digimon, the first Return has no candidate but the second “Then” placement
still places the Option. This proves continuation rather than incorrectly
requiring a trash target. The Purple BT6-068 source is a legal Option color
source; this card itself has no evolution stack.

The snapshot agrees with the direct module. Score: **8/10 provisional** — 2/2,
2/2, 2/2, 2/2, 0/2.

### BT6-108 — Underworld's Call

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple Option, play cost 4. When this card is trashed from
hand using one of the player's effects, it triggers Draw 1. Main may play one
purple level-4-or-lower Digimon from that player's trash without paying its
memory cost; Security activates Main.

The direct module (`BT6-108.ts:8-66`) has a static
`whenTrashedFromHand` watcher keyed to the source instance and now carries
`bySourceController: "mine"`, followed by a one-card own-trash Purple
Digimon `PlayWithoutCost` target marked optional and a Security
`ActivateMain`. The acting-seat gate is the one direct correction in this
range. `subTrigger.ts` compares it with the hand-trash event's `byEffectSeat`,
while `primitives.ts` records the event attribution; this prevents a card
owned by the watcher controller from drawing when an opponent's effect caused
the trash.

The focused suite's description was corrected from “Glaive Memory Boost!” to
“Underworld's Call.” It covers Security Main activation, own-effect hand trash
followed by Draw 1, free play of a purple level-4-or-lower Digimon from trash,
and a new opponent-caused hand-trash negative that leaves the deck card
undrawn. BT6-073, BT6-078, and BT6-081 are same-mechanism provenance peers;
their own-effect gates and the hand-trash primitive were cross-checked. The
purple source and trash-zone target boundaries are explicit; no evolution
stack applies.

The snapshot omits `bySourceController: "mine"`, so it is stale for the
printed “using one of your effects” clause. The direct registered module is
authoritative. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-109 — Fly Bullet

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: Purple Option, play cost 7. If the player has an own
Three Musketeers Digimon in play, the Option may be used without a purple
source. Main deletes one opponent Digimon at level 6 or lower; Security
activates Main.

The direct module (`BT6-109.ts:8-74`) installs the same conditional
self-targeted Three Musketeers `WaiveColorRequirement` shape as BT6-105, then
deletes one opponent Digimon using inclusive `levelComparison: lte, value: 6`,
and maps Security to `ActivateMain`. The trait boundary is explicit and does
not use the card name or a generic purple source.

The Main focused test (`BT6-109.test.ts`) was strengthened to use red
BT6-017 MagnaKidmon, a non-purple Three Musketeers Digimon, as the source for
the waiver; this proves the waiver rather than accidentally satisfying the
Option's purple color requirement. The target and Security tests prove the
level-6-or-lower inclusive boundary and Security Main activation. BT6-105 is
the same-mechanism cost-bounded waiver peer, and BT6-065 is an additional
Three Musketeers trait peer. This is an Option with no evolution stack.

The snapshot agrees with the direct module. Q1493 confirms the off-color use
case. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-110 — Cutting Edge

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-101–110 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-101-110.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: White Option, play cost 6. Main may play one level-5-or-
lower Digimon with the exact `Eosmon` name from hand without paying its memory
cost. Then it deletes one opponent Digimon whose DP is less than or equal to
the Digimon played by this effect. Security activates Main.

The direct module (`BT6-110.ts:7-66`) uses an optional own-hand
`PlayWithoutCost` target constrained to level <=5 and exact name `Eosmon`,
binds the result as `playedEosmon`, and then performs a mandatory opponent
Digimon Delete with a live DP `valueFrom: "playedEosmon"`, `valueField: "dp"`
ceiling. `play.ts` binds the actual played permanent and
`matching/permanent.ts` reads its current DP, so the target comparison includes
modifiers. Security activates Main.

The focused suite (`BT6-110.test.ts`) covers Security play plus deletion, a
Main positive with a 6000-DP Eosmon deleting a 4000-DP target while preserving
a 7000-DP target, and a new optional-decline case proving that declining the
Eosmon play leaves the opponent Digimon intact. Q1494's modified-DP rule was
checked against the live-bound matcher. BT6-085 is the direct Eosmon name and
level peer, the Eosmon/Menoa historical deck test supplies legal Eosmon stack
context, and BT16-015 is a same-mechanism `PlayWithoutCost`/bound-DP peer. The
exact-name matcher intentionally does not substitute the Eosmon trait (the
catalog Eosmon cards use an Unknown type); only the name qualifies.

The snapshot is stale: its second Delete is optional and has no dynamic DP
bound, while the direct module follows the mandatory “Then, delete” clause and
uses the played Eosmon's current DP. The direct registered module is
authoritative. Score: **8/10 provisional** — 2/2, 2/2, 2/2, 2/2, 0/2.

### BT6-111 — Alphamon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-111–112 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-111-112.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:60295-60317` identifies the three independent effect clauses: delayed Security return and conditional attack restriction, optional paid DP increase while attacking, and End of Attack memory gain. The Security restriction is up to 12 opposing Digimon, applies only to attacking players, and lasts for the turn. The type check is a trait check over Royal Knight or X Antibody, and “in play” excludes an unreferenced breeding-area card under comprehensive §3-4-7.

IR and trace: `apps/api/src/cards/BT6/BT6-111.ts:5-90` is full coverage with no residual. The Security effect is `isSecurity: true` and contains `SubTrigger(event: "whenSecurityBattleEnded", once: true)` with `AddToHandSelf` followed by an up-to-12 opponent-Digimon `Restrict` for `attackPlayers` and `forTheTurn` duration (`:8-50`). Its `youHave` condition now explicitly filters `zone: "battleArea"`, `controller: "both"`, Digimon, and `nameOrTrait` Royal Knight/X Antibody as traits (`:31-44`). The When Attacking effect is `PayMemoryUpTo` with maximum 5, optional self target, +1,000 DP per paid memory, and for-the-turn duration (`:52-71`). End of Attack gains 2 memory only when the trigger attacker is this card (`:73-84`). Registration is exclusively `registerIrCard("BT6-111", compiled)` at `:90`.

The explicit battle-area predicate is a direct behavior correction. Before this correction, `youHave`'s default count included breeding-area permanents, allowing an otherwise unreadable Royal Knight/X Antibody card to enable the Security restriction. The direct module now follows the comprehensive breeding-area information boundary without changing the shared default used by cards that truly say “in the field.”

Focused, boundary, peer, and stack proof: `BT6-111.test.ts:7-42` proves the Security card returns to hand and restricts opposing Digimon when a Royal Knight is in the battle area. `:44-93` proves the restriction is an up-to target decision using permanent IDs and allows zero selections. The added negative at `:95-120` places Royal Knight Jesmon only in breeding and proves the checked Alphamon returns without installing `attackPlayers` restriction. Q1496's multi-check proof at `:122-155` confirms future attack declarations are restricted while the current multi-check attack continues. The paid-cost and End of Attack proof at `:157-176` uses all five memory and observes +5,000 DP plus net +2 memory; the attacker-identity negative at `:178-200` prevents another Digimon's attack from paying or gaining memory. The added legal evolution stack at `:202-229` evolves a black level-5 BT6-062 into BT6-111 for the catalog cost of 3 and confirms the source permanent remains with BT6-062 underneath. Existing `BT9-111.test.ts:23-108` supplies a comparative Alphamon/Ouryumon/X Antibody stack path.

Snapshot drift: `effects.json:112780-112816` retains a raw Security condition without the direct `zone: "battleArea"` boundary, encodes the pay-up-to clause as `RawUnparsed`, and leaves the direct attack/end-of-attack conditions as raw/generic forms. The snapshot also marks coverage partial with a residual missing the PayMemoryUpTo primitive. It was not edited; the complete direct IR is executable authority.

### BT6-112 — BeelStarmon

Re-audit row (`docs/audits/BT6-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Existing focused proof reconciled with independent static evidence.
Static closeout (`docs/audits/BT6-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT6-111–112 range row.

Clause trace merged from `internal-docs/audits/BT6/BT6-111-112.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog/rules: `cards.json:60320-60342` identifies the hand-play cost reduction, followed by an On Play return of one cost-7 Option from trash and a free use of one cost-7 Option from hand. The reduction counts each qualifying `Three Musketeers` Digimon and each Option whose printed memory/play cost is 7. Q1501 rules out treating a conditional effective cost as automatically qualifying; Q1500 preserves the used Option's own color requirement.

IR and trace: `apps/api/src/cards/BT6/BT6-112.ts:5-67` is full coverage with no residual. The Static effect is a permanent hand-resident play-cost reduction of 1, scaled per trash card. Its primary filter is own-trash Digimon with `Three Musketeers` in the trait union, and its `orFilters` branch is an Option with exact `playCostOneOf: [7]` (`:8-35`). The On Play effect returns one own-trash Option with exact `playCostOneOf: [7]` to hand, then uses one hand Option with the same exact cost filter without paying (`:37-60`). Registration is exclusively `registerIrCard("BT6-112", compiled)` at `:67`.

The exact cost-7 predicate on the Return action is the second direct behavior correction. The former filter matched every Option in the controller's trash, so a non-7 Option could be returned despite the card's printed restriction. `playCostOneOf: [7]` is the supported definition-level equivalent of “memory cost of 7” for Options and keeps the generated `memoryCost` spelling from becoming a silent no-op in the direct runtime.

Focused, boundary, peer, and stack proof: `BT6-112.test.ts:14-49` proves a cost-7 BT6-095 returns to hand, is used, and reaches trash after resolution, while the added BT6-098 cost-5 Option remains in trash. `:51-75` proves one `Three Musketeers` Digimon in trash reduces BeelStarmon's play cost from 12 to 11. `:77-99` proves the reduction is self-scoped and does not reduce another Three Musketeers card. `:101-130` uses a black BT6-105 cost-7 Option through that Option's own color waiver; `:132-156` returns an ordinary blue cost-7 Option but does not use it without a blue source, proving Q1500's color requirement. The added legal stack at `:158-185` evolves a purple level-5 BT6-076 into BT6-112 for the catalog cost of 3 and confirms the hand-play On Play effect is not triggered by evolution. `beelstarmon-deck.test.ts:8-136` provides the same-mechanism toolbox proof with mixed trash reducers and multiple cost-7 Option choices.

Trait/name boundaries are deliberate: the static reduction's Digimon branch uses the exact `Three Musketeers` trait token, while the Option branch does not require that trait and instead requires exact cost 7. Non-7 BT6-098 and an ordinary blue cost-7 Option are both present in focused negatives, separating cost and color boundaries.

Snapshot drift: `effects.json:112817-112858` has a generic static filter combining Digimon and Option under one `Three Musketeers` trait, omits the direct `orFilters` cost-7 branch, and retains `memoryCost: 7` for the generated On Play action. The direct module now has executable exact-cost predicates and a complete two-stage On Play action; the generated snapshot was not edited and is not authoritative for runtime behavior.

## Mechanisms

No `*-MECHANISM.md` note was written for BT6. The engine seams this set exercises are listed in the affected-mechanism manifest under Gates.

## Knowledge base index

Source: `docs/audits/BT6-reaudit/KB-INDEX.md`.

Card-specific rulings are resolved from the committed knowledge base during each card review.

## Open items

- No card is below 10/10 and no unresolved ambiguity is recorded. `docs/audits/BT6-STATIC-AUDIT.md`
  reports blocked or ambiguous: 0, and the 2026-09-10 run records the final strict recalc at 112/112.
- Contradiction inside one file: the score table in `docs/audits/BT6-REAUDIT-LEDGER.md` (2026-09-10,
  commit `8701fc212`) leaves the gates column at 0 and every row at 8/10, while the summary line at
  the top of the same file states 1120/1120 with 112/112 verified at 10/10 and all delivery gates
  passed. `docs/audits/BT6-reaudit/RUN.md` (2026-09-10, commit `a1e49c5df`) is the newer of the two
  and confirms the recalc, so the rows are treated as stale. The table is reproduced verbatim in the
  card ledger so the discrepancy stays visible.
- Contradiction: the range reports in `internal-docs/audits/BT6/` (commit `eb1a58b75`) score cards
  8/10 provisional with deferred gates and note stale `effects.json` records. The 2026-09-05 closeout
  and the 2026-09-10 run both report 112 synchronized records with zero out-of-set changes. The newer
  reports win.
- Discarded evidence, kept for the record: one malformed repository-root Vitest invocation and one
  effects-sync attempt made in a worktree without the shared dependency link produced no BT6
  evidence and were replaced by green reruns.
- BT6-093 was reported as a catalog mismatch by a worker lane and rejected on direct inspection.
  BT6-113 through BT6-115 do not exist; the collection is 112 cards.

## History

Raw evidence for these files stays in git history at the commits named below. This document was
assembled at repository commit `eabe99351`.

- `docs/audits/BT6-REAUDIT-LEDGER.md` — `8701fc212`, 2026-09-10. Independent evidence ledger; summary
  at 10/10, rows left at the 8/10 worker cap. Merged into Card ledger.
- `docs/audits/BT6-reaudit/` (4 files: `RUN.md`, `KB-INDEX.md`, `REVIEW-NOTES.md`,
  `WORKER-BRIEF.md`) — `a1e49c5df`, 2026-09-10. Run log with the full gate sequence and the final
  strict recalc, knowledge base index, empty review queue, and the read-only worker brief. Run log
  merged into Gates; index merged into Knowledge base index.
- `docs/audits/BT6-STATIC-AUDIT.md` — `eb1a58b75`, 2026-09-05. Campaign closeout with the
  reproducible delivery evidence list and the 112-row score table. Merged into Gates and Card ledger.
- `internal-docs/audits/BT6/` (12 range reports, `BT6-001-010.md` through `BT6-111-112.md`) —
  `eb1a58b75`, 2026-09-05. Worker-stage clause traces, 8/10 provisional. Merged into Card ledger.
- `docs/audits/BT6-audit.md` — `52da0b5bb`, 2026-08-28. Short 2026-08-26 pass recording the serial
  collection gate and the BT6-075 and BT6-086 corrections. Its corrections are covered by the later
  closeouts. Dropped.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT6: PR #4578; commit `9707f50a6`.
