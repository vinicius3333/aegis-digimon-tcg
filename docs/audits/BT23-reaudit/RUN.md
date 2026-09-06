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
