---
set: BT2
cards: 112
status: verified
verified_at: 2026-09-10
catalog_commit: unknown
evidence_commit: eabe99351
---

# BT2 audit

## Status

All 112 BT2 production modules are audited and the 2026-09-10 re-audit awarded delivery gates to every row: 1120/1120, 112/112 cards at 10/10. The exact BT2 collection passed 128 files and 622 tests, the engine mechanism suites passed 136 files and 2062 tests, `pnpm typecheck` passed shared, web, and API, and lint, format, effects sync, and `git diff --check` were clean. The 2026-09-10 re-audit (`docs/audits/BT2-REAUDIT-LEDGER.md` and `docs/audits/BT2-reaudit/`) is the winning source; the 2026-09-02 static pass and the archival range reports under `internal-docs/audits/BT2/` are superseded. Two files inside the winning directory were never updated after the run finished and still describe a run that has not started; they are listed under Open items. No source recorded a catalog commit, only the blob `efbecc002fb9000789123e2f91f201466e1e5b0a`, so `catalog_commit` is `unknown`.

## Gates

### 2026-09-10 re-audit closeout (winning source)

From `docs/audits/BT2-reaudit/RUN.md`. All Vitest commands used `--maxWorkers=1 --no-file-parallelism` after separate process and memory gates. Base commit `8b2a0429b7a317daf4cf9d802b075999392ffe74` (cumulative BT1 completion).

- Effects sync and check: 112 records synchronized; zero semantic changes against the cumulative BT1 base; zero changes outside BT2.
- Exact BT2 collection: 128 of 128 files and 622 of 622 tests passed.
- Engine mechanism suites: 136 of 136 files and 2062 of 2062 tests passed. The expected logged unsupported AD1-002 legacy payload was exercised by its passing error-path test and did not fail the suite.
- Typecheck: full `pnpm typecheck` passed shared build/typecheck, web, and API. A post-format BT2-025/026 focused rerun passed 2 files and 9 tests.
- Lint and format: Oxlint passed all 40 changed TypeScript files. Oxfmt initially flagged BT2-025/026 only; both were formatted and the final Oxfmt check passed all 40. `git diff --check` passed.
- Smell gates: zero `@ts-nocheck` and zero `registerCard(` in BT2; every executable module uses compiled IR registration. The ledger has 112 rows and the report directory has 112 of 112 card files.
- Delivery: the card and test implementation commit `d90f92e93` was created atomically and pushed to `origin/audit-bt2-luna-20260910`; the four attributable dependency symlinks were removed from the dedicated worktree before staging.
- Discarded run, recorded so it is not mistaken for evidence: the first `pnpm typecheck` attempt, where web could not resolve Node/Vite types because the dedicated worktree lacked `apps/web/node_modules`.

### 2026-09-02 static pass (superseded)

From `docs/audits/BT2-STATIC-AUDIT.md`. All commands used one fork, disabled file parallelism, and explicit timeouts.

- Full BT2 collection: 128 files, 577 tests passed.
- API mechanism suites: 8 files, 246 tests passed across IR registration, exact-name matching, digivolution legality and cost modification, leave prevention, token play, and continuous/static effects.
- Shared package: 7 files and 132 tests passed. One unrelated `EX11-026` assertion failed because `main` expected an alternate route that its own `data.ts` override removes.
- Shared build passed. API typecheck reported no BT2 error; its remaining failures are the repository baseline in `digivolutionStackSync.test.ts` and `syncedArrayInsert.test.ts`.
- Tooling tests: 18 tests passed with concurrency 1.
- Scoped effect check: 112 records already synchronized; 48 semantic changes plus two byte-only changes (`BT2-034`, `BT2-039`) inside BT2, zero changes outside BT2.
- Full-repository lint and scoped formatting completed without an audit-scope finding; `git diff --check` passed.

## Card ledger

### BT2-001 — Gigimon

Score: 10/10. Focused 6/6; legal hatch/evolve/move lifecycle and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-001.md` (2026-09-10):

##### Catalog and rules evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, card `BT2-001`.
- Printed identity: red Digi-Egg, Level 2, In-Training/Lesser, DP 0, deck limit 4.
- Printed inherited clause: `[Your Turn] While there are 5 or more cards in your opponent's trash, this Digimon gets +1000 DP.`
- Knowledge base query: `node tools/kb/query.mjs card BT2-001` returned no dedicated Q&A; the clause is unambiguous against the catalog and comprehensive-rules timing model.

##### Implementation mapping

`apps/api/src/cards/BT2/BT2-001.ts` is compiled IR with `coverage: "full"`, `residual: []`, and one inherited `YourTurn` `Aura`. The aura targets the self-referenced host, applies `modifyDP: +1000`, and gates on the opponent trash count `gte 5`. Registration is exclusively `registerIrCard("BT2-001", compiled)`; there is no legacy duplicate registration or `@ts-nocheck`.

##### Behavioral proof added

- Catalog and exact-IR assertions in `BT2-001.test.ts`.
- Existing threshold boundary and owner-turn negative cases retained.
- Added real turn-loop public lifecycle: hatch `BT2-001` from the Digi-Egg deck, legally digivolve to `BT2-009`, then move from breeding; the stack remains intact and the aura applies only after the move.
- Added peer isolation: a matching host is buffed while an otherwise identical peer without Gigimon is not.
- Fixtures keep Digi-Egg cards only in the Digi-Egg deck and use Digimon cards for regular deck/trash zones.

##### Validation status

Coordinator rerun: 6/6 focused tests passed with `--maxWorkers=1 --no-file-parallelism`. Scoped registration, suppression, fixture, formatting, lint, and diff checks passed. Collection/typecheck gates passed at closeout.

### BT2-002 — DemiVeemon

Score: 10/10. Focused 8/8; legal lifecycle, peer isolation, OPT turn reset. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-002.md` (2026-09-10):

##### Catalog and rules evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, card `BT2-002`.
- Printed identity: blue Digi-Egg, Level 2, In-Training/Baby Dragon, DP 0, deck limit 4.
- Printed inherited clause: `[Your Turn][Once Per Turn] When this Digimon becomes unsuspended during your main phase, it gets +1000 DP for the turn.`
- Knowledge base query: `node tools/kb/query.mjs card BT2-002` records Q993 (2024-03-28): an effect that unsuspends an already-unsuspended Digimon is not a real unsuspend and does not activate this inherited effect.

##### Implementation mapping

`apps/api/src/cards/BT2/BT2-002.ts` is compiled IR with `coverage: "full"`, `residual: []`, and one inherited `YourTurn` effect marked `OncePerTurn`. Its `whenUnsuspended` sub-trigger is source-filtered to self, gated to `Phase.Main`, and applies `ModifyDP +1000` with `forTheTurn` duration. Registration is exclusively `registerIrCard("BT2-002", compiled)`; there is no legacy duplicate registration or `@ts-nocheck`.

##### Behavioral proof added

- Catalog and exact-IR assertions in `BT2-002.test.ts`.
- Existing positive, Q993 already-active negative, phase negative, and opponent-turn negative cases retained.
- Added real turn-loop public lifecycle: hatch `BT2-002`, legally digivolve to `BT2-022` (with its printed Level 2 blue requirement), move from breeding, and trigger only when the moved host is genuinely unsuspended; a peer without DemiVeemon remains unchanged.
- Added a complete public-turn reset case proving the once-per-turn trigger is available again on the owner's next turn.
- Fixtures keep Digi-Egg cards only in the Digi-Egg deck and use Digimon cards for regular deck zones.

##### Validation status

Coordinator rerun: 8/8 focused tests passed with `--maxWorkers=1 --no-file-parallelism`. Scoped registration, suppression, fixture, formatting, lint, and diff checks passed. Collection/typecheck gates passed at closeout.

### BT2-003 — Nyaromon

Score: 10/10. Focused 6/6; legal lifecycle, suspended peer/stack isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-003.md` (2026-09-10):

##### Catalog and rules evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, card `BT2-003`.
- Printed identity: yellow Digi-Egg, Level 2, In-Training/Lesser, DP 0, deck limit 4.
- Printed inherited clause: `[Opponent's Turn] While this Digimon is suspended, all of your Security Digimon get +1000 DP.`
- Knowledge base query: `node tools/kb/query.mjs card BT2-003` returned no dedicated Q&A; the clause is unambiguous against the catalog and comprehensive-rules timing model.

##### Implementation mapping

`apps/api/src/cards/BT2/BT2-003.ts` is compiled IR with `coverage: "full"`, `residual: []`, and one inherited `OpponentsTurn` `Aura`. The aura self-references the host, applies `modifySecurityDP: +1000`, and is continuously gated by `selfIsSuspended`. Registration is exclusively `registerIrCard("BT2-003", compiled)`; there is no legacy duplicate registration or `@ts-nocheck`.

##### Behavioral proof added

- Catalog and exact-IR assertions in `BT2-003.test.ts`.
- Existing owner/opponent-turn, suspension boundary, owner-security-only, and two-copy stacking cases retained; the stacking fixture now includes a suspended peer without Nyaromon to prove no false contribution.
- Added real turn-loop public lifecycle: hatch `BT2-003`, legally digivolve to `BT2-034`, move from breeding, suspend the moved host, and verify the aura in the opponent's turn against an actual Digimon security card.
- Fixtures keep Digi-Egg cards only in the Digi-Egg deck and avoid numeric security shorthand.

##### Validation status

Coordinator rerun: 6/6 focused tests passed with `--maxWorkers=1 --no-file-parallelism`. Scoped registration, suppression, fixture, formatting, lint, and diff checks passed. Collection/typecheck gates passed at closeout.

### BT2-004 — Argomon

Score: 10/10. Focused 6/6; legal lifecycle and timing negatives. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-004.md` (2026-09-10):

##### Catalog and rules evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, card `BT2-004`.
- Printed identity: green Digi-Egg, Level 2, In-Training/Mutant, DP 0, deck limit 4.
- Printed inherited clause: `[Your Turn] When this Digimon becomes unsuspended during your unsuspend phase, gain 1 memory.`
- Knowledge base query: `node tools/kb/query.mjs card BT2-004` records Q994 (2024-03-28): an already-unsuspended Digimon does not count as becoming unsuspended during the unsuspend phase.

##### Implementation mapping

`apps/api/src/cards/BT2/BT2-004.ts` is compiled IR with `coverage: "full"`, `residual: []`, and one inherited `YourTurn` effect. Its `whenUnsuspended` sub-trigger is source-filtered to self, gated to `Phase.Active` (the unsuspend phase), and gains 1 memory. Registration is exclusively `registerIrCard("BT2-004", compiled)`; there is no legacy duplicate registration or `@ts-nocheck`.

##### Behavioral proof added

- Catalog and exact-IR assertions in `BT2-004.test.ts`.
- Existing genuine-unsuspend positive case and Q994, main-phase, and opponent-active-phase negative cases retained.
- Added real turn-loop public lifecycle: hatch `BT2-004`, legally digivolve to `BT2-043`, then move from breeding; the inherited stack source remains attached and no out-of-window memory gain occurs during the move/main window.
- Fixtures keep Digi-Egg cards only in the Digi-Egg deck and use Digimon cards for regular deck zones.

##### Validation status

Coordinator rerun: 6/6 focused tests passed with `--maxWorkers=1 --no-file-parallelism`. Scoped registration, suppression, fixture, formatting, lint, and diff checks passed. Collection/typecheck gates passed at closeout.

### BT2-005 — Kapurimon

Score: 10/10. Focused 5/5; legal two-step evolution/move and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-005.md` (2026-09-10):

##### Contract

Catalog entry `BT2-005` identifies Kapurimon as a Black Lv.2 Digi-Egg (In-Training,
Lesser), DP 0, play cost —, with no evolution cost, no main or Security text,
and a four-copy deck limit. Its only printed clause is:

> [Your Turn] While this Digimon has ＜Reboot＞, it gets +1000 DP.

`node tools/kb/query.mjs card BT2-005` reports no Q&A, ruling, errata, or
restriction entry. No unresolved card-level ambiguity was found.

##### Clause → IR mapping

| Printed clause                                       | Implementation                                       |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Inherited effect                                     | `effects[0].isInherited: true`                       |
| `[Your Turn]`                                        | `trigger: "YourTurn"`                                |
| This Digimon (the host carrying this inherited card) | `Aura.target.filter.isSelfRef: true`, `isSelf: true` |
| While the host has ＜Reboot＞                        | `while.kind: "selfHasKeyword"`, `keyword: "Reboot"`  |
| Gets +1000 DP                                        | `effect.kind: "modifyDP"`, `amount: 1000`            |

`coverage: "full"` and `residual: []` are present. The module registers only
through `registerIrCard("BT2-005", compiled)`; it has no legacy `registerCard`
and no `@ts-nocheck`.

##### Behavioral proof

The colocated test covers the positive direct Reboot host (`BT2-065`), a
non-Reboot host, the opponent-turn boundary, and host-only targeting. Its
public lifecycle hatches `BT2-005`, digivolves through legal Black
`BT20-047` (Lv.3) and `BT2-058` (Lv.4), cycles turns, and moves from breeding.
It asserts the intermediate inherited-Reboot boundary while `BT20-047` is
topmost, then asserts the egg/source stack and the resulting +1000 DP after
`BT2-058` becomes topmost.

##### Validation and disposition

No implementation defect or engine seam was identified. Direct, negative,
turn-boundary, host-only, and public evolution-stack validation is green.

Commands run:

```text
memory_pressure -Q
  -> System-wide memory free percentage: 67%
pnpm --filter @aegis/api exec vitest run src/cards/BT2/BT2-005.test.ts --maxWorkers=1 --no-file-parallelism --pool=forks --reporter=dot
  -> Test Files 1 passed; Tests 5 passed
```

Typecheck, build, collection tests, lint, broader format checks, and git checks
were not run because this lane is limited to the BT2-005 test and report;
`oxfmt --check` passed on the colocated test.

Provisional score: Catalog/KB 2/2, IR trace 2/2, behavior 2/2, peer/stack 2/2,
validation 1/2 (focused proof green; broader gates held) = 9/10.

### BT2-006 — Tsumemon

Score: 10/10. Focused 6/6; legal lifecycle and Q995 peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-006.md` (2026-09-10):

##### Contract

Catalog entry `BT2-006` identifies Tsumemon as a Black Lv.2 Digi-Egg
(In-Training, Unidentified), DP 0, play cost —, with no evolution cost, no main
or Security text, and a four-copy deck limit. Its only printed clause is:

> [Your Turn] While you have another Digimon in play with the same name as this
> Digimon, this Digimon gets +2000 DP.

`node tools/kb/query.mjs card BT2-006` reports Q995 (2024-03-28). Q995 confirms
that “same name as this Digimon” means the name of the Digimon this card
digivolves into, not necessarily the printed name Tsumemon.

##### Clause → IR mapping

| Printed clause                      | Implementation                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Inherited effect                    | `effects[0].isInherited: true`                                                                                               |
| `[Your Turn]`                       | `trigger: "YourTurn"`                                                                                                        |
| Another Digimon in your battle area | `while.kind: "youHave"` with `zone: "battleArea"`, `controllerDefault: "mine"`, `kind: ["Digimon"]`, and `excludeSelf: true` |
| Same name as the evolved host       | `isSameName: true` in the `youHave` filter (the Q995-sensitive comparison)                                                   |
| Gets +2000 DP                       | `effect.kind: "modifyDP"`, `amount: 2000`                                                                                    |

`coverage: "full"` and `residual: []` are present. The module registers only
through `registerIrCard("BT2-006", compiled)`; it has no legacy `registerCard`
and no `@ts-nocheck`.

##### Behavioral proof and validation

The focused suite covers Q995 boundaries and a legal public hatch of BT2-006, digivolution to registered BT2-055, turn cycling, movement from breeding with the source retained, and host/peer isolation. Coordinator rerun: 6/6 passed; the exact 005–008 batch passed 4 files/20 tests with one worker and file parallelism disabled. Catalog/KB, IR, behavior, and peer/stack columns are 2/2; delivery gates passed (10/10).

### BT2-007 — Pagumon

Score: 10/10. Focused 3/3; legal lifecycle and post-move attack behavior. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-007.md` (2026-09-10):

##### Contract

Catalog entry `BT2-007` identifies Pagumon as a Purple Lv.2 Digi-Egg
(In-Training, Lesser), DP 0, play cost —, with no evolution cost, no main or
Security text, and a four-copy deck limit. Its only printed clause is:

> [When Attacking] Trash the top card of your deck.

`node tools/kb/query.mjs card BT2-007` reports no Q&A, ruling, errata, or
restriction entry. No unresolved card-level ambiguity was found.

##### Clause → IR mapping

| Printed clause        | Implementation                                                                        |
| --------------------- | ------------------------------------------------------------------------------------- |
| Inherited effect      | `effects[0].isInherited: true`                                                        |
| When attacking        | `trigger: "WhenAttacking"`                                                            |
| Your deck             | `Trash.target.filter.controller: "mine"`, `zone: "deck"`                              |
| Top card, exactly one | `Trash.target.count: 1`; the interpreter’s deck-trash selection uses the top boundary |

`coverage: "full"` and `residual: []` are present. The module registers only
through `registerIrCard("BT2-007", compiled)`; it has no legacy `registerCard`
and no `@ts-nocheck`.

##### Behavioral proof and validation

The focused suite uses public attack intent and a legal public hatch of BT2-007, digivolution to registered BT2-067, turn cycling, movement from breeding with the source retained, and attack behavior after movement. Coordinator rerun: 3/3 passed; the exact 005–008 batch passed 4 files/20 tests with one worker and file parallelism disabled. Catalog/KB, IR, behavior, and peer/stack columns are 2/2; delivery gates passed (10/10).

### BT2-008 — Yaamon

Score: 10/10. Focused 6/6; legal lifecycle and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-008.md` (2026-09-10):

##### Contract

Catalog entry `BT2-008` identifies Yaamon as a Purple Lv.2 Digi-Egg
(In-Training, Lesser), DP 0, play cost —, with no evolution cost, no main or
Security text, and a four-copy deck limit. Its only printed clause is:

> [Your Turn] While you have 5 or more cards in your trash, this Digimon gets
> +1000 DP.

`node tools/kb/query.mjs card BT2-008` reports no Q&A, ruling, errata, or
restriction entry. No unresolved card-level ambiguity was found.

##### Clause → IR mapping

| Printed clause                     | Implementation                                             |
| ---------------------------------- | ---------------------------------------------------------- |
| Inherited effect                   | `effects[0].isInherited: true`                             |
| `[Your Turn]`                      | `trigger: "YourTurn"`                                      |
| You have cards in your trash       | `while.kind: "zoneCount"`, `seat: "mine"`, `zone: "trash"` |
| Five or more (inclusive threshold) | `op: "gte"`, `value: 5`                                    |
| Gets +1000 DP                      | `effect.kind: "modifyDP"`, `amount: 1000`                  |

`coverage: "full"` and `residual: []` are present. The module registers only
through `registerIrCard("BT2-008", compiled)`; it has no legacy `registerCard`
and no `@ts-nocheck`.

##### Behavioral proof and validation

The focused suite covers trash thresholds/turn ownership and a legal public hatch of BT2-008, digivolution to registered BT2-067, turn cycling, movement from breeding with the source retained, and host/peer isolation. Coordinator rerun: 6/6 passed; the exact 005–008 batch passed 4 files/20 tests with one worker and file parallelism disabled. Catalog/KB, IR, behavior, and peer/stack columns are 2/2; delivery gates passed (10/10).

### BT2-009 — Guilmon

Score: 10/10. Focused 4/4; legal evolution and threshold/turn scope. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-009.md` (2026-09-10):

##### Catalog and KB

`packages/shared/src/cards/data/cards.json` identifies BT2-009 as a red level-3
Rookie/Virus/Reptile Digimon, play cost 3, 3000 DP, evolving from a red level-2
Digimon for 0 memory. Its only printed clause is the inherited
`[Your Turn] While there are 5 or more cards in your opponent's trash, this
Digimon gets +1000 DP.` The required `node tools/kb/query.mjs card BT2-009`
query returned no entry; no local errata or restriction applies.

##### Implementation map

`apps/api/src/cards/BT2/BT2-009.ts` is a typed compiled IR module. It contains
one inherited `YourTurn` `Aura`, targeting the self host, modifying DP by 1000,
and using the structured opponent-trash `zoneCount` gate with inclusive `gte: 5`.
It has `coverage: "full"`, `residual: []`, and exactly one
`registerIrCard("BT2-009", compiled)` registration; there is no `registerCard`
or TypeScript suppression.

The generated record in `packages/shared/src/effects/effects.json` matches the
direct module. The interpreter's static pass re-evaluates the `while` gate,
`zoneCount` resolves the source owner's opponent trash, and the `YourTurn`
timing is owner-scoped. This maps every printed clause without approximation.

##### Behavioral, lifecycle, and peer evidence

`BT2-009.test.ts` proves the 5-card inclusive boundary, four-card negative,
owner-trash exclusion, and opponent-turn exclusion through observable DP. The
re-audit adds a public `digivolve` route from legal red level-2 BT1-001, checks
the printed 0 memory cost, draw 1, top-card transition, and 3000 DP. The
existing inherited-effect stack uses legal red level-3 BT2-009 beneath red
level-4 BT2-013. BT2-001 is a same-text inherited peer; BT2-008 supplies a
same-zone-count peer with a different owner trash scope. No trait filter,
Security clause, optional branch, or once-per-turn identity is present.

No production code change was needed. Tests were not run under the static-only
gate; the coordinator must execute the focused and collection gates later.

##### Static score

Catalog/rules 2/2; direct IR 2/2; behavioral evidence 2/2; peer/legal stack
evidence 2/2; execution gates 2/2 passed. Final result: **10/10**.

### BT2-010 — Biyomon

Score: 10/10. Focused 4/4; legal evolution and deletion/turn scope. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-010.md` (2026-09-10):

##### Catalog and KB

`packages/shared/src/cards/data/cards.json` identifies BT2-010 as a red level-3
Rookie/Vaccine/Bird Digimon, play cost 3, 2000 DP, evolving from a red level-2
Digimon for 0 memory. Its effect is `[On Deletion] If it's your turn, gain 1
memory.` The required `node tools/kb/query.mjs card BT2-010` query returned no
entry; no local errata or restriction applies.

##### Implementation map

`apps/api/src/cards/BT2/BT2-010.ts` is a typed compiled IR module with one
`OnDeletion` effect and a `GainMemory` action for 1 memory gated by structured
`isYourTurn`. It has `coverage: "full"`, `residual: []`, and exactly one
`registerIrCard("BT2-010", compiled)` registration; there is no `registerCard`
or TypeScript suppression.

The generated record in `packages/shared/src/effects/effects.json` agrees. The
interpreter's deletion window fires after the permanent reaches trash and the
condition reads the current turn seat, so effect and battle deletion are both
covered while the opponent-turn branch is rejected.

##### Behavioral, lifecycle, and peer evidence

`BT2-010.test.ts` proves memory gain after effect deletion, memory gain after
battle deletion, trash residency, and no gain during the opponent's turn. The
re-audit adds a public `digivolve` route from legal red level-2 BT1-001, checks
the printed 0 memory cost, draw 1, top-card transition, and 2000 DP. The
effect is not inherited and has no stack-source dependency. BT2-034, BT2-040,
and BT2-068 are relevant neighboring On Deletion peers. No target, optional
choice, Security clause, trait filter, or once-per-turn identity is present.

No production code change was needed. Tests were not run under the static-only
gate; the coordinator must execute the focused and collection gates later.

##### Static score

Catalog/rules 2/2; direct IR 2/2; behavioral evidence 2/2; peer/legal stack
evidence 2/2; execution gates 2/2 passed. Final result: **10/10**.

### BT2-011 — Vorvomon

Score: 10/10. Focused 3/3; legal play/evolution/no-effect proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-011.md` (2026-09-10):

##### Catalog and KB

`packages/shared/src/cards/data/cards.json` identifies BT2-011 as a red level-3
Rookie/Virus/Rock Dragon Digimon, play cost 4, 5000 DP, evolving from a red
level-2 Digimon for 0 memory. It has no effect or inherited-effect text. The
required `node tools/kb/query.mjs card BT2-011` query returned no entry; no
local errata or restriction applies.

##### Implementation map

`apps/api/src/cards/BT2/BT2-011.ts` intentionally contains an empty compiled
effect list with `coverage: "full"` and `residual: []`, and exactly one
`registerIrCard("BT2-011", compiled)` registration. There is no `registerCard`,
`RawUnparsed`, or TypeScript suppression. The matching generated
`packages/shared/src/effects/effects.json` record is also empty. There is no
effect clause or shared primitive to interpret.

##### Behavioral, lifecycle, and peer evidence

`BT2-011.test.ts` proves play for 4 memory as a 5000 DP Digimon and a public
legal evolution from red level-2 BT1-001, including 0 memory, draw 1, and the
resulting stack/top-card identity. The no-effect assertion checks that no
effect activation occurs. BT2-014 and BT2-016 are the adjacent no-effect red
Digimon peers. The Rock Dragon trait is descriptive only here; no trait-based
effect, Security clause, optional branch, or once-per-turn identity exists.

No production code or test change was needed. Tests were not run under the
static-only gate; the coordinator must execute the focused and collection gates
later.

##### Static score

Catalog/rules 2/2; direct IR 2/2; behavioral evidence 2/2; peer/legal stack
evidence 2/2; execution gates 2/2 passed. Final result: **10/10**.

### BT2-012 — Birdramon

Score: 10/10. Focused 4/4; legal evolution/player attack/Q996. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-012.md` (2026-09-10):

##### Catalog and KB

`packages/shared/src/cards/data/cards.json` identifies BT2-012 as a red level-4
Champion/Vaccine/Giant Bird Digimon, play cost 4, 3000 DP, evolving from a red
level-3 Digimon for 2 memory. Its effect is `[When Attacking] When this Digimon
attacks a player, it gets +4000 DP for the turn.` The required card query
returned Q996 (2024-03-28), which confirms the effect still activates when the
declared player attack is blocked. No errata or restriction applies.

##### Implementation map

`apps/api/src/cards/BT2/BT2-012.ts` contains one `WhenAttacking` action targeting
the self attacker, applying `ModifyDP` +4000 with `duration: "forTheTurn"`, and
gated by `attackTargetsPlayer`. It has `coverage: "full"`, `residual: []`, and
exactly one `registerIrCard("BT2-012", compiled)` registration; there is no
`registerCard` or TypeScript suppression. The generated
`packages/shared/src/effects/effects.json` record agrees, including the
structured player-attack condition.

The interpreter maps `WhenAttacking` to the attack-declaration window and
preserves the declared player target before blocker redirection. The action
condition therefore remains true for Q996's blocked attack and false for an
attack declared against an opposing Digimon; the temporary DP grant expires at
turn end.

##### Behavioral, lifecycle, and peer evidence

`BT2-012.test.ts` proves +4000 DP on a player attack, retains the bonus when the
player attack is blocked (Q996), and rejects an opposing-Digimon attack. The
re-audit adds a public legal evolution from red level-3 BT2-010, checks the
printed 2 memory cost, draw 1, top-card transition, and 3000 DP. BT2-015 and
BT2-019 are neighboring player-attack gated peers. There is no inherited,
Security, trait-filter, optional, or once-per-turn clause.

No production code change was needed. Tests were not run under the static-only
gate; the coordinator must execute the focused and collection gates later.

##### Static score

Catalog/rules 2/2; direct IR 2/2; behavioral evidence 2/2; peer/legal stack
evidence 2/2; execution gates 2/2 passed. Final result: **10/10**.

### BT2-013 — Growlmon

Score: 10/10. Focused 4/4; legal stack and inherited deletion boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-013.md` (2026-09-10):

- Catalog/KB: Red level-4 Champion, 4000 DP, play cost 5; evolves from a red level-3 for 2; Virus/Dark Dragon. Its only printed clause is inherited `[When Attacking] Delete 1 of your opponent's Digimon with 2000 DP or less`. `node tools/kb/query.mjs card BT2-013` returned no KB entries.
- Implementation: `apps/api/src/cards/BT2/BT2-013.ts` contains one full-coverage compiled IR effect, inherited and triggered by `WhenAttacking`, with opponent Digimon target filter and inclusive `dp lte 2000`, count 1. It registers exclusively via `registerIrCard("BT2-013", compiled)`.
- Behavioral proof: `BT2-013.test.ts` proves the 2000-DP boundary, exactly one deletion among multiple legal targets, the 3000-DP negative, and a no-target attack completion. The BT2-011–020 collection gate also checks the runtime IR shape.
- Peer/stack proof: the focused fixtures use a legal red level-4 host stack (`BT2-016` over `BT1-009` and this inherited source), and the batch evolution proof for four cards verifies legal evolution and `.stack` source selection excludes the top card after evolution (the corrected 013/015 cases). Comparative deletion behavior is covered by the shared batch evidence.
- Delivery status: collection, typecheck, formatting, diff, commit, and push gates passed (10/10).

### BT2-014 — Lavorvomon

Score: 10/10. Focused 2/2; legal vanilla evolution proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-014.md` (2026-09-10):

- Catalog/KB: Red level-4 Champion, 6000 DP, play cost 5; evolves from a red level-3 for 2; Virus/Rock Dragon; no main, inherited, or Security effect. `node tools/kb/query.mjs card BT2-014` returned no KB entries.
- Implementation: `apps/api/src/cards/BT2/BT2-014.ts` is a full-coverage no-effect compiled IR record (`effects: []`, `residual: []`) registered exclusively via `registerIrCard("BT2-014", compiled)`.
- Behavioral proof: `BT2-014.test.ts` proves play cost, printed 6000 DP, absence of effect activation, and legal red level-3 evolution for 2 memory with the resulting stack and draw from the normal evolution rule. The BT2-011–020 collection gate confirms registration and empty runtime effects.
- Peer/stack proof: the legal red level-3 → level-4 stack is exercised directly; the four-card batch’s stack checks verify legal evolution and `.stack` source selection excludes the top card after evolution. No card-specific ruling or trait-filter ambiguity exists.
- Delivery status: collection, typecheck, formatting, diff, commit, and push gates passed (10/10).

### BT2-015 — Garudamon

Score: 10/10. Focused 4/4; legal evolution and Q997 attack target proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-015.md` (2026-09-10):

- Catalog/KB: Red level-5 Ultimate, 7000 DP, play cost 6; evolves from a red level-4 for 3; Vaccine/Birdkin. Main text: `[When Attacking] When this Digimon attacks a player, trigger <Draw 1>`. Q997 in the KB confirms the effect activates after a declared player attack even when that attack is blocked.
- Implementation: `apps/api/src/cards/BT2/BT2-015.ts` encodes a full-coverage `WhenAttacking` Draw 1 action for the controller, conditioned on `attackTargetsPlayer`, and registers exclusively with `registerIrCard("BT2-015", compiled)`.
- Behavioral proof: `BT2-015.test.ts` proves player attack draw, draw before a declared player attack is blocked (Q997), and no draw when attacking an opposing Digimon. The collection gate confirms the runtime trigger/action shape.
- Peer/stack proof: the legal red level-4 evolution route is covered by the batch stack evidence; the corrected 015 legal-evolution test ensures `.stack` sources exclude the evolved top card. The attack-target boundary is compared against opposing-Digimon attacks.
- Delivery status: collection, typecheck, formatting, diff, commit, and push gates passed (10/10).

### BT2-016 — Lavogaritamon

Score: 10/10. Focused 2/2; legal vanilla evolution proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-016.md` (2026-09-10):

- Catalog/KB: Red level-5 Ultimate, 8000 DP, play cost 7; evolves from a red level-4 for 2; Virus/Rock Dragon; no main, inherited, or Security effect. `node tools/kb/query.mjs card BT2-016` returned no KB entries.
- Implementation: `apps/api/src/cards/BT2/BT2-016.ts` is a full-coverage no-effect compiled IR record (`effects: []`, `residual: []`) registered exclusively via `registerIrCard("BT2-016", compiled)`.
- Behavioral proof: `BT2-016.test.ts` proves play cost, printed 8000 DP, no effect activation, and legal red level-4 evolution for 2 memory with resulting stack and normal evolution draw. The BT2-011–020 collection gate confirms registration and empty runtime effects.
- Peer/stack proof: the direct legal BT2-014 → BT2-016 stack is tested; existing stack proof also checks legal source transitions and `.stack` source handling. As a vanilla card, there are no trait-filter or ruling-specific gaps.
- Delivery status: collection, typecheck, formatting, diff, commit, and push gates passed (10/10).

### BT2-017 — WarGrowlmon

Score: 10/10. Focused batch green; legal stack and boundary peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-017.md` (2026-09-10):

- Catalog/KB and full compiled IR match the red-Tamer deletion and inherited opponent-trash aura; registration is exclusively `registerIrCard`.
- Focused proof covers legal evolution/stack, 3000-DP deletion boundary, Tamer/turn/trash negatives, and inherited peer isolation. Coordinator exact 017–024 batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-018 — Volcanicdramon

Score: 10/10. Focused batch green; multi-target threshold peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-018.md` (2026-09-10):

- Catalog/KB and full compiled IR match Security Attack +1 and On Play deletion of all opposing Digimon at 4000 DP or less; exclusive `registerIrCard`.
- Focused proof covers legal play/evolution context, inclusive boundary, multi-target and over-threshold peers. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-019 — Phoenixmon

Score: 10/10. Focused batch green; Q998 target comparison. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-019.md` (2026-09-10):

- Catalog/KB and full compiled IR match player-attack-only +1 memory; Q998 blocked-attack behavior is represented; exclusive `registerIrCard`.
- Focused proof covers legal stack/play, player versus Digimon target, blocked attack, and peer isolation. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-020 — Gallantmon

Score: 10/10. Focused batch green; trash scaling and Tamer gate. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-020.md` (2026-09-10):

- Catalog/KB and full compiled IR match red-Tamer deletion at 6000 DP and security trash scaling per ten opponent-trash cards; Q999/Q1000/Q1239/Q1251 reviewed; exclusive `registerIrCard`.
- Focused proof covers legal stack, thresholds, Tamer gate, trash scaling, and peer/owner isolation. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-021 — Veemon

Score: 10/10. Focused batch green; OPT unsuspend and peer proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-021.md` (2026-09-10):

- Catalog/KB and full compiled IR match inherited main-phase self unsuspend Draw 1 once per turn; Q1001 reviewed; exclusive `registerIrCard`.
- Focused proof covers legal evolution/stack, genuine unsuspend, false-event and phase negatives, once-per-turn and peer isolation. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-022 — Betamon

Score: 10/10. Focused batch green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-022.md` (2026-09-10):

- Catalog/KB match the full empty IR vanilla implementation and exclusive `registerIrCard`.
- Focused proof covers printed cost/DP, no effects, and legal blue level-2 evolution/stack. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-023 — Gomamon

Score: 10/10. Focused batch green; source-less peer comparison. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-023.md` (2026-09-10):

- Catalog/KB and full compiled IR match hand-only play-cost reduction per opposing source-less battle-area Digimon with zero floor; Q1002 reviewed; exclusive `registerIrCard`.
- Focused proof covers legal play, source-less/source-bearing peer comparison, opponent ownership, count scaling and floor. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-024 — Seadramon

Score: 10/10. Focused batch green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-024.md` (2026-09-10):

- Catalog/KB match the full empty IR vanilla implementation and exclusive `registerIrCard`.
- Focused proof covers printed cost/DP, no effects, and legal blue level-3 evolution/stack. Coordinator batch: 8 files/32 tests passed. delivery gates passed at collection closeout.

### BT2-025 — Ikkakumon

Score: 10/10. Focused 3/3; public legal blue lifecycle and source peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-025.md` (2026-09-10):

Catalog/KB and exclusive full inherited IR match top-source trashing on attack. Public legal lifecycle hatches BT2-002, evolves through BT2-022 → BT2-025, moves from breeding, evolves to BT2-029 and attacks; source-bearing/source-less opponent peers are distinguished. Coordinator focused rerun passed 3/3. delivery gates passed at collection closeout.

### BT2-026 — Veedramon

Score: 10/10. Focused 6/6; public legal lifecycle and Tamer peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-026.md` (2026-09-10):

Catalog/KB and exclusive full IR match own-turn blue-Tamer Jamming. Public legal lifecycle hatches BT1-003, evolves BT1-030 → BT2-026, cycles turns and moves from breeding; color/owner/turn/security peers are covered. Coordinator focused rerun passed 6/6. Gates passed at collection closeout.

### BT2-027 — Zudomon

Score: 10/10. Focused green; legal vanilla evolution/stack. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-027.md` (2026-09-10):

- Catalog/KB match its vanilla identity and full empty compiled IR; exclusive `registerIrCard`, no residual or suppression.
- Focused proof covers printed play cost/DP, no activation, and public legal blue level-4 evolution with stack/draw. Coordinator exact 025–032 batch passed 8 files/34 tests. delivery gates passed at collection closeout.

### BT2-028 — AeroVeedramon

Score: 10/10. Focused 8/8; public legal blue lifecycle, timing boundaries, and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-028.md` (2026-09-10):

- Catalog and KB Q1003/Q1004 were reconciled with the compiled IR. The module registers exclusively through `registerIrCard`.
- Focused proof covers the blue-Tamer gate, valid and invalid unsuspend targets, self-unsuspend, inherited Jamming timing boundaries, and opponent peer isolation.
- A public legal blue stack (BT2-002 → BT2-022 → BT2-024 → BT2-028 → BT2-030) is hatched, evolved, turn-cycled, moved, attacked, and unsuspended through public intents. The exact focused suite passed 8/8 with one worker and file parallelism disabled.
- Delivery gates passed at collection closeout.

### BT2-029 — MegaSeadramon

Score: 10/10. Focused green; Q1005 blocker peer comparison. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-029.md` (2026-09-10):

- Catalog/KB and full IR match its blocker restriction; Q1005's source-bearing condition is mapped exactly; exclusive `registerIrCard`.
- Public attack tests compare source-bearing and source-less opposing Blockers, all-ineligible skip, and opponent-turn scope. Coordinator exact batch passed 8 files/34 tests. delivery gates passed at collection closeout.

### BT2-030 — MetalSeadramon

Score: 10/10. Focused green; Q1006 target/blocker boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-030.md` (2026-09-10):

- Catalog/KB and full IR match On Play return of up to two level-4-or-lower opponents and Q1006 blocker restriction; exclusive `registerIrCard`.
- Public play/attack tests cover count/level boundaries and source-bearing versus source-less blocker peers plus turn scope. Coordinator exact batch passed 8 files/34 tests. delivery gates passed at collection closeout.

### BT2-031 — Vikemon

Score: 10/10. Focused 6/6; public legal blue lifecycle, source boundaries, and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-031.md` (2026-09-10):

- Catalog and local rules evidence match the compiled continuous effect; the module uses exclusive `registerIrCard` registration.
- Focused proof covers the opponent source-less condition, controller/opponent and battle/breeding boundaries, turn ownership, both numeric bonuses, and a stacked opponent peer.
- A public legal blue stack (BT2-002 → BT2-022 → BT2-024 → BT2-027 → BT2-031) is hatched in Breeding, evolved at exact costs, turn-cycled, moved, and used for a real two-card security attack. The exact focused suite passed 6/6 with one worker and file parallelism disabled.
- Delivery gates passed at collection closeout.

### BT2-032 — UlforceVeedramon

Score: 10/10. Focused 7/7; public legal blue lifecycle, OPT memory, and Tamer/peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-032.md` (2026-09-10):

- Catalog and KB Q1007/Q1008 align with the compiled triggers; the module registers exclusively through `registerIrCard`.
- Focused proof covers allied blue-Tamer ownership/color boundaries, actual-unsuspend and main-phase requirements, once-per-turn memory, and opponent peer isolation.
- A public legal blue stack (BT2-002 → BT2-022 → BT2-024 → BT2-027 → BT2-032) is hatched, evolved for exact costs, turn-cycled, moved, attacked, then unsuspended by publicly playing BT2-096 with a blue Tamer in play. The focused suite passed 7/7 with one worker and file parallelism disabled.
- Delivery gates passed at collection closeout.

### BT2-033 — Agumon

Score: 10/10. Focused green; legal evolution and Tamer threshold peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-033.md` (2026-09-10):

- Catalog/KB and compiled inherited When Attacking Draw 1 agree; exclusive `registerIrCard`.
- Focused and collection proof covers a legal yellow evolution stack, three-yellow-Tamer threshold, two-Tamer and opponent-ownership negatives, and top-card isolation. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-034 — Salamon

Score: 10/10. Focused green; legal evolution and inherited stack peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-034.md` (2026-09-10):

- Catalog and KB Q1009 match the compiled On Deletion Recovery +1 condition; exclusive `registerIrCard`.
- Proof covers legal yellow evolution, three/four-security boundary, sequential simultaneous-copy resolution, and observable deck/security zones. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-035 — GeoGreymon

Score: 10/10. Focused green; legal evolution and Tamer threshold peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-035.md` (2026-09-10):

- Catalog/KB match the inherited When Attacking -2000 DP effect and yellow-Tamer gate; exclusive `registerIrCard`.
- Proof covers legal yellow evolution, exact threshold/controller ownership, top-card isolation, target peer, and zero-DP deletion. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-036 — Gatomon

Score: 10/10. Focused green; legal evolution and purple-presence boundary. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-036.md` (2026-09-10):

- Catalog/KB match both compiled On Play -4000 DP and allied-deletion +3000 DP clauses; exclusive `registerIrCard`.
- Proof covers legal yellow evolution, purple presence/ownership, target and zero-DP boundaries, allied/opposing deletion, stacking, and turn scope. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-037 — Angewomon

Score: 10/10. Focused green; legal evolution and recovery boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-037.md` (2026-09-10):

- Catalog confirms the vanilla yellow level-5 card; compiled IR is full and empty with exclusive `registerIrCard`.
- Public proof covers printed play stats/cost and legal yellow level-4 evolution, draw, and resulting stack. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-038 — RizeGreymon

Score: 10/10. Focused green; legal evolution, optional Tamer and stack proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-038.md` (2026-09-10):

- Catalog/KB match the optional free yellow-Tamer play with On Play suppression and inherited Tamer-gated Security Attack +1; exclusive `registerIrCard`.
- Proof covers legal evolution, free play/cost suppression, refusal, inherited host stack, threshold, peer, and opponent-turn boundaries. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-039 — Magnadramon

Score: 10/10. Focused green; legal evolution and Q1011 optional-play peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-039.md` (2026-09-10):

- Catalog and KB Q1011/Q1012 match compiled Recovery +2 and optional attack-time yellow level-3 free play; exclusive `registerIrCard`.
- Proof covers legal evolution, recovery threshold, optional refusal, eligible/ineligible peers, free play, and propagated On Play behavior. Exact collection passed 622/622; delivery gates passed at collection closeout.

### BT2-040 — Ophanimon

Score: 10/10. Focused 4/4; legal yellow chain and deletion replacement. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-040.md` (2026-09-10):

Catalog/KB and full exclusive IR match On Deletion self-placement into security and recovery. A legal registered yellow chain BT2-036 → BT2-038 → BT2-040 proves evolution context; deletion/replacement, security and decline boundaries are covered. Coordinator focused rerun passed 4/4. delivery gates passed at collection closeout.

### BT2-041 — ShineGreymon

Score: 10/10. Focused green; legal evolution and Tamer peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-041.md` (2026-09-10):

Catalog/KB and full exclusive `registerIrCard` IR match Tamer suspension/-4000 DP scaling and inherited Tamer DP. Legal digivolution and Q1014/Q1015/Q1230 multi-peer boundaries pass in the coordinator 041–048 batch (8 files/30 tests). delivery gates passed at collection closeout.

### BT2-042 — Argomon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-042.md` (2026-09-10):

Catalog/KB match full empty IR with exclusive `registerIrCard`. Public play and legal green egg evolution prove printed cost/DP, no activation, stack and draw. Coordinator 041–048 batch: 8 files/30 tests. delivery gates passed at collection closeout.

### BT2-043 — Agumon

Score: 10/10. Focused 4/4; public legal green lifecycle/peer proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-043.md` (2026-09-10):

Catalog/KB and exclusive inherited IR match own-turn +1000 DP. Public legal green lifecycle hatches BT2-004, evolves BT2-043 → BT2-045, cycles turns and moves from breeding; host/plain peer and top-card negatives pass. Coordinator focused rerun 4/4. Gates passed at collection closeout.

### BT2-044 — Tyrannomon

Score: 10/10. Focused green; legal evolution and reveal peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-044.md` (2026-09-10):

Catalog/KB and full exclusive IR match reveal/add categories; Q1016/Q1017 boundaries reviewed. Public legal evolution tests cover selection peers, bottom-deck remainder and level boundary. Coordinator batch: 8 files/30 tests. delivery gates passed at collection closeout.

### BT2-045 — Argomon

Score: 10/10. Focused green; legal Digisorption peer/decline proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-045.md` (2026-09-10):

Catalog/KB and full exclusive IR match Digisorption cost reduction. Public legal evolution covers eligible peer suspension, no-peer full cost, and decline path. Coordinator batch: 8 files/30 tests. delivery gates passed at collection closeout.

### BT2-046 — MetalTyrannomon

Score: 10/10. Focused 7/7; public legal green lifecycle, level boundary, and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-046.md` (2026-09-10):

- Catalog and local rules evidence match the compiled inherited battle-deletion trigger; registration is exclusively `registerIrCard`.
- Focused proof covers host identity, level-6 threshold, battle versus security deletion, inherited versus top-card placement, and an unaffected stacked level-6 peer.
- A public legal green stack (BT2-004 → BT2-043 → BT2-044 → BT2-046 → BT2-050) is hatched, evolved at exact costs, turn-cycled, moved, and used to battle-delete a naturally lower-DP level-6 Digimon. The inherited unsuspend resolves observably. Final focused suite passed 7/7.
- Delivery gates passed at collection closeout.

### BT2-047 — Argomon

Score: 10/10. Focused green; legal evolution and Q1018 attack proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-047.md` (2026-09-10):

Catalog/KB and full exclusive IR match Digisorption and inherited suspended level-3 play. Legal evolution plus public attack tests cover peer choice, On Play Q1018, optional decline and stack behavior. Coordinator batch: 8 files/30 tests. delivery gates passed at collection closeout.

### BT2-048 — Cherrymon

Score: 10/10. Focused green; public blocker peer/decline proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-048.md` (2026-09-10):

Catalog/KB and full exclusive IR match Blocker. Public attack/block intents prove redirect, decline, suspended negative and opposing peer interaction. Coordinator batch: 8 files/30 tests. delivery gates passed at collection closeout.

### BT2-049 — Puppetmon

Score: 10/10. Focused green; public play/attack timing peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-049.md` (2026-09-10):

Catalog/KB and exclusive full IR match On Play suspension/duration and When Attacking memory. Public play/attack proof covers Q1019–Q1021 timing and opposing peers. Coordinator batch passed 8 files/28 tests. delivery gates passed at collection closeout.

### BT2-050 — Argomon

Score: 10/10. Focused green; legal Digisorption and suspended peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-050.md` (2026-09-10):

Catalog/KB and exclusive full IR match Digisorption and suspended-peer Security Attack scaling. Legal evolution and public attack tests cover choice/decline, count and turn boundaries. Coordinator batch passed 8 files/28 tests. delivery gates passed at collection closeout.

### BT2-051 — RustTyrannomon

Score: 10/10. Focused green; legal stack and Q1022 battle peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-051.md` (2026-09-10):

Catalog/KB and exclusive full IR match green-Tamer unsuspended attacks and post-battle suspension; Q1022 reviewed. Legal green evolution and battle peer/negative tests pass. Coordinator batch passed 8 files/28 tests. delivery gates passed at collection closeout.

### BT2-052 — Hagurumon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-052.md` (2026-09-10):

Catalog/KB match exclusive full empty IR. Public play and legal black egg evolution prove costs, DP, draw and wrong-color negative. Coordinator batch passed 8 files/28 tests. delivery gates passed at collection closeout.

### BT2-053 — Keramon

Score: 10/10. Focused 5/5; public legal black lifecycle, same-name trigger, and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-053.md` (2026-09-10):

- Catalog and KB Q1023/Q2814 match the compiled inherited same-name play trigger; registration is exclusively `registerIrCard`.
- Focused proof covers current host-name comparison, controller/turn ownership, simultaneous-play once-per-event behavior, and an opponent same-name peer.
- A public legal black stack (BT2-005 → BT2-053 → BT2-056 → BT2-060) is hatched, evolved at exact costs, turn-cycled, moved, then another BT2-060 is publicly played to draw from the inherited BT2-053 source. Focused suite passed 5/5.
- Delivery gates passed at collection closeout.

### BT2-054 — Gotsumon

Score: 10/10. Focused green; blocker and attack-cost peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-054.md` (2026-09-10):

Catalog/KB and exclusive full IR match Blocker and inherited attack memory loss. Public blocker/attack proof covers redirect, decline, suspended and attack-cost peers. Coordinator batch passed 8 files/28 tests. delivery gates passed at collection closeout.

### BT2-055 — ToyAgumon

Score: 10/10. Focused 4/4; public legal black lifecycle, Reboot phase, and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-055.md` (2026-09-10):

- Catalog and rules evidence match the compiled inherited Reboot keyword; registration is exclusively `registerIrCard`.
- Focused proof covers inherited versus top-card placement, no immediate unsuspend, the opponent unsuspend phase, and an unaffected peer.
- A public legal black stack (BT2-005 → BT2-055 → BT2-056 → BT2-060) is hatched, evolved at exact costs, turn-cycled, moved, and attacked. Reboot then observably unsuspends the host in the opponent's unsuspend phase. Focused suite passed 4/4.
- Delivery gates passed at collection closeout.

### BT2-056 — Numemon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-056.md` (2026-09-10):

Catalog/KB match exclusive full empty IR. Public play and legal black level-3 evolution cover cost/DP/draw and wrong-color peer. Coordinator batch passed 8 files/28 tests. delivery gates passed at collection closeout.

### BT2-057 — Greymon

Score: 10/10. Focused 6/6; public legal black lifecycle and Reboot/Jamming stack proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-057.md` (2026-09-10):

- Catalog and rules evidence match the compiled inherited conditional Jamming effect; registration is exclusively `registerIrCard`.
- Focused proof covers inherited/top-card placement, Reboot dependency, turn ownership, a stronger Security Digimon, and survival versus deletion.
- A public legal black stack (BT2-005 → BT2-055 → BT2-057 → BT2-060) is hatched, evolved at exact costs, turn-cycled, moved, and attacks BT2-083 in security. The inherited Reboot/Jamming interaction preserves the host. Focused suite passed 6/6.
- Delivery gates passed at collection closeout.

### BT2-058 — Guardromon

Score: 10/10. Focused green; public blocker/turn peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-058.md` (2026-09-10):

Catalog/KB and exclusive full IR match Blocker and turn attack restriction. Public block/decline/attack tests cover active/suspended and owner/opponent peers. Coordinator 057–064 batch passed 8 files/31 tests. delivery gates passed at collection closeout.

### BT2-059 — Kurisarimon

Score: 10/10. Focused 5/5; public legal black lifecycle, same-name memory, and peer isolation. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-059.md` (2026-09-10):

- Catalog and KB Q1024/Q2814 match the compiled inherited same-name memory trigger; registration is exclusively `registerIrCard`.
- Focused proof covers current host-name comparison, controller/turn ownership, simultaneous-play once-per-event behavior, and an opponent same-name peer.
- A public legal black stack (BT2-005 → BT2-053 → BT2-059 → BT2-060) is hatched, evolved at exact costs, turn-cycled, moved, then another BT2-060 is publicly played. The inherited trigger produces the exact net memory. Focused suite passed 5/5.
- Delivery gates passed at collection closeout.

### BT2-060 — Megadramon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-060.md` (2026-09-10):

Catalog/KB match exclusive empty full IR. Public play and legal black level-4 evolution prove cost/DP/draw and wrong-color negative. Coordinator batch passed 8 files/31 tests. delivery gates passed at collection closeout.

### BT2-061 — Andromon

Score: 10/10. Focused green; public blocker peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-061.md` (2026-09-10):

Catalog/KB and exclusive full IR match Blocker. Public attack/block proof covers redirect, decline, and controller-turn attack peer behavior. Coordinator batch passed 8 files/31 tests. delivery gates passed at collection closeout.

### BT2-062 — Infermon

Score: 10/10. Focused green; Q1025 evolution contexts. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-062.md` (2026-09-10):

Catalog/KB and exclusive full IR match hand-only Diaboromon evolution cost reduction; Q1025 reviewed. Public digivolution tests cover target name, breeding exclusion and opponent turn. Coordinator batch passed 8 files/31 tests. delivery gates passed at collection closeout.

### BT2-063 — MetalGreymon

Score: 10/10. Focused 5/5; public legal black lifecycle, Reboot, and security-stack proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-063.md` (2026-09-10):

- Catalog and rules evidence match its printed Reboot and compiled inherited Security Attack +1 condition; registration is exclusively `registerIrCard`.
- Focused proof covers top-card Reboot, inherited host behavior, missing-Reboot and opponent-turn negatives, and the exact security modifier.
- A public legal black stack (BT2-005 → BT2-055 → BT2-056 → BT2-063 → BT2-064) is hatched, evolved at exact costs, turn-cycled, moved, and attacks through two security cards. Focused suite passed 5/5.
- Delivery gates passed at collection closeout.

### BT2-064 — HiAndromon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-064.md` (2026-09-10):

Catalog/KB match exclusive empty full IR. Public play and legal black level-5 evolution prove cost/DP/draw and wrong-color negative. Coordinator batch passed 8 files/31 tests. delivery gates passed at collection closeout.

### BT2-065 — WarGreymon

Score: 10/10. Focused green; blocker/Reboot timing peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-065.md` (2026-09-10):

Catalog/KB and exclusive full IR match Blocker/Reboot. Public block, decline and opponent-unsuspend proof covers peer/timing boundaries. Coordinator 065–072 batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-066 — Machinedramon

Score: 10/10. Focused green; public De-Digivolve stack peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-066.md` (2026-09-10):

Catalog/KB and exclusive full IR match On Play De-Digivolve 2 on up to two targets and Blocker. Public play/block tests cover count, level-3 floor and peer stacks. Coordinator batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-067 — DemiDevimon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-067.md` (2026-09-10):

Catalog/KB match exclusive empty full IR. Public play and legal purple egg evolution cover cost/DP/draw and wrong-color negative. Coordinator batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-068 — Impmon

Score: 10/10. Focused green; deletion/deck boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-068.md` (2026-09-10):

Catalog/KB and exclusive full IR match On Deletion top-three self-deck trash. Effect and battle deletion tests cover exact count, short deck and source ownership peers. Coordinator batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-069 — Gabumon

Score: 10/10. Focused 4/4; public legal purple lifecycle, deletion zones, and stack proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-069.md` (2026-09-10):

- Catalog and rules evidence match the compiled inherited On Deletion draw-two/trash-one sequence; registration is exclusively `registerIrCard`.
- Focused proof covers card choice across the whole hand, top-card versus inherited placement, battle deletion, and the complete resulting zones.
- A public legal purple stack (BT2-007 → BT2-069 → BT2-074) is hatched, evolved, turn-cycled, moved, attacks, and is then battle-deleted by a naturally stronger opposing Digimon. The inherited effect draws two and trashes the selected card. Focused suite passed 4/4.
- Delivery gates passed at collection closeout.

### BT2-070 — Tapirmon

Score: 10/10. Focused green; deletion/draw boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-070.md` (2026-09-10):

Catalog/KB and exclusive full IR match On Deletion Draw 1. Effect/battle deletion and empty-deck tests cover event/source peers. Coordinator batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-071 — Wizardmon

Score: 10/10. Focused green; yellow peer/Retaliation battle proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-071.md` (2026-09-10):

Catalog/KB and exclusive full IR match yellow-Digimon Retaliation and On Deletion draw. Public battle tests cover controller/opponent yellow peers, dynamic loss and retaliation deletion. Coordinator batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-072 — Vilemon

Score: 10/10. Focused green; public attack/block distinction. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-072.md` (2026-09-10):

Catalog/KB and exclusive full IR match Blocker and inherited attack memory loss. Public attack/block tests cover zero-crossing, block-not-attack, and peer timing. Coordinator batch passed 8 files/26 tests. delivery gates passed at collection closeout.

### BT2-073 — Garurumon

Score: 10/10. Focused 7/7; public legal purple lifecycle, OPT deletion, and ownership proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-073.md` (2026-09-10):

- Catalog and KB Q1026 match the compiled inherited once-per-turn memory trigger; registration is exclusively `registerIrCard`.
- Focused proof covers owner and turn scope, simultaneous/separate deletion windows, once-per-turn identity, and top-card versus inherited placement.
- A public legal purple stack (BT2-007 → BT2-069 → BT2-073 → BT2-075) is hatched, evolved, turn-cycled, and moved. A natural-DP opponent first attacks publicly; then another allied Digimon attacks it and is battle-deleted on the controller's turn, producing exactly one memory. Focused suite passed 7/7.
- Delivery gates passed at collection closeout.

### BT2-074 — Devimon

Score: 10/10. Focused 4/4; public legal purple lifecycle and inherited Retaliation proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-074.md` (2026-09-10):

- Catalog and rules evidence match both printed and inherited Retaliation; registration is exclusively `registerIrCard`.
- Focused proof covers native and inherited placement, effect-deletion exclusion, battle loss, and both resulting trash zones.
- A public legal purple stack (BT2-007 → BT2-069 → BT2-074 → BT2-075) is hatched, evolved, turn-cycled, and moved. A natural 15,000-DP opponent publicly attacks first and remains suspended; the host then loses a public battle to it and Retaliation deletes the opponent. Focused suite passed 4/4.
- Delivery gates passed at collection closeout.

### BT2-075 — Myotismon

Score: 10/10. Focused green; legal vanilla evolution. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-075.md` (2026-09-10):

Catalog/KB match exclusive empty full IR. Public play and legal purple level-4 evolution prove cost/DP/draw and wrong-color negative. Coordinator 073–080 batch passed 8 files/32 tests. delivery gates passed at collection closeout.

### BT2-076 — Pumpkinmon

Score: 10/10. Focused 4/4; public legal purple lifecycle and deletion-zone proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-076.md` (2026-09-10):

- Catalog and rules evidence match the compiled inherited On Deletion draw-two/trash-one sequence; registration is exclusively `registerIrCard`.
- Focused proof covers whole-hand choice, top-card versus inherited placement, battle deletion, and the resulting hand/trash zones.
- A public legal purple stack (BT2-007 → BT2-069 → BT2-074 → BT2-076 → BT2-079) is hatched, evolved, turn-cycled, moved, attacks, and is battle-deleted by a natural 15,000-DP opponent on its turn. The inherited effect draws two and trashes the selected card. Focused suite passed 4/4.
- Delivery gates passed at collection closeout.

### BT2-077 — Kimeramon

Score: 10/10. Focused green; Q1027/Q1028 cost/target peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-077.md` (2026-09-10):

Catalog/KB and exclusive full IR match optional own deletion cost/opposing level-5 deletion; Q1027/Q1028 reviewed. Public play tests cover decline, breeding/self exclusions and level peers. Coordinator batch passed 8 files/32 tests. delivery gates passed at collection closeout.

### BT2-078 — WereGarurumon

Score: 10/10. Focused 6/6; public legal purple lifecycle, optional cost, and stack proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-078.md` (2026-09-10):

- Catalog and KB Q1029 match the compiled inherited optional once-per-turn deletion cost and unsuspend; registration is exclusively `registerIrCard`.
- Focused proof covers optional refusal, legal cost targets, exclusion of the attacker and breeding area, once-per-turn behavior, top-card isolation, and the resulting trash zone.
- A public legal purple stack (BT2-007 → BT2-069 → BT2-074 → BT2-078 → BT2-079) is hatched, evolved, turn-cycled, moved, and attacks. Deleting another allied Digimon pays the inherited cost and observably unsuspends the host. Focused suite passed 6/6.
- Delivery gates passed at collection closeout.

### BT2-079 — VenomMyotismon

Score: 10/10. Focused green; security/suspension turn peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-079.md` (2026-09-10):

Catalog/KB and exclusive full IR match Security Attack +1 and opponent-turn opposing suspension memory. Public security/turn event tests cover owner/opponent peer boundaries. Coordinator batch passed 8 files/32 tests. delivery gates passed at collection closeout.

### BT2-080 — Piedmon

Score: 10/10. Focused green; trash-play candidate peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-080.md` (2026-09-10):

Catalog/KB and exclusive full IR match On Play up-to-two purple level-4 trash plays without On Play effects and Retaliation. Public play/battle tests cover color/level candidates, suppression, decline and battle peer. Coordinator batch passed 8 files/32 tests. delivery gates passed at collection closeout.

### BT2-081 — MetalGarurumon

Score: 10/10. Focused green; trash-play candidate peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-081.md` (2026-09-10):

Catalog/KB and exclusive full IR match optional purple level-3 trash play with On Play suppression. Public attack tests cover candidate color/level peers, suppression and decline. Coordinator 081–088 batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-082 — Diaboromon

Score: 10/10. Focused green; token/deletion substitution peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-082.md` (2026-09-10):

Catalog/KB and exclusive full IR match attack token play and battle-deletion substitution. Public attack/battle tests cover decline, token/Diaboromon peers and effect-deletion negative. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-083 — Millenniummon

Score: 10/10. Focused green; sourced deletion/self-play proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-083.md` (2026-09-10):

Catalog/KB and exclusive full IR match deck-bottom/trash-sources and optional self-play after deletion with sources. Public digivolve/deletion tests cover sourced/source-less and decline peers. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-084 — Sora Takenouchi

Score: 10/10. Focused green; Q1036 attack target/color peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-084.md` (2026-09-10):

Catalog/KB and exclusive full IR match red player-attack DP support and Security play; Q1036 reviewed. Public attack tests cover blocked, Digimon-target, color and decline peers. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-085 — Joe Kido

Score: 10/10. Focused green; source-trash event peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-085.md` (2026-09-10):

Catalog/KB and exclusive full IR match opposing source-trash memory and Security play. Public effect tests cover owner/opponent, turn, return-disposal and decline peers. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-086 — Rina Shinomiya

Score: 10/10. Focused green; attack/reveal candidate peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-086.md` (2026-09-10):

Catalog/KB and exclusive full IR match blue attack support, Vee reveal/add and Security play. Public attack/play tests cover color, decline and candidate peers. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-087 — Kari Kamiya

Score: 10/10. Focused green; security threshold boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-087.md` (2026-09-10):

Catalog/KB and exclusive full IR match start-turn low-security memory and Security play. Public turn/security tests cover zero/three/four-card boundaries. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-088 — Taiga

Score: 10/10. Focused green; Tyrannomon/Q1038 evolution peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-088.md` (2026-09-10):

Catalog/KB and exclusive full IR match Tyrannomon Piercing/cost reduction and Security play; Q1038 reviewed. Public evolution/security tests cover name, owner, turn, decline and breeding peers. Coordinator batch passed 8 files/42 tests. delivery gates passed at collection closeout.

### BT2-089 — Tai Kamiya

Score: 10/10. Focused green; memory/black peer boundaries. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-089.md` (2026-09-10):

Catalog/KB and exclusive IR match memory setting, black opponent-turn DP aura and Security play. Threshold/owner/turn peers pass in coordinator 089–096 batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-090 — Matt Ishida

Score: 10/10. Focused green; trash candidate peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-090.md` (2026-09-10):

Catalog/KB and exclusive IR match memory setting, purple trash recovery and Security play. Type/color/candidate/threshold peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-091 — Volcanic Flare

Score: 10/10. Focused green; DP boundary/Security proof. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-091.md` (2026-09-10):

Catalog/KB and exclusive IR match 4000-DP deletion and Security activation. Inclusive/over-threshold target peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-092 — Radiation Blade

Score: 10/10. Focused green; target count/owner peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-092.md` (2026-09-10):

Catalog/KB and exclusive IR match up-to-two own Security Attack +1 targets. Ownership/count/decline peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-093 — Shield of the Just

Score: 10/10. Focused green; Tamer/DP threshold peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-093.md` (2026-09-10):

Catalog/KB and exclusive IR match 5000/8000 red-Tamer deletion thresholds and Security activation. Color/threshold peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-094 — Arctic Blizzard

Score: 10/10. Focused green; source/DP branch peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-094.md` (2026-09-10):

Catalog/KB and exclusive full IR match opposing source trash, own DP bonus and Security-to-hand. Source/no-source and own/no-own peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-095 — River of Power

Score: 10/10. Focused green; count/level/decline peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-095.md` (2026-09-10):

Catalog/KB and exclusive IR match up-to-three opposing level-3 returns and source trash. Count/level/decline peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-096 — The Ray of Victory

Score: 10/10. Focused green; level/Tamer-color peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-096.md` (2026-09-10):

Catalog/KB and exclusive IR match level-5 return plus blue-Tamer unsuspend and Security main effect. Level/Tamer-color/no-Tamer peers pass in coordinator batch (8 files/38 tests). Gates passed at collection closeout.

### BT2-097 — Lightning Paw

Score: 10/10. Focused green; errata count/level peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-097.md` (2026-09-10):

Catalog errata/KB and exclusive full IR match up-to-three opposing level-3 DP reduction and Security main effect. Count/level peers pass in coordinator 097–104 batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-098 — EDEN's Javelin

Score: 10/10. Focused green; post-draw scaling peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-098.md` (2026-09-10):

Catalog/KB and exclusive IR match Draw 1 then post-draw hand-scaled reduction. Hand-size/target/Security peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-099 — Glorious Burst

Score: 10/10. Focused green; Tamer cost/target peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-099.md` (2026-09-10):

Catalog/KB and exclusive IR match own yellow-Tamer use-cost reduction and -12000 DP. Owner/count/target peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-100 — Puppet Pummel

Score: 10/10. Focused green; independent branch peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-100.md` (2026-09-10):

Catalog/KB and exclusive IR match opposing suspension plus independent own +2000 DP branch. Missing-target and exact-choice peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-101 — Cherry Blast

Score: 10/10. Focused green; threshold/multi-target peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-101.md` (2026-09-10):

Catalog/KB and exclusive IR match all opposing Digimon at 6000 DP or less suspension and Security main effect. Threshold/multi-target peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-102 — Terrors Cluster

Score: 10/10. Focused green; suspended/source peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-102.md` (2026-09-10):

Catalog/KB and exclusive IR match suspended opposing Digimon deck-bottom return and Security main effect. Suspended/active/source peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-103 — Spiral Sword

Score: 10/10. Focused green; own/Blocker choice peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-103.md` (2026-09-10):

Catalog/KB and exclusive IR match own +3000 DP and Security Blocker unsuspend. Ownership/Blocker/exact-choice peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-104 — Atomic Ray

Score: 10/10. Focused green; Main/Security Blocker peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-104.md` (2026-09-10):

Catalog/KB and exclusive IR match one Blocker unsuspend plus Security all-Blocker unsuspend/+5000 DP. Blocker/non-Blocker/count peers pass in coordinator batch (8 files/30 tests). Gates passed at collection closeout.

### BT2-105 — Spider Shooter

Score: 10/10. Focused green; De-Digivolve selection peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-105.md` (2026-09-10):

Catalog/KB and exclusive IR match selected De-Digivolve 1 and Security main effect. Selection/no-source peers pass in coordinator 105–112 batch (8 files/26 tests). Gates passed at collection closeout.

### BT2-106 — Infinity Cannon

Score: 10/10. Focused green; depth/floor peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-106.md` (2026-09-10):

Catalog/KB and exclusive IR match selected De-Digivolve 4 with level-3 floor and Security main effect. Depth/floor/selection peers pass in coordinator batch. Gates passed at collection closeout.

### BT2-107 — Darkness Claw

Score: 10/10. Focused green; ownership/selection peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-107.md` (2026-09-10):

Catalog/KB and exclusive IR match selected own +3000 DP and Security +2 memory. Ownership/selection peers pass in coordinator batch. Gates passed at collection closeout.

### BT2-108 — Night Raid

Score: 10/10. Focused green; candidate/suppression peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-108.md` (2026-09-10):

Catalog/KB and exclusive IR match purple level-3 trash play with On Play suppression and Security main effect. Candidate/suppression peers pass in coordinator batch. Gates passed at collection closeout.

### BT2-109 — Heat Viper

Score: 10/10. Focused green; cost/target/decline peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-109.md` (2026-09-10):

Catalog/KB and exclusive IR match optional own deletion cost, up-to-two opposing level-4 deletion and Security-to-hand. Cost/target/decline peers pass in coordinator batch. Gates passed at collection closeout.

### BT2-110 — Trump Sword

Score: 10/10. Focused green; suspension/owner peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-110.md` (2026-09-10):

Catalog/KB and exclusive IR match opposing unsuspended deletion and Security main effect. Ownership/suspension/selection peers pass in coordinator batch. Gates passed at collection closeout.

### BT2-111 — Beelzemon

Score: 10/10. Focused green; Impmon/trash/Q1042 peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-111.md` (2026-09-10):

Catalog/KB and exclusive IR match exact Impmon/trash shortcut and level-4 deletion; Q1042 reviewed. Trash/name/breeding/level peers pass in coordinator batch. Gates passed at collection closeout.

### BT2-112 — BlackWarGreymon

Score: 10/10. Focused green; threshold/tie peers. Source: `docs/audits/BT2-REAUDIT-LEDGER.md`, 2026-09-10.
Static pass score: 10/10 (`docs/audits/BT2-STATIC-AUDIT.md`, 2026-09-02).

Re-audit evidence, merged from `docs/audits/BT2-reaudit/BT2-112.md` (2026-09-10):

Catalog/KB and exclusive IR match opponent-10000 DP play reduction and highest-DP attack unsuspend. Threshold/tie/below-highest peers pass in coordinator batch. Gates passed at collection closeout.

## Mechanisms

No `*-MECHANISM.md` file was ever written for BT2, and the re-audit changed no engine seam. The one cross-card correction worth keeping is BT2-046: its lifecycle test expected an 11,000-DP base host in isolation, while full collection registration correctly activated BT2-043's inherited +1000 DP. The test now imports BT2-043 explicitly and asserts the deterministic 12,000-DP result, so the BT2 collection run is order-independent.

## Knowledge base index

`docs/audits/BT2-reaudit/KB-INDEX.md` (2026-09-10) was never filled in. It carries only the instruction it started with: every per-card report must record the complete `node tools/kb/query.mjs card <ID>` result and map each applicable Q&A to behavioral evidence, or state explicitly that no local Q&A is indexed. The per-card Q&A references that were recorded survive in the card sections above; there is no aggregated index for BT2.

## Open items

- Stale files inside the winning source. `docs/audits/BT2-reaudit/KB-INDEX.md` says "Pending aggregation" and `docs/audits/BT2-reaudit/REVIEW-NOTES.md` says "No accepted cards yet", both dated 2026-09-10, while the ledger and run log of the same date record 112/112 cards at 10/10 with gates awarded. The ledger and run log win; the two stale files were never updated. BT2 therefore has no aggregated knowledge-base index and no recorded coordinator review notes.
- Status contradiction between passes. `docs/audits/BT2-AUDIT.md` (2026-09-02) says "static pass complete; execution gates deferred" while `docs/audits/BT2-STATIC-AUDIT.md` of the same date says "complete — 112/112 cards verified at 10/10". Both are superseded by the 2026-09-10 re-audit.
- Catalog identity is a blob hash in every source, not a commit. `catalog_commit` stays `unknown` until a run records one.

## History

- `docs/audits/BT2-AUDIT.md` — last in `1dc1e1284`, 2026-09-02. First static card-by-card pass, self-marked archival, with execution gates deferred.
- `docs/audits/BT2-STATIC-AUDIT.md` — last in `1dc1e1284`, 2026-09-02. Static closeout ledger claiming 112/112 at 10/10; its Executed gates section is copied above.
- `docs/audits/BT2-REAUDIT-LEDGER.md` — last in `483169d6e`, 2026-09-10. Independent evidence ledger, 112 rows at 10/10; merged into the card ledger above.
- `docs/audits/BT2-reaudit/` — last in `483169d6e`, 2026-09-10. 112 per-card reports merged into the card ledger, plus `RUN.md` (merged into Gates), `KB-INDEX.md` and `REVIEW-NOTES.md` (both stale, recorded under Open items), and `WORKER-BRIEF.md` (worker instructions, not evidence).
- `internal-docs/audits/BT2/` — last in `d90f92e93`, 2026-09-10. 12 Luna range reports (`BT2-001-010.md` … `BT2-111-112.md`) carrying the 2026-09-02 static-only clause evidence. Superseded per card by the 2026-09-10 reports and dropped.
- No `apps/api/src/cards/BT2/AUDIT.md` existed. No logs, PNG, or JSON evidence existed for BT2.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for BT2: PR #4576; commit `3cb2025bd`.
