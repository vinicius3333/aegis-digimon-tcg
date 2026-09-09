# EX9 re-audit run

## 2026-09-09 start

- User requested a fresh worktree/branch and Luna workers for a complete 74-card audit.
- Orca created `audit-ex9-luna-20260909` from `origin/main` at `23eee9e5a5c55baab8d21207b14f4cf752e432a6`.
- Historical EX9 audit claims are not inherited; all 74 ledger rows start Queued.
- User model preference overrides the skill default: Luna workers handle the card lanes.
- Baseline collection, mechanism suite, typecheck, and persisted-IR checks are pending.

## Baseline measured before worker acceptance

- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused.
- The first collection attempt raced the shared build and failed to resolve `@aegis/shared`; it is not a behavioral failure.
- Initial `effects:check:set`: red; the committed EX9 persisted effects were stale.
- `pnpm effects:sync:set -- --set EX9 --base 23eee9e5a5c55baab8d21207b14f4cf752e432a6`: 74 records synchronized; one EX9 semantic change; zero semantic or byte changes outside EX9.
- Serial EX9 collection after the shared build: 77 files / 924 tests passed.
- Baseline engine mechanisms: 127 files / 2048 tests passed. The AD1-002 unsupported-effect log line is asserted behavior inside a green suite.
- Serial workspace typecheck: exit 0 for shared, API, and web.
- Dispatched Luna A/B/C for EX9-001/002/003 respectively.

## Closing gates before publication

- Recalculated coverage: 74 catalog cards, 74 modules, 74 direct test files, 74 evidence reports, and 74 unique `registerIrCard` registrations.
- Static policy scan: no EX9 `registerCard`, focused `skip`/`only`/`todo`/`fails`, injected timing, or debug/probe residue.
- Persisted IR sync/check against base: 74 EX9 records synchronized; two EX9 semantic changes (the stale baseline record and corrected EX9-065); zero semantic or byte changes outside EX9.
- Final EX9 collection: 77 files / 979 tests passed.
- Final engine mechanisms: 127 files / 2048 tests passed. The AD1-002 unsupported-effect log line remains asserted behavior inside a green suite.
- Serial workspace typecheck with a 4096 MB heap: exit 0 for shared, API, and web.
- Changed TypeScript files: Oxlint exit 0; Oxfmt check exit 0 for 68 files; `git diff --check` exit 0.
- The repository does not define the quality-gate skill's `quave-check-ci` script. Its nearest repository-wide substitute, `pnpm check:cards:style`, remains red on 273 pre-existing files across unrelated BT/LM/ST collections. No unrelated formatting was changed; the scoped EX9 checks above are green.
- Delivery credit, atomic commits, remote publication, and final independent review remain pending.

## Independent final review

- Luna reviewer approved the scoped final diff with no Critical, Important, or Minor findings.
- Reviewer reconfirmed EX9-065 payment semantics and 17/17 focused tests, 77 files / 979 collection tests, exclusive `registerIrCard`, no forbidden test controls or injected timing, legal fixtures, 74 unique ledger rows, and 74 primary reports.

## Publication and completion

- Implementation/effects commit: `6c20a4e8d` (`Correct EX9 persisted card behavior`).
- Behavioral proof commit: `5d43f3ae2` (`Strengthen EX9 behavioral coverage`).
- Published branch `audit-ex9-luna-20260909` to `origin` before awarding delivery credit.
- Recalculated ledger after green gates and publication: 740/740; 74/74 cards at reproducible 10/10.
- Final evidence commit: `ac03ac140` (`Document complete EX9 re-audit`).
- A final publication-receipt commit records this SHA; remote SHA equality is verified after that commit is pushed.
