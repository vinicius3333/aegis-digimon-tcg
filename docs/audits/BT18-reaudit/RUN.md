# BT18 independent re-audit run

## Source baseline

- Base commit: `42d06924915650194a474ca826f0b3e81006f826` (`origin/main`).
- Worktree: `audit-bt18-luna-20260910`.
- Started: 2026-09-10 (America/Sao_Paulo).
- Existing BT18 completion reports are treated as historical claims until this run reproduces their evidence.
- Resource policy: at most three Luna card lanes; focused and collection tests use one worker and no file parallelism; broad gates run serially.

## Initial inspection

- Production range present: `BT18-001` through `BT18-102`, with direct modules and focused tests.
- Initial text sweep found no executable `@ts-nocheck` directive and no `registerCard` call under `apps/api/src/cards/BT18`.
- Disk at start: 6.2 GiB available; worktree setup was skipped to avoid another dependency installation.
- Three Luna lanes dispatched: 001-034, 035-068, and 069-102. Each lane is restricted to its card/test/report files and focused serial tests.

## Checkpoints

- Source hashes: catalog `cee507920be1b444cdf8f73f61e9ebfab9d73dfd108b1c6a664380c92293cf77`; Q&A `0d5af3f992ae307f1bc1a013bdede1514972db8bd32b682c73351fbbc0733b66`; errata `0a6adfac52d6bf5cb2f12681e21ba5c455be9ac812799308527e8ee1786fa203`; banlist `c1f7ee4f9443398e2939651fd792aa9b055ff7f17f65689fbaae37debf8a35c1`; comprehensive rules `19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`; manual `861b699271626135db1a30d9a4242e386c4050addf1f62e10f0c00627e565119`; glossary `d5b1947794c3287eaf66321fa9b920172d1fb9f74904898add757b2b82c76811`.
- First focused pass: 102/102 suites executed serially. Three fixture-sensitive failures (BT18-047, BT18-050, BT18-084) were corrected and independently rechecked together: 3 files, 14 tests passed.
- Fixture sweep: 66 colocated tests changed; zero Digi-Egg deck/security/hand fixture hits remain under a multiline audit regex.
- Registration sweep: zero `@ts-nocheck` directives and zero legacy `registerCard` calls under BT18.
- Second-pass result: 102/102 reports accepted at 8/8 worker evidence; coordinator gates bring every card to 10/10.
- Residual expected failures/skips: zero `it.fails`, `it.skip`, `test.skip`, or `describe.skip` under BT18.
- Focused closeout: BT18-001, BT18-005, BT18-016, BT18-081, and BT18-090 passed together (5 files, 20 tests).
- Collection gate: 108 files and 677 tests passed with one worker and no file parallelism.
- Mechanism gate: 137 files and 2070 tests passed across conformance, combat, effects, and engine cards.
- Typecheck gate: shared, API, and web workspaces passed.
- Effect synchronization/check: 102 BT18 records already synchronized; zero semantic changes against the baseline and zero semantic or byte changes outside BT18.
- Style gate: Oxfmt completed on all 66 changed test files; Oxlint completed with no errors (pre-existing warnings remain in BT18-033 and BT18-087); `git diff --check` passed.
