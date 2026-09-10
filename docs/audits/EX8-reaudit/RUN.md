# EX8 Re-audit Run Log

## 2026-09-10 start

- Worktree: `audit-ex8-luna-20260910`
- Base: `2c851acd73948611728b9c7e2c3c785d98b1087a` (`origin/main`)
- Inventory: 74 catalog cards, 74 modules, 74 focused test files.
- Initial `@ts-nocheck` count: 71 card modules.
- Registration inventory: all 74 modules use `registerIrCard`; no `registerCard` registration found.
- Resource guard: 16 GiB RAM host, 9.1 GiB free disk at start; at most two Luna workers alongside the coordinator, focused tests serialized with one worker, no concurrent collection/typecheck runs.
- Historical `docs/audits/EX8-AUDIT.md` is context only; no prior score is inherited without fresh evidence.

## Restart checkpoint

- Pending: focused collection baseline and API typecheck, to be run serially after worker dispatch is stable.

## Accepted cards

- EX8-001: worker focused 6/6; coordinator focused rerun 6/6 in 657 ms. Invalid Digi-Egg security fixture replaced; legal hatch/evolution/battle and reset proof added; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-002: worker focused 6/6; coordinator focused rerun 6/6 in 551 ms. Fixture/injected-timing scan clean, exclusive IR registration retained, and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-003: worker focused 6/6; coordinator focused rerun 6/6 in 552 ms. Invalid Digi-Egg security fixtures replaced, fixture/injected-timing scan clean, exclusive IR registration retained, and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-004: worker focused 7/7; coordinator focused rerun 7/7 in 563 ms. Invalid Digi-Egg security fixtures and unsafe host corrected; optional refusal, duration, evolution, and reset evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-005: worker focused 7/7; coordinator focused rerun 7/7 in 563 ms. Catalog and legal hatch/evolution/battle stack evidence accepted alongside Mineral/Rock boundaries; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-006: worker focused 9/9; coordinator focused rerun 9/9 in 665 ms. Invalid Digi-Egg security fixtures replaced; NSo, payment, level, reset, and legal off-color stack evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-007: worker focused 13/13; coordinator focused rerun 13/13 in 588 ms. Catalog, Ryutaro-only search, normal-color evolution, and rejection evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-008: worker focused 6/6; coordinator focused rerun 6/6 in 607 ms. Legal inherited stack, NSo evolution boundaries, deletion memory, and DP expiry accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-009: worker focused 14/14; coordinator focused rerun 14/14 in 637 ms. Search categories, evolution, reset, and Q3874 simultaneous-deletion evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-010: worker focused 7/7; coordinator focused rerun 7/7 in 557 ms. Exact DP deletion bounds, legal NSo evolution, and inherited stack evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-011: worker focused 11/11; coordinator focused rerun 11/11 in 586 ms. Security battle-end play, DP expiry, inherited DP, and normal/alternate evolution evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-012: worker focused 12/12; coordinator focused rerun 12/12 in 636 ms. Exact IR, Q3875, recovery, inherited stack, and once-per-turn reset evidence accepted; `stackGate` typed and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-013: worker focused 6/6; coordinator focused rerun 6/6 in 713 ms. Catalog, standard/alternate evolution, security-check, and inherited-turn evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-014: worker focused 12/12; coordinator focused rerun 12/12 in 844 ms. Q3876/Q3952, Fortitude, suspension/deletion, evolution, refusal, and inherited combat evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
- EX8-015: worker focused 7/7; coordinator focused rerun 7/7 in 607 ms with no timeout. Catalog, deck-return protection, expiry, boundaries, legal stack, and neutral historical fixture evidence accepted; exclusive IR registration retained and `@ts-nocheck` removed. Accepted at 8/10 pending collection gates.
