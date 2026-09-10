# EX1 re-audit run log

- Set: `EX1`
- Base: `e66ac37dbb3c649a74678e9926edd722b8735066` (`origin/main`)
- Branch: `audit-ex1-luna-20260909`
- Started: 2026-09-09 America/Sao_Paulo
- Scope: 73 catalog cards (`EX1-001` through `EX1-073`)
- Concurrency policy: coordinator plus at most two Luna card lanes; workers run focused tests only with `--maxWorkers=1 --no-file-parallelism`; collection and typecheck gates are coordinator-only and serialized.
- Resource checkpoint: 16 GiB physical RAM, compression/swap active, about 4 GiB free memory and 8.6 GiB free disk before setup. Setup hooks were skipped and the offline pnpm store was reused.

## Restart checkpoint

- Fresh independent Orca worktree created from `origin/main` at the base SHA above.
- Static inventory: 73 catalog entries, 73 direct modules, 73 colocated focused tests, 81 total EX1 test files, 72 `// @ts-nocheck` directives, and no `registerCard` registration in EX1.
- Dependency bootstrap: `pnpm install --offline --frozen-lockfile` passed with 423 cached packages and zero downloads.
- Invalid infrastructure attempt: the directory filter `src/cards/EX1` matched EX10/EX11/EX12 by prefix while `@aegis/shared` was not built. It is not card evidence.
- Shared build passed.
- Fresh exact collection baseline from `apps/api`: `pnpm exec vitest run src/cards/EX1/*.test.ts --maxWorkers=1 --no-file-parallelism` passed 81 files and 381 tests.
- Fresh root `pnpm typecheck` passed for shared, API, and web.

## Checkpoints

- Continuation checkpoint after commit `ac36ffe90`: worktree clean, ledger 112/730 with EX1-001 through EX1-014 audited, 58 `@ts-nocheck` directives remaining, prior exact collection 411/411 and root typecheck green, 9.3 GiB disk available, and no Vitest/typecheck process active before dispatch.
- Re-audit protocol initialized. Two bounded Luna lanes start with EX1-001 and EX1-002; no broad test may run in a worker.
- EX1-001 accepted after a fresh coordinator rerun passed 4/4. The fixture/registration/timing sweep found no invalid security/deck fixture, injected timing, legacy registration, or remaining `@ts-nocheck`; its report scores 8/10 pending delivery gates.
- EX1-003 was initially rejected because three security fixtures used the Digi-Egg BT1-001. After correction to inert main-deck fixtures, the fresh coordinator rerun passed 4/4 and all sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-002 was initially held at 7/10 for missing next-own-turn reset proof, then rejected again for six Digi-Egg security fixtures. After both corrections, the fresh coordinator rerun passed 7/7 and all sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-005 accepted after a fresh coordinator rerun passed 12/12, including live Q2082/Q2480 interaction proof. Invalid Digi-Egg deck fixtures were corrected and all structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-004 accepted after a fresh coordinator rerun passed 7/7, including illegal-source rejection and public next-turn once-per-turn reset. Security fixtures and all structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-006 accepted after a fresh coordinator rerun passed 7/7, including Q3195 timing, illegal evolution, and public next-own-turn reset. Security fixtures and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-007 accepted after a fresh coordinator rerun passed 10/10, including up-to targeting boundaries, red/black legal stacks, and illegal-source rejection. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-008 accepted after a fresh coordinator rerun passed 14/14, including Q3196/Q3197, red/black evolution stacks, and mixed trait boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-009 accepted after a fresh coordinator rerun passed 6/6, including Q3198/Q3199 and effect-granted Blocker deletion. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-010 accepted after a fresh coordinator rerun passed 5/5, including Q3200 and legal/illegal evolution route boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-011 accepted after a fresh coordinator rerun passed 8/8, including Q3201/Q3202, exact/non-blue/name boundaries, bottom ordering, once-per-turn reset, and legal evolution. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-012 accepted after a fresh coordinator rerun passed 5/5, including controller, zone, bottom-source, legal-evolution, and illegal-source boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-014 accepted after a fresh coordinator rerun passed 8/8, including Jamming, Free/Imperialdramon branches, real Security battle, controller and legal/illegal evolution boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-013 accepted after a fresh coordinator rerun passed 6/6, including Q3203, once-per-turn reset, and public evolution-stack proof. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- Batch checkpoint EX1-001 through EX1-014: exact collection passed 81/81 files and 411/411 tests; root typecheck passed for shared, API, and web. This is a checkpoint only, not collection completion.
- EX1-015 accepted after a fresh coordinator rerun passed 8/8, covering exact-name/cost/refusal, once-per-turn, legal stack/inherited resolution, and illegal-source boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-016 accepted after a fresh coordinator rerun passed 7/7, covering stackless attack permission plus stack, suspension, controller, breeding, turn, and legal/illegal evolution boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-017 accepted after a fresh coordinator rerun passed 6/6, covering exact hand threshold, legal/illegal evolution, and public next-own-turn once-per-turn reset. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-018 accepted after a fresh coordinator rerun passed 9/9, covering exact bottom-source selection, controller/zone boundaries, and legal/illegal evolution routes. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-019 accepted after a fresh coordinator rerun passed 9/9, covering Q3204-Q3206, Free-source, Blocker, controller/turn, and legal/illegal evolution boundaries. Its worker typecheck briefly observed EX1-020 mid-edit; EX1-020's final API typecheck passed after that concurrent edit completed. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-020 accepted after a fresh coordinator rerun passed 12/12, covering source/controller/zone boundaries, optional refusal, next-own-turn reset, attack permission, and legal/illegal evolution. Its final API typecheck and structural sweeps passed; its report scores 8/10 pending delivery gates.
- EX1-020 acceptance was revoked after the authoritative post-lane API typecheck reported `EX1-020.ts:15` missing required `DrawAction.controller`. The row is 7/10 pending a faithful typed-IR correction and fresh focused/typecheck proof.
- EX1-021 accepted after a fresh coordinator rerun passed 9/9, covering Q3207/Q3208, hand thresholds, inherited deletion behavior, legal evolution/source movement, and missing-condition negatives. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-022 accepted after a fresh coordinator rerun passed 9/9, covering Q3209, color deduplication, distinct-color scaling, normal/DNA evolution routes, exact costs/draws/stack identity, and invalid routes. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-020 promoted back to 8/10 after adding the required `controller: "mine"` to its Draw 2 action. Fresh coordinator proof passed 12/12 and the authoritative API typecheck passed with no diagnostics.
- EX1-023 accepted after a fresh coordinator rerun passed 4/4, covering real deletion/security attack plus controller, kind, duration, and inherited-top-card boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-024 accepted after a fresh coordinator rerun passed 9/9. The IR was corrected from fixed bottom ordering to `deckBottomAnyOrder`, matching the printed reveal remainder semantics; Angel-family alternatives, arbitrary order, mandatory behavior, and legal/illegal evolution routes are proven. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-025 accepted after a fresh coordinator rerun passed 6/6, covering security threshold/controller ownership, inherited boundary, legal/illegal evolution, same-turn OPT refusal, and next-own-turn reset. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-026 accepted after a fresh coordinator rerun passed 7/7, covering Q3210 threshold persistence, target/controller, once-per-turn, duration, evolution routes, and inherited-top boundary. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-027 accepted after a fresh coordinator rerun passed 5/5, covering Q3211 through real Security battles with exact post-check counts, controller/survival/deletion, and legal/illegal evolution boundaries. Fixture and structural sweeps were clean; its report scores 8/10 pending delivery gates.
- EX1-028 accepted after a fresh coordinator rerun passed 7/7, covering Q3212 persistence, threshold/controller, duration, once-per-turn reset, legal/illegal evolution, and inherited-top boundary. Its worker-bounded typecheck was interrupted, so the coordinator batch typecheck below is required before commit; fixture and structural sweeps were clean.
- Batch checkpoint EX1-015 through EX1-028: exact collection passed 81/81 files and 458/458 tests; root typecheck passed for shared, API, and web, closing the EX1-020 transient/real type correction and EX1-028 bounded-worker gap. This is a checkpoint only, not collection completion.
