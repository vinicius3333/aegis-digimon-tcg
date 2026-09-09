# EX12 re-audit run log

## 2026-09-08 start

- Base: `main` at `46774c98e8705075e596e5d5977d7498df317886`.
- Branch/worktree: `audit-ex12-astra-luna` in an independent Orca worktree.
- Catalog expectation from the committed EX12 audit gate: 77 cards, EX12-001 through EX12-077.
- Initial collection command could not start because the new worktree had no dependencies (`vitest: command not found`).
- Initial `pnpm typecheck` could not start for the same reason (`tsc: command not found`).
- Recovery: `pnpm install --frozen-lockfile` completed successfully with 423 packages reused from the local store.
- The first post-install collection run raced the shared-package build and observed incomplete `dist` output; it is an invalid environmental run, not a code baseline.
- `pnpm typecheck`: passed after building shared data.
- Clean rerun: `pnpm --filter @aegis/api exec vitest run src/cards/EX12 --maxWorkers=1 --no-file-parallelism`: 79 files and 867 tests passed.
- Ledger row count: 77 rows, matching EX12-001 through EX12-077.
- Existing 10/10 evidence is treated as a claim pending fresh clause-level and behavioral revalidation.

## Lane acceptance

- EX12-001–026: 26 reports accepted; coordinator rerun passed 26 files and 266 tests.
- EX12-027–052: 26 reports accepted after correcting stale aggregate prose; coordinator rerun passed 26 files and 268 tests.
- EX12-053–077: 25 reports accepted after correcting stale aggregate prose; coordinator rerun passed 25 files and 251 tests.
- All 77 modules retain exclusive `registerIrCard(cardId, compiled)` registration. No `registerCard`, skipped/failing tests, injected timing proof, residual node, or executable `RawUnparsed` behavior was found.
- Fixture audit replaced Digi-Egg cards incorrectly used as deck/security filler in EX12-005, -018, -028, -039, -040, -042, -043, -047, -048, -055, -056, -058, -070, and -071 tests. Intentional Digi-Egg stack/trash/breeding cases remain where they prove printed “cards” or digivolution behavior.

## Coordinator gates before commit

- `pnpm effects:sync:set -- --set EX12 --base 46774c98e8705075e596e5d5977d7498df317886`: 77 records already synchronized; 0 semantic changes in EX12; 0 semantic or byte changes outside the set.
- `pnpm typecheck`: passed when run sequentially after the audit lanes finished. An earlier concurrent run was killed by the operating system with exit 137 and is not counted as a code failure.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX12 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism`: 206 files and 2914 tests passed.
- `pnpm effects:check:set -- --set EX12 --base 46774c98e8705075e596e5d5977d7498df317886`: passed; 77 records synchronized and no changes inside or outside the set.
- `pnpm exec oxlint <15 changed TypeScript files>`: passed.
- `pnpm exec oxfmt --check <15 changed TypeScript files>`: passed.
- `git diff --check`: passed.
- The Quave-specific `quave-check` scripts named by the generic quality-gate skill are absent from this repository; the repository's direct Oxlint/Oxfmt changed-file gates above were used.

## Closeout

All 77 cards have 2/2 contract/rules, IR trace, behavioral proof, and peer/stack evidence. Coordinator delivery gates pass. The collection has no open engine seam, catalog correction, residual behavior, registration exception, or score below 10/10. Final delivery consists of one focused test commit and one forced-added audit evidence commit, followed by branch push and review PR.

## Review corrections

- Luna final review rejected the added EX12-004 expiry case because it mutated `turnSeat` directly. The unsupported case and claim were removed; the existing owner/opponent-turn and Q6728 production behavior remain the scored evidence.
- Four invalid evolution-boundary fixtures placed Digi-Eggs directly in the battle area (EX12-038, -049, -053, -061). They now use the legal breeding area and retain the intended rejection proof.
- Focused post-review rerun: 5 files and 36 tests passed with one worker.
- Final EX12 collection rerun: 79 files and 867 tests passed with one worker.
- Structured autoreview then found missing direct proof for EX12-057 Q6857 and EX12-074 Q7190. Both were added through public attack, Counter, and production turn-loop flows.
- Giant Meat/EX12-073 was rechecked from the user's report with EX12-008, a real red `[ME]` Digimon in the battle area. The public `playCard` intent succeeded and the 10-test focused suite passed; no implementation change was warranted.
- Review-focused rerun: EX12-057, -073, and -074 passed 3 files and 29 tests; formatted EX12-074 passed 13/13 again.
- Final post-review EX12 collection: 79 files and 869 tests passed with one worker.
