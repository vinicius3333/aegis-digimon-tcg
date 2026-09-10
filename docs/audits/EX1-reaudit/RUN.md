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
