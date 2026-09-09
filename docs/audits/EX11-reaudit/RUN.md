# EX11 re-audit run

## 2026-09-08 start

- User requested a fresh worktree/branch and Luna workers for the complete 74-card audit.
- Orca created `audit-ex11-luna-20260908` from main `6d54ea4d7bccf9fa3ff13c05e3f163d196a3e01a`.
- Existing September 5 10/10 assertions are historical only; all ledger rows reset to Queued.
- 74 catalog cards and 74 ledger rows verified.
- Dependencies: offline frozen installation in progress. Baseline collection and typecheck pending before dispatch.
- User model preference overrides the skill default (Luna instead of Opus); available concurrency is three worker lanes. Each lane receives one card at a time.

## Baseline measured before worker dispatch

- `pnpm install --offline --frozen-lockfile`: exit 0.
- `pnpm --filter @aegis/shared build`: exit 0.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX11 --maxWorkers=1 --no-file-parallelism`: exit 0; 81 files / 649 tests passed (11.84s). Log: `logs/baseline-collection.log`.
- `NODE_OPTIONS=--max-old-space-size=4096 npm_config_workspace_concurrency=1 pnpm typecheck`: exit 0. Log: `logs/baseline-typecheck.log`.
- Official listing fetched at https://world.digimoncard.com/cards/?category=522034&search=true: 74 distinct base cards parsed. Source reconciliation in progress; raw text diffs include special headers and reminder text and are not automatically defects.

- Baseline mechanism gate: `pnpm --filter @aegis/api exec vitest run src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism`: exit 0; 127 files / 2046 tests (8.42s), `logs/baseline-mechanisms.log`.
- Dispatched Luna A/B/C for EX11-001/002/003 respectively.
- Reset the in-tree card ledger too, so old 10/10 claims do not appear current during the new audit.
- Baseline persisted-IR check: `pnpm effects:check:set -- --set EX11 --base 6d54ea4d7` passed with 74 synchronized records and zero changes outside EX11.
- EX11-009 official-source reconciliation corrected the catalog grammar from `get` to `gets`; executable behavior was unchanged.

## 2026-09-09 closing gates

- `pnpm effects:sync:set -- --set EX11 --base 6d54ea4d7`: 74 records synchronized; one EX11 semantic change; zero semantic or byte changes outside EX11.
- `pnpm effects:check:set -- --set EX11 --base 6d54ea4d7`: passed with the same scope result.
- `pnpm typecheck`: passed for shared, API, and web workspaces.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX11 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism`: 208 files / 2759 tests passed.
- Changed TypeScript Oxlint: passed with four existing `no-explicit-any` warnings in EX11-003; no errors.
- Changed-file Oxfmt check: passed on 84 files.
- `git diff --check`: passed.
- Risk scans: no `registerCard` in EX11 modules, no skipped/pending/expected-failure tests, no temporary debug output, and no illegal Digi-Egg deck/security fixtures.
- All 74 cards reached 8/8 evidence before delivery credit. Initial atomic engine, shared/card, and behavioral-test commits were created; publication and final 2/2 delivery credit follow.
- Branch `audit-ex11-luna-20260908` pushed after four atomic commits. Delivery credit advanced to 2/2 for all 74 cards; aggregate 740/740 and 74/74 cards at 10/10.
