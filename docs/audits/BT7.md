---
set: BT7
cards: 112
status: verified
verified_at: 2026-09-10
catalog_commit: efbecc002fb9000789123e2f91f201466e1e5b0a
evidence_commit: eabe99351
---

# BT7 audit

## Status

All 112 BT7 cards are verified at 10/10. The winning source is the 2026-09-10 re-audit run
(`docs/audits/BT7-reaudit/RUN.md`, commit `ecee49cca`), whose final strict recalc records 112/112 at
10/10 and aggregate 1120/1120 after the exact 124-file BT7 collection, effects check, affected
mechanisms, isolated primitives, full workspace typecheck, lint, format, and diff gates passed. The
score table inside `docs/audits/BT7-REAUDIT-LEDGER.md` was never updated from the worker cap and
still shows gates 0 and 8/10 on every row, contradicting its own summary line in the same file; that
stale column is recorded under Open items and does not change the result. The 2026-09-05 closeout
(`docs/audits/BT7-STATIC-AUDIT.md`) independently reached 112/112 at 10/10 and resolved the BT7-063,
BT7-098, and BT7-109 questions. `docs/audits/BT7-AUDIT.md` (2026-09-02) was an earlier
newest-to-oldest static pass that stopped at 9/10 for 28 cards and marked itself superseded; its
traces are merged into the card ledger for the detail, not for the score.

## Gates

### Final re-audit run, 2026-09-10

Source: `docs/audits/BT7-reaudit/RUN.md` (commit ecee49cca).

- Dedicated branch/worktree: `audit-bt7-luna-20260910` at `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-bt7-luna-20260910`.
- Cumulative base: pushed BT6 completion `8701fc2124954ef261f483d3e6b4d42933ccda0e`.
- Inventory: 112 catalog cards, 112 modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Main remains untouched. Heavy commands require separate process/memory gates and serial Vitest.
- Two read-only Luna lanes reviewed all 112 cards with no concrete catalog, IR, behavior, or peer-isolation defect.
- Exact BT7 collection manifest validated 124 paths whose immediate parent basename is exactly `BT7`; 124/124 files and 421/421 tests passed with `--maxWorkers=1 --no-file-parallelism`.
- Worker-cap ledger: 112/112 at 8/10, aggregate 896/1120.
- Effects sync passed against BT6 base: 112 records already synchronized, zero BT7 semantic changes, and zero semantic or byte changes outside BT7.
- Light static preflight: 112 exclusive `registerIrCard` modules, zero `registerCard`, zero `@ts-nocheck`, zero `RawUnparsed`, and clean `git diff --check`.
- Prepared affected-mechanism manifest: decisions, visible identities, Option use cost, Security activation, continuous effects, hand-trash provenance, interpreter, registration, exact-name matching, and reveal budgets. The primitives suite will run separately to avoid global registration collision.
- Heavy closeout remains held until a fresh standalone process poll and `memory_pressure` are clear at 50% or higher.
- `effects:check:set` passed: 112 synchronized records, zero BT7 changes, zero out-of-set changes.
- Affected mechanisms passed 10/10 files and 294/294 tests; isolated primitives passed 1/1 file and 145/145 tests.
- Full workspace typecheck passed. Scoped Oxlint completed with zero errors (existing warnings only), Oxfmt, diff, registration, suppression, and raw-action gates passed.
- Final strict recalc: 112/112 cards at 10/10, aggregate 1120/1120.

### Earlier campaign closeout, 2026-09-05

Source: `docs/audits/BT7-STATIC-AUDIT.md` (commit eb1a58b75).


- Static registration/catalog gate: 112 modules, 112 focused test files,
  exactly 112 `registerIrCard` calls, zero `registerCard`, zero TypeScript
  suppressions, and zero `RawUnparsed` actions.
- BT7 collection: 124 test files and 421 tests passed with one fork,
  `maxWorkers=1`, no file parallelism, and a 300-second timeout.
- Shared mechanisms: 8 files / 456 tests and the isolated primitives file /
  138 tests passed under the same serial constraints. The primitives file is
  separate to avoid a known duplicate global-registration collision when
  otherwise-independent suites share one process.
- Client projection: `boardModel.test.ts` passed 80 tests, including the
  canonical Tamer color and fixed-cost path.
- Tooling: 16 Node tests passed serially, including atomic replacement,
  duplicate rejection, idempotence, and out-of-set byte stability.
- TypeScript: shared and web typechecks passed. API typecheck reports only the
  unchanged `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`
  baseline diagnostics already present on `origin/main`; every changed API
  file is type-clean.
- Quality: scoped Oxlint completed with zero errors; scoped Oxfmt check passed
  on one thread; `git diff --check` passes.
- Snapshot: `effects:check:set` reports 112 records synchronized, 85 semantic
  BT7 changes, and zero semantic or byte changes outside BT7.

BT7-063 is resolved by the maximum-resolution rule and Q1623: after accepting
the optional effect, both distinct exact names are played when both are
available, the sole available name is played otherwise, and declining plays
neither. BT7-109 uses one mutually exclusive modal choice so its normal
purple-level-5 path remains available at ten trash while the Lucemon path is
also offered. No completion blocker remains.

## Card ledger

### BT7-001 — Kapurimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-2 Digi-Egg, In-Training/Lesser, DP 0; inherited: `[Your Turn] While you have a Tamer in play, this Digimon gets +1000 DP.`

**Direct implementation.** `apps/api/src/cards/BT7/BT7-001.ts:8-44` is a full inherited Aura. It targets only the host (`isSelfRef`, `isSelf`), checks the battle area for one of the controller’s Tamers (`controllerDefault: "mine"`, `kind: ["Tamer"]`), and applies +1000 DP during Your Turn. This exactly reflects Q1502: no Tamer color restriction was invented.

**Static behavior proof.** `BT7-001.test.ts` covers an own Tamer of the accepted color, an own Tamer of another color, opponent-only Tamer exclusion, and the opponent-turn boundary. The host is a legal red level-3 Digimon over the red BT7-001 egg.

**Snapshot and score.** Snapshot `effects.json:112860-112880` matches the direct module. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-002 — Bukamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Blue level-2 Digi-Egg, In-Training/Lesser; inherited: `[Your Turn][Once Per Turn] When you play a Digimon from one of your Digimon's digivolution cards, gain 1 memory.`

**Direct implementation.** `apps/api/src/cards/BT7/BT7-002.ts:9-38` is an inherited Your Turn SubTrigger for `whenPlayed`, restricted to the controller’s Digimon and `fromDigivolution: true`, with Gain Memory 1 and Once Per Turn. The source restriction prevents ordinary hand plays and preserves the Q1502-style controller boundary.

**Static behavior proof.** `BT7-002.test.ts` now uses legal stacks: blue BT4-026 over BT7-002/BT6-019 for a source play; blue BT6-028 over BT7-002/BT6-019/BT4-026/BT6-025 for the two-source once-per-turn case; and a legal blue stack for the opponent-turn exclusion. The hand-play case remains separate. These tests cover one trigger per event batch, no hand trigger, and no opponent-turn trigger.

**Snapshot drift.** `effects.json:112882-112900` omits `fromDigivolution: true`, so the generated snapshot is broader than direct authority. No snapshot edit was made.

**Score.** Catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-003 — Pusurimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Yellow level-2 Digi-Egg, In-Training/Lesser; inherited: `[Your Turn] When this card is trashed due to activating this Digimon's ＜Digi-Burst＞, 1 of your opponent's Digimon gets -1000 DP for the turn.`

**Direct implementation.** `apps/api/src/cards/BT7/BT7-003.ts:9-43` uses `YourTurn` plus `SubTrigger(event: "onDigiBurstCardDiscarded", sourceFilter: { isSelfRef: true })`. It modifies one opponent Digimon by -1000 for the turn, and marks the effect inherited. The self-reference prevents an unrelated Digi-Burst discard from firing this egg.

**Static behavior proof.** `BT7-003.test.ts` was changed to a legal yellow BT7-034 host over BT7-003/BT6-031, with the Pusurimon instance preferred for the two-card Digi-Burst discard. The test selects the BT7-034 Digi-Burst effect and checks an opposing Digimon’s DP reduction. This statically covers Q1503’s ordering seam through the real Digi-Burst primitive.

**Snapshot drift.** `effects.json:112901-112918` contains a generic Your Turn ModifyDP with no Digi-Burst discard SubTrigger, so it cannot prove the printed condition. No snapshot edit was made.

**Score.** Catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-004 — Koromon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Green level-2 Digi-Egg, In-Training/Lesser; inherited: `[When Attacking] Reveal the top card of your deck, and place it at the top or bottom of your deck.`

**Correction.** `apps/api/src/cards/BT7/BT7-004.ts:5-17` had `attackScope: "ally"`, which makes an inherited host watcher fire when any allied Digimon attacks. The shared builder contract reserves that scope for observer text such as “when one of your Digimon attacks”; this card says simply “when attacking” and must watch the host. The correction removes `attackScope`, leaving the default self/host scope while retaining `RevealAdd(revealCount: 1, rest: "deckTopOrBottom")`.

**Static behavior proof.** `BT7-004.test.ts` now uses a legal green BT1-066 over the green egg and covers top-or-bottom placement. A new negative case attacks an unrelated allied BT1-066 and asserts the deck’s top card remains in place. This is the direct proof for the corrected scope.

**Snapshot drift.** `effects.json:112919-112935` still has a legacy generic `Search` reveal action and cannot represent top-or-bottom placement; it also predates the direct host-scope correction. No snapshot edit was made.

**Score.** Catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-005 — Dorimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Black level-2 Digi-Egg, In-Training/Lesser/X Antibody; inherited: `[Your Turn][Once Per Turn] When one of your effects places a digivolution card under this Digimon, ＜Draw 1＞.`

**Correction.** `apps/api/src/cards/BT7/BT7-005.ts:9-38` now adds `byEffect: true` to the self-receiving `onAddDigivolutionCards` source filter. The printed phrase “one of your effects” is a provenance condition, not merely a placement event; the interpreter exposes that condition specifically for this event. The existing self reference, Your Turn, inherited flag, Draw 1, and Once Per Turn remain intact.

**Static behavior proof.** `BT7-005.test.ts` now uses legal black stacks (BT7-058 over BT7-005/BT7-056) and opens the same effect-resolution provenance window used by the placement primitive. The positive test covers one placement; Q1505 covers one effect placing two cards and still only one draw. Q1504 now uses legal BT7-056 over the egg and a black BT7-058 in hand for effect digivolution, asserting no draw because digivolution is not placement under §8-1-2-7. The tests are static evidence only and were not run.

**Snapshot drift.** `effects.json:112936-112952` lacks both `isSelfRef` and the corrected `byEffect` provenance condition. No snapshot edit was made.

**Score.** Catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-006 — Kokomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Purple level-2 Digi-Egg, In-Training/Lesser; inherited: `[When Attacking] You may reveal the top 3 cards of your deck. Trash 1 Tamer card among them. Place the remaining cards at the bottom of your deck in any order.`

**Direct implementation.** `apps/api/src/cards/BT7/BT7-006.ts:8-37` uses an inherited When Attacking optional `RevealAdd` of three, selects one of the controller’s Tamer cards to trash, and places all remaining cards at deck bottom. The add count is mandatory once the optional reveal is accepted, matching Q1506.

**Static behavior proof.** `BT7-006.test.ts` now uses a legal purple BT6-069 over BT7-006. Existing positive and optional-decline cases cover Tamer trash, bottom remainder count, and no movement when the player declines the reveal.

**Snapshot and score.** Snapshot `effects.json:112954-112972` matches the direct shape. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-007 — ToyAgumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-3 Digimon, Rookie/Vaccine/Puppet, play cost 2, DP 3000, with a red level-2 evolution route costing 0 and no effect text.

**Direct implementation.** `apps/api/src/cards/BT7/BT7-007.ts:5-11` correctly registers an empty full-coverage IR (`effects: []`, `residual: []`). No effect was invented for this effectless card.

**Static behavior proof.** `BT7-007.test.ts` checks the committed metadata and normal play cost/DP behavior with no pending effect decision. The catalog’s red level-2 to level-3 route was checked; no extra evolution trigger is applicable to an effectless card.

**Snapshot and score.** Snapshot `effects.json:112973` matches the empty direct IR. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-008 — Flamemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-3 Digimon, Hybrid/Variable/Wizard, play cost 3, DP 1000, red level-2 evolution cost 0. On Play: reveal four and add one card with `[Hybrid]` in its traits, `[Susanoomon]`, or `[Takuya Kanbara]`; bottom the rest. Inherited On Deletion: optionally play one `[Takuya Kanbara]` from hand without paying its memory cost.

**Correction.** `apps/api/src/cards/BT7/BT7-008.ts:18-55` now uses `match: "nameExact"` for the bracket-only `[Susanoomon]` and `[Takuya Kanbara]` clauses in both On Play and inherited On Deletion. The `[Hybrid]` clause remains a trait match. This follows §2-3-1-2; a substring `name` match would incorrectly broaden the bracket-only clauses. Effective static name aliases remain available where the card has a real Rule Name alias.

**Static behavior proof.** `BT7-008.test.ts` now gives the inherited host a legal red stack: BT7-010 over BT7-001/BT7-008. Existing tests cover effect deletion playing exact BT7-085 from hand and the Hybrid branch. A new test covers exact BT7-112 Susanoomon selection from the top four. The direct matcher inspection also confirms that `name` is intentionally retained for BT7-009’s “in their names” clause.

**Snapshot drift.** `effects.json:112974-113019` still serializes all three name references as `match: "name"`, in both the On Play and inherited On Deletion branches. No snapshot edit was made.

**Score.** Catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-009 — Huckmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-3 Digimon, Rookie/Data/Mini Dragon, play cost 4, DP 3000, red level-2 evolution cost 0. Inherited: `[When Attacking][Once Per Turn] Reveal the top 5 cards of your deck. Add all cards with [Sistermon] in their names; place the rest at the bottom in any order.`

**Direct implementation.** `apps/api/src/cards/BT7/BT7-009.ts:8-42` correctly uses a When Attacking inherited RevealAdd of five, substring `match: "name"` for “with [Sistermon] in their names,” `count: "all"`, deck bottom remainder, and Once Per Turn. No exact-name narrowing was applied because the catalog explicitly says “in their names.”

**Static behavior proof.** `BT7-009.test.ts` now uses a legal red BT7-010 host over BT7-001/BT7-009. Existing tests cover adding all revealed Sistermon cards, bottoming nonmatches, and refusing a second activation after unsuspending in the same turn.

**Snapshot and score.** Snapshot `effects.json:113020-113047` matches the direct implementation. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-010 — Tuskmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-001–010 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-001-010.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog clause.** Red level-4 Digimon, Champion/Virus/Dinosaur, play cost 4, DP 5000, red level-3 evolution cost 2. On Digivolving: one of your Digimon gets +2000 DP for the turn.

**Direct implementation.** `apps/api/src/cards/BT7/BT7-010.ts:8-32` uses When Digivolving, targets one controller-owned Digimon, applies +2000 with `forTheTurn`, and leaves the effect non-inherited as printed.

**Static behavior proof.** `BT7-010.test.ts` now uses a legal red level-3 BT1-009 over BT7-001 and includes an opponent Digimon. Preferred-target selection proves the own-controller boundary; the opponent remains unmodified in the assertion. Duration is represented by the shared turn-scoped modifier primitive.

**Snapshot and score.** Snapshot `effects.json:113048-113064` matches the direct implementation. Score: catalog 2/2, direct IR 2/2, behavior 2/2, peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-011 — BurningGreymon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red level 4 Digimon, play cost 6, 6000 DP, red level 3 cost 3 or red level 4
cost 1 evolution. The first clause may digivolve this card from hand onto one red Tamer as if it
were a level 3 red Digimon for cost 2. The When Digivolving clause deletes one opposing Digimon
at 4000 DP or less when a Hybrid-trait card or Takuya Kanbara is in the resulting stack.

The single local KB query was node tools/kb/query.mjs card BT7-011; it returned Q1507, Q1508,
Q1509, Q1510, Q1511, Q1512, and Q4639. These rulings establish that a Tamer used by the special
digivolution is treated as a Digimon for digivolution triggers, receives the normal digivolution
bonus draw, cannot attack if that Tamer was played this turn, becomes a digivolution card, does
not contribute its Security text, does contribute its inherited text, and cannot be declined after
a legal declaration. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-011.ts:

- The static metadata action targets a red Tamer from hand with asIf level 3/red and costSuffix 2.
- The When Digivolving action targets one opposing Digimon with dp <= 4000.
- selfDigivolutionStackHasTrait matches Hybrid or the exact Takuya Kanbara name.
- The module is full-coverage, residual-free IR and exclusively calls registerIrCard.

Shared trace and boundaries: registerTamerOntoFromEffects records the Tamer-onto level; the
digivolution legality path in matchingAlternateDigivolutionRequirement enforces an actual Tamer,
shared red color, the level-3 red evolution cost, and the alternate cost 2. The static metadata is
intentionally inert as an effect action; it supplies legality rather than performing a second
digivolution. Stack matching reads the live stack and definition traits/names, so a near-matching
card does not satisfy the condition. Peers checked included the BT7 Hybrid line and the shared
frontier color-gate coverage.

Focused proof in BT7-011.test.ts builds a legal BT7-008-to-BurningGreymon stack and confirms an
opposing 4000-DP target is deleted. The legal Tamer stack path, source-card transition, and
negative/non-Hybrid boundaries are represented by the module and neighboring Hybrid tests; these
tests were not executed.

Snapshot: no drift. The read-only BT7-011 snapshot has the same Tamer metadata, 4000-DP delete,
Hybrid/Takuya condition, alternate requirement, full coverage, and empty residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-012 — Brachiomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red level 5 Digimon, play cost 7, 10000 DP, with the red level 4 cost 3
evolution requirement and no effect, inherited, or Security text. The single local KB query was
node tools/kb/query.mjs card BT7-012; it returned no entries. No erratum or restriction applies.

apps/api/src/cards/BT7/BT7-012.ts is the intentionally empty full-coverage IR module and has one
exclusive registerIrCard call. The focused test checks the official metadata and normal play with
no pending effect decision. The normal red level-4-to-level-5 evolution boundary is the standard
§8-1 path; the effectless card has no additional stack behavior. Effectless BT7 bodies and
BT7-020 were used as peers. The test was not executed.

Snapshot: no drift. The read-only BT7-012 snapshot is empty with full coverage and no residual,
matching the direct module.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2 (empty behavior);
static behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-013 — MetalGreymon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red level 5 Digimon, play cost 7, 7000 DP, red level 4 cost 3 evolution. On Play,
if the owner has a Tamer, gain 2 memory; otherwise the owner may play one red Tamer from hand
without paying its cost. Its inherited Your Turn/Once Per Turn clause gains 1 memory when one
opponent Digimon is deleted.

The single local KB query was node tools/kb/query.mjs card BT7-013; it returned Q1514 and Q1515.
Q1514 confirms that the no-Tamer branch does not also gain the 2 memory after playing the Tamer;
Q1515 confirms that one deletion effect deleting multiple opposing Digimon yields only one
inherited gain. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-013.ts:

- youHave checks a Tamer in the owner's battle area and gates GainMemory(2).
- youHaveNone checks the absence of an owner's Tamer, then exposes an optional hand-only,
  red-Tamer PlayWithoutCost.
- The inherited SubTrigger watches opponent Digimon deletion, gains 1 memory, and is marked
  frequency OncePerTurn.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

The shared condition evaluator and SubTrigger dispatch preserve the branch ordering and the
once-per-turn identity; no post-play re-evaluation can grant both branches. The inherited effect
is read from a Digimon stack under ordinary §4-3-2/4-3-3 semantics. Peers checked included the
BT7 Cyborg/Hybrid inherited-trigger patterns. BT7-013.test.ts covers an existing Tamer, the
no-Tamer optional play branch, and a deletion effect involving multiple targets; tests were not
executed.

Snapshot: no drift. The snapshot matches both On Play branches, the opponent Digimon deletion
watcher, Once Per Turn frequency, full coverage, and empty residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-014 — Aldamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red level 5 Digimon, play cost 8, 8000 DP, red level 4 cost 3 evolution. When a
Digimon with a Tamer card in its stack digivolves into this card in hand, reduce that digivolution
cost by 2. When Digivolving, a Hybrid stack card grants +4000 DP for the turn. Its inherited Your
Turn effect suppresses Security effects on checked Option cards while the host has Hybrid or Ten
Warriors in its traits.

The single local KB query was node tools/kb/query.mjs card BT7-014; it returned Q1516. Q1516
confirms that a checked Digimon or Tamer's Security effect still activates; only Option Security
effects are suppressed. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-014.ts:

- The hand-resident CostModifier reduces only digivolve by 2, targets this destination (into
  Aldamon), and requires an owner's Digimon with a Tamer in its stack.
- The When Digivolving ModifyDP grants exactly 4000 for forTheTurn when the live stack has Hybrid.
- The inherited GrantStatic uses noSecurityOptionEffects with a structured Hybrid/Ten Warriors
  condition.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

The isHandResidentDigivolveCostStatic route installs this reducer while the destination remains
in hand; runResourceAction then matches both the live base/source filter and the Aldamon
destination before changing the evolution cost. GrantStatic delegates to the shared
disableSecurityEffect(..., "option", ...) primitive, preserving the Option-only boundary. Peers
BT7-038 and BT7-075 were checked for hand-resident evolution reducers, and the BT7 Hybrid security
tests cover matching and nonmatching hosts. BT7-014.test.ts covers the Tamer discount, the
printed-cost fallback without a Tamer source, +4000 Hybrid DP, and Option versus Digimon Security;
tests were not executed.

Snapshot drift is intentional and documented: the generated snapshot has a broad Static
whenOneOfYoursDigivolves/Replacement with no destination or Tamer-stack restriction and a raw
Security condition. The direct module is the executable authority and is narrower/correct; the
snapshot was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections in this range 0 (the direct
module already contained the hand fix); ambiguities 0.

### BT7-015 — AvengeKidmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red level 6 Digimon, play cost 12, 11000 DP, red level 5 cost 3 evolution. When
played from hand, reduce this card's play cost by 1 for every Option in both players' trashes. On
Play, return every Three Musketeers-trait card and every Option card from both trashes to the
bottom of its owner's deck; if at least 7 cards were returned by this effect, delete one opposing
Digimon that is Three Musketeers or 8000 DP or less.

The single local KB query was node tools/kb/query.mjs card BT7-015; it returned Q1517 and Q1518.
Q1517 confirms that the cost count spans both trashes. Q1518 confirms that the activating player
chooses the order for cards returned to the owners' deck bottoms. No erratum or restriction
applies.

Correction made: the direct module's cost reducer was incorrectly a field-resident Static
CostModifier with invalid costType memory; that action could not affect this card while it was
still in hand for its imminent play. apps/api/src/cards/BT7/BT7-015.ts now declares the reducer
in BeforePayCost, uses costType play, and sets handResident true while retaining the self target
and both-trash Option scaling. This uses the smallest existing executable seam: fireBeforePayCost
runs while the source is in hand and runResourceAction binds the resulting delta to the pending
play payment.

The remaining direct clauses map as follows:

- The Return target is a single union of Three Musketeers trait and Option kind, with count all,
  to deckBottom, and trackCount returnedByEffect. The union/dedup behavior prevents one dual-kind
  card from being returned twice while preserving owner deck destinations and the activating
  player's ordering choice.
- The Delete target is one opposing Digimon, with the OR boundary of Three Musketeers or DP at
  most 8000, gated by namedCountAtLeast(returnedByEffect, 7).
- The module remains full-coverage, residual-free, and exclusively registered with registerIrCard.

The read-only generated snapshot still shows the old Static/memory reducer, while its Return
union and tracked-count Delete match the direct module. This snapshot drift is recorded and was
not fixed in effects.json. The direct module is executable authority.

BT7-015.test.ts already covers both-trash cost reduction and seven returned cards causing an
eligible 8000-DP deletion; a new static assertion guards the BeforePayCost/play/handResident
shape. BT6-112 and other Three Musketeers cost/return implementations were checked for peer
vocabulary and target boundaries. The tests were not executed.

Score after correction: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2;
static behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 1 (direct module);
ambiguities 0.

### BT7-016 — EmperorGreymon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact focused batch and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red level 6 Digimon, play cost 12, 12000 DP, red level 5 cost 4 evolution.
When Digivolving grants Blitz. During the owner's turn, once per turn, when this Digimon is
blocked, unsuspend it and gain 1 memory per Hybrid-trait digivolution card in its stack.

The single local KB query was node tools/kb/query.mjs card BT7-016; it returned Q1519. Q1519
places the trigger immediately after this Digimon is blocked and its attack target changes, before
the battle with the blocker. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-016.ts:

- A When Digivolving keyword marker grants Blitz.
- A Your Turn/Once Per Turn SubTrigger listens to whenBlocked with sourceFilter isSelfRef true,
  so another attacker being blocked cannot fire it.
- The action sequence unsuspends this source and gains one memory per matching Hybrid card in its
  own digivolution stack.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

The combat/block timing and SubTrigger path preserve Q1519's pre-battle ordering; the self source
filter is the critical identity boundary. Existing BT7-016.test.ts covers an EmperorGreymon stack
with two Hybrid sources, Blitz, and the negative case where a different Digimon is blocked. The
BT7 Hybrid peers and blocker implementation were checked. Tests were not executed.

Snapshot drift: the generated BT7-016 watcher omits the direct module's self source filter, so it
would be too broad if treated as authority. The direct module is correct, full, and residual-free;
the snapshot was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0 in this pass; ambiguities 0.

### BT7-017 — Chaosdramon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: red/black level 6 Digimon, play cost 12, 12000 DP, ordinary red or black level 5
cost 4 evolution. A Machinedramon may digivolve into this card in hand for memory cost 1 while
ignoring its printed evolution requirements. When Digivolving, the player may place one red or
black level 5 Cyborg card from hand or trash on top of this Digimon's stack to delete one opposing
Digimon at 6000 DP or less for each level 5 Cyborg card in the resulting stack.

The single local KB query was node tools/kb/query.mjs card BT7-017; it returned Q1520 and Q1521.
Q1520 confirms the optional Cyborg placement is legal even with no opposing 6000-DP-or-less target;
Q1521 confirms the Machinedramon alternate evolution path. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-017.ts:

- The optional PlaceUnder accepts only hand/trash, red or black, level 5, Cyborg-trait cards;
  targets this stack, and places at the top.
- The following Delete targets one opposing Digimon at DP <= 6000, scales by all level 5 Cyborg
  cards in this stack, and is gated by ifThisEffectActed, so declining or failing placement does
  not delete.
- The alternate digivolutionRequirement names Machinedramon and sets cost 1.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

runPlaceUnder records actual movement in lastEffectActed, while the generic action sequence
continues to the no-target Delete without making placement contingent on a deletion target. The
alternate requirement is consumed by the ordinary digivolution legality path. The focused test
already proves placement plus scaled deletion; a new focused test proves placement with no
opposing target, directly covering Q1520. The live legal stack reaches Chaosdramon from an ordinary
level-5 base, and the Machinedramon alternate requirement is present in IR/data; test execution
was not performed.

Snapshot drift: the generated record encodes placement as a Delete cost, includes an inapplicable
digivolutionCards source zone and a kind Digimon scaling restriction, and does not expose the
direct optional PlaceUnder/ifThisEffectActed sequence. The direct module is executable authority;
the snapshot was not edited. Peers checked included BT7 Cyborg/Hybrid cards and shared PlaceUnder,
scaling, optional, and alternate-evolution implementations.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-018 — Gomamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: blue level 3 Digimon, play cost 3, 3000 DP, blue level 2 cost 0 evolution. Its
On Play effect draws two only when this card was played from digivolution cards.

The single local KB query was node tools/kb/query.mjs card BT7-018; it returned Q1522. Q1522
confirms that De-Digivolve exposing Gomamon as the new top card is not playing it and must not draw.
No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-018.ts is one On Play Draw 2 action for the owner,
gated by playedFromZone digivolutionCards; the module is full-coverage, residual-free, and
exclusively registered with registerIrCard. The shared play trigger records the source zone, so
ordinary hand play and De-Digivolve do not satisfy the condition. The focused test builds a card
under a host, plays it from the stack through the applicable effect, and observes two cards drawn;
BT7-027 and stack-play peers were checked. The test was not executed.

Snapshot drift: the generated On Play Draw 2 action is unconditional and omits the required source
zone condition. The direct module is executable authority and was not weakened to match the stale
snapshot; effects.json was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0 in this pass; ambiguities 0.

### BT7-019 — Strabimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: blue level 3 Digimon, play cost 3, 1000 DP, blue level 2 cost 0 evolution. On
Play, reveal the top four cards, add one Hybrid-trait, Susanoomon, or Koji Minamoto card among
them, and put the rest at the bottom of the deck in any order. Its inherited On Deletion effect
optionally plays one Koji Minamoto from hand without paying its cost.

The single local KB query was node tools/kb/query.mjs card BT7-019; it returned no entries. No
erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-019.ts uses one RevealAdd with revealCount 4, one
add target whose name/trait union is exactly Hybrid, Susanoomon, or Koji Minamoto, and rest
deckBottom; the inherited action is optional, hand-only Koji Minamoto PlayWithoutCost. Full
coverage, empty residual, and exclusive registerIrCard registration are present. BT7-019.test.ts
covers both the inherited stack deletion path and the reveal/add/rest path with nonmatching cards,
while BT7-021/022/023 were checked as same-mechanism Hybrid peers. Tests were not executed.

Snapshot: no drift. The read-only snapshot matches reveal count, exact name/trait boundaries,
bottom-rest handling, inherited optional Koji play, full coverage, and empty residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-020 — Shellmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-011–020 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-011-020.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: blue level 4 Digimon, play cost 4, 6000 DP, blue level 3 cost 2 evolution, with
no effect, inherited, or Security text. The single local KB query was node tools/kb/query.mjs
card BT7-020; it returned no entries. No erratum or restriction applies.

apps/api/src/cards/BT7/BT7-020.ts is an empty full-coverage IR module with one exclusive
registerIrCard call. The focused test checks official metadata and normal play without an effect
decision. Standard level-3-to-level-4 blue evolution and effectless BT7-012 were used as peers;
the test was not executed.

Snapshot: no drift. The read-only BT7-020 snapshot is empty with full coverage and no residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2 (empty behavior);
static behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-021 — Kumamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-4 Hybrid/Variable/
Beastkin Digimon, play cost 5, 4,000 DP, with a level-3 blue evolution cost 2.
Its main clause may evolve it from hand onto one of the player's blue Tamers
as though that Tamer were a level-3 Digimon; its When Digivolving clause
trashes the bottom source of one opponent Digimon. The single card query
returned Q1523–Q1528 (Tamer-as-Digimon evolution, the draw/evolution handling,
same-turn attack restriction, source leave behavior, and inherited-effect
handling) and Q4640 (a declared legal evolution cannot be declined after
reveal).

**Implementation and proof.** `BT7-021.ts` uses an optional Static Digivolve
action targeting exactly one own blue Tamer from hand, with `asLevel: 3`, and a
When Digivolving bottom-source trash action against one opponent Digimon with
a source. The normalized requirement is the blue Tamer alternate path with
cost 2; the shared Tamer registration and digivolution path supply the legal
level/color and normal stack transition. `BT7-021.test.ts` covers the blue
versus red Tamer boundary, the paid evolution, and bottom-source removal.
The relevant BT7-022/023 Tamer-evolution peers use the same boundary. The
snapshot matches the direct clause shape. No Security or inherited clause is
printed on this card, and no correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-022 — KendoGarurumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-4 Hybrid/Cyborg
Digimon, play cost 6, 6,000 DP, with level-3 blue cost 3 and level-4 blue cost
1 evolution paths. It may evolve from hand onto a blue Tamer as a level-3
blue Digimon for cost 2; its When Digivolving clause gives Jamming for the
turn if a Hybrid trait or Koji name is in its stack. The single query returned
Q1530–Q1535 for the Tamer evolution and source/inherited-effect details, and
Q4641 for the no-decline-after-declaration rule.

**Implementation and proof.** `BT7-022.ts` has the optional blue-Tamer Static
Digivolve path, the cost-2 alternate requirement, and a for-the-turn Jamming
action conditioned on Hybrid trait or Koji name in this stack. The runtime
data normalization contains the explicit blue Tamer override needed by this
historical serialized form; `registerIrCard` is the only registration. The
focused test proves the Hybrid positive path after a legal Tamer evolution;
the direct condition matcher was also checked against name and trait forms so
Koji is not treated as a trait and near-matching names do not qualify. The
snapshot has the same effective clauses, represented in the older static
effect encoding. The legal stack is the blue Tamer-to-level-4 route, and no
correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-023 — Korikakumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-4 Hybrid/Beast Digimon,
play cost 6, 6,000 DP, with level-3 blue cost 3 and level-4 blue cost 1
evolution paths. It may evolve from hand onto a blue Tamer as a level-3 blue
Digimon for cost 2; its When Digivolving clause chooses one opponent Digimon
with no sources, which cannot attack or block until the end of that opponent's
next turn, if a Hybrid trait or Tommy name is in its stack. The single query
returned Q1537–Q1542 for the Tamer/source mechanics, Q1544 for the ruling that
a selected source-less Digimon remains unable to attack or block after gaining
a source, and Q4642 for the evolution-declaration rule.

**Proven corrections.** The original direct module omitted executable Static
Tamer-evolution metadata and split the printed one-target attack-or-block
restriction into separate attack and block actions. That could permit two
independent target choices and did not expose the direct module's legal Tamer
evolution path. `BT7-023.ts` now publishes one optional Static Digivolve action
onto exactly one own blue Tamer as level 3 from hand, and one When Digivolving
Restrict action with `restriction: "attackOrBlock"`, one source-less opponent
Digimon target, and `untilOpponentTurnEnd` duration. The Hybrid/Tommy condition
is preserved, including its raw clause. `BT7-023.test.ts` now statically proves
the evolution metadata and the single shared target/restriction, while its
existing behavior test proves the restriction persists after the target gains
a source. The BT7-021/022 peers establish the same Tamer-evolution boundary;
the shared restriction primitive applies both attack and block restrictions to
the one selected target. The snapshot retained the old static Tamer metadata
and a combined restriction, so it is now intentionally drifted from the
corrected direct source in the precise areas that motivated the correction;
the snapshot was not edited.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-024 — DaiPenmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-5 Hybrid/Cyborg
Digimon, play cost 7, 7,000 DP, evolving from a blue level-4 for cost 3. On
When Digivolving it draws one card for each opponent Digimon with no sources.
During the opponent's turn, while a Hybrid card is in this Digimon's stack,
opponent level-3 Digimon cannot attack. The single card query returned no
card-specific KB entry.

**Implementation and proof.** `BT7-024.ts` scales the When Digivolving draw by
the number of opponent source-less Digimon, and its opponent-turn static
restriction dynamically applies to all opponent level-3 Digimon while this
stack contains Hybrid. The focused test covers two source-less targets versus
a stacked target, then adds/removes a Hybrid source and observes the level-3
attack restriction lifecycle. The direct level equality and source-less
filters were checked against same-mechanism restriction/scaling peers; the
stack test uses a Hybrid-form source rather than relying on a name-only match.
The snapshot uses an older OpponentsTurn aura representation of the same
restriction and draw clauses, while the direct static effect is the executable
authority. No correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-025 — Beowolfmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-5 Hybrid/Warrior
Digimon, play cost 7, 7,000 DP, evolving from a blue level-4 for cost 3. Its
digivolution cost is reduced by 2 when a Digimon with a Tamer source evolves
into it. When Attacking, it may return a Hybrid source from this stack to hand
to return one opponent level-4-or-lower Digimon to its owner's hand, then trash
all of that target's sources. The single card query returned no card-specific
KB entry.

**Proven correction.** The direct module already expressed the replacement
clause and the attack sequence with a bound target, Hybrid-source return,
source trash, and target return. The shared engine only activates
self-digivolution reducers for its verified-card allowlist, and BT7-025 was
missing from that allowlist; therefore the printed -2 was inert despite the
direct effect being present. `apps/api/src/engine/effects/interpreter/registration/reducers.ts`
now registers BT7-025 as a verified self-reducer. `BT7-025.test.ts` now proves
the reducer metadata and changes the legal-evolution fixture from memory 5 to
memory 4, expecting memory 1 after the printed cost 3 reduced by 2; its
existing attack test proves the Hybrid source, level-4 boundary, source
trashing, target return, and optional refusal path. The Tamer-source stack
matches the BT7-021/022/023 evolution family, while the Hybrid return and
level boundary were compared with BT7-029. The generated snapshot encodes an
older nested self-reducer and a less explicit return/trash sequence; it was
inspected only and remains unchanged. No ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-026 — WereGarurumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-5 Ultimate/Vaccine
Digimon, play cost 7, 7,000 DP, evolving from a blue level-4 for cost 3. On
Play, if the player has a Tamer, it gains 2 memory; otherwise, the player may
play a blue Tamer from hand without paying its cost. Its inherited Your Turn
once-per-turn clause gains 1 memory when this Digimon unsuspends during the
main phase. The single query returned Q1545, confirming that the no-Tamer
branch does not retroactively gain the +2 after the free Tamer enters.

**Implementation and proof.** `BT7-026.ts` has mutually exclusive `youHave` and
`youHaveNone` branches, the optional free blue-Tamer play, and the inherited
main-phase unsuspend trigger with a once-per-turn identity. The focused tests
cover existing-Tamer +2 memory, free blue Tamer with no existing Tamer, and
the inherited effect outside versus inside Main; this directly proves the Q1545
boundary. The condition and free-play primitives were compared with BT7-027/
028 stack-play effects, and the blue color filter prevents an off-color Tamer
from qualifying. The snapshot matches the effective direct behavior. No
correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-027 — Whamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-5 Digimon, play cost 8,
7,000 DP, evolving from a blue level-4 for cost 3. On Play, it may play a
level-3 Digimon from one of the player's source stacks without paying its cost
as another Digimon; if it does, it may put a blue Digimon from hand at the
bottom of one of the player's Digimon stacks. The single query returned Q1546,
confirming the blue hand card may be placed under Whamon itself, and Q1547,
confirming that a level-3 played from a suspended source stack enters
unsuspended and does not carry the source's inherited effects.

**Implementation and proof.** `BT7-027.ts` requires a source-stack level-3
Digimon, plays it free and unsuspended as a separate Digimon, binds the result,
and gates the optional blue-hand bottom placement on the first effect acting.
The focused test uses a suspended host and a source-stack rookie, then proves
the rookie is a separate unsuspended permanent and the blue hand card is under
the chosen host; this covers the Q1546/Q1547 boundaries. The destination and
source-stack transitions were compared with BT7-028 and the free Tamer branch
of BT7-026. The snapshot is weaker/older: it omits the level-3 and host filters
and the `ifThisEffectActed` gate, whereas the direct module carries those
boundaries. No correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-028 — KingWhamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-6 Digimon, play cost 12,
11,000 DP, evolving from a blue level-5 for cost 4. When Attacking, it may
play a level-3 Digimon or Whamon from this stack without paying its cost. During
the player's turn, when that player plays a Digimon from one of their stacks,
it returns one opponent level-4-or-lower Digimon to hand and trashes all of
that target's sources. The single query returned Q1548, confirming that a
De-Digivolve that turns a stack card into a Digimon is not a play from stack
for the Your Turn clause.

**Implementation and proof.** `BT7-028.ts` uses an OR target for a level-3
Digimon or exact Whamon name, plays from this card's own stack without cost,
and marks the resulting event as a play from a digivolution stack. Its Your
Turn trigger consequently returns an opponent level-4-or-lower Digimon and
trashes all of that target's sources. The focused test plays a level-3 source
card, then proves the opponent target's return and source trash; the
`fromDigivolution` event gate is also checked against the Q1548 De-Digivolve
boundary. The source-stack and play-event primitives were compared with
BT7-027, and the level/name OR boundary avoids the snapshot's accidental AND
interpretation. The snapshot has material drift: its play target combines
level and Whamon name, and its Your Turn sequence targets/returns the wrong
side before trashing a source stack. The direct source is authoritative and
the snapshot was not edited. No correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-029 — MagnaGarurumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-6 Hybrid/Variable/Cyborg
Digimon, play cost 12, 12,000 DP, evolving from a blue level-5 for cost 4.
When Digivolving or attacking, once per turn it may return a Hybrid source
from this stack to hand, then return an opponent Digimon with the same level as
the returned card and trash all of that target's sources. During the player's
turn, once per turn, when an effect adds a card to hand, it may unsuspend one
of the player's Digimon. The single query returned Q1549, confirming the
source-return effect can trigger from both When Digivolving and When Attacking,
and Q1550, confirming those triggers share one once-per-turn identity.

**Proven correction.** `BT7-029.ts` correctly shares `bounce-hybrid` across
both triggers, returns a Hybrid source, binds its level for the exact opponent
target, returns that target after trashing its sources, and gates the source
with the own-stack filter. The optional source-return action lacked
`abortOnDecline`, so declining it could leave the remaining action sequence
eligible to continue instead of aborting the dependent bounce. The direct
module now sets `abortOnDecline: true`; `BT7-029.test.ts` statically proves the
shared once-per-turn identity, trigger pair, and optional abort contract, while
its existing tests cover same-level targeting, non-Hybrid rejection, source
trashing, the shared once-per-turn cross-trigger limit, and the Your Turn
unsuspend. The snapshot represents the same broad sequence with an older
return/trash encoding and does not replace the direct dynamic level binding.
No ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-030 — AncientMegatheriummon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-021–030 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-021-030.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and KB.** The catalog identifies a blue level-6 Mega/Data/Ancient
Animal/Ten Warriors Digimon, play cost 13, 13,000 DP, evolving from a blue
level-5 for cost 5. When Digivolving, for each Hybrid source in its stack it
trashes the bottom source of each opponent Digimon, then draws two cards for
each opponent Digimon with no sources. On Deletion, it may play a blue level-4-
or-lower Hybrid from hand without paying its cost. The single query returned no
card-specific KB entry.

**Implementation and proof.** `BT7-030.ts` scales the bottom-source trash over
opponent Digimon once per qualifying Hybrid source in this stack, then scales
the draw over the opponent's newly source-less Digimon, and its optional
On-Deletion play is limited to blue level 4 or lower Hybrid cards from hand.
The focused tests cover two Hybrid stack sources, staged source removal and
source-less draw scaling, plus free play of a blue level-4 Hybrid on deletion.
The source-stack trait matcher and bottom-source primitive were compared with
BT7-024/025; the On-Deletion free-play boundary was compared with BT7-026/027.
The snapshot uses an older generic trash representation but has the same
effective scaling and On-Deletion restriction; the direct bottom-source action
remains authoritative. No correction or ambiguity was found.

**Score:** 8/10 provisional (2/2, 2/2, 2/2, 2/2, 0/2 gates).

### BT7-031 — Herissmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-3 Digimon, Rookie/Data/Mammal, play cost 3,
  DP 2000, yellow level-2 evolution cost 0. Inherited: `[Your Turn] When this
  card is trashed due to activating this Digimon's ＜Digi-Burst＞, return this
  card to its owner's hand.`
- **Direct implementation.** `apps/api/src/cards/BT7/BT7-031.ts:8–30` uses an
  inherited Your Turn `SubTrigger` on `onDigiBurstCardDiscarded`, with
  `sourceFilter: { isSelfRef: true }` and `AddToHandSelf`. The dedicated event
  and self-source gate implement Q1551 rather than reacting to arbitrary leave
  play or stack-trash events.
- **Focused/stack proof.** `BT7-031.test.ts` now uses the legal yellow stack
  L2 BT1-005 egg → L3 Herissmon → L4 Filmon (BT7-034), selects the Herissmon
  source for the host's Digi-Burst, and asserts hand return, no trash copy, and
  the remaining stack size. P-032 is the same inherited self-Digi-Burst
  watcher pattern.
- **Snapshot drift.** `effects.json:113874–113890` serializes `whenLeavesPlay`
  instead of `onDigiBurstCardDiscarded`; the direct module is authoritative and
  the snapshot was not edited.
- **Finding.** No remaining direct gap or printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-032 — Pulsemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-3 Digimon, Rookie/Vaccine/Beastkin, play
  cost 3, DP 2000, yellow level-2 evolution cost 0. Inherited:
  `[When Attacking][Once Per Turn] If you have 3 security cards, gain 2 memory.`
- **Direct implementation.** `BT7-032.ts:8–32` uses inherited
  `WhenAttacking`, `GainMemory` 2, a live security `zoneCount` exactly equal to
  3, and `frequency: "OncePerTurn"`.
- **Focused/stack proof.** `BT7-032.test.ts` uses legal yellow L2 egg → L3
  Pulsemon → L4 Wizardmon stacks and covers the exact-three positive and
  four-security negative boundary. The shared `zoneCount` and Once Per Turn
  mechanisms were compared with BT7-041 and related security-threshold peers.
- **Snapshot drift.** `effects.json:113892–113912` has a broad `youHave` filter
  with no security zone or numeric comparison; it cannot prove the exact-three
  boundary. No snapshot edit was made.
- **Finding.** No remaining direct gap or printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-033 — Bulkmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-4 Digimon, Champion/Vaccine/Dragonkin, play
  cost 4, DP 5000, yellow level-3 evolution cost 2. Inherited:
  `[Opponent's Turn] While you have 3 or more security cards, this Digimon
  gains ＜Blocker＞.`
- **Direct implementation.** `BT7-033.ts:8–40` uses an inherited opponent-turn
  `Aura` on the host, grants only Blocker, and gates it with
  `securityAtLeast: 3`. It does not confuse the host's DP or its source card
  with the inherited keyword.
- **Focused/stack proof.** `BT7-033.test.ts` uses legal yellow L2 egg → L3
  Pulsemon → L4 Bulkmon → L5 Sirenmon, and now asserts both the three-security
  positive and two-security negative threshold. BT4-045 and BT6-043 were used
  as live security-aura and Blocker peers.
- **Snapshot.** `effects.json:113914–113930` matches the direct IR's Aura,
  opponent-turn, and security threshold shape.
- **Finding.** No remaining direct gap or printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-034 — Filmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-4 Digimon, Champion/Data/Beastkin, play
  cost 5, DP 4000, yellow level-3 evolution cost 2. `[Main] ＜Digi-Burst 2＞`
  trashes two of this Digimon's digivolution cards, then one opponent Digimon
  gains Security Attack -2 until the end of that opponent's next turn.
- **Correction.** The former direct IR had a first `Trash` action targeting
  two of the controller's Digimon, with the Digi-Burst cost attached to that
  unrelated action; it could trash own permanents. `BT7-034.ts:11–48` now has
  one `GainKeyword` payload targeting exactly one opponent Digimon, with the
  fixed Digi-Burst-2 stack cost attached directly to that payload. The
  `DigiBurst` keyword remains declared and the duration is
  `untilOpponentTurnEnd`.
- **Focused/stack proof.** `BT7-034.test.ts` uses legal yellow L2 egg → L3
  Herissmon → L4 Filmon plus an allied L2 egg → L3 Pulsemon stack. It asserts
  the opponent's -2 keyword, both own permanents remain, and the cost removes
  only the host's two stack cards. ST5-13 and BT4-026 are same-mechanism peers
  for attaching Digi-Burst costs to the actual payload action.
- **Snapshot drift.** `effects.json:113932–113957` preserves the old erroneous
  own-Digimon `Trash` action followed by an uncosted GainKeyword; it was
  inspected as read-only evidence and not edited.
- **Finding.** Direct gap corrected; no remaining printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-035 — Kazemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-4 Digimon, Hybrid/Variable/Fairy, play cost
  5, DP 5000, yellow level-3 evolution cost 2. Optional special evolution:
  this card may digivolve from hand onto one yellow Tamer as if that Tamer were
  a level-3 yellow Digimon.
- **Direct implementation.** `BT7-035.ts:10–43` declares a Static metadata
  `Digivolve` action from hand onto one controller-owned yellow Tamer as level
  3, with a cost-0 alternate marker. The runtime's Tamer-onto registration
  derives the actual level-3 yellow evolution cost (2) and Tamer color gate;
  the Static action is not incorrectly executed as an ordinary effect.
- **Rules/QA boundaries.** Q1552–Q1557 and Q4643 cover Tamer-as-Digimon
  timing, inherited-effect visibility, Security-effect non-inheritance,
  same-turn attack restriction, leave-play trashing, and mandatory declared
  evolution. The focused `BT7-035.test.ts` uses a legal yellow T.K. Tamer and
  asserts the special path pays two memory and places Kazemon. Tamer-onto peers
  BT4-025 and BT7-036 use the same metadata registration seam.
- **Snapshot drift.** `effects.json:113959–113976` serializes the path under a
  Main optional trigger instead of the direct Static metadata form. The direct
  module and `cardData.ts` Tamer-onto derivation are authoritative; no snapshot
  edit was made.
- **Finding.** No remaining direct gap or printed ambiguity; the QA edge cases
  remain deferred to runtime execution gates.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-036 — Zephyrmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-4 Digimon, Hybrid/Variable/Birdkin, play
  cost 6, DP 6000, yellow level-3 cost 3 and yellow level-4 cost 1. Specially
  digivolves from hand onto a yellow Tamer as if level 3 for cost 2. On
  Digivolving, if a Hybrid-trait card or `[Zoe Orimoto]` is in this stack, all
  of the controller's Security Digimon get +3000 DP through the opponent's next
  turn.
- **Correction.** `BT7-036.ts:46–70` already uses the correct
  `ModifySecurityDP` action and duration; its bracket-only `[Zoe Orimoto]`
  stack reference was changed from `match: "name"` to `match: "nameExact"`.
  This follows rules §2-3-1-2 and prevents a near-matching name from
  satisfying an exact bracket reference. The Hybrid branch remains a trait
  match. The committed cost-2 yellow-Tamer alternate requirement is the
  `packages/shared/src/effects/data.ts:552` override.
- **Focused/stack proof.** `BT7-036.test.ts` now uses the legal frontier stack
  Zoe Orimoto → L4 Hybrid Kazemon → L4 Zephyrmon, and asserts a +3000
  Security-DP delta while the battle-area Zephyrmon remains unmodified.
  `frontier-hybrid-color-gates.test.ts` compares correct yellow BT7-088 Zoe
  with wrong-color BT7-089 and checks the cost-2 alternate path. Q1559–Q1565
  and Q4644 cover Tamer evolution timing and mandatory declaration boundaries.
- **Snapshot drift.** `effects.json:113978–114021` uses generic battle-area
  `ModifyDP` rather than `ModifySecurityDP`, and serializes Zoe with substring
  `match: "name"`; its Tamer metadata also lacks the direct specific form.
  No snapshot edit was made.
- **Finding.** Direct name-boundary correction complete; no remaining printed
  ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-037 — Boutmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-5 Digimon, Ultimate/Vaccine/Beastkin, play
  cost 6, DP 7000, yellow level-4 evolution cost 3. Inherited:
  `[Opponent's Turn] When an opponent's Digimon attacks a player, if the
  controller has 3 or more security cards, unsuspend this Digimon.`
- **Direct implementation.** `BT7-037.ts:9–48` uses an inherited opponent-turn
  watcher on `whenOpponentAttacks`, unsuspends only its own host, and requires
  both `attackTargetsPlayer` and `securityAtLeast: 3`. This excludes attacks on
  another Digimon and preserves Q1566's pre-block timing.
- **Focused/stack proof.** `BT7-037.test.ts` replaces the former illegal black
  host with a legal yellow L5 Boutmon source under L6 SkullMammothmon, whose
  native Blocker is imported. It covers unsuspend before the block window and
  declares a block. The negative case uses a legal L5 Boutmon source under L6
  Rasenmon without Blocker and confirms an attack on a Digimon does not
  unsuspend the source.
- **Snapshot drift.** `effects.json:114023–114044` retains the watcher but
  omits the `attackTargetsPlayer` condition, so it is broader than direct
  authority. No snapshot edit was made.
- **Finding.** No remaining direct gap or printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-038 — JetSilphymon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-5 Digimon, Hybrid/Variable/Cyborg, play cost
  7, DP 7000, yellow level-4 evolution cost 3. When a Digimon with a Tamer
  card in its stack digivolves into this card from hand, reduce the digivolution
  cost by 2. On Digivolving, if a Hybrid-trait card is in its stack, Recovery
  +1 from deck.
- **Restriction.** The local restriction data limits BT7-038 to one copy from
  2022-08-01; this is deck legality metadata, not a change to executable card
  text.
- **Direct implementation.** `BT7-038.ts:5–39` uses a hand-resident Static
  `CostModifier` with delta -2. It is scoped to a controller-owned Digimon
  whose stack contains a Tamer (`digivolutionStackKind: ["Tamer"]`), and to the
  exact JetSilphymon destination. The destination matcher was tightened from
  `name` to `nameExact` to make the “this card” identity explicit; the runtime
  hand-source card-ID guard and `into` check then prevent unrelated destinations.
  The When Digivolving Recovery branch checks a Hybrid trait in the stack.
- **Focused/stack proof.** `BT7-038.test.ts` now uses a legal Zoe Orimoto → L4
  Hybrid Kazemon → L5 JetSilphymon stack for the -2 cost proof, and an ordinary
  L4 Kazemon → L5 JetSilphymon stack for the Hybrid-source Recovery proof.
  `frontier-hybrid-color-gates.test.ts` and `yellow-hybrid-security-deck.test.ts`
  provide comparative color and multi-step frontier-stack evidence. No focused
  assertion was added for deck count because the local restriction is metadata
  only.
- **Snapshot drift.** `effects.json:114046–114086` serializes a nested
  `whenOneOfYoursDigivolves` Replacement and a SecurityManipulation action,
  omitting the direct hand-resident/into filter and differing in the recovery
  action representation. No snapshot edit was made.
- **Finding.** Direct matcher correction complete; no remaining printed
  ambiguity. The restricted-copy rule remains a deferred executable/deck gate.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-039 — Stefilmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-5 Digimon, Ultimate/Data/Beastkin, play cost
  8, DP 7000, yellow level-4 evolution cost 3. On Digivolving, if this Digimon
  has exactly one digivolution card, optionally place up to two level-4-or-lower
  yellow Digimon cards from hand at the bottom of this stack in any order, then
  draw one per card placed. Inherited Your Turn: when this card is trashed by
  this Digimon's Digi-Burst, one own Digimon gains Security Attack +1 for the
  turn.
- **Direct implementation.** `BT7-039.ts:5–60` uses a When Digivolving
  `PlaceUnder` action filtered to own yellow Digimon level ≤4 from hand, capped
  at two, bottom-positioned with arbitrary ordering, optional, and gated by
  `selfDigivolutionCountExactly: 1`. It tracks the number actually placed and
  draws using that named count. The inherited branch watches the exact source
  card on the dedicated Digi-Burst event and grants one own Digimon +1 for the
  turn.
- **Focused/stack proof.** `BT7-039.test.ts` uses legal yellow L4 Filmon → L5
  Stefilmon stacks for placement/order cases. Its Digi-Burst case uses legal L4
  Filmon → L5 Stefilmon → L6 Rasenmon and asserts exactly one own Digimon gets
  Security Attack +1 after the Stefilmon source is trashed. Q1567 ordering is
  covered by the primitive/source event inspection.
- **Snapshot drift.** `effects.json:114088–114134` has a raw exactly-one-card
  condition and scales Draw by a broad own-Digimon filter rather than the named
  placement count; its inherited watcher is also generic rather than
  Digi-Burst-specific. No snapshot edit was made.
- **Finding.** No remaining direct gap or printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-040 — Rasenmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-031–040 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-031-040.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Yellow level-6 Digimon, Mega/Data/Beastkin, play cost 11,
  DP 11000, yellow level-5 evolution cost 5. When digivolving from hand, set
  the digivolution cost to the number of the controller's security cards, with
  a minimum of 1. `[Main][Once Per Turn] ＜Digi-Burst up to 4＞` trashes up to
  four stack cards, then one opponent Digimon gets -3000 for each card trashed.
- **Direct implementation.** `BT7-040.ts:5–48` uses a hand-resident Static
  `CostModifier` with set mode and security scaling floored at 1. Its Main
  effect is Once Per Turn, uses dedicated `TrashDigivolution` with up-to-four
  self-stack selection and a named paid-count tracker, then applies `ModifyDP`
  to exactly one opponent Digimon at -3000 per card actually trashed. The
  shared cost/scaling primitive implements Q1568 layering and Q1569's one-card
  minimum.
- **Focused/stack proof.** `BT7-040.test.ts` now uses a legal yellow L2 egg →
  L3 Herissmon → L4 Filmon → L5 Stefilmon → L6 Rasenmon stack for the four-card
  path, adds a second opponent target to prove Q1570's one-target boundary, and
  adds a three-card-stack case proving -9000 scaling. Existing real-digivolve
  helpers cover security counts 4 and 0 plus an additional -2 reduction, and
  owner-seat tests cover cross-player isolation.
- **Snapshot drift.** `effects.json:114136–114177` uses a generic Replacement
  and generic `Trash` action, and scales from a broad controller filter rather
  than the paid named count. It was read-only evidence and was not edited.
- **Finding.** No remaining direct gap or printed ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-041 — Kazuchimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: yellow level 6 Digimon, play cost 12, 12000 DP, yellow level 5 evolution cost 5,
Mega/Vaccine/Shaman. Its When Digivolving clause gains 2 memory at 3 or more security cards; at
2 or fewer, it may Recovery +1 until its security stack reaches 3. Its Your Turn clause grants
Security Attack +1 while the owner has at least 3 security cards.

The single local KB query was node tools/kb/query.mjs card BT7-041; it returned Q1571. Q1571
confirms that starting at 2 or fewer security cards and recovering to 3 does not also grant the
2-memory branch. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-041.ts:

- GainMemory(2) is conditioned on the owner's security zone count being at least 3.
- The Recovery branch is conditioned independently on the starting count being at most 2.
- The corrected Recovery action is optional, moves one card per iteration, and stops at
  untilSecurityCount 3.
- The Your Turn self-targeted GainKeyword grants SecurityAttack +1 while security count is at least
  3.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

Correction made: the original direct Recovery action used a mandatory amount-3 scaled form
(amount 3 minus the current security count). That did not express the printed "may Recovery +1
until there are 3 cards" choice and did not preserve the one-card repeated Recovery semantics.
It now uses amount 1, optional true, and untilSecurityCount 3. This is supported directly by
runRecover and the generic optional action path; recoverToSecurity stops safely at an empty deck.

The shared condition evaluator reads the security count at effect resolution, so the memory branch
does not re-evaluate after Recovery and Q1571 is preserved. GainKeyword uses the continuous
keyword ledger and the owner turn condition. Peers checked included BT7-042 security-DP behavior,
BT7-037's security condition, and the red-yellow-security-deck stack scenario. The focused test
covers starting at 2, 3, and 1 security; a new static assertion guards optional Recovery +1 and
the bound. The legal level-5-to-level-6 stack is represented by catalog evolution data and the
existing card test fixture; tests were not executed.

Snapshot drift: the generated BT7-041 record uses a SecurityManipulation addTop amount 3 instead
of the direct Recover +1-until-3 action, and uses a Your Turn Aura instead of the direct
self-targeted SecurityAttack keyword grant. Its memory condition and full/empty metadata otherwise
match the contract. The snapshot was read only and not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 1; ambiguities 0.

### BT7-042 — AncientKazemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: yellow level 6 Digimon, play cost 13, 13000 DP, yellow level 5 evolution cost 5,
Mega/Vaccine/Ancient Birdkin/Ten Warriors. During the opponent's turn, while a Hybrid card is in
this Digimon's digivolution cards, all of the owner's Security Digimon get +4000 DP. On Deletion,
the owner may play one yellow level 4 or lower Hybrid-trait card from hand without paying its cost.

The single local KB query was node tools/kb/query.mjs card BT7-042; it returned no entries. No
erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-042.ts:

- OpponentsTurn uses ModifySecurityDP for the owner's security seat, amount +4000.
- The condition is selfDigivolutionStackHasTrait for Hybrid, so a near-matching trait does not
  arm it.
- On Deletion optionally plays one owner's yellow card at level 4 or lower with Hybrid in its
  traits from hand, with payCost false.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

The shared ModifySecurityDP primitive writes to the security-DP ledger, affecting Security Digimon
when checked rather than modifying battle-area DP. The continuous turn guard and live stack trait
matcher enforce the opponent-turn and Hybrid boundaries. Peers checked included BT7-041's security
thresholds, BT7-037's inherited security behavior, and the yellow Hybrid stack/deletion test.
BT7-042.test.ts covers a Hybrid host, a non-Hybrid host, the owner/opponent turn boundary, battle
DP remaining unchanged, and the optional hand play. The yellow level-5-to-level-6 stack is legal
per catalog data; tests were not executed.

Snapshot drift: the generated record expresses the security bonus as an Aura granting +4000 DP
to all owner's battle-area Digimon, which is materially broader and wrong for Security Digimon.
The direct ModifySecurityDP module is executable authority; effects.json was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-043 — Gotsumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 3 Digimon, play cost 3, 3000 DP, green level 2 evolution cost 0,
Rookie/Data/Rock. On Play, the owner may reveal one green Digimon from hand and place it on top
of the deck.

The single local KB query was node tools/kb/query.mjs card BT7-043; it returned no entries. No
erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-043.ts is an optional On Play Return action whose
hand-zone target is one green Digimon and whose destination is deckTop. The loose-card target
selection exposes the hand candidate for the required reveal, and private-area placement puts it
face down after selection. The module is full-coverage, residual-free, and exclusively registered
with registerIrCard.

The shared Return path resolves loose hand cards rather than battle-area permanents, honors
optional refusal, and sends the chosen instance to deck top. Manual private-area rules require
the selected card to be revealed before being placed; the hand target's visible decision payload
supplies that boundary. The focused test confirms the selected green Digimon reaches deck top
face down while the prior deck top moves below it. Green level-2-to-level-3 evolution and related
hand-to-deck-top behavior in BT7-045 were checked; the test was not executed.

Snapshot: no drift. The generated BT7-043 Return has the same hand/green/Digimon target, optional
flag, deckTop destination, full coverage, and empty residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-044 — Betamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 3 Digimon, play cost 3, 2000 DP, green level 2 evolution cost 0,
Rookie/Virus/Amphibian. On Play, reveal the top 3 cards, add one green level 4 Digimon or one
green Tamer among them, and put the remaining cards at the bottom of the deck in any order.

The single local KB query was node tools/kb/query.mjs card BT7-044; it returned no entries. No
erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-044.ts is one RevealAdd action with revealCount 3,
a union of green level-4 Digimon and green Tamer filters, count 1 to hand, and rest deckBottom.
The shared reveal implementation selects from the revealed set and disposes the unselected cards
to the deck bottom. The module is full-coverage, residual-free, and exclusively registered with
registerIrCard.

The OR union is a definition boundary: a green level-4 Digimon and a green Tamer qualify, while a
wrong color, wrong level, or non-Tamer card does not. The manual rule for returning revealed cards
allows the activating player to order the bottom placement. BT7-044.test.ts covers an eligible
green level-4 Digimon and confirms the remaining deck size; BT7-046 and BT7-019 were checked as
same-mechanism multi-slot reveal peers. The legal green level-2-to-level-3 evolution is standard
catalog data; the test was not executed.

Snapshot: no drift. The generated BT7-044 record matches reveal count, union filters, hand
destination, deck-bottom rest, full coverage, and empty residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-045 — Tortomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 4 Digimon, play cost 4, 4000 DP, green level 3 evolution cost 2,
Champion/Vaccine/Reptile. Its inherited When Attacking effect may reveal one green Digimon from
hand and place it on top of the deck to give this Digimon +3000 DP for the turn.

The single local KB query was node tools/kb/query.mjs card BT7-045; it returned no entries. No
erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-045.ts:

- The inherited WhenAttacking action optionally selects one owner's green Digimon from hand and
  returns it to deck top.
- abortOnDecline stops the following clause when the optional reveal/placement is declined or
  cannot move a card.
- If the placement acted, the self-targeted host receives +3000 with duration untilOwnerTurnEnd.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

The shared Return loose-zone path presents hand candidates and records lastEffectActed from the
actual movement. The following ifThisEffectActed condition therefore does not grant DP on decline,
an empty candidate pool, or a failed move. The duration maps to the owner's turn end, equivalent to
"for the turn" for this inherited owner attack. BT7-045.test.ts builds Tortomon under a host,
attacks, verifies the host DP increase, confirms the hand card moved, and checks deck top; BT7-043
was checked as the same private-area placement mechanism. The green level-3-to-level-4 stack is
represented in the catalog/test fixture; the test was not executed.

Snapshot drift: the generated BT7-045 record has only an optional WhenAttacking ModifyDP action,
with a broad green Digimon target, and omits the required hand placement and result gate. The
direct module is executable authority and the snapshot was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-046 — Beetlemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 4 Digimon, play cost 6, 5000 DP, green level 3 evolution cost 2,
Hybrid/Variable/Cyborg. It may digivolve from hand onto a green Tamer as if that Tamer were a
level 3 green Digimon. When Digivolving, reveal the top 5 cards, add one Hybrid-trait card and
one J.P. Shibayama among them, and put the remaining cards at the bottom in any order.

The single local KB query was node tools/kb/query.mjs card BT7-046; it returned Q1572-Q1577 and
Q4645. These rulings confirm Tamer-onto digivolution is treated as Digimon digivolution for
triggers and bonus draw, retains the played-this-turn attack restriction, makes the Tamer a
digivolution card, excludes the Tamer's Security text, includes its inherited text, and cannot be
declined after a legal declaration. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-046.ts:

- The direct digivolution requirement is alternate cost 2, base Tamer, green base color.
- RevealAdd reveals exactly 5 and has two independent add slots: Hybrid trait and exact J.P.
  Shibayama name, each count 1 to hand.
- The remaining revealed cards go to deckBottom.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

registerTamerOntoFromEffects and matchingAlternateDigivolutionRequirement connect the Tamer-onto
metadata to live legality, shared color, level 3, and the card's printed green level-3 cost 2.
The RevealAdd primitive treats the two add slots independently and orders the unselected reveal
remainder. Peers BT7-011 and BT7-047 were checked for Tamer-onto and Hybrid/name boundaries.
BT7-046.test.ts includes a legal green Tamer stack, an empty-field reveal regression, independent
Hybrid and J.P. searches, bottom-rest checks, and registration/timing assertions. Tests were not
executed.

Snapshot drift: the generated record includes the same reveal body but represents the Tamer
metadata as an onto/asLevel 3 action and publishes an alternate requirement cost 0 without the
direct base-color guard. The direct module's cost 2 and green Tamer restriction are executable
authority; effects.json was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-047 — MetalKabuterimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 4 Digimon, play cost 6, 6000 DP, green level 3 cost 3 or green
level 4 cost 1 evolution, Hybrid/Variable/Cyborg. It may digivolve from hand onto a green Tamer as
if it were a level 3 green Digimon for cost 2. When Digivolving, if Hybrid or J.P. Shibayama is in
the stack, suspend one opposing Digimon at 6000 DP or less.

The single local KB query was node tools/kb/query.mjs card BT7-047; it returned Q1580-Q1585 and
Q4646. These rulings match the BT7-046 Tamer-onto behavior: Digimon timing and bonus draw apply,
a Tamer played this turn still prevents attack, the Tamer becomes a digivolution card, its
Security text is not inherited, its inherited text is inherited, and a legal declared digivolution
cannot be declined. No erratum or restriction applies.

Direct evidence in apps/api/src/cards/BT7/BT7-047.ts:

- Static metadata targets a green Tamer as a level 3 green Digimon from hand at cost 2.
- When Digivolving suspends one opposing Digimon with dp <= 6000.
- selfDigivolutionStackHasTrait matches Hybrid as a trait or J.P. Shibayama as an exact name.
- The module is full-coverage, residual-free, and exclusively registered with registerIrCard.

The shared Tamer-onto registration and alternate legality path enforce green color and cost 2;
self-stack matching uses the live stack's form/attribute/type trait union and exact name boundary.
BT7-047.test.ts covers a green Hybrid source, a legal stack transition, and the 6000-DP suspend
target. BT7-046 and the frontier Hybrid color-gate tests were checked as peers; tests were not
executed.

Snapshot: no drift. The read-only BT7-047 snapshot matches static Tamer metadata, alternate
cost 2, suspend target, Hybrid/J.P. condition, full coverage, and empty residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-048 — Monochromon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 4 Digimon, play cost 6, 8000 DP, green level 3 evolution cost 2,
Champion/Data/Ankylosaur, with no effect, inherited, or Security text.

The single local KB query was node tools/kb/query.mjs card BT7-048; it returned no entries. No
erratum or restriction applies.

apps/api/src/cards/BT7/BT7-048.ts is an empty full-coverage IR module with one exclusive
registerIrCard call. The focused test checks official metadata and normal play without a pending
decision, including 8000 DP and the printed cost. Standard green level-3-to-level-4 evolution
data and effectless BT7-050 were checked as peers; the test was not executed.

Snapshot: no drift. The read-only BT7-048 snapshot is empty with full coverage and no residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2 (empty behavior);
static behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-049 — MameTyramon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 5 Digimon, play cost 5, 5000 DP, green level 4 evolution cost 3,
Ultimate/Data/Mutant/X Antibody. When Attacking, reveal the top 3 cards and optionally digivolve
this Digimon into a green level 6 among them without paying memory cost; put the remaining cards at
the bottom of the deck in any order.

The single local KB query was node tools/kb/query.mjs card BT7-049; it returned Q1587-Q1590.
Q1587 confirms the player may reveal and decline the free digivolution. Q1588 confirms the bonus
draw occurs when the selected card is stacked and comes from unrevealed deck cards. Q1589 confirms
the digivolved card's When Digivolving effects cannot activate before the revealed remainder is
returned to the deck. Q1590 confirms the effect can be used with two or fewer deck cards, revealing
as many as possible. No erratum or restriction applies.

Correction made: the original direct RevealAdd had to:digivolve but no digivolveTarget, so the
shared default host selector could choose any owner's Digimon. The catalog says "this Digimon";
apps/api/src/cards/BT7/BT7-049.ts now supplies an isSelfRef/self digivolveTarget. This is a direct
target-boundary correction, not a shared-engine change.

The remaining direct evidence is one RevealAdd with revealCount 3, a green level-6 filter, an
optional free digivolve disposition, and deckBottom rest. runRevealAdd validates the selected
revealed card against a legal evolution host, executes the free digivolve, draws the bonus card
from the unrevealed portion, returns the remaining reveal after that draw, and then resolves later
digivolution processing. The focused test covers free evolution from an attack; a new comparative
test puts a second friendly Digimon beside MameTyramon and asserts that only MameTyramon evolves.
The green level-4-to-level-5 stack is represented by catalog data and the test fixture. BT9-104
was checked as a same-mechanism free reveal-digivolution peer. Tests were not executed.

Snapshot drift: the generated BT7-049 action matches reveal count, green level-6 selection,
optional disposition, and deckBottom rest but omits the direct self-only digivolveTarget. The
direct module is executable authority; the snapshot was not edited.

Score after correction: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2;
static behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 1; ambiguities 0.

### BT7-050 — Triceramon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-041–050 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-041-050.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: green level 5 Digimon, play cost 6, 7000 DP, green level 4 evolution cost 2,
Ultimate/Data/Ceratopsian, with no effect, inherited, or Security text.

The single local KB query was node tools/kb/query.mjs card BT7-050; it returned no entries. No
erratum or restriction applies.

apps/api/src/cards/BT7/BT7-050.ts is an empty full-coverage IR module with one exclusive
registerIrCard call. The focused test checks official metadata and normal play without a pending
decision, including 7000 DP and the printed cost. Standard green level-4-to-level-5 evolution
data and effectless BT7-048 were checked as peers; the test was not executed.

Snapshot: no drift. The read-only BT7-050 snapshot is empty with full coverage and no residual.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2 (empty behavior);
static behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-051 — RhinoKabuterimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** The catalog identifies a green level 5, play cost 9, 8000 DP, Green level 4 evolution cost 3 Digimon with Hybrid / Variable / Insectoid traits. Its first clause reduces the evolution memory cost by 2 when one of your Digimon with a Tamer card in its stack evolves into this card from hand. Its second clause is `[When Attacking]` and says that, if a Hybrid or Insectoid card is in this stack, this Digimon can evolve from hand into a Digimon with Insectoid or Ten Warriors traits for memory 3.

**Direct authority and correction.** The direct module now has an `AllTurns` `wouldDigivolve` replacement scoped to your Digimon whose stack contains a Tamer, with the destination restricted to RhinoKabuterimon in your hand and a nested `reduceCost` amount of 2. The attack-time `Digivolve` targets self, reads from hand, pays a cost override of 3, filters the destination to Insectoid or Ten Warriors traits, and checks the Hybrid/Insectoid stack condition. The attack action was corrected with `optional: true`: Q1592 and Comprehensive §15-7 prove that “can digivolve” must permit declining it. The reducer collector allowlist was also corrected so the first clause is executable; without the allowlist, the replacement would remain inert.

**Snapshot drift and tests.** The generated snapshot contains a generic `Static`/`whenOneOfYoursDigivolves` reducer and the same attack action but omits explicit optionality. It is read-only evidence and is not treated as authority; the direct module is now more precise about the card identity and optional choice. The existing attack test was updated to accept the optional effect; focused static tests now prove full coverage, reducer publication, and optional hand evolution, and a Tamer-source evolution fixture proves the intended cost reduction without execution in this audit. BT7-025 is the same-mechanism self-reducer peer.

**Boundaries and stack.** The source-stack condition matches Hybrid or Insectoid traits, while the hand destination matches Insectoid or Ten Warriors traits; these are intentionally distinct. The self target prevents another Digimon from being evolved by the attack effect. The legal reduction fixture uses a Green level 4 Hybrid with a Green Tamer source and a RhinoKabuterimon card from hand; no requirement is ignored.

**Score:** 2/2 clause coverage, 2/2 timing/optionality, 2/2 target and trait boundaries, 2/2 cost/stack, 0/2 executed gates = **8/10 provisional**.

### BT7-052 — SaberLeomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a green level 6, play cost 11, 10000 DP, Green level 5 evolution cost 3 Mega / Data / Ancient Animal. The catalog gives `[When Digivolving]` +5000 DP for the turn and `[On Deletion]` gain 2 memory.

**Direct, snapshot, and tests.** The direct module targets self for `ModifyDP` amount 5000 with `forTheTurn`, and has a separate `OnDeletion` `GainMemory` amount 2. The generated snapshot is structurally exact: no optional flag, source filter, or duration drift was found. The focused test uses a legal Green level 5-to-6 evolution and proves the temporary 15000 DP result. The On Deletion clause was inspected directly and against the shared deletion trigger model; no proven implementation gap was found.

**Boundaries and stack.** The effect is self-only and does not introduce a color, name, or trait target. Standard Green level 5 evolution is represented by the catalog requirement and ordinary digivolution path; no alternate stack behavior or Security clause exists. The temporary DP duration matches the rules' turn-scoped effect processing.

**Score:** 2/2 clause coverage, 2/2 timing/duration, 2/2 target boundaries, 2/2 stack/resource behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-053 — Dinorexmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a green level 6, play cost 12, 12000 DP, Green level 5 evolution cost 4 Mega / Data / Dinosaur / X Antibody. `[When Digivolving]` suspends one opponent Digimon, then that same Digimon cannot unsuspend during the next unsuspend phase. `[Your Turn]` grants +1000 DP for each opponent suspended Digimon.

**Direct authority and correction.** The first direct action selects one opponent Digimon; the subsequent `Restrict` now carries `sameTarget: true`, in addition to its opponent-Digimon filter and `untilOpponentTurnEnd` unsuspend restriction. This was a proven gap: without the marker, the interpreter could resolve a different opposing Digimon for the restriction. The Your Turn scaling remains self-only, permanent, +1000 per opposing suspended Digimon.

**Snapshot drift and tests.** The generated snapshot has the correct two-action sequence but lacks `sameTarget` and uses `controllerDefault: opponent` in the second filter, so it is weaker evidence than the corrected direct module. The existing focused test chooses a preferred target and confirms the target is suspended while another opponent Digimon is not; a new static test proves the second action is same-target and retains the restriction duration. Permanent target resolution and Comprehensive §§15-10–15-11 provide the mechanism proof.

**Boundaries and stack.** Both actions are limited to opponent Digimon, not Tamers; the scaling counts all currently suspended opposing Digimon and does not count this card. The focused legal evolution fixture uses a Green level 5 base and a BT7-053 card from hand. No name or trait substring is used by the effects beyond the catalog's card identity.

**Score:** 2/2 clause coverage, 2/2 timing/restriction duration, 2/2 same-target/controller boundaries, 2/2 scaling/stack, 0/2 executed gates = **8/10 provisional**.

### BT7-054 — AncientBeetlemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a green level 6, play cost 13, 13000 DP, Green level 5 evolution cost 5 Mega / Vaccine / Ancient Insect / Ten Warriors. During your turn, once per turn, when one of your Ten Warriors or Hybrid Digimon deletes an opponent Digimon in battle and survives, trash the top opponent Security card. On deletion, optionally play a green level 4 or lower Hybrid from hand without paying its cost.

**Direct, snapshot, and tests.** The direct module uses a Your Turn `SubTrigger` for `whenDeletesInBattle`, a source filter for your Digimon with Ten Warriors or Hybrid traits, `OncePerTurn`, and opponent Security `trashTop` amount 1. Its On Deletion action is optional, hand-only, free, green, level ≤4, and Hybrid. The generated snapshot matches the action sequence but omits the direct source filter; this is recorded snapshot drift, not a direct gap. Combat controller inspection proves the event itself only fires after a surviving attacker, so no extra survival field is invented. The focused test proves the optional free play with a Green level 4 Hybrid from hand; the same-mechanism BT2-051 combat-deletion behavior was inspected.

**Boundaries and stack.** The battle clause is limited to your own Digimon and the exact trait OR; the played card is independently limited by Green color, level ≤4, Hybrid trait, and hand zone. No Security effect or evolution-from-stack clause is present. No proven implementation gap or ambiguity was found.

**Score:** 2/2 clause coverage, 2/2 timing/frequency/optionality, 2/2 trait/color/level boundaries, 2/2 security/zone behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-055 — Ebonwumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a green level 6, play cost 13, 13000 DP, Green level 5 evolution cost 5 Mega / Vaccine / Holy Beast / Four Sovereigns. `[When Digivolving]` suspends one opponent Digimon, then gains 1 memory for each opponent suspended Digimon. `[Opponent's Turn]` gives all opponent Digimon the requirement to trash one hand card to unsuspend each such Digimon.

**Direct authority and correction.** The When Digivolving sequence targets one opponent Digimon and scales memory by the number of suspended opponent Digimon. The second effect was corrected from `Static` to `OpponentsTurn`; `turnOwnerGuard` proves that Static would incorrectly install the unsuspend restriction during your turn. Its target cardinality was also corrected from numeric 99 to `count: "all"`, matching the printed overall effect and the interpreter's all-processing model. The restriction remains `unsuspendHandTrashCost` through `untilOpponentTurnEnd`.

**Snapshot and tests.** The generated snapshot already records `OpponentsTurn`, all opposing Digimon, the hand-trash unsuspend restriction, and the same digivolving sequence; this was direct-module drift only. Existing focused tests prove suspension plus scaling over an already suspended Digimon and prove that an opponent-turn unsuspend trashes one payment card. Q1596–Q1600 confirm one payment per Digimon and stacking semantics; Q1599 confirms Tamers are excluded. No additional target or name boundary was invented.

**Boundaries and stack.** All targets are opponent Digimon, not Tamers. The effect is overall processing and applies to all eligible Digimon, including those that become eligible while the opponent-turn effect is active. The legal stack is ordinary Green level 5 into level 6; no alternate evolution clause exists.

**Score:** 2/2 clause coverage, 2/2 opponent-turn timing, 2/2 all/Digimon boundaries, 2/2 cost/restriction semantics, 0/2 executed gates = **8/10 provisional**.

### BT7-056 — Dorumon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a black level 3, play cost 3, 1000 DP, Black level 2 evolution cost 0 Rookie / Data / Beast / X Antibody. On play, reveal the top 3 cards, add one X Antibody-trait card and one Kota Domoto by name, and bottom-deck the remainder. The inherited Your Turn once-per-turn clause gains 1 memory when one of your effects places a card under this Digimon.

**Direct, snapshot, and tests.** The direct module implements two distinct RevealAdd categories with reveal count 3 and bottom-deck remainder, plus an inherited Your Turn once-per-turn `onAddDigivolutionCards` SubTrigger source-filtered to self and gaining 1 memory. The snapshot matches the categories and frequency but omits the direct self source filter; that is recorded drift, not a proven direct gap. Reveal processing's per-instance `taken` set supports selecting distinct cards for the two categories. The focused test proves the X Antibody and Kota cards are added and the third card is bottom-decked; the inherited event, placement primitive, and Q1601–Q1604 were inspected for the source-placement boundary.

**Boundaries and stack.** X Antibody is a trait match; Kota Domoto is a name match. The inherited trigger is effect-driven placement, not ordinary digivolution, consistent with Comprehensive §8-1-2-7 and Q1602. It triggers once for a simultaneous placement event (Q1603) and can trigger when Dorumon itself is placed under a host (Q1604). No proven implementation gap or ambiguity was found.

**Score:** 2/2 clause coverage, 2/2 timing/frequency, 2/2 category/source boundaries, 2/2 reveal/stack behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-057 — Monitamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a black level 3, play cost 3, 2000 DP, Black level 2 evolution cost 0 Rookie / Data / CRT. On play, reveal the top 3 cards, add one card with Knightmon in its name or one DeadlyAxemon, then bottom-deck the remaining cards.

**Direct, snapshot, and tests.** The direct module uses RevealAdd count 3, one add target with a Knightmon name filter OR a DeadlyAxemon name filter, and bottom-deck remainder. The generated snapshot is structurally exact. The focused test proves the Knightmon the integration branch and the deck remainder; the DeadlyAxemon OR branch was inspected statically and against the catalog's exact card name. Reveal primitive behavior prevents one revealed instance from being counted twice. No proven implementation gap or ambiguity was found.

**Boundaries and stack.** The name test is substring matching for Knightmon, while DeadlyAxemon is an explicit alternate name. The effect has no color restriction beyond the card's identity and no inherited/evolution-stack clause. It adds at most one eligible card.

**Score:** 2/2 clause coverage, 2/2 timing/cardinality, 2/2 name/OR boundaries, 2/2 reveal/zone behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-058 — SkullKnightmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a black level 4, play cost 4, 3000 DP, Black level 3 evolution cost 2 Champion / Virus / Undead. When attacking, it may trash all digivolution cards of one of your DeadlyAxemon, place that permanent at the bottom of this Digimon's stack, and digivolve this Digimon into a DarkKnightmon in hand without paying memory. Its inherited Your Turn clause gives this Digimon Security Attack +1 while this Digimon has Knightmon or Bagramon in its name.

**Direct authority and correction.** The attack action is optional, self-targeted, hand-restricted to DarkKnightmon, free of memory payment, and uses a structured `place` cost targeting one of your DeadlyAxemon permanents in the battle area, moving all of that permanent's sources and placing it at the bottom of this host's stack. The inherited action was corrected: it now targets only self and carries `selfHasNameContaining` for Knightmon or Bagramon. The former direct filter selected every own Digimon named Knightmon/Bagramon, which violated the printed “this Digimon” boundary and could grant unrelated hosts Security Attack +1.

**Snapshot drift and tests.** The generated snapshot has the correct optional DarkKnightmon evolution and a self/name-conditioned Aura, but its cost is an older generic trash-zone shape rather than the direct structured permanent-placement cost. The snapshot's inherited Aura is useful corroborating evidence for the corrected self/name semantics; direct TypeScript remains authority. The existing focused behavior test proves DeadlyAxemon source trash, bottom placement, free DarkKnightmon evolution, and the draw; a new static test proves self targeting and the name condition. BT7-059 is the same-mechanism peer with the correct self/name boundary.

**Boundaries and stack.** Q1605 confirms a DeadlyAxemon with no sources is legal; Q1606 confirms sources such as X Antibody are trashed when the selected DeadlyAxemon is moved. Only your battle-area DeadlyAxemon is eligible, and its entire source stack is handled by the cost. The inherited keyword belongs only to the host whose top name contains Knightmon or Bagramon; it does not target other Digimon. No Security effect is added to the DarkKnightmon destination by this clause.

**Score:** 2/2 clause coverage, 2/2 timing/optionality, 2/2 self/name/zone boundaries, 2/2 placement/stack behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-059 — DeadlyAxemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a black level 4, play cost 4, 3000 DP, Black level 3 evolution cost 2 Champion / Virus / Dark Animal. On play, reveal the top 5 cards and add up to two Knightmon-named cards; bottom-deck the remainder. Its inherited Your Turn clause gives the host +2000 DP while the host has Knightmon or Bagramon in its name.

**Direct, snapshot, and tests.** The direct module uses RevealAdd count 5, up to two optional Knightmon name matches, and bottom-deck remainder. Its inherited Aura targets self and uses `selfHasNameContaining` for Knightmon/Bagramon with +2000 DP. The snapshot is structurally exact. Focused tests prove adding two, choosing only one from two eligible cards, and the positive/negative host-name boundary (BT7-058 versus BT1-009). This is the peer that corroborates the corrected BT7-058 inherited target model.

**Boundaries and stack.** “Up to two” is represented as optional selection with no requirement to invent a minimum. Knightmon is a name substring; the inherited bonus applies to the host, not every own Digimon. No color, Security, or special evolution clause is present. No proven implementation gap or ambiguity was found.

**Score:** 2/2 clause coverage, 2/2 timing/optionality, 2/2 name/self boundaries, 2/2 reveal/zone behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-060 — Grumblemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-051–060 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-051-060.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clause mapping.** This is a black level 4, play cost 5, 5000 DP, Black level 3 evolution cost 2 Hybrid / Variable / Demon. Its entire effect is that it may evolve from hand onto one of your black Tamers as if the Tamer were a level 3 black Digimon.

**Direct, snapshot, and tests.** The direct module uses the shared static Tamer-onto `Digivolve` action, targeting one of your Black Tamers, with `asLevel: 3` and `from: "hand"`. The alternate requirement metadata records the Tamer base and Black color; the actual cost is derived by `tamerOntoDigivolve`, not the stale marker's `cost: 0`. The generated snapshot has the same action but omits `baseColors` from the requirement metadata; shared card-data/tamer primitives derive and enforce the Black Tamer path. The focused test proves evolution from a black Tamer for 2 memory. Q1607–Q1612 and Q4647 were checked for Tamer-as-Digimon effects, draw/effect inheritance, source cleanup, Security boundaries, and no decline after declaration.

**Boundaries and stack.** The `onto` target is your Black Tamer only; Grumblemon's Hybrid/Variable/Demon traits do not broaden the base target. The Tamer becomes the lower stack card and ordinary “played this turn cannot attack” and source-effect rules remain applicable. No Security clause is added. No proven implementation gap or ambiguity was found.

**Score:** 2/2 clause coverage, 2/2 alternate timing/legality, 2/2 Black-Tamer boundary, 2/2 cost/stack behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-061 — Gigasmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Black level-4 Digimon, play cost 6, DP 6000,
  Hybrid/Variable/Mineral, with a black level-3 evolution cost of 3. The card
  may digivolve from hand onto one of the controller's black Tamers as if that
  Tamer were a level-3 black Digimon, and it has Blocker.
- **Rules/QA evidence.** Q1614–Q1619 and Q4648 establish the Tamer-as-Digimon
  timing, bonus draw, same-turn attack limit, stack conversion, inherited vs
  Security text, and no-decline declaration boundaries. Rules §4-2 and §4-3
  establish Digimon/Tamer field status; §4-6/§4-7 establish the resulting
  digivolution-card stack.
- **Direct implementation.** `BT7-061.ts:9–47` uses a Static `Digivolve`
  action from hand onto one own black Tamer at level 3, plus an All Turns
  self-Aura granting Blocker. The alternate requirement now includes
  `baseIsTamer: true` and `baseColors: ["Black"]`; the latter was added for
  metadata consistency with the executable color filter and BT7-060/BT7-071
  peers. `cardData.ts` derives the actual cost 3 and special evolution path.
- **Focused/stack proof.** `BT7-061.test.ts` retains the legal black Tamer
  evolution path and now structurally asserts the black-Tamer requirement and
  separated Blocker Aura. The runtime fixture asserts the Tamer is replaced by
  the evolved card, the memory cost is paid, and Blocker is observable.
- **Trait/name/color boundary.** Only controller-owned black Tamers satisfy
  the action; no generic Tamer or nonblack Tamer path is introduced. The
  adjacent BT7-060 black-Tamer and BT7-071 purple-Tamer modules confirm the
  color-specific family pattern.
- **Snapshot drift.** `effects.json:114786–114804` has the black-Tamer Static
  action but stores Blocker as a top-level keyword and omits `baseColors`.
  History and runtime behavior require the direct All Turns Aura; the snapshot
  remained read-only.
- **Finding.** One metadata correction completed; no remaining printed-rule
  ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-062 — Dorugamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Black level-4 Digimon, play cost 6, DP 5000,
  Champion/Data/Beast Dragon/X Antibody, with a black level-3 cost of 2.
  During the opponent's turn, while another own Digimon has X Antibody or a
  card with that trait is in this Digimon's stack, it gains Blocker. Inherited
  All Turns: while the host has X Antibody, it gets +1000 DP.
- **Direct implementation.** `BT7-062.ts:17–101` targets self for the
  opponent-turn Blocker Aura and uses `anyOf`: `youHave` another own battle-area
  Digimon with X Antibody, or `selfDigivolutionStackHasTrait` for this stack.
  The inherited All Turns Aura targets self and grants +1000 only while the
  host has the trait. `excludeSelf: true` prevents the source itself from
  satisfying the “another” clause.
- **Focused/stack proof.** `BT7-062.test.ts` retains the stack fixture that
  proves an X-Antibody card in the source stack activates Blocker and that an
  X-Antibody host receives inherited +1000 DP. A new structural assertion
  proves self-targeting and both condition branches. BT7-056 supplies a legal
  black level-3 X-Antibody precursor; BT7-058/BT7-064/BT7-065 are the nearby
  black evolution/trait peers.
- **Trait/name/color boundary.** Trait matching is normalized across
  hyphen/space spelling. The target is self, not every X-Antibody Digimon;
  the second branch is stack-local, not a global board search. The direct
  test and matcher inspection cover both branches and the exclusion of self.
- **Snapshot drift.** `effects.json:114805–114850` targets X-Antibody Digimon
  broadly and only has the “another Digimon” branch; its inherited condition is
  raw text instead of a live stack-trait predicate. Direct IR is authoritative
  and the snapshot was not edited.
- **Finding.** No remaining direct gap or printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-063 — DarkKnightmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Black level-5 Digimon, play cost 7, DP 7000,
  Ultimate/Virus/Dark Knight, with a black level-4 cost of 3. On Play, it may
  place one SkullKnightmon and one DeadlyAxemon from hand and/or trash under
  itself in any order. All Turns, when it would be deleted, it may play one of
  each named card from this Digimon's digivolution cards suspended without
  paying memory costs.
- **Rules/QA evidence.** Q1621 proves the On Play effect may place either
  named card alone and Q1622 permits mixing hand and trash. Q1623 proves the
  optional replacement and the all-or-none requirement when both names are in
  the stack. Q1775 confirms that effect-play prevention is applied before a
  deletion effect; this replacement stays an ordinary effect-play operation,
  so the engine's play restrictions remain relevant.
- **Direct implementation.** `BT7-063.ts:5–60` uses one optional bottom
  `PlaceUnder` action from hand/trash, with
  `requiredNamesExactUpTo: ["SkullKnightmon", "DeadlyAxemon"]`, so either or
  both can be selected while preserving at most one of each name. The deletion
  replacement uses `requiredNamesExact` for the two own-stack names,
  `fromOwnDigivolutionStack: true`, `payCost: false`, and `suspended: true`.
  The exact requirement deliberately preserves Q1623's proven both-or-none
  behavior when both sources are present.
- **Shared correction.** `play.ts:283–315` now applies exact/up-to name
  selection to the `fromOwnDigivolutionStack` path. Before this correction the
  path ignored both fields and selected `matching.slice(0, cap)`, which could
  replay one source even when `requiredNamesExact` required the complete set.
- **Focused/stack proof.** `BT7-063.test.ts` now structurally asserts the
  On-Play up-to selection and own-stack exact selection. Existing cases cover
  extra same-name cards, mixed hand/trash material, arbitrary stack order, and
  Q1623's both-present suspended replay. A legal evolution reaches DarkKnightmon
  from either black level-4 SkullKnightmon or DeadlyAxemon at cost 3; the
  source-stack fixture explicitly contains both named cards.
- **Trait/name/color boundary.** Exact names prevent unrelated cards from
  entering the stack. The candidate pool uses the name union while the exact
  fields enforce one card per required identity. BT7-058 and BT7-059 are the
  same-set legal material peers; modern exact-name targeting was compared.
- **Snapshot drift.** `effects.json:114851–114918` has two unrelated sequential
  optional PlaceUnder actions and two sequential replay actions, lacks exact
  name constraints and the own-stack marker, and does not encode the proven
  all-or-none behavior. It was read-only evidence.
- **Finding and ambiguity.** The five proven direct/shared gaps were corrected
  for this card. **One ambiguity remains:** Q1623 explicitly addresses the
  case where both named cards are present, but does not state whether the
  replacement should play the sole available name when the other is absent.
  The direct IR conservatively retains `requiredNamesExact` (none if the full
  set cannot be selected) instead of inventing a one-card ruling; this needs a
  future ruling or product decision.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-064 — DoruGreymon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Black level-5 Digimon, play cost 8, DP 7000,
  Ultimate/Data/Beast Dragon/X Antibody, with a black level-4 cost of 3.
  When Digivolving, it may place one black card with X Antibody from hand at
  the bottom of its stack, then prevents effect deletion and DP reduction until
  the end of the opponent's next turn. Inherited Your Turn: while the host has
  X Antibody, it gains Security Attack +1.
- **Direct corrections.** `BT7-064.ts:8–55` now makes the first effect an
  ordinary `WhenDigivolving` effect by removing the erroneous `isInherited:
  true`. It also removes the erroneous `kind: ["Digimon"]` restriction: the
  catalog says “black card,” and black `BT16-098 DORU-Din` is an Option with
  X-Antibody in its traits and is a valid stack card. The placement remains
  optional, hand-only, bottom-positioned, and gated by `ifThisEffectActed` for
  both protections through opponent-turn end. The second effect remains an
  inherited, once-per-turn-compatible Your Turn Security Attack Aura condition
  on the host's stack trait.
- **Focused/stack proof.** `BT7-064.test.ts` adds structural proof that only
  the Security Attack clause is inherited, changes the protection fixture to a
  legal black level-4-to-level-5 stack, and adds a black X-Antibody Option
  boundary case using BT16-098. It retains the protection-duration case and
  adds a host stack case proving inherited Security Attack only while
  DoruGreymon is beneath another Digimon.
- **Peers and boundaries.** BT7-062, BT7-065, BT7-104, and adjacent X-Antibody
  cards were compared for trait token spelling, stack conditions, and inherited
  timing. The black-color filter excludes nonblack X-Antibody cards while the
  absence of a kind filter admits the catalog-proven Option boundary.
- **Restriction.** The local banlist restricts BT7-064 to one copy effective
  2022-11-11; no effect implementation is changed for that deck rule.
- **Snapshot drift.** `effects.json:114919–114978` marks the ordinary
  When Digivolving protection as inherited, incorrectly requires a Digimon
  target, and omits the `ifThisEffectActed` conditions. Direct IR is
  authoritative; the snapshot was not edited.
- **Finding.** Three direct gaps for this card were corrected: inherited
  marker, overly narrow kind boundary, and the focused test's invalid inherited
  fixture. No additional printed ambiguity remains.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-065 — Dorugoramon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Black level-6 Digimon, play cost 11, DP 11000,
  Mega/Data/Beast Dragon/X Antibody, with a black level-5 cost of 3. During
  the owner's turn, it gets +1000 DP per X-Antibody card in its digivolution
  cards. When attacking, once per turn, it may place one X-Antibody card from
  hand at the bottom of its stack, then delete up to two opposing Digimon with
  play costs no greater than this Digimon's digivolution-card count.
- **Direct implementation.** `BT7-065.ts:5–57` uses a Your Turn +1000
  `ModifyDP` scaling over the source's X-Antibody stack cards. Its
  `WhenAttacking` effect is `OncePerTurn`, places one own hand card with
  X-Antibody at the stack bottom, and conditionally deletes up to two opponent
  Digimon after successful placement. The dynamic cap is base zero plus one per
  source stack card via `playCostLteScaling`.
- **Focused/stack proof.** `BT7-065.test.ts` adds structural proof for the
  Once Per Turn placement and dynamic cap. Its runtime fixture now models a
  legal stack: black BT7-005 egg → BT7-056 Dorumon → BT7-058 SkullKnightmon →
  BT7-064 DoruGreymon → BT7-065 Dorugoramon. The three under-cards with
  X-Antibody produce a cap of 3, allowing the two play-cost-3 targets; the hand
  card is placed before deletion.
- **Trait/name/color boundary.** The placement target intentionally has no
  `kind` filter because the printed clause says “card with X-Antibody”; unlike
  BT7-064, this also preserves any future legal non-Digimon stack card. The
  delete target is explicitly opponent Digimon and the dynamic cap is measured
  on this source only. X-Antibody token normalization was compared with
  BT7-104 and current modules.
- **Snapshot drift.** `effects.json:114979–115028` scales ModifyDP using a
  broad Digimon filter and represents the attack effect as an unlinked generic
  Delete plus a separate placement cost. It does not preserve the direct
  successful-placement condition or direct source-stack hand placement. The
  snapshot was not edited.
- **Finding.** No remaining direct gap or printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-066 — AncientVolcanomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Black level-6 Digimon, play cost 13, DP 13000,
  Mega/Virus/Ancient Mineral/Ten Warriors, with a black level-5 cost of 5.
  When Digivolving, De-Digivolve 3 one opponent Digimon. On Deletion, it may
  play one black level-4-or-lower card with Hybrid in its traits from hand
  without paying memory.
- **Direct implementation.** `BT7-066.ts:9–58` uses an opponent Digimon
  target, amount 3 De-Digivolve, and an optional hand `PlayWithoutCost` filtered
  to black and level ≤4 with Hybrid trait. The target count is one and the
  play cost is false; no inherited marker or unrelated color is present.
- **Focused/stack proof.** `BT7-066.test.ts` adds structural proof for amount
  3 and the black/level/Hybrid boundaries. Its runtime case evolves from the
  legal black level-5 BT10-013 Shoutmon X5 and checks that three stack cards
  are removed from the opponent, exposing the expected card.
- **Peers/boundaries.** De-Digivolve and On Deletion play primitives were
  compared with adjacent level-6 cards; the hand source and optionality are
  explicit. Hybrid is a trait match, not a form or name match.
- **Snapshot.** `effects.json:115029–115064` matches the direct De-Digivolve
  and optional black Hybrid play shape. No snapshot drift requiring a direct
  correction was found.
- **Finding.** No remaining direct gap or printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-067 — Ghostmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Purple level-3 Digimon, play cost 3, DP 5000,
  Rookie/Data/Ghost, with a purple level-2 evolution cost of 1 and no effect
  or inherited-effect text.
- **Direct implementation.** `BT7-067.ts:1–5` registers a residual-free
  empty compiled record. This is intentional and is the complete executable
  authority for the effectless card.
- **Focused/stack proof.** `BT7-067.test.ts` now imports the direct module and
  asserts `coverage: "full"`, empty residuals, and `effects: []`, while the
  existing metadata/play test checks the catalog fields, play cost, DP, and
  absence of a pending decision.
- **Peers/boundaries.** Purple Rookie effectless metadata was compared with
  nearby purple cards; no trait-based effect can accidentally select or grant
  behavior to Ghostmon.
- **Snapshot.** `effects.json:115065` exactly matches the empty direct record.
- **Finding.** No remaining direct gap or printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-068 — Lopmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Purple level-3 Digimon, play cost 3, DP 2000,
  Rookie/Data/Beast, with a purple level-2 evolution cost of 0. Inherited:
  during the owner's turn, once per turn, when the owner plays a Tamer, gain 1
  memory.
- **Direct implementation.** `BT7-068.ts:8–34` uses an inherited Your Turn
  `SubTrigger` for `whenPlayed`, source-filtered to own Tamers, with
  `frequency: "OncePerTurn"` and `GainMemory: 1`. The event source defaults to
  the owner's seat and does not match opponent Tamers.
- **Focused/stack proof.** `BT7-068.test.ts` adds structural proof for the
  inherited marker, Tamer source filter, trigger, and Once Per Turn identity.
  The existing legal purple stack fixture (BT7-068 beneath a higher-level
  host) plays a Tamer and asserts one memory.
- **Peers/boundaries.** Tamer watcher and inherited trigger semantics were
  compared with same-mechanism SubTrigger cards; trait Beast and purple color
  are catalog metadata only and do not widen the Tamer event.
- **Snapshot.** `effects.json:115066–115084` matches the direct inherited
  watcher and Once Per Turn shape.
- **Finding.** No remaining direct gap or printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-069 — Eyesmon: Scatter Mode

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Purple level-4 Digimon, play cost 4, DP 4000,
  Champion/Virus/Dark Dragon, with a purple level-3 evolution cost of 2.
  On Deletion, draw 3, then trash 2 cards from hand.
- **Direct implementation.** `BT7-069.ts:8–33` uses sequential On Deletion
  `Draw` amount 3 followed by `Trash` count 2 filtered to the controller's
  hand. The sequence is not optional and the second action resolves after the
  draw, as printed.
- **Focused/stack proof.** `BT7-069.test.ts` adds structural proof for the
  exact action order and counts, while the existing deletion test asserts the
  resulting hand/trash quantities. The deletion primitive and stack-leave
  rules were inspected for source removal timing.
- **Peers/boundaries.** Purple deletion-to-hand manipulation peers were
  compared; the trash target is explicitly the owner's hand, not field cards,
  opponent hand, or the deleted stack.
- **Restriction.** The local banlist restricts BT7-069 to one copy effective
  2023-11-17; this remains a deferred deck/collection gate, not an effect IR
  change.
- **Snapshot.** `effects.json:115085–115097` matches the direct Draw 3 then
  hand Trash 2 shape.
- **Finding.** No remaining direct gap or printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-070 — Wendigomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-061–070 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-061-070.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

- **Catalog clause.** Purple level-4 Digimon, play cost 5, DP 5000,
  Champion/Virus/Beastkin, with a purple level-3 evolution cost of 2. When
  Digivolving, it may reveal the top five cards, trash all revealed Tamers,
  and put the remaining cards at the deck bottom in any order. Inherited Your
  Turn Once Per Turn: when the owner plays a Tamer, draw 1.
- **Direct implementation.** `BT7-070.ts:13–55` uses one optional
  `RevealAdd` action with `revealCount: 5`, `trashFilter: { kind: ["Tamer"] }`,
  `rest: "deckBottom"`, and no add-to-hand cards. `runRevealAdd` makes the
  revealed-Tamer trash mandatory after the optional reveal is accepted and
  orders the remaining revealed cards for deck bottom. The inherited
  `SubTrigger` is own-Tamer, Your Turn, and Once Per Turn, with Draw 1.
- **Rules/QA evidence.** Q1624/Q1625 establish optional activation and
  mandatory trashing of every revealed Tamer; rules §4-26's each/every and
  bottom-ordering semantics support the single reveal action.
- **Focused/stack proof.** `BT7-070.test.ts` adds structural proof for reveal
  count, Tamer-only revealed trash, deck-bottom remainder, optionality, and the
  inherited Tamer draw. The existing legal purple level-3-to-level-4
  evolution fixture reveals two Tamers and three Digimon and asserts both
  Tamers are trashed and three cards remain in deck.
- **Trait/name/color boundary.** The revealed filter is card kind Tamer, not a
  global Tamer search; unrelated battlefield Tamers remain untouched. The
  inherited watcher matches own Tamers only and does not use Beastkin as an
  event filter.
- **Snapshot drift.** `effects.json:115098–115126` has a RevealAdd without
  `trashFilter` followed by a separate unrestricted Tamer Trash action. That
  stale representation could trash Tamers outside the revealed set. Direct IR
  and the reveal primitive are authoritative; the snapshot was not edited.
- **Finding.** The direct implementation already had the corrected reveal
  semantics; focused structural proof was added. No remaining direct gap or
  printed-rule ambiguity.

Score: catalog 2/2, direct IR 2/2, focused behavior 2/2,
peers/boundaries 2/2, executed gates 0/2 = **8/10 provisional**.

### BT7-071 — Loweemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 4 Digimon, play cost 5, 5000 DP, purple level 3 evolution cost 2,
Hybrid/Variable/Warrior. It may digivolve from hand onto one purple Tamer as if that Tamer were a
level 3 purple Digimon.

The single local KB query was `node tools/kb/query.mjs card BT7-071`; it returned Q1626-Q1629,
Q1630, Q1631, and Q4649. Q1626-Q1629 confirm the Tamer-onto digivolution is Digimon digivolution
for triggers and bonus draw, that a Tamer played this turn retains its attack restriction, that
the Tamer becomes a digivolution card, and that the Tamer's Security text is not inherited while
its inherited text is. Q1630 confirms the inherited-text boundary. Q1631/Q4649 establish the
legal-declaration and no-decline behavior. No erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-071.ts` is a Static `Digivolve` action from hand onto
one owner-controlled purple Tamer, as level 3, plus an alternate requirement with a purple Tamer
base. It is full coverage, residual-free, and exclusively registered with `registerIrCard`.

The shared `registerTamerOntoFromEffects` and `matchingAlternateDigivolutionRequirement` path
derives the live purple-Tamer route from the static action and the catalog's ordinary purple level
3 cost. `tamerOntoDigivolveLevel` supplies the level-3 compatibility and the normal stack/draw
procedure supplies the Tamer stack card. The focused test builds the legal purple Tamer-to-Loweemon
stack and confirms memory 3 becomes 1 and Loweemon is the stack top. Same-mechanism Tamer-onto
peers BT7-011, BT7-046, and BT7-073 were compared; purple versus non-purple Tamer and Digimon
boundaries are enforced by the direct target filter.

Snapshot drift: the generated BT7-071 record has the matching Static onto action but publishes a
stale alternate requirement cost of 0 and omits the direct purple base-color metadata. That
metadata is not used as executable authority for this direct module, so the snapshot was not
edited. This is evidence drift, not a proven direct behavior gap.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-072 — Eyesmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 4 Digimon, play cost 6, 5000 DP, purple level 3 evolution cost 2,
Champion/Virus/Dark Dragon. When this card is trashed from hand by one of the owner's effects, if
`[Eyesmon: Scatter Mode]` is already in that owner's trash, it may play itself from trash without
paying its cost. During the owner's turn, it gets +2000 DP for each `[Eyesmon: Scatter Mode]` in
that trash.

The single local KB query was `node tools/kb/query.mjs card BT7-072`; it returned the restriction
result naming BT7-069 Eyesmon: Scatter Mode and Q1633. The restriction is on BT7-069 at one copy,
not this BT7-072 card. Q1633 confirms the named-card and trash-count interpretation used by this
effect. No target-specific erratum applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-072.ts` is:

- An all-turn `whenTrashedFromHand` subtrigger sourced to this hand card, with an optional free
  self-play from trash conditioned on an owner-trash exact-name `Eyesmon: Scatter Mode`.
- A Your Turn self `ModifyDP` of +2000, with one unit per owner-trash exact-name
  `Eyesmon: Scatter Mode`, lasting through the relevant turn end.
- Full coverage, residual-free output and exactly one exclusive `registerIrCard` registration.

The hand-trash event bus fires only for a card moved from hand and carries the effect-driving seat;
the self-resident watcher remains available while the source leaves hand. The name-exact matcher
requires the literal full card name, unlike the broader name-token matcher, so similarly named or
wrong-color cards do not count. Trash scaling counts owner trash cards, and the DP ledger uses the
turn duration rather than permanently mutating card DP. Same-mechanism hand-trash peers BT7-076,
BT7-077, BT6-006, BT6-069, and BT6-073 were checked. The focused test places BT7-072 and BT7-069
in hand, trashes the former by effect, and proves the free play; the legal purple level-3-to-level-4
stack is represented by catalog data.

Snapshot drift: the generated first subtrigger is structurally close but has broader raw condition
metadata; the generated Your Turn bonus uses `permanent` duration and a broad name matcher rather
than the direct exact-name, until-turn-end form. The direct module is executable authority and the
snapshot remains untouched. The production effect-trashing paths supply the by-effect seat needed
for the printed hand-effect boundary; no direct gap was proven.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-073 — KaiserLeomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 4 Digimon, play cost 6, 6000 DP, purple level 3 evolution cost 3 or
purple level 4 cost 1, Hybrid/Variable/Cyborg. It may digivolve from hand onto one purple Tamer as
if that Tamer were a level 3 purple Digimon for cost 2. When Digivolving, if a Hybrid trait or
Koichi Kimura is in its stack, it gains Retaliation until the opponent's next turn ends.

The single local KB query was `node tools/kb/query.mjs card BT7-073`; it returned Q1634-Q1639 and
Q4650. The rulings repeat the Tamer-onto stack, draw, played-this-turn attack restriction,
Security-text, inherited-text, and legal-declaration boundaries, and Q4650 confirms the
Retaliation timing/stack condition. No erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-073.ts` is a purple-Tamer alternate Digivolve from
hand at cost 2/as level 3, followed by a When Digivolving Retaliation keyword grant through the
opponent's next turn end when the live stack contains Hybrid or exact Koichi Kimura. The module is
full coverage, residual-free, and exclusively registered with `registerIrCard`.

The shared alternate-digivolution path checks the owner-controlled purple Tamer and applies the
direct cost suffix; the stack matcher separates the Hybrid trait from the exact Koichi Kimura name.
The Retaliation ledger expires at the opponent's next-turn end and uses the mandatory keyword
semantics from comprehensive §16-13. The focused test evolves a Hybrid BT7-071 stack into this
card at memory 1 and checks Retaliation. BT7-011, BT7-046, and BT7-073 were compared for Tamer-onto
boundaries, and the legal purple level-3/4-to-level-4 stack is represented in catalog/test data.

Snapshot: no material drift from the direct action, condition, cost, or duration. The generated
record was read only.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-074 — Antylamon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 5 Digimon, play cost 6, 7000 DP, purple level 4 evolution cost 3,
Ultimate/Virus/Holy Beast. When Digivolving, it may play one purple Tamer with play cost 3 or less
from trash without paying its cost.

The single local KB query was `node tools/kb/query.mjs card BT7-074`; it returned no entries. No
erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-074.ts` is an optional When Digivolving
`PlayWithoutCost` selecting one owner-controlled purple Tamer from trash with `playCostLte: 3`
and `payCost: false`. It is full coverage, residual-free, and exclusively registered with
`registerIrCard`.

The shared play-from-trash path validates the loose Tamer card, owner, color, and play-cost bound;
the optional action can be declined and free play leaves the chosen card out of trash. The focused
test evolves a legal purple level-4 base, supplies BT7-091 in trash, and checks the Tamer enters
the battle area. BT7-074 was compared with the Tamer-play mechanisms on BT7-079 and BT7-080; the
legal purple level-4-to-level-5 evolution is represented by catalog/test data.

Snapshot: no material drift from the direct target, trash source, optionality, free-play flag, or
play-cost bound. The generated record was read only.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-075 — Rhihimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 5 Digimon, play cost 7, 7000 DP, purple level 4 evolution cost 3,
Hybrid/Variable/Warrior. When one of the owner's Digimon with a Tamer card in its stack digivolves
into this card from hand, its digivolution cost is reduced by 2. On Deletion, if a Hybrid is in its
stack, it may play one purple Tamer from trash without paying its cost.

The single local KB query was `node tools/kb/query.mjs card BT7-075`; it returned Q1641. Q1641
confirms the Tamer-in-stack cost-reduction condition and the Hybrid stack condition for the
deletion clause. No erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-075.ts` is a hand-resident digivolution
`CostModifier` of -2 restricted to this Rhihimon destination and an owner Digimon whose stack
contains a Tamer, plus an optional On Deletion free play of one owner purple Tamer from trash when
the live stack contains Hybrid. The module is full coverage, residual-free, and exclusively
registered with `registerIrCard`.

The shared cost-modifier primitive checks that the source remains in hand, that the destination is
Rhihimon, and that the evolution base is a Digimon with a Tamer stack card before changing the
evolution cost. It therefore does not reduce another destination or a base without a Tamer. The
deletion watcher evaluates the live deleted stack before it is removed, and the free-play path
enforces purple Tamer/trash ownership. The focused tests cover a legal BT7-071-under-Tamer stack
with memory 1 becoming 0 and a Hybrid stack deletion that plays a Tamer while leaving Hybrid in
trash. BT7-075 was compared to BT7-073 alternate evolution and same-mechanism cost-modifier peers;
the legal purple level-4-to-level-5 stack is represented in the fixture.

Snapshot drift: the generated record has a broad hand-resident When Digivolving replacement with
no Rhihimon destination or Tamer-stack base filter. The direct CostModifier is executable
authority; the snapshot was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-076 — Orochimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 5 Digimon, play cost 8, 8000 DP, purple level 4 evolution cost 3,
Ultimate/Virus/Dark Dragon. When this card is trashed from hand by one of the owner's effects, it
draws 1. Its inherited When Attacking effect may trash one card from the owner's hand to gain 1
memory, once per turn.

The single local KB query was `node tools/kb/query.mjs card BT7-076`; it returned no entries. No
erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-076.ts` is an all-turn hand-trash subtrigger sourced
to this card and drawing 1, plus an inherited When Attacking optional hand-trash cost followed by
GainMemory(1) with `OncePerTurn`. It is full coverage, residual-free, and exclusively registered
with `registerIrCard`.

Correction made: the hand-trash watcher now requires the trashing effect to be driven by this
card's owner (`bySourceController: "mine"`), matching “by one of your effects.” The focused test
now also proves an opponent effect trashing Orochimon from hand does not draw.

The shared hand-trash event path observes the source instance and effect-driving seat. The
inherited-effect path attaches the attack watcher to a legal host stack, and the optional cost
aborts the follow-up memory gain when no hand card is trashed; the once-per-turn ledger blocks a
second use in the same turn. The focused tests cover hand trash drawing BT7-072 and the inherited
attack cost/memory sequence on a BT7-077 host. BT7-077 and BT6-006/BT6-069/BT6-073 were compared
for hand-trash timing and inherited mechanics; the legal purple level-4-to-level-5 stack is in
catalog/test data.

Snapshot drift: the generated hand-trash trigger omits the direct self source filter, and the
inherited effect is decomposed as a stale trash cost plus GainMemory action. The direct module is
executable authority and the snapshot remains untouched.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 1; ambiguities 0.

### BT7-077 — Nidhoggmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 6 Digimon, play cost 12, 11000 DP, purple level 5 evolution cost 3,
Mega/Virus/Dark Dragon. When this card is trashed from hand by one of the owner's effects, it
gains 1 memory. When Digivolving, it may trash one card from hand to delete one opponent level 4
or lower Digimon.

The single local KB query was `node tools/kb/query.mjs card BT7-077`; it returned no entries. No
erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-077.ts` is an all-turn self-sourced hand-trash
subtrigger with owner-seat GainMemory(1), and an optional When Digivolving Delete targeting one
opponent Digimon at level 4 or lower with an optional hand-trash cost. It is full coverage,
residual-free, and exclusively registered with `registerIrCard`.

The hand-trash event and effect-driving-seat gates enforce the printed owner-effect condition. The
delete action uses the optional hand-trash cost and cannot resolve its deletion when the required
cost card is not chosen; the level comparison is applied to the opponent target only. The focused
test proves the hand-trash memory trigger and proves the negative case in which no hand cost means
no deletion. BT7-076 and other hand-trash peers were compared, and the legal purple level-5-to-
level-6 evolution is represented by catalog/test data.

Snapshot drift: the generated hand-trash subtrigger omits the direct self source filter and
publishes the same effect body without the direct source-boundary metadata. The direct module is
executable authority; the snapshot was not edited.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-078 — AncientSphinxmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 6 Digimon, play cost 13, 13000 DP, purple level 5 evolution cost 5,
Mega/Virus/Ancient Mythical Beast/Ten Warriors. When Digivolving, it may delete one of the owner's
Digimon with Ten Warriors or Hybrid in its traits to delete one opponent Digimon whose level is no
greater than the deleted Digimon's level. On Deletion, it may play one purple level 4 or lower
Hybrid card from hand without paying its cost.

The single local KB query was `node tools/kb/query.mjs card BT7-078`; it returned Q1642. Q1642
confirms that AncientSphinxmon itself may be the deleted Ten Warriors cost, and that the opponent
level bound is evaluated against the deleted Digimon's actual level. No erratum or restriction
applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-078.ts` is an optional When Digivolving Delete with
an owner Digimon cost filtered to the Ten Warriors or Hybrid trait union, followed by an opponent
target with `levelComparison: { op: "lte", relativeTo: "lastDeleted" }`. Its On Deletion action
optionally plays one owner purple Hybrid card at level 4 or lower from hand for free. The module
is full coverage, residual-free, and exclusively registered with `registerIrCard`.

The delete-own cost handler captures `ctx.lastDeletedLevel` before moving the cost permanent, and
the permanent matcher applies that dynamic level bound to the opponent target. Trait matching is
the explicit Ten Warriors-or-Hybrid union; wrong traits and opponent-owned cost candidates are
excluded. The focused test uses a legal level-5 base, a BT7-073 Hybrid cost permanent, and an
opponent level-4 Digimon, proving the cost is deleted and the target is removed. Dynamic-level
peers and tests such as BT8-107, BT17-071, and `lastDeletedLevel.test.ts` were compared; the legal
purple level-5-to-level-6 stack is represented in the fixture.

Snapshot drift: the generated Delete target lacks the direct `relativeTo: "lastDeleted"` level
comparison, while the own-delete cost and On Deletion play body are otherwise close. The direct
dynamic bound is executable authority; effects.json was not edited. A stale module comment was
also corrected from an incorrect level-7 description to the catalog's actual level 6; behavior was
not changed.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-079 — Cherubimon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: purple level 6 Digimon, play cost 13, 12000 DP, purple level 5 evolution cost 4,
Mega/Vaccine/Cherub. When Digivolving, it may play one purple Tamer from trash without paying its
cost; then, for each Tamer the owner has in play, it deletes one opponent level 4 or lower
Digimon. On Deletion, for each Tamer the owner has in play, it may play one level 3 Digimon from
trash without paying its cost.

The single local KB query was `node tools/kb/query.mjs card BT7-079`; it returned Q1643. Q1643
confirms that declining the optional Tamer play does not suppress the following `Then` deletion;
the deletion remains mandatory whenever an eligible target exists. No erratum or restriction
applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-079.ts` is an optional free purple-Tamer play from
trash followed by a Delete action scaled once per owner battle-area Tamer against opponent level 4
or lower Digimon. The Delete action is now mandatory (no `optional: true`); the On Deletion free
level-3 Digimon play remains optional and is scaled once per owner battle-area Tamer. The module is
full coverage, residual-free, and exclusively registered with `registerIrCard`.

Correction made: the prior direct IR incorrectly marked the post-`Then` Delete optional. That
violated Q1643 and comprehensive §15-1-5, which require a mandatory following clause after the
optional first action. The direct module now makes only the trash-Tamer play optional. The focused
test was strengthened in `apps/api/src/cards/BT7/BT7-079.test.ts` with static assertions proving
the first action is optional, the deletion keeps its opponent level-4-or-lower and per-Tamer
scaling boundaries, and the deletion has no optional flag. Its existing behavior case proves one
Tamer is played and two of three level-4 opponents are deleted when two Tamers are present. The
legal purple level-5-to-level-6 evolution is represented by the fixture; BT7-074 and BT7-080 were
compared as same-mechanism Tamer-play peers.

The shared `Then` sequencing path preserves the deletion after a declined first action, while the
scaling primitive counts current owner Tamers and the target matcher enforces opponent ownership
and level. Snapshot drift: generated effects still marks this Delete optional, so the snapshot now
also records the old bug and remains read-only.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 1; ambiguities 0.

### BT7-080 — Neemon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-071–080 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-071-080.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

Catalog contract: white level 3 Digimon, play cost 3, 2000 DP, Rookie/Data/Beast, with no
evolution cost. On Play, it may play one Tamer with an inherited effect from hand without paying
its cost. During all turns, once per turn, when one of the owner's Digimon with a Tamer in its
stack is deleted, it may play one Tamer from trash without paying its cost.

The single local KB query was `node tools/kb/query.mjs card BT7-080`; it returned Q1644. Q1644
confirms that the Tamer previously in a deleted Digimon's stack can be played from trash by the
deletion trigger. No erratum or restriction applies.

Direct evidence in `apps/api/src/cards/BT7/BT7-080.ts` is:

- An optional On Play free play from hand restricted to Tamers with `hasInheritedEffects: true`.
- An all-turn, once-per-turn `onDeletionOf` subtrigger sourced to an owner Digimon whose
  digivolution stack contains a Tamer, followed by an optional free Tamer play from trash.
- Full coverage, residual-free output and exactly one exclusive `registerIrCard` registration.

The shared deletion watcher retains the deleted permanent's stack for source-filter matching, and
the `digivolutionStackKind: ["Tamer"]` predicate distinguishes a Tamer-bearing Digimon from a
bare Digimon or a permanent whose stack has no Tamer. The once-per-turn frequency is enforced by
the shared watcher ledger, and the play path keeps owner, Tamer, hand/trash, and free-play bounds.
The focused test covers the On Play inherited-effect Tamer boundary; BT7-079 and BT7-081 were
compared for Tamer play and deletion-stack mechanisms. The white level-3 card has no legal
evolution stack, as recorded in the catalog.

Snapshot drift: the generated On Play target is any Tamer and omits `hasInheritedEffects`; its
deletion source filter is broad (`Digimon`/`Tamer`) and omits the direct Tamer-in-stack predicate.
The direct module is executable authority and the snapshot was not edited. Q1644 and the deletion
watcher trace support the direct stack boundary; no direct gap was proven.

Score: Catalog/rules 2/2; direct IR/registration 2/2; interpreter trace 2/2; static
behavioral/peer/stack proof 2/2; executed gates 0/2. Corrections 0; ambiguities 0.

### BT7-081 — Bokomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clauses.** The committed catalog identifies White level 3, play cost 3, 2000 DP, Rookie / Vaccine / Mutant. On Play reveals five, adds one Hybrid or Ten Warriors trait card and one Tamer among them, and bottom-decks the remainder. During your turn once per turn, when one of your Tamers digivolves, it gains 2 memory.

**Direct and correction.** The direct module maps the first clause to `RevealAdd` with two distinct category slots and `deckBottom` remainder. Its second clause is Your Turn, once per turn, and watches a Digimon with a Tamer in its stack through `whenOneOfYoursDigivolves`, gaining 2 memory. The Hybrid/Ten Warriors slot was corrected from exact `trait` matching to `traitContains`, because the catalog says the qualifying traits occur “in its traits” (Comprehensive §2-3-2-4). Q1645 supports resolving whichever category is present rather than inventing a requirement that both must be present.

**Snapshot drift, tests, peers, and stack.** The snapshot uses exact `trait` matching and omits the direct `kind: ["Digimon"]` source boundary; both are recorded as drift and the snapshot remains read-only. `BT7-081.test.ts` proves both reveal categories, visible loose-card decisions, bottom ordering, the Tamer evolution gain, and the once-per-turn limit across two evolving Tamers; a new static proof asserts the substring trait mode. The BT7-085/087 Tamer-onto modules and tests were inspected as same-mechanism peers. The legal stack fixture evolves a Takuya Tamer into a Hybrid Digimon and confirms the Tamer remains in the stack while Bokomon gains memory.

**Boundaries.** Hybrid and Ten Warriors are trait-substring matches; Tamer is a card-kind match. The two selected instances cannot be the same revealed card because the reveal primitive tracks consumed instances. No inherited or Security clause is present.

**Score:** 2/2 clause coverage, 2/2 timing/frequency, 2/2 category/source boundaries, 2/2 reveal/stack behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-082 — Sistermon Blanc (Awakened)

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clauses.** The committed catalog identifies White level 3, play cost 5, 5000 DP, Rookie / Vaccine / Puppet, with a White level 3 evolution cost 2. On Play, it may place one Sistermon Blanc from hand or trash at the bottom of this Digimon's stack to Recovery +1 (Deck). On Deletion, it returns one card with Jesmon, Huckmon, or Sistermon in its name other than Sistermon Blanc (Awakened) from your trash to hand.

**Direct and corrections.** The direct module uses an optional `SecurityManipulation` add-top action whose placement cost places a Sistermon Blanc under self, followed by the deck-top recovery. Its deletion return filter correctly excludes the Awakened name and targets your trash. Two proven boundaries were corrected: the placement-cost source changed from `["hand", "trash", "digivolutionCards"]` to `["hand", "trash"]`, and the placement name mode changed from substring `name` to exact `nameExact`. The catalog and Q1646 permit only the regular Sistermon Blanc in hand or trash; allowing a stack source or Sistermon Blanc (Awakened) was therefore incorrect.

**Snapshot drift and tests.** The generated snapshot also carries the overbroad digivolution-cards source and substring placement name mode; both are recorded as drift and it was not edited. `BT7-082.test.ts` proves the hand placement and recovery; its static proof asserts the corrected source-zone list, exact name mode, bottom destination, self host, and optional cost. BT7-083 is the same Sistermon placement/deletion peer.

**Boundaries and stack.** The placement clause is an exact bracket-only Sistermon Blanc name reference, while the recovery filter accepts Jesmon/Huckmon/Sistermon substrings and excludes this card's own Awakened name, matching Q1646–Q1647. The legal stack is the card itself with a hand Sistermon Blanc placed under it; no Security effect is printed.

**Score:** 2/2 clause coverage, 2/2 timing/optionality, 2/2 name/source boundaries, 2/2 recovery/stack behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-083 — Sistermon Ciel (Awakened)

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-081-090.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clauses.** This is White level 4, play cost 6, 6000 DP, Champion / Data / Virus / Puppet, with a White level 4 evolution cost 2. On Play, it may place one Sistermon Ciel from hand or trash at the bottom of this Digimon's stack to delete one opponent Digimon with play cost 5 or less. On Deletion, it returns one Jesmon/Huckmon/Sistermon-named card other than Sistermon Ciel (Awakened) from your trash to hand.

**Direct, correction, and snapshot.** The direct module sequences optional `PlaceUnder` from hand/trash, bottom under self, with `abortOnDecline`, then conditionally deletes an opponent Digimon with play cost ≤5 only if the placement acted. The placement name mode was corrected from substring `name` to exact `nameExact`, because Q1648 and Comprehensive §2-3-1-2 permit only the regular Sistermon Ciel; its On Deletion return filter mirrors BT7-082 with the Ciel Awakened exclusion. A static `GrantStatic` rule was also added for the printed “also treated as Sistermon Noir (Awakened)” name alias. The snapshot expresses the same transaction through a placement cost on the Delete action and retains substring placement matching rather than the direct exact mode; this is recorded representation drift, while the direct sequence is executable authority and preserves the “if you do” dependency.

**Tests, peers, and stack.** `BT7-083.test.ts` proves placing a hand Sistermon Ciel, deleting a play-cost-5 opponent Digimon, and preserving the source under the Ciel host; its static proof asserts exact placement name mode and the Sistermon Noir (Awakened) alias. BT7-082 is the same-mechanism peer for the Sistermon source and deletion recovery. Q1648 confirms the exact non-Awakened name boundary; Q1649 confirms the deletion recovery name union; Q1650 records the card's rule alias and Virus trait without changing this effect's direct target.

**Boundaries.** The placement source is hand/trash only; the delete target is opponent Digimon only and uses play cost, not DP or level. Declining or failing the placement cannot activate the conditional deletion. No Security clause is present.

**Score:** 2/2 clause coverage, 2/2 timing/optionality, 2/2 target/name/source boundaries, 2/2 conditional deletion/stack behavior, 0/2 executed gates = **8/10 provisional**.

### BT7-084 — Eosmon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** White level-6 Mega Digimon with White/Green level-5 evolution recipes, Your Turn other-Eosmon +1000 DP, and optional On Deletion level-5-or-lower Eosmon hand play.
2. **Your Turn aura (1/1):** `ModifyDP` targets all owner Eosmon by name while excluding self, with +1000 permanent duration under the Your Turn trigger.
3. **On Deletion (1/1):** The effect optionally plays exactly one owner Eosmon of level 5 or lower from hand without cost.
4. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-084` reports no rulings or unresolved ambiguity.
5. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-084", compiled)` registration are present.
6. **Static primitive trace (1/1):** Your Turn timing, exclude-self behavior, all-target count, Eosmon name filter, DP amount/duration, On Deletion timing, level ceiling, hand source, optionality, and free play are explicit.
7. **Target/controller fidelity (1/1):** Both clauses use owner controller and exact Eosmon name matching; the aura does not buff this source itself.
8. **Evolution contract (1/1):** The module leaves the catalog's White/Green level-5 evolution recipes to standard card data without introducing alternate requirements.
9. **Clause completeness (1/1):** Your Turn and On Deletion text map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; other-Eosmon exclusion, turn timing, level-5 boundary, optional refusal, and deletion trigger remain unproven.

Remaining work is focused behavioral proof of the aura and On Deletion boundaries; this card is not formally complete at 10/10.

### BT7-085 — Takuya Kanbara

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog/rulings (1/1):** Red Tamer costing 3 with Security free play, once-per-turn Main placement of five Hybrid trash cards and optional EmperorGreymon evolution, plus inherited Your Turn DP/Security Attack effects; Q1651–Q1654 and Q3261 are available.
2. **Main placement/evolution (1/1):** `PlaceUnder` takes exactly five Hybrid cards from trash beneath this Tamer, and the gated Digivolve targets only EmperorGreymon from hand while charging its cost.
3. **Ruling boundaries (1/1):** Count gating, optional evolution, and virtual level-5 red source context align with Q1652–Q1654/Q3261.
4. **Inherited DP (1/1):** Your Turn inherited aura grants +2000 DP.
5. **Inherited Security Attack (1/1):** A second Your Turn aura grants Security Attack +1 while live DP is at least 10000.
6. **Security (1/1):** Security plays this Tamer without cost.
7. **Direct IR/registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-085", compiled)` registration are present.
8. **Static primitive trace (1/1):** Hybrid source, exact five count, EmperorGreymon name, payment, once-per-turn, inherited timing, DP threshold, and Security Attack amount are explicit.
9. **Clause completeness (1/1):** Main, inherited, and Security clauses map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** Existing tests cover main evolution and inherited behavior but were not executed in this static-only pass; optional/count refusal, threshold transitions, and Security play remain unproven.

Remaining work is behavioral proof of Q1652–Q1654/Q3261 and the inherited threshold; this card is not formally complete at 10/10.

### BT7-086 — Tommy Himi

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Blue Tamer costing 3 with On Play bottom-three evolution-card trash, inherited once-per-turn attack/block restriction, and Security free play.
2. **On Play target (1/1):** `TrashDigivolution` selects exactly one opponent Digimon that has evolution cards.
3. **Bottom-three behavior (1/1):** `amount: 3` with `fromTop: false` selects cards from the bottom of that stack.
4. **Inherited timing/limit (1/1):** The effect is inherited, triggers When Attacking, and is frequency-limited OncePerTurn.
5. **Restriction target/duration (1/1):** It targets one opponent Digimon with no evolution cards and prevents attack or block until the end of the opponent's next turn.
6. **Rules evidence (1/1):** Q1655 confirms inherited activation via digivolving onto the Tamer; Q1656 confirms the restriction persists even if the target later gains an evolution card.
7. **Security behavior (1/1):** Security plays this card without cost.
8. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-086", compiled)` registration are present.
9. **Static primitive trace (1/1):** Stack presence, bottom direction, opponent controller, no-stack filter, restriction, duration, inherited timing, frequency, and free play are explicit.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; exact three-card bottom trash, once-per-turn behavior, Q1656 persistence, and Security play remain unproven.

Remaining work is behavioral proof of Q1655/Q1656 stack and duration boundaries; this card is not formally complete at 10/10.

### BT7-087 — Koji Minamoto

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog/rulings (1/1):** Purple Tamer with Main placement of exactly five Hybrid hand cards and optional MagnaGarurumon digivolution, Security free play, and inherited Your Turn effect-triggered memory/block restriction; Q1657–Q1662 are available.
2. **Main placement (1/1):** `PlaceUnder` selects five Hybrid cards from hand and places them beneath this Tamer in bottom/any order.
3. **Optional evolution (1/1):** Digivolution is gated on the tracked count reaching five, targets only MagnaGarurumon from hand, and charges its evolution cost.
4. **Rulings fidelity (1/1):** The count gate and optional destination align with Q1659/Q1660; `virtualBase` preserves the Tamer's blue level-5 evolution context.
5. **Inherited trigger (1/1):** Your Turn inherited subtrigger listens for effect-driven hand additions, gains 1 memory, and prevents blocking for the turn.
6. **Security (1/1):** Security plays this card without cost from security.
7. **Direct IR/registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-087", compiled)` registration are present.
8. **Static primitive trace (1/1):** Hybrid filter, exact five count, source/destination, MagnaGarurumon name, payment, once-per-turn keys, inherited timing, and restriction duration are explicit.
9. **Clause completeness (1/1):** Main, inherited, and Security clauses map directly to compiled actions; Q1661 persistence is delegated to shared duration/state handling.
10. **Reproducible behavioral proof (0/1):** Tests exist for the main evolution, wrong-color boundary, and inherited behavior but were not executed in this static-only pass; optional decline, four-card refusal, and Security proof remain unclaimed.

Remaining work is behavioral proof of Q1659/Q1660 optional/count boundaries and inherited persistence; this card is not formally complete at 10/10.

### BT7-088 — Zoe Orimoto

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Yellow Tamer costing 3 with optional security search for Hybrid/Ten Warriors, conditional Recovery +1, shuffle, inherited opponent-turn Security Digimon +3000 DP, and Security free play.
2. **Security search (1/1):** On Play optionally takes one owner security card matching either Hybrid or Ten Warriors to hand.
3. **Conditional recovery (1/1):** Recovery is gated on the successful hand-add binding and places one deck card on top of security.
4. **Shuffle (1/1):** Security is shuffled after the search/recovery sequence.
5. **Inherited effect (1/1):** Opponent-turn inherited modifier applies +3000 to all owner Security Digimon permanently for the active inherited duration.
6. **Security behavior (1/1):** Security self-plays this Tamer without cost.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-088` returns Q1663; no unresolved ambiguity is surfaced for this card's printed clauses.
8. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-088", compiled)` registration are present.
9. **Static primitive trace (1/1):** Optional selection, trait OR filter, binding, conditional recovery, deck source, shuffle, opponent-turn timing, all-security scope, and free play are explicit.
10. **Reproducible behavioral proof (0/1):** Existing tests cover search/recovery, decline/no-match, and inherited Security DP but were not executed in this static-only pass; shuffle order and Security free-play lifecycle remain unproven.

Remaining work is focused behavioral proof of the full Security sequence and inherited duration; this card is not formally complete at 10/10.

### BT7-089 — J.P. Shibayama

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Green Tamer costing 3 with Your Turn digivolution-cost reduction, inherited Piercing, and Security free play.
2. **Turn/cost condition (1/1):** Your Turn grants a -1 digivolution cost modifier when the destination is an owner Green Digimon.
3. **Inherited effect (1/1):** Piercing is represented as an inherited permanent keyword.
4. **Security behavior (1/1):** Security plays this card without cost via self-reference.
5. **Rules evidence (1/1):** Q1664 confirms the inherited Piercing effect activates when a Digimon legally digivolves onto this Tamer; IR marks it inherited.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-089` returns Q1664 with no unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-089", compiled)` registration are present.
8. **Static primitive trace (1/1):** Turn timing, digivolution cost type, reduction amount, Green destination filter, inherited keyword, and free Security play are explicit.
9. **Clause completeness (1/1):** Main, inherited, and Security clauses map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; Green/off-color evolution, inherited stack activation, and Security play remain unproven.

Remaining work is behavioral proof of Q1664's evolution-stack boundary and the Green destination restriction; this card is not formally complete at 10/10.

### BT7-090 — Kota Domoto

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-081–090 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Black Tamer costing 4 with Start of Your Turn memory setting, On Play top-4 X-Antibody search/bottom-deck remainder, and Security self-play.
2. **Start-of-turn condition (1/1):** `SetMemory` to 3 is gated by owner memory at most 2.
3. **Reveal/search (1/1):** On Play reveals 4 and adds one matching X-Antibody card to hand.
4. **Remainder placement (1/1):** Unselected revealed cards go to deck bottom via `rest: "deckBottom"`.
5. **Security behavior (1/1):** Security plays this card without cost through a self-reference target.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-090` reports no rulings or unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-090", compiled)` registration are present.
8. **Static primitive trace (1/1):** Start-turn timing, memory threshold/value, reveal count, trait filter, hand destination, deck-bottom remainder, and free Security play are explicit.
9. **Clause completeness (1/1):** All printed clauses map directly to compiled effects without omitted duration or controller scope.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; memory threshold, no-match search, bottom ordering, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the Start-of-Turn boundary and top-4 search/remainder behavior; this card is not formally complete at 10/10.

### BT7-091 — Koichi Kimura

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Purple level-3 Tamer costing 3 with On Play draw-1 then trash-1, inherited On Deletion gain-1-memory, and Security self-play.
2. **On Play ordering (1/1):** IR draws one card, then trashes exactly one owner hand card.
3. **Inherited effect (1/1):** The On Deletion gain-1-memory trigger is marked `isInherited: true`.
4. **Security behavior (1/1):** Security plays this card without cost using a self-reference target.
5. **Rules evidence (1/1):** Q1665 confirms the inherited effect becomes usable when a Digimon legally digivolves onto this Tamer; the module marks it inherited rather than active as a standalone Tamer.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-091` returns Q1665 with no unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-091", compiled)` registration are present.
8. **Static primitive trace (1/1):** Draw amount, owner hand zone, trash count, gain amount, inherited timing, self-target, and free Security play are explicit.
9. **Clause completeness (1/1):** On Play, inherited, and Security clauses map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; hand-size edge cases, inherited stack activation, and Security play remain unproven.

Remaining work is behavioral proof of Q1665's evolution-stack boundary and On Play/Security ordering; this card is not formally complete at 10/10.

### BT7-092 — Flame Memory Boost!

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Red Option costing 3 with Main Security Attack +1, battle-area placement, Delay gain of 2 memory, and Security placement.
2. **Main effect (1/1):** Exactly one owner Digimon gains Security Attack +1 for the turn, then this card is placed in its battle area.
3. **Delay lifecycle (1/1):** Delay trashes this card from its battle area, then gains 2 memory.
4. **Security behavior (1/1):** Security places this card in its owner's battle area.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-092` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-092", compiled)` registration are present.
7. **Static primitive trace (1/1):** Owner Digimon filter, exact count, keyword amount, turn duration, self-placement, self-trash, gain amount, and Delay keyword are explicit.
8. **Ordering (1/1):** The keyword grant precedes Main placement; Delay deletion precedes memory gain.
9. **Clause completeness (1/1):** Main, Delay, and Security clauses map directly to compiled effects without omitted text.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; target selection, placement, same-turn Delay lockout, memory gain, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the Main/Delay/Security lifecycle; this card is not formally complete at 10/10.

### BT7-093 — Firedrake Strike

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Red Option costing 4; Main chooses an owner Hybrid Digimon then deletes one opposing Digimon with DP no greater than the chosen Digimon's DP; Security optionally plays Takuya Kanbara from hand or trash for free.
2. **Source selection (1/1):** `SelectBind` chooses exactly one owner Digimon with the Hybrid trait.
3. **Relative DP target (1/1):** The deletion target is one opponent Digimon with `relativeTo` the bound selection's DP using `lte`.
4. **Security behavior (1/1):** Security optionally plays one named Takuya Kanbara from hand or trash without cost.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-093` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-093", compiled)` registration are present.
7. **Static primitive trace (1/1):** Hybrid filter, owner/opponent controllers, bound selection identity, DP comparison, source zones, optionality, and free play are explicit.
8. **Clause completeness (1/1):** Main and Security clauses are fully represented with correct sequencing and count.
9. **Reference fidelity (1/1):** `selectionRef: "selected"` ensures the deletion threshold is computed from the chosen Digimon rather than a global or reselected source.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; exact equal-DP boundary, smaller/larger targets, Hybrid exclusion, and Security optional play remain unproven.

Remaining work is focused behavioral proof of the relative DP boundary and Security branch; this card is not formally complete at 10/10.

### BT7-094 — Giga Storm

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Red Option costing 7 with Main deletion of up to two opposing Digimon at 8000 DP or less and Security Main activation.
2. **Target controller/kind (1/1):** The target is restricted to opponent Digimon.
3. **DP boundary (1/1):** `dp: { op: "lte", value: 8000 }` matches the printed upper bound.
4. **Count/optionality (1/1):** `count: 2` with `upTo: true` permits zero, one, or two targets.
5. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-094` reports no rulings or unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-094", compiled)` registration are present.
8. **Static primitive trace (1/1):** Opponent controller, Digimon kind, DP comparison, exact maximum, and up-to semantics are explicit.
9. **Clause completeness (1/1):** All printed Main and Security clauses map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; zero/one/two target choices, exact 8000 boundary, and Security activation remain unproven.

Remaining work is focused behavioral proof of the DP boundary and up-to count; this card is not formally complete at 10/10.

### BT7-095 — Blue Hawaii Death

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Blue Option costing 2; Main gives one owner Digimon +3000 DP and the ability to attack an opponent's unsuspended Digimon without digivolution cards for the turn; Security returns this card to hand.
2. **DP modifier (1/1):** Main applies +3000 for the turn to exactly one owner Digimon.
3. **Attack permission (1/1):** Main grants the unsuspended-opponent attack permission for the turn and sets `noDigivolutionCards: true`.
4. **Security behavior (1/1):** Security uses `AddToHandSelf`.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-095` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-095", compiled)` registration are present.
7. **Static primitive trace (1/1):** Owner Digimon filters, exact counts, amount, duration, and no-digivolution-card restriction are explicit.
8. **Same-target fidelity (0/1):** The printed text applies both effects to “1 of your Digimon,” but the two actions independently select one Digimon; no bound reference proves they must be the same permanent.
9. **Clause completeness (1/1):** Main and Security clauses are represented, subject to same-target identity.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; same-target enforcement, attack eligibility, duration, and Security behavior remain unproven.

Required follow-up: bind the first selected Digimon for the second modifier (or establish sequential same-target semantics), then add behavioral proof. This card is not formally complete at 10/10.

### BT7-096 — Starlight Velocity

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** Blue Option costing 3; Main plays one Tamer or Hybrid Digimon from one owner's evolution stack, and Security optionally plays Koji Minamoto from hand/trash.
2. **Main source/filter (1/1):** IR selects one owner Hybrid Digimon/Tamer from `digivolutionCards`, plays without cost, and marks the Main choice optional.
3. **Security source/filter (1/1):** Security optionally plays one named Koji Minamoto from hand or trash without cost.
4. **Registration/coverage (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-096", compiled)` registration are present.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-096` reports no rulings or unresolved ambiguity.
6. **Static primitive trace (1/1):** Controller, source zones, Hybrid trait/name filters, optionality, count, and free-play cost are explicit.
7. **Transformation clause (1/1):** The target kind union represents the printed “as a Tamer or another Digimon” destination choice through the shared play primitive.
8. **Single-stack fidelity (0/1):** As with BT7-097, no bound host reference is visible before selecting from `digivolutionCards`; static IR does not prove the Main card cannot combine cards across multiple evolution stacks.
9. **Security completeness (1/1):** Security uses the exact hand/trash source pair and Koji name condition, with no unintended Main payload reuse.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; single-stack selection, destination transformation, optional decline, and Security boundaries remain unproven.

Required follow-up: bind one chosen host stack (or establish the engine guarantee), then add behavioral proof for both Main and Security branches. This card is not formally complete at 10/10.

### BT7-097 — Tidal Wave

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** BT7-097 is an Option whose Main and Security text play up to two Digimon cards from one of the owner's Digimon's digivolution cards without paying memory costs.
2. **Source zone and free play (1/1):** IR explicitly uses `from: ["digivolutionCards"]`, `upTo: true`, `count: 2`, and `payCost: false`.
3. **Unsuspended result (1/1):** `suspended: false` matches the expected played state.
4. **Controller/kind (1/1):** Only owner Digimon cards on owner-controlled Digimon stacks are eligible.
5. **Security reuse (1/1):** Security activates the same play payload.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-097` reports no rulings or unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-097", compiled)` registration are present.
8. **Single-stack fidelity (0/1):** The target filter constrains each card with `hostFilter` but does not bind one selected host before selecting up to two cards. Statically, this does not prove that cards cannot be mixed across two evolution stacks, contrary to “from one of your Digimon's digivolution cards.”
9. **Clause completeness (1/1):** Main/Security timing, count, source, cost, and suspension clauses are represented, subject to the stack-origin concern.
10. **Reproducible behavioral proof (0/1):** Existing tests cover two cards from one stack and zero selection but were not executed; mixed-stack exclusion and Security behavior remain unproven.

Required follow-up: bind the chosen host stack (or establish an engine guarantee for `hostFilter`) before selecting cards, then add a mixed-stack behavioral proof. This card is not formally complete at 10/10.

### BT7-098 — Ultra Turbulence

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Yellow Option costing 2 whose Main effect gives one opposing Digimon and all opposing Security Digimon -3000 DP for the turn.
2. **Battle-area target (1/1):** The first Main action modifies exactly one opponent Digimon by -3000.
3. **Security Digimon population (1/1):** The second Main action uses `ModifySecurityDP` for all opponent Security Digimon, preserving the printed “all” scope.
4. **Duration and Security (1/1):** Both modifiers use `forTheTurn`; Security returns this card to its owner's hand.
5. **Q&A boundary (1/1):** Q1666 confirms reducing a Security Digimon to 0 DP does not delete it outside a battle; the module applies only a DP modifier and does not invent deletion.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-098` returns Q1666 with no unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-098", compiled)` registration are present.
8. **Static primitive trace (1/1):** Opponent controller, Digimon kind, exact single target, all-security population, amount, and duration are explicit.
9. **Clause completeness (1/1):** The hand-authored compiled override explicitly restores the Security Digimon clause that a prior declarative form omitted.
10. **Reproducible behavioral proof (0/1):** Existing tests cover only the ordinary battle-area modifier and were not executed in this static-only pass; Security Digimon scope, duration, and Q1666 battle boundary remain unproven.

Remaining work is behavioral proof of the all-Security-Digimon modifier and Q1666 interaction; this card is not formally complete at 10/10.

### BT7-099 — Electric Rush

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Yellow Option costing 2 with Main +3000 DP and conditional unsuspend effects, plus Security return-to-hand.
2. **DP effect (1/1):** Main grants exactly one owner Digimon +3000 DP for the turn.
3. **Security-count condition (1/1):** The unsuspend branch requires exactly three cards in the owner's security stack.
4. **Unsuspend target (1/1):** The branch unsuspends exactly one owner Digimon.
5. **Ordering and duration (1/1):** The +3000 action precedes unsuspend, and the modifier uses `forTheTurn`.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-099` reports no rulings or unresolved ambiguity.
8. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-099", compiled)` registration are present.
9. **Static primitive trace (1/1):** Owner controller, Digimon kind, exact counts, security zone, exact equality, amount, and duration are explicit.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; exact three-security boundary, target selection, duration, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the conditional boundary and turn duration; this card is not formally complete at 10/10.

### BT7-100 — Qualialise Blast

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-091–100 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Yellow Option with variable hand-use cost, -3000 DP Main effect, Rasenmon Security Attack +1 grant, and Security return-to-hand.
2. **Variable cost (0/1):** The IR models the hand cost from security count but includes `floor: 1`; Q1667 explicitly confirms an empty security stack makes the cost 0, so this floor is a likely fidelity bug.
3. **DP effect (1/1):** Main selects one opponent Digimon and applies -3000 DP for the turn.
4. **Rasenmon effect (1/1):** Main then selects one owner Digimon with `Rasenmon` in its name and grants Security Attack +1 for the turn.
5. **Timing/ruling boundary (1/1):** The grant targets a Rasenmon already in play; Q1668 confirms a Rasenmon played later cannot receive it.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** The KB returns Q1501, Q1667, and Q1668; no ambiguity is surfaced beyond the cost-floor discrepancy.
8. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-100", compiled)` registration are present.
9. **Static primitive trace (1/1):** Security scaling, opponent target, Rasenmon name filter, amounts, and turn durations are explicit.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; empty-security cost, exact turn duration, target boundaries, and Q1668 timing remain unproven.

Required follow-up: remove or justify the `floor: 1` cost clamp so an empty security stack can produce cost 0, then add behavioral proof. This card is not formally complete at 10/10.

### BT7-101 — Thunder Laser

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 1 whose Main effect conditionally suspends one opposing Digimon and whose Security effect returns this card to its owner's hand.
2. **Condition (1/1):** Main suspension is gated by an owner battle-area Digimon carrying either `Hybrid` or `Ten Warriors`.
3. **Target (1/1):** The action selects exactly one opponent Digimon.
4. **No-target ruling (1/1):** The condition is on the action rather than card use, preserving Q1669's ruling that the Option can be used with no qualifying Digimon and simply has no effect.
5. **Security behavior (1/1):** Security uses `AddToHandSelf`.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-101` returns Q1669; no unresolved ambiguity is surfaced.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-101", compiled)` registration are present.
8. **Static primitive trace (1/1):** Battle-area zone, owner controller, OR trait tokens, opponent controller, Digimon kind, and exact target count are explicit.
9. **Clause completeness (1/1):** Main and Security text map directly to compiled effects without omitted duration or optionality clauses.
10. **Reproducible behavioral proof (0/1):** No test was executed in this static-only pass; qualifying/non-qualifying trait, no-target use, suspension, and Security return remain unproven.

Remaining work is focused proof of Q1669's no-target boundary and trait matching; this card is not formally complete at 10/10.

### BT7-102 — Dino Memory Boost!

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 3 with Main suspend→placement, Delay gain-2-memory, and Security placement.
2. **Main suspend and ordering (1/1):** Main suspends exactly one opponent Digimon, then places this card in its battle area.
3. **Delay lifecycle (1/1):** The Delay branch deletes this card from its battle area before gaining 2 memory and is marked with the Delay keyword.
4. **Security behavior (1/1):** Security places this card in its owner's battle area.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-102` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-102", compiled)` registration are present.
7. **Static primitive trace (1/1):** Opponent Digimon filter, exact count, self-placement, self-delete, gain amount, and Delay keyword are explicit.
8. **Clause completeness (1/1):** All printed Main, Delay, and Security clauses map to direct actions.
9. **Shared-use identity (1/1):** The Delay branch uses a stable `sharedUseKey`, preserving the once-per-card activation identity expected by the engine's Delay lifecycle.
10. **Reproducible behavioral proof (0/1):** No test was executed in this static-only pass; suspend ordering, placement, same-turn Delay lockout, memory gain, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the Main/Delay/Security lifecycle; this card is not formally complete at 10/10.

### BT7-103 — Mugen

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 4 with Main suspend/restriction and Security suspend text.
2. **Main suspend (1/1):** The Main effect suspends exactly one opponent Digimon.
3. **Restriction duration (1/1):** The restriction uses `unsuspend` through the opponent's next unsuspend phase (`untilOpponentTurnEnd`).
4. **Security behavior (1/1):** Security suspends exactly one opponent Digimon.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-103` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-103", compiled)` registration are present.
7. **Static primitive trace (1/1):** Controller, Digimon kind, exact count, restriction type, and duration are explicit.
8. **Target identity fidelity (0/1):** The printed text says “That Digimon,” but the Restrict action has an independent opponent-Digimon selector rather than a bound reference to the Digimon suspended by the preceding action. Unless the shared sequential target semantics implicitly preserve identity (not established statically), the restriction can select a different Digimon.
9. **Clause completeness (1/1):** Both Main and Security clauses are represented, subject to the identity concern above.
10. **Reproducible behavioral proof (0/1):** Existing tests were not executed in this static-only pass; same-target enforcement, duration, and Security boundaries remain unproven.

Remaining work is to bind the suspended target into the Restrict action (or establish an engine guarantee that sequential selectors preserve it), then add behavioral proof. This card is not formally complete at 10/10.

### BT7-104 — Metal Cannon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 2 with X-Antibody selection, draw scaling, and Security return-to-hand text.
2. **Selection (1/1):** Main selects exactly one owner Digimon carrying the `X-Antibody` trait and binds that choice.
3. **Scaling source (1/1):** Draw amount is one per digivolution card of the chosen Digimon, using the bound reference rather than a later or global source.
4. **Draw and Security (1/1):** The action draws from the owner's deck; Security uses `AddToHandSelf`.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-104` reports no rulings, errata, restrictions, or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-104", compiled)` registration are present.
7. **Static primitive trace (1/1):** Trait filter, owner controller, exact selection count, bind identity, per-card unit, and digivolution-card scaling are explicit.
8. **Reference fidelity (1/1):** `boundRef: "xAntibodyTarget"` ensures the draw count remains tied to the selected Digimon through effect resolution.
9. **Clause completeness (1/1):** All printed Main and Security clauses have direct IR representations; no optionality or duration clause is omitted.
10. **Reproducible behavioral proof (0/1):** A colocated test exists but was not executed in this static-only pass; zero-source, multi-source, non-X rejection, deck-boundary, and Security behavior remain unproven.

Remaining work is behavioral proof of selection and exact draw boundaries; this card is not formally complete at 10/10.

### BT7-105 — Pride Memory Boost!

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 4 with reveal/play/trash, Delay, and Security placement text.
2. **Reveal and play (1/1):** Main reveals 3 cards and optionally plays one owner Black Digimon with play cost 4 or less without memory cost.
3. **Remaining cards (1/1):** `rest: "trash"` sends all unrecruited revealed cards to trash, including when no eligible card is played, matching Q1670.
4. **Placement (1/1):** Main places this card in its battle area after the reveal sequence; Security places it in its owner's battle area.
5. **Delay (1/1):** A separate Main effect with `Delay` gains 2 memory; the engine's Delay lifecycle supplies trash-as-cost and same-turn activation prevention as documented in the module.
6. **Knowledge base (1/1):** The KB returns Q1670, confirming placement is independent of whether an eligible revealed Digimon is played.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-105", compiled)` registration are present.
8. **Static primitive trace (1/1):** Reveal count, Black filter, play-cost ceiling, optional play, free cost, rest destination, self-placement, Delay keyword, and Security placement are explicit.
9. **Ordering and ownership (1/1):** The reveal action precedes self-placement, and all card movement uses owner/controller defaults consistent with the printed text.
10. **Reproducible behavioral proof (0/1):** A colocated test exists but was not executed in this static-only pass; no proof is claimed for no-eligible/no-play trash handling, exact reveal boundaries, Delay timing, or Security placement.

Remaining work is behavioral proof of Q1670 and Delay/Security lifecycle boundaries; this card is not formally complete at 10/10.

### BT7-106 — Brave Metal

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 5 with the ordinary play-cost deletion, conditional alternative, and Security Main activation.
2. **Ordinary target (1/1):** Modal option one deletes exactly one opponent Digimon with play cost 6 or less.
3. **Loaded condition (1/1):** The alternative requires an owner battle-area Digimon with at least five digivolution cards and the `X-Antibody` trait.
4. **Alternative target (1/1):** Option two deletes exactly one opponent Digimon whose `X-Antibody` trait is negated, with no play-cost ceiling, matching the printed “instead.”
5. **Optionality and replacement (1/1):** The alternative is represented as a modal choice with `choose: 1`, conditionally offered only when loaded, and the second branch replaces the ordinary branch.
6. **Security behavior (1/1):** Security reuses the same Main modal effect through `isSecurity: true` and does not duplicate divergent logic.
7. **Knowledge base (1/1):** The KB returns Q1671/Q1672, confirming the ordinary low-cost target remains legal regardless of loaded status and the alternative permits higher-cost non-X targets.
8. **Direct IR and registration (1/1):** The module has full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-106", compiled)` registration.
9. **Static primitive trace (1/1):** Digivolution-card count, trait condition, play-cost upper bound, negated trait filter, controller, count, modal choice, and replacement semantics are explicit.
10. **Reproducible behavioral proof (0/1):** Existing tests cover the ordinary and loaded alternative paths but were not executed in this static-only pass; exact boundaries, refusal, Security, and mixed X/non-X target pools remain unproven here.

Remaining work is behavioral proof of Q1671/Q1672 boundaries and modal/Security behavior; this card is not formally complete at 10/10.

### BT7-107 — Calling From the Darkness

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Purple Option costing 1 with Main deletion/recovery text and Security add-to-owner-hand text.
2. **Deletion (1/1):** Main first deletes exactly one of the owner's Digimon, with no accidental color or level restriction.
3. **Recovery filter (1/1):** The second action returns up to two owner Purple Digimon cards from trash to hand.
4. **Ordering and self-return (1/1):** Delete precedes Return, allowing the deleted Purple Digimon to be selected from trash as confirmed by Q1673.
5. **Up-to and destination (1/1):** `count: 2`, `upTo: true`, and `to: "hand"` encode the printed upper bound and destination.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Rules evidence (1/1):** The KB returns Q1673/Q1674 and linked-card rulings Q5615/Q5643/Q5648, plus the restriction to one copy since 2022-11-11. The pending On Deletion behavior is delegated to shared zone/event handling; no card-local approximation is present.
8. **Direct IR and registration (1/1):** The module is full compiled IR with no residuals and exactly one `registerIrCard("BT7-107", compiled)` registration.
9. **Static primitive trace (1/1):** Controller, kind, Purple color, trash zone, count, ordering, and destination are explicit.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only one ordinary delete-and-return case and was not executed in this static-only pass; up-to-zero, non-Purple exclusion, On Deletion pending behavior, and Security recovery remain unproven.

Remaining work is behavioral proof of the Q1673/Q1674 boundaries and the current restriction's deck-validation integration; this card is not formally complete at 10/10.

### BT7-108 — Schwarz Lehrsatz

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies BT7-108 as a Purple Option costing 6 with the Hybrid/Tamer scaling deletion and Security Main activation.
2. **Main timing and recipient (1/1):** The compiled Main effect deletes opposing Digimon only.
3. **Level boundary (1/1):** The deletion target is explicitly an opponent Digimon with level `lte 5`.
4. **Scaling population (1/1):** Scaling counts owner battle-area cards from the union of Hybrid-trait Digimon and Tamers.
5. **Pairing ruling (1/1):** The single scaling population produces one deletion per qualifying card, not one per Hybrid/Tamer pair, matching Q1675.
6. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-108` returns Q1675, with no unresolved ambiguity.
8. **Direct IR and registration (1/1):** The module has full compiled coverage, an empty residual list, and exactly one `registerIrCard("BT7-108", compiled)` registration.
9. **Static primitive trace (1/1):** The target controller/kind/level filter, battle-area scaling zone, Hybrid trait branch, Tamer branch, and unit `cards` are explicit.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only a basic deletion and was not executed in this static-only pass; multi-source scaling, exact level boundary, mixed trait population, and Security behavior remain unproven.

Remaining work is behavioral proof of Q1675 scaling and all applicable boundaries; this card is not formally complete at 10/10.

### BT7-109 — Dead or Alive

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Purple Option, play cost 8, with the printed trash-play Main effect, 10-card alternative, and Security activation.
2. **Default play branch (1/1):** The first compiled action plays exactly one owner Purple level-5 Digimon from `trash` without paying its memory cost.
3. **Alternative filter (1/1):** The alternative selects exactly one owner Digimon with `Lucemon` in its name from `trash`, matching the printed name condition.
4. **Threshold (1/1):** The alternative is conditioned on the owner's trash count being greater than or equal to 10.
5. **Optionality and instead semantics (1/1):** The alternative is explicitly `optional: true` and `instead: true`, preserving the ruling that the normal level-5 branch remains available when the optional alternative is declined.
6. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-109` returns Q1676, confirming the 10+ trash alternative does not remove the ability to choose the ordinary Purple level-5 play.
8. **Direct IR and registration (1/1):** The module has `coverage: "full"`, an empty residual list, and exactly one `registerIrCard("BT7-109", compiled)` registration.
9. **Static primitive trace (1/1):** Both actions use explicit `from: ["trash"]`, `payCost: false`, controller ownership, exact count, and the threshold/name/level/color filters required by the card text.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only the ordinary Purple level-5 play and was not executed in this static-only pass; the 10-card optional choice, decline fallback, and Security path remain unproven.

Remaining work is behavioral proof of the alternative and fallback branches plus Security activation; this card is not formally complete at 10/10.

### BT7-110 — Evolution Ancient

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-101–110 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a White Option with play cost 0 and the printed Hybrid color-waiver, level-4-to-Ten-Warriors evolution, and Security add-to-owner-hand text.
2. **Hybrid color waiver (1/1):** The Static `WaiveColorRequirement` is conditioned on a controller-owned battle-area Digimon carrying the `Hybrid` trait, matching Q1677's battle-area ruling.
3. **Main source target (1/1):** The Main `Digivolve` action selects exactly one of the owner's level-4 Digimon.
4. **Evolution target and zone (1/1):** The destination is one Digimon in hand with the `Ten Warriors` trait; `from: ["hand"]` is explicit.
5. **Color and level boundaries (1/1):** `colorsMatchDigivolvingSource: true` enforces matching colors while `ignoreLevelRequirement: true` bypasses only the destination level requirement.
6. **Cost and Security (1/1):** `payCost: true` pays the destination's printed evolution cost, and Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-110` returns Q1677; no unresolved ambiguity is surfaced.
8. **Direct IR and registration (1/1):** The module is `coverage: "full"`, has no residual clauses, and has exactly one `registerIrCard("BT7-110", compiled)` registration.
9. **Static primitive trace (1/1):** The waiver condition, level-4 selector, trait selector, source zone, color match, level bypass, and paid evolution are all represented by explicit compiled fields.
10. **Reproducible behavioral proof (0/1):** A colocated suite exists for same-color evolution and off-color rejection, but it was not executed in this static-only pass; waiver behavior and Security recovery are not directly covered there.

Remaining work is execution of the focused suite plus Hybrid waiver and Security boundary proof; this card is not formally complete at 10/10.

### BT7-111 — Lucemon: Chaos Mode

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-111–112 range row.

Clause trace merged from `docs/audits/BT7-AUDIT.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

#### Clause-by-clause score

1. **Catalog identity (1/1):** `packages/shared/src/cards/data/cards.json` identifies BT7-111 as a Purple level 5 Ultimate Digimon, play cost 14, 12000 DP, with Demon Lord/Seven Great Demon Lords traits and no printed standard evolution recipe.
2. **Alternate evolution (1/1):** The direct IR declares an alternate hand evolution from a named `Lucemon` at memory cost 7, marked `isAlternate: true` and `sourceZones: ["hand"]`, matching the printed “Your [Lucemon] can digivolve into this card in your hand for a memory cost of 7, ignoring this card's digivolution requirements.”
3. **Trash scaling (1/1):** The static `wouldBePlayed` replacement reduces hand play cost by 3 for every 10 cards in the owner's trash, with `zone: "trash"`, `controller: "mine"`, and `unit: "trash"`.
4. **On Play target branches (1/1):** The On Play delete uses separate opponent Tamer and opponent level-6-or-lower Digimon branches, avoiding the common flattened-filter bug that excludes Tamers due to their absent level.
5. **When Digivolving target branches (1/1):** The When Digivolving delete mirrors the same two correctly separated opponent target branches.
6. **Count and optionality (1/1):** Each delete action has `count: 1`; the printed effect does not say “up to” or “may,” so no optional flag is introduced.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-111` returns Q1678/Q1679 timing and alternate-evolution rulings plus Q4999/Q5002/Q5041 trash-evolution boundaries. No unresolved ambiguity was surfaced.
8. **Direct IR and registration (1/1):** `apps/api/src/cards/BT7/BT7-111.ts` declares `coverage: "full"`, an empty residual list, and exactly one `registerIrCard("BT7-111", compiled)` registration; no legacy `registerCard` call is present.
9. **Shared primitive trace (1/1):** The replacement, split OR-target representation, alternate evolution requirement, and trigger declarations are supported by the compiled interpreter schema and align with the adjacent BT7 target-branch repair.
10. **Reproducible behavioral proof (0/1):** The colocated test only proves deleting an opponent Tamer on play. It does not yet prove the alternate Lucemon evolution path, level-6 boundary, trash-count cost reductions, When Digivolving path, or negative target boundaries. Per audit scope, no tests were run or added in this pass.

#### Evidence

```text
node tools/kb/query.mjs card BT7-111
rg -n 'BT7-111' packages/shared/src/cards/data/cards.json
rg -n 'register(Card|IrCard)\\(' apps/api/src/cards/BT7/BT7-111.ts
```

Remaining work is behavioral proof for the clauses listed in item 10; this card is not formally complete at 10/10.

### BT7-112 — Susanoomon

Re-audit row (`docs/audits/BT7-REAUDIT-LEDGER.md`, 2026-09-10): catalog 2, IR 2, behavior 2, peer/stack 2, gates 0, score 8/10. Exact collection and independent static evidence green.
Static closeout (`docs/audits/BT7-STATIC-AUDIT.md`, 2026-09-05): Verified 10/10 in the BT7-111–112 range row.

Clause trace merged from `internal-docs/audits/BT7/BT7-111-112.md`. Statements in it about provisional scores, deferred gates, or snapshot drift describe the pre-closeout worker pass and are superseded by the Gates section above.

**Catalog and clauses.** The committed catalog identifies White level 7, play cost 15, 15000 DP, Mega / Vaccine / Shaman, with every color's level-6 evolution cost listed as 7. Its first clause may digivolve this card from hand onto one of your Tamers as if that Tamer were a level 6 Digimon by placing 10 Tamer cards and/or cards with `[Hybrid]` in their traits from hand and/or trash at the bottom of your deck in any order. It grants Security Attack +2 and has `[When Digivolving] Delete 1 of your opponent's Digimon.`

**Direct and correction.** The direct module contains the Security Attack +2 keyword and one opponent-Digimon Delete action at When Digivolving. It previously omitted the first clause's executable requirement and therefore relied only on the shared `ALTERNATE_DIGIVOLUTION_OVERRIDES` fallback; this was corrected by adding a direct requirement with cost 7, `isAlternate: true`, `baseIsTamer: true`, `sourceZones: ["hand"]`, and a placement cost of exactly 10 from `hand`/`trash`, matching either kind Tamer or trait Hybrid. The explicit hand source applies to the evolving BT7-112 card; placement candidates intentionally come from both hand and trash. The direct requirement now makes the Tamer base, hand-only evolving card, OR matching of Tamer kind/Hybrid trait, exact count, and alternate memory cost executable in the card module itself.

**Snapshot drift, tests, peers, and stack.** The snapshot already contains the alternate requirement but omits `sourceZones: ["hand"]`; it also represents Security Attack +2 as a generated GainKeyword action, while the direct module uses the equivalent keyword declaration. `BT7-112.test.ts` now statically proves the direct requirement shape and existing tests inspect registration, When Digivolving-only timing, exact-one deletion, absence of the old replacement at None timing, and a 5-hand/5-trash Hybrid stack scenario. `BT7-112.digivolve.test.ts` inspects Tamer-base matching, rejection below 10 or with nonmatching cards, alternate cost 7, actual payment, stacking, and draw; `BT7-112.engine.test.ts` inspects player-selected ten-card identity and bottom-deck order. BT7-021, BT7-035, BT18-102, and BT2-111 were inspected as same-mechanism Tamer-base/alternate-requirement peers. The legal stack is a chosen Tamer base plus BT7-112 from hand: select exactly 10 qualifying cards from the union of hand and trash, reveal/order them as required, place them at deck bottom, pay 7, put BT7-112 on the Tamer as if it were level 6, draw for digivolution, and then resolve the When Digivolving delete. Q1682/Q1683 permit any qualifying mix (for example five Tamers and five Hybrids), Q1691 preserves player-selected order, and Q1692 confirms the draw.

**Boundaries.** The evolving card itself must be in hand; a BT7-112 in trash cannot use this alternate hand clause. The base is one of your Tamers, treated as level 6, and not an arbitrary Digimon for this requirement. The ten payment cards are exactly 10 and may be any mix of Tamer-kind cards and cards whose traits contain Hybrid, from hand and/or trash; nonmatching cards do not count, and nine cards are insufficient. The opponent target is exactly one Digimon, not a Tamer; the When Digivolving trigger does not fire when the card is merely trashed (Q2048). Under the resulting stack, the Tamer's inherited effects remain relevant while its Security effect does not transfer (Q6534/Q6535).

**Score:** 2/2 clause coverage, 2/2 timing/optionality, 2/2 target/source/trait boundaries, 2/2 cost/zone/stack behavior, 0/2 executed gates = **8/10 provisional**.

## Mechanisms

No `*-MECHANISM.md` note was written for BT7. The engine seams this set exercises are listed in the affected-mechanism manifest under Gates.

## Knowledge base index

Source: `docs/audits/BT7-reaudit/KB-INDEX.md`.

Card-level rulings references are recorded in the grouped audit reports.

## Open items

- No card is below 10/10 and no unresolved ambiguity is recorded. `docs/audits/BT7-STATIC-AUDIT.md`
  reports blocked or ambiguous: 0, and the 2026-09-10 run records the final strict recalc at 112/112.
- Contradiction inside one file: the score table in `docs/audits/BT7-REAUDIT-LEDGER.md` (2026-09-10,
  commit `ecee49cca`) leaves the gates column at 0 and every row at 8/10, while the summary line at
  the top of the same file states 1120/1120 with 112/112 verified at 10/10 and all delivery gates
  passed. `docs/audits/BT7-reaudit/RUN.md` from the same commit confirms the recalc, so the rows are
  treated as stale. Every row is reproduced per card in the card ledger so the discrepancy stays
  visible.
- Contradiction: `docs/audits/BT7-AUDIT.md` (2026-09-02, commit `d6b25eb05`) scored 28 cards at 9/10
  and declined to claim behavioral gates. It carried its own banner naming
  `docs/audits/BT7-STATIC-AUDIT.md` as the completion source. Both later reports score those cards
  10/10.
- Contradiction: the range reports in `internal-docs/audits/BT7/` (commit `eb1a58b75`) score cards
  8/10 provisional with deferred gates. The two later reports win. Those reports also cover only
  BT7-001 through BT7-112 in mixed heading levels; every card has a trace.
- BT7-063 and BT7-109 were the open rules questions. BT7-063 is resolved by the maximum-resolution
  rule and ruling Q1623; BT7-109 uses one mutually exclusive modal choice. Both are recorded as
  resolved in the 2026-09-05 closeout.

## History

Raw evidence for these files stays in git history at the commits named below. This document was
assembled at repository commit `eabe99351`.

- `docs/audits/BT7-REAUDIT-LEDGER.md` — `ecee49cca`, 2026-09-10. Independent evidence ledger; summary
  at 10/10, rows left at the 8/10 worker cap. Merged into Card ledger.
- `docs/audits/BT7-reaudit/` (4 files: `RUN.md`, `KB-INDEX.md`, `REVIEW-NOTES.md`,
  `WORKER-BRIEF.md`) — `ecee49cca`, 2026-09-10. Run log with the full gate sequence and the final
  strict recalc, knowledge base index, coordinator note, and the read-only worker brief. Run log
  merged into Gates; index merged into Knowledge base index.
- `docs/audits/BT7-STATIC-AUDIT.md` — `eb1a58b75`, 2026-09-05. Campaign closeout with the
  reproducible delivery evidence list, the 112-row score table, and the BT7-063 and BT7-109
  resolutions. Merged into Gates, Card ledger, and Open items.
- `internal-docs/audits/BT7/` (12 range reports, `BT7-001-010.md` through `BT7-111-112.md`) —
  `eb1a58b75`, 2026-09-05. Worker-stage clause traces, 8/10 provisional. Merged into Card ledger.
- `docs/audits/BT7-AUDIT.md` — `d6b25eb05`, 2026-09-02. Newest-to-oldest static pass covering 28
  cards at 9/10, already self-marked as superseded. Its clause-by-clause scores are merged into the
  Card ledger where no newer trace existed. Dropped otherwise.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT7: PR #4585; commit `9ab9c093d`.
