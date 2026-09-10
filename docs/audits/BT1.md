---
set: BT1
cards: 115
status: verified
verified_at: 2026-09-10
catalog_commit: unknown
evidence_commit: eabe99351
---

# BT1 audit

## Status

All 115 BT1 production modules are audited and the 2026-09-10 re-audit closed its delivery gates: the exact BT1 collection passed 140 files and 830 tests, `pnpm typecheck` passed for shared, API, and web, and lint, format, effects sync, and `git diff --check` were clean. The 2026-09-10 re-audit (`docs/audits/BT1-REAUDIT-LEDGER.md` and `docs/audits/BT1-reaudit/`) is the winning source; the 2026-09-02 static pass (`docs/audits/BT1-STATIC-AUDIT.md`) and the archival range reports under `internal-docs/audits/BT1/` are superseded and their scores are historical. One unresolved inconsistency remains inside the winning source: its run log records the ledger as recalculated to 1150/1150 with all 115 cards at 10/10, while every ledger row still reads 8/10 with 0 gate points. That contradiction is recorded under Open items rather than smoothed over, and each card section below reports the row score exactly as the ledger stated it. The catalog is identified by blob `efbecc002fb9000789123e2f91f201466e1e5b0a` in the static pass and by the earlier snapshot `ef2e5b367c616299806c87d6b078ce6fc2822b78` in `docs/audits/BT1-AUDIT.md`; neither source recorded a catalog commit, so `catalog_commit` is `unknown`.

## Gates

### 2026-09-10 re-audit closeout (winning source)

From `docs/audits/BT1-reaudit/RUN.md`. All Vitest commands used `--maxWorkers=1 --no-file-parallelism` after a standalone process poll and a `memory_pressure` free-memory gate.

- Exact BT1 collection: 140 expanded test paths whose parent directory is exactly `BT1`; 140 files and 830 tests passed in 2.82 s. The set includes focused, mechanism/range aggregate, catalog-sync, and historical-deck suites. Final rerun after closeout passed 140 files and 830 tests in 2.68 s.
- Effects snapshot: `effects:sync:set` followed by `effects:check:set` reported 13 semantic changes against the base, zero changes outside BT1, and 115 records synchronized.
- Typecheck: full `pnpm typecheck` passed for shared, API, and web after the clean dependency trees were linked into the isolated worktree.
- Lint and format: changed-file Oxlint, Oxfmt, and report/ledger formatting are clean.
- Diff and smell checks: `git diff --check`, the exclusive-registration and `@ts-nocheck` scan, and the full fixture/timing-injection scan are clean.
- Discarded runs, recorded so they are not mistaken for evidence: an unauthorized API typecheck during the BT1-009..012 lane; a `vitest run src/cards/BT1` command that prefix-matched BT10 and surfaced an unrelated BT10-112 failure; and a BT1-100 focused run started while an external Vitest loop was active.

### 2026-09-02 static pass (superseded)

From `docs/audits/BT1-STATIC-AUDIT.md`. All commands used one fork, disabled file parallelism, and explicit timeouts.

- Full BT1 collection: 140 files, 592 tests passed, including explicit turn-end expiration proof for BT1-100 and BT1-109.
- API mechanism coverage: seven files covering 483 tests. Six files passed together; `primitives.test.ts` passed 138/138 in isolation to avoid the known duplicate-registry collision caused by sharing one fork with `interpreter.test.ts`.
- Shared package: 8 files and 132 tests passed. One unrelated `EX11-026` assertion failed because `main` expected an alternate route that its own data override removes.
- Shared build and the API no-check build passed. API typecheck reported no BT1 error; its remaining failures are the repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Scoped snapshot tooling: 13 tests passed with concurrency 1.
- Scoped effect check: 115 records already synchronized; 65 semantic changes plus three byte-only changes (`BT1-011`, `BT1-030`, `BT1-066`) inside BT1, zero changes outside BT1.
- Full-repository lint exited successfully with baseline warnings; scoped BT1 lint clean; scoped formatting completed with one thread; `git diff --check` passed.

## Card ledger

### BT1-001 — Yokomon

Score: 8/10. real hatch/evolve/move stack, peer boundary, Q865/Q866 public attack flows; focused 5/5 green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-001.md` (2026-09-10):

##### Evidence

Catalog (`cards.json`): red Digi-Egg, inherited `[When Attacking] When you attack an opponent's Digimon, this Digimon gets +1000 DP for the turn.` KB query: Q865 says the effect does not activate in Security battles; Q866 says a player attack redirected by Blocker does not activate it.

##### Implementation map

`BT1-001.ts` registers exclusively with `registerIrCard`. The inherited `WhenAttacking` trigger requires an opponent Digimon attack target and applies `ModifyDP +1000`, self, for the turn. This correctly excludes player/Security attacks and remains false when a player attack is later blocked.

##### Proof and limits

`BT1-001.test.ts` now covers five focused cases, including catalog/IR shape. The positive battle fixture uses a 6000-DP
BT1-019 carrying Yokomon against a 6500-DP opposing Digimon, making the inherited +1000
observable as a win and persistent 7000 current DP. Q865 uses a 6000-DP host against a
6000-DP Security Digimon, so an incorrect bonus would let the host survive; Q866 uses the
same boundary through a player attack redirected by BT1-072 Blocker, and the host is deleted
only when the inherited clause correctly stays inactive.

The lifecycle case is a real public route: `hatchEgg` removes BT1-001 from the Digi-Egg deck,
BT1-013 (red Lv.3, cost 1) legally digivolves onto it in breeding, the memory gauge changes
from 3 to 2, and `moveFromBreeding` preserves the egg instance under the carrier. A
source-less BT1-013 peer attacks a 5500-DP target and loses, while the routed carrier attacks
the other 5500-DP target and wins at 6000 DP. The earlier `illegal-target` result was a test
fixture lifecycle error: the target began suspended, but the intervening opponent turn's
unsuspend phase made it legal-state false; the test now observes that transition and uses the
public test seam to suspend both targets again before declaring attacks. No engine seam or
production card code required a change. Focused result: 1 file / 5 tests passed with
`--maxWorkers=1 --no-file-parallelism`; score: 8/10 per worker brief (delivery gates remain with coordinator).

### BT1-002 — Bebydomon

Score: 8/10. Q867, real lifecycle/evolution stack, Option/Tamer Piercing and peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-002.md` (2026-09-10):

##### Evidence

Catalog (`cards.json`): red Digi-Egg, Lv.2 In-Training, Baby Dragon, and inherited `[Your Turn] While this Digimon has <Piercing>, it gets +2000 DP.` The only KB result is Q867, which confirms that Piercing granted by either an Option or Tamer qualifies.

##### Implementation map

`BT1-002.ts` uses exclusive `registerIrCard`; inherited `YourTurn` applies self `ModifyDP +2000`, with `forTheTurn` duration, when `selfHasKeyword(Piercing)`. The catalog/IR test checks the exact trigger, inherited marker, target, amount, duration, condition, and `coverage: "full"`/empty residual.

##### Proof and limits

Focused proof has 7 passing tests. It covers native Piercing, the opponent-turn negative, Option-granted Piercing, Tamer-granted Piercing through BT2-088 Taiga (Q867), and a source-less nonmatching peer. The full lifecycle uses public `hatchEgg`, a legal red Lv.2-to-Lv.3 BT6-010 digivolution at cost 0 with the evolution draw, `moveFromBreeding`, then a legal BT6-010-to-BT1-016 red Lv.4 digivolution at printed cost 2 reduced to 1 by Taiga, with its draw and exact underlying stack `[BT1-002, BT6-010]` plus top BT1-016. Taiga supplies Piercing to the real carrier; the carrier is 6000 DP (4000 + 2000), defeats a 5000-DP opposing Digimon, and survives. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-002.test.ts --maxWorkers=1 --no-file-parallelism`; result: 1 file / 7 tests passed, 466ms. No production or engine change; score: 8/10 per worker brief (delivery gates remain with coordinator).

### BT1-003 — Upamon

Score: 8/10. Q868, real lifecycle/mixed board, same-turn OPT refusal and next-own-turn reset; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-003.md` (2026-09-10):

##### Evidence

Catalog (`cards.json`): blue Digi-Egg, Lv.2 In-Training, Amphibian, and inherited `[When Attacking][Once Per Turn] If your opponent has a Digimon with no digivolution cards in play, trigger <Draw 1>.` The only KB result is Q868, which confirms that Digimon in the breeding area are not checked.

##### Implementation map

`BT1-003.ts` registers only via `registerIrCard`. Inherited `WhenAttacking` with `OncePerTurn` draws one for the owner when an opponent battle-area Digimon has zero sources. The catalog/IR test checks the exact trigger, inherited marker, frequency, owner, amount, battle-area zone, Digimon kind, and zero-source filter.

##### Proof and limits

The implementation filter is explicitly `zone: battleArea`, `kind: Digimon`, `digivolutionCards: none`. Five focused tests pass. Direct timing proof covers the first draw and same-turn refusal; a sourced battle-area peer is a negative, and a source-less breeding-area peer is the Q868 negative. The lifecycle uses public `hatchEgg`, legal blue Lv.2-to-Lv.3 BT1-028 digivolution at cost 0 with draw and exact stack `[BT1-003]`, `moveFromBreeding`, then legal Lv.3-to-Lv.4 BT1-032 at cost 2 with its draw and underlying stack `[BT1-003, BT1-028]`. The real carrier attacks the player and draws against a mixed opponent board containing two source-less and one sourced Digimon; a later real attack on the next own turn draws again after the reset, while same-turn refusal is directly asserted. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-003.test.ts --maxWorkers=1 --no-file-parallelism`; result: 1 file / 5 tests passed, 473ms. No production or engine change; score: 8/10 per worker brief (delivery gates remain with coordinator).

### BT1-004 — Wanyamon

Score: 8/10. Q869, real lifecycle/mixed source boundary and turn duration; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-004.md` (2026-09-10):

##### Evidence

Catalog (`cards.json`): blue Digi-Egg, Lv.2 In-Training, Lesser, and inherited `[Your Turn] While your opponent has 2 or more Digimon with no digivolution cards in play, this Digimon gets +2000 DP.` The only KB result is Q869, which confirms that Digimon in the breeding area are not checked.

##### Implementation map

`BT1-004.ts` exclusively calls `registerIrCard`. Inherited `YourTurn` checks opponent battle-area Digimon with `digivolutionCards: none`, minimum count 2, then applies self `ModifyDP +2000` for the turn. The catalog/IR test checks the exact trigger, inherited marker, target, amount, duration, minimum, battle-area zone, kind, and zero-source filter.

##### Proof and limits

Seven focused tests pass. They cover the exact two-source-less boundary, one-source-less negative, opponent-turn negative, Q869 breeding-area negative, and a mixed board where a sourced peer is excluded. The lifecycle uses public `hatchEgg`, legal blue Lv.2-to-Lv.3 BT1-028 digivolution at cost 0 with the evolution draw and exact underlying stack `[BT1-004]`, then `moveFromBreeding`; the real carrier is 5000 DP (3000 + 2000) on the own turn, falls to base 3000 during the opponent's turn, and returns to 5000 on the next own turn. Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-004.test.ts --maxWorkers=1 --no-file-parallelism`; result: 1 file / 7 tests passed, 450ms. No production or engine change; score: 8/10 per worker brief (delivery gates remain with coordinator).

### BT1-005 — Kyaromon

Score: 8/10. real lifecycle/peer stack and explicit legal security threshold fixtures; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-005.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Digi-Egg, yellow, level 2, In-Training/Lesser; inherited text: `[Your Turn] While you have 6 or more security cards, this Digimon gets +2000 DP.` `node tools/kb/query.mjs card BT1-005` returned no KB entries.

##### Implementation map

`apps/api/src/cards/BT1/BT1-005.ts` registers only `registerIrCard("BT1-005", compiled)`. The inherited `YourTurn` effect checks the controller's security zone with `gte 6`, targets exactly the source/self permanent, and applies +2000 DP for the turn. Coverage is `full` with no residual.

##### Behavioral evidence

`BT1-005.test.ts` pins every catalog field and the complete IR record, then proves positive six-security, exact negative five-security, and opponent-turn negative cases. The new lifecycle case uses public intents under the production turn loop: `hatchEgg` removes BT1-005 from the egg deck into breeding, `digivolve` legally places yellow level-3 BT1-045 onto the level-2 egg at cost 0, and `moveFromBreeding` carries the stack into the battle area on the next own turn. The routed carrier gains +2000 DP while an adjacent BT1-045 peer without BT1-005 remains at base DP, proving inherited source identity and the nonmatching peer boundary. No engine seam was changed.

The threshold fixtures use explicit inert BT1-045 Digimon cards in security (six, five, and six cards respectively); no numeric security shorthand or Digi-Egg appears in a security zone.

##### Peer/stack review and score

Self-reference and inherited-effect shape are consistent with neighboring Digi-Egg implementations. The existing evolution-stack fixture proves source visibility through the host stack. No unresolved ambiguity or unsupported clause identified. Provisional audit score: 8/10 pending required test gates.

Focused test before numeric-fixture correction: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-005.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file passed, 5 tests passed, duration 438ms (2026-09-09 23:12:55). The post-correction rerun is pending the coordinator resource gate. Prior `oxlint`, `oxfmt --check`, and `git diff --check` passed; package `tsc --noEmit -p tsconfig.json` remains blocked by pre-existing workspace TS6305 errors because `packages/shared/dist/index.d.ts` has not been built, plus unrelated implicit-any errors. Final score: 8/10 (collection/typecheck gates not run by instruction).

### BT1-006 — Cupimon

Score: 8/10. real lifecycle/peer draw proof and explicit legal security threshold fixtures; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-006.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Digi-Egg, yellow, level 2, In-Training/Mini Angel; inherited text: `[When Attacking] If you have 5 or more security cards, trigger <Draw 1> (Draw 1 card from your deck).` `node tools/kb/query.mjs card BT1-006` returned no KB entries.

##### Implementation map

`BT1-006.ts` exclusively registers `registerIrCard("BT1-006", compiled)`. Its inherited `WhenAttacking` effect checks the attacking Digimon's controller security count with `gte 5`, then performs one draw for that controller. Coverage is `full`; residual is empty.

##### Behavioral evidence

`BT1-006.test.ts` pins every catalog field and the complete IR record, then proves the positive five-security draw and exact four-security negative, including observable hand/deck and security outcomes after attack resolution. The new lifecycle case uses public intents under the production turn loop: `hatchEgg` moves BT1-006 into breeding, `digivolve` legally places yellow level-3 BT1-045 onto the level-2 egg at cost 0, and `moveFromBreeding` carries the stack into the battle area on the next own turn. The routed carrier's attack draws the marked deck card while an adjacent BT1-045 peer without Cupimon attacks a suspended Digimon and leaves the hand unchanged, proving inherited source identity and the nonmatching peer boundary. No engine seam was changed.

The threshold fixtures use explicit inert BT1-045 Digimon cards in security (five and four cards respectively); no numeric security shorthand or Digi-Egg appears in a security zone.

##### Peer/stack review and score

The trigger/controller/count semantics match neighboring inherited draw effects. The stack fixture is realistic and preserves the egg as inherited source. No unresolved ambiguity or engine seam identified. Provisional audit score: 8/10 pending required test gates.

Focused test before numeric-fixture correction: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-006.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file passed, 4 tests passed, duration 466ms (2026-09-09 23:13:01). The post-correction rerun is pending the coordinator resource gate. Prior `oxlint`, `oxfmt --check`, and `git diff --check` passed; package `tsc --noEmit -p tsconfig.json` remains blocked by pre-existing workspace TS6305 errors because `packages/shared/dist/index.d.ts` has not been built, plus unrelated implicit-any errors. Final score: 8/10 (collection/typecheck gates not run by instruction).

### BT1-007 — Tanemon

Score: 8/10. real lifecycle/peer stack, Q870 breeding negative and Q871 Jagamon natural evolution; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-007.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Digi-Egg, green, level 2, In-Training/Bulb; inherited text: `[When Attacking] If you've digivolved this turn, this Digimon gets +1000 DP for the turn.` KB query returned Q870 and Q871. Q870 rules out breeding-area digivolution; Q871 confirms a battle-area digivolution created by BT1-078 Jagamon counts.

##### Implementation map

`BT1-007.ts` exclusively registers `registerIrCard("BT1-007", compiled)`. The inherited `WhenAttacking` effect uses `youDigivolvedThisTurn`, targets the source/self, and applies +1000 with `forTheTurn`. Coverage is `full`; residual is empty.

##### Behavioral evidence

`BT1-007.test.ts` pins every catalog field and the complete IR record. A normal battle-area evolution positive remains covered, while the Q870 negative now uses the production turn loop: `hatchEgg` and a legal green level-3 BT1-068 digivolution occur in the breeding area, then a separate battle-area host carrying Tanemon attacks through a public `attack` intent and remains at base DP. This observes that a breeding-area evolution does not satisfy the inherited condition. The Q871 positive uses a natural BT1-078 Jagamon attack effect to perform the battle-area evolution and observes the inherited +1000 DP. A further lifecycle case proves `hatchEgg` -> breeding digivolve -> `moveFromBreeding`, then legal level-4/level-5 battle-area evolution into Jagamon, with the Tanemon carrier gaining +1000 while an adjacent green BT1-068 peer without Tanemon remains unchanged. No engine seam was changed.

##### Peer/stack review and score

The tests include a realistic inherited stack and the relevant BT1-078 interaction. No unresolved ambiguity or engine seam identified. Provisional audit score: 8/10 pending required test gates.

Focused test: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-007.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file passed, 5 tests passed, duration 491ms (2026-09-09 23:13:07). `oxlint`, `oxfmt --check`, and `git diff --check` passed for assigned files. Package `tsc --noEmit -p tsconfig.json` is blocked by pre-existing workspace TS6305 errors because `packages/shared/dist/index.d.ts` has not been built, plus unrelated implicit-any errors; no assigned-file diagnostic was identified. Final score: 8/10 (collection/typecheck gates not run by instruction).

### BT1-008 — Frimon

Score: 8/10. real lifecycle/peer stack and exact suspended-opponent boundary; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-008.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Digi-Egg, green, level 2, In-Training/Lesser; inherited text: `[Your Turn] While your opponent has 2 or more suspended Digimon in play, this Digimon gets +2000 DP.` `node tools/kb/query.mjs card BT1-008` returned no KB entries.

##### Implementation map

`BT1-008.ts` exclusively registers `registerIrCard("BT1-008", compiled)`. The inherited `YourTurn` effect requires at least two opponent Digimon in the battle area with `suspended: true`, targets self, and applies +2000 DP for the turn. Coverage is `full`; residual is empty.

##### Behavioral evidence

`BT1-008.test.ts` pins every catalog field and the complete IR record, then proves the positive two-suspended boundary, one-suspended negative, opponent-turn negative, and breeding-area exclusion. The new lifecycle case uses the production turn loop and public intents: `hatchEgg` moves BT1-008 into breeding, `digivolve` legally places green level-3 BT1-068 onto it at cost 0, and `moveFromBreeding` carries the stack into the battle area on the next own turn. After the two opposing Digimon are legally suspended for the observable test setup, the routed carrier gains +2000 DP while an adjacent BT1-068 peer without Frimon remains at base DP. No engine seam was changed.

##### Peer/stack review and score

The opponent ownership, Digimon kind, battle-area zone, suspension, and count filter are explicit and consistent with neighboring board-state filters. No unresolved ambiguity or engine seam identified. Provisional audit score: 8/10 pending required test gates.

Focused test: `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-008.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file passed, 6 tests passed, duration 445ms (2026-09-09 23:13:17). `oxlint`, `oxfmt --check`, and `git diff --check` passed for assigned files. Package `tsc --noEmit -p tsconfig.json` is blocked by pre-existing workspace TS6305 errors because `packages/shared/dist/index.d.ts` has not been built, plus unrelated implicit-any errors; no assigned-file diagnostic was identified. Final score: 8/10 (collection/typecheck gates not run by instruction).

### BT1-009 — Monodramon

Score: 8/10. legal red evolution route/cost/draw/stack and invalid-color peer; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-009.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Monodramon is a
red level-3 Digimon (Rookie, Vaccine, Mini Dragon), 2 play cost, 3000 DP, with
one red level-2 evolution route costing 0 memory. It has no effect or inherited
effect text. `node tools/kb/query.mjs card BT1-009` returned no KB entries; no
errata or restriction applies.

##### Implementation map

`BT1-009.ts` exports an empty compiled effect list with `coverage: "full"` and
`residual: []`, and registers behavior only through
`registerIrCard("BT1-009", compiled)`. There is no handwritten registration,
trigger, target, cost, or optional branch to audit.

##### Behavioral evidence

`BT1-009.test.ts` now pins the catalog fields and exact empty IR shape. The
play route observes payment of 2 memory and the 3000-DP body. The legal
evolution route uses a red level-2 BT1-001, pays the printed 0 memory, draws
the post-evolution card, and preserves the BT1-001 source in the stack. A
non-red level-2 BT1-007 is rejected as `invalid-evolution`.

The route is a real level-2-to-level-3 stack rather than an isolated permanent;
there are no inherited, security, once-per-turn, trait-filter, or effect-stack
clauses on this card. No engine seam or production card code required a change.

##### Peer review and score

The red Rookie/evolution shape is consistent with neighboring BT1 red level-3
Digimon. No ambiguity or unsupported behavior was identified. Focused Vitest
passed: worker run `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-009.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests, 551ms (2026-09-09 23:37:40). Coordinator acceptance rerun: 4 files, 20 tests, 497ms. Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-010 — Agumon

Score: 8/10. Q872/Q873 search boundaries, legal evolution stack and non-red Tamer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-010.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Agumon is a red
level-3 Digimon (Rookie, Vaccine, Reptile), 3 play cost, 2000 DP, with a red
level-2 evolution route costing 0 memory. Its full effect is: `[On Play]
Reveal 5 cards from the top of your deck. Add 1 Tamer card among them to your
hand. Place the remaining cards at the bottom of your deck in any order.`

The local KB query returned Q872 and Q873. Q872 confirms the added Tamer need
not be red. Q873 confirms the effect may be activated with 4 or fewer deck
cards and reveals as many as possible. No errata or restriction applies.

##### Implementation map

`BT1-010.ts` registers exclusively via `registerIrCard("BT1-010", compiled)`.
Its `OnPlay` `RevealAdd` reveals exactly 5, filters the add candidate by
`kind: ["Tamer"]` without a color restriction, adds one to hand, and places
the remainder at the deck bottom in player-selected order. Coverage is
`full` and residual is empty. Digivolution does not dispatch the `OnPlay`
trigger.

##### Behavioral evidence

`BT1-010.test.ts` now pins all catalog fields and the exact IR record. Existing
focused cases prove a non-red BT1-086 Tamer is added, a deck with fewer than
five cards is handled by revealing all available cards, all non-Tamers return
to the bottom when no Tamer is revealed, and the remaining cards can be
ordered. The legal red level-2 evolution route observes the printed 0 memory,
preserves the source card under Agumon, draws the normal evolution card, and
does not execute the On Play effect.

The fixtures use ordinary cards in deck and hand; no numeric security
shorthand or Digi-Egg is used in an invalid zone. No engine seam or production
card code required a change.

##### Peer review and score

The reveal/add/bottom-order IR shape matches neighboring reveal effects and
the Q872/Q873 boundaries. No ambiguity or unsupported clause was identified.
Focused Vitest passed: worker run `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-010.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 6 tests, 450ms (2026-09-09 23:37:55). Coordinator acceptance rerun: 4 files, 20 tests, 497ms. Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-011 — Agumon Expert

Score: 8/10. Q874 name-token recovery boundary and legal evolution stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-011.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Agumon Expert is
a red level-3 Digimon (Rookie, Vaccine, Dinosaur), 3 play cost, 1000 DP, with
a red level-2 evolution route costing 0 memory. Its full effect is: `[On Play]
Return 1 Digimon card with [Agumon] in its name from your recycle bin to your
hand.`

The local KB query returned Q874, which confirms that the name check includes
cards whose names contain Agumon and is not limited to an exact-name match. No
errata or restriction applies.

##### Implementation map

`BT1-011.ts` registers exclusively via `registerIrCard("BT1-011", compiled)`.
The `OnPlay` `Return` action targets exactly one card controlled by the player,
in that player's trash, with kind `Digimon` and a name containing the token
`Agumon`, moving it to hand. Coverage is `full` and residual is empty.

##### Behavioral evidence

`BT1-011.test.ts` now pins all catalog fields and the exact IR record. Focused
cases prove returning a normal BT1-010, Q874's longer-name BT6-018 Agumon Bond
card, and refusal to return an Agumon-named non-Digimon or an unrelated
Digimon. A legal red level-2 BT1-001 evolution observes the 0-memory cost,
preserves the source in the stack, draws the normal evolution card, and does
not fire the On Play recovery (the eligible Agumon remains in trash).

The target filter explicitly scopes controller, zone, card kind, and name;
there is no inherited, security, once-per-turn, or optional clause. No engine
seam or production card code required a change.

##### Peer review and score

The name-token filter follows the Q874 ruling and neighboring trash-recovery
effects. No ambiguity or unsupported behavior was identified. Focused Vitest
passed: worker run `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-011.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 5 tests, 475ms (2026-09-09 23:38:10). Coordinator acceptance rerun: 4 files, 20 tests, 497ms. Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-012 — Biyomon

Score: 8/10. Q875-Q877 duration/source-loss/block boundaries and legal evolution stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-012.md` (2026-09-10):

##### Catalog and KB

Catalog source: `packages/shared/src/cards/data/cards.json`. Biyomon is a red
level-3 Digimon (Rookie, Vaccine, Bird), 3 play cost, 2000 DP, with a red
level-2 evolution route costing 0 memory. Its inherited text is `[Your Turn]
When this Digimon is blocked, it gets +2000 DP.`

The local KB query returned Q875-Q877. Q875 establishes that the boost lasts
through the end of the turn. Q876 establishes that trashing this card from
the evolution cards immediately removes the boost. Q877 establishes that the
trigger requires an actual block redirecting a Digimon-vs-Digimon attack; it
does not trigger merely when attacking an opponent's Digimon or when a player
attack is not blocked. No errata or restriction applies.

##### Implementation map

`BT1-012.ts` registers exclusively via `registerIrCard("BT1-012", compiled)`.
The inherited `WhenBlocked` trigger is gated by `isYourTurn` and applies a
source-bound `ModifyDP +2000` to self for the turn. The explicit source-bound
flag ensures the boost disappears when this evolution card leaves the stack.
Coverage is `full` and residual is empty.

##### Behavioral evidence

`BT1-012.test.ts` now pins all catalog fields and the exact IR record. It proves
no boost on an unblocked player attack, +2000 after an actual block during the
controller's turn, and immediate loss of the boost when Biyomon is trashed from
the stack. An attempted opponent-turn negative was removed because a Digimon
can only attack during its controller's turn; it was an invalid fixture rather
than an applicable card boundary.
The multi-step legal route starts at red level-2 BT1-001, evolves through
Biyomon at 0 memory, then a red level-4 BT1-016 at its printed cost, preserving
the source and inherited trigger through the stack before an actual block.

The positive and negative attack fixtures use an ordinary BT1-072 Blocker and
observable battle resolution. There is no main, Security, or optional effect;
the only duration is the printed turn duration. No engine seam or production
card code required a change.

##### Peer review and score

The `WhenBlocked`/turn-gated/source-bound shape matches inherited DP effects and
the Q875-Q877 rulings. No ambiguity or unsupported behavior was identified.
Focused Vitest passed: worker run `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-012.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 5 tests, 523ms (2026-09-09 23:40:14). Coordinator acceptance rerun: 4 files, 20 tests, 497ms. The earlier 5/6 run failed only on the removed impossible fixture. Smell, Oxfmt, and `git diff --check` are clean. Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-013 — Muchomon

Score: 8/10. exact route/color/level/stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-013.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Muchomon as a red level-3 Digimon (Rookie,
Data, Avian), 3 play cost, 5000 DP, with one red level-2 evolution requirement
costing 1 memory. It has no main, inherited, or Security text. The record is
rarity C, max 4 copies, image `BT1-013`, Japanese name `ムーチョモン`.

`node tools/kb/query.mjs card BT1-013` returned no card-specific Q&A entries.
The applicable comprehensive rules are 8-1-3-1 through 8-1-3-3 (reveal a
Digimon, choose a field card meeting the requirement, pay the printed cost,
place it on top, and draw 1) and 8-1-2-6 (an illegal or unaffordable revealed
card returns without moving memory). Rules 4-3-1 through 4-3-3 explain that a
Digi-Egg placed on the field is treated as a Digimon and that a host gains
inherited effects from cards under it.

##### Implementation and proof map

`BT1-013.ts` exports an empty `CompiledCard` with `coverage: "full"` and no
residual, and registers it exclusively with `registerIrCard("BT1-013", compiled)`.
That is the complete executable representation because the catalog has no
effect text. There is no `registerCard` or `@ts-nocheck` in the assigned files.

`BT1-013.test.ts` now pins every catalog field and the exact empty IR. It also
covers the 3-memory play/5000-DP boundary, a legal red level-2 evolution at
exactly 1 memory with the normal evolution draw and source transition, a
non-red level-2 rejection, and a red level-3 rejection. The evolution fixtures
use BT1-001 as a field Digi-Egg and keep ordinary cards in the deck; no
Digi-Egg is placed in deck or Security.

##### Peer/stack review and score

The evolution requirement and no-effect shape match BT1-009 and BT1-014. The
tests prove the exact level and color gate, memory payment, draw, and stack
transition. No unresolved card ambiguity or engine seam was found. Focused
command:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-013.test.ts --maxWorkers=1 --no-file-parallelism`

Focused result: `1 file passed, 5 tests passed, 501ms` (2026-09-09 23:52:12)
with `--maxWorkers=1 --no-file-parallelism`. File-scoped Oxlint, Oxfmt
`--check`, fixture-smell scan, and `git diff --check`/trailing-whitespace scan
passed. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-014 — Kokatorimon

Score: 8/10. exact route/color/level/stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-014.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Kokatorimon as a red level-4 Digimon
(Champion, Data, Giant Bird), 3 play cost, 4000 DP, with one red level-3
evolution requirement costing 2 memory. It has no main, inherited, or Security
text. The record is rarity C, max 4 copies, image `BT1-014`, Japanese name
`コカトリモン`.

`node tools/kb/query.mjs card BT1-014` returned no card-specific Q&A entries.
The applicable comprehensive rules are 8-1-3-1 through 8-1-3-3 (the standard
evolution declaration, exact payment, top placement, and draw) and 8-1-2-6
(illegal or unaffordable evolution does not move memory). Rules 4-3-1 through
4-3-3 cover Digimon treatment of a field Digi-Egg and source cards under a
Digimon.

##### Implementation and proof map

`BT1-014.ts` exports an empty `CompiledCard` with `coverage: "full"` and no
residual, and registers it exclusively with
`registerIrCard("BT1-014", compiled)`. This fully represents the catalog's
absence of effect text. There is no `registerCard` or `@ts-nocheck` in the
assigned files.

`BT1-014.test.ts` now pins every catalog field and the exact empty IR. It covers
the 3-memory play/4000-DP boundary, a legal red level-3 evolution at exactly 2
memory with the normal evolution draw and source transition, a non-red level-3
rejection, and a red level-2 rejection. Deck fixtures contain only ordinary
main-deck cards; no Digi-Egg appears in deck or Security.

##### Peer/stack review and score

The standard evolution and no-effect representation match BT1-009 and
BT1-013. The tests prove exact level/color requirements, payment, draw, and
stack transition. No unresolved card ambiguity or engine seam was found.
Focused command:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-014.test.ts --maxWorkers=1 --no-file-parallelism`

Focused result: `1 file passed, 5 tests passed, 463ms` (2026-09-09 23:52:23)
with `--maxWorkers=1 --no-file-parallelism`. File-scoped Oxlint, Oxfmt
`--check`, fixture-smell scan, and `git diff --check`/trailing-whitespace scan
passed. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-015 — Greymon

Score: 8/10. persistent inherited DP duration fixed with genuine reverted-red/restored-green mutation proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-015.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Greymon as a red level-4 Digimon (Champion,
Vaccine, Dinosaur), 4 play cost, 4000 DP, with one red level-3 evolution
requirement costing 2 memory. Its complete inherited text is `[Your Turn] This
Digimon gets +2000 DP.` The record is rarity U, max 4 copies, image `BT1-015`,
Japanese name `グレイモン`; it has no main, regular, or Security effect text.

`node tools/kb/query.mjs card BT1-015` returned no card-specific Q&A entries.
The applicable comprehensive rules are 15-3-1 through 15-3-3 (inherited
effects are gained from cards under a Digimon and remain effects of the source
card when text says “this card”), 15-8-2-1 through 15-8-2-3 (persistent effects
are continuously active only while their conditions are met), 15-16-8-1
(`Your Turn` timing), and 8-1-3-1 through 8-1-3-3 (standard evolution and its
draw/payment procedure).

##### Implementation and proof map

`BT1-015.ts` registers exclusively with `registerIrCard("BT1-015", compiled)`.
The IR has one inherited `YourTurn` effect and one self-bound `ModifyDP` of
`+2000` with `permanent` duration. `isSelfRef` plus `isSelf` keeps the effect
on the current evolution host rather than an adjacent Digimon. Coverage is
`full` and residual is empty; no `registerCard` or `@ts-nocheck` is present.

`BT1-015.test.ts` pins every catalog field and the exact IR shape. A MetalGreymon
host carrying Greymon is 9000 DP on its controller's turn and 7000 DP on the
opponent's turn. A turn transition back to the controller re-enables the boost.
The legal red level-5-to-level-6 route into BT1-025 pays the printed 3 memory,
draws the evolution card, preserves Greymon in the stack, and keeps the
inherited +2000 visible on the 11000-DP WarGreymon (13000 DP total).

##### Peer/stack review and score

The inherited source-bound shape matches BT1-012's turn-gated inherited DP
effect and neighboring `ModifyDP` cards. The stack proof checks source
identity, top-card transition, payment, draw, and persistent turn ownership.
No unresolved ambiguity or engine seam was found. Focused command:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-015.test.ts --maxWorkers=1 --no-file-parallelism`

Focused result after the correction: `1 file passed, 5 tests passed, 435ms`
(2026-09-09 23:52:40) with `--maxWorkers=1 --no-file-parallelism`. The
required mutation proof reverted only the production duration to `forTheTurn`
while leaving the test's expected `permanent` persistence shape unchanged;
Vitest then reported `1 failed | 4 passed`, with the exact diff
`Expected duration: "permanent" / Received duration: "forTheTurn"` at the IR
assertion. Restoring the production duration to `permanent` produced the green
5/5 result above. This is a genuine red/green proof of the correction, not a
claim based only on source inspection. File-scoped Oxlint, Oxfmt `--check`,
fixture-smell scan, and `git diff --check`/trailing-whitespace scan passed.
Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-016 — Tyrannomon

Score: 8/10. exact evolution stack and route proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-016.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Tyrannomon as a red level-4 Digimon
(Champion, Data, Dinosaur), 4 play cost, 4000 DP, with one red level-3
evolution requirement costing 2 memory. Its complete regular text is
`＜Jamming＞ (This Digimon can't be deleted in battles against Security
Digimon.)`; it has no inherited or Security text. The record is rarity R, max 4
copies, image `BT1-016`, Japanese name `ティラノモン`.

`node tools/kb/query.mjs card BT1-016` returned no card-specific Q&A entries.
The local rules index entry `comprehensive-0227` (§16-9) defines Jamming as a
persistent keyword that prevents deletion from a battle with an opponent's
Security Digimon. Comprehensive 13-1-8-3-1 defines the Security Digimon battle
after a check; 14-2 supplies ordinary battle deletion. Rules 15-8-2-1 through
15-8-2-3 explain the persistent keyword timing, and 4-3-2/4-3-3 explain why a
regular effect on an under-card is not automatically inherited.

##### Implementation and proof map

`BT1-016.ts` registers exclusively with `registerIrCard("BT1-016", compiled)`.
Its static keyword-only IR publishes Jamming on Tyrannomon itself. It has no
`isInherited` flag, so a host whose top card is another Digimon does not gain
the keyword. Coverage is `full` and residual is empty; no `registerCard` or
`@ts-nocheck` is present.

`BT1-016.test.ts` pins every catalog field and the exact keyword IR. It observes
Jamming on a standalone Tyrannomon, then performs a losing security battle
against stronger BT1-081 and confirms the attacker survives after the security
card leaves the stack. A separate stronger ordinary Digimon battle confirms
Jamming is not a general battle shield. A Groundramon host carrying Tyrannomon
proves the regular (non-inherited) keyword is not visible through an evolution
stack.

##### Peer/stack review and score

The behavior matches the printed Jamming peer BT1-069 and the engine's
`comprehensive-0227` security-battle contract. The tests cover the Security vs
ordinary battle boundary and the source-card visibility boundary. No unresolved
card ambiguity or engine seam was found. Focused command:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-016.test.ts --maxWorkers=1 --no-file-parallelism`

Focused result: `1 file passed, 5 tests passed, 398ms` (2026-09-09 23:52:50)
with `--maxWorkers=1 --no-file-parallelism`. File-scoped Oxlint, Oxfmt
`--check`, fixture-smell scan, and `git diff --check`/trailing-whitespace scan
passed. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-017 — Birdramon

Score: 8/10. turn-expiry and peer/evolution proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-017.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Birdramon as a red level-4 Digimon
(Champion, Vaccine, Giant Bird), 4 play cost, 4000 DP, with one red level-3
evolution requirement costing 2 memory. Its only regular effect is
`[On Play] 1 of your Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card) for the turn.`
It has no inherited or Security text. The record is rarity U, max 4 copies,
image `BT1-017`, Japanese name `バードラモン`.

`node tools/kb/query.mjs card BT1-017` returned Q878, Q879, and Q880. Q878
confirms the granted keyword remains when Birdramon leaves the battle area;
Q879 confirms Birdramon itself is a legal target; and Q880 confirms the
target retains the keyword through digivolution. Comprehensive rules 16-4-1
and 16-4-2 define the additional security check and its persistent timing;
15-8-2-2 and 15-8-2-3 define activation while the condition is met and its
immediate loss when a duration or condition ends. Rules 7-1-3 and 8-1-3
cover the play/evolution payment and stack transition.

##### Implementation and proof map

`BT1-017.ts` registers exclusively with
`registerIrCard("BT1-017", compiled)`. Its `OnPlay` IR selects exactly one
of the controller's Digimon, grants `SecurityAttack` +1, and marks the grant
`forTheTurn`. The target is not marked `isSelf`, so both another Digimon and
Birdramon itself are selectable. Coverage is `full` with an empty residual;
there is no `registerCard` or `@ts-nocheck` in the assigned files.

`BT1-017.test.ts` pins all catalog fields and the exact compiled IR. It proves
the positive target path, the Q879 self-target path, end-of-turn expiry, and
the Q878/Q880 lifecycle path where Birdramon leaves and the selected Digimon
then evolves while retaining the grant. The evolution fixture uses a legal
red level-3 source and checks the resulting observable keyword amount.

##### Peer/stack review and score

The target shape matches the one-Digimon `GainKeyword` effects used by nearby
BT1 option/card implementations, while the persistent keyword timing follows
rules 16-4 and 15-8-2. No shared-trait filter, inherited clause, or engine seam
is applicable. No unresolved ambiguity was found.

Focused Vitest passed: 1 file, 5 tests, 567 ms total (2026-09-09), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-017.test.ts --maxWorkers=1 --no-file-parallelism`

Static `git diff --check` is reported separately to the coordinator. Worker
score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-018 — Flarerizamon

Score: 8/10. dynamic memory boundary and legal fixtures; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-018.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Flarerizamon as a red level-4 Digimon
(Champion, Data, Fire Dragon), 5 play cost, 4000 DP, with one red level-3
evolution requirement costing 2 memory. Its only regular effect is
`[Your Turn] While you have 3 or more memory， this Digimon gains ＜Security Attack +1＞. (This Digimon checks 1 additional security card.)`
It has no inherited or Security text. The record is rarity C, max 4 copies,
image `BT1-018`, Japanese name `フレアリザモン`.

`node tools/kb/query.mjs card BT1-018` returned Q881. It confirms that when
the memory gauge falls from 3 to 1 during the first security check, the card
loses `Security Attack +1` and cannot perform the second check. Comprehensive
rules 15-8-2-1 through 15-8-2-3 and 15-8-2-6-1/2 define persistent effects
with processing conditions; 16-4-1 and 16-4-2 define the modified security
check and its persistent timing. Rules 13-1-3, 13-1-8-2, and 13-1-8-5
require security checks to resolve one at a time and reevaluate whether a
remaining check is possible.

##### Implementation and proof map

`BT1-018.ts` registers exclusively with
`registerIrCard("BT1-018", compiled)`. Its `YourTurn` IR targets only the
self-referenced Flarerizamon, grants `SecurityAttack` +1 for the turn, and
uses `memoryAtLeast` 3 from the controller's perspective. Coverage is `full`
with an empty residual; there is no `registerCard` or `@ts-nocheck` in the
assigned files.

`BT1-018.test.ts` pins all catalog fields and the exact IR, then proves the
3-memory inclusive boundary, the 2-memory negative boundary, continuous loss
and regain as memory crosses the boundary, and opponent-turn exclusion. The
Q881 Hammer Spark security fixture proves that only the first check resolves
when memory drops below 3. A legal red level-3-to-level-4 evolution fixture
also verifies the gate on the newly evolved top card and normal evolution
draw/source transition.

##### Peer/stack review and score

The conditional self-target shape matches nearby BT1 `YourTurn` memory-gated
cards, and the Security Attack behavior follows rules 15-8-2 and 16-4. No
inherited or trait-filter clause is applicable, and no engine seam or
unresolved ambiguity was found.

Focused Vitest passed: 1 file, 7 tests, 480 ms total (2026-09-10), with
`--maxWorkers=1 --no-file-parallelism`.

The security-order fixture uses registered vanilla main-deck BT1-019 behind
ST2-13; no Digi-Egg is placed in Security.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-018.test.ts --maxWorkers=1 --no-file-parallelism`

Static `git diff --check` is reported separately to the coordinator. Worker
score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-019 — DarkTyrannomon

Score: 8/10. exact legal evolution stack and level/color negatives; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-019.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies DarkTyrannomon as a red level-4 Digimon
(Champion, Virus, Dinosaur), 6 play cost, 6000 DP, with one red level-3
evolution requirement costing 1 memory. It has no regular, inherited, or
Security text. The record is rarity C, max 4 copies, image `BT1-019`, Japanese
name `ダークティラノモン`.

`node tools/kb/query.mjs card BT1-019` returned no card-specific Q&A entries.
The applicable comprehensive rules are 2-5-1/2 (DP is used for battle and
modified DP is observable), 2-6-1 (play cost), 7-1-3-1 through 7-1-3-3
(declare, pay, and place a card), and 8-1-3-1 through 8-1-3-3 (choose a legal
evolution source, pay the requirement, stack, and draw). Rules 8-1-2-6 and
8-1-2-8 cover illegal/unaffordable evolution and evolution when a draw is not
possible.

##### Implementation and proof map

`BT1-019.ts` registers exclusively with
`registerIrCard("BT1-019", compiled)`. Its empty compiled effect list is the
complete executable representation because the catalog has no effect text.
Coverage is `full` with an empty residual; there is no `registerCard` or
`@ts-nocheck` in the assigned files.

`BT1-019.test.ts` pins all catalog fields and the exact empty IR. It proves
playing at the exact 6-memory cost with 6000 DP, a legal red level-3-to-level-4
evolution at the exact 1-memory cost including draw and source stack identity,
and illegal green-level-3 and red-level-2 routes. No Digi-Egg is placed in a
deck or Security fixture.

##### Peer/stack review and score

The no-effect module and ordinary red evolution route match nearby vanilla
BT1 Champion peers. The stack assertions verify the top-card identity, source
card preservation, memory payment, draw, and DP. No trait filter, inherited
effect, or engine seam is applicable; no ambiguity was found.

Focused Vitest passed: 1 file, 5 tests, 420 ms total (2026-09-09), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-019.test.ts --maxWorkers=1 --no-file-parallelism`

Static `git diff --check` is reported separately to the coordinator. Worker
score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-020 — Groundramon

Score: 8/10. exact legal evolution stack and level/color negatives; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-020.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Groundramon as a red level-5 Digimon
(Ultimate, Virus, Earth Dragon), 5 play cost, 6000 DP, with one red level-4
evolution requirement costing 2 memory. It has no regular, inherited, or
Security text. The record is rarity U, max 4 copies, image `BT1-020`, Japanese
name `グラウンドラモン`.

`node tools/kb/query.mjs card BT1-020` returned no card-specific Q&A entries.
The applicable comprehensive rules are 2-5-1/2 (DP is used for battle and
modified DP is observable), 2-6-1 (play cost), 7-1-3-1 through 7-1-3-3
(declare, pay, and place a card), and 8-1-3-1 through 8-1-3-3 (choose a legal
evolution source, pay the requirement, stack, and draw). Rules 8-1-2-6 and
8-1-2-8 cover illegal/unaffordable evolution and evolution when a draw is not
possible.

##### Implementation and proof map

`BT1-020.ts` registers exclusively with
`registerIrCard("BT1-020", compiled)`. Its empty compiled effect list is the
complete executable representation because the catalog has no effect text.
Coverage is `full` with an empty residual; there is no `registerCard` or
`@ts-nocheck` in the assigned files.

`BT1-020.test.ts` pins all catalog fields and the exact empty IR. It proves
playing at the exact 5-memory cost with 6000 DP, a legal red level-4-to-level-5
evolution at the exact 2-memory cost including draw and source stack identity,
an insufficient-memory play negative, and illegal green-level-4 and red-
level-3 evolution routes. No Digi-Egg is placed in a deck or Security fixture.

##### Peer/stack review and score

The no-effect module and ordinary red evolution route match nearby vanilla
BT1 Ultimate peers. The stack assertions verify the top-card identity, source
card preservation, memory payment, draw, and DP. No trait filter, inherited
effect, or engine seam is applicable; no ambiguity was found.

Focused Vitest passed: 1 file, 6 tests, 469 ms total (2026-09-09), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-020.test.ts --maxWorkers=1 --no-file-parallelism`

Static `git diff --check` is reported separately to the coordinator. Worker
score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-021 — MetalGreymon

Score: 8/10. Q882/Q883/Q1080/Q1087/Q1097 natural turn/prevention proof and clean legal fixtures; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-021.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies MetalGreymon as a red level-5 Digimon
(Ultimate, Vaccine, Cyborg), with play cost 6, 7000 DP, and one red level-4
evolution requirement costing 3 memory. Its only text is
`[When Attacking] Gain 3 memory. At end of turn， lose 3 memory.` There is no
inherited or Security text. The record is rarity U, max 4 copies, image
`BT1-021`, Japanese name `メタルグレイモン`.

`node tools/kb/query.mjs card BT1-021` returned Q882, Q883, Q942, Q1080,
Q1087, and Q1097. Q882 confirms the delayed loss still occurs if this
Digimon is deleted after the attack effect activates. Q883 confirms that
passing after the +3 moves the gauge to the opponent and the delayed -3 moves
it a further 3. Q1080/Q1087/Q1097 confirm that a memory-gain prevention effect
can stop the gain while a specified loss still applies. Q942 is a related
name-matching ruling about another MetalGreymon effect and does not apply to
this card's printed clauses. Comprehensive rules 2-5-1/2 and 2-6-1 cover DP
and costs; 8-1-3-1 through 8-1-3-3 cover the legal evolution stack and draw;
11-1-3 through 11-1-1-5 and 15-16-5-1 define attack timing; and 18-1-1/2
defines the end-of-turn loss as pending processing.

##### Implementation and proof map

`BT1-021.ts` registers exclusively with
`registerIrCard("BT1-021", compiled)`. Its `WhenAttacking` IR gains exactly 3
memory and installs exactly one end-of-owner-turn `GainMemory` action of -3.
Coverage is `full` with an empty residual; there is no `registerCard` or
`@ts-nocheck` in the assigned files. The shared interpreter explicitly makes
the delayed watcher anchor-less, so it survives source deletion as required by
Q882, and bounds it to the owning seat's turn end.

`BT1-021.test.ts` proves the gain on attack, ordinary delayed loss, delayed
loss after Security deletion through a real `runOneTurn()` end-of-turn (Q882),
Q883 pass/gauge behavior through the real turn loop, a legal red level-4
evolution with exact 3-memory payment, draw, and retained stack identity, and
an illegal green level-4 evolution. A BT3-046 Terriermon peer fixture also
proves Q1080/Q1087/Q1097 naturally: the Digimon gain is prevented, but the
specified delayed -3 still resolves at the real turn end. The direct
`fireTiming` checks are retained as supplemental probes only.
All deck and Security fixtures use main-deck cards; no Digi-Egg is used.

##### Peer/stack review and score

The IR matches the identical delayed-memory pattern used by BT1-040, BT1-058,
and BT1-075. The evolution proof uses the same legal red level-4 route as
nearby BT1 Ultimate peers and checks the source card remains under the new top
card. No trait filter, inherited clause, Security effect, optional choice, or
once-per-turn identity is applicable. No engine seam or unresolved ambiguity
was found.

Focused Vitest passed: 1 file, 7 tests, 461 ms total (2026-09-10), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-021.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
fixture/timing/registration/`@ts-nocheck` scans and `git diff --check` passed;
the two direct `fireTiming(OnEndTurn)` probes remain supplemental timing
checks, while the Security-deletion, pass, and prevention scenarios provide
non-injected real-turn proof.
Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-022 — Garudamon

Score: 8/10. Q884 block redirection, Piercing and legal evolution stack with corrected fixtures; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-022.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Garudamon as a red level-5 Digimon
(Ultimate, Vaccine, Birdkin), with play cost 7, 7000 DP, and one red level-4
evolution requirement costing 3 memory. Its regular text is
`＜Piercing＞ (When this Digimon attacks and deletes an opponent's Digimon and
survives the battle， it performs any security checks it normally would.)` and
its inherited text is `[Your Turn] When this Digimon is blocked， trigger
＜Draw 1＞. (Draw 1 card from your deck.)` There is no Security text. The
record is rarity SR, max 4 copies, image `BT1-022`, Japanese name `ガルダモン`.

`node tools/kb/query.mjs card BT1-022` returned Q884. It confirms that the
inherited effect does not activate merely when attacking an opponent's
Digimon; it activates only after the attack target changes to a blocking
opponent's Digimon. Comprehensive rules 4-3-3 covers inherited effects;
8-1-3-1 through 8-1-3-3 cover the legal evolution stack and draw;
11-1-3/4 and 12-1-1/7 cover block target switching; 16-7-1 through 16-7-6
define mandatory Piercing security processing; and 16-8-1 through 16-8-3
define mandatory Draw 1.

##### Implementation and proof map

`BT1-022.ts` registers exclusively with
`registerIrCard("BT1-022", compiled)`. The compiled card has a Static
Piercing keyword and an inherited `WhenBlocked` trigger gated by
`isYourTurn`, drawing exactly one card for the owning player. Coverage is
`full` with an empty residual; there is no `registerCard` or `@ts-nocheck` in
the assigned files.

`BT1-022.test.ts` proves the keyword, Piercing security check after deleting a
weaker opposing Digimon and surviving, inherited Draw 1 after a block, the
Q884 direct-Digimon negative, and the opponent-turn negative. The added legal
red level-4 evolution proves exact 3-memory payment, draw, top-card and source
stack identity, and retained Piercing. The added green level-4 route is an
illegal-evolution negative. No Digi-Egg appears in any fixture; the Security
check uses inert main-deck BT1-014 Kokatorimon.

##### Peer/stack review and score

The Static keyword shape matches BT1-026 and other Piercing peers. The
inherited trigger matches BT1-012's `WhenBlocked` source binding; the engine's
when-blocked builder binds the broadcast event to the blocked attacker, not to
an arbitrary Digimon owned by that player. No optionality, numeric target
boundary beyond Draw 1, Security effect, or once-per-turn identity applies.
No engine seam or unresolved ambiguity was found.

Focused Vitest passed: 1 file, 7 tests, 430 ms total (2026-09-10), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-022.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
fixture/timing/registration/`@ts-nocheck` scans and `git diff --check` passed.
The direct `fireForPermanent(OnBlockAnyone)` opponent-turn probe is
supplemental negative timing coverage.
Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-023 — SkullGreymon

Score: 8/10. Q885 effective-Blocker targeting, exact target/no-target and legal evolution stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-023.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies SkullGreymon as a red level-5 Digimon
(Ultimate, Virus, Undead), with play cost 7, 7000 DP, and one red level-4
evolution requirement costing 3 memory. Its only text is
`[On Play] Delete 1 of your opponent's Digimon with ＜Blocker＞.` There is no
inherited or Security text. The record is rarity R, max 4 copies, image
`BT1-023`, Japanese name `スカルグレイモン`.

`node tools/kb/query.mjs card BT1-023` returned Q885, which confirms that the
target may have gained Blocker from an Option or another effect. Comprehensive
rules 7-1-3-1 through 7-1-3-3 cover play declaration, payment, and placement;
8-1-3-1 through 8-1-3-3 cover the distinct evolution procedure and draw;
15-16-2-1 defines On Play as triggering after play completes; 16-5-1/2 defines
Blocker as the keyword and persistent effect; and 17-1-3-1 covers deletion
processing.

##### Implementation and proof map

`BT1-023.ts` registers exclusively with
`registerIrCard("BT1-023", compiled)`. Its On Play Delete action selects
exactly one opponent-controlled Digimon whose effective keywords include
Blocker. Coverage is `full` with an empty residual; there is no `registerCard`
or `@ts-nocheck` in the assigned files.

`BT1-023.test.ts` proves deletion of an opposing printed Blocker, Q885
deletion of a Digimon granted Blocker by an Option, preservation of a
non-Blocker, no-target resolution, and that On Play does not fire on
digivolution. The added legal red level-4 evolution proves exact 3-memory
payment, draw, top-card and source stack identity, and that an opposing
Blocker remains because no On Play event occurred. The added green level-4
route is an illegal-evolution negative. The existing mixed target fixture has
no Digi-Egg and keeps ownership filtering observable.

##### Peer/stack review and score

The target shape matches BT1-094's compiled opponent Blocker deletion and its
effective-keyword handling. Q885 is covered by the Option-granted Blocker
fixture. The effect is mandatory (not optional), has count exactly one, and
has no inherited, Security, duration, or once-per-turn clause. No engine seam
or unresolved ambiguity was found.

Focused Vitest passed: 1 file, 6 tests, 492 ms total (2026-09-10), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-023.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
fixture/timing/registration/`@ts-nocheck` scans and `git diff --check` passed.
Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-024 — MetalTyrannomon

Score: 8/10. exact play/evolution costs, draw/stack and illegal route; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-024.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies MetalTyrannomon as a red level-5 Digimon
(Ultimate, Virus, Cyborg), with play cost 7, 10000 DP, and one red level-4
evolution requirement costing 3 memory. It has no regular, inherited, or
Security text. The record is rarity C, max 4 copies, image `BT1-024`, Japanese
name `メタルティラノモン`.

`node tools/kb/query.mjs card BT1-024` returned no card-specific Q&A entries.
The applicable comprehensive rules are 2-5-1/2 (DP), 2-6-1 (play cost),
7-1-3-1 through 7-1-3-3 (playing and paying for a card), and 8-1-3-1 through
8-1-3-3 (legal evolution, payment, stack placement, and draw). Rules 8-1-2-6
and 8-1-2-8 cover unaffordable/illegal evolution and evolution when a draw is
not possible.

##### Implementation and proof map

`BT1-024.ts` registers exclusively with
`registerIrCard("BT1-024", compiled)`. Its empty compiled effect list is the
complete executable representation because the catalog has no effect text.
Coverage is `full` with an empty residual; there is no `registerCard` or
`@ts-nocheck` in the assigned files.

`BT1-024.test.ts` proves playing at the exact 7-memory cost with 10000 DP, a
legal red level-4-to-level-5 evolution at the exact 3-memory cost including
draw and source stack identity, insufficient-memory play rejection, and an
illegal green level-4 evolution. No Digi-Egg is placed in a deck or Security
fixture.

##### Peer/stack review and score

The no-effect module and ordinary red evolution route match nearby vanilla
BT1 Ultimate peers, including BT1-020. The stack assertions verify top-card
identity, source preservation, memory payment, draw, and DP. No trait filter,
inherited effect, Security behavior, or engine seam is applicable; no
ambiguity was found.

Focused Vitest passed: 1 file, 4 tests, 440 ms total (2026-09-10), with
`--maxWorkers=1 --no-file-parallelism`.

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-024.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
fixture/timing/registration/`@ts-nocheck` scans and `git diff --check` passed.
Worker score: 8/10 per brief; delivery gates remain with the coordinator.

### BT1-025 — WarGreymon

Score: 8/10. full clauses and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-025.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies WarGreymon as a red level-6 Digimon (Mega,
Vaccine, Dragonkin), with play cost 12, 11000 DP, and one red level-5
evolution requirement costing 3 memory. Its regular text is `[When Digivolving]
This Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional
security card) for the turn. [Your Turn] This Digimon doesn't activate
[Security] skills on Option cards it checks.` It has no inherited or Security
text. The record is rarity SR, max 4 copies, image `BT1-025`, Japanese name
`ウォーグレイモン`.

`node tools/kb/query.mjs card BT1-025` returned Q886. Q886 confirms that when
this card checks an Option whose Security effect did not activate, the Option
is still trashed. Comprehensive rules 11-1-3-1 through 11-1-3-3 and 16-1-1
cover attack/security-check processing; 16-3-1/2 covers Security effects;
16-4-1 covers ＜Security Attack +1＞; and 8-1-3-1 through 8-1-3-3 cover the
legal evolution stack, payment, and draw.

##### Implementation and proof map

`BT1-025.ts` registers exclusively with `registerIrCard("BT1-025", compiled)`.
The compiled IR has a `WhenDigivolving` self-targeted Security Attack +1 grant
lasting for the turn and a `YourTurn` self-targeted
`DisableSecurityEffect` limited to Option sources for the turn. Coverage is
`full` with an empty residual; no duplicate `registerCard` or `@ts-nocheck`
exists in the assigned files.

`BT1-025.test.ts` now asserts the complete catalog record and exact IR map,
proves the +1 attack through a public legal red level-5 evolution with exact
3-memory payment, draw, top-card and source-stack identity, and checks the
additional security card. It proves Q886 by checking an Option Security card
is trashed rather than added to hand, and checks the suppression is absent on
the opponent's turn. Fixtures contain no Digi-Egg in deck or Security.

##### Peer/stack review and score

The Security Attack grant follows the compiled BT1-017/BT1-018/BT1-063
keyword shape. The Option-only suppression uses the shared security-disable
primitive, which skips the Option Security effect while retaining the normal
trash step required by Q886. No inherited clause, optional choice, numeric
target boundary, or once-per-turn identity applies. The evolution proof uses
the legal red level-5 route shared by BT1 Mega peers. No engine seam or
unresolved ambiguity was found.

Focused Vitest passed with the coordinator's single-test resource gate:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-025.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 4 tests passed.

The full assigned-fixture scan found no numeric Security shorthand, no
BT1-001–008 in deck/Security, no timing-injection probe, no duplicate
`registerCard`, and no `@ts-nocheck`. Oxfmt and static `git diff --check` both
passed. No typecheck, build, collection, or engine suite was run. Worker score:
8/10 per brief; delivery gates remain with the coordinator.

### BT1-026 — Breakdramon

Score: 8/10. corrected legal fixtures and full evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-026.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Breakdramon as a red level-6 Digimon (Mega,
Virus, Machine Dragon), with play cost 12, 11000 DP, and one red level-5
evolution requirement costing 3 memory. Its only text is `＜Piercing＞ (When
this Digimon attacks and deletes an opponent's Digimon and survives the
battle， it performs any security checks it normally would.)` It has no
inherited or Security text. The record is rarity U, max 4 copies, image
`BT1-026`, Japanese name `ブレイクドラモン`.

`node tools/kb/query.mjs card BT1-026` returned no card-specific Q&A entries.
Comprehensive rules 8-1-3-1 through 8-1-3-3 cover the legal red level-5
evolution, payment, stack placement, and draw; 11-1-3-1 through 11-1-3-3
cover attack and battle resolution; and 16-7-1 through 16-7-6 define the
mandatory ＜Piercing＞ security processing after a surviving battle deletion.

##### Implementation and proof map

`BT1-026.ts` registers exclusively with `registerIrCard("BT1-026", compiled)`.
Its Static IR keyword is exactly ＜Piercing＞, with `full` coverage and an empty
residual. There is no duplicate `registerCard` or `@ts-nocheck` in the
assigned files.

`BT1-026.test.ts` asserts the complete catalog record and exact IR map, proves
the keyword, proves security is checked after deleting a weaker opponent while
surviving, and proves no security check occurs when the attacker loses. Its
legal red level-5 evolution checks exact 3-memory payment, draw, top-card and
source-stack identity while retaining Piercing. Fixtures contain no Digi-Egg
in deck or Security.

##### Peer/stack review and score

The Static keyword shape matches BT1-022 Garudamon and other Piercing peers.
The attack tests distinguish the required delete-and-survive branch from the
loss branch, so a keyword-only implementation cannot receive behavioral credit
without the engine's battle/Piercing path. No inherited clause, Security
effect, optional choice, once-per-turn identity, or unresolved engine seam is
applicable.

Focused Vitest passed with the coordinator's single-test resource gate:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-026.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 5 tests passed.

The full assigned-fixture scan found no numeric Security shorthand, no
BT1-001–008 in deck/Security, no timing-injection probe, no duplicate
`registerCard`, and no `@ts-nocheck`. Oxfmt and static `git diff --check` both
passed. No typecheck, build, collection, or engine suite was run. Worker score:
8/10 per brief; delivery gates remain with the coordinator.

### BT1-027 — Armadillomon

Score: 8/10. legal breeding/evolution proof and exact boundaries; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-027.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Armadillomon as a blue level-3 Digimon
(Rookie, Free, Mammal), with play cost 2, 4000 DP, and one blue level-2
evolution requirement costing 1 memory. It has no regular, inherited, or
Security text. The record is rarity C, max 4 copies, image `BT1-027`, Japanese
name `アルマジモン`.

`node tools/kb/query.mjs card BT1-027` returned no card-specific Q&A entries.
Comprehensive rules 7-1-3-1 through 7-1-3-3 cover normal play and payment;
8-1-3-1 through 8-1-3-3 cover the legal blue level-2 evolution, source-stack
placement, payment, and draw; and 8-1-2-6 covers an illegal evolution. A
Digi-Egg is a legal level-2 source only in the breeding area, not in the
battle area, deck, or Security.

##### Implementation and proof map

`BT1-027.ts` registers exclusively with `registerIrCard("BT1-027", compiled)`.
The empty effect list is complete because the catalog has no effect text;
coverage is `full` with an empty residual. There is no duplicate `registerCard`
or `@ts-nocheck` in the assigned files.

`BT1-027.test.ts` asserts the catalog and exact empty IR, proves exact-cost
normal play and 4000 DP, and proves a legal blue Digi-Egg-to-level-3
digivolution in breeding with exact 1-memory payment, draw, top-card, and
source-stack identity. It also rejects play below the cost floor and rejects a
red breeding-area level-2 source. No Digi-Egg is placed in deck or Security.

##### Peer/stack review and score

The no-effect module and blue level-2 route match neighboring vanilla blue
Rookies, including BT1-028. The source is represented in the legal breeding
zone, and the negative keeps the color requirement observable rather than
using an impossible battle-area level-2 fixture. No trait filter, inherited
effect, Security behavior, optional choice, or once-per-turn identity applies.
No engine seam or ambiguity was found.

Focused Vitest passed with the coordinator's single-test resource gate:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-027.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 5 tests passed.

The full assigned-fixture scan found no numeric Security shorthand, no
BT1-001–008 in deck/Security, no timing-injection probe, no duplicate
`registerCard`, and no `@ts-nocheck`. Oxfmt and static `git diff --check` both
passed. No typecheck, build, collection, or engine suite was run. Worker score:
8/10 per brief; delivery gates remain with the coordinator.

### BT1-028 — Elecmon

Score: 8/10. legal breeding/evolution proof and exact boundaries; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-028.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Elecmon as a blue level-3 Digimon (Rookie,
Data, Mammal), with play cost 2, 3000 DP, and one blue level-2 evolution
requirement costing 0 memory. It has no regular, inherited, or Security text.
The record is rarity C, max 4 copies, image `BT1-028`, Japanese name
`エレキモン`.

`node tools/kb/query.mjs card BT1-028` returned no card-specific Q&A entries.
Comprehensive rules 7-1-3-1 through 7-1-3-3 cover normal play and payment;
8-1-3-1 through 8-1-3-3 cover the legal blue level-2 evolution, source-stack
placement, payment, and draw; and 8-1-2-6 covers an illegal evolution. A
Digi-Egg is a legal level-2 source only in the breeding area, not in the
battle area, deck, or Security.

##### Implementation and proof map

`BT1-028.ts` registers exclusively with `registerIrCard("BT1-028", compiled)`.
The empty effect list is complete because the catalog has no effect text;
coverage is `full` with an empty residual. There is no duplicate `registerCard`
or `@ts-nocheck` in the assigned files.

`BT1-028.test.ts` asserts the catalog and exact empty IR, proves exact-cost
normal play and 3000 DP, and proves a legal blue Digi-Egg-to-level-3
digivolution in breeding with exact 0-memory payment, draw, top-card, and
source-stack identity. It also rejects play below the cost floor and rejects a
red breeding-area level-2 source. No Digi-Egg is placed in deck or Security.

##### Peer/stack review and score

The no-effect module and blue level-2 route match neighboring vanilla blue
Rookies, including BT1-027. The source is represented in the legal breeding
zone, and the negative keeps the color requirement observable rather than
using an impossible battle-area level-2 fixture. No trait filter, inherited
effect, Security behavior, optional choice, or once-per-turn identity applies.
No engine seam or ambiguity was found.

Focused Vitest passed with the coordinator's single-test resource gate:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-028.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 5 tests passed.

The full assigned-fixture scan found no numeric Security shorthand, no
BT1-001–008 in deck/Security, no timing-injection probe, no duplicate
`registerCard`, and no `@ts-nocheck`. Oxfmt and static `git diff --check` both
passed. No typecheck, build, collection, or engine suite was run. Worker score:
8/10 per brief; delivery gates remain with the coordinator.

### BT1-029 — Gabumon

Score: 8/10. corrected legal breeding fixture and exact evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-029.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Gabumon as a blue level-3 Digimon (Rookie,
Data, Reptile), with play cost 3, 1000 DP, and one blue level-2 evolution
requirement costing 0 memory. Its regular text is `[On Play] Trigger
＜Draw 1＞. (Draw 1 card from your deck.)` It has no inherited or Security
text. The record is rarity R, max 4 copies, image `BT1-029`, Japanese name
`ガブモン`.

`node tools/kb/query.mjs card BT1-029` returned no card-specific Q&A entries.
Comprehensive rules 15-16-1-1 and 16-8-1 through 16-8-3 cover the On Play
timing and mandatory draw; 7-1-3-1 through 7-1-3-3 cover normal play and
payment; and 8-1-3-1 through 8-1-3-3 cover the legal blue level-2 evolution,
source-stack placement, payment, and draw. A Digi-Egg source is legal in the
breeding area only, not the battle area, deck, or Security.

##### Implementation and proof map

`BT1-029.ts` registers exclusively with `registerIrCard("BT1-029", compiled)`.
The compiled IR is one mandatory On Play Draw 1 action owned by this card's
controller, with `full` coverage and an empty residual. There is no duplicate
`registerCard` or `@ts-nocheck` in the assigned files.

`BT1-029.test.ts` now asserts the complete catalog contract and exact IR,
proves one-card deck-to-hand movement on normal play, proves that On Play does
not fire on digivolution, and checks the legal breeding-area blue level-2
stack, exact 0-memory payment, draw, top card, and source identity. It also
rejects the red level-2 evolution route. The prior illegal battle-area
Digi-Egg fixture was corrected to breeding; no Digi-Egg is placed in deck or
Security.

##### Peer/stack review and score

The unconditional On Play Draw shape matches nearby blue Rookie implementations
and the shared Draw primitive. No target, optional choice, once-per-turn,
inherited, Security, trait filter, or numeric boundary beyond exactly one card
applies. The breeding stack and color-negative distinguish the legal route from
the red near-match. No engine seam or unresolved ambiguity was found.

Focused Vitest passed:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-029.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 4 tests passed.

No typecheck, build, collection, or engine suite was run in this static-only
lane. `pnpm exec oxfmt --check` passed for all four assigned tests, and
`git diff --check` passed. Worker score: 8/10 per brief; delivery gates remain
with the coordinator.

### BT1-030 — Gomamon

Score: 8/10. corrected legal fixtures and full clause/stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-030.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Gomamon as a blue level-3 Digimon (Rookie,
Vaccine, Sea Beast), with play cost 3, 3000 DP, and one blue level-2 evolution
requirement costing 0 memory. Its only text is the inherited clause `[On
Deletion] Gain 1 memory.` It has no regular or Security text. The record is
rarity C, max 4 copies, image `BT1-030`, Japanese name `ゴマモン`.

`node tools/kb/query.mjs card BT1-030` returned Q887 and Q888. Q887 confirms
that if the inherited effect moves memory to 1 during the opponent's turn, the
turn changes only after all effects and attacks finish. Q888 confirms that a
Piercing attack's check still activates after a blocker carrying this card is
deleted, before the turn changes. Comprehensive rules 15-16-4-1 and 15-8-3-5
cover On Deletion timing and the original top-card source; 4-14-1 through
4-14-2 cover deletion to trash; 4-2-3 covers inherited effects; and 8-1-3-1
through 8-1-3-3 cover the legal blue level-2 evolution, payment, stack, and
draw.

##### Implementation and proof map

`BT1-030.ts` registers exclusively with `registerIrCard("BT1-030", compiled)`.
The IR has exactly one inherited On Deletion GainMemory 1 action, with `full`
coverage and an empty residual. There is no duplicate `registerCard` or
`@ts-nocheck` in the assigned files.

`BT1-030.test.ts` now asserts the complete catalog contract and exact IR,
proves a legal breeding-area blue level-2 evolution with exact 0-memory
payment, draw, and source-stack identity, and preserves the deletion proof
that gains exactly one memory when the host is deleted. The Piercing peer case
also verifies Q888 ordering. A red level-2 evolution is rejected. The
security fixture was corrected from a Digi-Egg to BT1-081; no Digi-Egg is used
in deck or Security.

##### Peer/stack review and score

The inherited trigger follows neighboring inherited On Deletion cards and the
shared deletion-source projection. The deletion battle and Piercing peer
exercise pending activation after the stack card leaves, while Q887/Q888
define the memory/turn boundary. No optional choice, trait filter, Security
effect, or once-per-turn identity applies. No engine seam or unresolved
ambiguity was found.

Focused Vitest passed:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-030.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 5 tests passed.

No typecheck, build, collection, or engine suite was run in this static-only
lane. `pnpm exec oxfmt --check` passed for all four assigned tests, and
`git diff --check` passed. Worker score: 8/10 per brief; delivery gates remain
with the coordinator.

### BT1-031 — Monmon

Score: 8/10. Blocker decline plus legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-031.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Monmon as a blue level-3 Digimon (Rookie,
Virus, Beast), with play cost 4, 1000 DP, and one blue level-2 evolution
requirement costing 1 memory. Its only text is `＜Blocker＞ (When an
opponent's Digimon attacks， you may suspend this Digimon to force the opponent
to attack it instead.)` It has no inherited or Security text. The record is
rarity U, max 4 copies, image `BT1-031`, Japanese name `コエモン`.

`node tools/kb/query.mjs card BT1-031` returned no card-specific Q&A entries.
Comprehensive rules 11-4-1 and 12-1-1 through 12-1-7 cover the optional block
window, suspension, target redirection, and battle; 16-5-1 through 16-5-3
define Blocker as a persistent keyword and cap one block per attack; and
8-1-3-1 through 8-1-3-3 cover the legal blue level-2 evolution, payment,
source-stack placement, and draw.

##### Implementation and proof map

`BT1-031.ts` registers exclusively with `registerIrCard("BT1-031", compiled)`.
The Static IR contains exactly the printed Blocker keyword, with `full`
coverage and an empty residual. There is no duplicate `registerCard` or
`@ts-nocheck` in the assigned files.

`BT1-031.test.ts` now asserts the complete catalog contract and exact IR,
proves the keyword and public block redirect, proves the may/optional negative
by declining the block window, and proves a legal breeding-area blue level-2
evolution with exact 1-memory payment, draw, source identity, and retained
Blocker. Security uses BT1-081 rather than a Digi-Egg.

##### Peer/stack review and score

The Static keyword shape matches BT1-022 and other Blocker peers. The positive
and decline paths distinguish suspension/retargeting from leaving the attack
on the player, and the stack proof verifies persistent keyword visibility after
evolution. No inherited clause, trait filter, Security effect, or once-per-turn
identity applies. No engine seam or unresolved ambiguity was found.

Focused Vitest passed:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-031.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 5 tests passed.

No typecheck, build, collection, or engine suite was run in this static-only
lane. `pnpm exec oxfmt --check` passed for all four assigned tests, and
`git diff --check` passed. Worker score: 8/10 per brief; delivery gates remain
with the coordinator.

### BT1-032 — Frigimon

Score: 8/10. Jamming security and ordinary-battle boundaries with legal stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-032.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Frigimon as a blue level-4 Digimon
(Champion, Vaccine, Ice-Snow), with play cost 4, 4000 DP, and one blue level-3
evolution requirement costing 2 memory. Its only text is `＜Jamming＞ (This
Digimon can't be deleted in battles against Security Digimon.)` It has no
inherited or Security text. The record is rarity C, max 4 copies, image
`BT1-032`, Japanese name `ユキダルモン`.

`node tools/kb/query.mjs card BT1-032` returned no card-specific Q&A entries.
Comprehensive rules 11-1-3-1 through 11-1-3-3 cover attack and Security
Digimon battle resolution; 16-9-1 and 16-9-2 define Jamming as a persistent
effect that prevents deletion from that battle only; and 8-1-3-1 through
8-1-3-3 cover the legal blue level-3 evolution, payment, source-stack
placement, and draw. Glossary Jamming evidence independently states that it
does not prevent Security checks.

##### Implementation and proof map

`BT1-032.ts` registers exclusively with `registerIrCard("BT1-032", compiled)`.
The Static IR contains exactly the printed Jamming keyword, with `full`
coverage and an empty residual. There is no duplicate `registerCard` or
`@ts-nocheck` in the assigned files.

`BT1-032.test.ts` now asserts the complete catalog contract and exact IR,
proves Jamming in a stronger Security Digimon battle, proves that ordinary
Digimon battle deletion still applies, and proves a legal blue level-3
evolution with exact 2-memory payment, draw, source identity, and retained
Jamming. A red level-3 evolution is rejected. Fixtures contain no Digi-Egg in
deck or Security.

##### Peer/stack review and score

The Static keyword shape matches Jamming peers such as BT1-069. The positive
Security battle and ordinary battle negative establish the exact scope: the
keyword protects only against Security Digimon, not ordinary Digimon. The
evolution stack confirms persistent visibility after source transition. No
inherited clause, optional choice, trait filter, Security effect, or
once-per-turn identity applies. No engine seam or unresolved ambiguity was
found.

Focused Vitest passed:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-032.test.ts --maxWorkers=1 --no-file-parallelism`

Result: 1 file passed, 6 tests passed.

No typecheck, build, collection, or engine suite was run in this static-only
lane. `pnpm exec oxfmt --check` passed for all four assigned tests, and
`git diff --check` passed. Worker score: 8/10 per brief; delivery gates remain
with the coordinator.

### BT1-033 — Dolphmon

Score: 8/10. full clause/boundary and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-033.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Dolphmon as a blue level-4 Digimon
(Champion, Vaccine, Sea Animal), with play cost 4, 4000 DP, and one blue
level-3 evolution requirement costing 2 memory. Its only text is the inherited
clause `[Your Turn] While your opponent has a Digimon with no digivolution
cards in play, this Digimon gets +1000 DP.` It has no regular or Security text.
The record is rarity C, max 4 copies, image `BT1-033`, Japanese name `ルカモン`.

`node tools/kb/query.mjs card BT1-033` returned Q889 and Q890. Q889 confirms
that the inherited effect ends as soon as the opponent no longer has a
qualifying Digimon. Q890 confirms that a Digimon in the opponent's breeding
area does not satisfy the condition. Comprehensive rules 4-2-3 covers
inherited effects, 3-4-5-7 covers the breeding-area activation boundary,
15-16-8-1 covers Your Turn timing, and 8-1-3-1 through 8-1-3-3 cover the
legal blue level-3 evolution, 2-memory payment, source stack, and draw.

##### Implementation and proof map

`BT1-033.ts` registers exclusively with `registerIrCard("BT1-033", compiled)`.
The compiled IR has one inherited YourTurn continuous `ModifyDP` action on
the self reference, exactly +1000 for the turn, gated by an opponent battle
area Digimon with zero digivolution cards. It has `full` coverage and an empty
residual. No duplicate `registerCard` or `@ts-nocheck` exists in the assigned
files.

`BT1-033.test.ts` now asserts the full catalog record and exact IR, proves the
positive boost, the opponent-turn negative, the immediate loss after the last
qualifying Digimon leaves, the no-digivolution-card boundary, and the breeding
area exclusion. It also proves a legal blue level-3 to level-4 stack with
exact 2-memory payment, evolution draw, and source identity; the separate
host-under-source fixture proves the inherited DP. The red level-3 route is
rejected. No Digi-Egg is placed in deck or Security.

##### Peer/stack review and score

The condition and self-target shape match the neighboring inherited DP cards,
while Q889/Q890 establish the live board-state and breeding boundaries. The
stack case verifies the source card remains under Dolphmon; the host-under-
source case verifies the inherited effect is visible in the correct stack
position. No optional choice, once-per-turn, trait filter, Security effect, or
engine seam applies. No ambiguity was found.

Focused Vitest passed (7 tests):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-033.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
`git diff --check` is reported separately to the coordinator. Collection/runtime
acceptance and delivery gates remain with the coordinator. Worker score: 8/10
per brief.

### BT1-034 — Ikkakumon

Score: 8/10. full clause/boundary and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-034.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Ikkakumon as a blue level-4 Digimon
(Champion, Vaccine, Sea Beast), with play cost 5, 5000 DP, and one blue
level-3 evolution requirement costing 2 memory. Its only text is the inherited
clause `[Your Turn] This Digimon can't be blocked by your opponent's Digimon
with no digivolution cards.` It has no regular or Security text. The record is
rarity R, max 4 copies, image `BT1-034`, Japanese name `イッカクモン`.

`node tools/kb/query.mjs card BT1-034` returned Q891. Q891 confirms that an
opponent's Digimon with no digivolution cards cannot block a Digimon carrying
this inherited effect. Comprehensive rules 4-2-3 covers inherited effects,
12-1-1 through 12-1-7 cover the block window, target switch, and block
processing, 15-16-8-1 covers Your Turn timing, and 8-1-3-1 through 8-1-3-3
cover the legal blue level-3 evolution, 2-memory payment, source stack, and
draw.

##### Implementation and proof map

`BT1-034.ts` registers exclusively with `registerIrCard("BT1-034", compiled)`.
The compiled IR has one inherited YourTurn `Restrict` action on the self
reference with restriction `cantBeBlockedByNoDigivolution` for the turn. It
has `full` coverage and an empty residual. No duplicate `registerCard` or
`@ts-nocheck` exists in the assigned files.

`BT1-034.test.ts` now asserts the full catalog record and exact IR, proves
that a source-less opponent Blocker cannot block, proves that a Blocker with
an evolution card remains legal, and checks that the restriction exists only
during Ikkakumon's controller's turn. It also proves a legal blue level-3 to
level-4 stack with exact 2-memory payment, evolution draw, and source
identity; the block fixtures prove the inherited restriction while the card
is under a host. The red level-3 route is rejected. No Digi-Egg is placed in
deck or Security.

##### Peer/stack review and score

The restriction matches the equivalent blue blocker-prevention peers and the
engine's `cantBeBlockedByNoDigivolution` combat consumer. The mixed blocker
fixture distinguishes zero-source stacks from sourced stacks, while Q891
supports the exact boundary. The evolution case confirms the source
transition, while the block fixtures confirm the inherited restriction in its
required under-host position. No optional choice, once-per-turn, trait filter,
Security effect, or engine seam applies. No ambiguity was found.

Focused Vitest passed (6 tests):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-034.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
`git diff --check` is reported separately to the coordinator. Collection/runtime
acceptance and delivery gates remain with the coordinator. Worker score: 8/10
per brief.

### BT1-035 — Leomon

Score: 8/10. full clause/boundary and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-035.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Leomon as a blue level-4 Digimon (Champion,
Vaccine, Beastkin), with play cost 5, 5000 DP, and one blue level-3 evolution
requirement costing 2 memory. Its only text is `[On Deletion] Gain 2 memory.`
It has no inherited or Security text. The record is rarity U, max 4 copies,
image `BT1-035`, Japanese name `レオモン`.

`node tools/kb/query.mjs card BT1-035` returned Q892. Q892 confirms that
gaining 2 memory during the opponent's turn moves the gauge to the owner's
side and the turn changes only after all effects and attacks resolve.
Comprehensive rules 4-14-1 and 4-14-2 cover deletion to trash and the pending
activation of the card's own On Deletion effect, 15-16-4-1 covers On Deletion
timing, and 8-1-3-1 through 8-1-3-3 cover the legal blue level-3 evolution,
2-memory payment, source stack, and draw.

##### Implementation and proof map

`BT1-035.ts` registers exclusively with `registerIrCard("BT1-035", compiled)`.
The compiled IR has exactly one mandatory OnDeletion `GainMemory` action for 2
memory, with `full` coverage and an empty residual. No duplicate `registerCard`
or `@ts-nocheck` exists in the assigned files.

`BT1-035.test.ts` now asserts the full catalog record and exact IR, proves the
card gains exactly 2 memory when deleted during the opponent's turn, and
proves deletion of another Digimon does not activate Leomon's effect. It also
proves a legal blue level-3 to level-4 stack with exact 2-memory payment,
evolution draw, and source identity; the red level-3 route is rejected. No
Digi-Egg is placed in deck or Security.

##### Peer/stack review and score

The On Deletion shape follows neighboring deletion-triggered cards and the
engine's deletion projection: the source card is collected after it moves to
trash. The opponent-turn battle case exercises Q892's memory/turn boundary,
while the unrelated-deletion negative proves source identity. No optional
choice, once-per-turn, trait filter, Security effect, or engine seam applies.
No ambiguity was found.

Focused Vitest passed (5 tests):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-035.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
`git diff --check` is reported separately to the coordinator. Collection/runtime
acceptance and delivery gates remain with the coordinator. Worker score: 8/10
per brief.

### BT1-036 — Garurumon

Score: 8/10. full clause/boundary and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-036.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Garurumon as a blue level-4 Digimon
(Champion, Vaccine, Beast), with play cost 6, 5000 DP, and one blue level-3
evolution requirement costing 2 memory. Its only text is `[On Play] Unsuspend
1 of your Digimon.` It has no inherited or Security text. The record is
rarity U, max 4 copies, image `BT1-036`, Japanese name `ガルルモン`.

`node tools/kb/query.mjs card BT1-036` returned no card-specific Q&A entries.
Comprehensive rules 15-16-1-1 covers On Play timing, 4-12-1-1 through
4-12-1-2 define unsuspended and suspended orientation, 3-4-5-4 covers the
breeding-area trigger boundary, and 8-1-3-1 through 8-1-3-3 cover the legal
blue level-3 evolution, 2-memory payment, source stack, and draw.

##### Implementation and proof map

`BT1-036.ts` registers exclusively with `registerIrCard("BT1-036", compiled)`.
The compiled IR has exactly one mandatory OnPlay `Unsuspend` action selecting
one Digimon controlled by the card's owner. It has `full` coverage and an
empty residual. No duplicate `registerCard` or `@ts-nocheck` exists in the
assigned files.

`BT1-036.test.ts` now asserts the full catalog record and exact IR, proves one
of the owner's suspended Digimon is unsuspended, proves an opponent's
Digimon is not eligible, and preserves the attack/unsuspend/second-attack
interaction. A digivolution negative confirms On Play does not fire on
digivolution. The legal blue level-3 to level-4 stack proves exact 2-memory
payment, evolution draw, and source identity; the red level-3 route is
rejected. No Digi-Egg is placed in deck or Security.

##### Peer/stack review and score

The target controller and count match neighboring unsuspend-on-play cards and
the shared Unsuspend primitive. The mixed-controller fixture proves the
`mine` boundary, while the attack case confirms a genuinely suspended
attacker can attack again after the effect resolves. The stack case separates
On Play from digivolution and confirms source transition. No optional choice,
once-per-turn, trait filter, Security effect, or engine seam applies. No
ambiguity was found.

Focused Vitest passed (7 tests):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-036.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
`git diff --check` is reported separately to the coordinator. Collection/runtime
acceptance and delivery gates remain with the coordinator. Worker score: 8/10
per brief.

### BT1-037 — Gorillamon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-037.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Gorillamon as a blue level-4 Digimon
(Champion, Data, Beastkin), with play cost 6, 6000 DP, and one blue level-3
evolution requirement costing 1 memory. It has no effect, inherited, or
Security text. The record is rarity C, max 4 copies, image `BT1-037`, and
Japanese name `ゴリモン`.

`node tools/kb/query.mjs card BT1-037` returned no card-specific Q&A, errata,
or restriction entries. Comprehensive rules 8-1-3-1 through 8-1-3-3 cover the
blue level-3 evolution choice, 1-memory payment, stacking, and evolution draw;
2-5-1/2 and 2-6-1 cover the catalog DP and play/evolution costs.

##### Implementation and proof map

`BT1-037.ts` registers exclusively with `registerIrCard("BT1-037", compiled)`.
The compiled IR is intentionally empty for this vanilla card, with `full`
coverage and an empty residual. The tests assert the complete catalog record,
registration, 6-memory play payment, 6000 DP, legal blue evolution with draw
and retained source identity, and rejection of a red level-3 evolution. No
`registerCard`, `@ts-nocheck`, inherited clause, or Security clause exists.

##### Peer/stack review and score

The evolution proof follows the neighboring BT1 blue Champion tests and uses
BT1-029 as a legal blue level-3 source. BT1-036 and BT1-033 were reviewed for
the same blue level-3 stack and draw semantics. There are no target filters,
optional effects, once-per-turn limits, trait clauses, or engine seams to
resolve. Assigned-file scans found no numeric Security shorthand, Digi-Egg in
deck/Security, or BT1-001 through BT1-008 deck/Security fixture.

Focused Vitest passed: 1 file, 4 tests, 405 ms total (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-037.test.ts --maxWorkers=1 --no-file-parallelism`

No Vitest, typecheck, build, collection, or engine suite was run in this
static-only lane. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-038 — Monzaemon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-038.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Monzaemon as a blue level-5 Digimon
(Ultimate, Vaccine, Puppet), with play cost 5, 6000 DP, and one blue level-4
evolution requirement costing 2 memory. It has no effect, inherited, or
Security text. The record is rarity C, max 4 copies, image `BT1-038`, and
Japanese name `もんざえモン`.

`node tools/kb/query.mjs card BT1-038` returned no card-specific Q&A, errata,
or restriction entries. Comprehensive rules 8-1-3-1 through 8-1-3-3 cover the
blue level-4 evolution choice, 2-memory payment, stacking, and evolution draw;
2-5-1/2 and 2-6-1 cover the catalog DP and play/evolution costs.

##### Implementation and proof map

`BT1-038.ts` registers exclusively with `registerIrCard("BT1-038", compiled)`.
The compiled IR is intentionally empty for this vanilla card, with `full`
coverage and an empty residual. The tests assert the complete catalog record,
registration, 5-memory play payment, 6000 DP, legal blue evolution with draw
and retained source identity, and rejection of a red level-4 evolution. No
`registerCard`, `@ts-nocheck`, inherited clause, or Security clause exists.

##### Peer/stack review and score

The evolution proof follows neighboring BT1 blue Ultimate tests and uses
BT1-037 as a legal blue level-4 source. BT1-039 and BT1-040 were reviewed for
the same blue level-4 requirement and stack transition. There are no target
filters, optional effects, once-per-turn limits, trait clauses, or engine
seams to resolve. Assigned-file scans found no numeric Security shorthand,
Digi-Egg in deck/Security, or BT1-001 through BT1-008 deck/Security fixture.

Focused Vitest passed: 1 file, 4 tests, 437 ms total (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-038.test.ts --maxWorkers=1 --no-file-parallelism`

No Vitest, typecheck, build, collection, or engine suite was run in this
static-only lane. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-039 — Cerberusmon

Score: 8/10. timing/optional-cost boundaries and legal evolution stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-039.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies Cerberusmon as a blue level-5 Digimon
(Ultimate, Vaccine, Dark Animal), with play cost 6, 6000 DP, and one blue
level-4 evolution requirement costing 3 memory. Its only text is
`[When Attacking][Twice Per Turn] You can unsuspend this Digimon by trashing 3
cards in your hand.` It has no inherited or Security text. The record is
rarity R, max 4 copies, image `BT1-039`, and Japanese name `ケルベロモン`.

`node tools/kb/query.mjs card BT1-039` returned Q893 and Q894. Q893 confirms
that the three-card “by” condition cannot be partially paid. Q894 confirms
that this When Attacking effect must be activated after attack declaration and
before counter timing. Comprehensive rules 11-1-3/4 cover that attack window,
15-7-1 through 15-7-3 cover optional processing and all-or-nothing “by” costs,
and 15-14-1-1 through 15-14-1-5 cover Twice Per Turn counting and reset.

##### Implementation and proof map

`BT1-039.ts` registers exclusively with `registerIrCard("BT1-039", compiled)`.
The full IR has one optional `WhenAttacking` effect with `TwicePerTurn`, a
self-only `Unsuspend`, and a hand-scoped `trash` cost requiring exactly 3
cards. Coverage is `full` with an empty residual; no duplicate `registerCard`
or `@ts-nocheck` exists.

The colocated tests assert every catalog field and the exact IR, prove two
successful activations, same-turn refusal on the third, and reset on the
controller's next turn, prove that two cards cannot partially pay the cost
(Q893), and prove optional refusal without trashing cards before the attack
proceeds (Q894). A legal blue level-4 to level-5 evolution proves exact
3-memory payment, draw, and retained source; the red level-4 route is rejected.

##### Peer/stack review and score

BT1-081 HerculesKabuterimon was reviewed for the same optional Twice Per Turn
self-unsuspend pattern and attack-window sequencing. The test stack uses
BT1-037 as the legal blue level-4 peer. No inherited, trait-filter, Security,
or engine seam applies. Assigned-file scans found no numeric Security
shorthand, Digi-Egg in deck/Security, or BT1-001 through BT1-008 deck/Security
fixture.

Focused Vitest passed: 1 file, 7 tests, 467 ms total (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-039.test.ts --maxWorkers=1 --no-file-parallelism`

No Vitest, typecheck, build, collection, or engine suite was run in this
static-only lane. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-040 — WereGarurumon

Score: 8/10. twice-per-turn boundary and legal evolution stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-040.md` (2026-09-10):

##### Catalog and rules evidence

The committed catalog identifies WereGarurumon as a blue level-5 Digimon
(Ultimate, Vaccine, Beastkin), with play cost 6, 7000 DP, and one blue level-4
evolution requirement costing 3 memory. Its only text is
`[When Attacking] Gain 3 memory. At end of turn， lose 3 memory.` It has no
inherited or Security text. The record is rarity U, max 4 copies, image
`BT1-040`, and Japanese name `ワーガルルモン`.

`node tools/kb/query.mjs card BT1-040` returned Q896, Q897, Q1080, Q1087,
Q1097, and Q1415. Q896 confirms the delayed loss remains after deletion; Q897
confirms passing after the gain moves the marker before the additional loss;
Q1080/Q1087/Q1097/Q1415 confirm memory-gain prevention does not suppress the
specified loss. Comprehensive rules 18-1-1/2 define the delayed end-of-turn
pending processing, 11-1-3 through 11-1-5 preserve the attack sequence even
if the attacker leaves play, and 8-1-3-1 through 8-1-3-3 cover the legal
blue-level-4 evolution stack.

##### Implementation and proof map

`BT1-040.ts` registers exclusively with `registerIrCard("BT1-040", compiled)`.
The full IR has one mandatory `WhenAttacking` effect that gains exactly 3
memory and schedules exactly one -3 `GainMemory` at `endOfTurn`. Coverage is
`full` with an empty residual; no duplicate `registerCard` or `@ts-nocheck`
exists.

The colocated tests assert every catalog field and exact IR, prove the +3
attack gain, prove the delayed -3 through a real turn end after the attacker is
deleted (Q896), prove legal blue evolution with exact cost, draw, and source
identity, and reject a red level-4 route. The delayed-loss test does not use a
direct timing injection.

##### Peer/stack review and score

BT1-021 MetalGreymon, BT1-058 Chirinmon, and BT1-075 Digitamamon were reviewed
as identical delayed-memory peers. Their Q&A coverage also documents the
shared memory-prevention interaction; no card-specific target, optional,
once-per-turn, inherited, or Security clause applies here. Assigned-file scans
found no numeric Security shorthand, Digi-Egg in deck/Security, or BT1-001
through BT1-008 deck/Security fixture.

Focused Vitest passed after correcting the real-turn fixture: 1 file, 5 tests,
418 ms total (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-040.test.ts --maxWorkers=1 --no-file-parallelism`

No Vitest, typecheck, build, collection, or engine suite was run in this
static-only lane. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-041 — Zudomon

Score: 8/10. full clauses/targets and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-041.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Zudomon as a blue level-5 Digimon (Ultimate,
Vaccine, Sea Beast), 7 play cost, 6000 DP, with a blue level-4 evolution
requirement costing 3 memory. Its regular text is `[On Play] Trigger <Draw 2>`
and its inherited text is `[When Attacking] If your opponent has a Digimon
with no digivolution cards in play, gain 1 memory.` It has no Security text.

`node tools/kb/query.mjs card BT1-041` returned Q898 and Q899. Q898 confirms
the inherited effect grants exactly 1 memory regardless of the number of
matching opponent Digimon. Q899 confirms the breeding area is not checked.
Comprehensive 15-3-1 through 15-3-3 covers inherited source visibility;
15-16-2 covers On Play timing; 8-1-3-1 through 8-1-3-3 covers the standard
evolution payment, stack transition, and draw procedure.

##### Implementation and proof map

`BT1-041.ts` registers only with `registerIrCard("BT1-041", compiled)`. The
compiled IR contains the mandatory On Play draw of exactly 2 and an inherited
When Attacking GainMemory of exactly 1. Its `opponentHas` filter explicitly
requires an opponent Digimon in the battle area with no digivolution cards;
the condition has no multiplier. Coverage is `full` with an empty residual.
There is no `registerCard` or `@ts-nocheck` in the assigned files.

`BT1-041.test.ts` pins every catalog field and the complete IR. Behavioral
proof covers the two-card On Play draw, exactly one memory against two matching
opponent Digimon, and the Q899 breeding-area negative. The lifecycle case
legally evolves a blue level-4 BT1-037 into Zudomon for 3 memory, observes the
evolution draw and preserved source, then legally evolves a vanilla blue
level-6 ST2-10 over Zudomon. The final stack exposes Zudomon as the inherited
source; its attack gains one memory from a source-less opponent Digimon.

##### Peer review, static gates, and score

The source-bound inherited shape matches nearby blue BT1 inherited conditions,
including BT1-033 and BT1-034; the mixed board and breeding-area cases prove
the complete battle-area boundary. No trait-filter, once-per-turn, optional,
or Security clause applies. Deck and Security fixtures contain ordinary cards
only: no Digi-Egg or numeric Security shorthand was found. Static
`git diff --check` passed for assigned files. Focused command
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-041.test.ts
--maxWorkers=1 --no-file-parallelism` passed: 1 file, 5 tests (532 ms).
Typecheck remains pending the coordinator's no-build resource gate. Worker
score: 8/10; delivery gates remain with the coordinator.

### BT1-042 — LoaderLeomon

Score: 8/10. full clauses/targets and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-042.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies LoaderLeomon as a blue level-5 Digimon
(Ultimate, Vaccine, Machine), 7 play cost, 10000 DP, with a blue level-4
evolution requirement costing 3 memory. It has no regular, inherited, or
Security effect text. `node tools/kb/query.mjs card BT1-042` returned the
2022-08-05 erratum changing the printed name from `LoaderLiomon` to
`LoaderLeomon`; the committed catalog already reflects the corrected name.
Comprehensive 8-1-3-1 through 8-1-3-3 covers the legal evolution route,
payment, source transition, and draw.

##### Implementation and proof map

`BT1-042.ts` registers only with `registerIrCard("BT1-042", compiled)` and
uses the residual-free empty compiled effect list appropriate for a vanilla
card. `BT1-042.test.ts` pins the errata-corrected catalog fields and exact
`{ effects: [], coverage: "full", residual: [] }` representation. It proves
the exact 7-memory play cost and 10000 DP, a legal blue level-4 BT1-037
evolution at 3 memory with draw/source preservation, and an illegal red
level-4 route. No `registerCard` or `@ts-nocheck` is present in assigned files.

##### Peer review, static gates, and score

The no-effect representation and ordinary blue Ultimate evolution match
BT1-038 and BT1-040. There are no trigger, inherited, Security, trait-filter,
optional, or once-per-turn clauses to resolve. Deck and Security fixtures use
ordinary cards only; no Digi-Egg, numeric Security shorthand, or forbidden
BT1-001--008 fixture was found. Static `git diff --check` passed for assigned
files. Focused command `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-042.test.ts --maxWorkers=1 --no-file-parallelism` passed:
1 file, 4 tests (539 ms). Typecheck remains pending the coordinator's no-build
resource gate. Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-043 — SaberLeomon

Score: 8/10. source/target boundaries and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-043.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies SaberLeomon as a blue level-6 Digimon (Mega,
Data, Ancient Animal), 11 play cost, 10000 DP, with a blue level-5 evolution
requirement costing 3 memory. Its complete regular text is `[When Digivolving]
Trash 4 digivolution cards under 1 of your opponent's Digimon.` It has no
inherited or Security text. `node tools/kb/query.mjs card BT1-043` returned no
card-specific Q&A or erratum. Comprehensive 4-8-1/4-8-2 defines digivolution
cards and their referenced information; 4-26-2 covers a specified number of
cards from a stack; 8-1-3-1 through 8-1-3-3 covers the legal evolution and
draw. Rule 15-1-5 confirms this mandatory effect is performed whenever
possible.

##### Implementation and proof map

`BT1-043.ts` registers only with `registerIrCard("BT1-043", compiled)`. The
When Digivolving action chooses exactly one opponent Digimon (`controller:
opponent`, `kind: Digimon`, `digivolutionCards: hasAny`) and trashes four from
the bottom/default direction (`fromTop: false`), matching the printed clause.
Coverage is `full` with an empty residual; no `registerCard` or `@ts-nocheck`
exists in assigned files.

`BT1-043.test.ts` pins every catalog field and exact IR. A legal blue level-5
BT1-039-to-SaberLeomon route observes the 3-memory payment, normal evolution
draw, and source transition. The positive boundary trashes exactly four from
a five-card stack, the under-four case trashes all available cards, and a
mixed board proves a source-less opponent peer cannot be selected while a
sourced peer is selected. A non-blue level-5 evolution is rejected.

##### Peer review, static gates, and score

The target and stack-trash shape is consistent with BT1-099 and BT1-101, while
the mixed target board proves opponent ownership and the `hasAny` boundary.
There are no optional, inherited, once-per-turn, trait, or Security clauses.
Fixtures contain no Digi-Egg in deck/Security and no numeric Security
shorthand. Static `git diff --check` passed for assigned files. Focused
command `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-043.test.ts --maxWorkers=1 --no-file-parallelism` passed:
1 file, 5 tests (570 ms). Typecheck remains pending the coordinator's no-build
resource gate. Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-044 — MetalGarurumon

Score: 8/10. nested On Play/source behavior and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-044.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies MetalGarurumon as a blue level-6 Digimon
(Mega, Data, Cyborg), 12 play cost, 11000 DP, with a blue level-5 evolution
requirement costing 3 memory. Its complete regular text is `[When Attacking]
Play 1 level 4 or lower digivolution card under this card as another Digimon
without paying its memory cost.` It has no inherited or Security text.

`node tools/kb/query.mjs card BT1-044` returned Q900--Q906. Q900 excludes
Digi-Egg cards; Q901 says the played card enters unsuspended; Q902 says it
does not carry effects currently applied to the host; Q903--Q904 require its
On Play effect to activate immediately and first; Q905 says it cannot attack
that turn; Q906 says the effect is mandatory whenever an eligible card exists.
Comprehensive 4-8-1/4-8-2 defines digivolution-card references, 15-15-7
covers effects that activate other effects, and 15-16-2 covers the nested On
Play timing.

##### Implementation and proof map

`BT1-044.ts` registers only with `registerIrCard("BT1-044", compiled)`. Its
When Attacking action uses `PlayWithoutCost` from `digivolutionCards`, with
`payCost: false`, selecting exactly one controller-owned Digimon whose level
is `lte 4` and whose host is the attacking card (`hostFilter.isSelfRef`). This
excludes Digi-Eggs, level 5+, other stacks, and opponent stacks. Coverage is
`full` with an empty residual; no `registerCard` or `@ts-nocheck` exists in the
assigned files.

`BT1-044.test.ts` pins every catalog field and exact IR. Existing focused cases
prove level-4 play, unsuspended entry, source removal, nested BT1-029 On Play
draw, no attack by the newly played Digimon, exclusion of level 5/Digi-Egg,
and exclusion of other-own/opponent stacks. The lifecycle case performs legal
blue level-4 -> level-5 -> level-6 evolution steps, checks both payments,
draws, and source identity, then attacks and verifies only the eligible source
becomes a separate battle-area Digimon.

##### Peer review, static gates, and score

The source/level boundary matches other compiled `PlayWithoutCost` effects,
while the BT1-029 nested effect provides the Q903/Q904 observable path. No
optional, inherited, once-per-turn, or trait clause applies. Deck and Security
fixtures contain no Digi-Egg and no numeric Security shorthand. Static
`git diff --check` passed for assigned files. Focused command
`pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-044.test.ts --maxWorkers=1 --no-file-parallelism` passed:
1 file, 6 tests (575 ms). Typecheck remains pending the coordinator's no-build
resource gate. Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-045 — Tsukaimon

Score: 8/10. full catalog/IR and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-045.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Tsukaimon as a yellow level-3 Digimon
(Rookie, Virus, Mammal), 2 play cost, 3000 DP, with a yellow level-2
evolution requirement costing 0 memory. It has no regular, inherited, or
Security effect text. `node tools/kb/query.mjs card BT1-045` returned no
card-specific Q&A or erratum. Comprehensive 8-1-3-1 through 8-1-3-3 covers
the legal evolution route, payment, source transition, and mandatory draw.

##### Implementation and proof map

`BT1-045.ts` registers only with `registerIrCard("BT1-045", compiled)` and
uses the residual-free empty IR representation appropriate for a vanilla
card. The module now exports `compiled` for exact focused assertions; there
is no `registerCard` or `@ts-nocheck` in assigned files.

`BT1-045.test.ts` pins every catalog field and the exact IR. It proves the
2-memory play cost and 3000 DP, a legal yellow level-2 evolution at 0 memory
with the normal evolution draw and preserved source identity, and rejection
of a red level-2 route.

##### Peer review, static gates, and score

The vanilla representation and yellow Rookie evolution route match the
nearby BT1-047 peer. No trigger, inherited, Security, trait-filter,
optional, or once-per-turn clause applies. Deck and Security fixtures use
ordinary cards only: no Digi-Egg, numeric Security shorthand, or injected
timing fixture was found. Rules and stack evidence were reviewed statically.
Focused Vitest passed 4/4 tests; the coordinator resource gate excludes
typecheck for this lane. Test command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-045.test.ts
--maxWorkers=1 --no-file-parallelism`. Oxfmt check passed on all assigned
source/test files; static `git diff --check` is pending final lane validation.
Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-046 — Kudamon

Score: 8/10. full draw boundary and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-046.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Kudamon as a yellow level-3 Digimon
(Rookie, Vaccine, Holy Beast), 3 play cost, 1000 DP, with a yellow level-2
evolution requirement costing 0 memory. Its complete regular text is
`[When Attacking] If you have 4 or less cards in your hand, trigger <Draw 1>`;
it has no inherited or Security effect text. `node tools/kb/query.mjs card
BT1-046` returned no card-specific Q&A or erratum. Comprehensive 8-1-3-1
through 8-1-3-3 covers the legal evolution route and draw; 15-16-5-1 covers
the When Attacking timing.

##### Implementation and proof map

`BT1-046.ts` registers only with `registerIrCard("BT1-046", compiled)`. The
IR has one WhenAttacking effect with exactly one Draw action and a live
`zoneCount` condition for the controller's hand `lte 4`; coverage is `full`
with an empty residual. No `registerCard` or `@ts-nocheck` exists in assigned
files.

`BT1-046.test.ts` pins every catalog field and the complete IR. Behavioral
proof covers the exact positive boundary (4 cards), exact negative boundary
(5 cards), legal yellow level-2 evolution at 0 memory with evolution draw and
source preservation, and an illegal red level-2 route.

##### Peer review, static gates, and score

The hand-count condition was compared with neighboring compiled conditional
effects, and the evolution stack uses the same yellow Digi-Egg route as the
other assigned Rookies. There are no inherited, Security, trait-filter,
optional, or once-per-turn clauses. Deck and Security fixtures use ordinary
cards only: no Digi-Egg, numeric Security shorthand, or injected timing
fixture was found. The focused file passed 5/5 tests after formatting; the
coordinator resource gate excludes typecheck for this lane. Test command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-046.test.ts
--maxWorkers=1 --no-file-parallelism`. Oxfmt check passed on all assigned
source/test files; static `git diff --check` is pending final lane validation.
Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-047 — Tinkermon

Score: 8/10. Q907 timing and legal evolution stack/negative proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-047.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Tinkermon as a yellow level-3 Digimon
(Rookie, Virus, Fairy), 3 play cost, 3000 DP, with a yellow level-2
evolution requirement costing 0 memory. It has no regular, inherited, or
Security effect text. `node tools/kb/query.mjs card BT1-047` returned Q907,
which confirms that a Tinkermon played by BT1-056 Petermon cannot attack that
turn because it has just entered play. Comprehensive 7-1-2-1 covers the
same-turn attack prohibition and 8-1-3-1 through 8-1-3-3 covers the legal
evolution route, payment, source transition, and draw.

##### Implementation and proof map

`BT1-047.ts` registers only with `registerIrCard("BT1-047", compiled)` and
uses the residual-free empty IR representation appropriate for a vanilla
card. The module now exports `compiled` for exact focused assertions; there
is no `registerCard` or `@ts-nocheck` in assigned files.

`BT1-047.test.ts` pins every catalog field and the exact IR. It proves the
3-memory play cost and 3000 DP, a legal yellow level-2 evolution at 0 memory
with the normal evolution draw and preserved source identity, rejection of a
red level-2 route, and Q907's Petermon-played Tinkermon attack prohibition.

##### Peer review, static gates, and score

The vanilla representation and yellow Rookie evolution route match the
nearby BT1-045 peer. The Petermon cross-card case uses the accepted optional
play path and observes the newly entered Digimon restriction. It sets only
the public turn counter to 1 so the production summoning-sickness guard is
live; it does not inject `enterFieldTurnCount` or any effect timing. No
inherited, Security, trait-filter, optional, or once-per-turn clause applies
to Tinkermon itself. Deck and Security fixtures use ordinary cards only: no
Digi-Egg or numeric Security shorthand was found. The focused file passed
5/5 tests after formatting; the coordinator resource gate excludes typecheck
for this lane. Test command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-047.test.ts
--maxWorkers=1 --no-file-parallelism`. Oxfmt check passed on all assigned
source/test files; static `git diff --check` is pending final lane validation.
Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-048 — Patamon

Score: 8/10. exact reveal/filter/bottom order and legal evolution stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-048.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Patamon as a yellow level-3 Digimon
(Rookie, Data, Mammal), 3 play cost, 2000 DP, with a yellow level-2 evolution
requirement costing 0 memory. Its complete regular text is `[On Play] Reveal
4 cards from the top of your deck. Add all yellow Tamer cards among them to
your hand. Place the remaining cards at the bottom of your deck in any
order.` It has no inherited or Security effect text. `node tools/kb/query.mjs
card BT1-048` returned Q908: the effect may activate with 3 or fewer deck
cards and reveals as many as possible. Comprehensive 15-16-2-1 covers On
Play timing, 15-15-3-5 covers drawing from the unrevealed deck when relevant,
and 15-15-3-6 covers owner-chosen ordering of multiple cards returned to the
deck bottom. Rules 8-1-3-1 through 8-1-3-3 covers the legal evolution route,
payment, source transition, and draw.

##### Implementation and proof map

`BT1-048.ts` registers only with `registerIrCard("BT1-048", compiled)`. Its
single OnPlay action reveals exactly 4, adds all matching yellow Tamer cards
to hand, and returns the rest to the deck bottom in any order. Coverage is
`full` with an empty residual; no `registerCard` or `@ts-nocheck` exists in
assigned files.

`BT1-048.test.ts` pins every catalog field and the complete IR. Behavioral
proof covers a mixed reveal (two yellow Tamers added, red Tamer and Digimon
excluded), Q908's fewer-than-four deck boundary, player ordering of remaining
cards, no On Play activation during evolution, legal yellow level-2 evolution
with draw and source preservation, and an illegal red level-2 route.

##### Peer review, static gates, and score

The reveal shape was compared with BT1-010's generic Tamer reveal and
BT1-067's typed Digimon reveal; Patamon correctly uses `count: "all"` plus a
yellow color and Tamer-kind filter. No inherited, Security, trait-filter,
optional, or once-per-turn clause applies. Deck and Security fixtures use
ordinary cards only: no Digi-Egg, numeric Security shorthand, or injected
timing fixture was found. The focused file passed 6/6 tests after formatting;
the coordinator resource gate excludes typecheck for this lane. Test command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-048.test.ts
--maxWorkers=1 --no-file-parallelism`. Oxfmt check passed on all assigned
source/test files; static `git diff --check` is pending final lane validation.
Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-049 — Labramon

Score: 8/10. real inherited stack/DP-reduction interaction and legal evolution proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-049.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Labramon as a yellow level-3 Rookie,
Vaccine/Beast, 3 play cost, 1000 DP, with a yellow level-2 evolution
requirement costing 0 memory. Its only printed clause is the inherited
`[Your Turn] When an opponent's Digimon is deleted by dropping to 0 DP,
trigger Draw 1` effect; it has no regular or Security text. The card query
returned Q909 and Q910: simultaneous deletion of multiple opposing Digimon
draws only one card, including when the deletion is caused by an effect.
Comprehensive rules 4-3-3, 4-8-1/4-8-2, 8-1-3-1 through 8-1-3-3, 15-3-1
through 15-3-3, 16-8-2/16-8-3, and 17-1-3 cover inherited sources,
digivolution payment/draw, mandatory Draw, and simultaneous rule processing.

##### Implementation and proof map

`BT1-049.ts` exports a residual-free `CompiledCard` and registers executable
behavior only through `registerIrCard("BT1-049", compiled)`. The `YourTurn`
inherited effect watches `onDeletionOf` for an opponent Digimon, requires both
`triggerDeletedByDpZero` and `triggerIsFirstDeletedPermanent`, then draws one.
That first-deleted boundary prevents Q909/Q910's simultaneous deletions from
scaling the draw. No `registerCard` or `@ts-nocheck` exists.

`BT1-049.test.ts` pins all catalog fields and the exact IR. Focused behavior
covers a DP-zero deletion, rejection of effect deletion, one draw for two
simultaneous DP-zero deletions, and no draw during the opponent's turn. The
new stack case evolves a yellow level-2 source, checks the mandatory evolution
draw and preserved source, and then proves the inherited watcher fires. A red
level-2 negative proves the color boundary.

##### Peer review, static gates, and score

The watcher shape matches the accepted BT1-041-050 IR audit and other
`onDeletionOf` implementations; the `Digimon` source filter excludes Tamers
and non-Digimon cards. No optional, Security, or once-per-turn clause applies.
Fixtures use ordinary cards only: no Digi-Egg appears in deck/Security and no
numeric Security shorthand or injected timing is used. Focused Vitest passed:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-049.test.ts
--maxWorkers=1 --no-file-parallelism` — 1 file, 7 tests (566 ms). Typecheck is
not run under the coordinator's resource gate. Static `git diff --check`
passed. Worker score: 8/10; delivery gates remain with the coordinator.

### BT1-050 — Liollmon

Score: 8/10. full catalog/IR and legal evolution/color-boundary proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-050.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Liollmon as a yellow level-3 Rookie,
Vaccine/Holy Beast, 3 play cost, 4000 DP, with a yellow level-2 evolution
requirement costing 0 memory. It has no regular, inherited, or Security text.
The card query returned no card-specific Q&A or erratum. Comprehensive rules
4-3-3, 4-8-1/4-8-2, and 8-1-3-1 through 8-1-3-3 cover source identity,
digivolution requirements, payment, placement, and mandatory evolution draw.

##### Implementation and proof map

`BT1-050.ts` exports a residual-free empty `CompiledCard` and registers only
with `registerIrCard("BT1-050", compiled)`, the correct representation for a
vanilla Digimon. The module has no `registerCard` or `@ts-nocheck`.

`BT1-050.test.ts` pins all catalog fields, confirms absent effect text, and
asserts the exact empty IR. It proves the 3-memory play cost and 4000 DP, a
yellow level-2 evolution at 0 memory with the mandatory draw and preserved
source identity, and rejection of a red level-2 route.

##### Peer review, static gates, and score

The representation and yellow Rookie route match the neighboring BT1-047
vanilla peer. No trigger, inherited, Security, optional, once-per-turn, or
trait-filter clause applies. Fixtures use ordinary cards only: no Digi-Egg is
placed in deck/Security and no numeric Security shorthand or injected timing
appears. Focused Vitest passed: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-050.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file,
4 tests (570 ms). Typecheck is not run under the coordinator's resource gate.
Static `git diff --check` passed. Worker score: 8/10; delivery gates remain
with the coordinator.

### BT1-051 — Reppamon

Score: 8/10. full catalog/IR and legal evolution/color-boundary proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-051.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Reppamon as a yellow level-4 Champion,
Vaccine/Holy Beast, 3 play cost, 4000 DP, with a yellow level-3 evolution
requirement costing 2 memory. It has no regular, inherited, or Security text.
The card query returned no card-specific Q&A or erratum. Comprehensive rules
4-3-3, 4-8-1/4-8-2, and 8-1-3-1 through 8-1-3-3 cover source identity,
digivolution requirements, payment, placement, and mandatory evolution draw.

##### Implementation and proof map

`BT1-051.ts` exports a residual-free empty `CompiledCard` and registers only
with `registerIrCard("BT1-051", compiled)`, the correct representation for a
vanilla Digimon. The module has no `registerCard` or `@ts-nocheck`.

`BT1-051.test.ts` pins all catalog fields, confirms absent effect text, and
asserts the exact empty IR. It proves the 3-memory play cost and 4000 DP, a
yellow level-3 evolution at exactly 2 memory with the mandatory draw and
preserved source identity, and rejection of a red level-3 route.

##### Peer review, static gates, and score

The representation and yellow Champion route match BT1-050 and nearby
residual-free vanilla peers. No trigger, inherited, Security, optional,
once-per-turn, or trait-filter clause applies. Fixtures use ordinary cards
only: no Digi-Egg is placed in deck/Security and no numeric Security shorthand
or injected timing appears. Focused Vitest passed: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-051.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file,
4 tests (670 ms). Typecheck is not run under the coordinator's resource gate.
Static `git diff --check` passed. Worker score: 8/10; delivery gates remain
with the coordinator.

### BT1-052 — Seasarmon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-052.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Seasarmon as a yellow level-4 Champion,
Vaccine/Holy Beast, 4 play cost, 4000 DP, with a yellow level-3 evolution
requirement costing 2 memory. Its only regular text is `<Jamming>` (this
Digimon can't be deleted in battles against Security Digimon); it has no
inherited or Security text. The card query returned no card-specific Q&A or
erratum. Comprehensive rules 4-3-3, 4-8-1/4-8-2, 8-1-3-1 through 8-1-3-3,
16-9-1/16-9-2, and 17-1-3 cover stacks, evolution, Jamming's Security-only
deletion prevention, persistence, and simultaneous processing.

##### Implementation and proof map

`BT1-052.ts` exports a residual-free `CompiledCard` with one `Static` keyword
entry for Jamming and registers executable behavior only through
`registerIrCard("BT1-052", compiled)`. There is no `registerCard` or
`@ts-nocheck`.

`BT1-052.test.ts` pins all catalog fields and exact keyword IR. It proves the
keyword is present, survives a stronger Security Digimon battle, does not
prevent deletion against a battle-area Digimon, and remains after a legal
yellow level-3 evolution with source identity preserved. A red level-3
negative proves the printed color boundary.

##### Peer review, static gates, and score

The Jamming representation matches other static keyword implementations and
the battle proof distinguishes Security Digimon from battle-area Digimon.
No inherited, optional, or once-per-turn clause applies. Fixtures use ordinary
cards only: no Digi-Egg appears in deck/Security and no numeric Security
shorthand or injected timing is used. Focused Vitest passed:
`pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-052.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file,
6 tests (629 ms). Typecheck is not run under the coordinator's resource gate.
Static `git diff --check` passed. Worker score: 8/10; delivery gates remain
with the coordinator.

### BT1-053 — Darcmon

Score: 8/10. Q911/Q912 and legal evolution/target-boundary proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-053.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Darcmon as a yellow level-4 Champion,
Vaccine/Angel, 4 play cost, 4000 DP, with a yellow level-3 evolution
requirement costing 2 memory. Its only regular text is `[Your Turn] When you
play a level 3 yellow Digimon, if this Digimon is suspended, trigger <Draw 1>`;
there is no inherited or Security text. The card query returned Q911 and Q912,
which confirm that effect-played Digimon count as played and breeding-to-battle
movement does not. Comprehensive rules 4-3-3, 8-1-3-1 through 8-1-3-3,
15-8-3-1 through 15-8-3-4, and 15-16-8-1 cover stack/source identity,
evolution payment and draw, trigger conditions, and the Your Turn window.

##### Implementation and proof map

`BT1-053.ts` is a residual-free `CompiledCard` registered exclusively with
`registerIrCard("BT1-053", compiled)`. The Your Turn effect installs a
`whenPlayed` watcher restricted to the controller's yellow level-3 Digimon,
and its body draws exactly one only while the source Darcmon is suspended.
There is no `registerCard` or `@ts-nocheck`.

`BT1-053.test.ts` pins every catalog field and the exact IR. Behavioral proof
covers suspended and unsuspended boundaries, yellow level-3 versus yellow
level-4/green level-3 negatives, multiple Darcmon copies, Q911 effect play,
and Q912 breeding movement. It also proves a legal yellow level-3 evolution,
the 2-memory payment, mandatory evolution draw, preserved source stack, and
the later suspended-triggered play.

##### Peer review, runtime gates, and score

The watcher shape matches the nearby BT1-082 `YourTurn`/`SubTrigger` peer,
while the restricted level/color source filter and suspension condition are
specific to Darcmon. Fixtures contain no Digi-Egg in deck/Security, no numeric
Security shorthand, and no injected timing. Focused Vitest passed: `pnpm
--filter @aegis/api exec vitest run src/cards/BT1/BT1-053.test.ts
--maxWorkers=1 --no-file-parallelism` — 1 file, 10 tests passed. Typecheck,
build, and collection suites were intentionally not run by the lane. The
static `git diff --check` is clean. Coordinator delivery gates remain.

Executed command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-053.test.ts
--maxWorkers=1 --no-file-parallelism`. Worker score: 8/10; delivery gates
remain with the coordinator.

### BT1-054 — Liamon

Score: 8/10. Q914 and legal evolution/source-stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-054.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Liamon as a yellow level-4 Champion,
Vaccine/Holy Beast, 4 play cost, 4000 DP, with a yellow level-3 evolution
requirement costing 3 memory. Its only regular text is `[When Attacking] If
you have 3 or more memory, 1 of your opponent's Digimon gets -2000 DP for the
turn`; there is no inherited or Security text. The card query returned Q914,
which confirms that once the conditional effect activates, a later memory drop
does not undo the reduction. Comprehensive rules 8-1-3-1 through 8-1-3-3,
15-8-3-1 through 15-8-3-4, 15-16-5-1, and the turn-duration rules cover legal
evolution, attack timing, the memory boundary, and expiry.

##### Implementation and proof map

`BT1-054.ts` is a residual-free `CompiledCard` registered exclusively with
`registerIrCard("BT1-054", compiled)`. The When Attacking action targets exactly
one opposing Digimon, applies -2000 DP for the turn, and gates activation on
the attacking player's memory being at least 3. There is no `registerCard` or
`@ts-nocheck`.

`BT1-054.test.ts` pins every catalog field and exact IR. Behavioral proof
covers the 3-memory positive, exact 2-memory negative, Q914 memory reduction
after activation, end-of-turn restoration, and a legal yellow level-3
evolution into Liamon with its 3-memory cost, evolution draw, preserved base
stack/source, and subsequent attack trigger.

##### Peer review, runtime gates, and score

The conditional memory shape matches BT1-018's controller-scoped
`memoryAtLeast` condition, and the attack timing matches the direct
`WhenAttacking` peers. Fixtures contain no Digi-Egg in deck/Security, no
numeric Security shorthand, and no injected timing. Focused Vitest passed:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-054.test.ts
--maxWorkers=1 --no-file-parallelism` — 1 file, 7 tests passed. Typecheck,
build, and collection suites were intentionally not run by the lane. The
static `git diff --check` is clean. Coordinator delivery gates remain.

Executed command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-054.test.ts
--maxWorkers=1 --no-file-parallelism`. Worker score: 8/10; delivery gates
remain with the coordinator.

### BT1-055 — Angemon

Score: 8/10. Q915/Q916 and legal evolution/source-stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-055.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Angemon as a yellow level-4 Champion,
Vaccine/Angel, 5 play cost, 3000 DP, with a yellow level-3 evolution
requirement costing 2 memory. Its only regular text is `[On Play] 1 of your
opponent's Digimon gets -3000 DP for the turn`; there is no inherited or
Security text. The card query returned no card-specific Q&A or erratum.
Comprehensive rules 8-1-3-1 through 8-1-3-3, 15-16-2-1, 15-8-3-1 through
15-8-3-4, and the DP-zero rule cover legal evolution, On Play timing, target
scope, duration, and deletion after the reduction.

##### Implementation and proof map

`BT1-055.ts` is a residual-free `CompiledCard` registered exclusively with
`registerIrCard("BT1-055", compiled)`. Its On Play action targets exactly one
opponent Digimon and applies -3000 DP for the turn. There is no `registerCard`
or `@ts-nocheck`.

`BT1-055.test.ts` pins every catalog field and exact IR. Behavioral proof
covers the positive reduction and end-of-turn restoration, DP-zero deletion,
the no-target path, and the distinction between play and digivolution. A
legal yellow level-3 evolution proves the 2-memory payment, mandatory
evolution draw, preserved source stack, and that no On Play reduction fires
from evolution.

##### Peer review, runtime gates, and score

The target and duration match direct On Play DP peers such as BT1-001/BT1-007
in the shared IR vocabulary, with Angemon correctly using a mandatory
opponent-targeted action rather than an inherited trigger. Fixtures contain no
Digi-Egg in deck/Security, no numeric Security shorthand, and no injected
timing. Focused Vitest passed: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-055.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file,
7 tests passed. Typecheck, build, and collection suites were intentionally not
run by the lane. The static `git diff --check` is clean. Coordinator delivery
gates remain.

Executed command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-055.test.ts
--maxWorkers=1 --no-file-parallelism`. Worker score: 8/10; delivery gates
remain with the coordinator.

### BT1-056 — Petermon

Score: 8/10. corrected legal Security fixture and full clause/stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-056.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Petermon as a yellow level-4 Champion,
Data/Fairy, 5 play cost, 5000 DP, with a yellow level-3 evolution requirement
costing 2 memory. Its only regular text is `[On Play] You may play 1
[Tinkermon] from your hand or recycle bin without paying its memory cost`; it
has no inherited or Security text. The card query returned Q915 and Q916,
which confirm that hand and trash are one shared choice of one copy and that
the played Digimon cannot attack that turn. Comprehensive rules 8-1-3-1
through 8-1-3-3, 15-16-2-1, and the newly-played Digimon attack restriction
cover evolution/source identity, On Play timing, and the no-attack boundary.

##### Implementation and proof map

`BT1-056.ts` is a residual-free `CompiledCard` registered exclusively with
`registerIrCard("BT1-056", compiled)`. The optional On Play action searches the
controller's hand and trash as one pool, matches the exact name `Tinkermon`,
selects at most one card, and plays it with `payCost: false`. There is no
`registerCard` or `@ts-nocheck`.

`BT1-056.test.ts` pins every catalog field and exact IR, including the
bracketed exact-name boundary. Behavioral proof covers free play from trash,
free play from hand and Q916's attack restriction, Q915's one-copy limit
when both zones contain candidates, optional refusal, opponent ownership and
the no-effect evolution path. A legal yellow level-3 evolution proves the
2-memory payment, mandatory evolution draw, preserved source stack, and that
the Tinkermon remains in hand because Petermon's On Play does not trigger on
evolution.

##### Peer review, runtime gates, and score

The free-play shape matches BT1-044's `PlayWithoutCost` peer, while the
controller-scoped exact-name filter preserves the bracket boundary. Fixtures
contain no Digi-Egg in deck/Security, no numeric Security shorthand, and no
injected timing. Focused Vitest passed: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-056.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file,
9 tests passed. Typecheck, build, and collection suites were intentionally not
run by the lane. The static `git diff --check` is clean. Coordinator delivery
gates remain.

Executed command:
`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-056.test.ts
--maxWorkers=1 --no-file-parallelism`. Worker score: 8/10; delivery gates
remain with the coordinator.

### BT1-057 — Sirenmon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-057.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Sirenmon as a yellow level-5 Ultimate,
Data/Shaman, with play cost 5, 6000 DP, and one yellow level-4 evolution
requirement costing 2 memory. It has no regular, inherited, or Security text;
its rarity is U, maximum count is 4, image is `BT1-057`, and Japanese name is
`セイレーンモン`. `node tools/kb/query.mjs card BT1-057` returned no
card-specific knowledge-base entries. Comprehensive rules 4-1-1/4-1-4,
8-1-3-1 through 8-1-3-3, 4-2-3, and 4-6-1 through 4-6-7 cover cost payment,
legal evolution/draw/stacking, and inherited-source visibility.

##### Implementation and proof map

`BT1-057.ts` is a residual-free vanilla `CompiledCard` registered exclusively
with `registerIrCard("BT1-057", compiled)`. The module has no `registerCard`,
`RawUnparsed`, or `@ts-nocheck`. The focused test pins every catalog field and
the exact empty IR, then proves the printed play cost and DP. A real legal
yellow level-4 (`BT1-056`) evolution proves the 2-memory cost, mandatory
evolution draw, top-card identity, and retained source stack. A red level-4
(`BT1-014`) route is rejected despite matching the level.

##### Peer/stack review and score

Vanilla yellow Ultimate peers BT1-058 and BT1-059 use the same empty IR shape;
the legal evolution and red-color negative are directly comparative. Assigned
fixtures contain only main-deck cards in deck/Security, no Digi-Egg, no numeric
Security shorthand, and no injected timing. Focused Vitest passed: 1 file, 4
tests, 529 ms (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-057.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
registration/suppression/fixture scans, Oxfmt formatting, and `git diff --check`
are complete. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-058 — Chirinmon

Score: 8/10. Q917/Q918/Q1080/Q1087/Q1097/Q1415 natural turn/prevention proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-058.md` (2026-09-10):

##### Catalog, KB, and rules evidence

The committed catalog identifies Chirinmon as a yellow level-5 Ultimate,
Vaccine/Holy Beast, with play cost 6, 7000 DP, and one yellow level-4 evolution
requirement costing 3 memory. Its complete text is `[When Attacking] Gain 3
memory. At end of turn， lose 3 memory.` It has no inherited or Security text;
its rarity is U, maximum count is 4, image is `BT1-058`, and Japanese name is
`チィリンモン`.

`node tools/kb/query.mjs card BT1-058` returned Q917, Q918, Q1080, Q1087,
Q1097, and Q1415. Q917 confirms the delayed loss remains after attack-triggered
deletion; Q918 confirms passing after the gain moves the marker to the
opponent's side before the additional loss; and Q1080/Q1087/Q1097/Q1415
confirm that memory-gain prevention does not suppress a specified loss.
Comprehensive rules 4-1-1/4-1-4, 8-1-3-1 through 8-1-3-3, 11-1-3 through
11-1-5, 15-8-3-1 through 15-8-3-6, and 18-1-1/18-1-2 cover memory direction,
legal evolution, attack timing, trigger persistence, and delayed processing.

##### Implementation and proof map

`BT1-058.ts` is a residual-free `CompiledCard` registered exclusively with
`registerIrCard("BT1-058", compiled)`. Its single mandatory `WhenAttacking`
effect gains exactly 3 memory and schedules exactly one -3 `GainMemory` at the
owner's end of turn. There is no `registerCard`, `RawUnparsed`, or
`@ts-nocheck`. The focused test pins all catalog fields and the exact IR.
Behavioral proof covers the +3 gain, Q917 deletion followed by a real turn end,
Q918 passing followed by the real turn end, and Q1080/Q1087/Q1097/Q1415 through
an actual BT3-046 Terriermon memory-gain prevention peer. A legal yellow-level-4
evolution proves exact 3-memory payment, mandatory draw, source identity, and
the attack trigger; a red level-4 route is rejected.

##### Peer/stack review and score

The IR matches delayed-memory peers BT1-021, BT1-040, and BT1-075, including
the source-independent pending loss boundary. The Terriermon fixture is a
comparative prevention case, not an injected timing check. All assigned
deck/Security fixtures use explicit main-deck cards, contain no Digi-Egg or
numeric Security shorthand, and use no direct timing injection.

Focused Vitest passed: 1 file, 7 tests, 608 ms (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-058.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
registration/suppression/fixture scans, Oxfmt formatting, and `git diff --check`
are complete. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-059 — Piximon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-059.md` (2026-09-10):

##### Catalog and KB evidence

The committed catalog identifies Piximon as a yellow level-5 Ultimate,
Data/Fairy, with play cost 6, 9000 DP, and one yellow level-4 evolution
requirement costing 3 memory. It has no regular, inherited, or Security text;
its rarity is C, maximum count is 4, image is `BT1-059`, and Japanese name is
`ピッコロモン`. `node tools/kb/query.mjs card BT1-059` returned no
card-specific knowledge-base entries. Comprehensive rules 4-1-1/4-1-4,
8-1-3-1 through 8-1-3-3, 4-2-3, and 4-6-1 through 4-6-7 cover cost payment,
legal evolution/draw/stacking, and inherited-source visibility.

##### Implementation and proof map

`BT1-059.ts` is a residual-free vanilla `CompiledCard` registered exclusively
with `registerIrCard("BT1-059", compiled)`. The module has no `registerCard`,
`RawUnparsed`, or `@ts-nocheck`. The focused test pins every catalog field and
the exact empty IR, then proves the printed play cost and DP. A real legal
yellow level-4 (`BT1-056`) evolution proves the 3-memory cost, mandatory
evolution draw, top-card identity, and retained source stack. A red level-4
(`BT1-014`) route is rejected despite matching the level.

##### Peer/stack review and score

Vanilla yellow Ultimate peers BT1-057 and BT1-058 use the same empty IR shape;
the legal evolution and red-color negative are directly comparative. Assigned
fixtures contain only main-deck cards in deck/Security, no Digi-Egg, no numeric
Security shorthand, and no injected timing. Focused Vitest passed: 1 file, 4
tests, 545 ms (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-059.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
registration/suppression/fixture scans, Oxfmt formatting, and `git diff --check`
are complete. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-060 — MagnaAngemon

Score: 8/10. Q919 Recovery/security boundaries and legal multi-step stack; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-060.md` (2026-09-10):

##### Catalog, KB, and rules evidence

The committed catalog identifies MagnaAngemon as a yellow level-5 Ultimate,
Vaccine/Archangel, with play cost 7, 6000 DP, and one yellow level-4 evolution
requirement costing 3 memory. Its regular text is `[On Play] Trigger ＜Recovery
+1 (Deck)＞. (Place the top card of your deck on top of your security stack.)`;
its inherited text is `[Your Turn] This Digimon gets +1000 DP for every 3
security cards you have.` It has no Security text; rarity is SR, maximum count
is 4, image is `BT1-060`, and Japanese name is `ホーリーエンジェモン`.

`node tools/kb/query.mjs card BT1-060` returned Q919, which confirms that two
or fewer security cards grant no inherited DP bonus. Comprehensive rules
4-2-3, 4-6-1 through 4-6-7, 8-1-3-1 through 8-1-3-3, 15-3-1 through 15-3-3,
15-16-2-1, and 16-6-1/16-6-2 cover inherited-source behavior, legal evolution,
On Play timing, and Recovery placement.

##### Implementation and proof map

`BT1-060.ts` is a residual-free `CompiledCard` registered exclusively with
`registerIrCard("BT1-060", compiled)`. Its On Play IR recovers exactly one card;
the inherited Your Turn IR grants +1000 for each complete group of three of
the controller's security cards. There is no `registerCard`, `RawUnparsed`, or
`@ts-nocheck`. The focused test pins every catalog field and exact IR.
Behavioral proof recovers the explicit top main-deck card on play, proves the
Q919 boundary at 2 security and the 5/6-card group boundaries, and proves no
bonus during the opponent's turn. A real legal stack evolves yellow level 4
BT1-056 into MagnaAngemon and then yellow level 5 BT1-062, verifying both
3-memory payments, two mandatory evolution draws, source identity, and the
inherited DP on the top card. A direct yellow-level-4 evolution proves On Play
does not trigger during digivolution, while a red level-4 route is rejected.

##### Peer/stack review and score

The Recovery shape matches BT1-063's recovery processing, while the inherited
security-group scaling is compared against the same continuous-turn boundary
used by BT1-063. The stack tests use an actual legal BT1-056 → BT1-060 →
BT1-062 route rather than seeded invalid same-level source cards. All assigned
deck/Security fixtures use explicit main-deck cards, contain no Digi-Egg or
numeric Security shorthand, and use no injected timing.

Focused Vitest passed: 1 file, 8 tests, 582 ms (2026-09-10):

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-060.test.ts --maxWorkers=1 --no-file-parallelism`

No typecheck, build, collection, or engine suite was run in this lane. Static
registration/suppression/fixture scans, Oxfmt formatting, and `git diff --check`
are complete. Worker score: 8/10 per brief; delivery gates remain with the
coordinator.

### BT1-061 — Mistymon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-061.md` (2026-09-10):

##### Catalog and rules

The committed catalog record identifies Mistymon as a yellow level-5 Ultimate / Magic Warrior, play cost 7, 7000 DP, evolving from a yellow level-4 for 3 memory. Its only printed clause is `[On Play] 2 of your opponent's Digimon get -3000 DP for the turn.`

`node tools/kb/query.mjs card BT1-061` returns Q920: choose as many Digimon as possible; choosing only one is legal only when the opponent has exactly one Digimon in play. Comprehensive rules support the timing (`15-16-2`, On Play), individual target processing (`15-10-2`/`15-11-1`), and `forTheTurn` DP duration. No ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-061.ts` registers only `registerIrCard("BT1-061", compiled)`. The IR has one `OnPlay` action targeting the opponent's Digimon, count 2, with `forceSelection`, amount -3000, and `forTheTurn` duration. The interpreter's target boundary clamps the required minimum to the available count, while Q920 is exercised by the one-target and multi-target decision cases.

The colocated suite now covers the complete catalog/IR contract, two-target resolution and turn-end restoration, Q920's exact min/max decision boundaries with three and one opposing Digimon, a legal yellow level-4-to-level-5 evolution for exactly 3 memory with source stack and evolution draw, and rejection of a red level-4 source.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-061.test.ts --maxWorkers=1 --no-file-parallelism` — **6 tests passed**.
- Typecheck/build/collection commands were not run (worker hard gate and resource alert).
- `pnpm exec oxfmt --check` on all four assigned tests — passed; `git diff --check` on assigned modules/tests/reports — passed.
- Static scan: no duplicate `registerCard`, no `@ts-nocheck`, no numeric security fixtures, and no BT1-001..008 in deck/security contexts.

##### Remaining gaps

- Behavioral command and mutation proof remain coordinator gates; this worker was explicitly static-only.
- No card-specific engine seam or retained red test is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-062 — SlashAngemon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-062.md` (2026-09-10):

##### Catalog and rules

The committed catalog record identifies SlashAngemon as a yellow level-6 Mega / Authority, play cost 11, 8000 DP, evolving from a yellow level-5 for 3 memory. Its only printed clause is `[When Digivolving] 1 of your opponent's Digimon gets -8000 DP for the turn.`

`node tools/kb/query.mjs card BT1-062` returns no knowledge-base entries. Comprehensive rules support the post-digivolution timing (`15-16-3`), one individual opponent-Digimon target, DP-zero rule deletion (`17-1-3-1-1`), and `forTheTurn` duration. No erratum or ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-062.ts` registers only `registerIrCard("BT1-062", compiled)`. The IR has one `WhenDigivolving` action targeting exactly one opposing Digimon, amount -8000, duration `forTheTurn`. Rule checks delete a target that reaches 0 DP after the action; a surviving target retains the reduction only through the turn.

The colocated suite now covers the complete catalog/IR contract, exact-8000 deletion, a 10000-DP target surviving at 2000 until turn end and restoring, an empty-opponent board, a legal yellow level-5-to-level-6 stack for 3 memory with source identity and evolution draw, and rejection of a red level-5 source.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-062.test.ts --maxWorkers=1 --no-file-parallelism` — **5 tests passed**.
- Typecheck/build/collection commands were not run (worker hard gate and resource alert).
- `pnpm exec oxfmt --check` on all four assigned tests — passed; `git diff --check` on assigned modules/tests/reports — passed.
- Static scan: no duplicate `registerCard`, no `@ts-nocheck`, no numeric security fixtures, and no BT1-001..008 in deck/security contexts.

##### Remaining gaps

- Behavioral command and mutation proof remain coordinator gates; this worker was explicitly static-only.
- No card-specific engine seam or retained red test is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-063 — Seraphimon

Score: 8/10. corrected explicit Security fixtures and exact boundary/stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-063.md` (2026-09-10):

##### Catalog and rules

The committed catalog record identifies Seraphimon as a yellow level-6 Mega / Vaccine with traits Seraph and Three Great Angels, play cost 12, 10000 DP, evolving from a yellow level-5 for 3 memory. Its clauses are `[When Digivolving] Trigger <Recovery +1 (Deck)>` and `[Your Turn] While you have 3 or more security cards, this Digimon gains <Security Attack +1>`.

`node tools/kb/query.mjs card BT1-063` returns Q921: six security cards still grant only Security Attack +1, never +2. Comprehensive rules define When Digivolving (`15-16-3`), Recovery (`16-6-1`/`16-6-2`), and Security Attack as a persistent additional check (`16-4-1`/`16-4-2`). The local rules state Recovery places the top deck card face down on top of security with no stack-size limit. No ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-063.ts` registers only `registerIrCard("BT1-063", compiled)`. The IR has a `WhenDigivolving` `Recover` amount 1 and a `YourTurn` self-targeted `GainKeyword` SecurityAttack amount 1, duration `forTheTurn`, gated by `securityAtLeast: 3`.

The colocated suite now covers the complete catalog/IR contract, real evolution draw plus Recovery top-deck identity and stack source, the exact security boundary at 2/3/6 cards, Q921's no-scaling result at six cards, opponent-turn exclusion, and rejection of a red level-5 source. All security fixtures use explicit inert main-deck BT1-050 cards; no numeric security shorthand remains.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-063.test.ts --maxWorkers=1 --no-file-parallelism` — **8 tests passed**.
- Typecheck/build/collection commands were not run (worker hard gate and resource alert).
- `pnpm exec oxfmt --check` on all four assigned tests — passed; `git diff --check` on assigned modules/tests/reports — passed.
- Static scan: no duplicate `registerCard`, no `@ts-nocheck`, no numeric security fixtures, and no BT1-001..008 in deck/security contexts. BT1-007 occurs only as a legal `eggDeck` source in BT1-064's assigned suite.

##### Remaining gaps

- Behavioral command and mutation proof remain coordinator gates; this worker was explicitly static-only.
- The direct suite does not execute an attack/security-check flow; the observed keyword amount and Q921 boundary prove the card's persistent keyword contract, while full combat regression remains outside this lane.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-064 — Goblimon

Score: 8/10. real egg hatch/breeding evolution lifecycle and peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-064.md` (2026-09-10):

##### Catalog and rules

The committed catalog record identifies Goblimon as a green level-3 Rookie / Demon, play cost 2, 3000 DP, evolving from a green level-2 for 0 memory. It has no effect, inherited effect, or Security effect. `node tools/kb/query.mjs card BT1-064` returns no knowledge-base entries. Comprehensive rules for level/color evolution and the evolution bonus draw apply; no erratum or ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-064.ts` registers only `registerIrCard("BT1-064", compiled)`. The residual-free IR is intentionally `{ effects: [], coverage: "full", residual: [] }`, matching the vanilla catalog contract.

The colocated suite covers the full catalog and registry contract, ordinary play cost/DP, a real legal hatch of green Digi-Egg BT1-007 followed by a 0-memory breeding-area evolution with source stack and evolution draw, and rejection of a red level-3 source. BT1-007 is confined to `eggDeck`; no Digi-Egg appears in a main deck or security stack.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-064.test.ts --maxWorkers=1 --no-file-parallelism` — **4 tests passed**.
- Typecheck/build/collection commands were not run (worker hard gate and resource alert).
- `pnpm exec oxfmt --check` on all four assigned tests — passed; `git diff --check` on assigned modules/tests/reports — passed.
- Static scan: no duplicate `registerCard`, no `@ts-nocheck`, no numeric security fixtures, and no BT1-001..008 in deck/security contexts.

##### Remaining gaps

- Behavioral command and mutation proof remain coordinator gates; this worker was explicitly static-only.
- No card-specific engine seam or retained red test is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-065 — Mushroomon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-065.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Mushroomon as a green level-3 Rookie / Virus / Vegetation Digimon, play cost 2, 4000 DP, evolving from a green level-2 for 1 memory. It has no main, inherited, or Security effect. `node tools/kb/query.mjs card BT1-065` returns no knowledge-base entries. Comprehensive rules 8-1-1 through 8-1-3 cover the legal evolution procedure and evolution draw; no erratum or ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-065.ts` is a residual-free vanilla IR module and registers exactly once with `registerIrCard("BT1-065", compiled)`. The colocated suite asserts the catalog and exact empty IR, ordinary play for 2 memory at 4000 DP, a legal green level-2 evolution for 1 memory with the source stack and evolution draw, and rejection of a non-green level-2 source.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-065.test.ts --maxWorkers=1 --no-file-parallelism` — passed (4 tests).
- `pnpm exec oxlint <assigned BT1-065 files>` — passed.
- `pnpm exec oxfmt --check <assigned BT1-065 files>` — passed.
- `git diff --check -- <assigned BT1-065 files>` — passed.
- Static scans found no `@ts-nocheck`, legacy `registerCard`, numeric security fixtures, or Digi-Egg in deck/security zones. Typecheck/build/collection commands were not run per lane restrictions.

##### Remaining gaps

No card-specific gap is suspected. Worker delivery gates remain coordinator-owned.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-066 — Tentomon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-066.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Tentomon as a green level-3 Rookie / Vaccine / Insectoid Digimon, play cost 3, 2000 DP, evolving from a green level-2 for 0 memory. Its inherited clause is `[When Attacking] Suspend 1 of your opponent's Digimon with 3000 DP or less.` `node tools/kb/query.mjs card BT1-066` returns no knowledge-base entries. Comprehensive rules 15-16-5-1 define the attack-declaration timing and 8-1-1 through 8-1-3 define the legal stack procedure; no erratum or ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-066.ts` registers exactly once with `registerIrCard("BT1-066", compiled)`. Its full IR marks the effect inherited, uses `WhenAttacking`, targets exactly one opposing Digimon, and applies the inclusive `dp lte 3000` boundary. Tests cover the exact 3000 positive, 4000 negative, top-card/non-inherited negative, an actual green level-2-to-Tentomon evolution with 0 memory, evolution draw and source-stack identity, plus rejection of a non-green level-2 source.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-066.test.ts --maxWorkers=1 --no-file-parallelism` — passed (6 tests).
- `pnpm exec oxlint <assigned BT1-066 files>` — passed.
- `pnpm exec oxfmt --check <assigned BT1-066 files>` — passed after scoped formatting.
- `git diff --check -- <assigned BT1-066 files>` — passed.
- Static scans found no `@ts-nocheck`, legacy `registerCard`, numeric security fixtures, or Digi-Egg in deck/security zones. Typecheck/build/collection commands were not run per lane restrictions.

##### Remaining gaps

No card-specific gap is suspected. Worker delivery gates remain coordinator-owned.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-067 — Palmon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-067.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Palmon as a green level-3 Rookie / Data / Vegetation Digimon, play cost 3, 1000 DP, evolving from a green level-2 for 0 memory. Its only clause is `[On Play] Reveal 3 cards from the top of your deck. Add 1 level 4 Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order.` `node tools/kb/query.mjs card BT1-067` returns Q922 (2024-03-28), which confirms that a non-green level-4 Digimon may be added. Comprehensive rules 15-15-3-1 through 15-15-3-6 cover reveal processing, unrevealed-card draws, and owner-chosen bottom order; 15-16-2-1 defines On Play timing. No ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-067.ts` registers exactly once with `registerIrCard("BT1-067", compiled)`. The IR maps On Play to `RevealAdd` with `revealCount: 3`, an unqualified `kind: ["Digimon"]` plus exact `levels: [4]` add filter, and `deckBottomAnyOrder` for the remainder. Tests assert the complete catalog/IR contract, add a red level-4 card (Q922), exercise exact bottom ordering, handle a deck with fewer than three cards, and prove a legal green level-2-to-Palmon evolution for 0 memory with draw and source-stack identity; a non-green evolution source is rejected.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-067.test.ts --maxWorkers=1 --no-file-parallelism` — passed (6 tests).
- `pnpm exec oxlint <assigned BT1-067 files>` — passed.
- `pnpm exec oxfmt --check <assigned BT1-067 files>` — passed.
- `git diff --check -- <assigned BT1-067 files>` — passed.
- Static scans found no `@ts-nocheck`, legacy `registerCard`, numeric security fixtures, or Digi-Egg in deck/security zones. Typecheck/build/collection commands were not run per lane restrictions.

##### Remaining gaps

No card-specific gap is suspected. Q922 is covered by the explicit red level-4 fixture. Worker delivery gates remain coordinator-owned.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-068 — Kokuwamon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-068.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Kokuwamon as a green level-3 Rookie / Data / Machine Digimon, play cost 4, 2000 DP, evolving from a green level-2 for 1 memory. Its inherited clause is `[Your Turn] While this Digimon is level 6 or higher, it gains <Security Attack +1>.` Comprehensive rules 15-16-8-1 define Your Turn timing, 16-4-1 through 16-4-2 define the persistent Security Attack modifier, and 8-1-1 through 8-1-3 define legal evolution and stack identity. `node tools/kb/query.mjs card BT1-068` returns no knowledge-base entries. No erratum or ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-068.ts` registers exactly once with `registerIrCard("BT1-068", compiled)`. The full inherited IR uses a self-only target, `selfLevelAtLeast: 6`, exactly +1 Security Attack, and the valid `forTheTurn` duration. Tests cover level 6 and level 7 positive boundaries, below-level and opponent-turn negatives, top-card (not inherited) negative, a legal green level-2-to-Kokuwamon evolution for 1 memory with draw and source-stack identity, and rejection of a non-green source. The level-6/7 stack fixtures prove the inherited source is visible only beneath the host.

##### Commands and results

- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-068.test.ts --maxWorkers=1 --no-file-parallelism` — passed (8 tests).
- `pnpm exec oxlint <assigned BT1-068 files>` — passed.
- `pnpm exec oxfmt --check <assigned BT1-068 files>` — passed.
- `git diff --check -- <assigned BT1-068 files>` — passed.
- Static scans found no `@ts-nocheck`, legacy `registerCard`, numeric security fixtures, or Digi-Egg in deck/security zones. Typecheck/build/collection commands were not run per lane restrictions.

##### Remaining gaps

No card-specific gap is suspected. Worker delivery gates remain coordinator-owned.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-069 — Ogremon

Score: 8/10. Jamming Security boundary and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-069.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Ogremon as a green level-4 Champion / Demon
Digimon with play cost 4, 4000 DP, and one green level-3 evolution route for 2
memory. Its only printed clause is `<Jamming>`: it cannot be deleted in battles
against Security Digimon. It has no inherited or Security text.

`node tools/kb/query.mjs card BT1-069` returns no knowledge-base entries. The
comprehensive rules define Jamming as a persistent effect that prevents battle
deletion by an opponent's Security Digimon (`16-9-1` and `16-9-2`). General
digivolution rules (`8-1-1` through `8-1-2-8`) and the evolution bonus draw
apply. No catalog discrepancy, erratum, or ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-069.ts` has one registration,
`registerIrCard("BT1-069", compiled)`, with no legacy `registerCard` and no
`@ts-nocheck`. Its residual-free IR publishes only the static Jamming keyword.

The colocated suite statically covers the complete catalog/IR contract, keyword
visibility on the top card and absence while Ogremon is beneath another card,
a legal green level-3 evolution for exactly 2 memory with source stack and
bonus draw, and rejection of a red level-3 source. BT1-032 Frigimon is the
comparative Jamming peer; its security-battle and ordinary-battle boundaries
confirm the same keyword interpretation.

##### Commands and results

- Card KB query: no entries returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-069.test.ts --maxWorkers=1 --no-file-parallelism` — **6 tests passed**.
- Typecheck, build, and collection suites were **not run** under the lane gate.
- Static registration/`@ts-nocheck` inspection: clean.
- Fixture scan of assigned tests: no numeric `security: <n>` form, no Digi-Egg
  in deck/Security, and no BT1-001..BT1-008 fixture occurrence.
- `git diff --check`: passed.

##### Remaining gaps

Behavioral execution, mutation proof, and delivery gates remain coordinator work.
No card-specific engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-070 — Kuwagamon

Score: 8/10. exact target/no-target boundaries and legal evolution proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-070.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Kuwagamon as a green level-4 Champion /
Insectoid Digimon with play cost 4, 4000 DP, and one green level-3 evolution
route for 2 memory. Its only printed clause is `[On Play] Suspend 1 of your
opponent's Digimon.` It has no inherited or Security text.

`node tools/kb/query.mjs card BT1-070` returns no knowledge-base entries. The
comprehensive rules define `[On Play]` as triggering after the play action is
complete (`15-16-2-1`), and the target wording limits selection to one opposing
Digimon. `15-15-5-3` confirms an effect-immune card may still be chosen, while
`15-15-5-1` confirms the chosen card is not changed by the effect. Normal
digivolution rules and the evolution bonus draw also apply. No ambiguity was
found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-070.ts` has one registration,
`registerIrCard("BT1-070", compiled)`, with no legacy `registerCard` and no
`@ts-nocheck`. The IR has one `OnPlay` Suspend action with opponent/Digimon
filter, count 1, and `allowUnaffectableChoice: true`, preserving legal-choice
semantics for immune targets.

The colocated suite statically covers the complete catalog/IR contract, one
opposing Digimon suspension, exclusion of an opposing Tamer, the no-Digimon
boundary with no pending decision, a legal green level-3 evolution for exactly
2 memory with source stack and bonus draw, and rejection of a red level-3
source. BT1-079 Lillymon is the comparative target-filter peer and confirms
that effect keywords and card-kind boundaries are represented explicitly.

##### Commands and results

- Card KB query: no entries returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-070.test.ts --maxWorkers=1 --no-file-parallelism` — **6 tests passed**.
- Typecheck, build, and collection suites were **not run** under the lane gate.
- Static registration/`@ts-nocheck` inspection: clean.
- Fixture scan of assigned tests: no numeric `security: <n>` form, no Digi-Egg
  in deck/Security, and no BT1-001..BT1-008 fixture occurrence.
- `git diff --check`: passed.

##### Remaining gaps

Behavioral execution, mutation proof, and delivery gates remain coordinator work.
No card-specific engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-071 — Vegiemon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-071.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Vegiemon as a green level-4 Champion /
Carnivorous Plant Digimon with play cost 4, 6000 DP, and one green level-3
evolution route for 1 memory. It has no effect, inherited effect, or Security
text.

`node tools/kb/query.mjs card BT1-071` returns no knowledge-base entries. The
comprehensive rules for ordinary play, color/level evolution, and the mandatory
evolution bonus draw apply. No catalog discrepancy, erratum, or ambiguity was
found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-071.ts` has one registration,
`registerIrCard("BT1-071", compiled)`, with no legacy `registerCard` and no
`@ts-nocheck`. Its residual-free IR is intentionally `{ effects: [],
coverage: "full", residual: [] }`, matching the vanilla catalog contract.

The colocated suite statically covers the complete catalog/IR contract,
ordinary play for exactly 4 memory as 6000 DP, a legal green level-3 evolution
for exactly 1 memory with source stack and bonus draw, and rejection of a red
level-3 source. BT1-064 Goblimon and BT1-073 Kabuterimon provide comparative
green evolution-stack peers with the same source-color boundary.

##### Commands and results

- Card KB query: no entries returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-071.test.ts --maxWorkers=1 --no-file-parallelism` — **4 tests passed** after exporting the compiled IR value.
- Typecheck, build, and collection suites were **not run** under the lane gate.
- Static registration/`@ts-nocheck` inspection: clean.
- Fixture scan of assigned tests: no numeric `security: <n>` form, no Digi-Egg
  in deck/Security, and no BT1-001..BT1-008 fixture occurrence.
- `git diff --check`: passed.

##### Remaining gaps

Behavioral execution, mutation proof, and delivery gates remain coordinator work.
No card-specific engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-072 — Woodmon

Score: 8/10. optional Blocker decline, corrected legal fixtures and stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-072.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Woodmon as a green level-4 Champion /
Vegetation Digimon with play cost 5, 6000 DP, and one green level-3 evolution
route for 2 memory. Its clauses are `<Blocker>` (the optional block redirect)
and `[When Attacking] Lose 2 memory`; it has no inherited or Security text.

`node tools/kb/query.mjs card BT1-072` returns Q923: Woodmon may attack with
less than 2 memory; the memory counter can move to the opponent's side and the
turn does not end until the attack finishes. The comprehensive rules define
`[When Attacking]` at attack declaration (`15-16-5-1`), Blocker as a persistent
keyword (`16-5-1` and `16-5-2`), and blocking as a once-per-attack target switch
(`12-1-1` and `12-1-2`). No ambiguity or catalog discrepancy was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-072.ts` has one registration,
`registerIrCard("BT1-072", compiled)`, with no legacy `registerCard` and no
`@ts-nocheck`. The residual-free IR publishes static Blocker and one
WhenAttacking `GainMemory` action for -2.

The colocated suite statically covers the complete catalog/IR contract, Blocker
visibility only on the top card, optional block redirection and refusal, the
real player-attack security boundary, legal green level-3 evolution for exactly
2 memory with source stack and retained Blocker, exact -2 memory loss, Q923's
less-than-2-memory boundary, and rejection of Blocker while Woodmon is beneath
another card. BT1-031 Monmon is the comparative optional-Blocker peer.

##### Commands and results

- Card KB query: Q923 covered by the dedicated low-memory attack test.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-072.test.ts --maxWorkers=1 --no-file-parallelism` — **8 tests passed**.
- Typecheck, build, and collection suites were **not run** under the lane gate.
- Static registration/`@ts-nocheck` inspection: clean.
- Fixture scan of assigned tests: no numeric `security: <n>` form, no Digi-Egg
  in deck/Security; previous BT1-001 Digi-Egg fixtures were replaced with inert
  main-deck BT1-010. No BT1-001..BT1-008 occurrence remains in deck/Security.
- `git diff --check`: passed.

##### Remaining gaps

Behavioral execution, mutation proof, and delivery gates remain coordinator work.
No card-specific engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-073 — Kabuterimon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-073.md` (2026-09-10):

##### Catalog and rules

The catalog identifies Kabuterimon as a green level-4 Champion / Insectoid
Digimon (play cost 6, 5000 DP), with one green level-3 evolution route costing
1 memory. Its only clause is the inherited `[Your Turn]` effect: this Digimon
gets +1000 DP for every suspended Digimon the opponent has. There is no main,
Security, or alternate evolution text. The card KB query returned no entries.

The rules search identified the persistent-effect treatment in comprehensive
§15-8-2. The implementation's opponent/Digimon/suspended filter and turn
trigger preserve the printed boundaries; the self target prevents modifying a
different permanent.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-073.ts` has one `registerIrCard("BT1-073", compiled)`
registration, no legacy registration, no `@ts-nocheck`, and a residual-free
full-coverage IR. The contract test maps the complete catalog record and IR.

Clause-to-proof mapping:

- inherited `[Your Turn]` / +1000 per suspended opposing Digimon: positive
  two-Digimon count test, all-unsuspended negative, suspended Tamer exclusion,
  opponent-turn negative, and top-card-only test; all resolve through the
  compiled `YourTurn` `ModifyDP` scaling action;
- evolution and stack: green BT1-064 -> BT1-073 -> BT1-075 route pays 1 + 3
  memory, leaves memory at 0, preserves source identity, and exposes the
  inherited +2000 DP; red level-3 source is rejected;
- peer boundary: the mixed suspended Digimon/Tamer board verifies the same
  kind boundary used by neighboring inherited count effects.

##### Q&A coverage

`node tools/kb/query.mjs card BT1-073` returned no Q&A entries.

##### Commands and results

- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-073.test.ts --maxWorkers=1 --no-file-parallelism` — **8/8
  passed**.
- `pnpm exec oxfmt --check` on the four assigned modules/tests — passed.
- Fixture scan: no numeric `security: <n>`, Digi-Egg in deck/Security, injected
  timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` — passed.
- Typecheck, build, and collection/engine suites were not run in this lane.

##### Remaining gaps and score

No card-specific engine seam or catalog discrepancy remains. Mutation proof and
delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-074 — Togemon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-074.md` (2026-09-10):

##### Catalog and rules

The catalog identifies Togemon as a green level-4 Champion / Vegetation
Digimon (play cost 6, 5000 DP), with one green level-3 evolution route costing
2 memory. Its main clause is `[When Digivolving]` reveal 3 cards, add 1 level-5
or higher Digimon card among them, and place the remaining revealed cards at
the bottom of the deck in any order. It has no inherited or Security text.

The card KB query returns Q924: a qualifying level-5-or-higher Digimon need not
be green. Comprehensive §15-15-3 governs reveal processing. The IR uses a
kind-`Digimon` level `gte 5` filter, intentionally without a color filter.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-074.ts` has one
`registerIrCard("BT1-074", compiled)` registration, no legacy registration, no
`@ts-nocheck`, and residual-free full-coverage IR. The contract test maps all
catalog fields and the exact `RevealAdd` shape.

Clause-to-proof mapping:

- reveal/add: a real green BT1-067 -> BT1-074 evolution separates the mandatory
  evolution bonus draw (inert BT1-009) from the three revealed cards, adds the
  revealed BT1-075, and leaves the two non-selected cards in the deck;
- exact level/kind/color boundary: level-7 BT1-084 is accepted while level-4
  BT1-070 and Tamer BT1-085 are excluded; non-green level-5 BT1-040 is accepted
  (Q924);
- bottom ordering: the remaining revealed cards are explicitly ordered via the
  public decision and their final deck order is asserted;
- evolution: the green route pays exactly 2 memory and draws; a red level-3
  source is rejected.

##### Q&A coverage

Q924 is covered by the non-green level-5 test. No other Q&A entries were
returned by `node tools/kb/query.mjs card BT1-074`.

##### Commands and results

- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-074.test.ts --maxWorkers=1 --no-file-parallelism` — **6/6
  passed**.
- `pnpm exec oxfmt --check` on the four assigned modules/tests — passed.
- Fixture scan: no numeric `security: <n>`, Digi-Egg in deck/Security, injected
  timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` — passed.
- Typecheck, build, and collection/engine suites were not run in this lane.

##### Remaining gaps and score

No card-specific engine seam or catalog discrepancy remains. Mutation proof and
delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-075 — Digitamamon

Score: 8/10. Q1080/Q1087/Q1097 Terriermon prevention and legal stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-075.md` (2026-09-10):

##### Catalog and rules

The catalog identifies Digitamamon as a green level-5 Ultimate / Perfect
Digimon (play cost 6, 7000 DP), with one green level-4 evolution route costing
3 memory. Its sole main clause is `[When Attacking] Gain 3 memory. At end of
turn, lose 3 memory.` It has no inherited or Security text.

The card KB query returns Q925, Q926, Q1080, Q1087, and Q1097. Comprehensive
§18-1 defines the delayed loss as pending processing at end of turn. Q925
confirms the pending loss remains after deletion; Q926 confirms passing after
the gain still incurs the additional loss. Q1080/Q1087/Q1097 confirm an
opponent's Terriermon restriction blocks the Digimon-effect gain but not the
specified loss.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-075.ts` has one
`registerIrCard("BT1-075", compiled)` registration, no legacy registration, no
`@ts-nocheck`, and residual-free full-coverage IR. The contract test maps the
catalog and both ordered `GainMemory` actions.

Clause-to-proof mapping:

- gain 3: attack test observes memory moving from 0 to 3;
- delayed loss / Q925-Q926: a player attack that deletes Digitamamon still
  settles the pending loss after the real turn pass, ending at -6;
- Q1080/Q1087/Q1097: with BT3-046 Terriermon in the opponent's battle area,
  the gain is blocked (memory remains 0) while the real end-of-turn loss still
  resolves to -6;
- evolution: green BT1-074 -> BT1-075 pays exactly 3 memory, draws BT1-009,
  and preserves the source stack; a red level-4 source is rejected.

##### Q&A coverage

Q925 and Q926 are covered by the deletion/pass pending-loss test. Q1080,
Q1087, and Q1097 are covered together by the Terriermon restriction test (the
three entries carry the same ruling answer).

##### Commands and results

- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-075.test.ts --maxWorkers=1 --no-file-parallelism` — **6/6
  passed**.
- `pnpm exec oxfmt --check` on the four assigned modules/tests — passed.
- Fixture scan: no numeric `security: <n>`, Digi-Egg in deck/Security, injected
  timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` — passed.
- Typecheck, build, and collection/engine suites were not run in this lane.

##### Remaining gaps and score

No card-specific engine seam or catalog discrepancy remains. Mutation proof and
delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-076 — MegaKabuterimon

Score: 8/10. exact catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-076.md` (2026-09-10):

##### Catalog and rules

The catalog identifies MegaKabuterimon as a green level-5 Ultimate / Insectoid
Digimon (play cost 7, 6000 DP), with one green level-4 evolution route costing
2 memory. Its only clause is the inherited `[When Attacking]` effect: if the
opponent has 2 or more suspended Digimon, gain 1 memory. There is no main or
Security text. The card KB query returns Q927, which confirms that four
suspended Digimon still produce only one memory.

The condition is represented as a single `permanentCount` threshold (not a
per-card scaling gain), with opponent, Digimon, and suspended filters.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-076.ts` has one
`registerIrCard("BT1-076", compiled)` registration, no legacy registration, no
`@ts-nocheck`, and residual-free full-coverage IR. The contract test maps all
catalog fields and the exact inherited threshold action.

Clause-to-proof mapping:

- threshold positive: attack with two suspended opposing Digimon gains exactly
  1 memory;
- Q927 upper boundary: four suspended opposing Digimon still gain only 1;
- lower/type boundaries: one suspended Digimon gains none, and a suspended
  opposing Tamer is excluded;
- inherited/stack identity: real green BT1-073 -> BT1-076 -> BT1-080 evolution
  pays 2 + 2 memory, leaves memory at 0 before the attack, preserves the source
  stack, and then gains 1; a direct top-card MegaKabuterimon gains nothing;
- red level-4 evolution source is rejected.

##### Q&A coverage

Q927 is covered by the four-suspended-Digimon test. No other Q&A entries were
returned by `node tools/kb/query.mjs card BT1-076`.

##### Commands and results

- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-076.test.ts --maxWorkers=1 --no-file-parallelism` — **8/8
  passed** after correcting the catalog Japanese-name assertion.
- `pnpm exec oxfmt --check` on the four assigned modules/tests — passed.
- Fixture scan: no numeric `security: <n>`, Digi-Egg in deck/Security, injected
  timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` — passed.
- Typecheck, build, and collection/engine suites were not run in this lane.

##### Remaining gaps and score

No card-specific engine seam or catalog discrepancy remains. Mutation proof and
delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-077 — Okuwamon

Score: 8/10. natural battle/Security/tie/Blocker/stack proof replaced injected timing; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-077.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Okuwamon as a green level-5 Ultimate / Insectoid
Digimon with play cost 7, 6000 DP, one green level-4 evolution route for 2
memory, Virus attribute, and no main or Security effect. Its sole printed
clause is the inherited `[Your Turn]` effect: when this Digimon deletes an
opponent's Digimon in battle and survives, gain 1 memory.

`node tools/kb/query.mjs card BT1-077` returns Q928 and Q929. Q928 excludes
battles with Security Digimon; Q929 confirms that a Blocker-declared target is
still an opponent's Digimon for this effect when it is deleted in battle.
Comprehensive rules 4-7-1 through 4-7-6 define stacked and inherited cards;
13-1-8-3-1 and 14-2-2 through 14-2-3 distinguish ordinary Digimon battles from
Security Digimon battles and deletion; the timing glossary defines `Your Turn`
and inherited effects. No catalog discrepancy or unresolved ambiguity was
found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-077.ts` has exactly one
`registerIrCard("BT1-077", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR has an inherited `YourTurn`
`SubTrigger` for `whenDeletesInBattle`, anchored to the self Digimon under the
owner's control, and gains exactly 1 memory only when the trigger source was
not deleted at the same timing. This maps the survival clause and does not
match Security Digimon.

The colocated suite now asserts the complete catalog and IR contract. It proves
the positive path through a real legal stack (green BT1-072 level 4 -> BT1-077
level 5 -> BT1-081 level 6), exact 2-memory and 3-memory evolution costs,
source-card identity, and the inherited memory gain after the surviving battle.
Natural negative cases cover a tied battle where the source is deleted, a
Security battle (Q928), and Okuwamon being the top card rather than an
inherited card. Q929 is covered by a natural Blocker redirect and deletion.
The opponent-turn injection test was removed so no timing credit depends on a
manually fired trigger. A red/blue level-4 evolution rejection is included as
the color boundary.

BT1-076 MegaKabuterimon and BT1-079 Lillymon are nearby green level-5
inherited-effect peers; BT3-050 provides a comparable self-anchored battle
watcher. The legal stack and top-card negative confirm that only the visible
inherited source contributes behavior.

##### Commands and results

- Catalog inspection: exact card fields and all effect fields reviewed.
- `node tools/kb/query.mjs card BT1-077`: Q928 and Q929 returned.
- Static registration and `@ts-nocheck` scan: clean.
- Assigned-fixture scan: no numeric Security shorthand, no Digi-Egg in deck or
  Security, and no BT1-001 through BT1-008 fixture occurrence.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-077.test.ts
--maxWorkers=1 --no-file-parallelism` — **7 tests passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files: passed.
- `git diff --check` on assigned files: passed.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. No card-specific
engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-078 — Jagamon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-078.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Jagamon as a green level-5 Ultimate /
Vegetation Digimon with play cost 7, 7000 DP, one green level-4 evolution route
for 3 memory, Vaccine attribute, and no inherited or Security text. Its sole
printed clause is `[When Attacking]`: reveal 3 cards from the top of the deck;
you may digivolve this card into one revealed green level-6 Digimon without
paying its memory cost, then place the remaining revealed cards at the bottom
of the deck in any order.

`node tools/kb/query.mjs card BT1-078` returns Q930 through Q933. Q930 confirms
that declining the optional evolution still bottoms all revealed cards; Q931
places the digivolution bonus draw immediately after stacking and before the
remaining effect; Q932 requires the remaining-card placement before the new
Digimon's `When Digivolving` effect; Q933 permits revealing as many as possible
when the deck has two or fewer cards. Comprehensive rules 4-7-1 through 4-7-6
cover stack order, 8-1-2-8 covers the digivolution bonus draw, and the timing
glossary defines `When Attacking` and `When Digivolving`. No discrepancy or
ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-078.ts` has exactly one
`registerIrCard("BT1-078", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR uses `RevealAdd` with reveal count
3, an optional self digivolution into a green level-6 Digimon with
`payCost: false`, no unrelated add-to-hand branch, and `deckBottomAnyOrder` for
the remainder. The target is explicitly the attacking self permanent.

The colocated suite now asserts all catalog fields and the exact IR. It proves
a legal green level-4 -> Jagamon evolution with the 3-memory cost and source
stack, the positive attack-time free evolution into a revealed green level-6,
Q930 optional refusal with all three cards bottomed, Q932 ordering against a
real revealed BT10-056 `When Digivolving` peer, and Q933's two-card deck
boundary. A red/blue level-4 ordinary-evolution rejection proves the color
boundary. The Q932 fixture observes the new card stacked before the remaining
order decision and confirms the nested When Digivolving effect has not opened
before that order is completed.

BT1-078's legal stack is compared with the ordinary green level-4 route and
the level-6 revealed target set; BT1-081 and BT10-056 provide green level-6
Digimon and a nested `When Digivolving` ordering peer. No effect is activated
from a manually fired timing.

##### Commands and results

- Catalog inspection: exact card fields and all effect fields reviewed.
- `node tools/kb/query.mjs card BT1-078`: Q930, Q931, Q932, and Q933 returned.
- Static registration and `@ts-nocheck` scan: clean.
- Assigned-fixture scan: no numeric Security shorthand, no Digi-Egg in deck or
  Security, and no BT1-001 through BT1-008 fixture occurrence.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-078.test.ts
--maxWorkers=1 --no-file-parallelism` — **7 tests passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files: passed.
- `git diff --check` on assigned files: passed.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. No card-specific
engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-079 — Lillymon

Score: 8/10. full catalog/IR and exact behavior/stack boundaries; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-079.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Lillymon as a green level-5 Ultimate / Fairy
Digimon with play cost 7, 6000 DP, one green level-4 evolution route for 2
memory, Data attribute, and no main or Security text. Its sole printed clause
is the inherited `[When Attacking]` effect: suspend one of the opponent's
Digimon without `<Blocker>`.

`node tools/kb/query.mjs card BT1-079` returns no card-specific entries.
Comprehensive rules 4-7-1 through 4-7-6 define inherited effects in a stack;
the timing glossary defines `When Attacking`; the target and keyword rules
make the explicit opponent/Digimon filter and Blocker exclusion applicable.
Security Digimon are not regular Digimon under comprehensive rules 4-5-1 and
13-1-7. No catalog discrepancy or unresolved ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-079.ts` has exactly one
`registerIrCard("BT1-079", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR is an inherited `WhenAttacking`
`Suspend` action selecting exactly one opposing Digimon, excluding the
`Blocker` keyword, with `forceSelection: true` when an eligible target exists.

The colocated suite now asserts the complete catalog and exact IR. It proves a
legal green level-4 -> Lillymon evolution with the 2-memory cost and source
stack; suspension of an eligible opponent; exclusion of a printed Blocker;
exclusion of a dynamically granted Blocker; exclusion of an opposing Tamer;
and no inherited behavior while Lillymon is the top card. The granted-Blocker
case uses a real attack/block window and decline, not injected timing. The
non-green level-4 evolution rejection proves the ordinary evolution boundary.

BT1-077 Okuwamon is the nearby green inherited battle-trigger peer, while
BT1-072 supplies the printed Blocker source for comparative target filtering.
The legal stack and top-card negative demonstrate that only the visible
Lillymon inherited card contributes the target effect.

##### Commands and results

- Catalog inspection: exact card fields and all effect fields reviewed.
- `node tools/kb/query.mjs card BT1-079`: no knowledge-base entries returned.
- Static registration and `@ts-nocheck` scan: clean.
- Assigned-fixture scan: no numeric Security shorthand, no Digi-Egg in deck or
  Security, and no BT1-001 through BT1-008 fixture occurrence.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-079.test.ts
--maxWorkers=1 --no-file-parallelism` — **8 tests passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files: passed.
- `git diff --check` on assigned files: passed.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. No card-specific
engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-080 — Titamon

Score: 8/10. full catalog/IR and legal evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-080.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Titamon as a green level-6 Mega / Shaman
Digimon with play cost 10, 12000 DP, one green level-5 evolution route for 2
memory, Virus attribute, and no main, inherited, or Security text. It is a
vanilla Digimon card.

`node tools/kb/query.mjs card BT1-080` returns no card-specific entries.
Comprehensive rules 4-7-1 through 4-7-6 define the evolution stack and
inherited visibility; the evolution rules require the listed color and level
and perform the mandatory bonus draw. The catalog and rules expose no
discrepancy or ambiguity for this vanilla card.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-080.ts` has exactly one
`registerIrCard("BT1-080", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its exact residual-free IR is
`{ effects: [], coverage: "full", residual: [] }`, which correctly represents
the absence of printed effects while leaving ordinary play and evolution to
the engine.

The colocated suite now asserts every catalog field and the empty IR. It proves
ordinary play for exactly 10 memory and 12000 DP, then a real legal green
level-5 BT1-075 -> Titamon evolution for exactly 2 memory, the source stack,
the 12000 DP top card, and the evolution bonus draw. A blue level-5 route is
rejected. Because Titamon has no effects, there is no timing, target, optional,
Security, or once-per-turn clause to exercise.

BT1-078 Jagamon and BT1-081 HerculesKabuterimon are nearby green level-5 to
level-6 peers with non-vanilla effects; their contrast confirms that Titamon's
empty IR does not inherit or gain peer behavior. BT1-075 supplies the legal
green level-5 evolution source.

##### Commands and results

- Catalog inspection: exact card fields and all effect fields reviewed.
- `node tools/kb/query.mjs card BT1-080`: no knowledge-base entries returned.
- Static registration and `@ts-nocheck` scan: clean.
- Assigned-fixture scan: no numeric Security shorthand, no Digi-Egg in deck or
  Security, and no BT1-001 through BT1-008 fixture occurrence.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-080.test.ts
--maxWorkers=1 --no-file-parallelism` — **4 tests passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files: passed.
- `git diff --check` on assigned files: passed.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. No card-specific
engine seam or retained red is suspected.

##### Score

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-081 — HerculesKabuterimon

Score: 8/10. full catalog/evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-081.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies HerculesKabuterimon as a green level-6 Mega
/ Insectoid Digimon (play cost 12, 10000 DP), with one green level-5 evolution
route costing 3 memory. Its printed effects are `<Piercing>` and an optional
`[End of Attack][Twice Per Turn]` effect that unsuspends itself by decreasing
memory by 3. It has no inherited or Security text.

The card KB query returned Q934 and Q935. Q934 confirms that paying 3 memory
across the gauge changes to the opponent's turn after the attack ends. Q935
confirms that the End of Attack effect is optional. Comprehensive rules 11-6
define the End of Attack timing, 16-7 defines Piercing and its security check,
and the glossary's Twice Per Turn entry supplies the per-turn limit.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-081.ts` has exactly one
`registerIrCard("BT1-081", compiled)` registration, no legacy registration,
no `@ts-nocheck`, and residual-free full-coverage IR. The IR maps Static
Piercing and an optional EndOfAttack Unsuspend with `TwicePerTurn`, self target,
and `payMemory: 3`.

Clause-to-proof mapping:

- Piercing: a real attack deletes an opposing Digimon in battle, the attacker
  survives, and the opposing security card is checked;
- optional End of Attack / Q935: the refusal path leaves the attacker
  suspended and memory unchanged;
- cost, limit, and Q934: two attacks each pay 3 and unsuspend, while a third
  same-turn attack remains suspended; paying from memory 2 crosses the gauge
  and the natural turn loop ends the attacker's turn;
- evolution: a legal green BT1-076 (MegaKabuterimon) -> BT1-081 route pays
  exactly 3 memory, takes the evolution draw, preserves source identity, and
  leaves the source in the stack; a red level-5 route is rejected.

BT1-083 GranKuwagamon is the nearby green level-6 Piercing peer. The attack
proof and the explicit self target distinguish HerculesKabuterimon's
EndOfAttack behavior from that peer's Your Turn DP effect.

##### Q&A coverage

Q934 and Q935 are covered by the memory-crossing and optional-refusal tests.

##### Commands and results

- Catalog inspection and `node tools/kb/query.mjs card BT1-081`: completed;
  Q934/Q935 recorded above.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-081.test.ts --maxWorkers=1 --no-file-parallelism` — **7/7
  passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files — passed.
- Fixture scan: no numeric Security shorthand, Digi-Egg in deck/Security,
  injected timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` on assigned files — passed.
- Typecheck, build, collection, and engine suites were not run under the lane
  gate.

##### Remaining gaps and score

No card-specific engine seam, catalog discrepancy, or unresolved ruling
ambiguity remains. Mutation proof and delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-082 — Rosemon

Score: 8/10. full catalog/evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-082.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Rosemon as a green level-6 Mega / Fairy
Digimon (play cost 12, 11000 DP), with one green level-5 evolution route
costing 3 memory. Its only printed clause is `[Opponent's Turn] When an
opponent's Digimon attacks a player, if this Digimon is suspended, suspend 1
of your opponent's Digimon.` It has no inherited or Security text.

The card KB query returned Q936, Q937, and Q938. Q936 confirms the controller
of Rosemon chooses the opposing Digimon to suspend. Q937 confirms that a
Rosemon suspended before the trigger activates may activate; Q938 confirms
that a Rosemon unsuspended before activation may not. Comprehensive rules
11-1/11-2 cover player-targeted attacks, and 15-16 trigger timing covers the
opponent-turn watcher and activation condition.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-082.ts` has exactly one
`registerIrCard("BT1-082", compiled)` registration, no legacy registration,
no `@ts-nocheck`, and residual-free full-coverage IR. Its OpponentsTurn
SubTrigger watches `whenOpponentAttacks` from an opposing Digimon and applies
one opposing-Digimon Suspend only when the source is suspended and the attack
targets a player.

Clause-to-proof mapping:

- opponent-turn/source/target boundary: an opposing Digimon's player attack
  suspends one opposing Digimon, while an attack targeting a Digimon does not;
- suspended condition and activation timing / Q937-Q938: suspending Rosemon
  before activation allows the effect, while unsuspending it before activation
  prevents it;
- controller choice / Q936: a pending target decision is answered by
  Rosemon's controller and can select an opposing Blocker;
- evolution: a legal green BT1-076 -> BT1-082 route pays exactly 3 memory,
  takes the evolution draw, preserves source identity, and a red level-5 route
  is rejected.

BT1-081 HerculesKabuterimon and BT1-083 GranKuwagamon provide nearby green
level-6 timing peers, while BT1-072 supplies the Blocker comparative target.
The mixed attacker/target board proves the action does not blindly suspend the
attacking player or a non-Digimon.

##### Q&A coverage

Q936, Q937, and Q938 are covered by the controller-choice, suspend-before-
activation, and unsuspend-before-activation tests respectively.

##### Commands and results

- Catalog inspection and `node tools/kb/query.mjs card BT1-082`: completed;
  Q936-Q938 recorded above.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-082.test.ts --maxWorkers=1 --no-file-parallelism` — **8/8
  passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files — passed.
- Fixture scan: no numeric Security shorthand, Digi-Egg in deck/Security,
  injected timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` on assigned files — passed.
- Typecheck, build, collection, and engine suites were not run under the lane
  gate.

##### Remaining gaps and score

No card-specific engine seam, catalog discrepancy, or unresolved ruling
ambiguity remains. Mutation proof and delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-083 — GranKuwagamon

Score: 8/10. full catalog/evolution/peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-083.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies GranKuwagamon as a green level-6 Mega /
Insectoid Digimon (play cost 13, 11000 DP), with one green level-5 evolution
route costing 4 memory. Its printed effects are `<Piercing>` and
`[Your Turn] This Digimon gets +4000 DP.` It has no inherited or Security text.

The card KB query returned no card-specific Q&A entries. Comprehensive rules
16-7 define Piercing and its mandatory security check, while the turn and
continuous-effect rules define the Your Turn DP modification. No catalog or
ruling ambiguity was found.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-083.ts` has exactly one
`registerIrCard("BT1-083", compiled)` registration, no legacy registration,
no `@ts-nocheck`, and residual-free full-coverage IR. The IR maps Static
Piercing and a YourTurn self-only `ModifyDP` of 4000 for the turn.

Clause-to-proof mapping:

- Piercing: an attack deletes an opposing Digimon in battle and the surviving
  attacker performs the security check;
- Your Turn boundary: the top card is 15000 DP on its controller's turn and
  11000 DP on the opponent's turn, with Piercing retained in both states;
- stack visibility: when GranKuwagamon is only a digivolution card under
  another Digimon, neither printed effect applies;
- evolution: a legal green BT1-076 -> BT1-083 route pays exactly 4 memory,
  takes the evolution draw, preserves source identity, and a red level-5 route
  is rejected.

BT1-081 HerculesKabuterimon is the nearby green Insectoid level-6 Piercing
peer. The top-card-only negative distinguishes visible GranKuwagamon behavior
from inherited effects supplied by cards actually placed under a host.

##### Q&A coverage

`node tools/kb/query.mjs card BT1-083` returned no entries.

##### Commands and results

- Catalog inspection and KB query: completed; no card-specific Q&A returned.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-083.test.ts --maxWorkers=1 --no-file-parallelism` — **7/7
  passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files — passed.
- Fixture scan: no numeric Security shorthand, Digi-Egg in deck/Security,
  injected timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` on assigned files — passed.
- Typecheck, build, collection, and engine suites were not run under the lane
  gate.

##### Remaining gaps and score

No card-specific engine seam, catalog discrepancy, or unresolved ruling
ambiguity remains. Mutation proof and delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-084 — Omnimon

Score: 8/10. exact evolution draw/source stack and non-Lv6 return boundary; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-084.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Omnimon as a white level-7 Mega / Holy
Warrior / Royal Knight Digimon (play cost 15, 15000 DP), with alternate red
or blue level-6 evolution routes costing 6 memory. Its printed effects are
`[When Digivolving] Choose 1 of your opponent's Digimon. Delete all of your
opponent's Digimon that share a name with it.` and `[When Attacking] You can
unsuspend this Digimon by returning 1 of this Digimon's level 6 digivolution
cards to your hand.` It has no inherited or Security text.

The card KB query returned Q939-Q944 and Q1033. Q939 confirms the red/blue
level-6 evolution routes; Q940 confirms the chosen Digimon is deleted with all
same-name Digimon; Q941 requires complete-name matching, Q942 allows matching
names across card numbers, Q943 confirms the When Attacking effect is
optional, Q944 requires the unsuspend after a successful return, and Q1033
includes a same-name Diaboromon token. Comprehensive rules 15-16-3 define
When Digivolving timing and 16-7 is not applicable here; stack/evolution and
return-to-hand rules govern the second clause.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-084.ts` has exactly one
`registerIrCard("BT1-084", compiled)` registration, no legacy registration,
no `@ts-nocheck`, and residual-free full-coverage IR. Its IR binds one chosen
opposing Digimon name, deletes all opposing Digimon with that exact name, then
offers an optional return of one self-stack level-6 Digimon card and gates
self-unsuspend on the return action.

Clause-to-proof mapping:

- Q939/evolution: both red and blue level-6 routes pay exactly 6 memory, take
  the evolution draw, preserve the source stack, and a green level-6 route is
  rejected;
- Q940/Q941: choosing Greymon deletes only exact Greymon, not MetalGreymon or
  WarGreymon;
- Q942: ST1-09, BT1-021, and BT1-114 MetalGreymon cards are all deleted despite
  different card numbers;
- Q1033: a Diaboromon token with the selected name is deleted with the card;
- Q943/Q944: accepting the optional return of a level-6 stack card moves it to
  hand and unsuspends Omnimon; declining leaves Omnimon suspended; a non-level-
  6 card remains in the stack and is not returned.

BT1-025 WarGreymon and BT1-043 SaberLeomon are the direct red/blue level-6
evolution peers used by the route proof. BT1-021 and BT1-114 provide the
same-name cross-number peer boundary.

##### Q&A coverage

Q939-Q944 and Q1033 are covered by the evolution, exact-name, cross-number,
token, optional-decline, return/unsuspend, and level-filter tests.

##### Commands and results

- Catalog inspection and `node tools/kb/query.mjs card BT1-084`: completed;
  Q939-Q944/Q1033 recorded above.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-084.test.ts --maxWorkers=1 --no-file-parallelism` — **9/9
  passed**.
- `pnpm exec oxfmt --check` on assigned TypeScript files — passed.
- Fixture scan: no numeric Security shorthand, Digi-Egg in deck/Security,
  injected timing, legacy registration, or `@ts-nocheck`.
- `git diff --check` on assigned files — passed.
- Typecheck, build, collection, and engine suites were not run under the lane
  gate.

##### Remaining gaps and score

No card-specific engine seam, catalog discrepancy, or unresolved ruling
ambiguity remains. Mutation proof and delivery gates are coordinator-owned.

| Component        |    Score |
| ---------------- | -------: |
| Catalog/rules    |      2/2 |
| IR trace         |      2/2 |
| Behavioral proof |      2/2 |
| Peer/stack proof |      2/2 |
| Delivery gates   |      0/2 |
| **Worker total** | **8/10** |

### BT1-085 — Tai Kamiya

Score: 8/10. memory/security/aura boundaries, Q946/Q947 stacking and legal red lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-085.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Tai Kamiya as a red level-less Tamer with
play cost 4. Its complete text is `[Start of Your Turn] If you have 2 or less
memory, set your memory to 3`; `[Your Turn] All of your red Digimon with 4 or
more digivolution cards gain <Security Attack +1>`; and `[Security] Play this
card without paying its memory cost.` There is no inherited text.

`node tools/kb/query.mjs card BT1-085` returns Q945, Q946, and Q947. Q945
allows this effect to resolve in either order with another start-of-turn memory
setter; Q946 confirms that separate Tai copies stack their separate
`Security Attack +1` grants; Q947 confirms that the grant is lost immediately
when a security effect reduces the Digimon to three or fewer digivolution
cards, ending further checks. Comprehensive rules 4-1-2 defines “2 or less
memory”; 15-16-11 defines the start-of-turn timing before unsuspension; 16-4
defines persistent Security Attack; and 4-6/4-7 defines stacked cards and
digivolution-card counts.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-085.ts` has exactly one
`registerIrCard("BT1-085", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches the committed
`packages/shared/src/effects/effects.json` entry:

- `StartOfYourTurn` → `SetMemory(3)` gated by `memoryAtMost(2)`.
- `YourTurn` → an `Aura` over all own red Digimon with at least four
  digivolution cards, granting keyword `SecurityAttack +1` while the source is
  active.
- `Security` → self `PlayWithoutCost`, sourced from security and with no
  memory payment.

The colocated source-level suite covers memory at 1/2/3, opponent-turn
exclusion, exact red/4-source filtering, two-copy stacking (Q946), security
play, and the Q947 dynamic loss boundary through a real security check and
source-card removal. The four-source fixtures use the metadata-consistent red
route BT1-001 (egg) → BT1-010 (Lv.3) → BT1-015 (Lv.4) → BT1-020 (Lv.5) →
BT1-025 (Lv.6). The suite now also proves that route through public hatch, four
legal breeding digivolutions, and move-to-battle intents; the smaller boundary
fixtures remain direct under-stack setups.

BT1-086 and BT1-087 are nearby start-of-turn Tamer peers; BT1-025 is the
nearby red Security Attack peer and supplies the Q947 security interaction.
The IR target is controller- and color-scoped and excludes blue Digimon and
three-source stacks as required.

##### Commands and results

- Catalog fields and effect fields reviewed from `cards.json`.
- `node tools/kb/query.mjs card BT1-085`: Q945–Q947 reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand and no Digi-Egg in the
  main deck or Security zone. BT1-001 appears only in the legal `eggDeck`
  lifecycle fixture; no Digi-Egg is illegally placed in main deck/Security.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-085.test.ts
--maxWorkers=1 --no-file-parallelism` — **8 tests passed**.
- `pnpm exec oxfmt --check` on all eight assigned TypeScript files: passed
  after formatting BT1-088.test.ts.
- `git diff --check` on assigned tracked files: passed; report whitespace scan:
  clean.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. The boundary cases
still use direct stacks, but a full legal lifecycle is now covered; no
card-specific engine seam or unresolved IR residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-086 — Matt Ishida

Score: 8/10. Q948/Q949, public opponent hatch/evolution/move stack and exact bottom-source trash; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-086.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Matt Ishida as a blue level-less Tamer with
play cost 4. Its complete text is `[Start of Your Turn] If you have 2 or less
memory, set your memory to 3`; `[Your Turn] When you play a blue Digimon, you
can suspend this Tamer to trash the bottom digivolution card of 1 of your
opponent's Digimon`; and `[Security] Play this card without paying its memory
cost.` There is no inherited text.

`node tools/kb/query.mjs card BT1-086` returns Q948 and Q949. Q948 permits
ordering this memory setter independently with another setter; Q949 confirms
that suspension does not disable the start-of-turn effect. Comprehensive rules
4-1-2 defines “2 or less memory”; 15-16-11 defines start-of-turn timing before
unsuspension; and 4-6/4-7 defines bottom digivolution cards and stack access.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-086.ts` has exactly one
`registerIrCard("BT1-086", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches the committed
`effects.json` entry:

- `StartOfYourTurn` → `SetMemory(3)` gated by `memoryAtMost(2)`.
- `YourTurn` → a `whenPlayed` `SubTrigger` restricted to own blue Digimon;
  its optional action suspends this Tamer and trashes exactly one bottom
  digivolution card from one opposing Digimon with at least one source.
- `Security` → self `PlayWithoutCost` without payment.

The colocated source-level suite covers memory at 1/2/3, opponent-turn
exclusion, suspended-source activation (Q949), blue-play positive and
non-blue/already-suspended negatives, optional decline preserving the bottom
source, and free Security play. The target and source-count filters are exact;
`fromTop: false` selects the bottom source, not the top source. In addition to
the focused boundary fixtures, a positive case builds the opposing stack via
public BT1-007 hatch → BT1-066 → BT1-072 evolution → move-to-battle intents,
then proves only the bottom egg is trashed while the BT1-072 host/top and its
remaining BT1-066 source survive.

BT1-085 and BT1-087 are nearby start-of-turn Tamer peers. BT1-043 is the
nearby source-trashing Digimon peer; the direct module's bottom-source action
is distinct from de-digivolving and leaves the host's level/top card intact.

##### Commands and results

- Catalog fields and effect fields reviewed from `cards.json`.
- `node tools/kb/query.mjs card BT1-086`: Q948–Q949 reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand and no Digi-Egg in the
  main deck or Security zone. BT1-007 appears only in the legal `eggDeck`
  lifecycle fixture; no Digi-Egg is illegally placed in main deck/Security.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-086.test.ts
--maxWorkers=1 --no-file-parallelism` — **10 tests passed**.
- `pnpm exec oxfmt --check` on all eight assigned TypeScript files: passed.
- `git diff --check` on assigned tracked files: passed; report whitespace scan:
  clean.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. No card-specific
engine seam or unresolved IR residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-087 — T.K. Takaishi

Score: 8/10. Q950-Q952 selection/recovery/shuffle and security-play boundaries; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-087.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies T.K. Takaishi as a yellow level-less Tamer
with play cost 4. Its complete text is `[Start of Your Turn] If you have 2 or
less memory, set your memory to 3`; `[On Play] Look at your security stack,
then reveal 1 card in it and add it to your hand. If that card is yellow,
trigger Recovery +1 (Deck). (Place the top card of your deck on top of your
security stack.) Then shuffle your security stack`; and `[Security] Play this
card without paying its memory cost.` There is no inherited text.

`node tools/kb/query.mjs card BT1-087` returns Q950, Q951, Q952, Q1250, Q2414,
and Q3213. Q950 covers ordering with another memory setter; Q951 defines
looking at the complete private security stack, then revealing only the chosen
card; Q952 requires the no-Recovery branch and security shuffle for a nonyellow
selection. Q1250, Q2414, and Q3213 confirm that removing/adding security cards
still counts for downstream security-triggered or inherited effects even when
the final stack count is unchanged. Comprehensive rules 15-16-11 covers
start-of-turn, 16-6 covers Recovery, and 13 covers security-stack movement and
visibility.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-087.ts` has exactly one
`registerIrCard("BT1-087", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches the committed
`effects.json` entry:

- `StartOfYourTurn` → `SetMemory(3)` gated by `memoryAtMost(2)`.
- `OnPlay` → private whole-security selection (`chooseFromSecurity`), reveal
  and move one selected card to hand while binding its instance; conditional
  `Recover(1)` only when the bound card is yellow; then shuffle own security.
- `Security` → self `PlayWithoutCost` without payment.

The colocated source-level suite covers memory boundaries and opponent-turn
exclusion, whole-stack selection with identity visibility (Q951), yellow
selection plus Recovery, nonyellow selection plus no Recovery and shuffle
(Q952), empty-security no-op, and free Security play. All fixtures use explicit
main-deck card identities in deck/Security zones. T.K. has no evolution route
or inherited effect, so an evolution stack is not applicable to its own card;
the tester can still add a legal carrier-stack case for Q3213 if inherited
cross-card behavior is required.

BT1-085/086 are nearby start-of-turn Tamer peers. BT1-060 and the other
Recovery/security-manipulation peers provide comparative security movement;
the module's bound-instance condition prevents a nonyellow card from
triggering Recovery.

##### Commands and results

- Catalog fields and effect fields reviewed from `cards.json`.
- `node tools/kb/query.mjs card BT1-087`: Q950–Q952, Q1250, Q2414, Q3213
  reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand and no Digi-Egg in the
  main deck or Security zone; all Security/deck entries are explicit main-deck
  card identities.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-087.test.ts
--maxWorkers=1 --no-file-parallelism` — **7 tests passed**.
- `pnpm exec oxfmt --check` on all eight assigned TypeScript files: passed.
- `git diff --check` on assigned tracked files: passed; report whitespace scan:
  clean.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. Q1250,
Q2414, and Q3213 are catalog-ruling evidence and are not directly exercised
by this card's own printed text; no card-specific engine seam or unresolved IR
residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-088 — Izzy Izumi

Score: 8/10. Q953/Q954 main/breeding exclusions and legal green lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-088.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Izzy Izumi as a green level-less Tamer with
play cost 2. Its complete text is `[Main] If you have a level 5 or higher green
Digimon in play, you can suspend this Tamer to reveal the top card of your
deck. If that card is a Digimon card, add it to your hand. Otherwise place it
at the bottom of your deck`; and `[Security] Play this card without paying its
memory cost.` There is no inherited text.

`node tools/kb/query.mjs card BT1-088` returns Q953 and Q954. Q953 limits
`[Main]` activation to the main phase and disallows interrupting an attack or
another effect; Q954 explicitly excludes level 5+ green Digimon in the
Breeding Area. Comprehensive rules 15-16-7 defines Main timing, 15-16-11 is
the start-of-turn timing where relevant to peers, and 4-2/field-area rules
distinguish battle-area Digimon from breeding-area Digimon.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-088.ts` has exactly one
`registerIrCard("BT1-088", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches the committed
`effects.json` entry:

- `Main` is gated by `youHaveGreenLevelAtLeastInBattle(5)`.
- A `RevealAdd` reveals exactly one deck card, costs suspension of this Tamer,
  adds one matching Digimon to hand, and places every nonmatching revealed card
  at deck bottom.
- `Security` plays this card without payment.

The colocated suite covers a green level-5 positive, Digimon versus non-Digimon
deck-top disposition, green level-4 and non-green level-5 negatives, and the
Breeding Area exclusion (Q954). It now also proves a metadata-consistent
BT1-007 (egg) → BT1-066 (Lv.3) → BT1-073 (Lv.4) → BT1-078 (Lv.5) route through
public hatch, breeding evolution, and move-to-battle intents before activating
Izzy. Q953's phase/interrupt boundary is an engine timing gate.

BT1-089 is the nearby green Tamer Main-phase peer with a different breeding
condition; BT1-067 and BT1-078 provide nearby reveal/add and deck-bottom peers.
The IR's live battle-area condition correctly excludes breeding and level 4 or
non-green cards.

##### Commands and results

- Catalog fields and effect fields reviewed from `cards.json`.
- `node tools/kb/query.mjs card BT1-088`: Q953–Q954 reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand and no Digi-Egg in the
  main deck or Security zone. BT1-007 appears only in the legal `eggDeck`
  lifecycle fixture; no Digi-Egg is illegally placed in main deck/Security.
- `pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-088.test.ts
--maxWorkers=1 --no-file-parallelism` — **6 tests passed**.
- `pnpm exec oxfmt --check` on all eight assigned TypeScript files: passed
  after formatting BT1-088.test.ts.
- `git diff --check` on assigned tracked files: passed; report whitespace scan:
  clean.
- Typecheck, build, collection, and engine suites were **not run** under the
  lane gate.

##### Remaining gaps

Mutation proof and delivery gates remain coordinator work. The direct negative
fixtures do not enact evolution, but the positive gate now has a full legal
stack lifecycle; no card-specific engine seam or unresolved IR residual was
found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-089 — Mimi Tachikawa

Score: 8/10. Q955-Q959, public hatch/evolution/move lifecycle and natural Main/Security flows; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-089.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Mimi Tachikawa as a green level-less Tamer
with play cost 4. Its complete text is `[Start of Your Turn] If you have 2 or
less memory, set your memory to 3`; `[Main] If you have a level 5 or higher
green Digimon in play, you can suspend this Tamer to hatch 1 Digi-Egg card to
an empty space in your breeding area, or move 1 level 3 or higher Digimon from
your breeding area to your battle area`; and `[Security] Play this card
without paying its memory cost.` There is no inherited text.

`node tools/kb/query.mjs card BT1-089` returns Q736, Q955–Q959, Q1142,
Q1769, Q1844, and Q4252–Q4253. Q957 excludes a qualifying Digimon that is
only in the Breeding Area from the level-5 gate; Q958 confirms the start-turn
effect works while suspended; Q959 and Q1844 distinguish moving from Breeding
from playing; Q736 confirms that distinction does not trigger play watchers;
Q1142 covers a Digimon entering after a Security effect; and Q4252–Q4253
cover effects and once-per-turn state across a move. Comprehensive rules
3-4-7 defines Breeding occupancy and its effect/selection boundaries, while
the turn, hatch, move, and Security procedures in `data/kb/rules/comprehensive.md`
and `manual.md` supply the applicable timing and zone rules.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-089.ts` has exactly one
`registerIrCard("BT1-089", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches the committed
`effects.json` entry:

- `StartOfYourTurn` → `SetMemory(3)` gated by `memoryAtMost(2)`.
- `Main` → optional `Modal` with a suspension cost; option 0 hatches only
  when the Breeding Area is empty, and option 1 moves exactly one own level-3+
  Digimon from Breeding to the battle area. The shared condition requires an
  own battle-area green level-5+ Digimon and an available Breeding action.
- `Security` → self `PlayWithoutCost` without payment.

The colocated suite now uses production turn progression for start-turn proof,
the public `activateEffect` intent for Mimi's Main ability, and a public attack
to reveal and resolve the Security card. It covers memory boundaries,
suspension, optional refusal, hatch and Breeding-to-battle branches, level and
zone negatives (including Q957), immediate attack after a move, and free
Security play. A lifecycle case publicly hatches BT1-008, digivolves through
BT1-064 → BT1-073 → BT1-078 with the printed 0/1/3 memory costs, moves the
finished stack from Breeding to battle, and then exercises Mimi's Main hatch
branch while the legal level-5 green Digimon is in battle. No Digi-Egg is
placed in a main deck or Security zone.

BT1-088 is the nearby green Tamer Main-condition peer, and BT1-086/BT1-087
provide start-turn and Security-play peers. The module's explicit battle-area
and Breeding filters preserve the Q957/Q1844 distinction.

##### Commands and results

- Catalog fields and effect fields reviewed from `cards.json`.
- `node tools/kb/query.mjs card BT1-089`: Q736, Q955–Q959, Q1142, Q1769,
  Q1844, and Q4252–Q4253 reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand, no Digi-Egg in a deck
  or Security zone, and no timing/subtrigger injection or `advance.fire` use.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-089.test.ts --maxWorkers=1 --no-file-parallelism` — **10/10
  passed**.
- Typecheck, build, collection, and engine suites were not run; they remain
  outside this lane's release scope.

##### Remaining gaps

Runtime mutation proof remains a coordinator/tester gate; no card-specific
engine seam or unresolved IR residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-090 — Gravity Crush

Score: 8/10. Q1080/Q1087/Q1097/Q1415 gain/prevention/deferred-loss proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-090.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Gravity Crush as a red Option with play cost 0. Its complete text is `[Main] Gain 2 memory. At end of turn, lose 2 memory.`
It has no inherited or Security text. The local banlist restricts this card to
one copy as of 2025-09-01.

`node tools/kb/query.mjs card BT1-090` returns Q1080, Q1087, Q1097, and Q1415.
These rulings establish that an opponent's Terriermon-like effect can prevent
the initial effect-based gain but cannot prevent the specified end-of-turn
loss. The memory and end-of-turn procedures are defined in
`data/kb/rules/comprehensive.md` and `manual.md`.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-090.ts` has exactly one
`registerIrCard("BT1-090", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches `effects.json`:

- `Main` → `GainMemory(+2)` immediately.
- A second `GainMemory(-2)` is scheduled with `at: "endOfTurn"`, preserving
  one deferred loss per Option activation.

The colocated suite covers the immediate gain and end-of-turn loss, stacking
two independent activations, and Q1080/Q1415's blocked-gain-but-retained-loss
case using the public `playCard` intent and full turn progression. Deck padding
was changed to inert main-deck Digimon (BT1-009/BT1-012); no Digi-Egg is used
in a main deck or Security zone.

BT1-021, BT1-040, BT1-058, and BT1-075 are the direct ruling peers named by
Q1080/Q1415; all use the same memory-gain/deferred-loss vocabulary. This Option
has no evolution route, inherited effect, target, or Security clause, so an
evolution-stack proof is not applicable.

##### Commands and results

- Catalog, banlist, and effect fields reviewed from `cards.json`,
  `data/kb/banlist.json`, and `effects.json`.
- `node tools/kb/query.mjs card BT1-090`: Q1080, Q1087, Q1097, and Q1415
  reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand, no Digi-Egg in a deck
  or Security zone, and no timing/subtrigger injection or `advance.fire` use.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-090.test.ts --maxWorkers=1 --no-file-parallelism` — **3/3
  passed**.
- Typecheck, build, collection, and engine suites were not run; they remain
  outside this lane's release scope.

##### Remaining gaps

Runtime execution and mutation proof remain coordinator/tester gates. Banlist
legality is catalog/rules evidence rather than an effect-module concern; no
card-specific engine seam or unresolved IR residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-091 — Scrap Claw

Score: 8/10. public Option/attack Piercing battle and turn-expiry proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-091.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Scrap Claw as a red Option with play cost 3.
Its complete text is `[Main] 1 of your Digimon gains <Piercing> (When this
Digimon attacks and deletes an opponent's Digimon and survives the battle, it
performs any security checks it normally would) for the turn.` It has no
inherited or Security text.

`node tools/kb/query.mjs card BT1-091` reports no local Q&A entries. The local
Piercing definition in `data/kb/rules/glossary.md` and the attack/security
procedures in `data/kb/rules/manual.md` establish that Piercing requires an
opponent Digimon deletion and attacker survival, then performs the attack's
normal checks after battle effects; it does not apply to a Security Digimon
battle.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-091.ts` has exactly one
`registerIrCard("BT1-091", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches `effects.json`:

- `Main` → choose exactly one own Digimon and grant `Piercing` for the turn.

The colocated suite proves target cardinality and controller filtering, a
successful battle deletion followed by a Security check, and expiry at the
end of the turn. It uses public Option play and attack intents, an explicit
face-down main-deck card in Security, and inert main-deck Digimon padding
(BT1-009). The selected target and non-target are distinct red Digimon,
providing a near-match control for the one-target boundary.

BT1-093 is the nearby same-color one-Digimon temporary keyword peer and uses
the same target/duration vocabulary; the attack proof also follows the local
Piercing glossary and security procedure. Scrap Claw is an Option with no
evolution route or inherited text, so an evolution-stack proof is not
applicable.

##### Commands and results

- Catalog and effect fields reviewed from `cards.json` and `effects.json`.
- `node tools/kb/query.mjs card BT1-091`: no Q&A entries.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand, no Digi-Egg in a deck
  or Security zone, and no timing/subtrigger injection or `advance.fire` use.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-091.test.ts --maxWorkers=1 --no-file-parallelism` — **2/2
  passed**.
- Typecheck, build, collection, and engine suites were not run; they remain
  outside this lane's release scope.

##### Remaining gaps

Runtime execution and mutation proof remain coordinator/tester gates. The
engine's full combat/security resolution should be rerun by the sole tester;
no card-specific engine seam or unresolved IR residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-092 — Nuclear Laser

Score: 8/10. Q960 mandatory target/deletion sequence and negative boundary; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-092.md` (2026-09-10):

##### Catalog and rules

The committed catalog identifies Nuclear Laser as a red Option with play cost 3. Its complete text is `[Main] Trigger <Draw 2> (Draw 2 cards from your deck).
Then 1 of your Digimon gets +2000 DP for the turn.` It has no inherited or
Security text.

`node tools/kb/query.mjs card BT1-092` returns Q960, which confirms that both
the Draw 2 and +2000 DP clauses resolve when possible and neither is an
optional choice. The local `<Draw x>` definition in `data/kb/rules/glossary.md`
and turn-duration/DP rules in `data/kb/rules/comprehensive.md` provide the
corresponding zone and duration semantics.

##### Implementation and proof

`apps/api/src/cards/BT1/BT1-092.ts` has exactly one
`registerIrCard("BT1-092", compiled)` registration, no legacy `registerCard`,
and no `@ts-nocheck`. Its residual-free IR exactly matches `effects.json`:

- `Main` → draw exactly two cards for the owner.
- Then choose exactly one own Digimon and apply +2000 DP for the turn.

The colocated suite covers Q960's mandatory sequence with explicit target
selection, verifies only the selected Digimon receives the temporary DP
modifier and that it expires at turn end, and verifies the Draw 2 still happens
when no Digimon exists for the second clause. All deck padding is now inert
main-deck Digimon (BT1-009/BT1-012/BT1-013), with no Digi-Egg in a main deck or
Security zone.

BT1-093 is the nearby same-color temporary +2000 DP peer; the two modules' target
and duration shapes are consistent. Nuclear Laser has no evolution route,
inherited effect, or Security clause, so an evolution-stack proof is not
applicable.

##### Commands and results

- Catalog and effect fields reviewed from `cards.json` and `effects.json`.
- `node tools/kb/query.mjs card BT1-092`: Q960 reviewed.
- Canonical `effects.json` versus direct module IR comparison: exact match;
  `coverage: "full"`, `residual: []`.
- Registration/`@ts-nocheck` scan: clean.
- Assigned fixture scan: no numeric Security shorthand, no Digi-Egg in a deck
  or Security zone, and no timing/subtrigger injection or `advance.fire` use.
- Focused Vitest: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-092.test.ts --maxWorkers=1 --no-file-parallelism` — **2/2
  passed**.
- Typecheck, build, collection, and engine suites were not run; they remain
  outside this lane's release scope.

##### Remaining gaps

Runtime execution and mutation proof remain coordinator/tester gates. The
sole tester should rerun the full Option resolution to validate draw ordering
and the temporary DP ledger; no card-specific engine seam or unresolved IR
residual was found.

##### Score

| Component                        |    Score |
| -------------------------------- | -------: |
| Catalog/rules                    |      2/2 |
| IR trace                         |      2/2 |
| Behavioral/negative source proof |      2/2 |
| Peer/stack source proof          |      2/2 |
| Delivery gates                   |      0/2 |
| **Worker total**                 | **8/10** |

### BT1-093 — Great Tornado

Score: 8/10. Q961 same-target bonuses, natural attack/security checks and public red lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-093.md` (2026-09-10):

Lane: BT1-093..096 worker. Static review preceded the sole-tester release;
typecheck, build, collection, and engine suites were not run.

##### Card summary

Catalog (`packages/shared/src/cards/data/cards.json`): Red Option, play cost 3,
DP 0, rarity C, maximum 4 copies.

Printed clauses:

1. `[Main] 1 of your Digimon gets +2000 DP and ＜Security Attack +1＞ (This
Digimon checks 1 additional security card) for the turn.`
2. `[Security] Add this card to its owner's hand.`

##### Q&A ids

| Id   | Covered by                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q961 | The catalog/IR assertions and the positive test both require the one chosen Digimon to receive **both** +2000 DP and Security Attack +1, not a modal choice. |

##### Clause → IR → proof

| Clause                                               | IR                                                                                                                                    | Static/behavioral proof                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main chooses exactly one of the controller's Digimon | `ModifyDP` and `GainKeyword` each use `controller: "mine"`, `kind: ["Digimon"]`, `count: 1`; the second target has `sameTarget: true` | Existing positive test has two same-side Digimon and prefers one; the other remains unchanged. A dedicated test uses public `hatchEgg`, legal `digivolve`, turn transitions, and `moveFromBreeding` before playing the Option against the resulting permanent. |
| +2000 DP for the turn                                | `ModifyDP.amount: 2000`, `duration: "forTheTurn"`                                                                                     | Positive test asserts 4000 from 2000, then 2000 after the turn.                                                                                                                                                                                                |
| Security Attack +1 for the turn                      | `GainKeyword.keyword: { keyword: "SecurityAttack", amount: 1 }`, `duration: "forTheTurn"`                                             | Positive test observes the keyword and performs a real attack into two security cards; the next turn no longer has the keyword.                                                                                                                                |
| The two bonuses are mandatory together               | Two ordered actions, same target; no `optional` or modal branch                                                                       | Q961 and IR-shape test.                                                                                                                                                                                                                                        |
| Security adds this card to its owner's hand          | `Security` action `AddToHandSelf`, `isSecurity: true`                                                                                 | Direct SecuritySkill test checks the exact card instance reaches its owner's hand.                                                                                                                                                                             |

##### Rules and peer checks

- CR 15-1-2 requires the two processes to resolve in printed order; CR
  15-10-2-1 makes “1 of your Digimon” an exact one-card target.
- CR 16-4-1/16-4-2 defines Security Attack as a persistent modified check
  count; CR 13-1-2/13-1-3 explains why the +1 is one check containing two
  cards, not two attacks.
- CR 15-8-2 supports the turn-bound persistent duration.
- BT1-021/030 and BT1-108 are nearby same-target/temporary-bonus peers; the
  existing BT1-091-098 IR coverage test confirms this card remains full IR.
- No evolution requirement or inherited text exists on this Option. The public
  hatch → digivolve → move test proves the Option can target a resulting legal
  Digimon stack; the older direct fixture remains only a supplemental control.

##### Defects fixed locally

None. `BT1-093.ts` already used exclusive `registerIrCard("BT1-093", compiled)`
with `coverage: "full"` and `residual: []`; it has no `registerCard` or
`@ts-nocheck`.

##### Changed files

- `apps/api/src/cards/BT1/BT1-093.test.ts`: added catalog/IR assertions, exact
  play-cost proof, public hatch → digivolve → move lifecycle, and Q961-oriented
  assertions.
- `docs/audits/BT1-reaudit/BT1-093.md`: this report.

##### Verification commands

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-093.test.ts
--maxWorkers=1 --no-file-parallelism` → **5 passed**.

Scoped `oxlint` and `oxfmt --check` passed for the module/test files; `git diff
--check` passed. No collection or engine suite was run.

##### Remaining gaps

No card-specific IR gap found. A full UI evolution walkthrough is not
applicable because this is an Option with no evolution cost or inherited text.
No focused failure remains.

##### Score

| Column         | Score    | Reason                                                                                                                      |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog fields, Q961, and applicable targeting/security rules checked.                                                      |
| IR trace       | 2        | Both Main bonuses, same-target linkage, duration, and Security hand return map exactly.                                     |
| Behaviour      | 2        | Existing real play/security tests strengthened with cost, exact target, stack, and expiry assertions.                       |
| Peer/stack     | 2        | Same-target peers and a public hatch → digivolve → move lifecycle checked; no evolution route applies to the Option itself. |
| Delivery gates | 0        | Worker lane; tester/typecheck gates not released.                                                                           |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                                                             |

### BT1-094 — Oblivion Bird

Score: 8/10. Q962 granted-Blocker filter, ActivateMain Security and public green lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-094.md` (2026-09-10):

Lane: BT1-093..096 worker. Static review preceded the sole-tester release;
typecheck, build, collection, and engine suites were not run.

##### Card summary

Catalog (`packages/shared/src/cards/data/cards.json`): Red Option, play cost 5,
DP 0, rarity C, maximum 4 copies.

Printed clauses:

1. `[Main] Delete 1 of your opponent's Digimon with ＜Blocker＞.`
2. `[Security] Activate this card's [Main] effect.`

##### Q&A ids

| Id   | Covered by                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Q962 | Main-effect test grants Blocker to an otherwise non-Blocker Digimon through the continuous ledger, then proves Oblivion Bird deletes it. |

##### Clause → IR → proof

| Clause                              | IR                                                                                     | Static/behavioral proof                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delete exactly one opposing Digimon | Main `Delete` target filters `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | Existing mixed-board test keeps the controller's own Blocker and an opposing non-Blocker while deleting only the opposing Blocker; exact 5-memory cost is asserted. A dedicated lifecycle test first uses public hatch, two legal digivolutions, turn transitions, and move before playing this Option. |
| Target must have Blocker            | Target filter includes `keywords: ["Blocker"]`                                         | Mixed-board negative and Q962 granted-Blocker test distinguish printed and effect-granted Blocker. CR 16-5-1/16-5-2 define the keyword and its persistent application.                                                                                                                                  |
| Security activates Main             | Security is `{ kind: "ActivateMain" }` with `isSecurity: true`                         | The module was corrected from a duplicated direct delete to the canonical ActivateMain shape; the SecuritySkill test still proves deletion through the real Main body.                                                                                                                                  |

##### Rules and peer checks

- CR 15-1-7 uses “Delete 1 of your opponent's Digimon with <Blocker>” as the
  exact battle-area target interpretation; CR 15-10-2-1 requires one target.
- CR 15-8-4-2 describes [Main] activation, while the canonical Security
  `ActivateMain` action preserves the printed reuse of that body.
- CR 16-5-2 makes an externally granted Blocker a valid keyword for this
  condition, matching Q962.
- BT2-091 and BT1-107 provide accepted `Security -> ActivateMain` peers.
- The dedicated lifecycle test reaches a Woodmon (`BT1-072`) through public
  hatch, two legal digivolutions, and move, proving source-card retention while
  the Option is then exercised against an opposing Blocker. The pre-existing
  direct-board mixed control is supplemental only.

##### Defects fixed locally

- `BT1-094.ts`: changed Security from a second direct `Delete` action to
  `{ kind: "ActivateMain" }` and marked the entry `isSecurity: true`. This is
  required to preserve the exact printed Security clause and shared Main body.
- `BT1-094.test.ts`: added catalog/IR assertions and exact memory proof.

The module uses only `registerIrCard("BT1-094", compiled)` and has no
`registerCard` or `@ts-nocheck`.

##### Verification commands

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-094.test.ts
--maxWorkers=1 --no-file-parallelism` → **6 passed**.

Scoped `oxlint` and `oxfmt --check` passed for the module/test files; `git diff
--check` passed. No collection or engine suite was run.

##### Remaining gaps

No card-specific engine seam or unsupported clause remains. Behavioral commands
No focused failure remains.

##### Score

| Column         | Score    | Reason                                                                                          |
| -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | All catalog fields, Q962, target boundaries, and Blocker rules checked.                         |
| IR trace       | 2        | Main filter/count and canonical Security ActivateMain are explicit.                             |
| Behaviour      | 2        | Mixed-board, granted-Blocker, no-target, and Security tests cover positive and negative paths.  |
| Peer/stack     | 2        | BT2-091/BT1-107 Security peers and a public hatch → two digivolutions → move lifecycle checked. |
| Delivery gates | 0        | Worker lane; tester/typecheck gates not released.                                               |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                                 |

### BT1-095 — Brave Shield

Score: 8/10. Q963 unsuspended target, exact durations and public red lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-095.md` (2026-09-10):

Lane: BT1-093..096 worker. Static review preceded the sole-tester release;
typecheck, build, collection, and engine suites were not run.

##### Card summary

Catalog (`packages/shared/src/cards/data/cards.json`): Red Option, play cost 5,
DP 0, rarity R, maximum 4 copies.

Printed clauses:

1. `[Main] Unsuspend 1 of your Digimon. Until the end of your opponent's next
turn, that Digimon gains ＜Blocker＞.`
2. `[Security] Unsuspend 1 of your Digimon. That Digimon gains ＜Blocker＞ for
the turn.`

The parenthetical Blocker reminder is rules text, not a separate selectable
effect.

##### Q&A ids

| Id   | Covered by                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| Q963 | The Main test targets an already-unsuspended Digimon and confirms it still gains Blocker, matching the ruling. |

##### Clause → IR → proof

| Clause                                                             | IR                                                                                                                          | Static/behavioral proof                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main unsuspends exactly one of your Digimon                        | First `Unsuspend` target is `controller: "mine"`, `kind: ["Digimon"]`, `count: 1`                                           | Existing test uses two suspended Digimon and records one target decision; only the preferred target changes. A dedicated test uses public hatch, legal digivolution, turn transitions, and move before applying Brave Shield to the resulting permanent. |
| Main grants that same Digimon Blocker through opponent's next turn | Second `GainKeyword` has `sameTarget: true`, keyword Blocker, `duration: "untilOpponentTurnEnd"`                            | Existing duration test proves it survives the caster's turn and expires at opponent turn end.                                                                                                                                                            |
| Security unsuspends one and grants Blocker for the turn            | Security repeats the ordered Unsuspend + same-target GainKeyword sequence with `duration: "forTheTurn"`, `isSecurity: true` | Existing SecuritySkill test proves one selected Digimon unsuspends/gains Blocker while its peer remains suspended; next turn expiry is asserted.                                                                                                         |

##### Rules and peer checks

- CR 15-1-2 requires unsuspension before the grant; CR 15-10-2-1 requires
  exactly one target.
- CR 16-5-1/16-5-2 establish Blocker as a persistent keyword that allows a
  block; the parenthetical printed reminder adds no extra IR action.
- CR 15-8-2 covers the persistent duration. The Main and Security durations
  are intentionally different, as printed.
- Q963 confirms an originally unsuspended Digimon is still an eligible target;
  the dedicated test prevents an incorrect “suspended only” filter.
- BT1-103 and BT1-113 are duration/Blocker peers; BT1-094 demonstrates that a
  Blocker supplied by another effect is still filterable.
- No evolution route applies to this Option. The dedicated public hatch →
  digivolve → move test verifies that selecting a permanent with sources still
  grants the top Digimon only; the pre-existing direct-board fixture remains
  supplemental.

##### Defects fixed locally

- `BT1-095.ts`: marked the Security effect `isSecurity: true`; Main and
  Security action sequences and durations were already faithful.
- `BT1-095.test.ts`: added catalog/IR assertions and a public hatch →
  digivolve → move lifecycle target fixture.

The module uses only `registerIrCard("BT1-095", compiled)` and has no
`registerCard` or `@ts-nocheck`.

##### Verification commands

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-095.test.ts
--maxWorkers=1 --no-file-parallelism` → **6 passed**.

Scoped `oxlint` and `oxfmt --check` passed for the module/test files; `git diff
--check` passed. No collection or engine suite was run.

##### Remaining gaps

No card-specific engine seam or unsupported clause remains. Behavioral commands
No focused failure remains.

##### Score

| Column         | Score    | Reason                                                                                         |
| -------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog fields, Q963, Blocker semantics, and both durations checked.                           |
| IR trace       | 2        | Both ordered action pairs, same-target linkage, and Security marker map exactly.               |
| Behaviour      | 2        | Suspended/unsuspended positives, peer refusal, duration expiry, and Security path are covered. |
| Peer/stack     | 2        | Blocker/duration peers and a public hatch → digivolve → move lifecycle checked.                |
| Delivery gates | 0        | Worker lane; tester/typecheck gates not released.                                              |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                                |

### BT1-096 — Mad Dog Fire

Score: 8/10. ordered Security draw/return, duration/target boundaries and public blue lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-096.md` (2026-09-10):

Lane: BT1-093..096 worker. Static review preceded the sole-tester release;
typecheck, build, collection, and engine suites were not run.

##### Card summary

Catalog (`packages/shared/src/cards/data/cards.json`): Blue Option, play cost 1,
DP 0, rarity R, maximum 4 copies.

Printed clauses:

1. `[Main] 1 of your Digimon gets +3000 DP for the turn.`
2. `[Security] Trigger ＜Draw 1＞ (Draw 1 card from your deck). Then add this
card to its owner's hand.`

##### Clause → IR → proof

| Clause                                                     | IR                                                                                                           | Static/behavioral proof                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main chooses exactly one of your Digimon                   | `ModifyDP` target uses `controller: "mine"`, `kind: ["Digimon"]`, `count: 1`                                 | Existing two-Digimon test prefers the evolved Elecmon stack; the other Digimon remains at its base DP. A dedicated test uses public hatch, legal digivolution, turn transitions, and move before applying Mad Dog Fire to the resulting permanent. |
| +3000 DP for the turn                                      | `ModifyDP.amount: 3000`, `duration: "forTheTurn"`                                                            | Existing test asserts +3000 and post-turn expiry; exact play cost 1 is now asserted.                                                                                                                                                               |
| Security draws one, then returns this card to owner's hand | Ordered Security actions `Draw(controller: "mine", amount: 1)` then `AddToHandSelf`, with `isSecurity: true` | Existing SecuritySkill test asserts deck decreases by one and hand order is drawn card then this card.                                                                                                                                             |

##### Rules and peer checks

- CR 15-1-2 requires the Security draw before the hand return; CR 15-10-2-1
  requires one Digimon target.
- CR 15-8-2 supports the temporary DP modification. No numeric Security
  shorthand is used.
- BT1-093 and BT1-108 are same-set temporary DP peers; BT1-097 and BT1-103
  provide ordered Security draw examples.
- The dedicated public hatch → digivolve → move test reaches a legal blue
  Elecmon-over-Upamon stack before applying the Option. No evolution route,
  inherited effect, or Digi-Egg in deck/security is introduced by this
  Option's fixture; the pre-existing direct-board target is supplemental only.

##### Defects fixed locally

- `BT1-096.ts`: marked the Security effect `isSecurity: true`; its ordered
  Draw-then-AddToHandSelf body was already faithful.
- `BT1-096.test.ts`: added catalog/IR assertions, exact cost proof, and a public
  hatch → digivolve → move lifecycle target fixture.

The module uses only `registerIrCard("BT1-096", compiled)` and has no
`registerCard` or `@ts-nocheck`.

##### Verification commands

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-096.test.ts
--maxWorkers=1 --no-file-parallelism` → **5 passed**.

Scoped `oxlint` and `oxfmt --check` passed for the module/test files; `git diff
--check` passed. No collection or engine suite was run.

##### Q&A ids

No local KB Q&A is indexed for BT1-096.

##### Remaining gaps

No card-specific engine seam or unsupported clause remains. Behavioral commands
No focused failure remains.

##### Score

| Column         | Score    | Reason                                                                                            |
| -------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | All catalog fields and applicable ordered-effect/security rules checked; no Q&A exists.           |
| IR trace       | 2        | Main target/amount/duration and ordered Security actions map exactly.                             |
| Behaviour      | 2        | Exact-one positive/negative target paths, expiry, and ordered Security draw/return are covered.   |
| Peer/stack     | 2        | Temporary DP and ordered Security peers plus a public hatch → digivolve → move lifecycle checked. |
| Delivery gates | 0        | Worker lane; tester/typecheck gates not released.                                                 |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                                   |

### BT1-097 — Boring Storm

Score: 8/10. exact discard/draw clauses and public Main/Security flows; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-097.md` (2026-09-10):

Lane: BT1-097..100 worker. Focused tests were run after the sole-tester
release; typecheck, build, collection, and engine suites remain out of scope.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Blue Option, play cost
1, rarity C, maximum 4 copies, DP 0, with no evolution or inherited text.

Printed clauses:

1. `[Main] Trigger ＜Draw 1＞ (Draw 1 card from your deck).`
2. `[Security] Trigger ＜Draw 2＞ (Draw 2 cards from your deck).`

The local KB query has no BT1-097-specific Q&A, errata, or ruling. Applicable
rules are comprehensive 13-1-8-2-1 (resolve a triggered Security effect before
continuing the check), 13-1-8-4 (a checked card goes to trash unless an effect
puts it in another area), 15-1-2 (processes resolve in printed order),
15-10-1-1-1 (`your` means the effect card's player), and 15-16-10-1/2
(Security triggers on the check and activates immediately). The glossary's
`<Draw x>` and Security entries corroborate the deck draw and automatic timing.

##### Clause → IR → proof

| Clause          | IR                                                                                       | Static/behavioral proof                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main Draw 1     | Main action `Draw`, `controller: "mine"`, `amount: 1`                                    | Test uses a real Option play with cost 1, two-card deck, and asserts exactly the top card enters hand while the Option reaches trash.                                                     |
| Security Draw 2 | Security action `Draw`, `controller: "mine"`, `amount: 2`, explicitly `isSecurity: true` | Test declares a public attack into a face-down Security card, settles the complete check, and asserts exactly two cards drawn, the remaining deck order, and the checked Option in trash. |

##### Peer and lifecycle checks

- BT1-096 and BT1-103 are same-set draw peers; both use explicit ordered draw
  actions and Security metadata. No numeric Security shorthand or injected
  timing helper remains in this test.
- The Option has no evolution, inherited, or target clause. Its Main and
  Security tests use public play/attack lifecycle and contain no Digi-Egg in
  deck or Security.
- `BT1-097.ts` uses only `registerIrCard("BT1-097", compiled)`, has
  `coverage: "full"`, `residual: []`, and no `registerCard` or `@ts-nocheck`.

##### Changed files

- `apps/api/src/cards/BT1/BT1-097.ts`: mark the Security effect explicitly
  with `isSecurity: true`.
- `apps/api/src/cards/BT1/BT1-097.test.ts`: add catalog/IR assertions and
  replace direct SecuritySkill injection with a public attack proof.
- This report.

##### Verification

Focused: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-097.test.ts --maxWorkers=1 --no-file-parallelism` → **3
passed**. Scoped Oxlint and `oxfmt --check` passed; `git diff --check` passed.
No typecheck, build, collection, or engine suite was run.

##### Gaps and score

No card-specific IR gap, unresolved Q&A, or unsupported clause remains. A UI
evolution walkthrough is not applicable to an Option with no evolution cost or
inherited text. Delivery gates remain intentionally unreleased.

| Column         | Score    | Reason                                                                        |
| -------------- | -------- | ----------------------------------------------------------------------------- |
| Catalog/rules  | 2        | All catalog fields and applicable Security/draw rules checked; no Q&A exists. |
| IR trace       | 2        | Main/Security draw amounts, controller, and Security dispatch map exactly.    |
| Behaviour      | 2        | Public Main play and public Security attack prove zone, count, and order.     |
| Peer/stack     | 2        | Same-set draw peers checked; no evolution stack applies to this Option.       |
| Delivery gates | 0        | Sole tester and broader gates are pending.                                    |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                               |

### BT1-098 — V-Nova Blast

Score: 8/10. temporary Jamming boundaries and public blue lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-098.md` (2026-09-10):

Lane: BT1-097..100 worker. Focused tests were run after the sole-tester
release; typecheck, build, collection, and engine suites remain out of scope.

##### Card and sources

Catalog: Blue Option, play cost 2, rarity C, maximum 4 copies, DP 0, with no
evolution or inherited text.

Printed clauses:

1. `[Main] 1 of your Digimon gains ＜Jamming＞ (This Digimon can't be deleted
in battles against Security Digimon) for the turn.`
2. `[Security] Add this card to its owner's hand.`

The local KB query has no BT1-098-specific Q&A, errata, or ruling. Applicable
rules are comprehensive 15-1-2 (printed process order), 15-10-2-1 (stated `1`
requires one target), 15-16-10-1/2 (Security timing), and 13-1-8-4 (checked
cards go to trash unless moved elsewhere). The glossary defines Jamming as
preventing deletion in battles against Security Digimon.

##### Clause → IR → proof

| Clause                                         | IR                                                                          | Static/behavioral proof                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Exactly one of your Digimon                    | `GainKeyword` filters `controller: "mine"`, `kind: ["Digimon"]`, `count: 1` | Two-Digimon positive test proves only the preferred target changes; no-target test proves a legal no-op. |
| Jamming for the turn                           | Keyword `Jamming`, `duration: "forTheTurn"`                                 | Positive test attacks a stronger Security Digimon, confirms survival, and checks turn expiry.            |
| Security returns this card to its owner's hand | Security `AddToHandSelf`, `isSecurity: true`                                | Public attack into face-down Security asserts exact instance in owner's hand and not trash.              |

##### Peer and stack checks

- BT1-093/095/103 are same-set peers for exact-one temporary keywords and
  explicit Security actions. No numeric Security shorthand or injected
  `advance.fire*` timing remains.
- Added stack test publicly hatches BT1-003, digivolves it into Blue BT1-028
  (Lv.3, cost 0), moves it from Breeding, then plays this Option at cost 2
  against the evolved permanent while asserting the egg source identity.
- Deck and Security fixtures contain no Digi-Egg cards.
- `BT1-098.ts` is exclusive `registerIrCard`, full coverage, empty residuals,
  with no `registerCard` or `@ts-nocheck`.

##### Changed files

- `BT1-098.ts`: explicit Security dispatch metadata.
- `BT1-098.test.ts`: catalog/IR and legal stack assertions, Digi-Egg fixture
  removal, and public Security attack proof.
- This report.

##### Verification and score

Focused: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-098.test.ts --maxWorkers=1 --no-file-parallelism` → **5
passed** (including the public hatch/digivolve/move route). Scoped Oxlint and
`oxfmt --check` passed; `git diff --check` passed.
No typecheck, build, collection, or engine suite was run. Delivery gates are
intentionally unreleased.

| Column         | Score    | Reason                                                                |
| -------------- | -------- | --------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog, keyword, targeting, and Security rules checked.              |
| IR trace       | 2        | Filter, keyword duration, and hand-return mapping exact.              |
| Behaviour      | 2        | Positive, negative, expiry, stack, and public Security paths covered. |
| Peer/stack     | 2        | Temporary-keyword peers and legal Blue route checked.                 |
| Delivery gates | 0        | Sole tester and broader gates pending.                                |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                       |

### BT1-099 — Hearts Attack

Score: 8/10. Q964 empty/loaded target boundaries and public opponent multi-source lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-099.md` (2026-09-10):

Lane: BT1-097..100 worker. Focused tests were run after the sole-tester
release; typecheck, build, collection, and engine suites remain out of scope.

##### Card and sources

Catalog: Blue Option, play cost 3, rarity C, maximum 4 copies, DP 0, with no
Security, evolution, or inherited text.

Printed clause: `[Main] Trash all digivolution cards under 1 of your opponent's
Digimon.`

The local KB query exposes Q964: targeting an opponent's Digimon with no
digivolution cards does nothing, but the Option is still treated as used.
Applicable rules are comprehensive 15-1-2 (printed order), 15-10-2-1 (stated
`1` target), 15-10-2-4-1 ("all" is overall processing), and 15-11-2 (overall
processing uses the target's current cards).

##### Clause → IR → proof

| Clause                              | IR                                                                                    | Static/behavioral proof                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Exactly one opponent Digimon        | `TrashDigivolution` filters `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1` | Decision test presents identical empty and loaded opposing Digimon and asserts both distinct permanent IDs are candidates.  |
| Trash all sources under that target | `TrashDigivolution.amount: "all"`                                                     | Selected three-card stack moves entirely to opponent trash; unselected and allied stacks remain unchanged.                  |
| Empty-stack Q964 behavior           | Broad filter intentionally has no `hasAny` prerequisite                               | Negative test chooses empty stack, settles used Option to trash, and proves loaded opposing stack/source IDs are untouched. |

##### Peer and stack checks

- BT1-043 and BT3-023 are source-trash peers; this card intentionally permits
  an empty target, as Q964 requires.
- The positive and Q964 tests publicly hatch the opponent's BT1-001 and
  digivolve BT1-010 → BT1-014 → BT1-021 before moving from Breeding. They then
  use the resulting three-source stack beside an empty identical target to
  prove target identity and controller boundaries. No Digi-Egg is placed in
  deck or Security.
- The Option has no evolution, inherited, or Security clause.
- `BT1-099.ts` is exclusive `registerIrCard`, full coverage, empty residuals,
  with no `registerCard` or `@ts-nocheck`.

##### Changed files

- `BT1-099.test.ts`: catalog/IR assertions plus positive, identity, and Q964
  negative proofs.
- This report.

##### Verification and score

Focused: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-099.test.ts --maxWorkers=1 --no-file-parallelism` → **3
passed** (including public multi-source stack setup for the positive and Q964
paths). Scoped Oxlint and `oxfmt --check` passed; `git diff --check` passed.
No typecheck, build, collection, or engine suite was run. Delivery gates remain
unreleased.

| Column         | Score    | Reason                                                          |
| -------------- | -------- | --------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog, overall-processing rules, and Q964 checked.            |
| IR trace       | 2        | Exact-one opponent target and all-source trash map exactly.     |
| Behaviour      | 2        | Target identity, positive trash, and empty-stack no-op covered. |
| Peer/stack     | 2        | Source-trash peers and mixed stack boundaries checked.          |
| Delivery gates | 0        | Sole tester and broader gates pending.                          |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                 |

### BT1-100 — Grace Cross Freezer

Score: 8/10. Q965 dynamic source gain, duration/Security paths and public red lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-100.md` (2026-09-10):

Lane: BT1-097..100 worker. Focused tests were run after the sole-tester
release; typecheck, build, collection, and engine suites remain out of scope.

##### Card and sources

Catalog: Blue Option, play cost 4, rarity R, maximum 4 copies, DP 0, with no
evolution or inherited text.

Printed clauses:

1. `[Main] Until the end of your opponent's next turn, their Digimon with no
digivolution cards can't attack.`
2. `[Security] Your opponent's Digimon with no digivolution cards can't attack
for the turn.`

The local KB query exposes Q965: a restricted Digimon can attack if it later
gains digivolution cards. Applicable rules are comprehensive 15-1-2,
15-11-2-3-3 (conditional overall processing updates as conditions change),
15-16-10-1/2 (immediate Security timing), and the glossary's Security/attack
definitions. `whileMatchesTargetFilter` models the ongoing source-less
condition.

##### Clause → IR → proof

| Clause                                          | IR                                                                                                                              | Static/behavioral proof                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Main restricts all opposing source-less Digimon | `Restrict` filters opponent Digimon with `digivolutionCards: "none"`, `count: "all"`, restriction `attack`, dynamic while-match | Main test contrasts source-less and sourced Digimon; late-arrival test proves a new source-less permanent is included.      |
| Main duration                                   | `duration: "untilOpponentTurnEnd"`                                                                                              | Turn lifecycle test observes restriction through opponent turn and removal at its end.                                      |
| Security duration                               | Same dynamic filter, `duration: "forTheTurn"`, `isSecurity: true`                                                               | Public attack into face-down Security triggers the restriction and distinguishes source-less from sourced opposing Digimon. |
| Q965 source gain                                | Dynamic filter stops matching after source placement                                                                            | Test starts source-less red Lv.4, adds legal red Lv.3 source, observes clear restriction, and performs public attack.       |

##### Peer and stack checks

- BT1-095/103 provide same-set duration and Security metadata peers. No numeric
  Security shorthand or injected `advance.fire*` timing remains.
- Main/Security comparison tests publicly hatch BT1-001, digivolve red
  BT1-010 → BT1-014, and move from Breeding before checking the sourced
  exemption; no direct `under` fixture or Digi-Egg appears in deck or Security.
- The Option has no evolution or inherited text; Q965 covers its opposing stack
  interaction.
- `BT1-100.ts` is exclusive `registerIrCard`, full coverage, empty residuals,
  with no `registerCard` or `@ts-nocheck`.

##### Changed files

- `BT1-100.ts`: explicit Security dispatch metadata.
- `BT1-100.test.ts`: catalog/IR assertions, replacement of the remaining
  BT1-002 main-deck fixture with legal BT1-029, and public Security attack
  proof.
- This report.

##### Verification and score

Focused: `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-100.test.ts --maxWorkers=1 --no-file-parallelism` → **6
passed** (including public red hatch/digivolve/move and opponent-turn
digivolve Q965 proof). Scoped Oxlint and `oxfmt --check` passed; `git diff
--check` passed.
No typecheck, build, collection, or engine suite was run. Delivery gates remain
unreleased.

| Column         | Score    | Reason                                                                       |
| -------------- | -------- | ---------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog, dynamic restriction rules, and Q965 checked.                        |
| IR trace       | 2        | Both filters, restrictions, durations, and Security metadata exact.          |
| Behaviour      | 2        | Main duration, late arrival, source gain, and public Security paths covered. |
| Peer/stack     | 2        | Duration/Security peers and legal red source stacks checked.                 |
| Delivery gates | 0        | Sole tester and broader gates pending.                                       |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                              |

### BT1-101 — Howling Crusher

Score: 8/10. ActivateMain Security correction with red/green proof and public target lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-101.md` (2026-09-10):

Lane: BT1-101..104 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Blue Option, play cost
7, rarity C, maximum 4, DP 0.

Printed clauses:

1. `[Main] Trash all digivolution cards under all of your opponent's Digimon.`
2. `[Security] Activate this card's [Main] effect.`

The local KB query exposes Q1311: removing an attacker's sources during a
declared attack does not end that attack. Relevant local rules searches cover
Option use/Security activation, stacked cards (CR 4-6), overall processing,
and source-card trashing.

##### Clause → IR → proof

| Clause                                                  | IR                                                                                                                                                      | Static/behavioral proof                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trash all sources under every opposing Digimon          | Main `TrashDigivolution` filters `controller: "opponent"`, `kind: ["Digimon"]`, `digivolutionCards: "hasAny"`, uses `count: "all"`, and `amount: "all"` | Main test uses two opposing sourced Digimon and asserts every source reaches the opponent trash. The lifecycle test reaches an opposing Lv.5 through public hatch, three legal evolutions, and move before exercising the Option. |
| Security activates Main                                 | Security is `{ kind: "ActivateMain" }` with `isSecurity: true`                                                                                          | SecuritySkill proof resolves the same Main body and trashes the target's sources.                                                                                                                                                 |
| Q1311 attack remains declared after sources are removed | Main body is shared by the Security activation; no attack-cancellation behavior is injected                                                             | Existing Q1311 test attacks with Security Attack +1, reveals BT1-101, and asserts the attacker remains in play after its sources are trashed.                                                                                     |

##### Rules and peer checks

- BT1-099 is the one-target source-trash peer; BT1-101 correctly changes the
  target count to `all`.
- BT1-043 and BT5-088 are source-trash peers; this card correctly uses
  `amount: "all"` rather than a numeric source count.
- The module uses only `registerIrCard("BT1-101", compiled)`, has full
  coverage and an empty residual list, and has no `registerCard` or
  `@ts-nocheck`.
- All deck and Security fixtures use real non-Egg cards; source fixtures use
  valid color/level routes rather than Digi-Eggs in prohibited zones.

##### Changed files

- `apps/api/src/cards/BT1/BT1-101.ts`: canonical Security `ActivateMain`
  dispatch with `isSecurity: true`.
- `apps/api/src/cards/BT1/BT1-101.test.ts`: valid source fixtures and public
  opposing hatch → evolution → move lifecycle proof.
- This report.

##### Static verification and score

Mutation red: restoring the pre-fix duplicated `TrashDigivolution` Security
body failed `encodes Security as activation of the printed Main effect`, with
the expected received-vs-expected IR diff. Restored IR passed that assertion.
Focused `BT1-101.test.ts` → **5 passed**. Scoped `oxfmt --check` and
`git diff --check` passed. Typecheck, build, collection, and engine suites were
not run; delivery gates remain unreleased.

| Column         | Score    | Reason                                                                                  |
| -------------- | -------- | --------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, Q1311, Security use, and stack/source rules checked.                      |
| IR trace       | 2        | Exact target boundary, all-source processing, and canonical Security reuse map exactly. |
| Behaviour      | 2        | Main, Security, no numeric shorthand, and Q1311 proofs are present.                     |
| Peer/stack     | 2        | Source-trash peers and a public legal opposing stack lifecycle are covered.             |
| Delivery gates | 0        | Sole tester and broader gates pending.                                                  |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                         |

### BT1-102 — Blade of the True

Score: 8/10. ActivateMain Security correction with red/green proof and exact suspend boundaries; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-102.md` (2026-09-10):

Lane: BT1-101..104 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Option, play
cost 2, rarity C, maximum 4, DP 0.

Printed clauses:

1. `[Main] Trigger <Draw 1> for every 2 security cards you have.`
2. `[Security] Activate this card's [Main] effect.`

The local KB query exposes Q966: with one or fewer security cards, nothing is
drawn, but the Option is still treated as used. Rules searches cover Option
use/Security activation and “every” processing over stacked/security cards.

##### Clause → IR → proof

| Clause                                               | IR                                                                                                   | Static/behavioral proof                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Draw one per two of your security cards              | Main `Draw` has `amount: 1`, `scaling: { per: 2, unit: "security", filter: { controller: "mine" } }` | Four explicit Security cards and two explicit deck cards prove two draws; 0- and 1-Security cases prove the exact lower boundary. |
| Security activates Main                              | Security is `{ kind: "ActivateMain" }` with `isSecurity: true`                                       | SecuritySkill proof uses the same scaled draw body and exhausts the two-card deck.                                                |
| Q966 still treats the Option as used at 0/1 Security | Main use remains legal even when scaling computes zero                                               | Boundary tests assert the Option leaves hand for trash, memory is paid, and the deck remains unchanged.                           |

##### Rules and peer checks

- BT1-103 provides a same-set Security draw peer; BT1-107 is a canonical
  `Security -> ActivateMain` peer.
- No target, evolution, inherited, or once-per-turn clause applies to this
  Option; no artificial stack or timing injection is used.
- All deck and Security fixtures use explicit non-Egg cards; numeric Security
  shorthand and Digi-Eggs in deck/Security were removed.
- The module uses only `registerIrCard("BT1-102", compiled)`, has full
  coverage and an empty residual list, and has no `registerCard` or
  `@ts-nocheck`.

##### Changed files

- `apps/api/src/cards/BT1/BT1-102.ts`: canonical Security `ActivateMain`
  dispatch with `isSecurity: true`.
- `apps/api/src/cards/BT1/BT1-102.test.ts`: explicit legal zone fixtures and
  0/1/4 Security boundary cases.
- This report.

##### Static verification and score

Mutation red: restoring the pre-fix duplicated scaled `Draw` Security body
failed `encodes Security as activation of the printed Main effect`, with the
expected received-vs-expected IR diff. Restored IR passed that assertion.
Focused `BT1-102.test.ts` → **5 passed**. Scoped `oxfmt --check` and
`git diff --check` passed. Typecheck, build, collection, and engine suites were
not run; delivery gates remain unreleased.

| Column         | Score    | Reason                                                                                         |
| -------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, Q966, scaling boundary, and Security rules checked.                              |
| IR trace       | 2        | Scaling controller, divisor, amount, and canonical Security reuse map exactly.                 |
| Behaviour      | 2        | Positive 4-card scaling, Security path, and 0/1-card Q966 negatives are present.               |
| Peer/stack     | 2        | Security-draw/ActivateMain peers checked; this Option has no Digimon target or evolution path. |
| Delivery gates | 0        | Sole tester and broader gates pending.                                                         |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                                |

### BT1-103 — Testament

Score: 8/10. Security metadata red/green proof, duration and public lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-103.md` (2026-09-10):

Lane: BT1-101..104 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Option, play
cost 3, rarity R, maximum 4, DP 0.

Printed clauses:

1. `[Main] Until the end of your opponent's next turn, 1 of your Digimon gains <Blocker>.`
2. `[Security] Trigger <Draw 1>. Then, add this card to your hand.`

The local KB query has no card-specific entry. Comprehensive rules searches
cover `<Blocker>` (CR 16-5), persistent/gained effects (CR 15-8/15-13),
Option use, and Security timing.

##### Clause → IR → proof

| Clause                                            | IR                                                                                                  | Static/behavioral proof                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exactly one of your Digimon gains Blocker         | Main `GainKeyword` targets `controller: "mine"`, `kind: ["Digimon"]`, `count: 1`, keyword `Blocker` | Auto-selection test contrasts the chosen Digimon with another allied Digimon and proves only one gains the keyword. A second test reaches the chosen Digimon through public hatch, legal evolutions, and move before applying the Option. |
| Duration ends at opponent's next turn end         | `duration: "untilOpponentTurnEnd"`                                                                  | Turn assertions keep Blocker through the controller's next turn and remove it after the opponent turn ends.                                                                                                                               |
| Security draws one then returns this card to hand | Security actions are ordered `Draw` then `AddToHandSelf`, with `isSecurity: true`                   | SecuritySkill test asserts the deck is exhausted, then checks hand order contains the drawn card followed by the revealed Option.                                                                                                         |

##### Rules and peer checks

- BT1-095 is the closest same-set temporary Blocker peer; BT1-098 and BT1-100
  provide accepted Security metadata/duration patterns.
- CR 16-5-2 makes gained Blocker persistent, matching the effect's observable
  use in a later opponent attack window.
- All deck fixtures contain non-Egg cards. No numeric Security shorthand,
  injected timing, duplicate registration, or `@ts-nocheck` is present.
- The module uses only `registerIrCard("BT1-103", compiled)`, with full
  coverage and an empty residual list.

##### Changed files

- `apps/api/src/cards/BT1/BT1-103.ts`: mark Security body with `isSecurity: true`.
- `apps/api/src/cards/BT1/BT1-103.test.ts`: explicit non-Egg fixtures,
  canonical Security expectation, and legal stack lifecycle proof.
- This report.

##### Static verification and score

Mutation red: removing `isSecurity: true` failed the exact catalog/IR
assertion, with the expected missing-property diff. Restored IR passed.
Focused `BT1-103.test.ts` → **4 passed**. Scoped `oxfmt --check` and
`git diff --check` passed. Typecheck, build, collection, and engine suites were
not run; delivery gates remain unreleased.

| Column         | Score    | Reason                                                                                |
| -------------- | -------- | ------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, Blocker, gained-effect duration, and Security ordering checked.         |
| IR trace       | 2        | Exact-one target, keyword, duration, action order, and Security metadata map exactly. |
| Behaviour      | 2        | Mixed-target, duration, Security draw/return, and legal stack proofs are present.     |
| Peer/stack     | 2        | Temporary Blocker peers and public hatch → evolution → move lifecycle are covered.    |
| Delivery gates | 0        | Sole tester and broader gates pending.                                                |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                       |

### BT1-104 — Golden Ripper

Score: 8/10. exact scaling/target bounds and public lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-104.md` (2026-09-10):

Lane: BT1-101..104 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Option, play
cost 3, rarity C, maximum 4, DP 0.

Printed clause: `[Main] All of your Digimon gain the following effect for the
turn: “[When Attacking] 1 of your opponent's Digimon gets -2000 DP for the
turn.”`

The local KB query exposes Q967 (late moved/played Digimon gain it), Q968
(Security reveal is trashed), Q969 (effect can be activated after the attacker
digivolves), Q970 (later-played Digimon gain it), and Q971 (two copies stack).
Rules searches cover gained effects (CR 15-13), stacked cards (CR 4-6), and
When Attacking timing.

##### Clause → IR → proof

| Clause                                                     | IR                                                                                                                    | Static/behavioral proof                                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All of your Digimon gain a turn-long When Attacking effect | Main installs player-scoped `SubTrigger` for `whenAttacking`, filtered to your Digimon, with `duration: "forTheTurn"` | Late-arrival test adds a Digimon after resolution; two-copy test proves independent triggers; legal hatch → evolution → move test proves a moved evolved attacker retains the watcher. |
| One opposing Digimon gets -2000 DP for the turn            | SubTrigger body uses `ModifyDP amount: -2000`, opposing Digimon filter, `count: 1`, `duration: "forTheTurn"`          | Existing attack proof asserts 5000→3000 DP and two-copy proof asserts 7000→3000 DP.                                                                                                    |
| Q967/Q970 late arrival                                     | `playerScoped: true` watcher is not tied to a permanent                                                               | Tests cover a Digimon put on the board after Main resolves and attack after the effect is installed.                                                                                   |
| Q968 no Security effect                                    | Module has no Security trigger                                                                                        | Public attack into Security reveals and trashes BT1-104 without applying a DP modifier.                                                                                                |

##### Rules and peer checks

- BT1-077, BT1-082, and BT5-032 provide SubTrigger/when-attacking peers;
  BT1-104 intentionally uses a player-scoped watcher because Q967/Q970
  require late entrants to qualify.
- Q969 is addressed by the public evolved-attacker lifecycle test; Q971 is
  addressed by independent copy stacking. No synthetic `advance.fire` timing
  is used.
- All deck and Security fixtures use explicit non-Egg cards. The module uses
  only `registerIrCard("BT1-104", compiled)`, has full coverage and an empty
  residual list, and has no `registerCard` or `@ts-nocheck`.

##### Changed files

- `apps/api/src/cards/BT1/BT1-104.test.ts`: explicit non-Egg Security fixture,
  public legal stack lifecycle proof, and attack/source retention assertion.
- This report.

##### Static verification and score

Focused `BT1-104.test.ts` → **6 passed**. Scoped `oxfmt --check` and
`git diff --check` passed. Typecheck, build, collection, and engine suites were
not run; delivery gates remain unreleased.

| Column         | Score    | Reason                                                                            |
| -------------- | -------- | --------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, Q967–Q971, gained-effect and attack timing rules checked.           |
| IR trace       | 2        | Player scope, event/filter, target count, modifier, and duration map exactly.     |
| Behaviour      | 2        | Late entrant, copy stacking, evolved attacker, and no-Security paths are present. |
| Peer/stack     | 2        | SubTrigger peers and public legal hatch → evolution → move lifecycle are covered. |
| Delivery gates | 0        | Sole tester and broader gates pending.                                            |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                   |

### BT1-105 — Blast Fire

Score: 8/10. exact source/DP boundaries and public target lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-105.md` (2026-09-10):

Lane: BT1-105..108 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Option, play cost
4, rarity C, maximum 4, DP 0.

Printed clause: `[Main] Change the original DP of 1 of your opponent's Digimon
to 3000 until the end of your opponent's next turn.`

The local KB query exposes Q972 (original DP is the printed DP), Q973 (a later
-4000 modifier deletes a 3000-DP Digimon), Q974 (later DP increases apply),
Q975 (an existing +1000 modifier is added to the changed original DP), and
Q976 (the change persists through digivolution). Comprehensive-rule searches
cover original DP and information-changing effects (§2-5, §15-12-2), additive
DP calculation (§1-3-7), and evolution stacks (§8-1-2).

##### Clause → IR → proof

| Clause                                                    | IR                                                                                                         | Static/behavioral proof                                                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Change exactly one opposing Digimon's original DP to 3000 | Main `SetBaseDP` filters `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1`, and sets `value: 3000` | Positive proof asserts 3000; the mixed-target lifecycle selects a legally evolved, moved opposing stack and leaves a second opponent Digimon at 12000. |
| Duration through the opponent's next turn                 | `duration: "untilOpponentTurnEnd"`                                                                         | Q974/Q975 proof applies a later +3000 and evolves the target while the override is active; turn-boundary proof confirms expiration.                    |
| Original-DP semantics                                     | `SetBaseDP` changes the permanent's base/original DP while ordinary modifiers remain additive              | Q973 and Q975 tests prove deletion at 0 and 3000 + 1000 = 4000; Q972/Q976 are documented and exercised by the stack case.                              |

##### Rules and peer checks

- BT1-101 is the nearby exact-target/source-manipulation Option peer; BT1-104
  is the nearby turn-duration DP-modifier peer. The implementation uses the
  dedicated original-DP IR action rather than a numeric DP shorthand.
- The lifecycle test uses a real Upamon egg in `eggDeck`, then legal
  Upamon → Elecmon → Frigimon → LoaderLeomon evolution costs before a public
  move from breeding. No Digi-Egg is placed in deck or Security.
- The module registers only `registerIrCard("BT1-105", compiled)`, has full
  coverage and an empty residual list, and has no `registerCard` or
  `@ts-nocheck`. This Option has no Security clause.

##### Changed files

- `apps/api/src/cards/BT1/BT1-105.test.ts`: full catalog/IR assertions,
  non-Egg deck/Security fixtures, and public stack lifecycle proof.
- This report.

##### Verification and score

Focused `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-105.test.ts --maxWorkers=1 --no-file-parallelism` passed
7/7. No typecheck, build, collection, or engine suite was run. Scoped
`oxfmt --check` and `git diff --check` passed. Delivery gates remain
unreleased.

| Column         | Score    | Reason                                                                                     |
| -------------- | -------- | ------------------------------------------------------------------------------------------ |
| Catalog/rules  | 2        | Catalog text, Q972–Q976, original-DP and duration rules checked.                           |
| IR trace       | 2        | Exact controller/kind/count, value, and opponent-turn duration map exactly.                |
| Behaviour      | 2        | Positive, additive, deletion, digivolution, expiration, and no-Security paths are present. |
| Peer/stack     | 2        | Nearby DP/source peers and a public hatch → evolution → move stack are covered.            |
| Delivery gates | 0        | Sole tester and broader gates pending.                                                     |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                            |

### BT1-106 — Symphony No.1 <Polyphony>

Score: 8/10. exact target/DP filter and public opponent lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-106.md` (2026-09-10):

Lane: BT1-105..108 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Option, play cost
5, rarity R, maximum 4, DP 0.

Printed clause: `[Main] 1 of your opponent's Digimon gets -7000 DP for the
turn.`

The local KB query has no BT1-106-specific Q&A. Comprehensive-rule searches
cover additive DP calculation (§1-3-7), DP reaching 0 and deletion, effect
duration, Option use, and evolution-stack state (§8-1-2).

##### Clause → IR → proof

| Clause                                     | IR                                                                                                      | Static/behavioral proof                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exactly one opposing Digimon gets -7000 DP | Main `ModifyDP` filters `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1`, with `amount: -7000` | Positive proof observes 12000 → 5000; a 7000-DP boundary proof observes deletion; the lifecycle uses a moved evolved stack and leaves the 12000-DP peer unchanged. |
| Duration is for the turn                   | `duration: "forTheTurn"`                                                                                | Turn proof confirms the modifier expires after the controller's turn.                                                                                              |

##### Rules and peer checks

- BT1-105 is the same-set DP-changing peer, while BT1-104 is the nearby
  turn-long attack DP-modifier peer. This card correctly uses additive
  `ModifyDP` (not `SetBaseDP`) because its text says “gets -7000 DP”.
- The lifecycle test uses a real Upamon egg in `eggDeck`, then legal
  Upamon → Elecmon → Frigimon → LoaderLeomon evolution costs before a public
  move from breeding. No Digi-Egg is placed in deck or Security.
- The module registers only `registerIrCard("BT1-106", compiled)`, has full
  coverage and an empty residual list, and has no `registerCard` or
  `@ts-nocheck`. This Option has no Security clause.

##### Changed files

- `apps/api/src/cards/BT1/BT1-106.test.ts`: full catalog/IR assertions,
  non-Egg deck fixtures, and public stack lifecycle proof.
- This report.

##### Verification and score

Focused `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-106.test.ts --maxWorkers=1 --no-file-parallelism` passed
5/5. No typecheck, build, collection, or engine suite was run. Scoped
`oxfmt --check` and `git diff --check` passed. Delivery gates remain
unreleased.

| Column         | Score    | Reason                                                                             |
| -------------- | -------- | ---------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, DP boundary, duration, and stack rules checked.                      |
| IR trace       | 2        | Exact controller/kind/count, -7000 amount, and duration map exactly.               |
| Behaviour      | 2        | Positive, exact-one, 0-DP deletion, expiration, and no-Security paths are present. |
| Peer/stack     | 2        | DP peers and a public hatch → evolution → move stack are covered.                  |
| Delivery gates | 0        | Sole tester and broader gates pending.                                             |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                    |

### BT1-107 — Holy Wave

Score: 8/10. Main/Security recovery boundaries and peer proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-107.md` (2026-09-10):

Lane: BT1-105..108 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Yellow Option, play cost
6, rarity C, maximum 4, DP 0.

Printed clauses:

1. `[Main] Trigger <Recovery +1 (Deck)>. (Place the top card of your deck on top of your security stack.)`
2. `[Security] Activate this card's [Main] effect.`

The local KB query exposes Q977 (a security check continues into a card
recovered by this effect), Q1237 (the opponent's-turn removal trigger still
fires when the Security count is unchanged), and Q1249 (the same fact permits
the Tamer's memory effect). Comprehensive-rule searches cover Recovery
(§16-6), deck-to-Security placement, Security timing, and sequential security
checks.

##### Clause → IR → proof

| Clause                                                            | IR                                                                                                   | Static/behavioral proof                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recover one card from the top of your deck                        | Main `SecurityManipulation` uses `op: "addTop"`, `controller: "mine"`, `source: "deck"`, `amount: 1` | Main proof asserts the exact top card enters face-down Security and deck order is preserved; empty-deck proof resolves with zero recovered cards. |
| Security activates Main                                           | Security body is `{ kind: "ActivateMain" }` with `isSecurity: true`                                  | A real multi-check attack reveals Holy Wave, recovers the next card, continues the check into it, and records two `securityChecked` events.       |
| Recovery changes card presence even when stack count is unchanged | The same Main body is reused by Security activation                                                  | Q1237/Q1249 proof uses DanDevimon and Kari and asserts Kari suspends after one Security card is removed/recovered despite unchanged count.        |

##### Rules and peer checks

- BT1-102 is the nearby Security `ActivateMain` peer; BT1-103 and BT1-107
  provide same-set Security sequencing examples. `isSecurity: true` is
  explicit so the interpreter dispatches the body through SecuritySkill.
- No Digimon target, evolution requirement, inherited effect, or
  once-per-turn clause applies, so an evolution-stack lifecycle is not
  applicable. The real attack—not the supplemental direct timing seam—is the
  Security behavioral proof.
- All deck and Security fixtures use explicit non-Egg cards except the
  intentionally revealed Option itself. The module registers only
  `registerIrCard("BT1-107", compiled)`, has full coverage and an empty
  residual list, and has no `registerCard` or `@ts-nocheck`.

##### Changed files

- `apps/api/src/cards/BT1/BT1-107.ts`: export the compiled IR for exact audit
  assertions and retain canonical Security metadata.
- `apps/api/src/cards/BT1/BT1-107.test.ts`: full catalog/IR assertions and
  non-Egg deck/Security fixtures.
- This report.

##### Verification and score

Focused `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-107.test.ts --maxWorkers=1 --no-file-parallelism` passed
6/6. No typecheck, build, collection, or engine suite was run. Scoped
`oxfmt --check` and `git diff --check` passed. Delivery gates remain
unreleased.

| Column         | Score    | Reason                                                                                      |
| -------------- | -------- | ------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, Q977/Q1237/Q1249, Recovery and Security rules checked.                        |
| IR trace       | 2        | Exact top-deck source, amount, controller, Main reuse, and Security metadata map exactly.   |
| Behaviour      | 2        | Main, empty-deck, real multi-check Security, and unchanged-count trigger paths are present. |
| Peer/stack     | 2        | Security activation/recovery peers checked; no Digimon target or stack clause applies.      |
| Delivery gates | 0        | Sole tester and broader gates pending.                                                      |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                             |

### BT1-108 — Horn Buster

Score: 8/10. Security metadata red/green proof and public target lifecycle; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-108.md` (2026-09-10):

Lane: BT1-105..108 worker. Static-only review; focused Vitest, typecheck,
build, collection, and engine suites were not run pending the sole-tester
release.

##### Card and sources

Catalog (`packages/shared/src/cards/data/cards.json`): Green Option, play cost
1, rarity C, maximum 4, DP 0.

Printed clauses:

1. `[Main] 1 of your Digimon gets +3000 DP for the turn.`
2. `[Security] Suspend 1 of your opponent's Digimon. Then add this card its owner's hand.`

The local KB query has no BT1-108-specific Q&A. Comprehensive-rule searches
cover additive DP calculation (§1-3-7), suspension/card states, Security
effect timing, and ordered effect processing. The implementation review found
and corrected missing Security metadata: the Security body now carries
`isSecurity: true`.

##### Clause → IR → proof

| Clause                                                 | IR                                                                                                                                   | Static/behavioral proof                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exactly one of your Digimon gets +3000 DP for the turn | Main `ModifyDP` filters `controller: "mine"`, `kind: ["Digimon"]`, `count: 1`, `amount: 3000`, `duration: "forTheTurn"`              | Mixed-allied-target proof confirms one target changes and the other does not; public hatch → legal evolution → move proof confirms the moved stack receives 4000 → 7000 while the opponent remains 12000. |
| Security suspends one opposing Digimon                 | Security action 1 is `Suspend` with `controller: "opponent"`, `kind: ["Digimon"]`, `count: 1`, `isSecurity: true` on the effect body | A real attack into Security proves exactly one opposing Digimon suspends; a second peer remains unsuspended.                                                                                              |
| Then return this card to its owner's hand              | Security action 2 is ordered `AddToHandSelf`                                                                                         | Both direct and real-attack Security proofs assert the revealed Option reaches its owner's hand and leaves Security.                                                                                      |

##### Rules and peer checks

- BT1-098 and BT1-093 are nearby `AddToHandSelf` Security peers; BT1-105/106
  are the same-set DP-modifier peers. The action order is preserved exactly.
- The lifecycle test uses a real Upamon egg in `eggDeck`, then legal
  Upamon → Elecmon → Frigimon evolution costs before a public move from
  breeding. No Digi-Egg is placed in deck or Security.
- The module registers only `registerIrCard("BT1-108", compiled)`, has full
  coverage and an empty residual list, and has no `registerCard` or
  `@ts-nocheck`. The real attack supplies Security proof; the direct timing
  seam is supplemental only.

##### Changed files

- `apps/api/src/cards/BT1/BT1-108.ts`: mark the Security body with
  `isSecurity: true`.
- `apps/api/src/cards/BT1/BT1-108.test.ts`: full catalog/IR assertions,
  non-Egg deck fixtures, public stack lifecycle proof, and real-attack
  Security proof.
- This report.

##### Verification and score

Focused `pnpm --filter @aegis/api exec vitest run
src/cards/BT1/BT1-108.test.ts --maxWorkers=1 --no-file-parallelism` passed
5/5 after restoring `isSecurity: true`. Mutation proof removed only that
production property and produced the intended red result (4/5, exact IR
assertion failure); restoring it returned the same focused run to 5/5. No
typecheck, build, collection, or engine suite was run. Scoped `oxfmt --check`
and `git diff --check` passed. Delivery gates remain unreleased.

| Column         | Score    | Reason                                                                                            |
| -------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Catalog/rules  | 2        | Catalog text, DP/suspension/Security rules, and ordered processing checked.                       |
| IR trace       | 2        | Exact controller/kind/count, DP amount/duration, Security metadata, and action order map exactly. |
| Behaviour      | 2        | Main, exact-one, expiration, real-attack Security, and return-to-hand paths are present.          |
| Peer/stack     | 2        | DP/hand-return peers and a public hatch → evolution → move stack are covered.                     |
| Delivery gates | 0        | Sole tester and broader gates pending.                                                            |
| **Total**      | **8/10** | Static audit complete; execution gates pending.                                                   |

### BT1-109 — Smashed Potatoes

Score: 8/10. Q978-Q980/Q1736, public full green lifecycle and exact modifier consumption; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-109.md` (2026-09-10):

##### Printed contract and rulings

BT1-109 is a Green Option (play cost 2). Its Main effect reduces by 4 the
digivolution cost of the next one of the owner's Green level-5 Digimon that
digivolves into a level-6 Digimon during the turn. It has no Security effect.

The local card query returns Q978, Q979, Q980, and Q1736. Q978 requires cost
flooring at zero with no memory gain; Q979 excludes the breeding area; Q980
includes effect-driven digivolution; and Q1736 confirms an already activated
reduction is not negated by a later Option-use restriction.

##### Clause → IR → proof

| Clause                                                    | Direct IR                                                                                                                                                          | Focused proof                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Next eligible Green Lv.5 → Lv.6 digivolution              | Main `CostModifier`, `mode: reduce`, `costType: digivolve`, `amount: 4`, battle-area owner Digimon Lv.5 target, Green Lv.6 destination, `forTheTurn`, `once: true` | Hatch → legal Green breeding evolutions → `moveFromBreeding` → Option → free Lv.5→Lv.6 lifecycle; `Q978 floors...` |
| No breeding-area reduction (Q979)                         | `target.filter.zone: battleArea`                                                                                                                                   | `Q979 charges full cost in breeding...`                                                                            |
| Effect-driven route (Q980)                                | Same cost ledger predicate applies to digivolution effects                                                                                                         | `Q980 applies the reduction to an effect-driven...`                                                                |
| Resolved effect survives later Option restriction (Q1736) | One-shot modifier is installed at Option resolution                                                                                                                | `Q1736 keeps the resolved reduction...`                                                                            |
| No Security clause                                        | Only a Main effect is compiled                                                                                                                                     | `has no Security effect...`                                                                                        |

The focused file proves the complete public route with the legal BT1-007
Green Digi-Egg, BT1-068, BT1-072, BT1-075, and BT1-080 stack; all ordinary
deck/security fixtures are registered main-deck Digimon (BT1-009 through
BT1-014). It also proves the cost-floor boundary, effect-driven
digivolution, one-shot consumption, turn expiry, opposing Option restriction,
and Security trash behavior.

##### Static findings

The direct module and generated `effects.json` record are byte- and
semantically aligned for this card. The catalog's known OCR spelling
`digivoLv.e` is documentary only and does not alter the card's unambiguous
level/color meaning. The module has complete coverage and exactly one
`registerIrCard("BT1-109", compiled)` registration, with no legacy
registration or suppression. No production correction was needed.

Focused result: `vitest run src/cards/BT1/BT1-109.test.ts --maxWorkers 1
--pool forks` completed with `Test Files 1 passed; Tests 8
passed`. Scoped `oxfmt --check` passes for the assigned TypeScript files. No
typecheck, lint, collection, build, or mutation gate was run; the coordinator
must retain the 0/2 delivery-gate score until the remaining release evidence
is recorded.

##### Score

| Component          |    Score |
| ------------------ | -------: |
| Catalog / rules    |      2/2 |
| IR trace           |      2/2 |
| Behavioral proof   |      2/2 |
| Peer / stack proof |      2/2 |
| Delivery gates     |      0/2 |
| **Worker total**   | **8/10** |

### BT1-110 — Flower Cannon

Score: 8/10. exact Main/Security suspension boundaries and public Security flow; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-110.md` (2026-09-10):

##### Printed contract and ruling

BT1-110 is a Green Option (play cost 2). Its Main effect suspends one
opponent's Digimon. Its Security effect suspends all opposing Digimon without
`<Blocker>`.

The local card query returns Q981: a Digimon given `<Blocker>` by another
Option or effect is also excluded from the Security suspension.

##### Clause → IR → proof

| Clause                                      | Direct IR                                                                                       | Existing focused proof                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Main: suspend one opposing Digimon          | `Main` → `Suspend`, opponent Digimon target, `count: 1`                                         | `suspends one opposing Digimon`                     |
| Security: suspend all opposing non-Blockers | `Security` → `Suspend`, opponent Digimon target, `count: "all"`, `excludeKeywords: ["Blocker"]` | `suspends every opposing non-Blocker...`            |
| Effective Blocker boundary (Q981)           | Exclusion is evaluated on effective keywords, not only printed text                             | `does not suspend a Digimon that gained Blocker...` |
| Already suspended target                    | Suspend action is an observable no-op                                                           | `can use Main on an already suspended...`           |

The Security proof covers both a printed Blocker and an effect-granted
Blocker, while preserving suspension of an ordinary opposing Digimon. The
public Security-attack fixture uses registered main-deck Digimon and asserts
the revealed Option enters trash. There are no Digi-Egg, breeding, or
evolution-stack dependencies for this Option, so no additional stack is
applicable.

##### Static findings

The module has complete coverage and exactly one `registerIrCard("BT1-110", compiled)`
registration, with no legacy registration or suppression. The target count,
Security timing, and effective-keyword exclusion agree with the printed card,
Q981, and the focused assertions. The earlier BT2-047 target fixture was
replaced by registered inert BT1-009, and a public Security attack now proves
the Security clause without relying solely on injected timing. No production
correction was needed.

Focused result: `vitest run src/cards/BT1/BT1-110.test.ts --maxWorkers 1
--pool forks` completed with `Test Files 1 passed; Tests 5
passed`. Scoped `oxfmt --check` passes for the assigned TypeScript files. No
typecheck, lint, collection, or mutation gate was run; mutation evidence
remains coordinator-owned.

##### Score

| Component          |    Score |
| ------------------ | -------: |
| Catalog / rules    |      2/2 |
| IR trace           |      2/2 |
| Behavioral proof   |      2/2 |
| Peer / stack proof |      2/2 |
| Delivery gates     |      0/2 |
| **Worker total**   | **8/10** |

### BT1-111 — Giga Blaster

Score: 8/10. battle-area predicate correction with red/green proof and synced effects snapshot; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-111.md` (2026-09-10):

##### Printed contract and rulings

BT1-111 is a Green Option (play cost 3). Its Main effect chooses either one
opponent's Digimon, or two opponent Digimon with DP 5000 or less. Its Security
effect activates the same Main effect.

The local card query returns Q982 and Q983. Q982 forbids mixing the one-target
and two-target alternatives. Q983 confirms the one-target alternative may
choose a qualifying low-DP Digimon by itself.

##### Clause → IR → proof

| Clause                               | Direct IR                                                                                        | Focused proof                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| One-target alternative               | `Suspend` opponent Digimon, `count: 1`                                                           | `Q982 chooses only one mode...`            |
| Two-target alternative               | `Suspend` opponent Digimon with DP `lte 5000`, `count: 2`                                        | `suspends exactly two 5000-DP-or-less...`  |
| No mixing (Q982)                     | One-choice `Modal` containing the two complete alternatives                                      | `Q982 chooses only one mode...`            |
| Fewer than two low-DP targets (Q983) | `ConditionalBranch` exposes modal only at `opponentHas countMin: 2`; otherwise one-target action | `Q983 falls back...`                       |
| Security                             | Security trigger reuses the same mode action                                                     | `activates either Main mode from security` |

##### Defect found and fixed

The conditional gate originally counted low-DP opposing Digimon without a
zone. The suspend target itself defaults to battle area, so a low-DP Digimon
in breeding could incorrectly unlock the two-target mode when only one legal
battle-area target existed. The module now constrains the `opponentHas` filter
to `zone: "battleArea"`.

The focused test adds one low-DP breeding Digimon and one low-DP battle-area
Digimon, selects the two-target option by preference, and asserts that no mode
decision is offered and the battle-area target alone is suspended. Existing
Q982/Q983 and Security tests cover the remaining boundaries. No traits or
evolution requirements are printed, so no evolution stack is applicable.

The module has complete coverage and exactly one `registerIrCard("BT1-111", compiled)`
registration, with no legacy registration or suppression. The direct IR now
includes `zone: "battleArea"` on the low-DP condition and two-target filter.
That is an intentional semantic divergence from the currently committed
`effects.json` aggregate record, which predates this correction; generator
sync and mutation evidence are required before treating the aggregate as
reconciled.

##### Verification and deferred gates

Focused green result: `vitest run src/cards/BT1/BT1-111.test.ts --maxWorkers 1
--pool forks` completed with `Test Files 1 passed; Tests 6
passed` after restoring the zone gate.

Genuine mutation result: temporarily removing `zone: "battleArea"` from the
condition filter produced `Test Files 1 failed; Tests 5 passed; Tests 1
failed`. The exact failure was the breeding regression's IR assertion: at
`BT1-111.test.ts:132`, expected `condition.filter.zone` to equal
`"battleArea"`, but the reverted module exposed only the `dp`/`kind` filter.
The zone gate was restored and the focused run returned green. No shared
`effects.json` sync was performed; the coordinator must regenerate/check that
aggregate and record the snapshot evidence. No typecheck, lint, collection, or
build gate was run. Scoped `oxfmt --check` passes for the assigned TypeScript
files.

##### Score

| Component          |    Score |
| ------------------ | -------: |
| Catalog / rules    |      2/2 |
| IR trace           |      2/2 |
| Behavioral proof   |      2/2 |
| Peer / stack proof |      2/2 |
| Delivery gates     |      0/2 |
| **Worker total**   | **8/10** |

### BT1-112 — Dimension Scissor

Score: 8/10. Q984 watcher behavior, public full lifecycle and corrected real-turn phase flow; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-112.md` (2026-09-10):

##### Printed contract and rulings

BT1-112 is a Green Option (play cost 3). Its Main effect gives one of the
owner's Digimon: “When this Digimon deletes an opponent's Digimon in battle
and survives, unsuspend it.” Its Security effect adds this card to its
owner's hand.

The local card query returns Q984–Q987 and Q1263. Q984 permits repeated
unsuspensions after separate qualifying battles. Q985 excludes Security
Digimon battles. Q986 includes deleting a blocking Digimon. Q987 excludes a
different Digimon deleted during the battle. Q1263 excludes deletion before
battle begins.

##### Clause → IR → proof

| Clause                     | Direct IR                                                     | Focused proof                                                                                               |
| -------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Main target                | `GainTriggeredEffect` selects one owner Digimon               | `[Main] installs whenDeletesInBattle...`                                                                    |
| Granted trigger            | `gainedTrigger: "whenDeletesInBattle"`, duration `forTheTurn` | winning battle unsuspends the selected attacker                                                             |
| Exact source identity      | Granted `Unsuspend` uses `isSelfRef: true`                    | Q987 different-target deletion remains suspended                                                            |
| Repeated use               | No once-per-turn limit                                        | Q984 separate battles each unsuspend                                                                        |
| Battle/security boundaries | Trigger is battle-delete-specific                             | Q985 Security Digimon stays suspended; Q986 blocker deletion unsuspends; Q1263 pre-battle deletion does not |
| Security                   | Security → `AddToHandSelf`, marked Security                   | Security attack proof verifies instance leaves Security and enters owner hand                               |

The focused tests now cover both a battle-area level-5 BT1-075 → level-6
BT1-080 evolution after the Option resolves and a complete public
`hatchEgg` → legal BT1-068/BT1-072/BT1-075 breeding stack →
`moveFromBreeding` route. The new route correctly advances one real turn after
movement before playing the turn-limited Option, so its final attack is a legal
public action. Existing tests cover direct attack, repeated battles, blocker
interaction, Security Digimon, different-target deletion, pre-battle deletion,
and Security hand return. All deck fixtures use registered main-deck Digimon;
this card has no printed trait filter or alternate evolution requirement.

##### Static findings

The module has complete coverage and exactly one `registerIrCard("BT1-112", compiled)`
registration, with no legacy registration or suppression. The self-reference
and `forTheTurn` scope preserve the source permanent through evolution and
prevent unrelated deletion events from firing the effect. No production
correction was needed.

Focused result: `vitest run src/cards/BT1/BT1-112.test.ts --maxWorkers 1
--pool forks` completed with `Test Files 1 passed; Tests 10 passed`. The
public lifecycle test uses a real intervening turn after movement, then opens
the next authoritative Main controller through `advance.waitForMainPhase(0)`;
this avoids both summoning sickness and a stale manually assigned phase while
keeping the `forTheTurn` watcher active through the final battle. No typecheck,
lint, collection, build, or mutation gate was run. Scoped `oxfmt --check`
passes for the assigned TypeScript files; mutation evidence remains
coordinator-owned.

##### Score

| Component          |    Score |
| ------------------ | -------: |
| Catalog / rules    |      2/2 |
| IR trace           |      2/2 |
| Behavioral proof   |      2/2 |
| Peer / stack proof |      2/2 |
| Delivery gates     |      0/2 |
| **Worker total**   | **8/10** |

### BT1-113 — Forbidden Temptation

Score: 8/10. Q988/Q989 duration/evolution boundaries and Security duration red/green proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-113.md` (2026-09-10):

Lane: BT1-113..115 worker. Static-only delivery lane; Vitest, typecheck,
build, collection, and engine suites were not run under the critical-RAM
instruction.

##### Card and sources

The committed catalog identifies BT1-113 as the green Option Forbidden
Temptation, play cost 4, rarity C, maximum 4 copies, with no evolution or
inherited text. Its clauses are:

- `[Main] Until the end of your opponent's next turn， 1 of your opponent's
Digimon can't attack or block.`
- `[Security] Your opponent's Digimon don't unsuspend during their next
unsuspend phase.`

`node tools/kb/query.mjs card BT1-113` returns Q988 and Q989. Q988 says the
attack/block restriction remains after the selected Digimon digivolves; Q989
limits the Security restriction to Digimon, not Tamers. The relevant local
rules are the target-selection, continuous-duration, Security timing, and
unsuspend-phase procedures in `data/kb/rules/`.

##### Clause → IR → proof

| Clause                                                                                       | Direct IR                                                                                                                               | Focused proof                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One opposing Digimon cannot attack through the opponent's next turn                          | Main `Restrict` targets opponent Digimon, `count: 1`, `restriction: "attack"`, `duration: "untilOpponentTurnEnd"`                       | Public Main play and a turn-loop test assert the chosen target remains restricted during the opponent's Main and is unrestricted on the next own Main.                                                                                     |
| The same Digimon cannot block                                                                | A second Main `Restrict` has `sameTarget: true`, `restriction: "block"`, and the same duration                                          | Public attack/block-window proof rejects the selected blocker and accepts a distinct opposing blocker; the duration test checks expiry with the attack lock.                                                                               |
| Security prevents every opposing Digimon from unsuspending during their next unsuspend phase | Security `Restrict` targets opponent Digimon, `count: "all"`, `restriction: "unsuspend"`, `duration: "untilOpponentNextUnsuspendPhase"` | A real attack reveals BT1-113 from Security and proves every opposing Digimon is restricted. A production timing-seam test proves suspended Digimon stay suspended through the next unsuspend phase while opposing Tamers remain eligible. |

##### Static finding and production correction

The Main implementation was faithful. The Security action previously used
`untilOpponentTurnEnd`; that duration expires at the end of the current
opponent turn, before the opponent's next unsuspend phase when the card is
revealed during their attack. The assigned module now uses the real
`untilOpponentNextUnsuspendPhase` duration. This is a card-only correction;
the coordinator must resynchronize the shared `effects.json` record and run
mutation/runtime proof before promoting it.

`BT1-113.ts` has exactly one `registerIrCard("BT1-113", compiled)` call,
`coverage: "full"`, and `residual: []`; it has no legacy `registerCard` or
`@ts-nocheck`. No Digi-Egg or numeric Security shorthand is used.

##### Peer and lifecycle checks

- BT1-100 and BT1-105 are nearby duration/restriction Options; the card's
  one-target `sameTarget` pairing and target controller scope are explicit.
- BT1-110 supplies a same-set all-opposing-Digimon Security targeting peer;
  BT1-113's Security filter intentionally excludes Tamers per Q989.
- Q988 is exercised after the selected Digimon evolves, preserving the same
  permanent identity and both restrictions.
- No evolution route or inherited effect applies to this Option.

##### Changed files

- `apps/api/src/cards/BT1/BT1-113.ts`: corrected Security duration.
- `apps/api/src/cards/BT1/BT1-113.test.ts`: catalog/IR assertions, public
  duration and Security attack proofs, Q988/Q989 boundaries, and strict
  target checks.
- This report.

##### Verification and score

Focused Vitest passed 8/8:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-113.test.ts
--maxWorkers=1 --no-file-parallelism`

Causal reverted-red/restored-green proof for the production correction:

- Temporarily changing only the Security duration back to
  `untilOpponentTurnEnd` produced **5 passed / 3 failed**. The exact IR
  assertion failed, Main duration expiry failed, and the next-unsuspend
  lifecycle failed (the targets unsuspended).
- Restoring `untilOpponentNextUnsuspendPhase` returned the same focused suite
  to **8 passed / 0 failed**.

`pnpm exec oxfmt --check` passed for the four assigned source/test files, and
`git diff --check` passed. Typecheck, build, collection, and engine suites were
not run. The module change intentionally leaves the coordinator-owned
`packages/shared/src/effects/effects.json` record stale until set
synchronization.

| Column             |    Score | Reason                                                                                                                     |
| ------------------ | -------: | -------------------------------------------------------------------------------------------------------------------------- |
| Catalog / rules    |      2/2 | Catalog fields, Q988/Q989, target scope, and Security/unsuspend timing checked.                                            |
| IR trace           |      2/2 | Both Main restrictions and the corrected Security duration map exactly.                                                    |
| Behavioural proof  |      2/2 | Public Main/Security flows, target boundaries, Q988/Q989, duration endpoints, and causal red/green proof passed.           |
| Peer / stack proof |      2/2 | Restriction peers and the legal post-resolution evolution boundary are checked; no evolution applies to the Option itself. |
| Delivery gates     |      0/2 | Set sync, typecheck/build, collection/engine gates, and coordinator closeout remain pending.                               |
| **Worker total**   | **8/10** | Static audit complete; release evidence is pending.                                                                        |

### BT1-114 — MetalGreymon

Score: 8/10. Q942/Q990 clauses, public legal/illegal evolution and inherited proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-114.md` (2026-09-10):

Lane: BT1-113..115 worker. Static-only delivery lane; Vitest, typecheck,
build, collection, and engine suites were not run under the critical-RAM
instruction.

##### Card and sources

The committed catalog identifies BT1-114 as the red level-5 Digimon
MetalGreymon (Ultimate, Virus, Cyborg), play cost 8, 9000 DP, with a red
level-4 evolution requirement costing 3 memory. Its complete text is:

- `＜Security Attack +2＞ (This Digimon checks 2 additional security cards.)`
- `[When Attacking] Lose 5 memory.`
- Inherited `[Your Turn] This Digimon gets +3000 DP.`

`node tools/kb/query.mjs card BT1-114` returns Q942 and Q990. Q942 confirms
name matching for MetalGreymon peers; Q990 confirms the Digimon can attack
with less than 5 memory and completes its attack before the turn changes.
The local rules cover Security Attack count, When Attacking timing, memory
loss, inherited effects, and ordinary red evolution.

##### Clause → IR → proof

| Clause                        | Direct IR                                                                    | Focused proof                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security Attack +2            | `Static` keyword `{ keyword: "SecurityAttack", amount: 2 }`                  | Keyword and exact amount are asserted on an in-play BT1-114.                                                                                                           |
| When Attacking, lose 5 memory | `WhenAttacking` → `GainMemory` amount `-5`                                   | A public attack with memory 2 completes three Security checks, ends at memory -3, and leaves exactly one Security card. This covers Q990's turn-continuation boundary. |
| Inherited Your Turn +3000 DP  | Inherited `YourTurn` → self `ModifyDP` amount 3000, `duration: "forTheTurn"` | A host carrying BT1-114 is 14000 DP on its controller's turn and returns to base DP on the opponent's turn.                                                            |

##### Static findings

The module is residual-free and exactly matches the catalog text and direct
IR. It has one `registerIrCard("BT1-114", compiled)` registration, no legacy
`registerCard`, and no `@ts-nocheck`. The colocated tests now assert catalog
identity and exact IR, retain the Q990 public attack, verify inherited host
scope, exercise a legal red level-4 → BT1-114 → WarGreymon stack with exact
3-memory payments and evolution draws, and reject a blue level-4 source
without moving the card or memory. No production correction was needed.

##### Peer and lifecycle checks

- BT1-021 and BT1-025 are the adjacent red MetalGreymon/WarGreymon evolution
  peers used to prove a real source transition and inherited host effect.
- BT1-039 and BT1-049 provide comparable Security Attack and inherited DP
  keyword/turn-scope shapes.
- Q942's name-based peer boundary was checked against ST1-09 and BT1-021;
  this card has no name-based effect of its own.

No Digi-Egg is placed in a main deck or Security, and no numeric Security
shorthand is used in fixtures.

##### Changed files

- `apps/api/src/cards/BT1/BT1-114.test.ts`: catalog/IR assertions, public
  evolution-stack proof, and invalid-source negative.
- This report.

##### Verification and score

Focused Vitest passed 6/6:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-114.test.ts
--maxWorkers=1 --no-file-parallelism`

`pnpm exec oxfmt --check` passed for assigned files, and `git diff --check`
passed. Typecheck, build, collection, engine, and mutation gates remain
coordinator/release work.

| Column             |    Score | Reason                                                                                                                   |
| ------------------ | -------: | ------------------------------------------------------------------------------------------------------------------------ |
| Catalog / rules    |      2/2 | All catalog fields, Q942/Q990, and applicable timing/evolution rules checked.                                            |
| IR trace           |      2/2 | Keyword, memory loss, inherited flag, target, amount, and duration map exactly.                                          |
| Behavioural proof  |      2/2 | Public attack, exact Security count/memory endpoint, and turn-scoped inherited DP are represented; execution is pending. |
| Peer / stack proof |      2/2 | Legal red stack, draw/cost/source identity, invalid-color negative, and nearby peers are covered.                        |
| Delivery gates     |      0/2 | Focused execution, mutation proof, and broader gates remain pending.                                                     |
| **Worker total**   | **8/10** | Static audit complete; release evidence is pending.                                                                      |

### BT1-115 — Veedramon

Score: 8/10. Q991/Q992 OPT/reset and public inherited evolution-stack proof; focused green; collection/typecheck/style/diff gates green. Source: `docs/audits/BT1-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT1-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT1-reaudit/BT1-115.md` (2026-09-10):

Lane: BT1-113..115 worker. Static-only delivery lane; Vitest, typecheck,
build, collection, and engine suites were not run under the critical-RAM
instruction.

##### Card and sources

The committed catalog identifies BT1-115 as the blue level-4 Digimon
Veedramon (Champion, Vaccine, Mythical Dragon), play cost 6, 6000 DP, with a
blue level-3 evolution requirement costing 3 memory. Its complete text is:

- `[When Attacking][Once Per Turn] If you have a Tamer in play， unsuspend this
Digimon.`
- Inherited `[All Turns] While you have a blue Tamer in play， this Digimon
gets +1000 DP.`

`node tools/kb/query.mjs card BT1-115` returns Q991 and Q992. Q991 confirms
that any Tamer color satisfies the attack trigger; Q992 confirms that two or
more blue Tamers still grant only +1000 DP. Local rules cover once-per-turn
reset, inherited effects, unsuspend timing, and legal blue evolution.

##### Clause → IR → proof

| Clause                                                                     | Direct IR                                                                                        | Focused proof                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Once per turn while attacking, if you have a Tamer, unsuspend this Digimon | `WhenAttacking`, `frequency: "OncePerTurn"` → self `Unsuspend`, gated by `youHave` any own Tamer | A public attack with a non-blue Tamer unsuspends Veedramon; a second same-turn attack remains suspended, and a next-own-turn flow proves reset. A no-Tamer attack remains suspended.        |
| Inherited All Turns +1000 while you have a blue Tamer                      | Inherited `AllTurns` → self `ModifyDP` +1000, `duration: "forTheTurn"`, gated by own blue Tamer  | Q992's two-blue-Tamer fixture observes exactly +1000 in both turn perspectives. A public blue evolution stack carries the inherited source to WereGarurumon and observes +1000 on the host. |

##### Static findings

The module exactly matches the catalog and has full coverage with no residual.
It uses only `registerIrCard("BT1-115", compiled)`, with no legacy
`registerCard` and no `@ts-nocheck`. The attack trigger's Tamer condition has
no color restriction, while the inherited condition requires blue. The
Once Per Turn identity is attached to the When Attacking effect and the tests
cover same-turn refusal and next-own-turn reset. No production correction was
needed.

##### Peer and lifecycle checks

- BT1-003 and BT1-039 are nearby inherited Once Per Turn attack/unsuspend
  peers; the test checks the same-turn and next-turn boundary.
- BT1-040 and BT1-086 provide the legal blue evolution/blue Tamer comparison.
- A real blue level-3 → BT1-115 → WereGarurumon stack proves 3-memory costs,
  evolution draws, source identity, and inherited host scope. The invalid
  red-source negative proves the printed blue requirement.

No Digi-Egg is placed in a main deck or Security, and no numeric Security
shorthand is used in fixtures.

##### Changed files

- `apps/api/src/cards/BT1/BT1-115.test.ts`: catalog/IR assertions, natural
  Once Per Turn reset proof, legal/illegal evolution-stack cases, and exact
  Q991/Q992 boundaries.
- This report.

##### Verification and score

Focused Vitest passed 7/7:

`pnpm --filter @aegis/api exec vitest run src/cards/BT1/BT1-115.test.ts
--maxWorkers=1 --no-file-parallelism`

`pnpm exec oxfmt --check` passed for assigned files, and `git diff --check`
passed. Typecheck, build, collection, engine, and mutation gates remain
coordinator/release work.

| Column             |    Score | Reason                                                                                                                          |
| ------------------ | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| Catalog / rules    |      2/2 | All catalog fields, Q991/Q992, trigger, inherited, and reset rules checked.                                                     |
| IR trace           |      2/2 | Trigger, once-per-turn identity, Tamer color boundaries, self scope, amount, and duration map exactly.                          |
| Behavioural proof  |      2/2 | Positive/negative Tamer paths, Q992 exact amount, same-turn refusal, and next-turn reset are represented; execution is pending. |
| Peer / stack proof |      2/2 | Legal blue stack, costs/draws/source identity, invalid-source negative, and nearby peers are covered.                           |
| Delivery gates     |      0/2 | Focused execution, mutation proof, and broader gates remain pending.                                                            |
| **Worker total**   | **8/10** | Static audit complete; release evidence is pending.                                                                             |

## Mechanisms

No `*-MECHANISM.md` file was ever written for BT1. `docs/audits/BT1-reaudit/REVIEW-NOTES.md` recorded "Open engine seams: none". The re-audit changed no engine seam; the only production corrections were inside card modules (for example the BT1-015 duration correction from `forTheTurn` to `permanent`, the BT1-111 battle-area-only predicate, and the BT1-113 Security duration correction), each proved by a reverted-red and restored-green run.

## Knowledge base index

From `docs/audits/BT1-reaudit/KB-INDEX.md` (2026-09-10).

Aggregation is complete for all 115 card reports. Each report records the complete result of `node tools/kb/query.mjs card BT1-NNN`, maps every applicable Q&A to IR or behavioral proof, and states explicitly when no local Q&A is indexed.

- Reports indexed: 115/115.
- Q&A references recorded across reports: 305 occurrences before per-report deduplication.
- First covered ruling: BT1-001 Q865/Q866.
- Last covered ruling: BT1-115 Q991/Q992.
- Cards without an indexed local Q&A retain explicit rules, catalog, and peer evidence in their card sections above.

## Open items

- Score contradiction inside the winning source. `docs/audits/BT1-REAUDIT-LEDGER.md` (2026-09-10) opens with "Current aggregate: 1150/1150; 115/115 cards accepted at 10/10" and `docs/audits/BT1-reaudit/RUN.md` (2026-09-10) ends with "The ledger is recalculated to 1150/1150 with 115/115 cards at 10/10", but all 115 table rows in that same ledger still carry 0 gate points and a 8/10 total. The rows were never rewritten after the gates passed. Card sections above quote the row verbatim. Someone with the run evidence should confirm the intended 10/10 and correct the rows here.
- Status contradiction between passes. `docs/audits/BT1-AUDIT.md` (2026-09-02) says "static pass complete; execution gates deferred" while `docs/audits/BT1-STATIC-AUDIT.md` of the same date says "complete — 115/115 cards verified at 10/10". The static audit was the later, canonical file of that pair, and both are superseded by the 2026-09-10 re-audit.
- Process incidents in the re-audit are recorded but not remediated in code: three isolation incidents in which Luna worker lanes wrote to the main checkout instead of the dedicated worktree. Every attributable path was transplanted and main was restored clean, but the guard that failed was never fixed.
- Catalog identity is a blob hash in every source, not a commit. `catalog_commit` stays `unknown` until a run records one.

## History

- `docs/audits/BT1-AUDIT.md` — last in `6d9ae53b0`, 2026-09-02. First static card-by-card pass, self-marked archival, with execution gates deferred.
- `docs/audits/BT1-STATIC-AUDIT.md` — last in `6d9ae53b0`, 2026-09-02. Static closeout ledger claiming 115/115 at 10/10; its Executed gates section is copied above.
- `docs/audits/BT1-REAUDIT-LEDGER.md` — last in `8b2a0429b`, 2026-09-10. Independent evidence ledger, 115 rows; the row scores and status text are merged into the card ledger above.
- `docs/audits/BT1-reaudit/` — last in `8b2a0429b`, 2026-09-10. 115 per-card reports merged into the card ledger, plus `RUN.md` (merged into Gates), `KB-INDEX.md` (merged above), `REVIEW-NOTES.md` (merged into Mechanisms), and `WORKER-BRIEF.md` (worker instructions, not evidence).
- `internal-docs/audits/BT1/` — last in `8b2a0429b`, 2026-09-10. 12 Luna range reports (`BT1-001-010.md` … `BT1-111-115.md`) carrying the 2026-09-02 static-only clause evidence. Superseded per card by the 2026-09-10 reports and dropped.
- No `apps/api/src/cards/BT1/AUDIT.md` existed. No logs, PNG, or JSON evidence existed for BT1.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT1: PR #4580; commit `d95f1c9d4`.
