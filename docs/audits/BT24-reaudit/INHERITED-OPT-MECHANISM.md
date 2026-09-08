# Inherited Once-Per-Turn Re-entrancy (BT24-009)

The initial retained fixture used BT24-013 as host. BT24-013 itself has the
same inherited hand-trash evolution, so after 009 evolved it to BT24-072 the
newly inherited 013 watcher legitimately evolved again to P-209. This was a
fixture confounder, not an engine re-entrancy defect.

The host is now catalog-verified BT24-010 (Lv4, Dinosaur/Titan/TS, inherited
Raid), which cannot open the duplicate evolution. The normalized test proves
same-turn suppression and reset after a real owner-turn transition. Its first
route reaches BT24-072; the expected memory is 8 after the legal evolution and
the other public play costs. The later route reaches P-209.

Instrumentation also confirmed BT24-009's stable key is marked before the
watcher body awaits, and later hand-trash events observe a non-zero subtrigger
ledger. No engine change is required.

Verification: `pnpm --filter @aegis/api exec vitest run
src/cards/BT24/BT24-009.test.ts --maxWorkers=1 --no-file-parallelism` — 16
passed previously; the completed card suite now reports 18 passed, including
the suppression/reset case. `git diff --check` is clean.
