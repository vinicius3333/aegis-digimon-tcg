# BT23 run evidence

## Source baseline

Base commit: a924de971e0b43ad9ebd8f82a454d495ff880a60. Dependencies installed with pnpm install --frozen-lockfile; shared build passed. An initial build before dependency installation failed with tsc: command not found, resolved by the locked install.

| Source | SHA-256 |
| --- | --- |
| packages/shared/src/cards/data/cards.json | 5ee50cb2b4547fd5854e42e2b39918df557674aa6746a674c54b338a01ded054 |
| data/kb/qa.json | 0d5af3f992ae307f1bc1a013bdede1514972db8bd32b682c73351fbbc0733b66 |
| data/kb/errata.json | 0a6adfac52d6bf5cb2f12681e21ba5c455be9ac812799308527e8ee1786fa203 |
| data/kb/banlist.json | c1f7ee4f9443398e2939651fd792aa9b055ff7f17f65689fbaae37debf8a35c1 |
| data/kb/rules/comprehensive.md | 19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6 |
| data/kb/rules/manual.md | 861b699271626135db1a30d9a4242e386c4050addf1f62e10f0c00627e565119 |
| data/kb/rules/glossary.md | d5b1947794c3287eaf66321fa9b920172d1fb9f74904898add757b2b82c76811 |

## Initial inspection

102 catalog cards, 102 direct modules, 102 colocated tests. No direct BT23 module calls registerCard. 47 focused files include injected timing APIs, requiring clause-specific review of natural-origin proof. 95 modules contain pre-existing @ts-nocheck; typecheck alone cannot establish card IR correctness.

## Execution log

Full collection baseline and set-scoped persisted-effects check running. Logs: /tmp/bt23-astra-audit/baseline.log and /tmp/bt23-astra-audit/effects-baseline.log. Final command summaries will be persisted here.

Baseline: pnpm --filter @aegis/api exec vitest run src/cards/BT23 src/engine/deckCardAuditBT23.test.ts --maxWorkers=1 --no-file-parallelism => 104 files, 986 tests passed in 47.66s.

Set check attempt: pnpm effects:check:set -- --set BT23 --base a924de971e0b43ad9ebd8f82a454d495ff880a60 failed TS5033 ENOSPC while emitting apps/api/dist/accounts/AccountStore.bootstrap.test.d.ts. Removed only this checkout generated API .map artifacts (6664 files, 8464951 logical bytes); disk subsequently recovered from 117MiB to 570MiB. Retrying the unchanged official set-scoped script.

First review: returned BT23-001–006 for missing legal evolution transitions, once-per-turn reset, and specific natural-origin proof. Existing green tests do not establish full scores.

Effects check retry completed build and failed: BT23 effects.json records are stale. Full baseline catalog-sync equality passed, so inspect formatting/canonicalization before claiming a semantic change. Official set-scoped sync then failed at its 30000ms formatter timeout; no catalog mutation occurred.

Set-scoped synchronization and check now passed after capacity recovered: pnpm effects:sync:set -- --set BT23 --base a924de971e0b43ad9ebd8f82a454d495ff880a60; pnpm effects:check:set -- --set BT23 --base a924de971e0b43ad9ebd8f82a454d495ff880a60. Both reported zero semantic changes and zero semantic or byte changes outside BT23. The sync normalizes BT23 record formatting only (102 records). Logs: /tmp/bt23-astra-audit/effects-sync-retry.log and effects-check.log.

Coordinator review checkpoint: accepted focused evidence for BT23-001, 002, 004, 005, 006, 007 at 8/10; final collection gates remain pending. BT23-004–006 integration: 3 files, 20 tests passed. BT23-002: 6 tests passed.

Strengthening final-state assertions exposed false-positive tests: BT23-003 reset test previously awaited suspension without asserting it; adding explicit suspension assertions fails on the first attack. Combined 002/003 rerun: 1 file passed, 1 failed; 13 passed, 1 failed. No current acceptance for 003.

Link integration with stronger preconditions and exact zone assertions: 5 files, 77 passed, 3 failed. Two failures are the same linkState test imported by the conformance suite: the setup leaves a trim decision unresolved and both links remain; the third is absent seeded Piercing before replacement. Worker fixture corrections are pending. The DP production fix is not committed or declared verified. Log: /tmp/bt23-astra-audit/link-integration.log.

Coordinator checkpoint: BT23-008 exact-name and mandatory restack-cost fixes committed; its additional public DNA/re-exposure reset proof remains in review. BT23-016 exact Eri Karan filtering and public evolution/source assertions, plus BT23-017 public costed play/refusal and production-turn lifecycle, passed 2 files / 17 tests and were committed.

Link integration resolved the earlier red probes. The original seeded host was incorrectly face-down, and continuous-only keyword observation missed dedicated Piercing modifiers; corrected fixtures use public play and projected permanent keywords. A real second bug remained: newly-linked tracking survived an in-limit rule check, causing a later link to trash the new card. Commit e828f1289 expires that tracking at the rule-check fixpoint and refreshes linked DP/keywords after actual trash movements. Coordinator command `pnpm --filter @aegis/api exec vitest run src/cards/BT23/BT23-009.test.ts src/engine/linkState.test.ts src/engine/ruleProcess.test.ts src/engine/conformance/ch10-link.test.ts src/engine/subTriggerSeams.test.ts --maxWorkers=1 --no-file-parallelism` passed 5 files / 69 tests in 9.97s. Applicable Oxlint completed with one test-only explicit-any warning, then the cast was narrowed; Oxfmt and git diff --check passed. Final collection gates remain pending.

BT23-018 corrected exact-name selection and mandatory processing cost passed 1 file / 7 tests (10.48s), with a legal level-5 inherited host and explicit chosen-card arrival. Committed ff59d98af; scored 6/10 because natural Jamming, alternate evolution boundaries, and independent re-exposed frequency rejection remain incomplete.

Further independent review invalidated BT23-008's first new frequency proof: reduced Agumon play crossed memory, so repeat Greymon declaration failed with not-your-turn. Added explicit endPhase/turn assertions exposed this (pair result 17 passed, 1 failed); worker is removing eligible play cards from that isolated lifecycle and must prove active own turn before frequency rejection. Do not credit the earlier worker-green lifecycle as frequency evidence.

BT23-003 live gate instrumentation corrects the earlier worker assertion that no watcher armed: consumed=false, tracker=0, context present, matches=true, canFire=true. The pending trigger is lost before dispatch; serialized engine diagnosis continues. No implementation fix is claimed yet.

Checkpoint after 2d3da8a4c: Greymon corrected public DNA/turn proof passed the 008/018 pair (18 tests) and committed 577122c20. Garudamon mixed CS/Sea Animal cloned-definition boundary passed 10 tests and committed 615831ea4. Gekomon exact cross-host choices, off-color CS evolution, bonus draw, and real Blocker combat passed 8 tests and committed bb40da6cd. Seadramon Alliance acceptance/refusal, public opponent-turn suspension, same-turn cap and actual next-turn draw, and alternate evolution boundaries passed 11 tests (2.99s) and committed 2d3da8a4c. Aggregate recalculated across 102 rows to 126/1020; 0 cards at final 10/10.

Motimon diagnosis correction: the public Option was submitted while the start-of-main window was still resolving (OnUseOption entered with wasOutermostWindow=false, activeWindowToken=2). A pre-play readiness barrier resolves the natural trigger; an after-play delay cannot repair the raced event. Testkit readiness now deterministically waits for the resolving window to finish. The production Main-action guard and held start-main mechanism regression are under review; no intrinsic Option queue failure is claimed.

App Fusion investigation: committed comprehensive rules §8-4-3-3 require moving a selected linked material into the evolution stack, then drawing. Dosukomon's Eri-driven public fixture exposed a missing link-material movement. Optional follow-up Link must be declined before assessing the fusion stack. This shared primitive correction is in progress, and BT23-021 remains incomplete.

Temporary execution sessions/logs were not retained across the latest continuation; authoritative workspace edits/commits remain. New local logs use docs/audits/BT23-reaudit/logs, with command/result summaries persisted here and in per-card reports. Final set sync/check, typecheck, collection and style gates remain outstanding.

Main readiness integration committed 5e13ae16c after 21 files / 361 timing and combat tests passed. The held start-main regression is red without the guard and green with it; independent review found no production regression. Garurumon final focused proof committed 56c9bd237 after the 008/018 pair passed 21 tests with both physical-source orders. Ledger now 128/1020, still 0/102 at final 10/10.

Motimon coordinator rerun passed 1 file / 9 tests in 0.794s, with exact second Option arrival, own-turn memory, refusal payment/draw, and real turn-loop reset assertions. Applicable Oxlint, Oxfmt and diff check passed. Ledger recalculated to 136/1020; no final 10/10 cards. Origin was confirmed at 2c4d744b6 before this integration.

Interim `pnpm typecheck` failed in API test files BT23-005 (private cardSourceOf access), BT23-015 (new missing observe import), BT23-019 (array index optional types) and BT23-021 (decision option fields not narrowed). Shared and web typechecks passed. Corrections use the existing observe.cardSource interface, explicit tuples, required imports and decision guards. Rerun remains pending; no final gate credit.

Interim type fixes completed: shared/web passed in the workspace runs, and `pnpm --filter @aegis/api typecheck` passed after replacing the private helper with observe.cardSource, narrowing fixed-length arrays, importing observe, and guarding optional decision fields. The first retry read the earlier decision-field edit, and the next API retry exposed tuple literal/readonly incompatibilities; those were corrected with explicit mutable string tuples. Logs: typecheck-interim.log, typecheck-interim-retry.log, typecheck-api-finalfix.log, typecheck-api-tuplefix.log.

Set-scoped synchronization and verification passed: `pnpm effects:sync:set -- --set BT23 --base a924de971e0b43ad9ebd8f82a454d495ff880a60` and corresponding `effects:check:set`. Both report 3 semantic changes relative to baseline, zero semantic or byte changes outside BT23, and all 102 records synchronized. The changes persist the committed 008/016/018 exact-name/processing-cost corrections. Logs: effects-sync-interim.log, effects-check-interim.log. Final closeout gates remain pending as the collection audit continues.

Coordinator App Fusion material integration passed 9 files / 423 tests in 3.39s: 005, 014, 019, 021, 079 plus ch08-digivolution, linkState, primitives and interpreter suites, one worker/no file parallelism. Committed test type fixes eca53901d, Gallantmon exact public restriction/expiry proof c7a0ecf3e, App Fusion material choice/movement b3576d4e2, and set-scoped persisted effects 86c170cf2. Applicable formatter and diff checks passed; Oxlint has only noted test conditional-expect and legacy explicit-any warnings. Ledger recalculated across all 102 rows to 144/1020, still 0 final 10/10 cards. App Fusion general action/modifier support and remaining card proof are not complete.

Further coordinator integration: Gallantmon uses legal memory 10 and real automatic memory-crossing turn end (11 tests, 2.30s; 1f1e62be1). Jesmon and Phoenixmon passed 2 files / 26 tests in 2.64s and committed ce01adf06 / dd8a5a6d5. Jesmon's above-limit hard-play fixtures were replaced with legal board fixtures, with Rush separately proven via public Huckmon play and cost-5 conditional evolution at memory 10 -> 2. Dosukomon's corrected shared-use and immunity lifecycle passed the 021/025 pair (21 tests, 2.16s) and committed 739647cb8. Oujamon's two security checks, Raid, realistic source stacks, and exact next-turn link replacement passed 10 tests in 1.97s and committed 4e924bdc3. The earlier Oujamon opponent-Main timeout was an auto-pass from a fixture with no legal opponent actions, not an engine defect. Ledger independently summed across 102 rows: 174/1020; zero final 10/10 cards.

Serialized backend App Fusion work is assigned to Luna C. A first public intent and explicit material path with four focused tests are in progress; cost modifiers, restrictions, full digivolution watcher lifecycle, client exposure and broader validation are still outstanding. Shared engine/protocol changes are uncommitted pending review. Luna A owns 025/026 remaining precise Security/duration/evolution proof; Luna B owns 023 replacement frequency and stack comparisons. The collection remains incomplete.
