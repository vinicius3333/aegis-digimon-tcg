# EX5 re-audit run

## 2026-09-09 start

- User requested a fresh worktree/branch and Luna workers for a complete 74-card audit.
- Orca created `audit-ex5-luna-20260909` from `origin/main` at `afa3ab2f451245fb03bf4e3f895ead8807f18df1`.
- Historical EX5 audit claims are not inherited; all 74 ledger rows start Queued.
- User model preference overrides the skill default: Luna workers handle card lanes.
- Resource policy: at most two card lanes plus one light review lane concurrently; all Vitest runs use one worker and no file parallelism; broad tests are coordinator-only and serialized.

## Baseline measured before worker acceptance

- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused.
- `pnpm effects:check:set -- --set EX5 --base afa3ab2f451245fb03bf4e3f895ead8807f18df1`: 74 records synchronized; zero EX5 semantic changes and zero changes outside EX5.
- Serial EX5 collection: 74 files / 364 tests passed.
- Serial workspace typecheck with a 4096 MB heap: exit 0 for shared, API, and web.

## Accepted card lanes

- `EX5-002`: coordinator rejected the first result because a Digi-Egg (`BT1-001`) was placed in the deck. The corrected lane uses inert main-deck `BT1-009`, adds an EX5-001 comparative stack, and passes 1 file / 8 focused tests serially. Accepted at 8/10 before delivery gates. The implementation now pays the normal effect-driven evolution cost.
- `EX5-001`: 5 tests pass and one Q5393 retained red reproduces the EX5-064 stack-rotation seam. Accepted provisionally at 6/10; implementation now requires effect provenance and pays the printed reduced evolution cost. Engine seam queued for a serialized Luna lane.

## Engine investigations

- `EX5-001-Q5393-STACK-ROTATION`: no engine defect. The retained red used illegal level-4 `BT1-014` after rotating onto level-2 Sunmon; Q5393 explicitly requires a level-3 destination. A new public engine regression with legal `BT1-013` passes 1/1, and the existing EX5-064 suite passes 7/7. Card lane is correcting and flipping the retained red.
- `EX5-001` correction accepted: Q5393 now passes with legal `BT1-013`; 6/6 card tests plus the 1/1 mechanism regression are green. Provisional score raised to 8/10.
- `EX5-003`: coordinator rejected direct `advance.verb` state transitions as behavioral proof. The corrected suite uses public attack intents and real Active Phase unsuspension; 3/3 focused tests pass. Accepted at 8/10 before delivery gates.
- `EX5-005`: public own/opponent-turn battles, exact draw/no-draw boundaries, and legal evolution-stack continuity pass 4/4 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-004`: legal Leomon/non-Leomon stacks, public attacks, same-turn once-per-turn refusal and real next-own-turn reset pass 3/3 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-006`: public effect-play/manual-play boundary, same-turn refusal, next-own-turn reset and legal evolution-stack continuity pass 5/5 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-007`: Q3526/Q3527 and all other clauses pass publicly; 5 tests pass with one Q3528 retained red showing once-per-turn identity loss after source replacement. Accepted provisionally at 7/10; serialized engine lane queued.
- `EX5-008`: public On Play/When Digivolving paths cover Q3529/Q3530, both mandatory trait buckets, reveal remainder order, inherited DP duration and legal/illegal evolution stacks; 5/5 focused tests pass. Accepted at 8/10 before delivery gates.

## Q3528 correction

- The first engine proposal keyed inherited OPT to the carrying permanent across five registration paths. Coordinator review rejected it because that would incorrectly merge independent physical copies with the same inherited effect. The lane confirmed the ruling semantics, removed every production engine edit, and rewrote the mechanism regression: source B may activate once, source A may independently activate once, source B is blocked when it cycles back in the same turn, and it resets next own turn. Test execution is held until the RAM guard reports at least 1 GiB free.
- The first corrected Q3528 rerun exposed another fixture expectation error at the next-turn rotation endpoint: after `top=sourceA, stack=[sourceB, originalTop]`, sourceB's reset activation promotes `originalTop`, not sourceB. Both card and mechanism tests were returned for correction; EX5-007 remains provisional until green.
- `EX5-009`: 9/9 focused tests pass, including Q3531-Q3536, public breeding play/movement/restriction paths, optional decline and legal inherited stack. The coordinator caught and corrected a scoped Oxfmt failure before acceptance. Accepted at 8/10 before delivery gates.
- `EX5-007` final correction: card plus mechanism regression pass 2 files / 7 tests serially. Per-copy first uses, same-turn cycle-back refusal and next-own-turn reset are now proven with exact instance/stack endpoints. Accepted at 8/10 before delivery gates; no production engine change was needed.
- `EX5-010`: coordinator rejected the first result because On Deletion used an internal deletion verb and optional refusal was claimed but absent. Corrected public battle deletion and explicit refusal bring the suite to 14/14 focused tests covering Q3537-Q3542 and all printed clauses. Accepted at 8/10 before delivery gates.
- `EX5-011`: public breeding play/movement/restriction paths, optional refusal, conditional On Deletion memory and legal inherited stack cover Q3543-Q3548; 10/10 focused tests pass. Accepted at 8/10 before delivery gates.
- `EX5-012`: split play and digivolve intrinsic replacements correct Q3549 so Flaremon is discounted only as the destination, never as the source. Exact trait/count boundaries, red/blue routes, deletion thresholds and inherited DP pass 14/14 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-013`: public normal and Blast evolutions, Q3550's inclusive Deva/6000-DP cost, shared once-per-turn/reset, refusal, attacks and highest-DP On Deletion pass 9/9 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-014`: replaced all injected security timing with public attacks. Q3551's first no-target activation consumes OPT before a security-played Ankylomon appears on the second check; scaling, exact DP boundary, color routes and reset pass 9/9 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-015`: coordinator rejected a false engine seam caused by expecting When Digivolving in the breeding area. The corrected public battle-area Gabumon alternate route activates reveal/add and conditional trash; Q3552-Q3554 and inherited battle replacement pass 7/7 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-017`: coordinator's first run exposed a reveal-bucket ordering expectation error. The corrected On Play/When Digivolving order, Q3560/Q3561 mandatory additions, mixed trait pools, inherited DP and legal stacks pass 8/8 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-016`: after rejecting brittle catalog text, invalid Start of Main sequencing, and an incorrect physical-card rotation endpoint, 12/12 focused tests pass. Q3555-Q3559, optional costs, legal color routes, Mother D-Reaper routing, token removal, and per-copy OPT reset are accepted at 8/10 before delivery gates.
- `EX5-019`: public breeding movement, effect-play restrictions, Q3563-Q3568, optionality, stack trashing, and inherited OPT pass 10/10 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-020`: destination-only play/evolution cost reduction, Q3569's source exclusion, both legal color routes, restrictions, and inherited DP pass 8/8 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-021`: Q3570-Q3576 and Q5503-Q5506, paid/zero-cost Option use, legal stacks, optional refusal, and inherited public-attack OPT pass 10/10 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-018`: after correcting trait matching and exact turn-loop draw/deck accounting, public evolution, draw/trash/memory, battle replacement, same-turn OPT and real next-own-turn reset pass 7/7 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-024`: catalog/full IR, public On Play and evolution paths, battle-triggered On Deletion, exact level/trait boundaries and illegal-source rejection pass 5/5 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-022`: Q3577-Q3582, unique-name exclusions, breeding suppression, effect-play restriction, mandatory draw, public watcher OPT, both inherited trait routes and real reset pass 12/12 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-023`: Q3583, explicit optional refusal, blue/purple public evolution, exact WereGarurumon/X Antibody stack predicates, inherited public-attack OPT and illegal-source boundaries pass 9/9 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-027`: Q3591 reveal, security selection/recovery/shuffle endpoints, optional decline, public inherited deletion, normal/Frimon evolution and illegal alternate-source boundaries pass 8/8 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-030`: Q3594, normal and Liollmon/Elecmon alternate evolution routes, attack-effect legal/illegal/refusal cases, exact costs, and inherited public-deletion targeting pass 8/8 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-026`, `EX5-028`, `EX5-029`, and `EX5-032`: their catalog/ruling mappings and public aura, threshold, cost-reduction, Blocker, Fortitude and deletion behaviors pass 8/8, 6/6, 5/5, and 6/6 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-034` through `EX5-036`: threshold package behavior, Fortitude reveal/replay, legal evolution boundaries and inherited DP evidence pass their focused suites. Accepted at 8/10 before delivery gates.
- `EX5-037`: first green run was demoted because its Piercing lapse used an internal ignore-requirements verb. The replacement uses legal public EX5-013 → BT5-086 evolution; 9/9 focused tests pass. Accepted at 8/10 before delivery gates.
- `EX5-038`: Q3608-Q3613, breeding restrictions, deletion watcher OPT and inherited Piercing pass 8/8 focused tests. Accepted at 8/10 before delivery gates.
- `EX5-040`, `EX5-041`, and `EX5-044`: catalog/rulings and all printed clauses pass 8/8, 7/7, and 7/7 focused tests respectively. Accepted at 8/10 before delivery gates.

## 2026-09-09 accelerated checkpoint

- Coordinator-only serial batching accepted 62/74 cards at 8/10 (496/740 before delivery gates).
- The third through fifth atomic checkpoints are `75ec391b7`, `a0eb327f8`, and `575712caf`.
- EX5-047, EX5-048, EX5-049, EX5-052, EX5-062 through EX5-068, and EX5-070 through EX5-074 now have green focused public-path evidence and committed per-card reports.
- All 74 EX5 modules register executable behavior with exactly one `registerIrCard`; no EX5 module uses `registerCard`.
- Worker Vitest remains prohibited. The coordinator waits whenever another audit worktree owns the single serial Vitest slot.
- A full disk temporarily blocked atomic writes. Only ignored, reproducible `apps/api/dist` build output was removed; no source or user data was deleted. Free disk recovered from about 120 MiB to 12 GiB.
- Remaining red cards are held below 10/10 and remain assigned to Luna correction lanes; collection/mechanism/broad gates are still pending.

## 2026-09-09 final coordinator gate

- All 74 cards are accepted at 10/10: aggregate 740/740.
- Complete EX5 collection: 74 files and 548 tests passed serially with one worker.
- Mechanism regression: 4 files and 512 tests passed serially.
- Broad engine regression: 229 files and 6,778 tests passed serially.
- Workspace TypeScript check passed.
- Effects synchronization check reports 14 semantic EX5 changes, zero semantic or byte changes outside EX5, and 74 synchronized records; its 18 tool tests pass.
- Scoped Oxlint and Oxfmt checks pass, as does `git diff --check`.
- Final fixture review removed illegal Digi-Egg placements and direct internal timing/verb proof; affected focused tests pass through public game flows.
- Independent review findings were resolved before delivery; the final branch is ready for push.

## 2026-09-09 strict TypeScript follow-up

- Removed `// @ts-nocheck` from all 72 EX5 modules that still carried it; the set now contains zero such directives.
- Corrected the 22 type errors exposed across 15 cards using the current IR schema rather than assertions that suppress whole-file checking.
- The fixes also made Leomon's reduced digivolution payment explicit and corrected Ebonwumon's scaling proof to count Digimon permanents rather than cards in one evolution stack.
- Full API typecheck passes, the complete EX5 collection remains green at 74 files and 548 tests, and all 74 effects records are synchronized with zero changes outside EX5.
