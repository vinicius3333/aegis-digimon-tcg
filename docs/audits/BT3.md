---
set: BT3
cards: 112
status: verified
verified_at: 2026-09-10
catalog_commit: unknown
evidence_commit: eabe99351
---

# BT3 audit

## Status

All 112 BT3 production modules are audited and the 2026-09-10 re-audit closed its delivery gates: 1120/1120, 112/112 cards at 10/10. The exact BT3 collection passed 123 files and 371 tests, the bounded mechanism manifest passed 9 files and 101 tests, `pnpm typecheck` passed shared, web, and API, and effects sync, lint, format, and `git diff --check` were clean. The 2026-09-10 re-audit (`docs/audits/BT3-REAUDIT-LEDGER.md` and `docs/audits/BT3-reaudit/`) is the winning source; the 2026-09-02 static pass and the archival range reports under `internal-docs/audits/BT3/` are superseded, and their clause evidence is kept below only for the cards that got no fresh report. The important caveat is the shape of the evidence: only five BT3 cards (BT3-001, BT3-006, BT3-009, BT3-011, BT3-012) received a new per-card report in the re-audit. The other 107 were accepted individually by the coordinator from catalog and IR review reconciled against the already-green focused baseline, not from new lifecycle proof. That is recorded under Open items. No source recorded a catalog commit, only the blob `efbecc002fb9000789123e2f91f201466e1e5b0a`, so `catalog_commit` is `unknown`.

## Gates

### 2026-09-10 re-audit closeout (winning source)

From `docs/audits/BT3-reaudit/RUN.md`. All Vitest commands used `--maxWorkers=1 --no-file-parallelism` after a standalone process poll and a `memory_pressure` gate at 50% or higher. Cumulative base `483169d6e778ac4eae0bb7bb779095db29e90200` (BT2 completion).

- Inventory: 112 production modules, 112 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Exact BT3 collection: the manifest contained 123 test files, every parent basename was verified as exactly `BT3`, and the run passed 123 of 123 files and 371 of 371 tests.
- Bounded mechanism manifest: `effects/nameExactMatch.test.ts`, `cards/securityActivateCluster.test.ts`, `effects/subtriggers.test.ts`, `revealAddCostBudget.test.ts`, `effects/continuous.test.ts`, `attackTriggerOrdering.test.ts`, `cards/ex7HandAddWatcher.test.ts`, `effects/interpreter/registration/module.test.ts`, `effects/endOfAttackScope.test.ts`. All paths were validated before execution; the run passed 9 of 9 files and 101 of 101 tests.
- Effects sync and check: each passed for 112 BT3 records with zero semantic changes against the cumulative BT2 base and zero semantic or byte changes outside BT3.
- Typecheck: full `pnpm typecheck` passed the shared build and typecheck plus web and API, after the attributable worktree dependency links were restored; the links were removed before commit.
- Static delivery gates: Oxlint and Oxfmt checked all three changed TypeScript tests, `git diff --check` passed, and BT3 contains zero `@ts-nocheck` and zero `registerCard(`.
- Discarded runs, recorded so they are not mistaken for evidence: a deliberately broad `vitest run src/engine` diagnostic (267 of 269 files and 7436 of 7438 tests passed, the two failures being unrelated cumulative deck-catalog tests against an externally advanced catalog containing BT26; no BT3 test failed), and a first effects-sync attempt that failed module resolution because the isolated worktree lacked `packages/shared/node_modules`.

### 2026-09-02 static pass (superseded)

From `docs/audits/BT3-STATIC-AUDIT.md`. All commands used one fork, disabled file parallelism, and explicit timeouts.

- Full BT3 collection: 123 files, 368 tests passed.
- API mechanism suites: 9 files, 92 tests passed across exact-name matching, Security activation and end-of-battle subtriggers, reveal budgets, continuous effects, battle/hand watchers, and IR registration.
- Shared package: 7 files, 128 tests passed; build and typecheck passed.
- Tooling tests: 18 tests passed with concurrency 1.
- API typecheck: no audit-scope errors; its only failures are the repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Scoped effect check: 112 records already synchronized; zero semantic or byte changes outside BT3.
- Full-repository lint exited successfully; scoped lint reported no warnings in the audit diff.
- Scoped formatting and `git diff --check` passed. The generated snapshot is byte-validated by the scoped effect check.

## Card ledger

### BT3-001 — Poromon

Score: 10/10. Legal public red lifecycle; inherited 1000-DP deletion and peer boundary green. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `internal-docs/audits/BT3/BT3-001.md` (2026-09-10):

- Catalog and rules: red level-2 Digi-Egg; inherited When Attacking deletes one opposing Digimon with 1000 DP or less.
- Implementation: complete compiled IR, registered exclusively through `registerIrCard`.
- Behavior: existing tests cover multiple legal targets and the no-target branch. The strengthened public-flow test hatches BT3-001, evolves through BT3-007 into BT1-016, cycles turns, moves from breeding, and attacks.
- Isolation: the public flow deletes the natural 1000-DP opponent while preserving a natural 2000-DP opponent and an allied 1000-DP peer.
- Focused result: 3/3 passed with one worker and file parallelism disabled.
- Score: 8/10 pending collection delivery gates.

### BT3-002 — DemiVeemon

Score: 10/10. Jamming predicate and once-per-turn inherited draw proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:49899-49914` identifies blue level-2 Digi-Egg text `[When Attacking][Once Per Turn] If this Digimon has Jamming, Draw 1`. Glossary §Once Per Turn says repeated qualifying events in one turn activate only once.
- **IR trace:** `BT3-002.ts:8-32` and `effects.json:101938-101955` agree on inherited When Attacking, `selfHasKeyword(Jamming)`, Draw one, Once Per Turn, full coverage, and no residual.
- **Behavioral proof:** `BT3-002.test.ts:9-46` covers a legal blue Jamming host (`BT3-021`) and a legal blue non-Jamming host (`BT3-022`); `:48-81` attacks the same Jamming host twice and asserts only the first card is drawn. The proof uses `observe(s.engine).isAttacking()` for the production observer seam.
- **Peer/stack proof:** Both hosts are legal blue level-3 evolutions from a blue level-2 Digi-Egg. `conditions.ts:173-177` reads the host’s live keyword set, and `continuous.ts:1062-1067` supplies printed and granted keywords. EX2-013 is the same Jamming-gated inherited-trigger peer.
- **Correction/finding:** Replaced the prior off-color red hosts with BT3-021/BT3-022, added the repeated-attack Once Per Turn proof, and corrected the observer helper reference from a nonexistent `GameEngine.isAttacking()` method to `observe(s.engine).isAttacking()`.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-003 — Upamon

Score: 10/10. Security-count boundary and once-per-turn draw proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:49917-49932` identifies yellow level-2 Digi-Egg text `[When Attacking][Once Per Turn] If you have 3 or fewer security cards, Draw 1`. The condition is the controller’s current security count at the attack trigger.
- **IR trace:** `BT3-003.ts:8-35` and `effects.json:101957-101981` agree on inherited When Attacking, mine/security `lte 3`, Draw one, Once Per Turn, full coverage, and no residual.
- **Behavioral proof:** `BT3-003.test.ts:8-28` proves a three-security positive; `:30-51` proves four security does not draw; `:53-86` repeats a qualifying attack in one turn and asserts only one card is drawn.
- **Peer/stack proof:** The host was corrected to yellow BT3-032, a legal yellow level-3 evolution from the yellow BT3-003 Digi-Egg. `conditions.ts:270-290` reads live security-zone size. BT1-006 is the thresholded inherited Draw peer.
- **Correction/finding:** Replaced the prior off-color blue host with BT3-032, added repeated Once Per Turn coverage, and preserved the exact boundary at three versus four security cards.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-004 — Minomon

Score: 10/10. Digimon-attack positive and player-attack negative proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:49935-49950` identifies green level-2 Digi-Egg text that grants its host +1000 DP for the turn when attacking one of the opponent’s Digimon. §11-2-2 and §11-2-6 establish declaration target identity; Q1047 clarifies that a player attack later blocked does not become an attack on the blocker for this effect.
- **IR trace:** `BT3-004.ts:8-41` and `effects.json:101983-102004` agree on inherited When Attacking, self-only +1000, `forTheTurn`, opponent Digimon target filter, full coverage, and no residual.
- **Behavioral proof:** `BT3-004.test.ts:8-25` proves the opponent-Digimon target grants exactly +1000 DP; `:27-52` reproduces Q1047 with a player declaration and Blocker response and asserts no bonus and no security loss. `conditions.ts:59-68` proves the original target is retained before redirection.
- **Peer/stack proof:** The host was corrected to green BT3-045, a legal green level-3 evolution from BT3-004. The target/blocker setup matches the inherited attack-target peer patterns in BT1-001 and BT1-007.
- **Correction/finding:** Replaced the prior off-color RagnaLoardmon host with BT3-045. No IR defect was found; the Q1047 boundary is now directly represented in the focused proof.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-005 — Kakkinmon

Score: 10/10. Level-7 boundary and once-per-turn memory proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:49953-49968` identifies black level-2 Digi-Egg text `[When Attacking][Once Per Turn] If this Digimon is level 7, gain 1 memory`. The condition is the current host level, not the level of the inherited card.
- **IR trace:** `BT3-005.ts:8-31` and `effects.json:102006-102022` agree on inherited When Attacking, GainMemory one, `selfLevelIs 7`, Once Per Turn, full coverage, and no residual. `conditions.ts:470-474` reads the current top-card level.
- **Behavioral proof:** `BT3-005.test.ts:8-33` proves a level-7 gain; `:35-59` proves a level-6 non-gain; `:61-96` repeats the level-7 attack and asserts memory remains one after the second attack.
- **Peer/stack proof:** Both positive tests use a legal black chain: BT3-005 black Digi-Egg → BT3-059 black level 3 → BT3-064 black level 4 → BT3-068 black level 5 → BT3-075 black level 6 → BT9-111 black level 7. The level-6 negative stops at BT3-075. This avoids relying on RagnaLoardmon’s unrelated printed Security Attack keyword.
- **Correction/finding:** Replaced the former incomplete/off-color direct stacks with complete legal black chains, selected a neutral level-7 host, and added repeated Once Per Turn proof. No executable defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-006 — DemiMeramon

Score: 10/10. Inherited draw/trash and top-card non-inherited isolation green. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `internal-docs/audits/BT3/BT3-006.md` (2026-09-10):

- Catalog/IR: purple level-2 Digi-Egg; inherited On Deletion Draw 1 then trash 1; complete IR through exclusive `registerIrCard`.
- Behavior: the host-deletion test proves draw/trash zone changes; the added top-card negative proves inherited-only placement.
- Focused result: 2/2 passed in the combined single-worker run.
- Score: 8/10 pending delivery gates.

### BT3-007 — Agumon

Score: 10/10. Vanilla play and legal red Digi-Egg evolution proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:49989-50010` identifies a red level-3 Digimon, play cost 2, 4000 DP, and red level-2 evolution for one memory, with no effect text.
- **IR trace:** `BT3-007.ts:4-10` is an explicit empty full-coverage module registered once with `registerIrCard`; `effects.json:102038` remains an empty full-coverage record. The module carries no executable effects, matching the vanilla card.
- **Behavioral proof:** `BT3-007.test.ts:6-17` proves play cost and 4000 DP with no effect-resolution event; `:19-41` proves evolution from a red BT3-001 Digi-Egg for one memory, standard evolution draw, and resulting 4000 DP.
- **Peer/stack proof:** The evolution probe uses the legal red BT3-001 → BT3-007 route and follows the standard digivolution draw seam used by the engine’s evolution tests. No traits or inherited effects need registration.
- **Correction/finding:** Added an explicit empty IR module and direct test import, alongside the legal evolution/draw proof.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-008 — Zubamon

Score: 10/10. Reveal categories, duplicates, Option exclusion, and evolution negative proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:50013-50035` identifies a red level-3 Digimon, play cost 3, 1000 DP, red level-2 evolution for zero memory, and the On Play instruction to reveal five, add one RagnaLoardmon Digimon and one Legend-Arms Digimon, then bottom the rest.
- **IR trace:** `BT3-008.ts:8-55` and `effects.json:102039-102074` agree on On Play, RevealAdd five, two independent `Digimon` filters, name match for RagnaLoardmon, trait match for Legend-Arms, hand destinations, deck-bottom rest, full coverage, and no residual.
- **Behavioral proof:** `BT3-008.test.ts:8-32` proves one card in each slot; `:34-51` proves only one card when only RagnaLoardmon is revealed; `:53-76` proves an `Option` with Legend-Arms does not fill the Digimon slot; `:78-101` proves one RagnaLoardmon can fill both slots; `:103-130` proves On Play does not fire when Zubamon is digivolved.
- **Peer/stack proof:** Q1048–Q1050 are all represented. `reveal.ts:199-217` filters each slot against the full reveal while tracking taken instances; `:274-320` bounds each slot; `:508-587` returns unselected cards to the chosen deck disposition. Q1050’s overlap behavior is exercised by two RagnaLoardmon instances. EX6-065 supplies the explicit Legend-Arms Option kind-boundary case.
- **Correction/finding:** Added the Option kind-boundary proof and a legal red Digi-Egg evolution timing proof. No executable defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-009 — Hawkmon

Score: 10/10. Focused baseline green; legal vanilla evolution and stack proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT3-reaudit/BT3-009.md` (2026-09-10):

- Catalog and KB confirm the effect-free red level-3 card; full empty compiled IR registers exclusively through `registerIrCard`.
- Focused proof covers printed play cost/DP and a legal red level-2 evolution with resulting stack and draw. Coordinator baseline passed; delivery gates pending.

### BT3-010 — ZubaEagermon

Score: 10/10. Baseline focused green; inherited Security Attack +1 activation and isolation. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:50062-50084` identifies a red level-4 Digimon, play cost 4, 4000 DP, red level-3 evolution for two memory, and inherited `[Your Turn] While this Digimon is level 7, Security Attack +1`. Comprehensive rules §15-8-2 and §15-16-8 require the Aura to be live only while the level and owner-turn conditions hold.
- **IR trace:** `BT3-010.ts:8-44` and `effects.json:102076-102095` agree on inherited YourTurn Aura, self target, SecurityAttack +1, live `selfLevelIs 7` gate, full coverage, and no residual. `module.ts:468-479` supplies the owner-turn guard; `statics.ts:17-51` and `:65-67` apply and revoke the continuous keyword with the condition.
- **Behavioral proof:** `BT3-010.test.ts:8-24` proves one Security Attack grant on a level-7 host during the owner’s turn; `:26-40` proves no grant at level 6; `:42-57` proves no grant during the opponent’s turn.
- **Peer/stack proof:** The positive and opponent-turn tests use a legal red chain BT3-001 → BT3-009 → BT3-010 → BT3-013 → BT3-016 → BT6-018. The level-6 negative stops at BT3-016. BT1-017 supplies the continuous Security Attack peer pattern. BT6-018 has no printed Security Attack, so the observed amount isolates BT3-010’s inherited grant.
- **Correction/finding:** Replaced the former off-color/incomplete stacks with legal red chains and used a neutral level-7 host to avoid conflating the inherited grant with RagnaLoardmon’s own Security Attack. No executable defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-011 — Greymon

Score: 10/10. Focused baseline green; Security battle ordering and zone proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT3-reaudit/BT3-011.md` (2026-09-10):

- Catalog and KB Q1051–Q1053 align with the compiled end-of-security-battle free-play effect; exclusive `registerIrCard`.
- Focused proof covers both losing and winning security battles, end-of-battle ordering, trash-to-battle transition, and zero memory cost. Coordinator baseline passed; delivery gates pending.

### BT3-012 — Aquilamon

Score: 10/10. Legal public red lifecycle and natural 2000/3000-DP boundary green. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `internal-docs/audits/BT3/BT3-012.md` (2026-09-10):

- Catalog/IR: red level-4 Digimon; inherited When Attacking deletes one opposing Digimon with 2000 DP or less; complete IR through exclusive `registerIrCard`.
- Behavior: existing target-selection coverage now uses a natural above-boundary peer. The added public test hatches and legally evolves BT3-001 → BT3-009 → BT3-012 → BT3-015, cycles turns, moves from breeding, and attacks.
- Isolation: natural 2000-DP BT1-010 is deleted and natural 3000-DP BT1-009 survives.
- Focused result: 2/2 passed in the combined single-worker run.
- Score: 8/10 pending delivery gates.

### BT3-013 — Duramon

Score: 10/10. Baseline focused green; inherited Security Attack +1 activation and isolation. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-013.ts:8-44` is full and inherited: a self Aura grants Security Attack +1 only while the host is level 7 and the owner has the turn. `BT3-013.test.ts:7-30` now uses complete legal stacks: AD1-001 red level 4 → BT3-013 red level 5 → BT3-016 red level 6 → BT3-112 white level 7 for the positive/opponent-turn cases, and AD1-001 → BT3-013 → BT3-016 for the level-6 negative. The snapshot agrees, and BT3-010 supplies a matching inherited Aura peer; no static defect was found.

### BT3-014 — Silphymon

Score: 10/10. Baseline focused green; both digivolution-source clauses and boundary peers proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The hand-fixed direct module `BT3-014.ts:5-35` correctly uses SetBaseDP to 1000 for one opposing Digimon at level 4 or lower and a Your Turn color grant of Yellow for the turn. Focused proof `BT3-014.test.ts:26-104` covers effective Red+Yellow on the owner's turn, Red-only on the opponent's turn and in breeding, legal red BT3-010 → BT3-014 evolution, level targeting, and the exact DP result. The SetBaseDP primitive and modifier tests cover original-DP overwrite and the concurrent -1000 deletion boundary; BT3-040 is the color-grant peer.

The generated snapshot at `effects.json:102153-102187` disagrees on the color grant (`trait`, lower-case token, no duration) and uses a legacy-equivalent level predicate. The direct module is the exclusive executable authority and is fully traced, so the stale generated record is deferred artifact synchronization rather than a behavioral ambiguity.

### BT3-015 — MetalGreymon

Score: 10/10. Baseline focused green; Piercing and optional Virus recovery branches isolated. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-015.ts:8-50` declares Piercing and an optional When Digivolving Return from the owner's trash to hand, constrained to one level 7 Digimon whose Virus attribute matches the shared name/trait matcher. `BT3-015.test.ts:7-64` proves the legal AD1-001 red level 4 → BT3-015 red level 5 stack, successful return, Piercing, and an explicit optional decline. BT3-071 is a Return peer and BT3-016/018 are keyword peers; snapshot/direct records agree and no static defect was found.

### BT3-016 — Durandamon

Score: 10/10. Baseline focused green; inherited Piercing activation and peer isolation. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-016.ts:8-26` is full, inherited, and contains only Piercing. Its focused proof `BT3-016.test.ts:7-15` now uses the complete legal AD1-001 → BT3-013 → BT3-016 → BT3-112 red/red/red/white stack, proving the inherited keyword reaches a legal level-7 host. Piercing peers and the shared keyword ledger agree; snapshot/direct records agree and no static defect was found.

### BT3-017 — Valkyrimon

Score: 10/10. Baseline green; both triggers and 4000-DP boundary isolated. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-017.ts:8-53` carries separate When Digivolving and When Attacking Delete actions, each selecting one opposing Digimon at current DP `<= 4000`. `BT3-017.test.ts:7-50` proves the threshold for digivolution and attack, and proves a card above the threshold survives; AD1-002 is a legal red level 5 source for the red level 6 card. Shared removal targeting and same-mechanism deletion peers agree; snapshot/direct records agree and no static defect was found.

### BT3-018 — BlitzGreymon

Score: 10/10. Baseline green; de-digivolve and Piercing clauses proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-018.ts:8-41` declares Piercing and De-Digivolve 2 against one opposing Digimon. `BT3-018.test.ts:6-25` proves a legal AD1-002 red level 5 → BT3-018 red level 6 evolution, removes two cards from an opponent's stack, leaves the correct top card, and proves Piercing. De-Digivolve shared mechanics and Piercing peers agree; snapshot/direct records agree and no static defect was found.

### BT3-019 — RagnaLoardmon

Score: 10/10. Baseline green; optional Legend-Arms placement branches proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The hand-fixed direct module `BT3-019.ts:7-63` correctly declares Security Attack +1 and Reboot, then performs optional PlaceUnder from hand with an exact Durandamon/BryweLudramon name filter, top position, self host, and conditional GainMemory 3 only when placement acted. `BT3-019.test.ts:7-71` proves legal AD1-004 red/black level 6 → BT3-019 red level 7 evolution, placement and memory restoration, both keywords, and optional decline; Q1058–Q1060 and the shared PlaceUnder/ifThisEffectActed mechanisms support the interpretation.

The generated snapshot at `effects.json:102274-102311` instead models Reboot as Unsuspend and placement as a GainMemory cost that can source digivolution cards. The direct module is the exclusive executable authority and is fully traced, so the stale snapshot is deferred artifact synchronization rather than a behavioral ambiguity.

### BT3-020 — Patamon

Score: 10/10. Baseline green; vanilla play/stat behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog establishes a blue level 3, 4000-DP vanilla Rookie with play cost 3 and blue level 2 evolution cost 0. `BT3-020.ts:4-10` is an explicit empty full-coverage module registered once through `registerIrCard`, while `effects.json:102313` remains the matching empty record. `BT3-020.test.ts:4-15` proves catalog DP, play-memory cost, and absence of effect resolution; no implementation gap or duplicate registration exists.

### BT3-021 — Veemon

Score: 10/10. Baseline green; Jamming battle and source-card isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.3 Rookie, 2000 DP, play cost 3, Blue Lv.2 evolution cost 0,
  `Free` attribute and `Mini Dragon` type. Its sole printed clause is
  `＜Jamming＞` (cannot be deleted in battles against Security Digimon).
- KB: no card-specific entry. The comprehensive Jamming, Security Digimon,
  battle, and inherited-effect rules supply the full contract.
- Implementation: `apps/api/src/cards/BT3/BT3-021.ts` contains a Static Jamming
  keyword, full coverage, no residual, and only `registerIrCard`.
- Proof: `BT3-021.test.ts` now covers the keyword, survival in a losing battle
  against the stronger Security Digimon BT1-081, deletion in a losing battle
  against an opposing BT1-081, and the negative case where Veemon is a source
  under a legal Blue level-4 host. BT1-016 was used as the same-mechanism
  Jamming peer.
- Status: the static IR, Security-only deletion protection, opposing-Digimon
  boundary, and stack boundary are all mapped. No trait-filtered behavior is
  printed or implied, and no direct behavior correction was required.

### BT3-022 — Penguinmon

Score: 10/10. Baseline green; vanilla play and legal evolution proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.3 Rookie, 5000 DP, play cost 3, Blue Lv.2 evolution cost 1,
  `Vaccine` attribute and `Avian` type, with no effect or inherited text.
- KB: no card-specific entry. General Digimon, Digi-Egg, and evolution rules
  apply.
- Implementation: `BT3-022.ts:4-10` is an explicit empty full-coverage module
  registered once with `registerIrCard`; the snapshot remains `{ effects: [],
coverage: "full", residual: [] }`.
- Proof: `BT3-022.test.ts` checks play at 5000 DP/cost 3 with no effect
  activation, and checks a legal Blue Digi-Egg
  `BT3-002` in the breeding area evolving into Penguinmon without an effect.
  BT3-021 and BT3-023 were compared as neighboring Blue Rookie records; no
  trait-based behavior is implied by Penguinmon's Avian type.
- Status: the vanilla empty-module boundary and legal evolution path are
  proven; no printed clause or residual ambiguity remains.

### BT3-023 — Angemon

Score: 10/10. Baseline green; bottom-source removal and no-source negative proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.4 Champion, 3000 DP, play cost 4, Blue Lv.3 evolution cost 2,
  `Vaccine` attribute and `Angel` type. The inherited When Attacking clause
  trashes the bottom digivolution card of one opponent's Digimon.
- KB: no card-specific entry. Comprehensive §§4-3, 4-8, and 15-3 constrain
  inherited activation to a card in the stack and define the target as an
  opposing Digimon with a digivolution card.
- Implementation: `BT3-023.ts` uses an inherited When Attacking
  `TrashDigivolution`, opponent Digimon filter, `hasAny` source requirement,
  amount 1, and `fromTop: false`; it is full coverage with no residual.
- Proof: `BT3-023.test.ts` uses a legal BT3-026-over-BT3-023 source stack and
  now gives the opposing target both bottom BT1-010 and top BT1-011 sources.
  It verifies only the bottom source is trashed, the top source remains, and a
  source-less opposing Digimon is unchanged. BT2-025 was compared as the
  analogous top-source trash peer; the difference in `fromTop` is intentional.
- Status: inherited scope, opponent controller, source requirement, amount,
  and bottom ordering are all proven statically. No trait-filtered behavior is
  printed or implied, and no direct behavior correction was required.

### BT3-024 — Airdramon

Score: 10/10. Baseline green; Security battle outcomes and timing proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.4 Champion, 4000 DP, play cost 5, Blue Lv.3 evolution cost 2,
  `Vaccine` attribute and `Mythical Beast` type. Its Security clause plays this
  card without paying its memory cost at the end of the battle.
- KB: Q1061 confirms the result is an ordinary Digimon in the battle area;
  Q1062 requires the effect even when the Security Digimon loses its battle;
  Q1063 requires the next security check to continue after the play.
- Implementation: the original direct module played the card immediately from
  Security, before the required battle. It was corrected to
  `timing: "endOfBattle"` plus a one-shot `whenSecurityBattleEnded` SubTrigger
  that plays the exact source from trash without paying, with full coverage and
  no residual. This follows the same delayed Security-play seam as BT3-011.
- Proof: `BT3-024.test.ts` covers Airdramon winning against weaker BT1-010,
  losing against stronger BT1-081 (Q1062), and being played before the second
  check when BT2-079 has Security Attack +1 with a two-card security stack
  (Q1063). It now also proves the weaker attacker is deleted by the Security
  battle, the stronger attacker survives, and the play event occurs after the
  first battle but before the next security check. Q1061's normal-battle-area
  identity is asserted by the field permanent result. BT3-011, BT2-079, and
  BT2-050 were checked as delayed-play and multi-check/security peers.
- Status: Security timing, self identity, free play, loss/win branches, and
  multi-check ordering are mapped after the direct timing correction. No
  trait-filtered behavior is printed or implied.

### BT3-025 — ExVeemon

Score: 10/10. Baseline green; own/opponent and level boundary isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.4 Champion, 4000 DP, play cost 5, Blue Lv.3 evolution cost 2,
  `Free` attribute and `Mythical Dragon` type. Its When Digivolving clause
  unsuspends one of the controller's level 4 or lower Digimon.
- KB: no card-specific entry. General When Digivolving timing, controller, and
  level-boundary rules apply.
- Implementation: `BT3-025.ts` targets the controller's Digimon with
  `levelComparison: { op: "lte", value: 4 }`, count 1, and full coverage.
  The omitted zone is resolved through the permanent target seam, which scans
  field permanents rather than cards in hand, trash, or security.
- Proof: `BT3-025.test.ts` covers a legal Blue Lv.3-to-Lv.4 evolution and
  preferred own level-4 target. The negative fixture now includes an opposing
  suspended Digimon and own suspended level-5 BT3-026, while asserting that the
  own level-4 target alone unsuspends. This makes controller and exact level
  upper-bound behavior explicit.
- Status: timing, controller, count, and level boundary are statically covered;
  no trait-filtered behavior is printed or implied, and no direct behavior
  correction was required.

### BT3-026 — MagnaAngemon

Score: 10/10. Baseline green; bottom-source removal and no-source negative proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.5 Ultimate, 7000 DP, play cost 6, Blue Lv.4 evolution cost 3,
  `Vaccine` attribute and `Archangel` type. Its inherited When Attacking clause
  trashes the bottom digivolution card of one opponent's Digimon.
- KB: no card-specific entry. The inherited-effect, source-stack, opponent
  target, and bottom-order rules are the same as BT3-023.
- Implementation: `BT3-026.ts` uses the same full inherited IR shape as Angemon:
  opposing Digimon, `hasAny` digivolution cards, amount 1, `fromTop: false`,
  and no residual.
- Proof: `BT3-026.test.ts` uses a legal BT3-029-over-BT3-026 source stack and
  now verifies bottom BT1-010 removal while top BT1-011 remains. Its source-less
  negative verifies that the attack still completes without trashing anything.
  BT3-023 and BT2-025 were compared as bottom/top source peers.
- Status: inherited activation, target controller, source requirement, amount,
  and bottom ordering are statically covered. No trait-filtered behavior is
  printed or implied, and no direct behavior correction was required.

### BT3-027 — Paildramon

Score: 10/10. Baseline green; Jamming, name predicate, and once-per-turn proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.5 Ultimate, 7000 DP, play cost 7, Blue or Green Lv.4
  evolution cost 3, `Free` attribute and `Dragonkin` type. It has printed
  Jamming plus an inherited `[When Attacking][Once Per Turn]` effect that
  unsuspends this Digimon when its name contains `Imperialdramon`.
- KB: no card-specific entry. Comprehensive keyword, inherited-effect, name,
  attack-timing, and once-per-turn rules apply.
- Implementation: `BT3-027.ts` contains a Static Jamming effect and an
  inherited When Attacking self-unsuspend with `selfHasNameContaining`,
  `frequency: "OncePerTurn"`, full coverage, and no residual.
- Proof: `BT3-027.test.ts` covers printed Jamming, a legal Imperialdramon host
  carrying Paildramon as a source, rejection for a non-Imperialdramon host, and
  a second attack in the same turn that remains suspended after the first
  activation. BT3-031 was used as the Imperialdramon-name host and BT3-021 was
  compared as the simple Jamming peer.
- Status: printed-vs-inherited scope, name condition, self target, attack timing,
  and once-per-turn ledger behavior are statically covered. No trait-filtered
  behavior is printed or implied, and no direct behavior correction was
  required.

### BT3-028 — Bastemon

Score: 10/10. Baseline green; vanilla play and legal blue evolution proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.5 Ultimate, 8000 DP, play cost 7, Blue Lv.4 evolution cost 2,
  `Virus` attribute and `Beastkin` type, with no effect or inherited text.
- KB: no card-specific entry. General Digimon and evolution rules apply.
- Implementation: `BT3-028.ts:4-10` is an explicit empty full-coverage module
  registered once with `registerIrCard`; the snapshot remains `{ effects: [],
coverage: "full", residual: [] }`.
- Proof: `BT3-028.test.ts` checks play at 8000 DP/cost 7 with no effect
  activation, and checks legal Blue Lv.4 BT2-024
  evolution without effect activation. BT3-027 and BT3-029 were compared as
  neighboring effect-bearing Ultimate/Mega records; Bastemon's Beastkin type
  does not create an unprinted filter.
- Status: the vanilla empty-module boundary and legal evolution path are
  proven; no printed clause or residual ambiguity remains.

### BT3-029 — Goldramon

Score: 10/10. Baseline green; another-Digimon trigger and once-per-turn proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.6 Mega, 11000 DP, play cost 11, Blue Lv.5 evolution cost 3,
  `Vaccine` attribute and `Holy Dragon`/`Four Great Dragons` types. Its Your
  Turn once-per-turn clause unsuspends this Digimon when another Digimon is
  played.
- KB: no card-specific entry. General Your Turn, once-per-turn, and play-event
  rules apply.
- Implementation: `BT3-029.ts` maps Your Turn to a `whenPlayed` SubTrigger with
  a mine controller default, `excludeSelf: true`, Digimon kind, self unsuspend,
  and `frequency: "OncePerTurn"`; coverage is full with no residual.
- Proof: `BT3-029.test.ts` covers another own Digimon play and a second own play
  in the same turn after manually re-suspending Goldramon. The two-event case
  proves the once-per-turn ledger, while the `excludeSelf` source filter and
  controller default are directly visible in the IR. BT3-030's Your Turn live
  grant was checked as a different trigger/action peer.
- Status: Your Turn timing, when-played event, another-Digimon boundary, self
  target, and once-per-turn behavior are statically mapped. No trait-filtered
  behavior is printed or implied, and no direct behavior correction was
  required.

### BT3-030 — Leopardmon

Score: 10/10. Baseline green; optional stack play and level-scoped Jamming proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Blue Lv.6 Mega, 11000 DP, play cost 12, Blue Lv.5 evolution cost 4,
  `Data` attribute and `Holy Warrior`/`Royal Knight` types. Its optional When
  Digivolving effect may play one own level-4-or-lower digivolution card as a
  separate Digimon for free; during its controller's turn, all own level-4-or-
  lower Digimon gain Jamming.
- KB: Q1064 covers declining the optional play; Q1065 confirms the newly
  digivolved Leopardmon's own stack is eligible; Q1066 confirms the live grant
  ends immediately when a recipient reaches level 5 or higher.
- Implementation: `BT3-030.ts` uses optional `PlayWithoutCost` from own
  `digivolutionCards`, level `lte 4`, count 1, `payCost: false`, and a Your Turn
  all-target Jamming grant with `forTheTurn` and
  `whileMatchesTargetFilter: true`; it is full coverage with no residual.
- Proof: `BT3-030.test.ts` now asserts the exact IR shape, verifies candidate
  cards from two own stacks including the Leopardmon host's own stack, and adds
  a legal level-5 source under a BT3-029 host to prove it is excluded. It also
  covers declining the optional effect (Q1064), and the Q1066 level-4-to-level-
  5 loss of Jamming. Q1065 is directly exercised by selecting the own-stack
  level-4 card. BT13-056 was checked as a same-pattern Leopardmon/when-played
  peer.
- Status: optionality, source zone, controller, level filter, free play, all-
  target count, turn duration, live reevaluation, own-stack eligibility, and
  level-5 exclusion are statically mapped. The card's traits do not appear in
  either effect filter, so no trait-specific deck fixture is required; no direct
  behavior correction was required.

### BT3-031 — Imperialdramon: Dragon Mode

Score: 10/10. Baseline green; cost predicate, breeding exclusion, Jamming, and unsuspend proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules and Q1067 require the reduction to apply only when this card is still in hand and the base Digimon is a battle-area Paildramon or Dinobeemon, not a breeding-area card. Direct IR `BT3-031.ts:9-73` uses a hand-resident digivolve CostModifier of 2 with an exact name filter, grants persistent Jamming, and unsuspends all own Jamming Digimon on evolution. `BT3-031.test.ts:8-86` proves the reduction and Jamming unsuspend over Paildramon, rejects an unrelated level 5 despite a neighboring Paildramon, rejects breeding, and checks Jamming.

The generated snapshot at `effects.json:102482-102528` is a different older compiler representation, while the direct runtime path and reducer seam are coherent, fully traced, and exclusive. The card has no unresolved executable gap; snapshot synchronization is deferred without lowering the static score.

### BT3-032 — Armadillomon

Score: 10/10. Baseline green; vanilla play/stat behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog defines a yellow level 3 vanilla Rookie with 4000 DP, play cost 3, and yellow level 2 evolution cost 0. `BT3-032.ts:4-10` is an explicit empty full-coverage module registered once through `registerIrCard`, and `effects.json:102529` remains empty with full coverage. `BT3-032.test.ts:4-16` proves play cost, DP, memory movement, and no effect activation; no static implementation gap was found.

### BT3-033 — Salamon

Score: 10/10. Focused inherited DP reduction and target-count isolation. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-033.ts:8-33` is full and inherited: one opposing Digimon receives -1000 DP for the turn on the host's attack. `BT3-033.test.ts:5-59` proves the modifier and the one-target limit using an opposing board with two Digimon; its BT3-036 over BT3-033 host is a legal yellow level 3-to-4 stack. The snapshot agrees and the identical BT3-035 modifier is a nearby peer; no static defect was found.

### BT3-034 — Lopmon

Score: 10/10. Focused optional accept/decline security flow and rulings. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The hand-fixed direct IR `BT3-034.ts:6-24` uses `SecurityManipulation` `lookAndMayAddToHand`, with Draw 1 only in the add branch. `BT3-034.test.ts:6-67` proves successful add plus draw and optional decline preserving security and deck. The Q1068–Q1071 edge rulings are supported by the shared security primitive; snapshot/direct records agree, and no static implementation gap was found.

### BT3-035 — Gatomon

Score: 10/10. Focused inherited attack DP reduction. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-035.ts:8-33` exactly mirrors BT3-033: inherited When Attacking, one opposing Digimon, -1000 for the turn. `BT3-035.test.ts:5-29` now uses a legal yellow stack, BT3-032 → BT3-035 → BT3-038 (level 3 → 4 → 5), and proves the modifier against an opposing Digimon. Snapshot/direct records agree; peer behavior and the shared modifier ledger show no static gap.

### BT3-036 — Ankylomon

Score: 10/10. Focused Security play across winning/losing battle outcomes. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Q1072–Q1074 and the Security rules require this card to battle as a Security Digimon, then play as a normal Digimon at end of battle regardless of the outcome and before a next check. The original direct IR played it immediately in the Security timing, skipping the required battle. I corrected `BT3-036.ts:8-40` to use `timing: "endOfBattle"` and a one-shot `whenSecurityBattleEnded` SubTrigger that plays the exact source from trash without paying.

Focused proof in `BT3-036.test.ts:5-55` now checks the losing battle, asserts play after `securityChecked`, and checks the winning Security Digimon battle. The generated snapshot remains the pre-fix immediate shape at `effects.json:102583-102598`; because the corrected direct module is the exclusive executable registration and is fully traced, this is deferred artifact synchronization rather than a score-reducing ambiguity.

### BT3-037 — Turuiemon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog defines a yellow level 4 vanilla Champion with 6000 DP, play cost 6, and yellow level 3 evolution cost 1. `BT3-037.ts:4-10` is an explicit empty full-coverage module registered once through `registerIrCard`, and `effects.json:102599` remains empty with full coverage. `BT3-037.test.ts:4-16` proves play cost, DP, memory movement, and no effect activation; no static implementation gap was found.

### BT3-038 — Antylamon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

BT3-038, BT3-039, and BT3-040 were independently rechecked in ascending order
against their catalog records, one card-specific KB query each, direct IR,
focused tests, and the shared interpreter paths. BT3-038 now has an explicit
empty full-coverage module and direct focused-test import. The existing BT3-039
and BT3-040 behavior remains faithful; no additional card-rule correction was
identified. The range-local suppressions were removed from the owned modules.

### BT3-039 — Angewomon

Score: 10/10. Both clauses and security-count boundary proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Direct IR `BT3-039.ts:8-65` applies Security Attack -2 to one opposing Digimon until the end of the opponent's next turn and carries an inherited optional play-from-hand effect gated by the owner's security count `<= 3`, yellow level 3 target, and no cost. `BT3-039.test.ts:8-60` proves the -2 grant, the three-security positive, and the four-security negative; its host is now BT3-041 over BT3-039, a legal yellow level 5-to-6 stack, rather than the former same-level BT3-040 fixture. Snapshot/direct records agree and no static defect was found.

### BT3-040 — Shakkoumon

Score: 10/10. Turn color, breeding exclusion, and source-less peer filter proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The hand-fixed direct IR `BT3-040.ts:5-35` correctly grants Blue only during the owner's turn and only in the battle area, then dynamically grants opposing Digimon with no digivolution cards Security Attack -1 during the opponent's turn. `BT3-040.test.ts:11-44` proves Yellow+Blue on the owner's turn, Yellow-only in breeding, and the no-stack versus with-stack boundary; Q1075–Q1077 and shared continuous Aura semantics support these boundaries.

The generated snapshot at `effects.json:102642-102672` incorrectly models Blue as an unbounded trait grant and Security Attack -1 as a permanent GainKeyword. The direct module is the exclusive executable authority and is fully traced, so the stale snapshot is deferred artifact synchronization rather than a behavioral ambiguity.

### BT3-041 — Cherubimon

Score: 10/10. Security threshold and yellow-trash source behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Yellow Lv.6 Mega, 11000 DP, play cost 11, Yellow Lv.5 evolution cost
  3, `Vaccine` attribute, and `Cherub`/`Three Great Angels` types. Its When
  Attacking clause, conditional at three or fewer security cards, places one
  yellow Digimon from trash on top of its security face down.
- KB: Q1078 requires the selected trash card to be shown to the opponent before
  hidden security placement.
- Implementation: `BT3-041.ts` maps When Attacking to `SecurityManipulation`
  `placeAsSecurity`, mine trash source, Yellow Digimon filter, `toTop: true`,
  `revealChosen: true`, and a mine security `lte 3` condition. It is full
  coverage with no residual; the committed effects snapshot omits
  `revealChosen`, so the direct module is authoritative under
  `docs/ARCHITECTURE.md:48-51`.
- Proof: `BT3-041.test.ts` covers the exact three-security boundary, moves a
  yellow BT3-033 out of trash while leaving red BT1-010 in trash, and verifies
  the placed card is face down at the security top and emits the public
  `cardRevealed` event before placement. Its four-security negative leaves the
  yellow card in trash. A Yellow Lv.5-to-Lv.6 evolution route was
  checked against catalog costs and the BT3-042/043 Yellow Mega peers; no
  trait-filtered target is implied by Cherubimon's own traits.
- Status: trigger timing, security count, mine controller, Yellow Digimon
  filter, trash source, top placement, reveal-before-hidden-placement, and
  threshold boundary are mapped. The missing public-reveal flag was corrected
  in the direct module; the snapshot remains stale but is not executable
  authority.

### BT3-042 — ClavisAngemon

Score: 10/10. Security threshold and opponent DP modification proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Yellow Lv.6 Mega, 10000 DP, play cost 12, Yellow Lv.5 evolution cost
  3, `Vaccine`/`Virtue`. Its When Attacking effect, at three or fewer security,
  gives one opponent's Digimon -6000 DP for the turn.
- KB: Q1079 confirms the -6000 modifier remains for the effect's turn even if
  the controller later reaches four security cards.
- Implementation: `BT3-042.ts` targets one opponent Digimon, applies -6000,
  uses `forTheTurn`, and gates activation with the mine security count `lte 3`.
  Coverage is full with no residual.
- Proof: `BT3-042.test.ts` verifies the -6000 result at exactly three security
  and verifies no modifier above the threshold. The target and duration are
  also checked against the shared `ModifyDP`/continuous ledger and the
  neighboring BT3-041/043 Yellow Mega implementations.
- Status: target controller, amount, turn duration, When Attacking timing, and
  inclusive security threshold are represented without a trait filter. No
  direct behavior correction was required; Q1079 is resolved by the explicit
  `forTheTurn` duration rather than rechecking the condition later.

### BT3-043 — Kentaurosmon

Score: 10/10. Both clauses, five-target cap, and controller isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Yellow Lv.6 Mega, 11000 DP, play cost 12, Yellow Lv.5 evolution cost
  3, `Vaccine`/`Holy Warrior`/`Royal Knight`. It gives up to five opposing
  Digimon Security Attack -2 until the end of the opponent's next turn when
  digivolving, and gives one opposing Digimon -11000 DP for the turn on
  deletion.
- KB: no card-specific entry. General When Digivolving, On Deletion, target,
  up-to, keyword, and duration rules apply.
- Implementation: `BT3-043.ts` has a full When Digivolving `GainKeyword` action
  with opponent Digimon target, count 5, `upTo: true`, amount -2, and
  `untilOpponentTurnEnd`; its On Deletion action targets one opponent Digimon
  for -11000 `forTheTurn`.
- Proof: `BT3-043.test.ts` uses a legal AD1-015 Yellow Lv.5 to Kentaurosmon
  evolution and checks two opposing Digimon receive -2. The strengthened
  fixture adds six opposing Digimon plus an own Digimon and proves exactly five
  opposing targets are affected while the own card is excluded. The deletion
  test checks the exact -11000 amount. BT3-042 and BT3-048 were compared for
  temporary DP modifiers and BT3-051 for multi-card target selection; no
  trait-specific filter is present in either printed clause.
- Status: both clauses, timing, controller, amount, up-to-five cap, and
  `untilOpponentTurnEnd`/`forTheTurn` durations are statically mapped. No direct
  behavior correction was required.

### BT3-044 — Aruraumon

Score: 10/10. Vanilla play and legal evolution proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.3 Rookie, 5000 DP, play cost 2, Green Lv.2 evolution cost 2,
  `Data`/`Vegetation`, with no effect or inherited text.
- KB: no card-specific entry. General Digimon, Digi-Egg, and evolution rules
  apply.
- Implementation: `BT3-044.ts` is an explicit empty `CompiledCard` with
  `coverage: "full"` and `residual: []`, registered once via `registerIrCard`;
  the snapshot is the matching empty record. The focused test directly imports
  the module because the card has no executable effect.
- Proof: `BT3-044.test.ts` checks play at 5000 DP/cost 2 with no effect
  activation, and checks legal Green Digi-Egg
  `BT3-004` in the breeding area evolving into Aruraumon with the source still
  in the stack and no card effect.
- Status: the empty direct-registration boundary and legal evolution path are
  proven; no printed behavior or trait-filter ambiguity remains.

### BT3-045 — Kunemon

Score: 10/10. Vanilla play and legal green-source proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.3 Rookie, 4000 DP, play cost 3, Green Lv.2 evolution cost 0,
  `Virus`/`Larva`, with no effect or inherited text.
- KB: no card-specific entry. General Digimon, Digi-Egg, and evolution rules
  apply.
- Implementation: `BT3-045.ts` is an explicit empty `CompiledCard` with
  `coverage: "full"` and `residual: []`, registered once via `registerIrCard`;
  the snapshot is the matching empty record. The focused test directly imports
  the module because the card has no executable effect.
- Proof: `BT3-045.test.ts` checks play at 4000 DP/cost 3 with no effect
  activation, and checks legal Green Digi-Egg
  `BT3-004` in the breeding area evolving into Kunemon at zero memory cost
  with the source still in the stack.
- Status: the empty direct-registration boundary and legal evolution path are
  proven; no printed behavior or trait-filter ambiguity remains.

### BT3-046 — Terriermon

Score: 10/10. Opponent memory restriction and Tamer/owner exceptions proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.3 Rookie, 2000 DP, play cost 3, Green Lv.2 evolution cost 0,
  `Vaccine`/`Beast`. Its All Turns effect prevents the opponent from gaining
  memory except through Tamer effects.
- KB: Q1080 confirms Option/Digimon effect gains are blocked while specified
  memory loss remains possible; Q1081 confirms a Security Hammer Spark gain is
  blocked.
- Implementation: `BT3-046.ts` uses an All Turns `RestrictMemoryGain` for the
  opponent, with `exceptTamerEffects: true` and permanent duration. It is full
  coverage with no residual.
- Proof: `BT3-046.test.ts` covers the Q1081 Security Option path and now checks
  the observer boundary directly: opposing Digimon and Option effects cannot
  gain memory, opposing Tamer effects can, and the controller's Digimon effect
  can. Green Lv.2-to-Lv.3 evolution legality was checked against neighboring
  Green Rookies; no trait-based target filter exists.
- Status: All Turns scope, opposing seat, source-kind exception, and Security
  interaction are mapped. No direct behavior correction was required.

### BT3-047 — Wormmon

Score: 10/10. Reveal level filters and no-eligible boundary proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.3 Rookie, 1000 DP, play cost 3, Green Lv.2 evolution cost 0,
  `Free`/`Larva`. On Deletion it reveals three deck cards, adds one level 4 or
  5 Digimon, and places the remaining cards at deck bottom.
- KB: no card-specific entry. General On Deletion and reveal/add/deck-order
  rules apply.
- Implementation: `BT3-047.ts` is full coverage and uses On Deletion
  `RevealAdd` with three cards, mine Digimon levels `[4, 5]`, one to hand, and
  `rest: "deckBottom"`.
- Snapshot discrepancy: `effects.json:102770-102791` still shows only
  `levels: [4]`. The direct module was already corrected in commit
  `4e9d51d6c` for the printed level-5 clause and is authoritative under
  `docs/ARCHITECTURE.md:48-51`; the stale generated artifact was not copied or
  changed in this audit.
- Proof: `BT3-047.test.ts` covers eligible level 4 and level 5 additions with
  the other two cards bottomed, and now covers a three-card reveal containing
  only levels 3 and 6, proving no invalid card is added and all cards return to
  deck bottom. Green Rookie peer BT3-051 was checked for the same reveal/add
  and rest semantics.
- Status: direct executable behavior, exact level boundary, one-card add,
  deletion timing, and deck order are complete. The snapshot discrepancy is a
  resolved generated-artifact issue, not an unresolved card-rules ambiguity.

### BT3-048 — Gargomon

Score: 10/10. Suspended-opponent scaling and turn/source isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.4 Champion, 4000 DP, play cost 5, Green Lv.3 evolution cost
  1, `Vaccine`/`Beastkin`. Its inherited Your Turn effect gives the host +1000
  DP for each opponent's suspended Digimon.
- KB: no card-specific entry. General inherited, Your Turn, suspension, and
  scaling rules apply.
- Implementation: `BT3-048.ts` uses an inherited Your Turn self `ModifyDP`,
  amount 1000, permanent turn-scoped ledger value, and scaling by opponent
  suspended Digimon count. Coverage is full with no residual.
- Proof: `BT3-048.test.ts` uses a legal BT3-052-over-BT3-048 stack and checks
  two suspended opponents produce +2000 while an unsuspended opponent is not
  counted. The opponent-turn negative and new top-card negative prove the
  Your Turn and inherited-source boundaries. BT3-050 was compared as another
  inherited battle watcher and BT3-043 for scaled temporary modifiers.
- Status: inherited source, controller, suspension filter, per-card scaling,
  and Your Turn scope are statically mapped. No direct behavior correction was
  required.

### BT3-049 — Flymon

Score: 10/10. Security play timing and battle-outcome branches proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.4 Champion, 4000 DP, play cost 5, Green Lv.3 evolution cost
  2, `Virus`/`Insectoid`. Its Security effect plays Flymon without paying its
  memory cost at the end of the battle.
- KB: Q1082 establishes ordinary Digimon identity after effect placement;
  Q1083 requires the effect after a losing security battle; Q1084 requires the
  effect before the next check.
- Implementation: the original direct module played the card immediately from
  Security, before the required battle. It was corrected to
  `timing: "endOfBattle"` plus a one-shot `whenSecurityBattleEnded` SubTrigger
  that plays the exact source from trash without paying, with full coverage and
  no residual. This follows the delayed Security-play seam used by BT3-011,
  BT3-024, and BT3-036.
- Proof: `BT3-049.test.ts` covers losing to stronger BT1-057 (Q1083), winning
  against weaker BT1-010, and the Q1082/Q1084 two-card stack using Security
  Attack +1 BT2-079: Flymon is in the battle area and the second security card
  has still been processed. It now also proves the stronger attacker survives,
  the weaker attacker is deleted by the Security battle, and Flymon's play
  event occurs after its battle but before the next check. BT3-024 was compared
  as the same delayed Security self-play mechanism.
- Status: Security timing, self identity, free play, both battle outcomes,
  normal field identity, and multi-check ordering are mapped after the direct
  timing correction.

### BT3-050 — Stingmon

Score: 10/10. Surviving battle deletion and once-per-turn isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Green Lv.4 Champion, 5000 DP, play cost 6, Green Lv.3 evolution cost
  1, `Free`/`Insectoid`. Its inherited Your Turn once-per-turn effect gains one
  memory when this Digimon deletes an opponent's Digimon in battle and survives.
- KB: no card-specific entry. General inherited, Your Turn, battle deletion,
  survival, and once-per-turn rules apply.
- Implementation: `BT3-050.ts` is hand-fixed full IR. It anchors a Your Turn
  inherited `whenDeletesInBattle` SubTrigger to `isSelfRef: true`, gains one
  memory, and sets `frequency: "OncePerTurn"`. The source anchor ensures the
  event belongs to the host carrying Stingmon rather than any unrelated
  deletion.
- Snapshot discrepancy: `effects.json:102832-102845` contains the trigger and
  frequency but omits the direct module's `sourceFilter: { isSelfRef: true }`.
  The direct module is authoritative; the generated artifact was retained as
  evidence and not edited.
- Proof: `BT3-050.test.ts` uses a legal BT3-052-over-BT3-050 stack and covers a
  surviving deletion, no memory gain when the attacker and defender tie and
  both are deleted, and two surviving deletions after a host unsuspend with
  only the first gaining memory. BT3-048 was compared as an inherited source
  watcher and the shared battle controller was traced for the survival gate.
- Status: inherited source, Your Turn, opponent deletion, survival, gain amount,
  and once-per-turn identity are statically mapped. The snapshot omission is a
  resolved generated-artifact issue, not an unresolved card-rules ambiguity.

### BT3-051 — Dokugumon

Score: 10/10. Reveal category and duplicate-card boundaries proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51116-51138` identifies a green level-4 Digimon whose On Play reveals three and adds one level-5 Digimon and one level-6 Digimon, trashing the remainder. Q1085 permits the one-sided case; Q2827 permits two BT17-068 copies because they count as both levels while revealed.
- **IR trace:** `BT3-051.ts:5-47` maps On Play to two independent `RevealAdd` slots, each restricted to `kind: ["Digimon"]` and the relevant level, then `rest: "trash"`. The generated record `effects.json:102846-102869` is stale as described above, but direct registration is authoritative.
- **Behavioral proof:** `BT3-051.test.ts:7-31` covers one level-5 and one level-6 card plus trash; `:34-58` covers Q1085's only-level-5 case; `:60-87` now covers Q2827's two BT17-068 copies and remainder trash.
- **Peer/stack proof:** BT3-062 is the same two-slot RevealAdd mechanism. `reveal.ts:202-217` evaluates each slot against the full reveal and `:274-301` excludes instances taken by earlier slots. The new `treatedAsLevels` path is exercised by two copies of the catalogued level-5 BT17-068.
- **Correction/finding:** Corrected the shared revealed-level matcher so an additive temporary level does not erase the printed level; added the Q2827 proof. The direct Dokugumon module already had the catalog-faithful Digimon filter and trash disposition.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-052 — Rapidmon

Score: 10/10. Suspended-opponent scaling and turn restriction proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51141-51163` identifies a green level-5 Digimon with inherited `[Your Turn]` +1000 DP for each opponent's suspended Digimon. Rules §4-3-3 and §15-3 require the inherited effect to apply to the host, and the glossary's Your Turn boundary is live only during the controller's turn.
- **IR trace:** `BT3-052.ts:8-42` and `effects.json:102870-102892` agree on inherited Your Turn, self-only permanent ModifyDP +1000, and opponent suspended Digimon scaling.
- **Behavioral proof:** `BT3-052.test.ts:6-22` now uses two suspended Digimon, one ready Digimon, and a suspended Tamer; the result is exactly +2000, proving the Digimon-kind boundary. `:24-34` proves no bonus during the opponent's turn.
- **Peer/stack proof:** The host is a legal green chain `BT2-044` (green level 4) → `BT3-052` (inherited level 5) → `BT3-057` (green level 6). BT3-048 and BT13-004 provide the same inherited suspended-Digimon scaling shape; `conditions.ts:218-230` and `scaling.ts:152-205` supply the live count and multiplier.
- **Correction/finding:** Replaced the prior same-level illegal host stack with a legal host and added a suspended-Tamer exclusion. No direct IR defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-053 — JewelBeemon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51166-51187` identifies a green level-5 vanilla Digimon with no effect text and a green level-4 evolution route.
- **IR trace:** `BT3-053.ts` is an explicit empty full-coverage `CompiledCard` with no residual, registered once through `registerIrCard`; `effects.json:102893` is the matching empty record.
- **Behavioral proof:** `BT3-053.test.ts:5-9` confirms no effect mutation and now places JewelBeemon over a green `BT2-044` level-4 source.
- **Peer/stack proof:** The `BT2-044` → `BT3-053` stack follows rules §4-7 and the harness's bottom-most-first `under` convention. BT3-052 and BT3-054 are adjacent green level-5 peers and provide the relevant no-effect/effect boundary.
- **Correction/finding:** Added a realistic legal green evolution source and an explicit empty direct module/import for the vanilla proof.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-054 — Blossomon

Score: 10/10. Digisorption accept/decline and cost reduction proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51190-51212` identifies green level-5 Blossomon with `<Digisorption -3>` from a green level-4 Digimon. Comprehensive rules §16-10 (`:2876-2900`) make the suspend payment optional and the reduction mandatory only after a successful payment, with no reduction below zero.
- **IR trace:** `BT3-054.ts:8-45` and `effects.json:102894-102917` agree on the static Digisorption replacement, one own Digimon suspension target, amount 3, optional payment, full coverage, and no residual.
- **Behavioral proof:** `BT3-054.test.ts:6-35` performs a real digivolution from `BT2-044`, suspends an own Digimon, keeps memory at 3 after a cost-3 reduction, and proves an opposing Digimon is not a legal payer. The Ceresmon/Blossomon gauntlet at `ceresmon-blossomon-digisorption-deck.test.ts:1-89` covers redirect interaction and opponent-target exclusion.
- **Peer/stack proof:** BT2-045 and BT5-058 cover the same interactive Digisorption payment/decline shape; `replacement.ts:342-390` and `digisorptionDigivolve.ts:1-40` provide the shared reduction path. The current banlist's one-copy restriction is separately recorded and is outside card-effect IR.
- **Correction/finding:** Added an opponent Digimon to the focused fixture to prove the `controller: mine`, `kind: Digimon` payer boundary. The module is faithful; decklist validation must continue to enforce the separate one-copy banlist rule.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-055 — Dinobeemon

Score: 10/10. Piercing and Jamming keywords proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51215-51242` identifies green level-5 Dinobeemon with alternate green/blue level-4 evolution routes and printed `<Piercing>` plus `<Jamming>`.
- **IR trace:** `BT3-055.ts:8-41` and `effects.json:102918-102935` agree on permanent self Jamming and printed Piercing, full coverage, and no residual.
- **Behavioral proof:** `BT3-055.test.ts:7-16` observes both Piercing and Jamming on a legal green evolution stack.
- **Peer/stack proof:** The test uses `BT2-044` green level 4 → BT3-055; the alternate blue route remains present in catalog evidence. BT2-057's Jamming tests and BT3-015's Piercing record are the same keyword mechanisms; glossary `:268-284` and comprehensive `:2836-2876` define their persistent/trigger behavior.
- **Correction/finding:** Replaced the isolated top-card fixture with a legal green level-4 source stack. No executable defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-056 — Ceresmon

Score: 10/10. Digisorption cost paths and redirect source/controller isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51245-51267` identifies green level-6 Ceresmon with `<Digisorption -3>` and `[Your Turn][Once Per Turn]` permission to suspend an opponent's Digimon instead. Q4703 requires the redirector copy to already be in the battle area, so the copy being digivolved from hand cannot redirect its own Digisorption.
- **IR trace:** `BT3-056.ts:4-41` and `effects.json:102936-102971` agree on the static reduction and once-per-turn Your Turn `GrantStatic` redirect metadata, full coverage, and no residual.
- **Behavioral proof:** `BT3-056.test.ts:137-238` covers official metadata, the decline/full-cost path, own-Digimon payment, and a separate in-play Ceresmon redirecting to the opponent. The focused test also compares the registered direct record with the shared record. The gauntlet at `ceresmon-blossomon-digisorption-deck.test.ts:1-89` exercises the legal stack and confirms the redirect does not invent Piercing.
- **Peer/stack proof:** BT2-045/BT5-058 cover ordinary Digisorption, while `digisorptionDigivolve.ts:1-40` and registration keywords `:334-387` provide the shared redirect and once-per-turn seams. `BT3-056.test.ts:132-135` documents the dual blue/green `AD1-011` level-5 base, and the gauntlet uses a green `BT2-044` source.
- **Correction/finding:** Corrected the focused test's stale prose from “Tyranomon” to “Ceresmon”; no executable defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-057 — MegaGargomon

Score: 10/10. Suspension restriction and Security Attack condition proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51270-51292` identifies green level-6 MegaGargomon. Its When Digivolving clause suspends one opponent Digimon and prevents that same Digimon from unsuspending during the opponent's next unsuspend phase; its Your Turn aura grants Security Attack +1 while any opponent Digimon is suspended. Q1086 confirms the lock may be applied to a Digimon that was suspended by this effect.
- **IR trace:** `BT3-057.ts:5-76` now maps Suspend to opponent Digimon followed by a same-target Restrict with `untilOpponentNextUnsuspendPhase`; the Your Turn Aura remains a live opponent-suspended-Digimon condition. The generated snapshot at `effects.json:102972-103012` retains the former self-target and broad duration and is stale; the direct registration is authoritative.
- **Behavioral proof:** `BT3-057.test.ts:7-26` proves the selected opponent becomes suspended and restricted, the MegaGargomon host is not restricted, and Security Attack +1 is granted. `:28-37` drives the opponent active-phase unsuspend, confirms the lock holds during that phase, then confirms `ownerActivePhaseEnd` clears it.
- **Peer/stack proof:** `targeting/permanents.ts:373-375` and `actions/board.ts:71-83` establish same-target binding. EX7-035 and EX9-038 use the same suspend-then-same-target restriction shape; BT2-049 and BT13-053 supply unsuspend-prevention duration peers. `GameEngine.ts:1284-1324` now sweeps `ownerActivePhase` and `nextUntap` after active-phase unsuspends, matching `duration.ts:27-31` and `continuous.ts:471-475`.
- **Correction/finding:** Corrected the proven target-reference defect (the generated/direct record had restricted MegaGargomon rather than the suspended opponent), corrected the duration from opponent-turn end to next opponent unsuspend phase, and wired the existing phase boundary sweep so the duration actually expires after that phase.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-058 — BanchoStingmon

Score: 10/10. 12000-DP and attack-target boundaries plus Piercing proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51295-51317` identifies green level-6 BanchoStingmon with Piercing and a When Attacking clause that grants +7000 DP and Security Attack +2 for the turn only when attacking an opponent's Digimon with 12000 DP or more.
- **IR trace:** `BT3-058.ts:8-76` uses two self-only for-the-turn actions, each gated by structured `attackTargetMatchesFilter` with opponent controller, Digimon kind, and `dp: { op: "gte", value: 12000 }`. The snapshot at `effects.json:103013-103038` has raw conditions and is less expressive; direct registration is authoritative.
- **Behavioral proof:** `BT3-058.test.ts:7-31` proves the exact 12000 boundary positive with +7000 and Security Attack +2 plus Piercing. `:34-53` proves 11999 does not qualify. `:55-77` proves a player attack does not satisfy the opponent-Digimon target clause even when a 12000-DP opponent Digimon is present.
- **Peer/stack proof:** The host now uses the legal green chain `BT2-044` → `BT3-053` → `BT3-058`, isolating BanchoStingmon from other inherited effects. `conditions.ts:59-68` preserves the declared target before blocker changes; BT3-004, BT6-004, and ST4-04 provide same attack-target-conditioned effect patterns. Piercing behavior is defined by comprehensive rules §16-7 and corroborated by BT3-015/BT2-057 peers.
- **Correction/finding:** Strengthened the focused proof with the exact threshold, player-target exclusion, and legal evolution stack. No direct IR defect was found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-059 — Commandramon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51320-51341` identifies black level-3 Commandramon, play cost 2, 3000 DP, with no effect text and a black level-2 evolution route.
- **IR trace:** `BT3-059.ts` is an explicit empty full-coverage `CompiledCard` with no residual, registered once through `registerIrCard`; the focused test imports it directly.
- **Behavioral proof:** `BT3-059.test.ts:5-12` confirms no effect mutation while placing Commandramon over a black BT3-005 Digi-Egg.
- **Peer/stack proof:** BT3-005 is a black level-2 Digi-Egg, making the `BT3-005` → `BT3-059` stack legal under rules §4-7. The adjacent vanilla BT3-060 proof uses the same boundary.
- **Correction/finding:** Added a realistic legal black Digi-Egg source and an explicit empty direct module/import for the vanilla proof.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-060 — Psychemon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51344-51365` identifies black level-3 Psychemon, play cost 3, 5000 DP, with no effect text and a black level-2 evolution route.
- **IR trace:** `BT3-060.ts` is an explicit empty full-coverage `CompiledCard` with no residual, registered once through `registerIrCard`; the focused test imports it directly.
- **Behavioral proof:** `BT3-060.test.ts:5-12` confirms no effect mutation while placing Psychemon over a black BT3-005 Digi-Egg.
- **Peer/stack proof:** The `BT3-005` → `BT3-060` stack is color- and level-legal under rules §4-7 and mirrors the Commandramon vanilla proof.
- **Correction/finding:** Added a realistic legal black Digi-Egg source and an explicit empty direct module/import for the vanilla proof.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-061 — Chuumon

Score: 10/10. Opponent memory restriction and exceptions proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

BT3-061 through BT3-067 were independently rechecked in ascending order with
one card-specific KB query per card, exact catalog fields, direct IR, focused
tests, and shared primitive/peer traces. BT3-067 now has an explicit empty
full-coverage module and direct focused-test import. Existing effect
implementations remain faithful; no additional card-rule correction was found.
The range-local suppressions were removed.

### BT3-062 — Ludomon

Score: 10/10. Reveal dual-filter selection proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The committed catalog describes a black level-3,
3-play-cost, 1000-DP Rookie/Data Armor/Legend-Arms Digimon. Its On Play effect
reveals the top five, may add one `[RagnaLoardmon]` Digimon and one Digimon with
the `Legend-Arms` type, then places all remaining revealed cards at the bottom
in any order. The local KB entries Q1089–Q1091 establish the important
selection boundaries: one category alone does not require a second card, a
card satisfying both categories can fill both selections, and separate cards
can satisfy each category.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-062.ts` emits one
`RevealAdd` with `revealCount: 5`, two independent optional category selections
(`nameExact: "RagnaLoardmon"` and `trait: "Legend-Arms"`), and
`rest: "deckBottom"`.
The card has full coverage, no residual, and executable registration only via
`registerIrCard`. Generated snapshot line 103053 matches the direct module.
The focused trace uses `packages/shared/src/effects/ir/actions/reveal.ts` and
the reveal interpreter's category-union selection and bottom-order handling.

**Behavioral, peer, and stack proof.** `BT3-062.test.ts` reveals a five-card
deck containing BT3-019 (RagnaLoardmon/Legend-Arms), BT3-064 (Legend-Arms), and
three fillers, then proves that the two qualifying cards move to hand and the
three non-selected cards remain in the deck. Comprehensive reveal rules at
`data/kb/rules/comprehensive.md` lines 2559–2608 cover the single reveal
process and owner-selected bottom order; manual name/bracket rules cover the
exact name and type checks. BT11-040 and BT17-031 are matching RevealAdd peers.
The legal cards used in the proof are ordinary deck cards and require no
special stack exception.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-063 — Sukamon

Score: 10/10. On-deletion reveal/play and remainder placement proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-063 is cataloged as a black level-4, 3-play-cost,
1000-DP Champion/Abnormal/Virus Digimon. Its On Deletion text reveals the top
three, may play one `[Chuumon]` among them without paying memory, and places
the rest at the bottom in any order. There is no card-local KB entry; the
comprehensive reveal rules at `data/kb/rules/comprehensive.md` lines 2559–2608
and the manual exact-name rules are the governing references.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-063.ts` emits an
OnDeletion `RevealAdd` of three with an optional exact-name `Chuumon` selection,
`to: "play"`, `payCost: false`, and `rest: "deckBottom"`. It has full coverage,
no residual, and only `registerIrCard("BT3-063", compiled)`. Generated snapshot
line 103089 matches. Shared IR reveal definitions and the reveal interpreter's
play, optional-choice, and bottom-rest paths provide the execution trace.

**Behavioral, peer, and stack proof.** `BT3-063.test.ts` deletes Sukamon while
the top three contain BT3-061 Chuumon and two fillers; it proves Chuumon is
played and the remaining cards stay in the deck in their expected order.
BT11-040 is a same-trigger RevealAdd peer. All Chuumon cards in the committed
catalog are Digimon, so the exact-name selection does not need a redundant kind
filter. The deletion proof uses a legal normal field and no evolution-stack
assumption.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-064 — TiaLudomon

Score: 10/10. Level-7 inherited attack and de-digivolve result proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog identifies BT3-064 as a black level-4,
4-play-cost, 4000-DP Champion/Data Armor/Legend-Arms Digimon. Its inherited
When Attacking text says that if this Digimon is level 7, trigger
De-Digivolve 1 on one opponent Digimon. The parenthetical explains the
De-Digivolve keyword's source-card floor; it is not a second independent Trash
effect. Comprehensive rules `data/kb/rules/comprehensive.md` lines 2911–2922
(`16-12-1` through `16-12-4`) establish that boundary.

**Correction and trace.** The prior direct module incorrectly put the level-7
condition on the action and added a separate opponent Trash action targeting a
level-3 card. `apps/api/src/cards/BT3/BT3-064.ts` now places `selfLevelIs: 7`
on the When Attacking effect and emits only one DeDigivolve action of amount
one against one opponent Digimon. The generated snapshot at line 103113
remains stale with the former action-level condition and duplicate Trash
action. The direct module is the exclusive `registerIrCard` runtime authority,
with full coverage and empty residual. The shared DeDigivolve IR action is in
`packages/shared/src/effects/ir/actions/digivolve.ts`; the interpreter and
primitive in `actions/digivolution.ts` and `effects/primitives.ts` enforce the
level-3 floor and source trash semantics.

**Behavioral, peer, and stack proof.** `BT3-064.test.ts` uses a legal level-7
BT2-083 host inheriting BT3-064 and an opponent BT2-020 stack topped by BT2-013;
it attacks, proves the top source is removed, and now also proves the target
stack is empty rather than receiving an extra manually scripted Trash. BT3-069
uses the same corrected mechanism, and BT3-018, BT15-064, and BT20 De-Digivolve
cards are relevant shape peers. The test stack demonstrates the required
level-7 evolution host and a legal multi-card opponent stack.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
The implementation defect is corrected; no unresolved rules ambiguity remains.

### BT3-065 — Gururumon

Score: 10/10. Security play behavior and rulings proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-065 is a black level-4, 5-play-cost, 4000-DP
Champion/Vaccine/Beast Digimon. Its Security text says to play this card at
the end of the battle without paying its memory cost. Local KB Q1092 confirms
the result is a normal Digimon in the battle area, Q1093 confirms it plays even
if it loses the battle, and Q1094 confirms the timing is after the battle and
before the next Security check.

**Correction and trace.** The prior module and snapshot emitted an immediate
Security `PlayWithoutCost`, which skipped the required end-of-battle timing.
`apps/api/src/cards/BT3/BT3-065.ts` now uses Security → `timing: "endOfBattle"`
→ a one-shot `SubTrigger` for `whenSecurityBattleEnded`, then plays this card
from trash without cost. Generated snapshot line 103131 remains at the pre-fix
immediate-play shape; the corrected direct module is the exclusive executable
authority. The security
lifecycle in `apps/api/src/engine/security/securityCheck.ts` shows the security
effect, `securityChecked`, card movement, and deferred battle-ended event in
that order; the shared SubTrigger event map and identity gate provide the
remaining trace. Registration remains exclusively `registerIrCard`.

**Behavioral, peer, and stack proof.** `BT3-065.test.ts` uses BT3-065 in
Security against BT1-057, then inspects the emitted event sequence to prove the
play occurs after the Security check event. BT3-011 is the exact same corrected
security timing shape. The ordinary Security-vs-attacker field is legal and
also covers the losing-battle result through the engine's end-of-battle event.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
The timing defect is corrected; no unresolved implementation ambiguity remains.

### BT3-066 — Clockmon

Score: 10/10. Inherited opponent-turn DP modifier proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog describes BT3-066 as a black level-4,
5-play-cost, 5000-DP Champion/Data/Machine Digimon with inherited
`[Opponent's Turn] This Digimon gets +1000 DP.` The turn-continuous effect is
covered by the turn and continuous-effect rules in the comprehensive/manual
rules; no card-local KB entry exists.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-066.ts` emits an
inherited OpponentsTurn `ModifyDP` of +1000 for the self reference, with full
coverage, empty residual, and only IR registration. Snapshot line 103156 is an
exact match. The continuous interpreter and ModifyDP handling apply the effect
only while the opponent's turn is active.

**Behavioral, peer, and stack proof.** `BT3-066.test.ts` hosts BT3-068 under
BT3-066, sets the opponent's turn, and proves current DP is base plus 1000; it
then switches to the controller's turn and proves DP returns to base. BT3-068
is the exact same-mechanism peer. The host/child arrangement is a legal
evolution stack and exercises the inherited boundary.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-067 — Tankmon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-067 is a black level-4, 6-play-cost, 6000-DP
Champion/Data/Cyborg Digimon with no effect or inherited text. No card-local
KB entry is required for a vanilla card; catalog and comprehensive card-state
rules are the governing evidence.

**Implementation and trace.** `BT3-067.ts` is an explicit empty
`CompiledCard` with `coverage: "full"` and `residual: []`, registered once via
`registerIrCard`; its generated snapshot at line 103174 is the matching empty
record. The focused test imports the module directly, making the vanilla
boundary executable without any `registerCard` path.

**Behavioral, peer, and stack proof.** `apps/api/src/cards/BT3/BT3-067.test.ts`
now uses the correct Tankmon naming and proves the card's current DP remains
its catalog base DP after recomputation. Vanilla peers BT3-044 and BT3-045
provide the same no-effect test boundary. No evolution stack is required to
prove a card without effects; the test deliberately checks the ordinary
standalone card state.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
The absence of a direct module is intentional and documented, not an unresolved
behavior defect. Execution of the focused test remains deferred.

### BT3-068 — Giromon

Score: 10/10. Inherited opponent-turn DP modifier proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog describes BT3-068 as a black level-5,
6-play-cost, 7000-DP Ultimate/Vaccine/Machine Digimon with inherited
`[Opponent's Turn] This Digimon gets +1000 DP.` No local KB entry exists; the
turn-continuous and inherited-effect rules supply the boundary.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-068.ts` emits the
same inherited OpponentsTurn self-targeted +1000 `ModifyDP` trace as BT3-066,
with full coverage, no residual, and IR-only registration. Snapshot line
103175 matches exactly. Shared continuous-effect and ModifyDP interpreter
paths provide the runtime trace.

**Behavioral, peer, and stack proof.** `BT3-068.test.ts` hosts BT3-070 under
BT3-068, sets the opponent's turn, recomputes, and proves the +1000 result.
BT3-066 is the exact same-mechanism peer, while the BT3-070 child gives a legal
evolution stack for inherited behavior. The complementary-turn boundary is
also covered by BT3-066's paired test.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-069 — RaijiLudomon

Score: 10/10. Level-7 predicate and de-digivolve behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-069 is a black level-5, 6-play-cost, 7000-DP
Ultimate/Data Armor/Legend-Arms Digimon with inherited level-7-gated
De-Digivolve 1 text. As with BT3-064, the printed parenthetical is part of
the De-Digivolve keyword and must not be modeled as a separate Trash action.
Comprehensive rules `data/kb/rules/comprehensive.md` lines 2911–2922 provide
the governing source-card and level-3 floor semantics.

**Correction and trace.** The direct module already had the corrected effect-
level condition and single DeDigivolve action, but its generated snapshot at
line 103193 remains stale: it still contains an action-level raw condition and
an extra Trash action. The authoritative `apps/api/src/cards/BT3/BT3-069.ts`
uses When Attacking effect-level `selfLevelIs: 7`, one opponent Digimon,
amount-one DeDigivolve, and no separate Trash. Coverage is full, residual is
empty, and registration is only `registerIrCard`.

**Behavioral, peer, and stack proof.** `BT3-069.test.ts` uses the same legal
BT2-083 level-7 host pattern as BT3-064 against an opponent BT2-020 stack topped
by BT2-013; it now proves both source removal and that no extra card is
trashed. BT3-064, BT3-018, and BT15-064 are same-mechanism peers. The legal
level-7 inherited stack exercises the condition boundary.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
The direct module was already correct and fully traced; snapshot synchronization
is deferred without creating a rules or executable-behavior ambiguity.

### BT3-070 — Etemon

Score: 10/10. Blocker and on-deletion reveal/play behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog describes BT3-070 as a black level-5,
7-play-cost, 6000-DP Ultimate/Virus/Puppet Digimon. It has Blocker and an On
Deletion effect revealing the top five, optionally playing one level-6 Digimon
with `Etemon` in its name without cost, then putting the remaining cards at the
bottom in any order. No local KB entry exists. Comprehensive Blocker rules at
`data/kb/rules/comprehensive.md` lines 2821–2829, reveal rules at lines
2559–2608, and manual exact/in-name bracket rules are the governing material.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-070.ts` represents
Blocker through the static keyword and emits OnDeletion `RevealAdd` with five
cards, an optional play-without-cost selection constrained to level 6, Digimon,
and exact name matching `Etemon`, plus `rest: "deckBottom"`. It has full
coverage, no residual, and only IR registration. Snapshot line 103211 matches.
The shared RevealAdd IR/interpreter paths cover optional play and bottom-rest
ordering; the keyword path covers Blocker.

**Behavioral, peer, and stack proof.** `BT3-070.test.ts` places BT3-074
MetalEtemon (level 6) plus four fillers on top, recomputes to prove Blocker,
then deletes Etemon and proves MetalEtemon is played while four cards remain in
the deck. Same-mechanism Etemon/Reboot cards such as BT3-095 supply peer shape
Evidence. The test uses legal deck cards and does not require an evolution
stack for the deletion effect.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-071 — MetalMamemon

Score: 10/10. Reboot and level-7 Virus retrieval predicate proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

BT3-071 through BT3-075 were independently rechecked in ascending order with
one card-specific KB query per card, exact catalog fields, direct IR, focused
tests, and shared primitive/peer traces. Existing implementations remain
faithful; no additional card-rule correction was found. The range-local
suppressions were removed.

This range was audited in strict ascending card-ID order against the committed
catalog, card-specific local KB output, comprehensive rules, direct TypeScript
modules, the committed compiled-effects snapshot, shared interpreter
primitives, colocated behavioral tests, same-mechanism peers, trait boundaries,
and legal evolution/source stacks. Every executable card module in the range
uses exactly one `registerIrCard(cardId, compiled)` registration; no duplicate
`registerCard` registration was added or retained.

The follow-up found two previously missing vanilla modules in this range
(BT3-076 and BT3-078). Both now have typed empty full-coverage records and
focused-test imports; the BT3 set-index imports remain a root-owned integration
gap. Across the full BT3-076–112 lane, all 29 prior range-local
`@ts-nocheck` suppressions are now removed.

Exactly one local KB query was run for each of the 37 cards BT3-076 through
BT3-112; no card was queried more than once during this pass.

The requested static-only scope was followed. No focused tests, mechanism tests,
aggregate tests, typecheck, lint, formatting, browser/UI validation, or
`git diff --check` were run. The executed-gates component is therefore 0/2 for
every card, every score below is provisional, and no card is claimed as 10/10 or
as collection-complete.

### BT3-072 — BryweLudramon

Score: 10/10. Native/inherited Blocker and legal source proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Black Lv.6 Mega, 12000 DP, play cost 10, alternate Black or Red
  Lv.5 evolution cost 3, `Data`/`Armor`/`Legend-Arms`, with inherited Blocker.
- KB: no card-specific entry. Comprehensive §4-3-3 and §16-5 govern the
  inherited keyword and its blocking permission.
- Implementation: `BT3-072.ts:8-24` is a Static inherited Blocker keyword,
  full coverage, no residual. It intentionally contains no own-card effect.
- Proof: `BT3-072.test.ts:8-15` verifies the inherited keyword on a host.
  The added `:18-41` evolves a legal Black Lv.5 BT3-071 into BT3-072 and
  verifies the host's Blocker, proving the source-card transition and Black
  evolution requirement. BT3-075 and BT2-065 were inspected as Blocker peers;
  no Armor/Legend-Arms trait filter is implied by the printed keyword.
- Status: inherited scope, keyword persistence, and legal alternate-stack
  boundary are mapped without ambiguity.

### BT3-073 — CresGarurumon

Score: 10/10. Reveal scaling/filter boundaries and Reboot proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Black Lv.6 Mega, 11000 DP, play cost 11, alternate Black or Red
  Lv.5 evolution cost 4, `Data`/`Beast Knight`. It has Reboot and When
  Digivolving reveals one card per opponent Digimon in play, may play one
  black or red Digimon level 5 or lower without paying its cost, and places
  the remaining revealed cards at the bottom in any order.
- KB: Q1095 explicitly limits the played card to black level 5 or lower or
  red level 5 or lower.
- Implementation: `BT3-073.ts:12-72` retains Reboot and maps the main clause
  to RevealAdd with `revealCount: 1`, `revealScaling` by opponent Digimon,
  separate Black and Red `orFilters`, `levelComparison lte 5`, optional count
  1 play, and `deckBottomAnyOrder`. It is full coverage with no residual.
- Snapshot comparison: `effects.json:103288-103320` has the trigger but uses a
  combined Red/Black color filter, a fixed reveal count, and `deckBottom`
  rather than the direct module's scaling and any-order behavior; it also has
  the legacy Reboot self-Unsuspend action. The hand-authored direct module is
  authoritative under `docs/ARCHITECTURE.md:48-51`, and its comments record
  the Q1095/runtime capability correction.
- Proof: `BT3-073.test.ts:7-31` uses a legal BT10-013 Lv.5 source, two
  opposing Digimon, and a red level-5 eligible card. `:34-51` proves Reboot
  does not immediately unsuspend after attack. The added `:54-90` puts an
  ineligible level-6 Black card above an eligible level-5 Black card with two
  opposing Digimon, proving both scaling and the level boundary while the
  legal BT10-013-to-CresGarurumon stack remains intact. BT3-070/BT3-082 and
  the reveal/optional-play interpreter paths were inspected as peers.
- Status: Reboot, dynamic reveal count, opponent-in-play scope, optional free
  play, Black/Red union, level cap, deck-bottom-any-order return, and legal
  evolution are mapped. The generated snapshot remains stale but does not
  create an unresolved ambiguity because the direct module is executable
  authority.

### BT3-074 — MetalEtemon

Score: 10/10. Turn-specific unblockable and DP modifier proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Black Lv.6 Mega, 10000 DP, play cost 12, Black Lv.5 evolution cost
  3, `Virus`/`Cyborg`. During your turn it cannot be blocked by an opponent's
  Digimon; during the opponent's turn it gets +2000 DP.
- KB: no card-specific entry. Comprehensive turn-owner and blocking rules
  apply.
- Implementation: `BT3-074.ts:8-47` maps Your Turn to a self
  `cantBeBlocked` restriction and Opponents Turn to a self +2000 ModifyDP,
  both full coverage with no residual.
- Proof: `BT3-074.test.ts:7-27` now asserts the own-turn restriction and base
  DP, the opponent-turn +2000 DP and removal of the blocking restriction, and
  the return to base DP on the owner's next turn. The self-target and
  `turnOwnerGuard` behavior were compared with other turn-scoped Restrict and
  ModifyDP peers; no trait target is present.
- Status: both turn gates, self target, restriction kind, DP amount, and
  duration/recalculation boundary are mapped without ambiguity.

### BT3-075 — Craniamon

Score: 10/10. Blocker detection and opponent-effect deletion protection proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Black Lv.6 Mega, 12000 DP, play cost 13, Black Lv.5 evolution cost
  4, `Vaccine`/`Holy Warrior`/`Royal Knight`. It has Blocker, and All Turns
  protects your Digimon with Blocker from deletion by opponent effects.
- KB: Q1096 limits the protection to deletion by opponent effects; battle loss
  and DP reduction to zero remain valid deletion causes.
- Implementation: `BT3-075.ts:8-43` gives Craniamon All Turns Blocker, then
  installs a permanent `beDeleted` Restrict over all own Digimon matching
  live Blocker or `stackKeywords: ["Blocker"]`, qualified with
  `byOpponentEffectsOnly: true`. The record is full coverage with no residual.
- Proof: `BT3-075.test.ts:9-36` uses opponent ST1-16 Gaia Force and proves a
  printed Blocker survives opponent effect deletion. The added `:39-53`
  places inherited BT3-072 under legal-level BT2-083 and verifies the host is
  protected while a same-controller BT3-071 without Blocker is not restricted.
  The permanent matcher, continuous restriction ledger, and BT3-075's
  existing inherited-Blocker correction commit were inspected; no
  Holy-Warrior/Royal-Knight trait filter is implied.
- Status: printed and inherited Blocker matching, own-controller scope,
  opponent-effect-only cause, and Q1096's non-effect deletion boundary are
  represented without unresolved ambiguity.

### BT3-076 — Candlemon

Score: 10/10. Vanilla and legal purple evolution proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Purple Lv.3 Rookie, 3000 DP, play cost 2, Purple Lv.2 evolution
  cost 0, `Data`/`Flame`, with no effect text.
- KB: no card-specific entry. General Digimon and Digi-Egg evolution rules
  apply.
- Implementation: the generated snapshot at `effects.json:103372` is an empty
  full-coverage record. The typed direct module `BT3-076.ts` now publishes the
  same empty record and its focused test imports it; the set-index import is a
  root-owned follow-up.
- Proof: `BT3-076.test.ts:6-10` retains the no-effect identity check. The
  added `:12-38` evolves Purple Digi-Egg BT3-006 into Candlemon, verifying the
  source remains in the stack and no
  effect activation occurs.
- Status: the vanilla empty-IR boundary, Purple Lv.2 source legality, and
  no-effect behavior are mapped.

### BT3-077 — Gazimon

Score: 10/10. Opponent memory restriction and exceptions proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Purple Lv.3 Rookie, 2000 DP, play cost 3, Purple Lv.2 evolution
  cost 0, `Virus`/`Mammal`. All Turns, the opponent cannot gain memory except
  with Tamer effects.
- KB: Q1097 blocks Option/Digimon effect gains but preserves specified memory
  loss; Q1098 blocks Security Hammer Spark's gain.
- Implementation: `BT3-077.ts:8-24` installs All Turns
  `RestrictMemoryGain` for the opponent with `exceptTamerEffects: true`, full
  coverage, and no residual.
- Proof: `BT3-077.test.ts:8-29` retains Q1098's Security Hammer Spark flow.
  The added `:32-40` directly checks the observer boundary: opposing Digimon
  and Option effects cannot gain memory, opposing Tamer effects can, and the
  controller's Digimon effects can. BT3-046 and BT6-021 were compared as
  same-mechanism restriction peers; no trait-based filter is present.
- Status: All Turns scope, opponent seat, source-kind exception, Security
  interaction, and own-effect allowance are mapped without ambiguity.

### BT3-078 — Shamanmon

Score: 10/10. Vanilla and legal purple evolution proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Purple Lv.3 Rookie, 4000 DP, play cost 3, Purple Lv.2 evolution
  cost 0, `Virus`/`Demon`, with no effect text.
- KB: no card-specific entry. General Digimon and Digi-Egg evolution rules
  apply.
- Implementation: the generated snapshot at `effects.json:103385` is an empty
  full-coverage record. The typed direct module `BT3-078.ts` now publishes the
  same empty record and its focused test imports it; the set-index import is a
  root-owned follow-up.
- Proof: `BT3-078.test.ts:6-10` retains the no-effect identity check. The
  added `:12-38` evolves Purple Digi-Egg BT3-006 into Shamanmon, verifying the
  source remains in the stack and no
  effect activation occurs.
- Status: the vanilla empty-IR boundary, Purple Lv.2 source legality, and
  no-effect behavior are mapped.

### BT3-079 — Tsukaimon

Score: 10/10. Inherited deletion memory and top-card isolation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Purple Lv.3 Rookie, 2000 DP, play cost 3, Purple Lv.2 evolution
  cost 0, `Virus`/`Mammal`. Its inherited On Deletion effect gains 1 memory.
- KB: no card-specific entry. Comprehensive §15-3 governs inherited source
  activation and deletion timing.
- Implementation: `BT3-079.ts:8-23` maps an inherited On Deletion GainMemory
  action with amount 1, full coverage, and no residual.
- Proof: `BT3-079.test.ts:7-15` uses legal Purple Lv.4 BT3-081 over BT3-079
  and deletes the host, proving inherited activation and the exact amount. The
  added `:18-26` deletes Tsukaimon while it is the top card and proves no
  memory is gained, establishing the inherited-only boundary. BT3-081 was
  inspected as the same printed inherited-memory peer.
- Status: inherited source, deletion trigger, host transition, amount, and
  top-card exclusion are mapped without ambiguity.

### BT3-080 — Saberdramon

Score: 10/10. Inherited Retaliation host behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- Catalog: Purple Lv.4 Champion, 3000 DP, play cost 4, Purple Lv.3 evolution
  cost 2, `Vaccine`/`Giant Bird`. Its inherited Retaliation triggers when this
  Digimon is deleted after losing a battle and deletes the Digimon it battled.
- KB: no card-specific entry. Comprehensive §16-13 governs Retaliation's
  losing-battle trigger and mandatory opposing deletion.
- Implementation: `BT3-080.ts:8-24` exposes Retaliation as a Static inherited
  keyword, full coverage, and no residual. The combat controller owns the
  actual post-battle deletion semantics.
- Proof: `BT3-080.test.ts:6-24` uses a legal Purple Lv.5 BT3-085 host with
  BT3-080 as its Lv.4 inherited source, a stronger opponent, and asserts both
  battle permanents are deleted. The fixture was corrected from same-level
  BT3-081 to legal higher-level BT3-085; this preserves a realistic evolution
  stack while testing the shared Retaliation path. The Retaliation combat
  peers and tie/deletion guards were inspected; no trait filter is implied.
- Status: inherited source, losing-battle trigger, battled-opponent identity,
  mandatory deletion, and legal stack boundary are mapped without ambiguity.

### BT3-081 — Devidramon

Score: 10/10. Inherited deletion memory behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51875-51897` identifies a purple level-4 Digimon with inherited `[On Deletion] Gain 1 memory` and a purple level-3 evolution route. Comprehensive rules §4-3-3 and §15-3 require the host to gain the inherited effect; §15-8-3-5 places an inherited On Deletion effect on the top card that was deleted.
- **IR trace:** `apps/api/src/cards/BT3/BT3-081.ts:8-23` records `OnDeletion`, `GainMemory` one, `isInherited: true`, full coverage, and no residual. Snapshot `effects.json:103403-103407` agrees exactly.
- **Behavioral proof:** `BT3-081.test.ts:6-17` places Devidramon under a legal purple level-5 Arukenimon host and deletes the host, asserting the inherited memory gain.
- **Peer/stack proof:** The BT3-086 level-5 host over BT3-081 level-4 is catalog-legal; `builders.ts:171-197` keeps On Deletion collection valid after the stack moves to trash. BT3-006 is the same inherited On Deletion resource pattern, while the comprehensive inherited-effect sections establish host ownership.
- **Correction/finding:** No executable defect found. The focused test already provides a legal stack and isolates the inherited effect.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-082 — BlackGatomon

Score: 10/10. Security play timing and battle branches proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51900-51922` identifies a purple level-4 Digimon with `[Security] At the end of the battle, play this card without paying its memory cost`; Q1099–Q1101 confirm normal post-battle play regardless of battle outcome and before the next security check.
- **IR trace:** `BT3-082.ts:9-40` records the Security trigger with `timing: "endOfBattle"`, then a one-shot exact-card SubTrigger that plays the source from trash without cost. Coverage is full, residual is empty, and the module is the exclusive `registerIrCard` authority. Snapshot `effects.json:103408-103423` remains at the pre-fix immediate-play shape.
- **Behavioral proof:** `BT3-082.test.ts` asserts the delayed direct runtime IR, proves play occurs after `securityChecked` when BlackGatomon loses its Security battle, and proves a weaker attacker is deleted when BlackGatomon wins before it is played.
- **Peer/stack proof:** The exact-card SubTrigger and security lifecycle are shared with the corrected BT3-011/024/036/049/065 implementations. Q1100/Q1101 align with the end-of-battle event ordering and both battle outcomes.
- **Correction/finding:** Corrected the direct module from immediate Security self-play to the exact-card end-of-battle watcher and strengthened the ordering/battle proof. The aggregate snapshot must be reconciled by a later generation gate.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-083 — Meramon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51925-51946` identifies a purple level-4 vanilla Digimon with a purple level-3, one-memory evolution route.
- **IR trace:** `effects.json:103424` is the expected empty full-coverage record. The typed direct module `BT3-083.ts` now publishes the same empty record and `BT3-083.test.ts` imports it; its set-index import is root-owned.
- **Behavioral proof:** `BT3-083.test.ts:4-10` places Meramon over BT3-076, a catalog-compatible purple level-3 source, and verifies no effect mutation.
- **Peer/stack proof:** The BT3-076 → BT3-083 stack observes the catalog's color/level route. Adjacent BT3-081/BT3-082/BT3-084 cards show the boundary between inherited/effectful and vanilla records; `cards.json:51925-51946` contains no effect text.
- **Correction/finding:** Added the typed empty direct registration and strengthened the no-effect proof with a legal purple evolution stack.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-084 — Raremon

Score: 10/10. On-play Option reveal and remainder handling proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51949-51971` identifies a purple level-4 Digimon whose On Play reveals the top three cards, adds one Option, and trashes every remaining revealed card. Comprehensive rules §15-15-3-1 and §15-15-3-4 require one contiguous reveal process; the remainder is trashed only after the selected Option leaves the reveal.
- **IR trace:** `BT3-084.ts:9-34` records `RevealAdd`, count three, an Option-only filter, hand destination, and `rest: "trash"`, full coverage, and no residual. Snapshot `effects.json:103425-103441` is stale and records `rest: "deckBottom"`; the direct module is the authoritative corrected record.
- **Behavioral proof:** `BT3-084.test.ts:6-30` supplies one Option and two Digimon, plays Raremon, asserts the Option enters hand, both remaining cards enter trash, and the deck is empty.
- **Peer/stack proof:** BT3-062 and BT3-051 demonstrate the same RevealAdd slot/taken-card accounting; `reveal.ts:202-220` tracks taken cards and `:511-518` executes the trash remainder. The Option kind boundary is enforced by `definition.ts:90-97`.
- **Correction/finding:** The direct module already contains the proven hand fix (`rest: "trash"`) from the committed baseline; no new direct change was needed. The generated snapshot reconciliation is deferred because `effects.json` is shared aggregate runtime data, not the authoring source (`docs/ARCHITECTURE.md:48-51`).
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-085 — SkullMeramon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51974-51995` identifies a purple level-5 vanilla Digimon with a purple level-4, two-memory evolution route.
- **IR trace:** `effects.json:103442` is the expected empty full-coverage record. The typed direct module `BT3-085.ts` now publishes the same empty record and `BT3-085.test.ts` imports it; its set-index import is root-owned.
- **Behavioral proof:** `BT3-085.test.ts:4-10` places SkullMeramon over purple level-4 BT3-084 and asserts its DP remains the base DP after continuous recomputation.
- **Peer/stack proof:** BT3-084 → BT3-085 is a legal purple evolution stack, and BT3-084's On Play text is not inherited, so the fixture does not introduce an unrelated trigger. Adjacent vanilla/effect boundaries are represented by BT3-083/BT3-084.
- **Correction/finding:** Added the typed empty direct registration and strengthened the no-effect proof with a legal evolution stack.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-086 — Arukenimon

Score: 10/10. Optional payment, named play, and self-deletion proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:51998-52025` identifies a purple level-5 Digimon with alternate purple/green level-4 evolution routes and `[When Attacking] You may pay 3 memory to play one MaloMyotismon from hand without paying its cost. Then, delete this Digimon.` Q1102 makes the clause optional; Q1104 requires the source deletion to end its other attack effects; Q1105 confirms MaloMyotismon is already in play when the deletion occurs.
- **IR trace:** `BT3-086.ts:5-50` maps When Attacking to a hand-only, name-matched, Digimon-only MaloMyotismon play with a three-memory optional processing cost and `abortOnDecline: true`, followed by self-targeted Delete. Snapshot `effects.json:103443-103470` agrees.
- **Behavioral proof:** `BT3-086.test.ts:6-50` uses a legal BT3-083 (purple level 4) → Arukenimon stack, accepts the optional activation, asserts the free MaloMyotismon play, self-deletion, and memory reduction to three. `runAction.ts:276-294` and `:451-513` show that decline/unpayable cost aborts the dependent Delete; the paired Mummymon decline test covers the same gate.
- **Peer/stack proof:** BT3-087 is the same mechanism with trash as the source zone; BT3-092 and `malomyotismon-historical-deck.test.ts:8-89` prove the related MaloMyotismon deletion/memory interaction. `definition.ts:90-97` enforces the Digimon-kind boundary and `play.ts:303-386` enforces `from: ["hand"]`.
- **Correction/finding:** No executable defect found. Added a legal purple level-4 stack to the focused fixture while keeping the neutral BT3-083 source free of unrelated inherited effects.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-087 — Mummymon

Score: 10/10. Accept/decline, trash origin, and resulting zones proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:52028-52050` identifies a purple level-5 Digimon whose optional When Attacking clause pays three memory to play MaloMyotismon from trash free, then deletes itself. Q1106, Q1108, and Q1109 confirm optional activation, abort of later attack effects after deletion, and MaloMyotismon's timing.
- **IR trace:** `BT3-087.ts:8-53` maps the effect to a trash- and name-filtered Digimon target, three-memory optional cost, `abortOnDecline: true`, and self Delete. Snapshot `effects.json:103471-103498` agrees.
- **Behavioral proof:** `BT3-087.test.ts:6-37` uses a legal BT3-083 → Mummymon stack, accepts the optional activation, asserts the trash MaloMyotismon is played and Mummymon is deleted, and confirms memory three. `:39-78` declines the single activation and asserts Mummymon remains, MaloMyotismon remains in trash, and no memory is paid.
- **Peer/stack proof:** BT3-086 provides the hand-source peer and `malomyotismon-historical-deck.test.ts:52-89` exercises the broader pair. `play.ts:303-386` resolves explicit trash source zones; `runAction.ts:451-513` confirms the abort-on-decline semantics demanded by Q1108.
- **Correction/finding:** No executable defect found. Added legal purple level-4 stacks to both acceptance and decline fixtures to isolate the Mummymon effect.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-088 — LadyDevimon

Score: 10/10. Draw/trash and inherited Option-use deletion proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:52053-52076` identifies a purple level-5 Digimon with When Digivolving Draw 2 then trash 2, plus inherited `[Your Turn][Once Per Turn] When you use an Option card, delete one opposing level-3 Digimon`. Q1110 places the watcher after the used Option [Main] effect; Q1111 excludes Security/Delay activation.
- **IR trace:** `BT3-088.ts:8-57` records ordered Draw 2 and hand Trash 2; the inherited Your Turn SubTrigger maps to `whenOptionUsed`, deletes one opponent Digimon of level 3, and carries `frequency: "OncePerTurn"`. Snapshot `effects.json:103499-103528` agrees.
- **Behavioral proof:** `BT3-088.test.ts:6-30` evolves a legal purple level-4 BT10-074 into LadyDevimon and verifies draw-then-trash. `:31-49` puts LadyDevimon under a legal BT3-092 host, uses the real BT3-109 Option [Main], and asserts an opposing level-3 target is deleted. The test therefore observes the Option-use seam rather than merely firing an arbitrary event.
- **Peer/stack proof:** `effect.ts:384-402` carries Your Turn and Once Per Turn to the watcher; `subTrigger.ts:143-166` anchors inherited sources to their host; `primitives.ts:2466-2471` and `:2473-2524` establish that only genuine Option use fires the event. BT3-096, BT17-032, and BT19-040 are same-event peers; Q1111 is consistent with their use-only lifecycle.
- **Correction/finding:** No executable defect found. The legal level-4 → level-5 evolution and host-stack fixture already isolate the inherited boundary.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-089 — Boltmon

Score: 10/10. Vanilla catalog/stat/no-effect proof. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:52079-52100` identifies a purple level-6 vanilla Digimon with a purple level-5, two-memory evolution route.
- **IR trace:** `effects.json:103529` is the expected empty full-coverage record. The typed direct module `BT3-089.ts` now publishes the same empty record and `BT3-089.test.ts` imports it; its set-index import is root-owned.
- **Behavioral proof:** `BT3-089.test.ts:4-10` places Boltmon over BT3-085, a catalog-compatible purple level-5 source, and verifies no continuous effect changes its base DP.
- **Peer/stack proof:** BT3-085 → BT3-089 is a legal purple evolution stack. Adjacent BT3-088 and BT3-090 provide effectful level-5/level-6 peers while Boltmon's catalog record has no effect text.
- **Correction/finding:** Added the typed empty direct registration and strengthened the no-effect proof with a legal evolution stack.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-090 — Mastemon

Score: 10/10. Both-security trash and filtered free play proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:52103-52130` identifies a purple level-6 Digimon with purple/yellow level-5 routes. Its When Digivolving effect trashes the top card of both security stacks, then optionally plays a purple or yellow level-4-or-lower Digimon from trash free. Q1112 requires the security trash even without a valid revival; Q1113 says these trashed cards do not activate Security effects; Q1114 says an empty stack does not itself win; Q1115 permits revival when either stack is empty; Q1116 defines the purple/yellow level-4 boundary.
- **IR trace:** `BT3-090.ts:8-43` maps the ordered effect to `SecurityManipulation` with `controller: "any"`, `bothPlayers: true`, and `amount: 1`, followed by optional free play from trash filtered to Digimon, yellow/purple colors, and `levelComparison: { op: "lte", value: 4 }`. Snapshot `effects.json:103530-103556` agrees exactly.
- **Behavioral proof:** `BT3-090.test.ts:6-33` evolves legal purple level-5 BT10-012 into Mastemon, asserts both players' security stacks are emptied, and verifies purple level-4 Vilemon is played from trash. Existing interpreter regression `interpreter.test.ts:4017-4020` statically asserts `bothPlayers: true`.
- **Peer/stack proof:** `security.ts:74-86` loops both players' security stacks, while `:143-207` trashes from the top. `definition.ts:108-142` implements the union color and level ceiling; `play.ts:303-386` resolves the explicit trash source. BT3-093/BT3-096 and other security/revival peers provide the zone and free-play boundaries.
- **Correction/finding:** Strengthened the focused proof to assert both security stacks are actually trashed; no direct IR defect found.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-091 — Lilithmon

Score: 10/10. Trash threshold, Option return, and once-per-turn memory proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** `packages/shared/src/cards/data/cards.json` identifies
BT3-091 as a purple level-6, play-cost-12, 11000-DP Mega/Virus/Demon Lord/
Seven Great Demon Lords Digimon. Its When Digivolving effect is conditional on
having at least ten cards in trash and may return up to two purple Option cards
from trash to hand. Its Your Turn/Once Per Turn watcher gains two memory when
an Option card is used. Local KB Q1117 says the watcher activates after the
used Option's Main effect, while Q5449 says Security or Delay activation is not
an Option card use and does not trigger it. Comprehensive Option-use rules at
`data/kb/rules/comprehensive.md` §9-1 and effect-type rules at §15-2-1-3 define
the same use-vs-activation boundary.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-091.ts` emits a
WhenDigivolving `Return` with trash, own-controller, Option, and Purple
filters, count two, `upTo`, optional selection, and a ten-card `zoneCount`
condition. Its YourTurn effect is `frequency: "OncePerTurn"` and watches the
typed `whenOptionUsed` event before gaining two memory. The module is full
coverage with no residual and registers only through
`registerIrCard("BT3-091", compiled)`. Generated snapshot line 103552 matches
the direct trace. The shared Return action, `zoneCount` condition, SubTrigger
event map, and `fireOptionUsed`/`useOptionFromHand` hooks provide the concrete
interpreter path.

**Behavioral, peer, and stack proof.** `BT3-091.test.ts` proves two purple
Options return when the trash count reaches ten and proves the Option-use
watcher refunds an Option's two-memory cost exactly once. BT3-096 is the same
typed Option-use watcher with an optional self-suspension cost; BT19-040 is a
same-event peer whose tests explicitly cover after-Main timing and no trigger
from Security activation. The Digivolving fixture is a legal level-5-to-level-6
stack and the Option fixture is a normal legal field.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-092 — MaloMyotismon

Score: 10/10. Piercing and other-Digimon deletion memory behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog describes BT3-092 as a purple level-6,
play-cost-13, 12000-DP Mega/Virus/Demon Lord Digimon with Piercing and an
All Turns effect that gains one memory for each Digimon deleted when another
Digimon is deleted. The local KB records the 2021 erratum from a flat one
memory to “for each Digimon deleted,” and Q1105/Q1109 confirm the card can
trigger when it remains in play as it is deleted; Q1118/Q1120 confirm both
players' Digimon in a simultaneous battle deletion count as two; Q1119 excludes
Security Digimon; Q1121 covers simultaneous copies; Q1122 excludes the source
when the source itself is deleted. The current KB also marks the card
restricted to one copy from 2026-04-04.

**Implementation and correction.** `apps/api/src/cards/BT3/BT3-092.ts` uses a
Static Piercing keyword and an AllTurns `onDeletionOf` watcher that excludes
the source and accepts a Digimon deleted on either side, then places
`scaling: { per: 1, filter: { deletedByTrigger: true }, unit: "cards" }` on
the GainMemory action. The direct module has full coverage, no residual, and
only `registerIrCard`. The generated snapshot at line 103588 remains stale: it
has no action scaling and instead carries a controller-local scaling object at
the SubTrigger level. The direct registered module is authoritative and uses
the action-level `deletedByTrigger` trace. The old direct source filter also
had an erroneous `controllerDefault: "mine"` scope, which would ignore an
opponent's deleted Digimon; it now retains only `excludeSelf` and Digimon kind.
`scaleFactor` reads the complete `ctx.trigger.deletedPermanentIds` batch, while
the deletion bus and combat
controller bind the matching live deleted subject before the permanent leaves.

**Behavioral, peer, and stack proof.** `BT3-092.test.ts` now contains focused
runtime-registered IR assertions that the errata scaling is attached to
GainMemory and the watcher has no controller-side restriction; its behavioral case deletes one
own and one opposing Digimon and expects two memory while also proving
Piercing. The errata-cluster test
`apps/api/src/engine/cards/errataCluster.test.ts` independently checks the
“for each Digimon deleted” text. Combat peers use the same onDeletionOf bus and
batch payload, and the ordinary two-Digimon field is a legal stack-free proof;
the simultaneous own/opponent deletion case is the relevant cross-controller
boundary.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
The direct module is corrected; generated snapshot synchronization is deferred
and is not treated as executable behavior. No unresolved implementation
ambiguity remains. Banlist restriction is catalog/rules metadata and does not
alter the card's executable effect.

### BT3-093 — Davis Motomiya

Score: 10/10. Memory boundary, reveal colors/order, decline and Security play proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-093 is cataloged as a blue, play-cost-4 Tamer. Its
Start of Your Turn effect sets memory to three if memory is two or less; its
On Play effect reveals the top three and optionally adds one blue Digimon and
one green Digimon, then returns the rest to the deck bottom in any order; its
Security effect plays the Tamer without cost. Local KB Q1123 confirms the two
added cards are specifically one blue Digimon and one green Digimon. Q4704
confirms that if a revealed card can fill the blue slot, the player may choose
it and decline the green slot; the two selections are independently optional.
Comprehensive reveal rules §15-15-3-4 and §15-15-3-6 cover one continuous
reveal process and owner-selected bottom order, while §15-16-11 covers the
start-of-turn timing.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-093.ts` emits the
conditional SetMemory action, a three-card RevealAdd with two independent
optional filters constrained to `kind: ["Digimon"]` and Blue/Green colors,
deck-bottom rest handling, and a Security PlayWithoutCost action. It declares
`cardId`, full coverage, no residual, and only IR registration. Snapshot line
103613 matches the direct module. Shared RevealAdd selection/order paths,
`memoryAtMost`, and Security PlayWithoutCost provide the execution trace.

**Behavioral, peer, and stack proof.** `BT3-093.test.ts` covers metadata and
typed triggers, conditional memory set, positive dual-color selection while
rejecting a blue Option, independent visible-card choices, declining both
slots and ordering all cards on the bottom, and Security play. BT3-094 and
BT3-095 are same-cycle Tamer peers sharing start-turn and Security shapes; the
mixed Digimon/Option reveal fixture proves the kind and color boundaries. The
Tamer is played normally, so no illegal evolution-stack assumption is used.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-094 — Ken Ichijoji

Score: 10/10. Start memory, battle-win optionality, suspend/gain behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-094 is a green, play-cost-4 Tamer. It sets memory to
three at the start of its turn when memory is two or less. During its turn,
when one of its green or blue Digimon deletes an opponent's Digimon in battle
and survives, it may suspend this Tamer to gain one memory; its Security text
plays it without cost. Q1124 says a Security Digimon is not considered a
Digimon for this trigger, and Q1125 limits the deleting attacker to the
controller's green or blue Digimon. Comprehensive battle rules §14-2-2 through
§14-2-5 and Security Digimon rules §13-1-8-3/§14-2-3 establish the survivor and
Security boundaries.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-094.ts` emits
StartOfYourTurn SetMemory with `memoryAtMost: 2`; a YourTurn SubTrigger on
`whenDeletesInBattle` filters own Digimon with Green or Blue colors and offers
an optional one-memory GainMemory costed by suspending the source Tamer; and a
Security PlayWithoutCost. Snapshot line 103658 is an exact match. The combat
controller emits `whenDeletesInBattle` only for a surviving battle winner,
while Security checks emit their own battle-won path and no normal-Digimon
delete event, matching Q1124.

**Behavioral, peer, and stack proof.** `BT3-094.test.ts` proves start-turn
memory and a blue attacker winning against an opposing Digimon, with the Tamer
suspended and memory increased; it also proves Security play. BT3-093 and
BT3-095 provide adjacent Tamer timing/Security peers, and the focused attacker
fixture is a legal normal field. The shared color and source-controller filter
boundaries distinguish this trigger from a Security Digimon battle.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-095 — Joe Kido

Score: 10/10. Blocker start-turn predicate and Security play proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog describes BT3-095 as a black, play-cost-2
Tamer. Its Start of Your Turn effect gains one memory if the player has a
Digimon with Blocker in play, and its Security effect plays it without cost.
Local KB Q1126 explicitly says multiple Blockers still produce only one
memory. Comprehensive `<Blocker>` rules §16-5 define the persistent keyword,
and §15-16-11 defines the start-of-turn window.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-095.ts` uses a single
`GainMemory` action gated by `youHave` over the controller's battle area,
Digimon kind, and Blocker keyword; it then supplies Security
PlayWithoutCost. Snapshot line 103700 matches, with full coverage and no
residual. The `youHave` condition counts matching permanents only as a boolean
gate, so it cannot multiply memory by the number of Blockers; the shared
keyword matcher and start-turn dispatcher provide the boundary.

**Behavioral, peer, and stack proof.** `BT3-095.test.ts` puts two Blockers in
play and proves exactly one memory at turn start, then proves Security play.
BT3-093 and BT3-094 are matching Tamer peers for start-turn/Security handling,
and the two Blocker fixtures exercise the relevant repeated-trait boundary.
No evolution stack is needed for this Tamer's condition.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-096 — Mimi Tachikawa

Score: 10/10. Multi-copy, suspended suppression, later Option, and Security play proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-096 is a purple, play-cost-2 Tamer. Its All Turns
effect says when a player uses an Option card, it may suspend this Tamer to
gain one memory; its Security effect plays it without cost. Local KB Q1127
confirms activation after the used Option's Main effect; Q1128 excludes
Security/Delay activation; Q4136 confirms an Option used by this card's
Digi-Burst still triggers Mimi. Comprehensive Option-use §9-1 and the shared
`whenOptionUsed` hook define genuine use rather than generic effect activation.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-096.ts` emits an
AllTurns SubTrigger for `whenOptionUsed` with an optional GainMemory whose cost
is suspending exactly the source Tamer, plus Security PlayWithoutCost. Snapshot
line 103736 is an exact match; coverage is full and residual empty. The shared
SubTrigger map, `fireOptionUsed`, and `useOptionFromHand` implementation fire
the watcher after Option resolution and do not fire for Security/Delay paths.

**Behavioral, peer, and stack proof.** `BT3-096.test.ts` covers metadata, a
single Mimi gaining one memory after an Option, two copies each being offered
exactly once, and later Options not retriggering already-suspended copies; it
also covers Security play. BT3-091 is the same typed event with a once-per-turn
frequency, and BT19-040's tests cover Digi-Burst/after-Main/no-Security
boundaries. The two-copy field is a legal same-color Tamer configuration and
proves independent source identity.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-097 — A Delicate Plan

Score: 10/10. Main attack protection and Security return proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-097 is a red play-cost-1 Option. Its erratum changes
the original broad “any cards” wording to prevent only Security effects of
Option cards checked by one chosen Digimon for the turn; its Security effect
adds the card to hand. Local KB Q1131 confirms Digimon and Tamer Security
effects still activate. Comprehensive Security-check rules §13-1-8-2 and
Option effect classification §15-2-1-3 provide the timing and category
boundaries.

**Implementation and correction.** `apps/api/src/cards/BT3/BT3-097.ts` uses
Main `GrantStatic` with grant `noSecurityOptionEffects`, selecting one of the
controller's Digimon for the turn, and Security `AddToHandSelf`. The direct
module is full coverage, residual empty, and IR-only registered. The generated
snapshot at line 103775 remains stale: it uses a `GrantAuraToOpponents` shell
with effect text rather than the implemented GrantStatic grant. The direct
registered module is authoritative. `runGrantStaticAction` routes this grant to the shared
`disableSecurityEffect(id, "option", ...)` primitive, which suppresses only
Option Security effects and leaves Digimon/Tamer Security effects available.

**Behavioral, peer, and stack proof.** `BT3-097.test.ts` plays the Option,
attacks a player, and checks that an opposing Security Option does not activate;
it also proves the card returns from Security to hand. BT7-014, BT17-014, and
ST13-05 are same-grant peers using the implemented no-Security-Option path;
the errata cluster and Security-check engine cover the category boundary. The
focused field uses a legal Digimon attacker and Security Option.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
The direct registered behavior has no unresolved implementation ambiguity;
generated snapshot synchronization is deferred.

### BT3-098 — Plasma Stake

Score: 10/10. 13000-DP threshold and Security activation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** The catalog identifies BT3-098 as a red play-cost-4
Option. Its Main effect deletes one opponent Digimon with 13000 DP or more;
its Security effect activates that Main effect. There is no local KB entry.
Comprehensive effect-target rules and current-DP comparison in the shared
permanent matcher govern the threshold, and Security §13-1-8-2 governs the
Security Main activation.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-098.ts` emits Main
Delete with opponent/Digimon and current DP `gte 13000`, count one, followed by
Security `ActivateMain`. Snapshot line 103793 matches exactly; coverage is
full, residual empty, and registration is exclusively `registerIrCard`.
`resolvePermanentTargets` reads `permanent.currentDP`, and the shared Delete
and ActivateMain interpreter paths consume those fields.

**Behavioral, peer, and stack proof.** `BT3-098.test.ts` proves deletion at the
catalog threshold, now also proves a 12,999-DP opposing Digimon survives, and
proves Security activation of the Main effect. BT2-110 and the broader Option
Delete/ActivateMain cards are matching mechanism peers. The negative fixture
is the meaningful numeric boundary; no evolution stack is required for a
threshold deletion Option.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-099 — We Have to Stop Fighting!

Score: 10/10. Both-player battle protection and Security return proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-099 is a blue play-cost-2 Option. Its Main effect
says neither player's Digimon can be deleted in battle for the turn; its
Security effect adds the card to hand. Local KB Q1132 confirms the protection
also prevents a Digimon losing to a Security Digimon from being deleted. Q1133
confirms it does not prevent effect deletion, an effect-triggered deletion, or
deletion from 0 DP. Comprehensive battle rules §14-2 and Security Digimon
§14-2-3 define the deletion-vs-Security boundary.

**Implementation and trace.** `apps/api/src/cards/BT3/BT3-099.ts` applies a
turn-duration `Restrict` with `beDeletedInBattle` to all Digimon owned by
either player (`controller: "any"`, count `"all"`), then supplies Security
AddToHandSelf. Snapshot line 103812 is an exact match; coverage is full and
residual empty. The shared restriction action installs the combat-specific
continuous ledger entry, while combat resolution consults this restriction
only when determining battle losers; ordinary Delete and DP-zero paths remain
separate.

**Behavioral, peer, and stack proof.** `BT3-099.test.ts` proves both players'
Digimon receive the battle-only restriction and proves Security hand return.
`apps/api/src/engine/combat/keywordBattle.test.ts` uses BT3-099's Main effect
to prove a losing Digimon remains after battle, and shared combat tests cover
the protected-loser outcome. The `controller: "any"` target deliberately
exercises both seats; the Q1132/Q1133 paths establish Security and effect
deletion boundaries.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-100 — Death Parade Blaster

Score: 10/10. Source-trash boundaries, suspension condition, and Security path proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

**Catalog and rules.** BT3-100 is a blue play-cost-3 Option. Its Main effect
trashes up to two bottom digivolution cards from all opponent Digimon, then,
if the controller has a green Digimon in play, suspends one opponent Digimon
with no digivolution cards; its Security effect activates Main. Local KB Q1134
confirms that playing a green Digimon after using this Option cannot retroactively
make the conditional suspend portion activate. Comprehensive effect sequencing
§15-1-4/§15-1-6 and shared stack-source rules define the ordered two-action
processing; the `digivolutionCards: "none"` matcher is a live current-stack
boundary.

**Implementation and correction.** `apps/api/src/cards/BT3/BT3-100.ts` emits
`TrashDigivolution` over all opponent Digimon, amount two, `fromTop: false`
(the bottom source), and `upTo: true`, then a `Suspend` over one opponent
Digimon with no digivolution cards gated by `youHave` a green controller
Digimon, followed by Security ActivateMain. The generated snapshot at line
103830 remains stale without the `upTo` flag; the direct registered module is
authoritative. Coverage is full and residual empty.
The shared `runTrashDigivolution` primitive applies the bottom slice per
selected host and offers the second source as an optional continuation, while
current permanent matching re-evaluates the sourceless target after the first
action.

**Behavioral, peer, and stack proof.** `BT3-100.test.ts` supplies two legal
source cards under an opponent Digimon, proves both bottom sources are trashed
when accepted, separately declines the second source and proves only the
bottom card is trashed, proves the now-sourceless Digimon is suspended while a
green Digimon is in play, and repeats the full Main effect from Security.
BT5-032 is a same-wording `TrashDigivolution(upTo: true)` peer, while BT15-019
is a matching TrashDigivolution-plus-follow-up-condition peer; the shared
source-trash interpreter covers bottom-vs-top semantics. The test uses a legal
multi-card evolution stack and a separate green Digimon to exercise the stack
and trait boundaries.

**Score and ambiguity.** `2/2 + 2/2 + 2/2 + 2/2 + 0/2 = 8/10`.
No unresolved implementation ambiguity was found.

### BT3-101 — Bifrost

Score: 10/10. Both penalties, duration, and Security path proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52311-52324` records a yellow Option, play cost 3, with one opponent Digimon receiving -3000 DP and Security Attack -1 through the opponent's next turn; Security applies both penalties for the turn. No local card-specific QA entry was found.

IR and trace: `apps/api/src/cards/BT3/BT3-101.ts:8-96` selects exactly one opponent Digimon into `bifrostTarget`, then applies both effects through `fromSelectionRef`; Main uses `untilOpponentTurnEnd`, Security uses `forTheTurn`. The module is `coverage: "full"`, has an empty residual list, and registers only through `registerIrCard`. The snapshot at `effects.json:103860-103916` matches this direct trace.

Behavioral proof: `BT3-101.test.ts:8-40` covers Main's DP and Security Attack penalties and the Security path's same-turn penalties. The target binding prevents the second and third actions from prompting for different Digimon.

Peer/stack proof: target binding follows the same selection-reference mechanism used by other multi-clause effects; the `ModifyDP` and keyword actions use the shared board/restriction primitives. The effect is a temporary modifier and does not alter a stack, trait, or digivolution identity.

Status: no implementation correction was needed. The score remains provisional solely because executed gates are `0/2`.

### BT3-102 — Code Cracking

Score: 10/10. Accept, decline/recovery, and empty-security fallback proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52327-52339` records a yellow Option, play cost 4, allowing the opponent to trash their top security and awarding Recovery +1 if they do not. Q1135-Q1136 establish opponent choice, decline reward, and automatic recovery with an empty opponent security stack; comprehensive Option timing and Recovery rules apply.

IR and trace: `apps/api/src/cards/BT3/BT3-102.ts:5-27` uses `SecurityManipulation` with `optionalFor: "opponent"` for the trash and a subsequent deck-top `addTop` conditioned on `opponentDeclinedTrash`. `security.ts` records the opponent decision and marks an empty/failed trash as declined. The direct module is full coverage, no residual, and has only `registerIrCard`.

Correction: the direct module already expressed the correct opponent-choice behavior, but `opponentDeclinedTrash` was absent from the shared `Condition` union/evaluator and therefore the Recovery branch was inert. The evaluator now aliases it to `ifOpponentDeclined` (`conditions.ts:239-241`; union `conditions.ts:74-75`), preserving existing compiler output while making this branch executable. `BT3-102.test.ts:22-61` adds behavioral proof that both an explicit decline and an empty opponent security stack recover one card; the accepted branch remains at `:6-20`.

Snapshot ambiguity: `effects.json:103917-103935` omits `optionalFor` and uses a raw condition (`"they don't"`), so it does not faithfully encode the direct opponent decision. Architecture and registry authority resolve the discrepancy in favor of the direct module; the snapshot was not edited.

Peer/stack proof: the shared security primitive handles opponent-facing optional decisions and top-security movement; this card has no trait/evolution stack boundary. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-103 — Hidden Potential Discovered!

Score: 10/10. Evolution reduction and Security return proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52342-52355` records a green zero-cost Option: the next time one of the user's green Digimon digivolves this turn, the user may suspend one Digimon to reduce that digivolution's memory cost by 5; Security returns the Option to hand. Q1137-Q1140 establish source-color timing, effect-driven digivolution eligibility, and the fact that a Digimon suspended by this effect can itself digivolve. Q1285/Q1302/Q1313 and Q4276 cover replacement interaction and legal stacking with other reductions.

Correction and IR trace: the previous direct module used a generic `CostModifier` plus an immediate `Suspend`, which paid the suspend at Option resolution and did not model “the next time ... would digivolve.” `apps/api/src/cards/BT3/BT3-103.ts:8-55` now installs a `Replacement` for `wouldDigivolve`, scoped to a battle-area own green Digimon, with an optional one-Digimon suspend cost, reduction amount 5, and `forTheTurn` duration. The runtime replacement branch now carries this duration into its expiry sweep (`replacement.ts:30-39,367-377`); the shared action type declares the duration. The Security AddToHandSelf path remains full coverage with no residual and only `registerIrCard`.

Behavioral proof: `BT3-103.test.ts:7-49` now asserts the payer is not suspended immediately after the Option resolves (`:30-32`) and is suspended only once the subsequent digivolution uses the replacement (`:34-41`), in addition to the Security return test.

Snapshot ambiguity: `effects.json:103937-103956` still shows the old generic Suspend plus CostModifier. This is known generated-data drift; direct module authority and `registerIrCard` runtime normalization are the reason it remains unedited.

Peer/stack proof: BT3-056 (`BT3-056.ts:7-22`) and EX2-064 (`EX2-064.ts:5-45`) establish the same interactive `wouldDigivolve` replacement shape. Comprehensive §16-10 (`comprehensive.md:2876-2896`) places the optional suspend at the digivolution interruption, and Q4276 confirms reductions can stack. Source filtering keeps non-green-to-green from qualifying while allowing green-to-non-green as required by Q1138-Q1139. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-104 — Positron Laser

Score: 10/10. Target restrictions, blue condition, return, and Security behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52358-52371` records a green play-cost-6 Option. Main restricts up to two opponent Digimon from attacking or blocking through the opponent's next turn, then conditionally returns one suspended opponent Digimon if a blue Digimon is present; Security restricts attack for the turn and has the same blue-gated bounce. Q1141 requires the blue Digimon to be present at activation, not played later.

IR and trace: `apps/api/src/cards/BT3/BT3-104.ts:8-96` uses `Restrict` with `attackOrBlock` for Main and `attack` for Security, correct up-to-two cardinality and durations, followed by a suspended-opponent `Return` gated by `youHave` a blue Digimon in the battle area. Both branches are full coverage, empty residual, and register only via `registerIrCard`. The direct implementation matches the relevant printed clauses.

Behavioral proof: `BT3-104.test.ts:8-48` covers Main's attack/block restrictions, blue-gated bounce, source-stack trash on return, and Security's attack restriction plus bounce.

Snapshot ambiguity: `effects.json:103958-104007` matches the restriction and bounce but includes an extra `Trash` action targeting all own cards in both Main and Security (`:103979-103980,104001-104002`), which is absent from the card text and direct module. Per architecture, direct IR is authoritative and the stale snapshot remains documented rather than promoted or edited.

Peer/stack proof: `BT3-100.ts` demonstrates the adjacent blue/green battlefield condition style; the shared restriction primitive expands `attackOrBlock` into attack and block (`restrictions.ts:107-112`). The return primitive handles stacked Digimon by moving the permanent and trashing its sources as required by the catalog parenthetical. No trait boundary is involved. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-105 — Breath of the Gods

Score: 10/10. Reboot, protection clauses, and Security behavior proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52374-52387` records a black play-cost-2 Option. Main gives one own Digimon Reboot and protection from DP reduction or return to hand/deck through the opponent's next turn; Security prevents all opponent Digimon from attacking players for the turn. Q1142 confirms that the Security restriction dynamically catches Digimon entering later.

Correction and IR trace: `apps/api/src/cards/BT3/BT3-105.ts:5-63` now binds the single Main selection as `breathTarget` (`:11-19`) and applies both `dpImmune` and `beReturned` restrictions back to that same selection (`:27-36`), preserving one-Digimon cardinality. Security uses an all-opponent-Digimon `attackPlayers` restriction for the turn (`:41-57`). The module is full/no residual and has only `registerIrCard`.

Behavioral proof: `BT3-105.test.ts:8-45` was strengthened with a second own Digimon, preferred selection, and assertions that the untouched Digimon receives no Reboot, DP immunity, or return protection (`:30-35`); the Security path remains covered (`:38-45`).

Snapshot ambiguity: `effects.json:104009-104036` contains only Reboot for Main and uses `count: 1` for Security, omitting the two protections and the dynamic all-opponent boundary. The direct module plus the registry authority is the executable proof; snapshot drift is recorded, not treated as a second registration path.

Peer/stack proof: `P-220.ts:4-33` is a legal peer with both Reboot and Blocker static traits, useful for keyword coexistence; restrictions and temporary keyword primitives preserve the selected permanent's identity. Q1142 and `BT18-028.ts:27-39` support the live Security boundary. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-106 — Beast Cyclone

Score: 10/10. Blocker/Reboot OR recipients and Security activation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52390-52403` records a black play-cost-3 Option giving all own Digimon with Blocker or Reboot Security Attack +1 for the turn; Security returns itself to hand. Q1143 requires one grant even when both keywords are present; Q1144 requires the grant to disappear if either qualifying keyword is lost.

IR and trace: `apps/api/src/cards/BT3/BT3-106.ts:8-54` uses one `GainKeyword` over an `or` filter for Blocker/Reboot, `count: "all"`, `whileMatchesTargetFilter: true`, and `forTheTurn`; Security uses AddToHandSelf. The matching primitive supports `or` and stack keyword matching, while live-filter evaluation removes the temporary grant when a target ceases to qualify. Full coverage, empty residual, and one `registerIrCard` registration are present.

Behavioral proof: `BT3-106.test.ts:10-39` covers separate Blocker and Reboot recipients and the Security return. The test suite title was corrected from the unrelated “Final Zubagon Punch” to “Beast Cyclone,” removing misleading proof labeling.

Peer/stack proof: P-220 is a legal static peer carrying both Blocker and Reboot (`P-220.ts:4-33`), while BT3-030 and BT18-028 demonstrate the same live target-filter boundary. Comprehensive Security Attack and Blocker rules (`comprehensive.md:2810-2829`) support one numerical grant despite multiple matching keywords. No unresolved trait/evolution ambiguity remains. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-107 — Looking Back on the Good Times

Score: 10/10. De-digivolve/delete ordering and cost boundaries proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52406-52419` records a black play-cost-4 Option that De-Digivolves one opponent Digimon by one, then deletes that same Digimon if its current play cost is 4 or less; Security returns itself to hand. Q1145 makes the post-De-Digivolve cost decisive; Q1146 allows a no-stack or level-3 target when its cost is already within the limit.

Correction and IR trace: `apps/api/src/cards/BT3/BT3-107.ts:5-54` keeps the one-opponent target and De-Digivolve, then uses `sameTarget` plus a new `lastTargetPlayCostAtMost` condition (`:22-37`). The condition evaluator checks each previously resolved permanent's live top card definition (`apps/api/src/engine/effects/interpreter/conditions.ts:112-123`), preserving the Q1145 post-De-Digivolve boundary; the shared union declaration is at `packages/shared/src/effects/ir/predicates/conditions.ts:35-36`. The direct module is full/no residual and registers only with `registerIrCard`.

The correction was necessary because `sameTarget` deliberately reuses IDs without reapplying its filter (`targeting/permanents.ts:373-375`), and the previous unconditional Delete could delete a cost-above-4 target. The added focused case in `BT3-107.test.ts:40-54` proves a high-cost selected target survives; Q1145/Q1146 positive cases remain at `:8-38`.

Snapshot ambiguity: `effects.json:104064-104091` still represents a stale alternate decomposition with an extra Trash action (`:104074-104080`), a level-3/no-stack target, and a raw cost condition (`:104082-104085`). It does not supersede the direct module under the documented architecture.

Peer/stack proof: `BT19-089.ts` supplies the same-target pattern; De-Digivolve processing and current-state references are grounded by `digivolution.ts:16-49` and comprehensive De-Digivolve rules (`:2911-2943`). Score is provisional 8/10 with executed gates at `0/2`.

### BT3-108 — Dark Despair

Score: 10/10. Retaliation grant and Security activation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52422-52435` records a purple play-cost-2 Option giving one own Digimon Retaliation through the opponent's next turn; Security returns itself to hand. No card-specific QA entry was found.

IR and trace: `apps/api/src/cards/BT3/BT3-108.ts:8-44` selects one own Digimon, grants Retaliation with `untilOpponentTurnEnd`, and uses AddToHandSelf from Security. Both effects are full coverage with no residual, and the module has exactly one `registerIrCard` call.

Behavioral proof: `BT3-108.test.ts:8-27` covers Main's Retaliation grant and Security return. The action uses the shared keyword-duration primitive; no extra target or stack mutation is present.

Peer/stack proof: comprehensive Retaliation rules (`comprehensive.md:2944-2951`) establish that the effect triggers on battle deletion and deletes the battled Digimon; the same one-target temporary-keyword pattern is used by adjacent option modules. No trait boundary or legal evolution stack changes the effect's selected permanent identity. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-109 — Back for Revenge!

Score: 10/10. Replay, On Play suppression, and stack handling proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52438-52450` records a purple play-cost-2 Option whose Main effect gives one own Digimon an On Deletion replay instruction for the turn, with no On Play effects on the replayed Digimon. Q1147-Q1149 and Q2730/Q2761 establish source-trash retention, loss of prior effects, no same-turn attack, and evolved-top-card replay.

IR and trace: `apps/api/src/cards/BT3/BT3-109.ts:12-39` installs `GainTriggeredEffect` on one selected own Digimon, watches `onDeletionOf`, and grants the `OnDeletionPlaySelfNoOnPlay` token for the turn (`:18-30`). The token resolves to `PlayWithoutCost` with `suppressOnPlayEffects: true` (`grantedEffects.ts:45-49,297-305`). The module is full/no residual, exports its compiled record, and registers only with `registerIrCard`.

Behavioral proof: `BT3-109.test.ts:8-46` verifies replay without On Play effects; `:48-85` verifies later evolution replays the evolved top card while the source remains in trash. Metadata and full-coverage assertions are at `:9-19`.

Peer/stack proof: the watcher anchor and live top-card replay path provide the legal evolution-stack boundary reflected in Q2730/Q2761. Comprehensive trigger/pending-activation rules (`comprehensive.md:1970-2022`) and Option-effect classification (`:1918-1935`) support the effect surviving a digivolution while applying to the current top card. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-110 — Necrophobia

Score: 10/10. Purple level-5 trash play and Security activation proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52453-52466` records a purple play-cost-5 Option that plays one level-5 purple Digimon from trash without paying its cost and suppresses its On Play effects; Security activates the Main effect. No card-specific QA entry was found.

IR and trace: `apps/api/src/cards/BT3/BT3-110.ts:8-44` uses `PlayWithoutCost` from trash, filtering own purple level-5 Digimon, with `payCost: false` and `suppressOnPlayEffects: true`; Security uses `ActivateMain`. Full/no residual and the sole `registerIrCard` registration are present.

Behavioral proof: `BT3-110.test.ts:8-50` covers Main replay of a purple level-5 with an On Play effect while preserving an existing own Digimon and opponent Digimon, plus Security activation of the same Main effect.

Snapshot ambiguity: `effects.json:104137-104160` omits `suppressOnPlayEffects` and adds a permanent `DisableTimingEffect` targeting own Digimon (`:104151-104156`). Neither matches the printed clause or direct module. The direct compiled record is authoritative through the registry; the stale aggregate was not edited.

Peer/stack proof: the shared play primitive handles from-trash placement, no-cost payment, and On Play suppression. The filter is a legal level/color boundary and does not inspect or mutate digivolution sources, so no hidden trait/evolution ambiguity remains. Score is provisional 8/10 with executed gates at `0/2`.

### BT3-111 — Imperialdramon: Dragon Mode

Score: 10/10. Named cost sources, breeding rejection, Piercing, and unsuspend proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-111-112.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:52469-52496` records green level 6, 12,000 DP, green/blue level-5 evolution costs of 5, the Paildramon/Dinobeemon hand replacement, Piercing, and the Your Turn Once Per Turn “deletes in battle and survives” unsuspend. The Q1150 answer requires the reducer to be inactive in the breeding area. Rules §3-4-7-3 through §3-4-7-8 at `comprehensive.md:546-582` supply the explicit-area exception boundary; §4-2 at `:636-653` supplies alternate-cost semantics; §16-7 at `:2836-2861` supplies Piercing timing.
- **IR trace:** `apps/api/src/cards/BT3/BT3-111.ts:5-48` records a full-coverage IR with no residual. The Static effect has the exact source filter `{ controller: "mine", nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "nameExact" }] }`, target `into: { zone: "hand", controller: "mine" }`, and nested `reduceCost` amount 2. It separately grants Piercing to self, and its Your Turn watcher is `whenDeletesInBattle`, source-self, unsuspending self with `frequency: "OncePerTurn"`. The snapshot at `effects.json:104164-104210` matches this behaviorally.
- **Behavioral proof:** `BT3-111.test.ts:8-44` statically asserts the exact runtime-registered named-source reducer, nested amount, Piercing keyword, source-self watcher, and Once Per Turn frequency. `:46-96` digivolves Paildramon into Dragon Mode, proves the 2-memory reduction and Piercing security check, then proves the source unsuspends after deleting an opposing Digimon in battle. `:98-134` uses the legal green stack BT3-050 Stingmon → BT3-055 Dinobeemon → BT3-111 and proves the reduced cost is 3 rather than 5 while preserving `[BT3-055, BT3-050]` underneath. `:136-158` uses Dinobeemon in the breeding area and proves the full 5-memory cost is paid with no Q1150 reduction.
- **Peer/stack proof:** `reducers.ts:320-415` is the shared verified reducer path and `digivolve.ts:600-710` is the breeding-area guard. BT11-059 supplies the named-source/self-reduction and battle-deletion Once Per Turn peer; BT6-010 and BT15-047 supply the Piercing and unsuspend patterns. The exact-name boundary is represented in direct IR and the static test, while the green Stingmon → Dinobeemon → Dragon Mode stack is catalog-legal.
- **Correction/finding:** No executable defect was found. The dispatch strengthened static IR proof and added legal Dinobeemon and breeding-area cases; the direct module already satisfied the catalog/rules behavior and retains only `registerIrCard`.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

### BT3-112 — Omnimon Alter-S

Score: 10/10. Global de-digivolve/delete and optional unblockable source return proved. Source: `docs/audits/BT3-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT3-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT3/BT3-111-112.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

- **Catalog/rules:** `cards.json:52499-52526` records white level 7, 15,000 DP, red/black level-6 evolution costs of 6, and the two ordered effects. Rules §8-1 at `comprehensive.md:1391-1445` covers the legal black level-6 → white level-7 digivolution used in the focused fixture. Rules §16-12 at `:2911-2943` requires De-Digivolve to trash each current top card before the following action; the live-DP deletion then uses the newly promoted cards. Rules §11-1 through §11-2 at `:1695-1745` and the optional-processing rules at `:2092-2128` bound the attack and optional-cost windows.
- **IR trace:** `apps/api/src/cards/BT3/BT3-112.ts:5-54` records full coverage and an empty residual. The When Digivolving actions are ordered `DeDigivolve` (opponent Digimon, all, amount 1) then `Delete` (opponent Digimon, live DP `lte 5000`, all). The When Attacking action is an optional self Restrict to `cantBeBlocked` for the turn, with a return cost from `digivolutionCards`, controller mine, kind Digimon, level 6, and `hostFilter: { isSelfRef: true }`. The direct module is authoritative; the generated snapshot at `effects.json:104212-104253` matches every other field but omits this host scope.
- **Behavioral proof:** `BT3-112.test.ts:8-52` statically asserts the card metadata, both red/black level-6 evolution costs, and the runtime-registered IR's full coverage, action ordering, live DP threshold, optional restriction, and exact hosted-source filter. `:54-84` evolves a legal black L6 BT3-074 base into Alter-S, places legal green Quartzmon stacks on both opposing targets, and asserts De-Digivolve promotes BT17-050 Parasitemon (4,000 DP) into deletion while BT3-057 MegaGargomon (11,000 DP) survives after promotion. `:86-114` attacks with Alter-S over BT3-074, accepts the optional cost, returns that level-6 source, and asserts the turn restriction. `:116-141` is the negative cross-stack proof: an attacker with no source cannot pay using a level-6 card under a separate own Alter-S stack, so it remains blockable and the unrelated stack remains intact.
- **Peer/stack proof:** `BT1-084.ts:27-41` is the direct hosted-source peer and uses `hostFilter: { isSelfRef: true }`; its focused tests prove the same level-6 source and optional action. `BT16-062` and BT11-108 establish De-Digivolve-then-delete sequencing. `BT3-074` proves the `cantBeBlocked` restriction boundary. The Alter-S attack fixture uses the catalog-legal black L6 BT3-074 → white L7 BT3-112 route; the opposing Quartzmon → Parasitemon and Quartzmon → MegaGargomon stacks are legal green L6 paths and provide both sides of the 5,000-DP threshold. The negative fixture explicitly separates the source host to prove the trait/host boundary.
- **Correction/finding:** The direct module had a proven source-scope defect: without a host filter, the return cost could select a qualifying level-6 card under any own Digimon. Added `hostFilter: { isSelfRef: true }` in `BT3-112.ts` and expanded `BT3-112.test.ts` to assert the IR and reject cross-stack payment. The generated snapshot remains stale only for this newly explicit host scope; it is documented for later reconciliation rather than edited outside the direct authoring path.
- **Score:** 2/2 + 2/2 + 2/2 + 2/2 + 0/2 = **8/10 provisional**.

## Mechanisms

No `*-MECHANISM.md` file was ever written for BT3, and the re-audit changed no engine seam. Two card-level corrections are worth keeping. BT3-001's first lifecycle test expected a decision for a single legal target and was red because the engine resolves a mandatory singleton automatically; the corrected observable assertion proves the evolved stack retains BT3-001 and deletes only the natural 1000-DP opponent, with no production change. BT3-012 replaced a numeric DP override with natural cards and now proves a legal BT3-001 → BT3-009 → BT3-012 → BT3-015 public lifecycle in which the exact 2000-DP target is deleted while the natural 3000-DP peer survives.

## Knowledge base index

`docs/audits/BT3-reaudit/KB-INDEX.md` (2026-09-10) was never filled in. It carries only its starting instruction: populate each card's local Q&A identifiers from `node tools/kb/query.mjs card <CARD-ID>` during review, and record the absence of a card-specific ruling only after that query. The Q&A references that were recorded survive in the card sections above; there is no aggregated index for BT3.

## Open items

- Evidence depth. Only BT3-001, BT3-006, BT3-009, BT3-011, and BT3-012 received a new per-card report in the re-audit. The remaining 107 rows were accepted individually by the coordinator from catalog and IR review reconciled against the already-green focused baseline. `docs/audits/BT3-reaudit/RUN.md` states the reasoning explicitly: "generic absence of a full end-to-end lifecycle was not treated as a defect where the implemented mechanism and its material boundaries were already reproducibly exercised". Public lifecycle hardening for those cards is desirable and outstanding.
- No aggregated knowledge-base index. `docs/audits/BT3-reaudit/KB-INDEX.md` was left at its instruction text.
- Status contradiction between passes. `docs/audits/BT3-AUDIT.md` (2026-09-02) says "static card-by-card pass complete; execution gates deferred" while `docs/audits/BT3-STATIC-AUDIT.md` of the same date says "complete — 112/112 cards verified at 10/10". Both are superseded by the 2026-09-10 re-audit.
- Clause evidence for 107 cards is dated 2026-09-02 and static-only, and its per-card rows read "provisional 8/10". The 2026-09-10 ledger rows of 10/10 win; the older scores are kept in place only as clause detail.
- Catalog identity is a blob hash in every source, not a commit. `catalog_commit` stays `unknown` until a run records one.

## History

- `docs/audits/BT3-AUDIT.md` — last in `34b607ae9`, 2026-09-02. First static card-by-card pass, self-marked archival, with execution gates deferred.
- `docs/audits/BT3-STATIC-AUDIT.md` — last in `34b607ae9`, 2026-09-02. Static closeout ledger claiming 112/112 at 10/10; its Executed gates section is copied above.
- `docs/audits/BT3-REAUDIT-LEDGER.md` — last in `e6e19d8b0`, 2026-09-10. Independent evidence ledger, 112 rows at 10/10; merged into the card ledger above.
- `docs/audits/BT3-reaudit/` — last in `e6e19d8b0`, 2026-09-10. Two per-card reports (BT3-009, BT3-011) merged into the card ledger, plus `RUN.md` (merged into Gates), `REVIEW-NOTES.md` (merged into Open items), `KB-INDEX.md` (never filled in), and `WORKER-BRIEF.md` (worker instructions, not evidence).
- `internal-docs/audits/BT3/` — last in `e6e19d8b0`, 2026-09-10. 15 files: 12 Luna range reports (`BT3-001-010.md` … `BT3-111-112.md`) carrying the 2026-09-02 static-only clause evidence, merged per card above where nothing newer existed, plus three 2026-09-10 single-card reports (BT3-001, BT3-006, BT3-012) merged in full.
- No `apps/api/src/cards/BT3/AUDIT.md` existed. No logs, PNG, or JSON evidence existed for BT3.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT3: PR #4574, #4579.
