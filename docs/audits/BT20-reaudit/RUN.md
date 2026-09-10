# BT20 re-audit run

## 2026-09-10 start

- Fresh Orca worktree `audit-bt20-luna-20260910` created from `origin/main` at `5b3d42c9680a40dd094444d18fdd5d58c8184358`.
- Historical BT20 scores are not inherited. Current evidence must be independently reproduced.
- User requested Luna workers; this overrides the audit skill's default worker model.
- Machine guardrails: 16 GiB RAM, low disk headroom, at most three Luna workers, focused tests single-worker, broad tests and typecheck serialized by the coordinator.
- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused and no downloads.
- `pnpm --filter @aegis/shared build`: exit 0.
- `pnpm effects:check:set -- --set BT20 --base 5b3d42c9680a40dd094444d18fdd5d58c8184358`: 102 records synchronized, zero BT20 changes, zero semantic or byte changes outside BT20.
- Baseline BT20 collection: 103 files; 958 passed and 4 failed. Failures: BT20-003 (one stale `orderTriggers` milestone) and BT20-028 (three assertions target permanents already removed from the board).
- Workspace typecheck did not run because the chained baseline stopped at the red collection gate.

## First accepted lanes

- BT20-003: corrected an impossible no-Tamer fixture; coordinator reproduced 6/6 focused tests.
- BT20-028: corrected source-stack/De-Digivolve fixtures and assertions; coordinator reproduced 12/12 focused tests.
- BT20-005: replaced an illegal Digi-Egg deck fixture; coordinator reproduced 5/5 focused tests.
- BT20-084: corrected exact Sistermon Ciel evolution matching, added controller boundaries, and replaced an illegal Digi-Egg fixture; coordinator reproduced 12/12 focused tests.
- BT20-095: restricted the Security play target to Chronicle Digimon and added a non-Digimon negative; coordinator reproduced 15/15 focused tests.
- Catalog BT20-098 was corrected locally from the pre-errata “up to 9” text to the authoritative exact-9 errata supported by Q4439.
- Static triage confirmed 102/102 exclusive `registerIrCard` registrations and zero TypeScript suppression directives, while identifying remaining illegal fixtures, exact-name risks, and injected-timing proof gaps for subsequent card lanes.

## Re-audit checkpoint — 27 cards

- Ledger: 216/1020 provisional; 27/102 cards independently scored 8/10 with delivery gates pending.
- Every accepted card has a per-card report and a coordinator-reproduced focused suite.
- Exact-name IR corrections accepted for BT20-007, BT20-010, BT20-012, BT20-015, BT20-076, and BT20-084; BT20-008/013/014 name-containing wording was independently confirmed to require substring matching.
- BT20-011 now explicitly sources its DNA destination from hand; Q6017 proof confirms the `then` clause continues after ExVeemon leaves without incorrectly making the removed ExVeemon a DNA material.
- BT20-091 no longer uses injected timing or manual DP mutation; its watcher/replacement proof follows public turn/evolution/play flows.
- Illegal deck/security Digi-Egg fixtures were removed from accepted lanes including BT20-002, 005, 011, 013, 045, 057, 067, 069, 075, 076, 081, 084, 090, and 091.
- Worker-proposed tests that encoded false engine assumptions were rejected and corrected: alternate-route requests may legally fall back to a normal route (BT20-010/069), and a removed ExVeemon is not later materialized by Q6017 (BT20-011).

## Re-audit checkpoint — 47 cards

- Ledger: 376/1020 provisional; 47/102 cards independently scored 8/10 with delivery gates pending.
- BT20-016 through BT20-036 are fully re-reviewed except BT20-028, which was accepted in the first checkpoint; all focused suites are coordinator-reproduced green.
- Natural-flow rewrites uncovered and corrected stale assumptions about normal security checks (BT20-021), token removal rather than trash placement (BT20-017), attack legality/OPT reset (BT20-018/027), and printed evolution costs (BT20-036).
- Additional exact-match corrections landed for BT20-016, 022, 023, 024, 025, 027, 029, and 032.
- BT20-027 required a second rejection cycle because its first reported repair did not change the failing behavior; acceptance occurred only after the actual 18/18 focused command passed.

## Collection closeout — 102 cards

- Ledger reached 816/1020 before delivery gates: 102/102 cards independently scored 8/10 with a per-card report and coordinator-reproduced focused suite.
- BT20 collection gate: 103/103 files and 1035/1035 tests passed with one worker and no file parallelism.
- Engine mechanism gate: 137/137 files and 2070/2070 tests passed with one worker and no file parallelism.
- Workspace typecheck passed after strict typing corrections in audit tests.
- Static guards passed: 102 exclusive `registerIrCard` modules, zero `registerCard`, zero TypeScript suppressions, and clean `git diff --check`.
- Effects reconciliation synchronized 102 records and reported 37 semantic BT20 changes with zero semantic or byte changes outside BT20 against base `5b3d42c9680a40dd094444d18fdd5d58c8184358`.
- Atomic implementation commit `e540204fb` and evidence commit `b8ac12279` were pushed to `origin/audit-bt20-luna-20260910`; local and remote SHA both resolved to `b8ac12279665922d3184f94c024983979bc5b308` before delivery gates were awarded.
- Delivery gates were awarded collection-wide after the green collection, mechanism, typecheck, lint, format, manifest, and static checks plus the verified push. The ledger is 1020/1020 with 102/102 cards at 10/10.
- The final closeout evidence commit and Orca completion are the only remaining administrative steps at this checkpoint.
