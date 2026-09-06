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
