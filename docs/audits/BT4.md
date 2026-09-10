---
set: BT4
cards: 115
status: verified
verified_at: 2026-09-10
catalog_commit: unknown
evidence_commit: eabe99351
---

# BT4 audit

## Status

All 115 BT4 production modules are audited and the 2026-09-10 re-audit closed its delivery gates: 1150/1150, 115/115 cards at 10/10. The exact BT4 collection passed 126 files and 438 tests, the affected-mechanism manifest passed 12 files and 129 tests, `pnpm typecheck` passed shared, API, and web, and effects sync, lint, format, and `git diff --check` were clean. The 2026-09-10 re-audit (`docs/audits/BT4-REAUDIT-LEDGER.md` and `docs/audits/BT4-reaudit/`) is the winning source; the 2026-09-02 static pass and the archival range reports under `internal-docs/audits/BT4/` are superseded, and their clause evidence is kept below because the re-audit wrote no per-card report of its own. That is the caveat for this set: every BT4 row was accepted from read-only static review reconciled against green focused batches, so the newest evidence is collection-wide rather than per card. Details are under Open items. No source recorded a catalog commit, only the blob `efbecc002fb9000789123e2f91f201466e1e5b0a`, so `catalog_commit` is `unknown`.

## Gates

### 2026-09-10 re-audit closeout (winning source)

From `docs/audits/BT4-reaudit/RUN.md`. All Vitest commands used one worker with file parallelism disabled after standalone process and memory gates. Cumulative base `e6e19d8b0bbdf9ed59bf56799fc7686be978b6ee` (BT3 completion).

- Inventory: 115 catalog cards, 115 production modules, 115 focused tests, zero `@ts-nocheck`, zero `registerCard(`.
- Focused batches, all green: BT4-001..016 passed 16 of 16 files and 40 of 40 tests; 017..032 passed 16 and 37; 033..048 passed 16 and 35; 049..064 passed 16 and 30; 065..080 passed 16 and 26; 081..096 passed 16 and 51; 097..115 passed 19 and 59.
- Exact BT4 collection: the manifest contained 126 files, every path's parent basename was verified as exactly `BT4`, and the run passed 126 of 126 files and 438 of 438 tests.
- Affected-mechanism manifest: 12 of 12 files and 129 of 129 tests passed, covering exact-name matching, Tamer and base-granted evolution, IR registration, subtriggers, reveal budgeting, continuous effects, Security activation, battle keywords, Option use, security-add watchers, and top-trash events.
- Effects sync: 115 records, zero semantic changes against cumulative BT3, zero out-of-set changes.
- Typecheck: full `pnpm typecheck` passed shared, API, and web.
- Lint, format, and smell: Oxfmt passed after the ledger was formatted, `git diff --check` passed, and BT4 contains zero `@ts-nocheck` and zero `registerCard(`.
- Discarded run, recorded so it is not mistaken for evidence: the first effects-check run, whose internal formatter exceeded 30 seconds; a fresh gated rerun passed with the same zero-change result.

### 2026-09-02 static pass (superseded)

From `docs/audits/BT4-STATIC-AUDIT.md`. All commands used one fork, disabled file parallelism, and explicit timeouts. This pass carried the substantive code changes for BT4.

- All 115 catalog cards were reviewed in ascending order with one local card-KB query each. All 115 modules have `coverage: "full"`, an empty `residual`, exactly one matching `registerIrCard(cardId, compiled)`, no `registerCard`, no `RawUnparsed`, and no TypeScript suppression. The pass removed 106 `@ts-nocheck` directives and retained the nine modules that were already typed.
- Twelve direct IR corrections: BT4-011, BT4-013, and BT4-025 use typed Tamer-onto registration metadata; BT4-054 binds Digi-Burst payment to its restriction; BT4-063 and BT4-071 use exact Commandramon matching; BT4-092, BT4-099, BT4-113, and BT4-114 use exact printed-name exclusions; BT4-098 uses a supported owner-turn duration; BT4-115 declares its permanent hand-resident play-cost modifier duration.
- The shared IR now distinguishes static `TamerOntoDigivolve` registration metadata from executable `Digivolve`, while retaining defensive registration support for legacy snapshots. The shared client and server data reader recognizes both shapes, so board highlighting and displayed costs stay aligned with server legality.
- `effects.json` was regenerated from the direct modules: 115 synchronized BT4 records, 55 semantic changes against `origin/main`, zero semantic or byte changes outside BT4.
- Focused and changed-card tests: 17 files, 192 tests passed. Full BT4 collection: 126 files, 436 tests passed. API mechanism suites: 12 files, 135 tests passed. Shared Tamer-onto data regression: 1 file, 105 tests passed. Web board-model projection: 1 file, 81 tests passed, and web typecheck passed. Tooling tests: 18 tests passed with concurrency 1. Shared build and typecheck passed.
- API typecheck: no audit-scope errors; its only failures are the repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Full-repository lint exited successfully; scoped lint reported no warnings in the audit diff. Scoped format checks passed for all 135 owned source, test, and documentation files. `git diff --check` passed.

## Card ledger

### BT4-001 — Sakuttomon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a red level 2 Digi-Egg with inherited `[When Attacking][Once Per Turn] If this Digimon is level 7, gain 1 memory` (`cards.json:52529-52544`). The direct IR in `apps/api/src/cards/BT4/BT4-001.ts:8-31` is an inherited `WhenAttacking` effect with `GainMemory: 1`, `selfLevelIs: 7`, and `frequency: OncePerTurn`; it is full coverage with no residual.

The registration path derives the once-per-turn bound and the attack trigger, while `selfLevelIs` reads the live host's current top card. This matches the inherited-effect and attack-declaration rules. The focused test now uses a legal red stack `BT4-001` (level 2) → `BT4-008` (level 3) → `BT4-010` (level 4) → `BT4-014` (level 5) → `BT4-018` (level 6) → `BT3-019` (level 7), a legal level-6 negative, and a repeated-attack once-per-turn assertion in `apps/api/src/cards/BT4/BT4-001.test.ts`.

No direct behavior correction was required.

### BT4-002 — Bukamon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a blue level 2 Digi-Egg with inherited `[When Attacking] Trash the bottom digivolution card of 1 of your opponent's level 4 or lower Digimon` (`cards.json:52547-52562`). The direct IR in `apps/api/src/cards/BT4/BT4-002.ts:8-37` uses `TrashDigivolution`, an opponent Digimon target with level `lte 4`, `amount: 1`, and `fromTop: false`.

The dedicated stack-trash primitive resolves the target, reads the bottom prefix, and moves only that source to the owner's trash. The focused test now uses a legal blue host stack and a legal level-4 target containing both an egg and an upper level-3 source; it asserts the bottom egg is trashed while the upper source remains. A legal level-5 target remains unchanged in the negative test (`apps/api/src/cards/BT4/BT4-002.test.ts`).

The generated snapshot is stale here: `packages/shared/src/effects/effects.json:104273-104294` encodes the action as generic `kind: "Trash"` and omits the dedicated bottom-source semantics. It was intentionally not edited; the direct registered module is authoritative.

No direct behavior correction was required.

### BT4-003 — Koromon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a yellow level 2 Digi-Egg with inherited `[When Attacking][Once Per Turn] If you have 3 or fewer security cards, 1 of your opponent's Digimon gets -1000 DP for the turn` (`cards.json:52565-52580`). The direct IR in `apps/api/src/cards/BT4/BT4-003.ts:8-42` uses an opponent Digimon target, `ModifyDP: -1000`, `forTheTurn`, a live owner security `lte 3` condition, and `OncePerTurn`.

The condition reads the attacker's controller's current security count and the frequency is applied at the trigger module. Focused tests now use a legal yellow host, prove the 3-security positive and 4-security negative, and repeat the attack to prove the turn-limited effect does not apply a second time (`apps/api/src/cards/BT4/BT4-003.test.ts`).

No direct behavior correction was required.

### BT4-004 — Budmon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a green level 2 Digi-Egg with inherited `[Your Turn] While this Digimon has ＜Digi-Burst＞, it gets +1000 DP` (`cards.json:52583-52598`). The direct IR in `apps/api/src/cards/BT4/BT4-004.ts:8-40` is a full-coverage inherited `YourTurn` Aura targeting its own permanent, applying `modifyDP: 1000` while `selfHasKeyword: DigiBurst`.

The shared continuous path resolves the live keyword condition, gives keyword readers the required ordering priority, and removes the Aura when the owner's turn ends. The focused tests now use a legal green Digi-Burst host (`BT4-004` → `BT4-051` → `BT4-054`), a legal green non-Digi-Burst host (`BT4-004` → `BT4-051`), and an opponent-turn negative (`apps/api/src/cards/BT4/BT4-004.test.ts`). Q1151/Q1152 in the local KB explicitly confirm that the inherited Aura is not gated on a currently activatable Digi-Burst cost or timing.

No direct behavior correction was required.

### BT4-005 — Missimon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a black level 2 Digi-Egg with inherited `[Your Turn] While this Digimon has [D-Brigade] in its type, it gets +1000 DP` (`cards.json:52601-52616`). The direct IR in `apps/api/src/cards/BT4/BT4-005.ts:8-47` is a full-coverage inherited `YourTurn` Aura with a `selfHasTrait` filter matching the exact `D-Brigade` trait.

The shared trait matcher evaluates the current top card's forms, attributes, and types, so the positive Commandramon and negative Sunarizamon cases are meaningful legal black stacks. The focused test also proves that the trait grant disappears on the opponent's turn (`apps/api/src/cards/BT4/BT4-005.test.ts`).

No direct behavior correction was required.

### BT4-006 — Xiaomon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a purple level 2 Digi-Egg with inherited `[Your Turn] While there are 10 or more cards in your trash, this Digimon gains ＜Retaliation＞` (`cards.json:52619-52634`). The direct IR in `apps/api/src/cards/BT4/BT4-006.ts:8-46` is a full-coverage inherited `YourTurn` Aura that grants the `Retaliation` keyword while the owner's trash count is `gte 10`.

The condition reads the owner's live trash zone, and the combat controller checks the granted keyword on the Digimon that died alone in battle. This agrees with Q1153/Q1154 and the comprehensive Retaliation rules. Focused tests now use a legal purple stack `BT4-006` → `BT3-076` → `BT3-081`, prove the 10-card battle deletion and 9-card threshold, and prove that the grant is absent during the opponent's turn (`apps/api/src/cards/BT4/BT4-006.test.ts`). The shared Retaliation peer test remains the evidence for holder-death, survivor, tie, and chaining boundaries.

No direct behavior correction was required.

### BT4-007 — Otamamon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a red level 3 Digimon with play cost 2, 5000 DP, and a red level 2 evolution requirement costing 2 memory; it has no effect text (`cards.json:52637-52658`). The direct module in `apps/api/src/cards/BT4/BT4-007.ts:1-6` is an empty full-coverage compiled record registered through `registerIrCard`.

The focused test now imports the direct module, retains the vanilla DP assertion, and adds a legal red Digi-Egg evolution with memory payment, the standard evolution draw, stack identity, and no effect activation (`apps/api/src/cards/BT4/BT4-007.test.ts`).

No direct behavior correction was required.

### BT4-008 — Agumon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a red level 3 Digimon with play cost 3, 2000 DP, a zero-cost red level 2 evolution requirement, and inherited `[Your Turn] When this card is trashed due to activating this Digimon's ＜Digi-Burst＞, return this card to its owner's hand` (`cards.json:52661-52683`). The direct IR in `apps/api/src/cards/BT4/BT4-008.ts:8-36` installs an inherited `YourTurn` `SubTrigger` for `onDigiBurstCardDiscarded`, filters to the source instance itself, and returns that source from trash to hand.

The shared Digi-Burst primitive publishes the complete trashed-source ID set, and the subtrigger self-source gate prevents unrelated stack cards or ordinary deletion from firing. Q1155 supplies the timing clarification. The focused test now verifies both source return and the host's Digi-Burst body deletion, and its negative uses a legal red stack to prove ordinary battle deletion does not return the source (`apps/api/src/cards/BT4/BT4-008.test.ts`).

The generated snapshot is stale here: `packages/shared/src/effects/effects.json:104389-104407` uses `kind: "AddToHandSelf"` instead of the direct event-bound return from the trash zone. It was intentionally not edited; the direct registered module is authoritative.

No direct behavior correction was required.

### BT4-009 — Flamemon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a red level 3 Hybrid Digimon with play cost 3, 2000 DP, and `[On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with [Hybrid] in its form and 1 red Tamer card among them to your hand. Place the remaining cards at the bottom of your deck in any order` (`cards.json:52686-52708`). The direct IR in `apps/api/src/cards/BT4/BT4-009.ts:8-50` uses `RevealAdd` with two independent one-card slots: a Digimon whose trait is Hybrid and a red Tamer, with `rest: deckBottom`.

The reveal primitive keeps selected slots separate, does not reuse a card selected by the first slot, and sends the remainder to an owner-ordered bottom-deck return. Q1156 confirms the two required categories. Focused tests now assert the exact remaining deck card, reject a non-red Tamer and non-Hybrid Digimon, and verify that evolution into Flamemon does not incorrectly fire the On Play effect (`apps/api/src/cards/BT4/BT4-009.test.ts`).

No direct behavior correction was required.

### BT4-010 — Fugamon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-001-010.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog evidence identifies a red level 4 Digimon with play cost 3, 3000 DP, a red level 3 evolution requirement costing 1 memory, and no effect text (`cards.json:52711-52732`). The direct module in `apps/api/src/cards/BT4/BT4-010.ts:1-10` is an empty full-coverage compiled record registered through `registerIrCard`.

The focused test now imports the direct module, retains the vanilla DP assertion, and adds a legal evolution from red BT4-008 with memory payment, draw, stack identity, and no effect activation (`apps/api/src/cards/BT4/BT4-010.test.ts`).

No direct behavior correction was required.

### BT4-011 — Agunimon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52735-52757` confirms red level 4, 5000 DP, play 5, red level 3 evolution for 2, Hybrid / Variable / Wizard, and the red-Tamer alternate evolution from hand. The direct IR at `apps/api/src/cards/BT4/BT4-011.ts:8-37` declares a Static Digivolve action from hand onto one of the player's red Tamers as level 3, with full coverage, empty residual, and only `registerIrCard` at `:40`. The alternate cost field is intentionally not trusted for legality: the registration side seam derives the printed red level-3 cost of 2 from the direct `asLevel`.

`BT4-011.test.ts:6-30` statically proves the positive Tamer route, memory 3→1, stack placement, and evolution draw; `:32-49` rejects a non-red Tamer. KB Q1157–Q1163 and Q4633 support the Tamer-as-Digimon route and mandatory legal declaration behavior. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-012 — GeoGreymon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52760-52782` confirms a red level-4 Digimon with Digi-Burst 2 and delete-one-opposing-Digimon at 4000 DP or less. The corrected direct IR at `apps/api/src/cards/BT4/BT4-012.ts:11-50` has one Main `Delete` action targeting an opposing Digimon with `dp lte 4000`, count 1, and a self digivolution-card trash cost of 2; the Digi-Burst keyword metadata remains present at `:39-44`. This mapping prevents a generic field-trash action from deleting GeoGreymon itself and lets target preflight prevent payment when no opposing target is legal.

`BT4-012.test.ts:8-35` checks the 4000 boundary, source trash, host retention, and successful deletion. `:37-63` checks the 5000 negative, no source payment, and unchanged three-card stack. The generated snapshot at `effects.json:104459-104485` still has the old standalone Digimon `Trash` followed by an uncosted `Delete`; it is documented as stale and was not edited. No additional shared seam was required.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-013 — BurningGreymon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52785-52807` confirms red level 4, 6000 DP, play 6, red level 3 evolution for 3, the red-Tamer alternate evolution, and +3000 DP during its controller's turn. Direct IR `BT4-013.ts:8-55` maps the Tamer route and a YourTurn self ModifyDP +3000 action with full coverage; registration remains exclusive at `:57`. The Tamer-onto side registry derives the real 3-memory alternate cost and shared-color gate.

`BT4-013.test.ts:6-29` covers the positive Tamer evolution, memory 4→1, draw, and 9000 DP; `:31-48` rejects a non-red Tamer; `:50-57` now checks that the DP bonus is absent on the opponent's turn. KB Q1164–Q1169 and Q4634 support the Tamer source and timing semantics. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-014 — Vermilimon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52810-52831` confirms red level 5, 8000 DP, play 5, red level 4 evolution for 3, and no effects. The direct module `BT4-014.ts:3-5` is an empty full-coverage record registered only through `registerIrCard`; the generated snapshot at `effects.json:104516` agrees. `BT4-014.test.ts:6-10` checks the no-effect DP identity, and `:12-33` now imports the direct module and statically checks a legal red level-4-to-level-5 evolution, memory 4→1, and top-card placement. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-015 — Volcdramon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52834-52856` confirms red level 5, 7000 DP, play 7, red level 4 evolution for 3, and inherited Security Attack +1. Direct IR `BT4-015.ts:8-25` marks the static keyword as inherited, with full coverage and exclusive registration at `:27`; the generated snapshot at `effects.json:104517-104527` agrees. `BT4-015.test.ts:7-12` uses Volcdramon as a source under legal red level-6 BT4-018 and observes one Security Attack grant on the host. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-016 — Aldamon

Score: 10/10. Focused baseline and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52859-52881` confirms red level 5, 7000 DP, play 8, red level 4 evolution for 3, Security Attack +1, and the Your Turn +4000 condition for a Hybrid Digimon or red Tamer source. Direct IR `BT4-016.ts:8-64` declares the keyword and a self Aura at `:21-59` with an OR filter for a Hybrid Digimon trait or red Tamer, then modifies DP by 4000. The `selfDigivolutionStackHasTrait` condition is re-evaluated against real stack cards, and the direct registration is exclusive at `:66`.

`BT4-016.test.ts:7-13` checks a Hybrid source, `:15-20` checks only a red Tamer source, `:22-28` rejects a non-qualifying source, and `:30-37` checks that both source types still grant +4000 only once. KB Q1171–Q1172 explicitly confirm the once-only OR behavior. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-017 — RizeGreymon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52884-52912` confirms red level 5, red/yellow level 4 evolution for 3, the Your Turn yellow identity, optional Digi-Burst 2 free play of a red/yellow Tamer at play cost 4 or less, and inherited When Attacking -2000 DP with a Tamer condition. Direct IR `BT4-017.ts:8-98` maps these as a YourTurn self `GrantStatic` yellow action, an optional Main `PlayWithoutCost` from hand with `payCost: false` and a self-stack Digi-Burst cost, and an inherited WhenAttacking opponent-Digimon ModifyDP -2000 action for the turn. The direct registration is exclusive at `:98`.

`BT4-017.test.ts:14-36` statically checks yellow evolution during the controller's turn. `:38-63` checks the red-Tamer free play, source payment, and corrected host retention: Digi-Burst trashes two sources, leaving the RizeGreymon top card in a one-card stack rather than deleting it. `:65-83` checks inherited -2000 DP with a Tamer, and `:85-101` checks the no-Tamer negative. KB Q1173–Q1175 confirm that the yellow treatment is restricted to the controller's turn and that the Tamer choice is red or yellow. No direct module gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-018 — Spinomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52915-52937` confirms red level 6, 10000 DP, play 10, red level 5 evolution for 2, and +3000 DP during its controller's turn. Direct IR `BT4-018.ts:8-30` uses a self ModifyDP +3000 YourTurn action with full coverage and exclusive registration at `:32`. `BT4-018.test.ts:5-10` checks 13000 DP on its turn; `:12-19` sets the opponent's turn and checks the base DP. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-019 — VictoryGreymon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52940-52962` confirms red level 6, 12000 DP, play 11, red level 5 evolution for 4, and When Digivolving Digi-Burst 2 to delete one opposing Digimon at 8000 DP or less. The corrected direct IR at `BT4-019.ts:11-50` has one WhenDigivolving `Delete` action with opponent-Digimon `dp lte 8000`, count 1, and the self digivolution-card trash cost of 2; the Digi-Burst metadata remains at `:39-44`. This prevents the prior generated standalone Digimon-trash action from deleting the evolving host and ensures a no-target resolution does not pay the cost.

`BT4-019.test.ts:5-28` checks successful evolution, source payment, host retention, and delete resolution. `:30-56` checks the 9000-DP negative, no source payment, and the complete three-card post-evolution stack. The generated snapshot at `effects.json:104633-104659` remains stale with the old standalone `Trash` action and was not edited. No shared engine change was required.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-020 — ShineGreymon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-011-020.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog `cards.json:52965-52992` confirms red level 6, 11000 DP, play 12, red/yellow level 5 evolution for 3, and the Your Turn suspension-triggered Security Attack +1 for the turn. Direct IR `BT4-020.ts:8-45` maps a YourTurn `SubTrigger` on `whenSuspended`, restricts the source to one of the player's red or yellow Tamers, and grants self Security Attack +1 for the turn; registration is exclusive at `:47`.

`BT4-020.test.ts:7-25` checks separate red and yellow suspension events produce two grants; `:27-37` checks that suspending a blue Tamer produces none. The real suspension primitive fires the subtrigger after a state transition, while the continuous keyword ledger preserves each event's separate grant. KB Q1176–Q1177 confirm the separate-event behavior. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2 — **8/10 provisional**.

### BT4-021 — Gaomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:52995-53017` identifies the inherited clause: during Your Turn, when this source is trashed by this Digimon's Digi-Burst, return this card to its owner's hand. Q1178 requires return after Digi-Burst activation; comprehensive §15-3.3 preserves the source's “this card” identity.

IR and trace: `apps/api/src/cards/BT4/BT4-021.ts:8-34` is full coverage with no residual. It uses an inherited Your Turn `SubTrigger` for `onDigiBurstCardDiscarded`, an `isSelfRef` source gate, and a self target constrained to the trash before returning one card to hand. Registration is exclusively `registerIrCard` at `:36`.

Behavioral proof: `BT4-021.test.ts:9-34` builds BT4-021 under a Digi-Burst host and asserts the exact source instance reaches hand; `:36-55` proves a source trashed by battle/deletion stays in trash. The stack host is BT4-026 and therefore also exercises the Digi-Burst source batch.

Peer/stack proof: BT5-050 uses the same event and self-source identity pattern. The primitive event gate and §15-3.3 explain why the source can be found in trash after the batch but before the inherited effect resolves. The generated snapshot at `effects.json:104685-104703` uses `AddToHandSelf` instead of the direct trash-scoped Return; direct registration is authoritative.

### BT4-022 — Sangomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53020-53041` records a blue level-3 vanilla Rookie/Data/Mollusk with no effect text, play cost 3, 4,000 DP, and a blue level-2 evolution for 0. No card-specific KB, errata, or banlist entry applies.

IR and trace: `apps/api/src/cards/BT4/BT4-022.ts:4-5` is the complete empty record (`effects: []`, `coverage: "full"`, `residual: []`) and has only `registerIrCard`.

Behavioral and peer/stack proof: `BT4-022.test.ts:4-9` checks the neutral current/base DP relationship. There is no effect clause, target, timing, inherited behavior, or stack-dependent rule to exercise; the catalog's ordinary blue level-2 evolution row is the applicable stack boundary. The snapshot at `effects.json:104704` agrees.

### BT4-023 — Strabimon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53044-53066` records On Play reveal 3, add one Digimon with Hybrid in its form and one blue Tamer, then place all remaining revealed cards at deck bottom. Q1179 identifies the two categories; Q1180 confirms the effect may add whichever category is present when only one category appears.

IR and trace: `apps/api/src/cards/BT4/BT4-023.ts:8-48` is full/no residual and registers at `:50`. The On Play action uses `RevealAdd` with `revealCount: 3`, separate one-card slots, `controllerDefault: "mine"`, an exact Hybrid trait match within Digimon kind, an exact blue Tamer kind/color match, and `rest: "deckBottom"`.

Behavioral proof: `BT4-023.test.ts:7-25` uses a mixed reveal of a Hybrid, blue Tamer, and non-matching card and asserts both additions plus one remaining deck card. `:27-45` proves the partial Hybrid-only path and leaves the other two cards in deck. The shared RevealAdd implementation keeps each slot independent and orders/bottoms the remainder.

Peer/stack proof: BT5-046 is the same cost-bearing/reveal-and-bottom mechanism; `definitionMatches` receives the complete card definition so the Hybrid filter is a form/trait boundary rather than a name-only approximation. This card has no inherited or evolution-stack effect. The snapshot at `effects.json:104705-104735` matches the direct shape.

### BT4-024 — Tobiumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53069-53090` records a blue level-4 vanilla Champion/Vaccine/Aquatic with play cost 3, 3,000 DP, and blue level-3 evolution for 1. No card-specific KB, errata, or banlist entry applies.

IR and trace: `apps/api/src/cards/BT4/BT4-024.ts:4-5` is the complete empty record with exclusive `registerIrCard` registration.

Behavioral and peer/stack proof: `BT4-024.test.ts:4-9` checks neutral DP state. With no printed effect, there is no trigger, target, source, duration, or stack interaction beyond the catalog's ordinary blue level-3 evolution requirement. The snapshot at `effects.json:104737` agrees.

### BT4-025 — Lobomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53093-53115` records the optional hand tamer-onto digivolution onto one blue Tamer as if that Tamer were level 3, with printed blue level-3 evo cost 2. Q1181-Q1186 and Q4635 cover Tamer-as-Digimon treatment, the normal draw, same-turn attack restriction, source placement, inherited-vs-Security text, and no cancellation after declaration.

IR and trace: `apps/api/src/cards/BT4/BT4-025.ts:8-38` is full/no residual. Its Static metadata action targets one own blue Tamer, uses `asLevel: 3`, and reads from hand (`:11-25`); registration is only `registerIrCard` at `:40`. The direct `digivolutionRequirement` field at `:31-37` is a stale-looking gateless cost-0 shadow, but the registered Static action is consumed by the tamer-onto side registry. `cardData.ts:538-556` ignores that stale entry and derives the legal blue-Tamer path at the card's blue level-3 cost of 2.

Behavioral proof: `BT4-025.test.ts:6-24` proves legal blue-Tamer evolution, memory 2 payment, stacking, and the normal bonus draw. `:26-40` rejects a non-blue Tamer. The normal digivolve implementation preserves the source permanent, carries orientation, draws, and resolves the digivolution window (`actions/digivolve.ts:650-815`).

Peer/stack proof: BT7-035 and BT7-071 establish the same Static `Digivolve`/`asLevel` metadata pattern. Rules §8-1-3 and Q1181/Q1182 support the ordinary evolution stack and draw; §7-1-2.1/Q1183 support the entry-turn attack boundary. Snapshot `effects.json:104738-104754` matches the Static action but retains the stale gateless `{cost: 0}` metadata; it was not edited.

### BT4-026 — GaoGamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53118-53140` records Main Digi-Burst 2, trashing two of this Digimon's sources to activate Draw 1. Comprehensive §16-14.1 defines the keyword as source trash for another effect, while §16-14.2 makes Digi-Burst processing optional at activation.

Correction and IR trace: the original direct record put the Digi-Burst cost on a separate `Trash` action targeting two own Digimon, followed by a free Draw. That is not the printed effect: after the cost is paid, the generic field Trash action resolves permanent targets and can trash the top source from another own Digimon (`removal.ts:531-571`). `apps/api/src/cards/BT4/BT4-026.ts:8-41` now carries the Digi-Burst source cost directly on the single Draw action (`:14-28`), leaving no unrelated target action; coverage is full, residual is empty, and registration remains exclusive at `:43`.

Behavioral proof: `BT4-026.test.ts:8-39` activates Digi-Burst with two host sources, asserts both host sources are gone and one card is drawn, and now includes an allied stacked Digimon whose source must remain. That final assertion is intended to fail under the former erroneous field Trash action for the exact reason identified above.

Peer/stack proof: BT5-046 demonstrates the same cost-bearing action shape, and `costs.ts:779-806` routes a self-referenced Digi-Burst cost through `trashDigivolutionCards` with `isDigiBurst`, preserving source-trigger events. The generated snapshot at `effects.json:104756-104777` still contains the extra own-Digimon Trash action and was not edited; the direct module is authoritative.

### BT4-027 — KendoGarurumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53143-53165` records the blue-Tamer hand evolution as level 3 for cost 3, then When Attacking returns one opponent level-3 Digimon and trashes all of that Digimon's sources. Q1188-Q1193 and Q4636 repeat the tamer-onto rulings; the level-3 target boundary is explicit in the catalog.

IR and trace: the audit Q1399 revalidation corrected the hand-fixed direct module. Its When Attacking action is now one canonical `Return` targeting exactly one opposing level-3 Digimon. The shared return primitive moves attached sources to trash as rule teardown without publishing `whenDigivolutionTrashed`. The alternate requirement remains cost 3, `baseIsTamer: true`, and `baseColors: ["Blue"]`, and the module remains full/no-residual with one `registerIrCard` path.

Behavioral proof: `BT4-027.test.ts:6-26` proves blue-Tamer evolution for 3 memory and the bonus draw; the added negative path at `:28-42` rejects a non-blue Tamer. The attack proof at `:44-78` returns a level-3 Digimon and trashes both of its sources; `:80-102` leaves an opposing level-4 Digimon and its source intact.

Peer/stack proof: `cardData.ts:520-560` matches the direct base-Tamer/color requirement. BT6-002 Q1399 is controlling same-wording evidence: the source-trash sentence explains the returned stack's rule teardown and does not count as trash by effect. The legal stack test still verifies every attachment reaches trash, while the updated aggregate shape prevents a separate source-trash event. Snapshot `effects.json:104778-104809` remains stale with a cost-0 tamer-onto shadow and a trailing own-Digimon Trash. The direct module is authoritative.

### BT4-028 — Piranimon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53168-53190` records the inherited When Attacking clause to trash the top digivolution card of one opponent's Digimon. Comprehensive §4-8 defines the source-card boundary and the dedicated stack-trash primitive handles the top source only.

IR and trace: `apps/api/src/cards/BT4/BT4-028.ts:8-32` is full/no residual and registers only at `:34`. The inherited action targets exactly one opponent Digimon with at least one source, uses `amount: 1`, and marks `fromTop: true` (`:11-27`).

Behavioral proof: `BT4-028.test.ts:6-38` places BT4-028 under a legal host, gives the opposing target bottom and top sources, and asserts only the top source is trashed. This proves the inherited effect and source order rather than only an isolated target.

Peer/stack proof: BT18-028 provides the same dedicated `TrashDigivolution` stack operation. The snapshot at `effects.json:104810-104830` matches the direct record, and no trait, color, or alternate-evolution ambiguity applies.

### BT4-029 — Gusokumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53193-53214` records a blue level-5 vanilla Ultimate/Vaccine/Crustacean with play cost 7, 10,000 DP, and blue level-4 evolution for 3. No card-specific KB, errata, or banlist entry applies.

IR and trace: `apps/api/src/cards/BT4/BT4-029.ts:4-5` is the complete empty record with exclusive `registerIrCard` registration.

Behavioral and peer/stack proof: `BT4-029.test.ts:4-9` checks neutral DP state. No printed effect creates a trigger, target, duration, inherited clause, or stack-dependent behavior; the catalog's normal blue level-4 evolution is the only applicable stack boundary. Snapshot `effects.json:104831` agrees.

### BT4-030 — Beowolfmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-021-030.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53217-53239` records persistent Jamming and an Opponent's Turn restriction while this stack contains either a Hybrid Digimon card or a blue Tamer card. Q1195 defines the restriction as preventing opponent Digimon from targeting this card; Q1196 leaves blocking functional; Q1197 confirms the two source categories. Comprehensive §16-9 defines Jamming as battle-vs-Security deletion prevention.

IR and trace: `apps/api/src/cards/BT4/BT4-030.ts:6-44` is full/no residual and registers only at `:46`. The first Static effect carries Jamming (`:7-8`). The second Static effect applies `cantBeAttacked` to self permanently, but only when `isOpponentsTurn` and either a stack source matching Digimon/Hybrid or a stack source matching Tamer/Blue exists (`:9-40`). `conditions.ts:653-695` counts source definitions with those exact filters; `combat/legality.ts:249-306` rejects only a permanent target, so a player attack and a later Blocker redirection remain legal as Q1195-Q1196 require.

Behavioral proof: `BT4-030.test.ts:7-22` proves a Hybrid source prevents an opponent Digimon attack; `:24-32` proves a non-matching source does not create the restriction; `:34-42` proves a blue Tamer source qualifies. These cases exercise the live stack category boundary and opponent-turn gate.

Peer/stack proof: P-086 supplies the same `cantBeAttacked` restriction primitive, and BT3-030 supplies a live source-stack keyword condition. The direct module replaces the snapshot's unsupported raw OpponentsTurn action (`effects.json:104832-104850`) with structured conditions and full coverage; the snapshot remains unedited.

### BT4-031 — MarinChimairamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-031.ts:9-44` correctly models an optional On Play `Return` of one opposing source-free Digimon, with the cost returning one other own Digimon (`:15-38`). `Return` is the correct shared primitive: its stack-aware implementation automatically trashes returned attachments, so the direct hand-fix is stronger than the stale generated trailing broad `Trash` action. The erratum is name-only and does not change behavior; Q1198/Q1199 confirm the unusual Mother D-Reaper/token condition.

Focused tests at `BT4-031.test.ts:7-28` cover successful own-cost return, opponent source-free target, and attachment trashing; `:30-50` rejects an opponent target with sources; `:52-81` now verifies that declining the optional effect preserves both the cost Digimon and opponent target. No direct module gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-032 — MachGaogamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The corrected direct IR maps Main Digi-Burst 2 to one cost-bearing `Return` of an opposing level-4-or-lower Digimon. Canonical Return performs Q1399 rule teardown without a source-trash-by-effect event. The inherited Your Turn Aura grants +2000 DP while any own battle-area Tamer exists; this matches Q1200's any-color ruling. The generated snapshot is stale and malformed at `effects.json:104878-104930`.

The existing success/stack proof verifies the target top card reaches hand and its sources reach trash; inherited positive/no-Tamer and no-target boundaries remain. The added structural guard requires exactly one cost-bearing Return and no `TrashDigivolution`. This is one direct module correction.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-033 — ZeedGarurumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The corrected direct IR uses one opposing level-5-or-lower Return with the Digi-Burst 2 cost attached. Canonical Return performs the Q1399 attachment teardown without emitting a source-trash-by-effect event, and normal Return preflight prevents payment when no legal target exists. The generated snapshot at `effects.json:104931-104967` is stale and malformed; it was not edited.

`BT4-033.test.ts` covers successful evolution and rule teardown after the bounce, rejects a level-6 target, and checks that the evolved host retains both cards when no legal target exists. The added structural guard requires exactly one cost-bearing Return. This is one direct module correction.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-034 — Regalecusmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-034.ts:5-23` targets one opposing Digimon with sources, trashes one from the bottom (`:11-15`), and gates Draw 1 plus +1 memory on `ifThisEffectActed` (`:16-17`). This exactly implements Q1201: if no source is trashed, neither follow-up occurs.

`BT4-034.test.ts:6-57` statically checks bottom-source choice, source identity, draw, and memory; `:59-78` covers the no-source negative. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-035 — MirageGaogamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-035.ts:8-47` scales GainMemory by one per four opponent-hand cards during When Digivolving (`:11-25`) and grants self `unblockable` during Your Turn (`:27-43`). The shared grant maps this to the `cantBeBlocked` restriction, while the combat rules still allow attacks against suspended Digimon, matching Q1203/Q1204. Q1202's three-card boundary is represented by the negative test.

`BT4-035.test.ts:7-22` checks eight cards produce two memory; `:24-41` checks three cards produce none; `:43-47` checks the restriction. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-036 — Falcomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct module is an empty full-coverage record at `BT4-036.ts:2-5`, matching the catalog vanilla card and generated snapshot (`effects.json:105017`). The focused test now imports the direct module and checks the no-effect DP identity (`BT4-036.test.ts:1-10`). Its legal yellow evolution use as the base for BT4-040 is statically exercised by `BT4-040.test.ts:12-33`.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-037 — Kudamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-037.ts:8-41` maps optional On Play security-top trash to one opposing Digimon's -2000 DP for the turn (`:11-35`). The raw cost wording is recognized by the shared security-cost path, and the duration matches the 2021 erratum. Q1205 is honored because the cost cannot be paid when security is empty.

`BT4-037.test.ts:7-23` checks the top security card moves to trash, security count decreases, and the target reaches 4000 DP; `:25-40` covers no-security preservation. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-038 — BushiAgumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-038.ts:8-23` carries only the Rush keyword (`:11-18`) with full coverage and exclusive registration, matching the catalog and snapshot (`effects.json:105041-105044`). `BT4-038.test.ts:6-16` statically exercises same-turn attack eligibility after play. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-039 — Growlmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-039.ts:8-41` models the inherited Your Turn Aura, self-targeted +1000 DP, and own security count `<= 3` condition (`:11-37`). The zone count is evaluated by the continuous engine and does not apply during the opponent's turn, matching the catalog wording.

`BT4-039.test.ts:6-15` checks three security cards grant +1000; `:17-27` checks four cards do not; `:29-40` now checks the opponent-turn negative at three cards. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-040 — Diatrymon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-031-040.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct module is an empty full-coverage record at `BT4-040.ts:2-5`, matching the vanilla catalog card and generated snapshot (`effects.json:105071`). `BT4-040.test.ts:6-10` checks its no-effect DP identity, and `:12-33` now imports the direct module and statically checks a legal yellow level-3-to-level-4 evolution from assigned BT4-036.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-041 — Meicoomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53491-53514` records the errata-corrected Unknown attribute/type and the On Play three-or-fewer-security gate for one opposing Digimon at -4,000 DP for the turn. The errata source is `data/kb/errata.json:1107-1118`; no further card-specific KB entry applies.

IR and trace: `apps/api/src/cards/BT4/BT4-041.ts:8-40` is full coverage with no residual. Its On Play action targets exactly one opposing Digimon, applies -4,000 for the turn, and gates on the owner's live security count at three or fewer. Registration is exclusively `registerIrCard` at `:40`.

Behavioral proof: `BT4-041.test.ts:6-22` covers the active three-security path and `:24-43` covers the inactive four-security boundary. The range aggregate test also checks the exact target, amount, duration, and condition (`BT4-041-050.audit.test.ts:41-56`).

Peer/stack proof: the same security-gated target shape is exercised by BT4-044, while `conditions.ts:283-304` confirms the condition reads the current security stack and the effect runner carries the turn duration. The generated snapshot (`packages/shared/src/effects/effects.json:105072-105095`) agrees with the direct record. The catalog erratum is represented directly; no alternate stack behavior is present.

### BT4-042 — Piddomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53516-53538` records persistent Blocker and When Attacking lose 2 memory. Comprehensive Blocker is a persistent keyword (`data/kb/rules/comprehensive.md:2821-2829`); no card-specific KB entry applies.

IR and trace: `apps/api/src/cards/BT4/BT4-042.ts:8-34` separates a Static Blocker keyword from a When Attacking `GainMemory -2` action, with full coverage and no residual. Registration is only `registerIrCard` at `:34`.

Behavioral proof: `BT4-042.test.ts:7-22` observes Blocker and then attacks to assert memory falls by 2. `BT4-041-050.audit.test.ts:58-65` checks that the keyword and attack action remain separate from the neighboring vanilla card.

Peer/stack proof: the shared keyword path treats Blocker as persistent, and the attack timing anchor is `data/kb/rules/comprehensive.md:2717-2720`. The generated snapshot (`effects.json:105097-105103`) agrees. No inherited or stack-dependent clause is present.

### BT4-043 — Crowmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53541-53562` is a yellow level-5 vanilla card with no effect text and no card-specific KB entry.

IR and trace: `apps/api/src/cards/BT4/BT4-043.ts:4-5` is the complete empty record (`effects: []`, `coverage: "full"`, `residual: []`) with only `registerIrCard`.

Behavioral and peer/stack proof: `BT4-043.test.ts:4-9` checks neutral DP state, and the aggregate test keeps `effects` empty (`BT4-041-050.audit.test.ts:58-65`). There is no trigger, target, duration, inherited clause, or stack behavior beyond the catalog's ordinary yellow level-4 evolution. The generated snapshot at `effects.json:105105` agrees.

### BT4-044 — HippoGryphonmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53565-53587` records When Attacking, at three or fewer security, one opposing Digimon gets -3,000 DP for the turn. No card-specific KB entry applies.

IR and trace: `apps/api/src/cards/BT4/BT4-044.ts:8-40` is full/no residual. It targets one opposing Digimon, applies -3,000 for the turn, and uses the live owner security count at `lte 3`; registration is only at `:40`.

Behavioral proof: `BT4-044.test.ts:5-23` covers the active three-security attack and `:25-44` covers the four-security negative boundary. The aggregate test checks the same action shape (`BT4-041-050.audit.test.ts:41-56`).

Peer/stack proof: BT4-041 provides the same security-gated opposing DP mechanism, and the When Attacking timing plus `ModifyDP` duration flow through the shared effect runner. The generated snapshot (`effects.json:105106-105129`) agrees with the direct record; there is no inherited or alternate-stack behavior.

### BT4-045 — Maycrackmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53590-53612` records an Opponent's Turn aura giving all owner's Security Digimon +4,000 DP while the owner has three or fewer security cards. No card-specific KB entry applies; Security Digimon are defined by the rules at `data/kb/rules/comprehensive.md:679-682`.

IR and trace: `apps/api/src/cards/BT4/BT4-045.ts:8-43` is full/no residual. The OpponentsTurn `Aura` targets self, modifies the owner's Security Digimon DP by +4,000, and carries the three-or-fewer security `while` condition. Registration is only at `:43`.

Behavioral proof: `BT4-045.test.ts:8-15` observes the aura on the opponent's turn at three security; `:17-29` covers own-turn and four-security negatives; `:31-73` proves the Meicoomon-to-Maycrackmon evolution stack retains the aura. The aggregate test checks target, security-DP effect, and condition (`BT4-041-050.audit.test.ts:67-74`).

Peer/stack proof: `turnOwnerGuard` derives OpponentsTurn ownership (`effect.ts:460-483`), and the live zone-count condition is reevaluated as security changes. The generated snapshot (`effects.json:105131-105153`) agrees. The evolution-line test supplies the relevant stack proof without introducing an inherited clause.

### BT4-046 — WarGrowlmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53615-53638` records Main Digi-Burst 2, with two of this Digimon's digivolution cards trashed to activate one opposing-Digimon -4,000 DP-for-the-turn effect, plus inherited Your Turn +1,000 DP at three or fewer security. Comprehensive Digi-Burst requires another effect to activate by trashing sources from the Digimon with that effect (`data/kb/rules/comprehensive.md:2952-2959`). No card-specific KB entry applies.

Correction and IR trace: the original direct record placed the Digi-Burst cost on a separate generic field `Trash` action targeting two own Digimon, followed by a free `ModifyDP`. That could consume a source from an unrelated allied stack because generic field `Trash` resolves permanent targets (`removal.ts:531-571`). `apps/api/src/cards/BT4/BT4-046.ts:8-78` now carries the Digi-Burst source cost directly on the single opposing-Digimon `ModifyDP` action (`:14-36`), leaves no unrelated target action, and preserves the inherited aura (`:39-73`). Coverage is full, residual is empty, and registration remains exclusive at `:78`.

Behavioral proof: `BT4-046.test.ts:8-38` activates Digi-Burst with two WarGrowlmon sources and an allied stacked Digimon, asserting only the host stack is emptied, the opposing target loses 4,000 DP, and the allied source remains. `:40-61` covers the inherited +1,000 DP at three security and its four-security negative. The aggregate structural check is `BT4-041-050.audit.test.ts:76-95`.

Peer/stack proof: `runAction.ts:451-511` identifies and pays a self-referenced digivolution-card cost before resolving the same action, while `conditions.ts:283-304` supports the inherited security gate. BT5-050 supplies the same Digi-Burst source-watcher family. The generated snapshot (`effects.json:105155-105199`) still contains the stale own-Digimon `Trash` before `ModifyDP`; it was not edited, and the direct module is authoritative.

### BT4-047 — Rasielmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53641-53663` records Recovery +2 from the deck on digivolving and top-security trash at the end of the opponent's turn. Q1206-Q1208 (`data/kb/qa.json:25294-25315`) clarify that empty security does not lose the game, trashed cards do not activate Security effects, and each Rasielmon copy trashes one card. Recovery places cards on top of security (`data/kb/rules/comprehensive.md:2830-2835`), while End of Opponent's Turn is a trigger at the opponent's turn end (`:2757-2763`).

IR and trace: `apps/api/src/cards/BT4/BT4-047.ts:6-21` contains distinct When Digivolving `SecurityManipulation addTop` from deck amount 2 and EndOfOpponentsTurn `SecurityManipulation trashTop` from the owner's security amount 1. Coverage is full with no residual and registration is only at `:21`.

Behavioral proof: `BT4-047.test.ts:6-26` proves recovery of two deck cards on digivolution; `:28-45` proves top-security trash at the opponent's turn end; and the added `:47-74` case proves two copies trash two cards while leaving one security card. The aggregate test checks the two exact action records (`BT4-041-050.audit.test.ts:97-104`).

Peer/stack proof: the security primitive moves cards from security to trash without a security check (`primitives.ts:2606-2662`), so Q1206 and Q1207 follow from the direct operation. The digivolution test exercises the legal level-5-to-level-6 stack. The generated snapshot (`effects.json:105201-105212`) uses legacy `trashSecurityTop` rather than the direct `SecurityManipulation` record; the direct registered module is authoritative.

### BT4-048 — WarGreymon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53666-53688` records When Attacking Once Per Turn: optionally add the top security card to hand, unsuspend this Digimon, and give one opposing Digimon -6,000 DP for the turn. Q1209-Q1211 (`data/kb/qa.json:25317-25338`) require optional activation, prohibit activation with empty security, and prohibit a second activation in the same turn.

IR and trace: `apps/api/src/cards/BT4/BT4-048.ts:5-47` is full/no residual. Its When Attacking action sequence is `SecurityManipulation toHand` with `optional: true` and `abortOnDecline: true`, self `Unsuspend`, and one opposing-Digimon `ModifyDP -6000 forTheTurn`, with `frequency: "OncePerTurn"`; registration is only at `:47`.

Correction and behavioral proof: the shared optional preflight previously returned false when the `toHand` security stack was empty, which skipped only that action and allowed the following unsuspend and DP reduction to resolve. The minimal seam correction at `runAction.ts:303-309` returns the action's abort flag, so BT4-048's compound effect stops as Q1210 requires; `effect.ts:597-618` supplies the stop semantics. The existing focused case `BT4-048.test.ts:7-41` covers accepted activation and Once Per Turn, and the added `:43-63` case statically asserts that empty security leaves the attacker suspended and target DP unchanged. The aggregate test checks the ordered action/frequency shape (`BT4-041-050.audit.test.ts:106-131`).

Peer/stack proof: the shared security operation handles the top-card-to-hand movement (`security.ts:209-235`), the action runner applies ordered compound actions and frequency, and the attack timing is defined at `data/kb/rules/comprehensive.md:2717-2720`. The generated snapshot (`effects.json:105214-105231`) is stale/incomplete: it has only an optional DP reduction and omits the security payment and unsuspend. It was not edited; the direct module and corrected shared seam are authoritative.

### BT4-049 — Varodurumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53691-53713` records Main Digi-Burst 3, trashing three of this Digimon's sources to give all opposing Digimon -4,000 DP for the turn. Comprehensive Digi-Burst source-trashing rules are at `data/kb/rules/comprehensive.md:2952-2959`; no card-specific KB entry applies.

Correction and IR trace: the original direct record placed Digi-Burst 3 on a separate generic field `Trash` targeting three own Digimon, then applied a free all-opposing-Digimon reduction. As with BT4-046, that field target could consume sources from unrelated allied permanents. `apps/api/src/cards/BT4/BT4-049.ts:8-50` now has one `ModifyDP` action whose cost directly trashes three self digivolution cards (`:14-36`), targets all opposing Digimon, and applies -4,000 for the turn; coverage is full, residual is empty, and registration remains exclusive at `:50`.

Behavioral proof: `BT4-049.test.ts:8-44` activates Digi-Burst with three Varodurumon sources and a separate allied stacked Digimon, asserting all opposing targets lose 4,000 DP, only Varodurumon's sources are trashed, and the allied source remains. The aggregate structural proof is `BT4-041-050.audit.test.ts:76-95`.

Peer/stack proof: the dedicated self-source cost path is the same one used by BT4-046 (`runAction.ts:451-511`), and the stale generated action is known to resolve permanent targets through `removal.ts:531-571`. The generated snapshot (`effects.json:105233-105259`) still contains the erroneous own-Digimon `Trash`; it was not edited and the direct registered module is authoritative.

### BT4-050 — Liollmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-041-050.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:53716-53737` is a green level-3 vanilla Rookie/Vaccine/Holy Beast with no effect text and no card-specific KB entry.

IR and trace: `apps/api/src/cards/BT4/BT4-050.ts:4-5` is the complete empty record with full coverage, no residual, and only `registerIrCard`.

Behavioral and peer/stack proof: `BT4-050.test.ts:4-9` checks neutral DP state, and `BT4-041-050.audit.test.ts:133-135` keeps the direct `effects` array empty. There is no trigger, target, duration, inherited clause, or stack behavior beyond the catalog's ordinary green level-2 evolution. The generated snapshot at `effects.json:105260` agrees.

### BT4-051 — DoKunemon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 3, play cost 3, 2000 DP, green level 2 zero-
cost evolution requirement, and `[On Play] Reveal the top 3 cards. Add 1
Digimon with Digi-Burst to hand; put the rest at deck bottom`
(`cards.json:53740-53762`). The direct module maps this to one `RevealAdd`
slot filtered to Digimon plus the DigiBurst keyword, with `rest: deckBottom`
(`BT4-051.ts:8-36`); no KB ambiguity applies.

The focused proof now includes a positive Digi-Burst match with exact two-card
remainder, a no-match mixed deck where all three revealed cards return to the
bottom, and a legal green Digi-Egg-to-level-3 breeding evolution proving the
On Play effect does not fire on digivolution (`BT4-051.test.ts:6-71`). The
shared reveal implementation tracks taken cards and deck-bottom return, so no
direct correction was required.

### BT4-052 — Lalamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 3, play cost 3, 2000 DP, and inherited
`[Your Turn] When this card is trashed due to activating this Digimon's
Digi-Burst, return this card to its owner's hand`
(`cards.json:53765-53787`). The direct module is an inherited Your Turn
`onDigiBurstCardDiscarded` watcher with an `isSelfRef` trash target and Return
to hand (`BT4-052.ts:8-36`), matching Q1212's after-activation timing.

The focused test uses a legal green stack Lalamon under Lilamon, with Budmon
and Sunflowmon as the lower sources. It verifies the Lalamon source returns,
the Digi-Burst host retains the one untrashed source, and Lilamon's opposing
Digimon body suspends (`BT4-052.test.ts:8-41`).

The generated snapshot is stale at `packages/shared/src/effects/effects.json:105284-105302`:
it represents the body as generic `AddToHandSelf` rather than the direct
trash-zone, event-bound Return. The file was intentionally not edited; the
direct registered module is authoritative. No direct behavior correction was
required.

### BT4-053 — Roachmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 4, play cost 3, 3000 DP, and green level 3
one-memory evolution requirement with no effect text
(`cards.json:53790-53812`). The direct module is an empty full-coverage record
registered through `registerIrCard` (`BT4-053.ts:4-5`).

The focused test imports that direct module, retains the vanilla DP assertion,
and adds a legal green stack BT4-004 → BT4-051 → BT4-053 with memory payment,
stack preservation, and no DP mutation (`BT4-053.test.ts:5-32`). No direct
behavior correction was required.

### BT4-054 — Sunflowmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 4, play cost 5, 5000 DP, and the Main text
`Digi-Burst 2; 1 of your opponent's suspended Digimon doesn't unsuspend during
the opponent's next unsuspend phase` (`cards.json:53814-53836`). The direct
module attaches the two-source Digi-Burst cost to the target-bearing
restriction action, then restricts one opposing suspended Digimon from
unsuspending through the opponent's turn end (`BT4-054.ts:8-48`). This avoids
trashing unrelated own Digimon, stops the effect when the cost is declined, and
matches Q1213's suspended-target boundary.

The focused positive and negative tests now use the legal green stack Budmon →
Lalamon → Sunflowmon. The positive additionally drives the shared unsuspend
verb and verifies the restricted target remains suspended, while the negative
keeps an unsuspended target unrestricted (`BT4-054.test.ts:9-69`). The positive
also keeps a separate own Digimon on the board, proving the Digi-Burst cost does
not trash an unrelated permanent. This is the direct behavior correction in
this range.

### BT4-055 — Leomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 4, play cost 5, 5000 DP, green level 3
two-memory evolution requirement, and `[When Digivolving] Suspend 1 of your
opponent's Digimon with 3000 DP or less` (`cards.json:53839-53861`). The direct
module uses a When Digivolving opposing Digimon target with the exact `dp lte
3000` filter (`BT4-055.ts:8-34`).

The focused boundary pair now evolves legally from BT4-004 → BT4-051 into
Leomon and checks the exact 3000-DP positive and 4000-DP negative using the
shared suspension target path (`BT4-055.test.ts:5-51`). No direct behavior
correction was required.

### BT4-056 — SkullScorpiomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 5, play cost 5, 6000 DP, and green level 4
two-memory evolution requirement with no effect text
(`cards.json:53864-53885`). The direct module is an empty full-coverage record
registered through `registerIrCard` (`BT4-056.ts:4-5`).

The focused test imports the direct module, retains the vanilla DP assertion,
and adds a legal green stack Budmon → Roachmon → SkullScorpiomon with memory
payment, stack identity, and no effect mutation (`BT4-056.test.ts:5-32`). No
direct behavior correction was required.

### BT4-057 — GrapLeomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 5, play cost 7, 6000 DP, green level 4
two-memory evolution requirement, and `[When Attacking] Gain 1 memory`
(`cards.json:53888-53910`). The direct module maps the attack trigger to
`GainMemory: 1` with full coverage (`BT4-057.ts:8-24`).

The focused attack now uses a legal green stack Budmon → Lalamon → Sunflowmon
→ GrapLeomon and asserts the memory change on attack
(`BT4-057.test.ts:5-21`). No direct behavior correction was required.

### BT4-058 — Orochimon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 5, play cost 8, 8000 DP, green level 4
three-memory evolution requirement, and `[When Digivolving] 1 of your Digimon
gains Piercing for the turn` (`cards.json:53913-53935`). The direct module uses
the shared GainKeyword action with one controller-owned Digimon target,
Piercing, and `forTheTurn` duration (`BT4-058.ts:8-35`). This allows the host
itself, matching Q1214.

The focused test now evolves legally from Budmon → Lalamon → Sunflowmon into
Orochimon. Since Orochimon is the only eligible own Digimon, the assertion
proves the Q1214 self-target case as well as the final top card and four-card
permanent (three under-stack cards) (`BT4-058.test.ts:5-28`). No direct behavior
correction was required.

### BT4-059 — Lilamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 5, play cost 8, 7000 DP, green level 4
three-memory evolution requirement, Main Digi-Burst 2 followed by suspending
one opposing Digimon, and inherited `[When Attacking] If you have a Tamer in
play, suspend 1 of your opponent's Digimon`
(`cards.json:53938-53961`). The direct module maps both effects, uses the
dedicated Digi-Burst source cost, and makes the inherited condition a live
controller-owned Tamer presence check without a color filter
(`BT4-059.ts:8-83`), matching Q1215.

The focused Main test uses a legal Budmon → Lalamon → Sunflowmon → Lilamon
stack, verifies the target suspension, bottom-source removal, and Lalamon
return. The inherited positive and no-Tamer negative use legal Budmon →
Lalamon → Sunflowmon → Lilamon → Lotosmon stacks and a blue BT1-086 Tamer for
the color-agnostic positive (`BT4-059.test.ts:7-87`). No direct behavior
correction was required.

### BT4-060 — Lotosmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-051-060.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a green level 6, play cost 11, 12000 DP, green level 5
four-memory evolution requirement, and `[All Turns] When you or your opponent
play a level 4 or lower Digimon, suspend it`
(`cards.json:53964-53986`). The direct module installs an All Turns
`whenPlayed` watcher filtering the played subject to Digimon level 4 or lower
and targets that subject exactly through `sourceRef: "triggerSubject"`
(`BT4-060.ts:8-41`).

The focused tests use legal full green stacks and cover opponent play (level 3
positive, level 5 negative), controller-owned level 3 play (Q1216), level 4
digivolution without a play trigger (Q1217), and level 4 movement from
breeding without a play trigger (Q1218) (`BT4-060.test.ts:6-92`). The movement
case sets the production Breeding phase and uses `moveFromBreeding`; no direct
behavior correction was required.

### BT4-061 — BanchoLeomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-061.ts:8-28` models an On Deletion `Suspend` of up to two opponent Digimon (`count: 2`, `upTo: true`). The board action resolves opponent Digimon targets and suspends only the selected count, matching the catalog.

`BT4-061.test.ts:6-26` statically covers deletion with three opposing Digimon, asserting that exactly two suspend and the third remains unsuspended. No direct module gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-062 — Nidhoggmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The corrected direct IR models When Digivolving Digi-Burst 4 with exactly two actions: suspend all opposing Digimon at 5000 DP or less while paying the four-source cost, then return all opposing suspended Digimon to deck bottom with `order: "any"`. Q1219 confirms already-suspended targets, and BT6-002 Q1399 confirms the Return primitive's attachment teardown must not emit a separate source-trash event.

The direct correction was the `order: "any"` field. The shared Return seam now asks for the chosen order and preserves it at deck bottom, as required by the printed text. No direct `registerCard` path is present.

`BT4-062.test.ts` uses one newly suspended and one already-suspended opposing Digimon, supplies a manual order decision, verifies the submitted deck-bottom order and source destinations, and verifies the four-source cost. Its structural guard now requires only `Suspend` then `Return`. The generated snapshot remains stale and unedited.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-063 — Commandramon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-063.ts:8-39` maps On Deletion to `RevealAdd` with `revealCount: 3`, an optional one-card exact-name `Commandramon` match to play without memory cost, and all remaining revealed cards to deck bottom. The name matcher is scoped to the controller's own revealed cards (`:18-30`), while the shared reveal path handles the optional choice and bottom-deck cleanup. `nameExact` is required by the bracketed literal name. The only longer catalog name, Hi-Commandramon, has an explicit rule alias to Commandramon and is intentionally still eligible.

`BT4-063.test.ts:6-30` covers a successful free Commandramon play after deletion. The refusal proof at `:32-62` declines the optional play and asserts that no replacement Digimon enters the battle area and all three revealed cards remain in the deck. The direct correction is the exact-name matcher; a true near-name negative is unavailable in the committed catalog because Hi-Commandramon is explicitly treated as Commandramon by rule.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-064 — Sunarizamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct inherited IR at `BT4-064.ts:8-34` installs a Your Turn `SubTrigger` for `onDigiBurstCardDiscarded`, filters the discarded source by `isSelfRef`, and returns one matching card from trash to hand (`:14-26`). The sub-trigger machinery's discarded-source gate compares the event's trashed instance ID with the watcher source, so the effect does not fire for an unrelated source. Q1220 confirms the timing after the Digi-Burst activation.

`BT4-064.test.ts:8-31` activates assigned BT4-068 Digi-Burst with Sunarizamon as one selected source and verifies Sunarizamon reaches its owner's hand. No direct module gap was found. The generated `AddToHandSelf` snapshot shape is noted above; the direct module remains authoritative.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-065 — Gotsumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct module at `BT4-065.ts:2-5` is an empty full-coverage compiled record, matching the vanilla catalog record and generated snapshot. Its test now imports the direct module so the no-effect assertion exercises the direct registration path.

`BT4-065.test.ts:5-10` checks that the card's current DP remains its base DP after continuous recomputation. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-066 — Golemon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-066.ts:8-31` installs an All Turns permanent `ModifyDP` of +1000 targeting all controller-owned black Digimon (`:11-25`). The continuous statics path applies the effect to the source itself and all other qualifying black Digimon, while excluding nonblack cards. Q694 and Q1221 confirm the self-target and target-population behavior.

`BT4-066.test.ts:6-28` checks that Golemon and another black Digimon each gain 1000 DP, while a nonblack Digimon remains unchanged. No direct module gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-067 — Sealsdramon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-067.ts:8-32` carries the Blocker keyword and a When Attacking `GainMemory` of -2 (`:20-28`). The shared keyword/combat path recognizes Blocker, and the attack trigger applies the memory loss at attack declaration.

`BT4-067.test.ts:6-21` checks the Blocker keyword and an attack that moves memory from three to one. No direct module gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-068 — Baboongamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-068.ts:8-48` maps the Main effect to one opposing Digimon with play cost 7 or less, `amount: 1`, and the exact two-card self-stack Digi-Burst cost attached to that De-Digivolve action (`:11-35`). The shared De-Digivolve dispatcher performs the printed one-card peel. The shared target preflight now prevents the cost from being paid if the play-cost target pool is empty.

The direct correction removed the earlier generic own-Digimon `Trash` action. That shape paid Digi-Burst first and then could trash one additional source as field effect resolution, resulting in four sources lost from a three-source test stack; it also allowed a no-target activation to consume two sources. The corrected direct action pays exactly two and then resolves the one legal opposing target.

`BT4-068.test.ts:8-36` uses three sources, including assigned BT4-064, and checks that exactly two sources are paid, the target is De-Digivolved, and the target's former top card is trashed. The no-target boundary at `:38-69` uses an opposing play-cost-over-seven Digimon and checks that the three-source stack and Sunarizamon hand state are unchanged and the opponent remains in the battle area. The generated snapshot remains stale at `effects.json:105553-105578`; it was not edited.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-069 — Blimpmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct module at `BT4-069.ts:2-5` is an empty full-coverage compiled record, matching the vanilla catalog and generated snapshot. Its test imports the direct module and checks the no-effect DP identity.

`BT4-069.test.ts:5-10` covers the vanilla behavior. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-070 — Meteormon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-061-070.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-070.ts:8-23` carries only the Reboot keyword (`:11-18`), matching the catalog. The shared keyword engine supplies the opponent unsuspend-phase behavior; no additional card-local action is required.

`BT4-070.test.ts:6-18` checks the Reboot keyword and verifies that an attack leaves the Digimon suspended immediately after the attack rather than unsuspending it prematurely. No implementation gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; engine semantics 2/2; focused/stack boundaries 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-071 — Tankdramon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54237-54259` records the Your Turn D-Brigade deletion condition, top-two reveal, optional Commandramon play without cost, and arbitrary bottom placement. Q1222 (`qa.json:25435-25442`) requires a simultaneously deleted Tankdramon copy to be unable to activate after it reaches trash. Rules §4-15.2 and §15-4.3 (`comprehensive.md:816-825,1967-2000`) support the trigger/pending-activation boundary.

IR and trace: `apps/api/src/cards/BT4/BT4-071.ts:17-66` is full coverage with no residual. Its Your Turn `SubTrigger` listens for `onDeletionOf`, excludes itself, requires an own Digimon with the D-Brigade trait, and nests a two-card `RevealAdd` with one optional exact-name Commandramon play slot and deck-bottom remainder. Registration is exclusively `registerIrCard` at `:66`; `nameExact` is required by the bracketed literal name. Hi-Commandramon is intentionally eligible only because its catalog rule aliases it to Commandramon.

Behavioral proof: `BT4-071.test.ts:6-29` covers a matching D-Brigade deletion, reveal, optional play, and remaining deck card. The added Q1222 case at `:31-51` deletes two Tankdramon copies together and asserts no Commandramon was played and both cards remain out of the battle area. The range aggregate test checks the complete watcher and nested reveal shape (`BT4-071-080.audit.test.ts:41-69`).

Peer/stack proof: BT5-050 supplies the same inherited/source-event conventions, while the deletion and simultaneous-trigger rules establish why a source that has left the battle area cannot activate. No alternate evolution or inherited clause exists on Tankdramon beyond its ordinary black level-4 evolution row. The generated snapshot (`packages/shared/src/effects/effects.json:105591-105617`) is stale: it separates the reveal from a generic PlayWithoutCost action and loses the nested revealed-card binding; the direct module is authoritative. A true near-name negative is not representable with a committed catalog card because the only longer Commandramon name is explicitly aliased by rule.

### BT4-072 — Gogmamon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54262-54285` records Main Digi-Burst 1, one own Digimon at +2,000 DP until the end of the opponent's next turn, and inherited All Turns +1,000 DP. Q1223 (`qa.json:25444-25451`) confirms that Gogmamon itself may be selected. Digi-Burst's source-trash and optional processing are defined at `comprehensive.md:2952-2959`; Main/All Turns timing is at `:2725-2728` and `:2717-2723`.

IR and trace: `apps/api/src/cards/BT4/BT4-072.ts:8-69` is full/no residual. Its sole Main action is `ModifyDP` with one own Digimon target, +2,000 amount, `untilOpponentTurnEnd` duration, and a self-referenced one-source Digi-Burst cost that aborts on decline. The second effect is an inherited All Turns self `Aura` for +1,000 DP. Registration is only at `:69`.

Behavioral proof: `BT4-072.test.ts:8-30` statically describes activation with one source, target selection, source trash, and the +2,000 result; `:32-36` exercises the inherited effect across a legal host stack. `BT4-071-080.audit.test.ts:71-96` asserts that the cost remains on the DP action and that the inherited aura is not a generic permanent ModifyDP.

Peer/stack proof: BT5-050 confirms the source-card Digi-Burst event convention, and the direct test uses a legal level-4 source under Gogmamon. The generated snapshot (`effects.json:105619-105657`) is stale: it has an extra generic own-Digimon `Trash` before a free ModifyDP and represents the inherited effect as a permanent ModifyDP rather than an Aura. `effects.json` was not edited; direct registration is authoritative.

### BT4-073 — BanchoGolemon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54288-54310` records persistent Blocker and an Opponent's Turn +3,000 DP aura while the opponent has at least three Digimon in play. No card-specific KB, erratum, or restriction applies. Blocker is a persistent keyword at `comprehensive.md:2821-2829`; opponent-turn and static timing are at `:2717-2728`.

IR and trace: `apps/api/src/cards/BT4/BT4-073.ts:8-54` separates the Static Blocker keyword from an OpponentsTurn self Aura. The Aura uses `opponentHas` over the opponent's battle-area Digimon with count 3, exactly encoding “3 or more.” Coverage is full/no residual and registration is only at `:54`.

Behavioral proof: `BT4-073.test.ts:7-18` asserts Blocker and the +3,000 bonus with three opposing Digimon; `:20-29` asserts the no-bonus boundary at two. The aggregate structural proof is `BT4-071-080.audit.test.ts:98-113`.

Peer/stack proof: the shared persistent keyword and Aura paths provide the appropriate opponent-turn recomputation. BanchoGolemon has no inherited or alternate-stack clause beyond its ordinary black level-5 evolution requirement. The generated snapshot (`effects.json:105658-105679`) semantically agrees with the direct record; it remains unedited.

### BT4-074 — Darkdramon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54313-54335` records Rush and On Play recovery of up to five D-Brigade Digimon cards from trash to deck top in any order, followed by +2 memory for each returned card. No card-specific KB, erratum, or restriction applies. Rush is persistent and permits an attack in the play turn (`comprehensive.md:2960-2964`); the deck movement and ordered-card processing are handled by the Return primitive.

IR and trace: `apps/api/src/cards/BT4/BT4-074.ts:4-34` is full/no residual. It declares Static Rush, then an On Play `Return` constrained to own trash Digimon with the D-Brigade trait, count 5 with `upTo: true`, arbitrary ordering, deck-top destination, and a named returned count. The following GainMemory scales 2 per named returned card. Registration is only at `:34`.

Behavioral proof: `BT4-074.test.ts:8-43` now mixes two matching D-Brigade cards with nonmatching BT4-080 and asserts only the matching cards leave trash, the deck top is populated, memory gains four, and Rush is present. `:45-104` manually selects and orders three matching cards, checking the deck-top order and six-memory result. The aggregate proof is `BT4-071-080.audit.test.ts:115-139`.

Peer/stack proof: the Return/reordering and named-count mechanism was compared with other deck-top recovery effects; the test's mixed pool proves the D-Brigade trait boundary rather than only a single-card success. No inherited or alternate evolution behavior applies. The generated snapshot (`effects.json:105681-105714`) has equivalent broad semantics but stale naming (`bt4-074-returned`) and older optional/Return encoding; it was not edited.

### BT4-075 — Blastmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54338-54360` records Security Attack +1 and an opponent-controlled optional redirect to one of that opponent's unsuspended Digimon. Q1224-Q1227 and Q1309 (`qa.json:25453-25488`) require the original attack target announcement, allow the defending player to decline, and permit a redirected normal battle against an unsuspended Digimon. Security Attack and When Attacking timing are anchored at `comprehensive.md:2797-2820` and `:2717-2728`.

IR and trace: `apps/api/src/cards/BT4/BT4-075.ts:8-44` is a hand-authored but compiled full record with one Static SecurityAttack keyword and one WhenAttacking `RedirectAttack`. The action filters opponent Digimon with `unsuspended: true`, sets `chooser: "opponent"`, and is optional. It registers only through `registerIrCard` at `:44`; there is no second `registerCard` path.

Behavioral proof: `BT4-075.test.ts:13-46` covers original target declaration, accepted redirect, target battle, and defending-player selection evidence. The added decline case at `:48-88` leaves the original target in place and asserts the only decision is a seat-1 `selectCards` request, with no source-controller optional prompt. The aggregate direct-shape proof is `BT4-071-080.audit.test.ts:141-153`.

Correction and peer/stack proof: the direct module had already removed the former two-step redirect encoding, but the shared generic optional gate still asked seat 0 before `runCombatAction` delegated the actual optional choice to seat 1. The minimal reusable correction at `runAction.ts:280-296` skips that controller prompt only for `RedirectAttack` with `chooser: "opponent"`; `combat.ts:81-101` and `primitives.ts:4829-4854` then perform the single defending-player choice. Peer redirect records and the attack-target-switch primitive confirm this decision ownership. The generated snapshot (`effects.json:105715-105739`) is stale: it retains two mandatory/conditional redirects and omits chooser/optional metadata. It was not edited.

### BT4-076 — Gabumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54363-54384` is a purple level-3 vanilla Rookie with no effect text, play cost 3, 4,000 DP, and purple level-2 evolution for 0. No card-specific KB, erratum, or restriction applies.

IR and trace: `apps/api/src/cards/BT4/BT4-076.ts:4-5` is the complete empty record with `effects: []`, full coverage, empty residual, and only `registerIrCard`.

Behavioral and peer/stack proof: `BT4-076.test.ts:4-9` checks neutral DP state. The range aggregate test also imports the direct module and checks its empty record (`BT4-071-080.audit.test.ts:155-158`). No trigger, target, duration, inherited effect, or stack-dependent clause exists beyond the catalog's ordinary purple level-2 evolution. The generated snapshot (`effects.json:105740`) agrees.

### BT4-077 — Ghostmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54387-54409` records inherited Your Turn behavior that returns this source to its owner's hand after it is trashed by its host's Digi-Burst. Q1228 (`qa.json:25490-25497`) requires this return after Digi-Burst activation. Comprehensive §15-3.3 (`comprehensive.md:1925-1936`) preserves “this card” identity for an inherited source, and §16-14 (`:2952-2959`) defines Digi-Burst source trash and optional processing.

IR and trace: `apps/api/src/cards/BT4/BT4-077.ts:8-34` is full/no residual. Its inherited Your Turn SubTrigger listens for `onDigiBurstCardDiscarded`, gates to the exact source with `isSelfRef`, then returns that source from trash to hand. Registration is only at `:34`.

Behavioral proof: `BT4-077.test.ts:9-32` builds Ghostmon into a legal host stack, activates the host's Digi-Burst, and asserts Ghostmon reaches hand after source trash. The aggregate test checks the inherited event, source gate, trash zone, and hand destination (`BT4-071-080.audit.test.ts:160-184`).

Peer/stack proof: the dedicated Digi-Burst batch event identifies the trashed source before continuous recomputation removes its field watcher (`primitives.ts:2189-2243`; `subTrigger.ts:715-726`). The generated snapshot (`effects.json:105741-105758`) uses stale `AddToHandSelf` without the direct trash-scoped Return target; the direct registered module is authoritative.

### BT4-078 — Soundbirdmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54412-54434` records an optional When Attacking cost of trashing exactly one Option from hand to gain 1 memory. Q1229 (`qa.json:25499-25506`) confirms that two Options cannot produce two memory. Optional processing and When Attacking timing are covered by `comprehensive.md:2083-2128` and `:2717-2728`.

IR and trace: `apps/api/src/cards/BT4/BT4-078.ts:8-37` is full/no residual. It uses one optional GainMemory action with amount 1 and a hand-scoped own Option trash cost of count 1. Registration is only at `:37`.

Behavioral proof: `BT4-078.test.ts:6-26` covers accepted payment; `:28-52` proves two Options still produce one trash and one memory; and the added `:54-75` case covers optional refusal, leaving the Option in hand and memory unchanged. The aggregate action proof is `BT4-071-080.audit.test.ts:172-184`.

Peer/stack proof: the generic optional cost path asks the source controller, trashes only the selected hand card, and applies the gain once. No inherited or alternate-stack behavior applies. The generated snapshot (`effects.json:105760-105779`) agrees with the direct record and remains unedited.

### BT4-079 — Labramon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54437-54459` records On Play Draw 1 followed by trashing one card from hand. No card-specific KB, erratum, or restriction applies. Draw and trash are ordinary ordered action processing; `runEffect` preserves action order (`effect.ts:597-618`).

IR and trace: `apps/api/src/cards/BT4/BT4-079.ts:8-35` is full/no residual. Its On Play actions are exactly Draw one for the owner, then mandatory Trash one own hand card. Registration is only at `:35`.

Behavioral proof: `BT4-079.test.ts:7-30` arranges a drawn card and a preferred unrelated hand card, then asserts the draw reaches hand and the selected discard reaches trash. The aggregate order proof is `BT4-071-080.audit.test.ts:186-190`.

Peer/stack proof: the ordered Draw/Trash shape was compared with other On Play hand-manipulation effects; the focused preference fixture proves the post-draw hand is the trash source. No inherited or alternate-stack behavior applies. The generated snapshot (`effects.json:105781-105793`) agrees with the direct record and remains unedited.

### BT4-080 — Bakemon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-071-080.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54462-54483` is a purple level-4 vanilla Champion with no effect text, play cost 5, 6,000 DP, and purple level-3 evolution for 2. No card-specific KB, erratum, or restriction applies.

IR and trace: `apps/api/src/cards/BT4/BT4-080.ts:4-5` is the complete empty record with full coverage, empty residual, and only `registerIrCard`.

Behavioral and peer/stack proof: `BT4-080.test.ts:4-9` checks neutral DP state. The range aggregate test checks its direct empty record alongside BT4-076 (`BT4-071-080.audit.test.ts:155-158`). No trigger, target, duration, inherited effect, or stack-dependent clause exists beyond the catalog's ordinary purple level-3 evolution. The generated snapshot (`effects.json:105794`) agrees.

### BT4-081 — Devimon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 4, play cost 6, 5000 DP, purple level 3
two-memory evolution requirement, and `[Main] Digi-Burst 2: delete 1 of your
opponent's level 3 Digimon` (`cards.json:54486-54508`). The direct module maps
this to one opposing Digimon target constrained to `levels: [3]`, with a
two-card self digivolution-card trash cost, `abortOnDecline`, and a Digi-Burst
keyword marker (`BT4-081.ts:8-50`). The shared Digi-Burst primitive handles the
source-card batch and the Delete action handles the opponent target.

The focused pair now uses a purple source stack with BT4-077 and BT3-076
under Devimon, a level 3 BT3-076 positive target, and a level 4 BT4-082
negative target (`BT4-081.test.ts:8-58`). The positive assertion checks both
deletion and that both source cards were paid; the negative assertion checks
that no level-4 target is deleted and the stack remains intact. The stack is
legal for Devimon and avoids the previous red under-card fixture. No direct
behavior correction was required.

### BT4-082 — Dobermon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 4, play cost 6, 7000 DP, purple level 3
two-memory evolution requirement, and no effect text (`cards.json:54511-54532`).
The direct module is an empty full-coverage record registered by
`registerIrCard` (`BT4-082.ts:4-5`).

The focused test now imports that direct module and places Dobermon over the
purple level-3 BT4-077 in a legal evolution stack before asserting unchanged
DP (`BT4-082.test.ts:1-11`). No direct behavior correction was required.

### BT4-083 — Cerberusmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 5, play cost 6, 6000 DP, purple level 4
three-memory evolution requirement, and `[On Deletion] Trigger Draw 2. Then,
trash 1 card in your hand` (`cards.json:54535-54557`). The direct module
executes Draw 2 followed by Trash 1 from the controller's hand in one full
On Deletion record (`BT4-083.ts:8-35`), matching rules timing
`comprehensive.md:2713-2718` and the production delete path.

The focused test now deletes Cerberusmon over BT4-082, asserts both deck cards
are drawn, one hand card is trashed, and the top plus its under-card are in
trash (`BT4-083.test.ts:5-22`). This exercises the actual stack deletion rather
than an isolated permanent. No direct behavior correction was required.

### BT4-084 — NeoDevimon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 5, play cost 7, 7000 DP, purple level 4
three-memory evolution requirement, the Opponent's Turn “when an opponent
plays a Tamer, gain 3 memory” effect, and the inherited Opponent's Turn
“when an opponent's Tamer becomes suspended, gain 1 memory” effect
(`cards.json:54560-54583`). The direct module has one opponent-controller
Tamer `whenPlayed` watcher for GainMemory 3 and one inherited opponent Tamer
`whenSuspended` watcher for GainMemory 1 (`BT4-084.ts:8-54`). Q1230 confirms
the simultaneous suspension event is one gain, not one per Tamer.

The focused tests now use NeoDevimon over BT4-081 and Phantomon over BT4-081
for legal purple level-4-to-level-5 stacks. They cover Tamer play, one Tamer
suspension, and two Tamers suspended in one verb with only one memory gained
(`BT4-084.test.ts:6-54`). No direct behavior correction was required.

### BT4-085 — Phantomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 5, play cost 7, 10000 DP, purple level 4
three-memory evolution requirement, and no effect text (`cards.json:54586-54608`).
The direct module is an empty full-coverage record (`BT4-085.ts:4-5`).

The focused test imports the module and evaluates Phantomon over BT4-081 in a
legal stack before asserting its unchanged DP (`BT4-085.test.ts:1-11`). No
direct behavior correction was required.

### BT4-086 — Cerberusmon: Werewolf Mode

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 5, play cost 9, 9000 DP, purple level 4
three-memory evolution requirement, Rush, and `[On Play] You may delete 1 of
your [Cerberusmon] to gain 9 memory` (`cards.json:54610-54632`). The direct
module records persistent Rush and an optional exact-name `Cerberusmon`
delete-own cost before GainMemory 9 (`BT4-086.ts:8-51`). `nameExact` is
necessary: Q1231 and Q1232 exclude Werewolf Mode itself and another Werewolf
Mode despite the shared “Cerberusmon” text prefix.

The focused tests retain positive, self/peer-name negatives, and optional
decline coverage. The positive and decline cases now use a level-5 BT4-083
Cerberusmon over BT4-081, while checking deletion, memory, trash, and Rush
(`BT4-086.test.ts:7-78`). No direct behavior correction was required.

### BT4-087 — Anubismon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 6, play cost 11, 10000 DP, purple level 5
three-memory evolution requirement, and the optional When Digivolving play of
one level 3 Digimon from trash without paying its cost. Its Your Turn effect
gives Rush to a Digimon played from trash for that turn
(`cards.json:54635-54657`). The direct module maps the play to a purple
controller-owned level-3 trash target and binds the `whenPlayed` trigger
subject for a for-the-turn Rush grant (`BT4-087.ts:8-63`). Q1233-Q1234 confirm
the subject and its Rush persistence through same-turn digivolution.

Both focused tests now evolve from legal BT4-085 over BT4-081 into Anubismon;
they cover the trash play, free payment, Rush grant, and a same-turn evolution
of the played Digimon into BT4-081 while retaining Rush
(`BT4-087.test.ts:7-80`). No direct behavior correction was required.

### BT4-088 — DanDevimon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 6, play cost 12, 12000 DP, purple level 5
four-memory evolution requirement, the Opponent's Turn once-per-turn security
removal watcher, and `[On Deletion] Your opponent trashes 2 cards in their
hand` (`cards.json:54660-54682`). The direct module scopes the security watcher
to cards removed from its controller's security, sends one opponent top card
to trash, and uses `chooser: "opponent"` for the two-card hand trash
(`BT4-088.ts:9-53`). Q1235-Q1239 cover security activation, choice ownership,
same-count replacement, multiple copies, and effect-driven removal.

The focused tests now use DanDevimon over BT4-085, then exercise two security
removals in one opponent turn and On Deletion against a three-card hand
(`BT4-088.test.ts:6-38`). The once-per-turn assertion verifies exactly one
opponent security card is trashed. No direct behavior correction was required.

### BT4-089 — Plutomon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a purple level 6, play cost 13, 12000 DP, purple level 5
four-memory evolution requirement, and `[When Digivolving] Trigger Draw 2.
Then, you may use a purple Option card with memory cost 6 or less in hand
without paying its memory cost` (`cards.json:54685-54707`). The direct module
draws two, then optionally plays one controller-hand Option constrained to
purple and `playCostLte: 6` without payment (`BT4-089.ts:8-39`).

The focused tests now evolve from BT4-085 over BT4-081 and cover the positive
purple Option and non-purple Option boundary, with deck draw and final memory
assertions (`BT4-089.test.ts:6-69`). The generated snapshot still presents a
legacy `color: "purple"`, `cardType: "option"`, and `memoryCost.max` shape,
but the normalized direct filter has the same intended boundary. No direct
behavior correction was required.

### BT4-090 — Chaosmon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-081-090.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog gives a white level 7, play cost 15, 14000 DP, alternate green or
black level 6 six-memory evolution requirements, Piercing, and `[When
Digivolving] Unsuspend this Digimon. Then, it can attack your opponent's
Digimon. This effect allows you to attack unsuspended Digimon as well`
(`cards.json:54710-54737`).

The original direct IR incorrectly targeted an opponent Digimon as the
`Attack` subject and omitted optionality. The shared combat interpreter treats
the action target as the attacking permanent unless it is a self reference;
an opponent Digimon target therefore made the opponent's permanent the
attacker. The corrected module targets self, sets `isSelf: true`, and marks
the attack optional after Unsuspend and the temporary
`GrantCanAttackUnsuspended` (`BT4-090.ts:4-29`). This matches the generated
snapshot's self target and optional attack, the printed subject, and Q1240-Q1243.

The focused positive test now enables optional acceptance and proves that an
initially suspended legal green level-6 source can attack an unsuspended
opponent Digimon and leave the attacker suspended after combat. The normal
post-effect attack test keeps the unsuspended target illegal, and the
same-turn play-then-digivolve test now enables the optional attack while
asserting summoning sickness still prevents it (`BT4-090.test.ts:6-81`). The
non-BT4 BT5-030 peer continues to cover Q1308's protected/invalid opponent
target boundary (`apps/api/src/cards/BT5/BT5-030.test.ts:88-110`).

### BT4-091 — Chaosmon: Valdur Arm

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-091.ts:8-50` uses two consecutive opponent-Digimon
ModifyDP actions, each -7000 for the turn, followed by an On Deletion GainMemory 3.
Separate actions permit the same opponent Digimon to be selected twice and leave no
intervening action, matching Q1244/Q1245. The focused tests at
`BT4-091.test.ts:6-24` cover both -7000 applications and
`:26-33` cover the deletion gain. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-092 — Marcus Damon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-092.ts:5-49` sets memory to 3 at Start of Your Turn when
memory is at most 2. Its static `whenAttacking` watcher filters own Greymon names,
excludes the three catalog exceptions, requires the owner's turn, and makes the
optional gain cost a self-suspend. The Security record plays Marcus without cost.
Tests at `BT4-092.test.ts:8-38` cover the memory boundary and eligible attack,
`:41-50` covers Security, `:52-77` covers the excluded names, and `:79-105`
covers an already-suspended Marcus. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-093 — Thomas H. Norstein

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-093.ts:8-80` draws 1 on play. Its Main action requires at
least eight opponent-hand cards, targets one own Gao-named Digimon, and uses the
optional self-suspend cost before unsuspending that target; its Security record
plays Thomas without cost. Tests at `BT4-093.test.ts:9-19`, `:22-48`, and
`:51-79` cover On Play, the eight-card boundary, the suspend/unsuspend sequence,
and the seven-card negative; `:82-88` covers Security. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-094 — Tai Kamiya

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-094.ts:8-88` supplies a Your Turn Aura to all own Digimon
while own security is at most 3, with no color filter, and a separate opponent
`onDeletionOf` watcher gated by `deleteCause: "dpReachedZero"`; its optional action
suspends Tai to gain 1 memory. The Security record plays Tai without cost. Tests
at `BT4-094.test.ts:8-37` cover the color-independent aura and four-security
boundary. The DP-zero test at `:40-53` was corrected to use `dp: 0`; the effect
deletion negative at `:55-68` proves ordinary by-effect deletion does not arm the
watcher, and `:71-80` covers Security. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-095 — Yoshino Fujieda

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-095.ts:7-48` returns one own Digi-Egg from trash to the
bottom of the Digi-Egg deck on play. Its Static CostModifier reduces an own
Digimon's evolution cost by 1 when evolving into a Digimon definition whose effect
text contains Digi-Burst; the optional cost suspends Yoshino and lasts for the
turn. The Security record plays Yoshino without cost. Tests at
`BT4-095.test.ts:8-31` cover the Digi-Egg destination and
`:33-56` reject a non-egg; `:58-82` cover the reduction and suspend cost; `:84-90`
cover Security. Q1247 is represented by the broad `effectTextContains` matcher.
No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-096 — Izzy Izumi

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-096.ts:5-44` sets Start-of-Turn memory to 3 at the correct
boundary, reveals three cards on play, evaluates whether all revealed cards are
black, returns them with an order decision to the deck top, and plays itself from
Security without cost. The previous `rest: "deckTopAnyOrder"` value was not in the
shared action contract and the interpreter treated it as deck bottom; it is now the
supported `rest: "deckTop"` at `:18`. The order test at
`BT4-096.test.ts:70-121` now includes a fourth unrevealed sentinel and asserts the
chosen three cards are `[top...sentinel]`, proving top placement as well as visible
ordering. Other tests at `:8-20`, `:22-68`, and `:123-129` cover the memory
boundary, all-black/mixed-color condition, and Security. This is the sole direct
card-module correction in the range.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-097 — Kari Kamiya

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-097.ts:9-60` watches `whenSecurityRemoved` with
`sourceFilter.controller: "mine"`, and offers the optional self-suspend for 1
memory; its Security record plays Kari without cost. This source direction matches
Q1248-Q1253 and Q2010: it watches the owner's stack, survives the attack, and does
not react before a Kari played from Security is in play. Tests at
`BT4-097.test.ts:8-29` cover an opponent attack removing the owner's security and
the resulting gain; `:31-36` covers Security. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-098 — Atomic Inferno

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-098.ts:7-70` binds one own Digimon with Hybrid in its form,
then applies +3000 DP and Security Attack +1 for the turn. A nested `whenBlocked`
watcher is scoped to that same bound Digimon, requires Your Turn, and gains 3
memory; the Security record grants the all-own-Digimon Security Attack aura through
the owner's next turn and separately watches own Digimon entering play. This models
Q1254's actual-block distinction and Q1255's later entrants. Tests at
`BT4-098.test.ts:10-25` cover both Main bonuses, `:27-47` cover one-target
selection among multiple Hybrids, `:49-62` cover the Security aura, and `:64-74`
cover a later entrant. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-099 — Heir of Dragons

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-099.ts:8-60` draws 2, then conditionally deletes one
opposing Digimon at 4000 DP or less only when an own Greymon- or Dramon-named
Digimon survives the three exclusions. Security activates the Main effect through
the direct registration path. Tests at `BT4-099.test.ts:8-22` cover the draw and
4000-DP deletion, `:24-39` cover Security replay of the full Main effect, and
`:41-58` cover an excluded Greymon name. No direct gap was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-100 — Trident Revolver

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-091-100.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The direct IR at `BT4-100.ts:8-54` deletes one opposing Digimon at 6000 DP or
less, then optionally plays one own Tamer at play cost 4 or less from hand without
cost. Security activates the full Main effect. Tests at `BT4-100.test.ts:8-32`
cover deletion and Tamer play, `:34-50` cover Security replay, and `:52-70`
cover Q1256's no-deletable-target case where the Tamer still plays. No direct gap
was found.

Score: catalog/rules 2/2; direct IR/registration 2/2; shared engine 2/2;
focused/peer/legal-stack proof 2/2; executed gates 0/2. **8/10 provisional.**

### BT4-101 — I'll Drag You In to the Depths!

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54914-54927` records the all-own Digimon aura, the Your Turn attack condition against an opponent's Digimon with no digivolution cards, effect deletion, and Security hand return. Q1257/Q1258/Q1260-Q1264 (`qa.json:25731-25778`) establish that the deletion is resolved before battle, does not activate battle-deletion effects, does not delete the attacker, and uses the attack target as declared.

IR and trace: `apps/api/src/cards/BT4/BT4-101.ts:8-42` is full coverage with an empty residual. The Main action is one `GrantAuraToOpponents` over all own Digimon with the exact printed effect text and `forTheTurn` duration; Security is `AddToHandSelf` and marked `isSecurity`. Registration is exclusively at `:42`.

Behavioral proof: `BT4-101.test.ts:8-53` covers a sourceless attack deletion, Security hand return, and the negative stacked-target case. The aggregate proof checks the complete aura text and all-own target (`BT4-101-110.audit.test.ts:41-54`).

Peer/stack proof: the shared GrantAura and granted-effect paths above provide the attack-declaration and no-source semantics; ST15-16 and BT13-094 confirm the same aura representation. No alternate evolution or inherited clause applies. The generated snapshot (`packages/shared/src/effects/effects.json:106361-106378`) is semantically aligned with the direct module and remains unedited.

### BT4-102 — Aqua Viper

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54930-54944` records the own return cost, up-to-two opposing level-4-or-lower returns, explicit source trash, and Security hand return. Q1265/Q1266 (`qa.json:25782-25797`) cover Mother D-Reaper/token return conditions and their alternate final destinations.

IR and trace: the corrected direct Main effect first returns one own Digimon, retaining `allowTokens: true` for Q1265/Q1266, then canonically returns up to two opposing level-4-or-lower Digimon. The second Return performs Q1399 rule teardown of each selected stack without emitting `whenDigivolutionTrashed`. Security adds itself to hand; coverage is full, residuals are empty, and registration remains exclusive to `registerIrCard`.

Behavioral proof: the existing stack test checks the own return, both opposing returns, and all source cards in trash. The corrected BT6-002 watcher case now proves no draw occurs during return teardown while the attachments still reach trash, exactly matching Q1399. The aggregate action proof requires two Return actions and no `TrashDigivolution`.

Peer/stack proof: BT6-002 Q1399 directly covers the printed wording and the engine's canonical Return negative. The generated snapshot (`effects.json:106379-106412`) remains stale because it wraps the own Return as a cost and generically trashes own Digimon. The snapshot was not edited; direct registration is authoritative.

### BT4-103 — Full Moon Blaster

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54946-54960` records one opposing level-5-or-lower target, the resolution-time eight-card hand branch, source trash, and Security Main activation. Q1267 (`qa.json:25798-25805`) requires the branch to be chosen at resolution rather than after any intermediate hand movement.

IR and trace: the direct module binds one opposing target and has two mutually exclusive resolution-time `zoneCount` Return branches: opponent hand `gte 8` goes to deck bottom, otherwise hand. Both canonical Return destinations perform Q1399 rule teardown without a separate source-trash action. Main and Security share the same ordered actions and the registration remains exclusive.

Behavioral proof: the focused tests check both below-eight hand and eight-card deck-bottom branches with stacked targets and final attachment trash, plus Security activation. The aggregate proof guards binding, both Return conditions, shared Security actions, and the absence of `TrashDigivolution`.

Peer/stack proof: BT6-002 Q1399 controls stack teardown, while comprehensive processing-condition rules support the independent resolution-time branch checks. The snapshot (`effects.json:106413-106454`) retains a stale explicit source-trash representation and legacy conditions. It remains unedited and non-authoritative.

### BT4-104 — Blinding Ray

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54962-54975` records top-security trash followed by two memory. Q1252/Q1268 (`qa.json:25807-25821`) confirm that an empty security stack does not prevent the memory gain. Banlist data restricts this card to one copy, which does not alter effect resolution.

IR and trace: `apps/api/src/cards/BT4/BT4-104.ts:8-30` is full/no residual. Main has ordered `SecurityManipulation` `trashTop` followed by unconditional `GainMemory` 2; there is no separate Security effect because the catalog has no Security text. Registration is only at `:30`.

Behavioral proof: `BT4-104.test.ts:5-28` covers both a nonempty security stack and an empty stack. The aggregate proof preserves the exact two-action order (`BT4-101-110.audit.test.ts:126-132`).

Peer/stack proof: the security manipulation and memory primitives provide the printed order and empty-stack behavior; no source-stack or inherited clause applies. The generated snapshot (`effects.json:106455-106467`) agrees semantically and was not changed.

### BT4-105 — Tactical Retreat!

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54977-54990` records placing one own Digimon face down on top of security, trashing all its sources, and Security Recovery +1. Q1269-Q1272/Q1962/Q3284 (`qa.json:25823-25865`) distinguish placing from deletion, require alternate handling for Mother D-Reaper/tokens/Digi-Eggs, and confirm the used Option can still be placed by a later external effect.

IR and trace: Main now uses one `SecurityManipulation placeAsSecurity` action whose source directly selects one own Digimon with `allowTokens: true`. The shared `addSecurity` primitive moves the top card and tears down attachments without a source-trash-by-effect event, while preserving the token/Digi-Egg alternate destinations. Security uses `addTop` from deck for Recovery +1; coverage and exclusive IR registration remain intact.

The shared correction in `primitives.ts:4015-4193` handles the proven alternate destinations: a chosen token is dropped out of the game, a Digi-Egg is inserted face down at the bottom of its owner's Digi-Egg deck, and neither is included in `added` or the security-added subtrigger. This preserves the processing condition while preventing a false Security insertion.

Behavioral proof: the legal stack test checks the top card reaches Security face down and attachments reach trash; Recovery, Mother D-Reaper, and token alternate-destination regressions remain. The aggregate shape proof now requires the single canonical placement action.

Peer/stack proof: `addSecurity` follows comprehensive rules §3-1-3-9 and token rules while mirroring canonical whole-permanent teardown. The snapshot (`effects.json:106468-106496`) is stale because it places the permanent and then generically trashes own Digimon, losing target identity and Q1399 semantics. It was not edited.

### BT4-106 — Purge Shine

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:54993-55006` records -3000 DP for every opponent Digimon for the turn and Security Main activation. No card-specific KB, erratum, or restriction applies.

IR and trace: `apps/api/src/cards/BT4/BT4-106.ts:8-41` is full/no residual. Main uses one all-opponent Digimon `ModifyDP` of -3000 with `forTheTurn`; Security activates Main. Registration is only at `:41`.

Behavioral proof: `BT4-106.test.ts:8-36` checks multiple opposing Digimon and Security activation. The aggregate proof checks the all-opponent target and duration (`BT4-101-110.audit.test.ts:156-166`).

Peer/stack proof: the shared temporary DP modifier and turn-duration cleanup provide the required scope; no source-stack clause applies. The snapshot (`effects.json:106497-106514`) agrees semantically and remains unedited.

### BT4-107 — Pollen Spray

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:55009-55022` records revealing three cards, adding all Digimon with Digi-Burst, bottom-decking the rest in any order, and suspending one opponent Digimon per card added. No card-specific KB, erratum, or restriction applies. Digi-Burst processing is optional as a card keyword (`comprehensive.md:2952-2959`), but the printed reveal/add and suspension sequence is mandatory when the Option resolves.

IR and trace: `apps/api/src/cards/BT4/BT4-107.ts:14-73` is hand-audited full/no residual. RevealAdd checks Digimon whose card text contains Digi-Burst (`nameOrTrait` with `match: "text"`), adds all matches to hand, puts the rest at deck bottom, and records `trackCount: "addedByPollenSpray"`; the next Suspend action scales by that named count and targets opponents only (`:41-56`). Security activates Main. Registration is only at `:73`.

Behavioral proof: `BT4-107.test.ts:8-34` uses a mixed reveal pool to check that only Digi-Burst Digimon are added and one opposing Digimon is suspended per addition; `:36-50` checks Security Main. The aggregate proof checks text matching, remainder destination, named count, and opponent scaling (`BT4-101-110.audit.test.ts:168-193`).

Peer/stack proof: the shared RevealAdd tracking path and BT2-041's named-count scaling provide the exact “cards added by this effect” semantics. The snapshot (`effects.json:106515-106543`) is stale: it matches a generated `keywords: ["DigiBurst"]` predicate rather than the card-text rule, scales by all own cards rather than the named additions, and omits `trackCount`. It was not edited.

### BT4-108 — Cyclonic Kick

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:55025-55038` records unsuspending one own Digimon followed by suspending one opposing Digimon, with independent halves and Security Main activation. Q1273 (`qa.json:25867-25874`) confirms either half remains usable when the other side has no legal Digimon.

IR and trace: `apps/api/src/cards/BT4/BT4-108.ts:4-18` now orders Main actions as `Unsuspend` own Digimon then `Suspend` opposing Digimon, each with count 1; Security activates Main. The action-order correction is direct and registration remains exclusively at `:18`.

Behavioral proof: `BT4-108.test.ts:8-40` covers both halves and Security activation, while `:42-50` covers the no-own-Digimon half. The aggregate proof asserts the printed order (`BT4-101-110.audit.test.ts:195-201`).

Peer/stack proof: the shared ordered board-action path (`board.ts:50-111`) keeps the halves independent and preserves the printed order. The snapshot (`effects.json:106544-106556`) is stale and materially wrong: it only unsuspends one opposing Digimon and omits both the own target and suspend action. It was not edited.

### BT4-109 — Final Zubagon Punch

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:55041-55055` records one own Digimon's +3000 DP through the opponent's next turn, then the 16000-or-more result gate for Blocker, Reboot, and Security Attack +1 through the same duration. Q1274-Q1276 (`qa.json:25876-25897`) establish result-threshold timing and persistence despite later DP changes.

IR and trace: `apps/api/src/cards/BT4/BT4-109.ts:7-98` is hand-audited full/no residual. Main boosts one own Digimon until `untilOpponentTurnEnd`; each of the three following GainKeyword actions targets `sameTarget`, uses `lastTargetDpAtLeast: 13000` (equivalent to 16000 after the fixed +3000), and grants Blocker, Reboot, or SecurityAttack +1 for the same duration (`:24-81`). Security adds itself to hand. Registration is only at `:98`.

Behavioral proof: `BT4-109.test.ts:9-29` checks the exact 16000 boundary and all three keywords; `:31-45` checks the below-threshold boundary; `:47-52` checks Security hand return. The aggregate proof checks one-target binding, threshold, duration, and all three keywords (`BT4-101-110.audit.test.ts:203-240`).

Peer/stack proof: the shared same-target and DP-result condition paths implement the Q1274-Q1276 timing, while comprehensive keyword rules cover Blocker, Reboot, and Security Attack (`comprehensive.md:2797-2829,2897-2910`). The snapshot (`effects.json:106557-106588`) is stale: it omits Security Attack +1, same-target binding, and the supported numeric threshold condition, leaving only raw text for the gate. It was not edited.

### BT4-110 — Dark Roar

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-101-110.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

Catalog/rules: `cards.json:55057-55070` records deleting one opposing Digimon with play cost 3 or less and adding one to the target maximum for each own D-Brigade Digimon, with Security Main activation. Q1277 (`qa.json:25899-25906`) confirms the scaling applies to the target's maximum play cost, not to the Option's own cost.

IR and trace: `apps/api/src/cards/BT4/BT4-110.ts:6-47` is hand-audited full/no residual. Main uses a one-target opponent Digimon filter with base `playCostLte: 3` plus `playCostLteScaling` of one per own D-Brigade Digimon card; Security activates Main. Registration is only at `:47`.

Behavioral proof: `BT4-110.test.ts:8-27` checks the scaled ceiling by distinguishing opposing cost-6 and cost-5 Digimon with two D-Brigade Digimon; `:29-40` checks Security activation. The aggregate proof checks the dynamic target ceiling and trait filter (`BT4-101-110.audit.test.ts:242-266`).

Peer/stack proof: EX5-054 and BT7-065 confirm the shared `playCostLteScaling` target shape and card-count unit. The snapshot (`effects.json:106589-106619`) is stale: it deletes only at cost 3, then adds a generic CostModifier that reduces play costs, rather than raising this effect's target ceiling. It was not edited.

### BT4-111 — Jack Raid

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-111-115.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog identifies a purple zero-cost Option with Main “gain 1 memory for
every 10 cards in your trash” and Security “gain 2 memory.” The direct record
uses Main GainMemory amount 1 with `per: 10`, own-trash filter, and trash unit,
followed by Security GainMemory amount 2
(`BT4-111.ts:8-42`). This maps the numeric scaling, controller, zone, and
Security timing without a direct gap. Q1278's nine-card edge is explicitly
covered because the Option moves after its effect's count, and the banlist's
one-copy restriction is an operational deck-legality fact rather than a card
effect change.

The focused tests use 20 and 9 neutral BT1-051 trash cards, assert the exact
memory outcomes and final trash behavior, and fire the Security timing through
the test seam (`BT4-111.test.ts:8-42`). Options do not have an evolution stack;
no stack proof is applicable. No direct behavior correction was required.

### BT4-112 — Hell’s Gate

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-111-115.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog identifies a purple six-cost Option whose Main effect deletes one
opposing level 6-or-higher Digimon and whose Security effect returns itself to
its owner's hand. The direct record constrains the target to opposing Digimon,
uses `levelComparison: { op: "gte", value: 6 }`, selects one, and records
Security AddToHandSelf (`BT4-112.ts:8-43`). The shared matcher and removal
primitive provide the target boundary and deletion movement.

The focused tests assert deletion of a level-7 RagnaLoardmon, self return from
Security, and preservation of a level-5 MetalGreymon target
(`BT4-112.test.ts:8-39`). The Option has no evolution stack; no stack proof is
applicable. No direct behavior correction was required.

### BT4-113 — AncientGreymon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-111-115.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog identifies red level-6 AncientGreymon with a red level-5 evolution
requirement. Its Your Turn text counts digivolution cards whose names contain
Greymon except DoruGreymon, BurningGreymon, and DexDoruGreymon, or whose form
is Hybrid, granting Security Attack +1 for each; its On Deletion text may play
one red level-4-or-lower Hybrid from hand without paying its memory cost. The
direct record represents the alternatives as one union-filtered,
self-targeted permanent grant, preserving the exclusion scope and counting a
source that matches both alternatives once, then records the optional red
level/Hybrid/hand PlayWithoutCost action (`BT4-113.ts`). This replaces the
previous two-action representation, which double-counted EmperorGreymon.

The focused legal source stack is AncientGreymon over MetalGreymon over
BurningGreymon over Flamemon, producing three qualifying source cards across
the Greymon and Hybrid alternatives. A separate EmperorGreymon overlap case
asserts Security Attack +1 rather than +2. The deletion tests play qualifying
BurningGreymon while retaining non-Hybrid Greymon, and explicitly decline the
optional effect (`BT4-113.test.ts`). This provides the legal stack,
trait/name boundary, optionality, and final-zone assertions without changing
shared engine behavior. One direct behavior correction was required.

### BT4-114 — AncientGarurumon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-111-115.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog identifies blue level-6 AncientGarurumon with a blue level-5
evolution requirement. Its Once Per Turn When Attacking effect unsuspends up
to two own Digimon in the union of Garurumon names other than KendoGarurumon
and Hybrid form; its On Deletion effect may play one blue level-4-or-lower
Hybrid from hand without paying memory. The direct record preserves that
union as nested OR branches, limiting `excludeNames: ["KendoGarurumon"]` to the
Garurumon-name branch while leaving the Hybrid branch inclusive
(`BT4-114.ts:8-70`).

The focused attack tests use AncientGarurumon over Monzaemon, include the
attacker itself, unsuspend a Hybrid Lanamon, include Hybrid KendoGarurumon
despite its excluded name, leave non-Hybrid Gekomon suspended, and cap the
selection at two. A separate deletion acceptance/refusal pair covers the
optional blue Hybrid play (`BT4-114.test.ts:6-85`). This directly exercises
Q1279 and Q1280. No direct behavior correction was required.

### BT4-115 — Lucemon

Score: 10/10. Focused batch and independent static evidence green. Source: `docs/audits/BT4-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT4-STATIC-AUDIT.md`, 2026-09-02).

Clause evidence, merged from `internal-docs/audits/BT4/BT4-111-115.md` (2026-09-02, static-only pass; where its score differs the 2026-09-10 ledger above wins):

The catalog identifies yellow level-3 Lucemon with play cost 13 and no
evolution cost. Its hand-resident effect reduces its own play cost by 8 at 10
or more own trash cards; On Play performs Recovery +1 (Deck); and All Turns
restricts this Digimon's evolution destinations to names containing Lucemon.
The direct module binds the cost reduction to the still-hand-resident source
with a self reference, uses a zone-count condition, invokes the Recovery
keyword, and records self-scoped RestrictDigivolveInto
(`BT4-115.ts:9-76`). The hand-resident and self-card predicate prevent the
modifier from discounting unrelated plays or copies in other zones.

The focused tests play Lucemon for the reduced five memory, recover the deck
top and assert the deck/security transitions, and reject a non-Lucemon
digivolution target (`BT4-115.test.ts:7-50`). Because the catalog has no
evolution cost for this level-3 card, a legal source stack is not applicable;
the restriction boundary is covered directly. No direct behavior correction
was required.

## Mechanisms

No `*-MECHANISM.md` file was ever written for BT4. The engine change belonging to this set came from the 2026-09-02 static pass: the shared IR distinguishes static `TamerOntoDigivolve` registration metadata from an executable `Digivolve`, while still accepting the legacy registration shape from older snapshots. The shared client and server data reader recognizes both shapes, so board highlighting and displayed costs stay aligned with server legality. It is pinned by the shared Tamer-onto data regression (1 file, 105 tests), the web board-model projection test (1 file, 81 tests), and the four Tamer alternate-evolution paths asserted in the BT4 collection test.

## Knowledge base index

`docs/audits/BT4-reaudit/KB-INDEX.md` (2026-09-10) holds only a statement of method: card-specific rulings are resolved from the committed repository knowledge base during each card review. It lists no ruling identifiers. The 2026-09-02 static pass records one local card-KB query per card, 115 in total, and the rulings it found appear in the card sections above.

## Open items

- Evidence depth. The 2026-09-10 re-audit wrote no per-card report. Every row was accepted from read-only static review reconciled against green focused batches and collection-wide gates, so the newest per-card evidence for BT4 is the one-line ledger status. The clause-level detail below each card is the 2026-09-02 static pass, whose own rows read "provisional 8/10". The 2026-09-10 ledger scores of 10/10 win.
- Stale file inside the winning source. `docs/audits/BT4-reaudit/REVIEW-NOTES.md`, dated 2026-09-10, still reads "Open review queue: none before initial static and focused evidence review", which describes the state before the run rather than after it. BT4 has no recorded coordinator review notes.
- No aggregated knowledge-base index. `docs/audits/BT4-reaudit/KB-INDEX.md` records a method, not ruling identifiers.
- Status contradiction between passes. `docs/audits/BT4-AUDIT.md` (2026-08-30) says "initial static card-by-card pass complete; execution gates deferred" and, unlike BT1 to BT3, never gained an archival notice pointing at its successor. `docs/audits/BT4-STATIC-AUDIT.md` (2026-09-02) says "complete — 115/115 cards verified at 10/10". Both are superseded by the 2026-09-10 re-audit.
- Catalog identity is a blob hash in every source, not a commit. `catalog_commit` stays `unknown` until a run records one.

## History

- `docs/audits/BT4-AUDIT.md` — last in `d9d57ae08`, 2026-08-30. First static card-by-card pass with execution gates deferred; no archival notice was ever added to it.
- `docs/audits/BT4-STATIC-AUDIT.md` — last in `1de5cf82e`, 2026-09-02. Static closeout ledger claiming 115/115 at 10/10, and the source of the twelve IR corrections and the Tamer-onto IR split; its Executed gates section is copied above.
- `docs/audits/BT4-REAUDIT-LEDGER.md` — last in `30d5bb1ee`, 2026-09-10. Independent evidence ledger, 115 rows at 10/10; merged into the card ledger above.
- `docs/audits/BT4-reaudit/` — last in `30d5bb1ee`, 2026-09-10. No per-card reports. `RUN.md` merged into Gates, `REVIEW-NOTES.md` and `KB-INDEX.md` recorded under Open items, and `WORKER-BRIEF.md` was worker instructions, not evidence.
- `internal-docs/audits/BT4/` — last in `eb1a58b75`, 2026-09-05. 12 Luna range reports (`BT4-001-010.md` … `BT4-111-115.md`) carrying the 2026-09-02 static-only clause evidence, merged per card above.
- No `apps/api/src/cards/BT4/AUDIT.md` existed. No logs, PNG, or JSON evidence existed for BT4.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT4: PR #4573; commit `a7248aa4b`.
