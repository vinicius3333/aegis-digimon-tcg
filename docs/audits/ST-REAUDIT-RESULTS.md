# Starter deck audit results

Date: 2026-09-05. Branch: `audit-st-20260905`. Draft PR: [#4716](https://github.com/vinicius3333/aegis-digimon-tcg/pull/4716).

All **343 cards across 23 collections** have recalculated **10/10 audit evidence scores**, with printed-clause review, direct compiled IR and green resolved behavior. ST11 has no distinct card IDs in the committed catalog. The [per-card evidence ledger](ST-REAUDIT-EVIDENCE.json) records each score component and links its module, focused test and reviewed clause report.

| Collection                  | Cards | Reviewed 10/10 | Test files | Tests |
| --------------------------- | ----: | -------------: | ---------: | ----: |
| [ST1](ST1-PROOF-AUDIT.md)   |    16 |          16/16 |         18 |    45 |
| [ST2](ST2-PROOF-AUDIT.md)   |    16 |          16/16 |         18 |    53 |
| [ST3](ST3-PROOF-AUDIT.md)   |    16 |          16/16 |         19 |    44 |
| [ST4](ST4-PROOF-AUDIT.md)   |    16 |          16/16 |         19 |    37 |
| [ST5](ST5-PROOF-AUDIT.md)   |    16 |          16/16 |         19 |    43 |
| [ST6](ST6-PROOF-AUDIT.md)   |    16 |          16/16 |         20 |    30 |
| [ST7](ST7-PROOF-AUDIT.md)   |    12 |          12/12 |         15 |    33 |
| [ST8](ST8-PROOF-AUDIT.md)   |    12 |          12/12 |         15 |    30 |
| [ST9](ST9-PROOF-AUDIT.md)   |    15 |          15/15 |         17 |    42 |
| [ST10](ST10-PROOF-AUDIT.md) |    15 |          15/15 |         17 |    61 |
| [ST12](ST12-PROOF-AUDIT.md) |    16 |          16/16 |         18 |    96 |
| [ST13](ST13-PROOF-AUDIT.md) |    16 |          16/16 |         18 |    59 |
| [ST14](ST14-PROOF-AUDIT.md) |    12 |          12/12 |         13 |    39 |
| [ST15](ST15-PROOF-AUDIT.md) |    16 |          16/16 |         17 |    53 |
| [ST16](ST16-PROOF-AUDIT.md) |    16 |          16/16 |         17 |    46 |
| [ST17](ST17-PROOF-AUDIT.md) |    13 |          13/13 |         14 |    37 |
| [ST18](ST18-PROOF-AUDIT.md) |    15 |          15/15 |         16 |    62 |
| [ST19](ST19-PROOF-AUDIT.md) |    15 |          15/15 |         16 |    76 |
| [ST20](ST20-PROOF-AUDIT.md) |    15 |          15/15 |         16 |    90 |
| [ST21](ST21-PROOF-AUDIT.md) |    15 |          15/15 |         16 |    74 |
| [ST22](ST22-PROOF-AUDIT.md) |    14 |          14/14 |         19 |    68 |
| [ST23](ST23-PROOF-AUDIT.md) |    15 |          15/15 |         16 |    64 |
| [ST24](ST24-PROOF-AUDIT.md) |    15 |          15/15 |         16 |    60 |

The collections account for **389 files / 1242 tests**. The final combined run passed **440 files / 1955 tests**, including **51 additional files / 713 tests** for conformance and affected mechanisms. There were no failures or skipped test cases in the final report.

## Delivered corrections

- Play-cost reduction prohibitions prevent activation costs from being paid (Solarmon/ST12-03); unrelated effects remain available.
- Granted deletion effects retain the departing host's identity through effect and battle deletion, including ST16-15 after evolution.
- Printed and live granted Vortex attacks are scheduled at the actual end of the owner's turn, with refusal, grant loss and simultaneous timing-order evidence.
- ST2-01 recognizes its own host being blocked by a source-less opponent. ST12-11 selects exact Huckmon or Sistermon-name cards. ST17-11 excludes non-green Tamers.
- ST20/ST21 ADVENTURE watchers inspect the triggering Digimon; ST21-04's attack stays inside the intended play/evolution trigger.
- Stored Options retain their own conditional color waivers. ST22-04/ST22-06 restrict use to hand or under Tamers and accept the printed trait alternatives. ST22-11 links correctly and keeps Reboot/+3000 DP on one chosen recipient.
- Resolved proofs cover costs, optional refusal, legal inherited hosts, Counter, Alliance, Reboot, Barrier, Raid, Fortitude, Retaliation, Delay, expiry, exact zones and collection boundaries.

## Validation and test discipline

```text
TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run src/cards/ST src/engine/conformance src/engine/combat src/engine/effects/kernel.test.ts src/engine/useOption.test.ts src/engine/continuousColor.test.ts src/engine/effects/overclock.test.ts src/cards/BT26/BT26-045.test.ts src/cards/EX7/EX7-064.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

The final run completed in **61.61 seconds** with a single fork worker and a 3 GB heap ceiling. Earlier combined runs exposed weak fixtures: ST9's inherited +1000 DP was distinct from its temporary boost, ST20's revealed Digi-Eggs were incorrectly placed in a main deck, and an opponent ACE's Overflow changed the final memory after an otherwise correct evolution payment. The corrected ST20 files load the full executable card registry. All affected collections were rerun before the final green combined run.

One earlier typecheck was terminated by the operating system and an earlier JSON export failed with `ENOSPC` while other worktrees were active. Those attempts are not counted as passes. The final serial checks use bounded memory; the successful final JSON was saved and distilled into the committed evidence ledger.

Workspace typechecks, changed-file lint/format, `git diff --check`, atomic commits and branch publication are recorded in the final plan checkpoint. The draft PR preserves the audit branch for review.
