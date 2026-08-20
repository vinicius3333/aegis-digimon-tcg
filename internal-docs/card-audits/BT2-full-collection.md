# BT2 full-collection audit ledger

Scope: `BT2-112` down through `BT2-001`, audited individually on 2026-08-20
with Luna medium. The committed catalog is
`packages/shared/src/cards/data/cards.json`; the local KB command was run
separately for every ID with exit status 0; direct implementations and
co-located tests are under `apps/api/src/cards/BT2/`. The compiled IR is the
`CompiledCard` registered by each module (or the absence of a module for a
vanilla card with no effect text).

## Rubric and gates

For every row, the ten review points were checked in this order: (1) catalog
identity/stats, (2) KB/rulings, (3) clause-to-code mapping, (4) requirements,
traits, and colors, (5) costs and failure paths, (6) controller/target scope,
(7) zones/order/face, (8) timing/OPT/duration/interactions, (9) UI/decision
surface, and (10) executable proof and repository gates. Points 1–9 are
recorded as static evidence below; point 10 is **NOT VERIFIED** because this
checkout has no `pnpm` executable and no `node_modules`, so Vitest and
typecheck cannot run. No card is scored 10/10.

`module` and `test` hashes below are abbreviated `git hash-object` values
(first 12 hex digits); `-` means the catalog has no effect text and the
module is intentionally not applicable. The catalog, KB manifest, rules KB,
and set index hashes are recorded once here:

| Source | Path | SHA-1 |
|---|---|---|
| Catalog | `packages/shared/src/cards/data/cards.json` | `668a4aec030f` |
| KB manifest | `data/kb/manifest.json` | `d62a5ced6eaf` |
| Comprehensive rules | `data/kb/rules/comprehensive.md` | `cc7168408536` |
| Set index | `apps/api/src/cards/BT2/index.ts` | `8bf6bc5d75e5` |

## Per-card progress

`KB=OK` means the individual `node tools/kb/query.mjs card <ID>` command
completed successfully. `IR=full` means the registered compiled IR declares
`coverage: "full"` and `residual: []`. `IR=direct` is a hand-written module
with its own direct behavior and comparative tests. `Vanilla` is the
evidence-backed no-module case. Every row has a co-located test.

| Card | Module path / hash | Test path / hash | Static result | Score |
|---|---|---|---|---|
| BT2-112 | `BT2/BT2-112.ts` / `38fab1a2d0e` | `BT2/BT2-112.test.ts` / `ba7768e6b534` | KB=OK; IR=full; highest-DP opponent filter, ties, play reduction covered | 9/10, runtime not verified |
| BT2-111 | `BT2/BT2-111.ts` / `300549dddf77` | `BT2/BT2-111.test.ts` / `8bd82514adc6` | KB=OK; IR=full; hand Impmon waiver, trash threshold, deletion covered | 9/10, runtime not verified |
| BT2-110 | `BT2/BT2-110.ts` / `868b937b1bf8` | `BT2/BT2-110.test.ts` / `2e999455a6af` | KB=OK; IR=full; unsuspended opponent target covered | 9/10, runtime not verified |
| BT2-109 | `BT2/BT2-109.ts` / `b879836275b5` | `BT2/BT2-109.test.ts` / `16e33d9d2f0d` | KB=OK; IR=full; optional own deletion and up-to-two level boundary covered | 9/10, runtime not verified |
| BT2-108 | `BT2/BT2-108.ts` / `fef7649b2893` | `BT2/BT2-108.test.ts` / `8626ed6e124e` | KB=OK; IR=full; purple level-3 trash play and On Play suppression covered | 9/10, runtime not verified |
| BT2-107 | `BT2/BT2-107.ts` / `049a524b1de8` | `BT2/BT2-107.test.ts` / `107a5833ac5d` | KB=OK; IR=full; own-Digimon +3000 duration covered | 9/10, runtime not verified |
| BT2-106 | `BT2/BT2-106.ts` / `c80925a0b4a5` | `BT2/BT2-106.test.ts` / `dedabc10a366` | KB=OK; IR=full; De-Digivolve 4 boundary covered | 9/10, runtime not verified |
| BT2-105 | `BT2/BT2-105.ts` / `2048d9415f9d` | `BT2/BT2-105.test.ts` / `87bbbaea6f73` | KB=OK; IR=full; De-Digivolve 1 covered | 9/10, runtime not verified |
| BT2-104 | `BT2/BT2-104.ts` / `515cce805f32` | `BT2/BT2-104.test.ts` / `23470de173d2` | KB=OK; IR=full; blocker-only unsuspend covered | 9/10, runtime not verified |
| BT2-103 | `BT2/BT2-103.ts` / `2090923071b7` | `BT2/BT2-103.test.ts` / `99e8635f91cf` | KB=OK; IR=full; own-Digimon +3000 duration covered | 9/10, runtime not verified |
| BT2-102 | `BT2/BT2-102.ts` / `6ef76be389cc` | `BT2/BT2-102.test.ts` / `c54c591ca9ad` | KB=OK; IR=full; suspended target and bottom-deck zone covered | 9/10, runtime not verified |
| BT2-101 | `BT2/BT2-101.ts` / `df01ccfaf0f3` | `BT2/BT2-101.test.ts` / `99a949810790` | KB=OK; IR=full; DP boundary and all-target suspension covered | 9/10, runtime not verified |
| BT2-100 | `BT2/BT2-100.ts` / `7d715cfcc307` | `BT2/BT2-100.test.ts` / `525251b09cc9` | KB=OK; IR=full; suspend-then-own-buff order covered | 9/10, runtime not verified |
| BT2-099 | `BT2/BT2-099.ts` / `d5687e765eaf` | `BT2/BT2-099.test.ts` / `11f9696d9883` | KB=OK; IR=full; hand cost reduction and -12000 covered | 9/10, runtime not verified |
| BT2-098 | `BT2/BT2-098.ts` / `28ffb45e8030` | `BT2/BT2-098.test.ts` / `e835d223487d` | KB=OK; IR=full; draw-before-hand-size DP calculation covered | 9/10, runtime not verified |
| BT2-097 | `BT2/BT2-097.ts` / `e4a674941c9a` | `BT2/BT2-097.test.ts` / `6660c335be8e` | KB=OK; IR=direct; errata, exactly-three level-3 targets, Security reuse covered | 9/10, runtime not verified |
| BT2-096 | `BT2/BT2-096.ts` / `330ddd12232b` | `BT2/BT2-096.test.ts` / `ee254961d6ab` | KB=OK; IR=full; level-5 boundary, hand return, conditional unsuspend covered | 9/10, runtime not verified |
| BT2-095 | `BT2/BT2-095.ts` / `a52252953817` | `BT2/BT2-095.test.ts` / `beec35eaa46f` | KB=OK; IR=full; up-to-three level-3 hand returns covered | 9/10, runtime not verified |
| BT2-094 | `BT2/BT2-094.ts` / `1f3beaaf6a6d` | `BT2/BT2-094.test.ts` / `cc951eccbe36` | KB=OK; IR=direct; chosen source trash, Then ordering, Security hand return covered | 9/10, runtime not verified |
| BT2-093 | `BT2/BT2-093.ts` / `538b2bafe751` | `BT2/BT2-093.test.ts` / `a1ac87c04027` | KB=OK; IR=full; red-Tamer alternate threshold covered | 9/10, runtime not verified |
| BT2-092 | `BT2/BT2-092.ts` / `e50d35ebb08a` | `BT2/BT2-092.test.ts` / `5fca574ba891` | KB=OK; IR=full; up-to-two own targets and duration covered | 9/10, runtime not verified |
| BT2-091 | `BT2/BT2-091.ts` / `35550417f50d` | `BT2/BT2-091.test.ts` / `f19f0ffe28f4` | KB=OK; IR=full; delete-at-4000 boundary covered | 9/10, runtime not verified |
| BT2-090 | `BT2/BT2-090.ts` / `8a2db037444a` | `BT2/BT2-090.test.ts` / `8cc5c44ea456` | KB=OK; IR=full; memory floor and purple recovery covered | 9/10, runtime not verified |
| BT2-089 | `BT2/BT2-089.ts` / `5da8bb3175ac` | `BT2/BT2-089.test.ts` / `7616e6545485` | KB=OK; IR=full; memory set and black DP aura covered | 9/10, runtime not verified |
| BT2-088 | `BT2/BT2-088.ts` / `a5ba2fed6d63` | `BT2/BT2-088.test.ts` / `9c62af367757` | KB=OK; IR=full; Tyrannomon piercing and evolution discount covered | 9/10, runtime not verified |
| BT2-087 | `BT2/BT2-087.ts` / `25abbd6c0adb` | `BT2/BT2-087.test.ts` / `70e2b6087446` | KB=OK; IR=full; start-of-turn security boundary covered | 9/10, runtime not verified |
| BT2-086 | `BT2/BT2-086.ts` / `7c12008cbec7` | `BT2/BT2-086.test.ts` / `f917730693cf` | KB=OK; IR=full; Vee reveal filter/order and attack buff covered | 9/10, runtime not verified |
| BT2-085 | `BT2/BT2-085.ts` / `363ef2b7e47f` | `BT2/BT2-085.test.ts` / `33ee425fd3a8` | KB=OK; IR=full; opponent source trash trigger and suspension cost covered | 9/10, runtime not verified |
| BT2-084 | `BT2/BT2-084.ts` / `79e7bbb7273b` | `BT2/BT2-084.test.ts` / `6f0a72659c7d` | KB=OK; IR=full; red player attack and suspended Tamer cost covered | 9/10, runtime not verified |
| BT2-083 | `BT2/BT2-083.ts` / `b72830b03653` | `BT2/BT2-083.test.ts` / `ae16d20889f1` | KB=OK; IR=full; bottom deck, deletion replay, source-presence gate covered | 9/10, runtime not verified |
| BT2-082 | `BT2/BT2-082.ts` / `9e7b805740ab` | `BT2/BT2-082.test.ts` / `e5d65684874e` | KB=OK; IR=full; token play and Diaboromon replacement covered | 9/10, runtime not verified |
| BT2-081 | `BT2/BT2-081.ts` / `4e48a7d0e94c` | `BT2/BT2-081.test.ts` / `192ebbd25cee` | KB=OK; IR=full; purple level-3 trash play and On Play suppression covered | 9/10, runtime not verified |
| BT2-080 | `BT2/BT2-080.ts` / `dfd7b1860965` | `BT2/BT2-080.test.ts` / `93b917357c31` | KB=OK; IR=full; optional own deletion and up-to-two level boundary covered | 9/10, runtime not verified |
| BT2-079 | `BT2/BT2-079.ts` / `40bebb946735` | `BT2/BT2-079.test.ts` / `31d3ae5573d4` | KB=OK; IR=full; opponent suspension trigger and Security Attack covered | 9/10, runtime not verified |
| BT2-078 | `BT2/BT2-078.ts` / `11230344299c` | `BT2/BT2-078.test.ts` / `c2f1d6a32c81` | KB=OK; IR=full; Once Per Turn deletion cost and unsuspend covered | 9/10, runtime not verified |
| BT2-077 | `BT2/BT2-077.ts` / `48855852f1e4` | `BT2/BT2-077.test.ts` / `554bfabb0f81` | KB=OK; IR=full; optional own deletion and opponent level boundary covered | 9/10, runtime not verified |
| BT2-076 | `BT2/BT2-076.ts` / `89d1ffde6bc6` | `BT2/BT2-076.test.ts` / `86304f89256f` | KB=OK; IR=full; deletion draw-2 then discard covered | 9/10, runtime not verified |
| BT2-075 | `-` | `BT2/BT2-075.test.ts` / `d29d910bac22` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-074 | `BT2/BT2-074.ts` / `e4b910e684c2` | `BT2/BT2-074.test.ts` / `0caf17be1b44` | KB=OK; IR=full; Retaliation on face and inherited stack behavior covered | 9/10, runtime not verified |
| BT2-073 | `BT2/BT2-073.ts` / `afe6bf5fc340` | `BT2/BT2-073.test.ts` / `a551a2ba9913` | KB=OK; IR=full; other-Digimon deletion and OPT covered | 9/10, runtime not verified |
| BT2-072 | `BT2/BT2-072.ts` / `fb3cef807f6` | `BT2/BT2-072.test.ts` / `58862258d4f5` | KB=OK; IR=full; blocker and attack memory loss covered | 9/10, runtime not verified |
| BT2-071 | `BT2/BT2-071.ts` / `24c9a934ecb3` | `BT2/BT2-071.test.ts` / `3d1a57036799` | KB=OK; IR=full; yellow-condition Retaliation and deletion draw covered | 9/10, runtime not verified |
| BT2-070 | `BT2/BT2-070.ts` / `ec660c1949c3` | `BT2/BT2-070.test.ts` / `931064dc480f` | KB=OK; IR=full; deletion draw covered | 9/10, runtime not verified |
| BT2-069 | `BT2/BT2-069.ts` / `bd52c8c3df35` | `BT2/BT2-069.test.ts` / `bb4f2d6bd9d0` | KB=OK; IR=full; draw-2 then discard order covered | 9/10, runtime not verified |
| BT2-068 | `BT2/BT2-068.ts` / `60588ead46dd` | `BT2/BT2-068.test.ts` / `21a850ca956b` | KB=OK; IR=full; deletion top-three trash covered | 9/10, runtime not verified |
| BT2-067 | `-` | `BT2/BT2-067.test.ts` / `8c322be1945f` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-066 | `BT2/BT2-066.ts` / `c803d338e028` | `BT2/BT2-066.test.ts` / `c0ad8fe788bf` | KB=OK; IR=full; two-target De-Digivolve 2 covered | 9/10, runtime not verified |
| BT2-065 | `BT2/BT2-065.ts` / `d5e7dc1f0622` | `BT2/BT2-065.test.ts` / `0432b0d9c5ac` | KB=OK; IR=full; Blocker/Reboot covered | 9/10, runtime not verified |
| BT2-064 | `-` | `BT2/BT2-064.test.ts` / `ce2406392761` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-063 | `BT2/BT2-063.ts` / `d5ee63a22de01` | `BT2/BT2-063.test.ts` / `3c50e44900f9` | KB=OK; IR=full; Reboot and inherited Security Attack covered | 9/10, runtime not verified |
| BT2-062 | `BT2/BT2-062.ts` / `b583953278af` | `BT2/BT2-062.test.ts` / `ed38e6ad9221` | KB=OK; IR=direct; battle-area/Your Turn/name-exact reduction covered | 9/10, runtime not verified |
| BT2-061 | `BT2/BT2-061.ts` / `77efc877c624` | `BT2/BT2-061.test.ts` / `473e41bbc7ef` | KB=OK; IR=full; Blocker covered | 9/10, runtime not verified |
| BT2-060 | `-` | `BT2/BT2-060.test.ts` / `4f395cb4e2f1` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-059 | `BT2/BT2-059.ts` / `cad90ab04b64` | `BT2/BT2-059.test.ts` / `bdab6776bf41` | KB=OK; IR=full; same-name play inherited trigger covered | 9/10, runtime not verified |
| BT2-058 | `BT2/BT2-058.ts` / `16db517b4d7b` | `BT2/BT2-058.test.ts` / `34ef8d7f8082` | KB=OK; IR=full; Blocker and Your Turn attack restriction covered | 9/10, runtime not verified |
| BT2-057 | `BT2/BT2-057.ts` / `dffa8d4e949c` | `BT2/BT2-057.test.ts` / `58fc5ccf0017` | KB=OK; IR=full; Reboot-conditioned Jamming covered | 9/10, runtime not verified |
| BT2-056 | `-` | `BT2/BT2-056.test.ts` / `ea7f91240f96` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-055 | `BT2/BT2-055.ts` / `6b418aee0269` | `BT2/BT2-055.test.ts` / `f31012f30066` | KB=OK; IR=full; inherited Reboot covered | 9/10, runtime not verified |
| BT2-054 | `BT2/BT2-054.ts` / `069161eb64bd` | `BT2/BT2-054.test.ts` / `e71b93406b2e` | KB=OK; IR=full; Blocker and attack memory loss covered | 9/10, runtime not verified |
| BT2-053 | `BT2/BT2-053.ts` / `19f97c3efb37` | `BT2/BT2-053.test.ts` / `a578f23380ac` | KB=OK; IR=full; same-name play inherited draw covered | 9/10, runtime not verified |
| BT2-052 | `-` | `BT2/BT2-052.test.ts` / `ce4a3b78f78a` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-051 | `BT2/BT2-051.ts` / `b461408e06948` | `BT2/BT2-051.test.ts` / `3ee56ab67e01` | KB=OK; IR=full; unsuspended attack and surviving deletion trigger covered | 9/10, runtime not verified |
| BT2-050 | `BT2/BT2-050.ts` / `8d60b89e7914` | `BT2/BT2-050.test.ts` / `2c1c42cc4917` | KB=OK; IR=full; Digisorption and other-suspended count covered | 9/10, runtime not verified |
| BT2-049 | `BT2/BT2-049.ts` / `168c721cfdad` | `BT2/BT2-049.test.ts` / `16ab288db694` | KB=OK; IR=full; suspend plus next unsuspend-phase lock covered | 9/10, runtime not verified |
| BT2-048 | `BT2/BT2-048.ts` / `7b07fb78faee` | `BT2/BT2-048.test.ts` / `33d6cf317560` | KB=OK; IR=full; Blocker covered | 9/10, runtime not verified |
| BT2-047 | `BT2/BT2-047.ts` / `498ba452b2a16` | `BT2/BT2-047.test.ts` / `712b266df66d` | KB=OK; IR=full; Digisorption and suspended level-3 play covered | 9/10, runtime not verified |
| BT2-046 | `BT2/BT2-046.ts` / `51e006658a4f` | `BT2/BT2-046.test.ts` / `bdea8ce5745b` | KB=OK; IR=direct; inherited battle-delete level-6 gate covered | 9/10, runtime not verified |
| BT2-045 | `BT2/BT2-045.ts` / `e21ecdf88288` | `BT2/BT2-045.test.ts` / `4fbf698dc604` | KB=OK; IR=full; Digisorption -2 covered | 9/10, runtime not verified |
| BT2-044 | `BT2/BT2-044.ts` / `c91ae262cc86` | `BT2/BT2-044.test.ts` / `86dcff0ccf39` | KB=OK; IR=full; reveal/add and ordered bottom-deck remainder covered | 9/10, runtime not verified |
| BT2-043 | `BT2/BT2-043.ts` / `f98d269108a6` | `BT2/BT2-043.test.ts` / `d1002bcf5ce8` | KB=OK; IR=full; inherited +1000 covered | 9/10, runtime not verified |
| BT2-042 | `-` | `BT2/BT2-042.test.ts` / `a6fba8d260f8` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-041 | `BT2/BT2-041.ts` / `555ffc9b04a4` | `BT2/BT2-041.test.ts` / `77216885b130` | KB=OK; IR=full; suspend-all, per-Tamer repeat, DP aura covered | 9/10, runtime not verified |
| BT2-040 | `BT2/BT2-040.ts` / `48066dcd77f3` | `BT2/BT2-040.test.ts` / `adeabcbdfc30` | KB=OK; IR=full; face-down Security replacement covered | 9/10, runtime not verified |
| BT2-039 | `BT2/BT2-039.ts` / `ec6532de2449` | `BT2/BT2-039.test.ts` / `03e6807387ee` | KB=OK; IR=full; Recovery+2 boundary and optional level-3 play covered | 9/10, runtime not verified |
| BT2-038 | `BT2/BT2-038.ts` / `978e3891258f` | `BT2/BT2-038.test.ts` / `6662f0f8d43f` | KB=OK; IR=full; optional yellow Tamer play with On Play suppression covered | 9/10, runtime not verified |
| BT2-037 | `-` | `BT2/BT2-037.test.ts` / `0c8ac1b8eb37` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-036 | `BT2/BT2-036.ts` / `e736e2a8d672` | `BT2/BT2-036.test.ts` / `518c5e527d07` | KB=OK; IR=full; purple condition and other-Digimon deletion trigger covered | 9/10, runtime not verified |
| BT2-035 | `BT2/BT2-035.ts` / `6007b80c2b37` | `BT2/BT2-035.test.ts` / `0a593c84ba2b` | KB=OK; IR=full; inherited yellow-Tamer DP reduction covered | 9/10, runtime not verified |
| BT2-034 | `BT2/BT2-034.ts` / `62bb49067ddc` | `BT2/BT2-034.test.ts` / `180e83a4e8eb` | KB=OK; IR=full; Recovery+1 security-count boundary covered | 9/10, runtime not verified |
| BT2-033 | `BT2/BT2-033.ts` / `d4c78c21acd7` | `BT2/BT2-033.test.ts` / `c1fc66903562` | KB=OK; IR=full; three yellow Tamer threshold covered | 9/10, runtime not verified |
| BT2-032 | `BT2/BT2-032.ts` / `34a6e0b451a6` | `BT2/BT2-032.test.ts` / `a580ad1c7520` | KB=OK; IR=full; Tamer suspension and Once Per Turn unsuspend covered | 9/10, runtime not verified |
| BT2-031 | `BT2/BT2-031.ts` / `bdbd7af9aa3b` | `BT2/BT2-031.test.ts` / `68469f3e10ed` | KB=OK; IR=full; no-source opponent condition and Security Attack covered | 9/10, runtime not verified |
| BT2-030 | `BT2/BT2-030.ts` / `c62a567b5756` | `BT2/BT2-030.test.ts` / `e6e80be28787` | KB=OK; IR=full; up-to-two level-4 return and block restriction covered | 9/10, runtime not verified |
| BT2-029 | `BT2/BT2-029.ts` / `9bec32e1f64a` | `BT2/BT2-029.test.ts` / `2adcb0302c23` | KB=OK; IR=full; no-source block restriction covered | 9/10, runtime not verified |
| BT2-028 | `BT2/BT2-028.ts` / `c943c08e652a` | `BT2/BT2-028.test.ts` / `bf3307e88b24` | KB=OK; IR=full; blue Tamer condition and unsuspend covered | 9/10, runtime not verified |
| BT2-027 | `-` | `BT2/BT2-027.test.ts` / `c867c58e612a` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-026 | `BT2/BT2-026.ts` / `5fe267339315` | `BT2/BT2-026.test.ts` / `fcf6a1213b29` | KB=OK; IR=full; blue Tamer Jamming aura covered | 9/10, runtime not verified |
| BT2-025 | `BT2/BT2-025.ts` / `78b34d4d875f` | `BT2/BT2-025.test.ts` / `ed5899fbbbe1` | KB=OK; IR=full; opponent source trash covered | 9/10, runtime not verified |
| BT2-024 | `-` | `BT2/BT2-024.test.ts` / `f80b0e205f21` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-023 | `BT2/BT2-023.ts` / `4cdef21a400f` | `BT2/BT2-023.test.ts` / `d5024f4a6df6` | KB=OK; IR=full; hand play reduction per opposing no-source Digimon covered | 9/10, runtime not verified |
| BT2-022 | `-` | `BT2/BT2-022.test.ts` / `9b3b85f6182c` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-021 | `BT2/BT2-021.ts` / `d2320246208b` | `BT2/BT2-021.test.ts` / `66a64abb57b4` | KB=OK; IR=full; main-phase unsuspend OPT and Draw 1 covered | 9/10, runtime not verified |
| BT2-020 | `BT2/BT2-020.ts` / `82ebfc4a14f8` | `BT2/BT2-020.test.ts` / `8ccc65c64721` | KB=OK; IR=full; Tamer-gated delete and trash-per-ten ordering covered | 9/10, runtime not verified |
| BT2-019 | `BT2/BT2-019.ts` / `de8c6d3c116c` | `BT2/BT2-019.test.ts` / `7ff58c2b163e` | KB=OK; IR=full; player attack memory gain covered | 9/10, runtime not verified |
| BT2-018 | `BT2/BT2-018.ts` / `ab4a31516b5c` | `BT2/BT2-018.test.ts` / `f27aa9fb97c3` | KB=OK; IR=full; Security Attack +1 and all-opponent delete boundary covered | 9/10, runtime not verified |
| BT2-017 | `BT2/BT2-017.ts` / `0ec0f1ff05d3` | `BT2/BT2-017.test.ts` / `0fb0267247b9` | KB=OK; IR=full; red Tamer gate, 3000 delete, inherited trash threshold covered | 9/10, runtime not verified |
| BT2-016 | `-` | `BT2/BT2-016.test.ts` / `d69aeddbae6c` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-015 | `BT2/BT2-015.ts` / `265b49be7c67` | `BT2/BT2-015.test.ts` / `eee0091e117b` | KB=OK; IR=full; player attack Draw 1 covered | 9/10, runtime not verified |
| BT2-014 | `-` | `BT2/BT2-014.test.ts` / `0bfa67e28c21` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-013 | `BT2/BT2-013.ts` / `91e47414c80f` | `BT2/BT2-013.test.ts` / `ba06c70784f7` | KB=OK; IR=full; inherited opponent DP boundary covered | 9/10, runtime not verified |
| BT2-012 | `BT2/BT2-012.ts` / `4d76fd764b29` | `BT2/BT2-012.test.ts` / `6e6d3f5a4d59` | KB=OK; IR=full; player attack DP boost covered | 9/10, runtime not verified |
| BT2-011 | `-` | `BT2/BT2-011.test.ts` / `055245e94de5` | KB=OK; Vanilla; no effect text, module not applicable | 9/10, runtime not verified |
| BT2-010 | `BT2/BT2-010.ts` / `c66aea2d0c6e` | `BT2/BT2-010.test.ts` / `7e915954da89` | KB=OK; IR=full; Your Turn deletion memory condition covered | 9/10, runtime not verified |
| BT2-009 | `BT2/BT2-009.ts` / `b4ee3fd22a92` | `BT2/BT2-009.test.ts` / `17ff335375a9d` | KB=OK; IR=full; inherited opponent-trash threshold covered | 9/10, runtime not verified |
| BT2-008 | `BT2/BT2-008.ts` / `04930e3506d0` | `BT2/BT2-008.test.ts` / `6f87aabe1083` | KB=OK; IR=full; own-trash threshold covered | 9/10, runtime not verified |
| BT2-007 | `BT2/BT2-007.ts` / `3bb59e7bce22` | `BT2/BT2-007.test.ts` / `1064087080ae` | KB=OK; IR=full; attack top-deck trash covered | 9/10, runtime not verified |
| BT2-006 | `BT2/BT2-006.ts` / `7f7e34f61860` | `BT2/BT2-006.test.ts` / `d4a72d727408` | KB=OK; IR=full; same-name other Digimon condition covered | 9/10, runtime not verified |
| BT2-005 | `BT2/BT2-005.ts` / `8bec6c4f867b` | `BT2/BT2-005.test.ts` / `b94ce7c14387` | KB=OK; IR=full; Reboot-conditioned DP covered | 9/10, runtime not verified |
| BT2-004 | `BT2/BT2-004.ts` / `bce929ee3c6e` | `BT2/BT2-004.test.ts` / `18ce46a864c9` | KB=OK; IR=full; unsuspend-phase timing and memory gain covered | 9/10, runtime not verified |
| BT2-003 | `BT2/BT2-003.ts` / `e2a3bcb5566e` | `BT2/BT2-003.test.ts` / `3d95d1d3d0f8` | KB=OK; IR=full; suspended Security Digimon DP aura covered | 9/10, runtime not verified |
| BT2-002 | `BT2/BT2-002.ts` / `b95bc68de3dc` | `BT2/BT2-002.test.ts` / `b2e5d7051c88` | KB=OK; IR=full; main-phase unsuspend OPT and duration covered | 9/10, runtime not verified |
| BT2-001 | `BT2/BT2-001.ts` / `0d0728e905fb` | `BT2/BT2-001.test.ts` / `9133bba04acc` | KB=OK; IR=full; inherited opponent-trash threshold covered | 9/10, runtime not verified |

## Verification blockers and result

- `pnpm --filter @aegis/api exec vitest run src/cards/BT2 ...` could not
  start: `pnpm: command not found`.
- `node_modules` is absent, so Vitest and the workspace typecheck cannot be
  substituted safely with an untracked toolchain.
- `git diff --check` is available and must be rerun after this ledger is
  staged. No metadata or catalog/index file was edited.
- No card implementation or test required a correction based on the static
  evidence available. The four direct modules remain intentionally hand-written
  because their tests document the relevant IR/parser gaps or official errata.

Final status: all 112 cards reached `BT2-001` with per-card paths, hashes, KB
query status, and static clause coverage recorded. Runtime-dependent approval
is pending installation/availability of the repository toolchain; no 10/10
score is claimed.
