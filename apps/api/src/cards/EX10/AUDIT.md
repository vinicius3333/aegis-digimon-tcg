# EX10 Card Audit Ledger

Overall completion: **74/74 cards (100%) at 10/10**.

Revalidated on 2026-09-05 in branch `audit-ex10-20260905`, from
`675edc356bf351b852e64da1b38cd45c5123c35f`. Every card was checked against its committed
catalog entry, local rules knowledge base, direct compiled module and behavioral tests.
The earlier audit is preserved in Git history; this ledger records the current revalidation.

Per-card findings and named tests are recorded in
[001–025](../../../../../docs/audits/EX10-20260905-001-025.md),
[026–050](../../../../../docs/audits/EX10-20260905-026-050.md), and
[051–074](../../../../../docs/audits/EX10-20260905-051-074.md).
The [collection report](../../../../../docs/audits/EX10-AUDIT.md) records delivery evidence.

## Exceptions

None remain in EX10. The previous EX10-010, EX10-059, EX10-062 and EX10-064 gaps
have behavioral proof. Additional corrections cover EX10-023 phase scope,
EX10-058 cost-created targets, and EX10-055/056/058 two-material DigiXros limits.

## Scoring rubric

Each card receives two points in each independently reviewed area:

- **Contract and rules (2/2):** every printed clause was reconciled with the committed catalog and applicable local knowledge-base material, with no unresolved ambiguity.
- **IR trace (2/2):** every clause maps to executable compiled IR, with exclusive `registerIrCard` registration, `coverage: "full"`, no residual nodes, and no `RawUnparsed` behavior.
- **Behavioral proof (2/2):** the colocated focused suite covers the applicable positive, boundary, negative, optional, frequency, cost, duration, zone, and Security behavior.
- **Peer and stack proof (2/2):** applicable trait, neighboring-card, ownership, and realistic evolution-stack risks were checked in focused or comparative scenarios.
- **Delivery gates (2/2):** focused, mechanism, collection, typecheck, style, and diff validation passed on the delivered branch.

A row may remain at 10/10 only while all five areas remain 2/2. The executable audit
test requires exactly one row for every committed EX10 card, validates the catalog name,
all five component scores, the final score, and direct links to its module and focused test.

## Reproducible collection evidence

- Collection: `pnpm --filter @aegis/api exec vitest run src/cards/EX10 --maxWorkers=2` — 76 files, 604 tests passed, including the catalog-sync and audit guards.
- Affected effects, subtrigger and DigiXros mechanisms plus peer cards passed; exact commands and counts are in the collection report.
- EX10-064 focused proof: 11 tests passed, including a nested compiled-action mutation, two-copy material quotas and independent refusal.
- The real React/Colyseus evolution scenario passed: `pnpm --filter @aegis/web exec vitest run test/ex10EvolutionStack.scenario.test.tsx --maxWorkers=1`.
- Full `pnpm typecheck`, changed-file Oxlint/Oxfmt and `git diff --check` are required delivery gates.
- Inventory: 74 catalog IDs, 74 direct modules, 74 focused suites, 74 exclusive `registerIrCard` registrations and no legacy `registerCard` registrations.

## Card scores

| Card     | Name                         | Contract/rules | IR trace | Behavioral proof | Peer/stack | Gates | Score | Evidence                                                                  |
| -------- | ---------------------------- | -------------: | -------: | ---------------: | ---------: | ----: | ----: | ------------------------------------------------------------------------- |
| EX10-001 | Flickmon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-001.ts`](./EX10-001.ts) · [`EX10-001.test.ts`](./EX10-001.test.ts) |
| EX10-002 | Koromon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-002.ts`](./EX10-002.ts) · [`EX10-002.test.ts`](./EX10-002.test.ts) |
| EX10-003 | Tumblemon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-003.ts`](./EX10-003.ts) · [`EX10-003.test.ts`](./EX10-003.test.ts) |
| EX10-004 | Cupimon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-004.ts`](./EX10-004.ts) · [`EX10-004.test.ts`](./EX10-004.test.ts) |
| EX10-005 | Pagumon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-005.ts`](./EX10-005.ts) · [`EX10-005.test.ts`](./EX10-005.test.ts) |
| EX10-006 | Agumon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-006.ts`](./EX10-006.ts) · [`EX10-006.test.ts`](./EX10-006.test.ts) |
| EX10-007 | Greymon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-007.ts`](./EX10-007.ts) · [`EX10-007.test.ts`](./EX10-007.test.ts) |
| EX10-008 | MetalGreymon                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-008.ts`](./EX10-008.ts) · [`EX10-008.test.ts`](./EX10-008.test.ts) |
| EX10-009 | Creepymon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-009.ts`](./EX10-009.ts) · [`EX10-009.test.ts`](./EX10-009.test.ts) |
| EX10-010 | BlackWarGreymon              |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-010.ts`](./EX10-010.ts) · [`EX10-010.test.ts`](./EX10-010.test.ts) |
| EX10-011 | MaloMyotismon                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-011.ts`](./EX10-011.ts) · [`EX10-011.test.ts`](./EX10-011.test.ts) |
| EX10-012 | MetalSeadramon               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-012.ts`](./EX10-012.ts) · [`EX10-012.test.ts`](./EX10-012.test.ts) |
| EX10-013 | Lucemon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-013.ts`](./EX10-013.ts) · [`EX10-013.test.ts`](./EX10-013.test.ts) |
| EX10-014 | Weatherdramon                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-014.ts`](./EX10-014.ts) · [`EX10-014.test.ts`](./EX10-014.test.ts) |
| EX10-015 | Psychemon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-015.ts`](./EX10-015.ts) · [`EX10-015.test.ts`](./EX10-015.test.ts) |
| EX10-016 | Mirrormon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-016.ts`](./EX10-016.ts) · [`EX10-016.test.ts`](./EX10-016.test.ts) |
| EX10-017 | Mienumon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-017.ts`](./EX10-017.ts) · [`EX10-017.test.ts`](./EX10-017.test.ts) |
| EX10-018 | Astamon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-018.ts`](./EX10-018.ts) · [`EX10-018.test.ts`](./EX10-018.test.ts) |
| EX10-019 | Warudamon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-019.ts`](./EX10-019.ts) · [`EX10-019.test.ts`](./EX10-019.test.ts) |
| EX10-020 | Puppetmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-020.ts`](./EX10-020.ts) · [`EX10-020.test.ts`](./EX10-020.test.ts) |
| EX10-021 | Belphemon: Sleep Mode        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-021.ts`](./EX10-021.ts) · [`EX10-021.test.ts`](./EX10-021.test.ts) |
| EX10-022 | Belphemon: Rage Mode         |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-022.ts`](./EX10-022.ts) · [`EX10-022.test.ts`](./EX10-022.test.ts) |
| EX10-023 | Quartzmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-023.ts`](./EX10-023.ts) · [`EX10-023.test.ts`](./EX10-023.test.ts) |
| EX10-024 | Kabemon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-024.ts`](./EX10-024.ts) · [`EX10-024.test.ts`](./EX10-024.test.ts) |
| EX10-025 | Sunarizamon                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-025.ts`](./EX10-025.ts) · [`EX10-025.test.ts`](./EX10-025.test.ts) |
| EX10-026 | SkullKnightmon               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-026.ts`](./EX10-026.ts) · [`EX10-026.test.ts`](./EX10-026.test.ts) |
| EX10-027 | DeadlyAxemon                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-027.ts`](./EX10-027.ts) · [`EX10-027.test.ts`](./EX10-027.test.ts) |
| EX10-028 | Landramon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-028.ts`](./EX10-028.ts) · [`EX10-028.test.ts`](./EX10-028.test.ts) |
| EX10-029 | Warpmon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-029.ts`](./EX10-029.ts) · [`EX10-029.test.ts`](./EX10-029.test.ts) |
| EX10-030 | Cometmon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-030.ts`](./EX10-030.ts) · [`EX10-030.test.ts`](./EX10-030.test.ts) |
| EX10-031 | DarkKnightmon                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-031.ts`](./EX10-031.ts) · [`EX10-031.test.ts`](./EX10-031.test.ts) |
| EX10-032 | Proganomon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-032.ts`](./EX10-032.ts) · [`EX10-032.test.ts`](./EX10-032.test.ts) |
| EX10-033 | Pyramidimon                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-033.ts`](./EX10-033.ts) · [`EX10-033.test.ts`](./EX10-033.test.ts) |
| EX10-034 | Blastmon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-034.ts`](./EX10-034.ts) · [`EX10-034.test.ts`](./EX10-034.test.ts) |
| EX10-035 | Machinedramon                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-035.ts`](./EX10-035.ts) · [`EX10-035.test.ts`](./EX10-035.test.ts) |
| EX10-036 | Magneticdramon               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-036.ts`](./EX10-036.ts) · [`EX10-036.test.ts`](./EX10-036.test.ts) |
| EX10-037 | Impmon                       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-037.ts`](./EX10-037.ts) · [`EX10-037.test.ts`](./EX10-037.test.ts) |
| EX10-038 | Copipemon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-038.ts`](./EX10-038.ts) · [`EX10-038.test.ts`](./EX10-038.test.ts) |
| EX10-039 | ChuuChuumon                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-039.ts`](./EX10-039.ts) · [`EX10-039.test.ts`](./EX10-039.test.ts) |
| EX10-040 | DemiDevimon                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-040.ts`](./EX10-040.ts) · [`EX10-040.test.ts`](./EX10-040.test.ts) |
| EX10-041 | Wizardmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-041.ts`](./EX10-041.ts) · [`EX10-041.test.ts`](./EX10-041.test.ts) |
| EX10-042 | GulusGammamon                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-042.ts`](./EX10-042.ts) · [`EX10-042.test.ts`](./EX10-042.test.ts) |
| EX10-043 | Sakusimon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-043.ts`](./EX10-043.ts) · [`EX10-043.test.ts`](./EX10-043.test.ts) |
| EX10-044 | Damemon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-044.ts`](./EX10-044.ts) · [`EX10-044.test.ts`](./EX10-044.test.ts) |
| EX10-045 | Tuwarmon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-045.ts`](./EX10-045.ts) · [`EX10-045.test.ts`](./EX10-045.test.ts) |
| EX10-046 | Devimon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-046.ts`](./EX10-046.ts) · [`EX10-046.test.ts`](./EX10-046.test.ts) |
| EX10-047 | Arukenimon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-047.ts`](./EX10-047.ts) · [`EX10-047.test.ts`](./EX10-047.test.ts) |
| EX10-048 | Myotismon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-048.ts`](./EX10-048.ts) · [`EX10-048.test.ts`](./EX10-048.test.ts) |
| EX10-049 | SkullSatamon                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-049.ts`](./EX10-049.ts) · [`EX10-049.test.ts`](./EX10-049.test.ts) |
| EX10-050 | Baalmon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-050.ts`](./EX10-050.ts) · [`EX10-050.test.ts`](./EX10-050.test.ts) |
| EX10-051 | Mummymon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-051.ts`](./EX10-051.ts) · [`EX10-051.test.ts`](./EX10-051.test.ts) |
| EX10-052 | Lucemon: Chaos Mode          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-052.ts`](./EX10-052.ts) · [`EX10-052.test.ts`](./EX10-052.test.ts) |
| EX10-053 | Regulusmon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-053.ts`](./EX10-053.ts) · [`EX10-053.test.ts`](./EX10-053.test.ts) |
| EX10-054 | VenomMyotismon               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-054.ts`](./EX10-054.ts) · [`EX10-054.test.ts`](./EX10-054.test.ts) |
| EX10-055 | Tactimon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-055.ts`](./EX10-055.ts) · [`EX10-055.test.ts`](./EX10-055.test.ts) |
| EX10-056 | Bagramon                     |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-056.ts`](./EX10-056.ts) · [`EX10-056.test.ts`](./EX10-056.test.ts) |
| EX10-057 | Piedmon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-057.ts`](./EX10-057.ts) · [`EX10-057.test.ts`](./EX10-057.test.ts) |
| EX10-058 | Lilithmon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-058.ts`](./EX10-058.ts) · [`EX10-058.test.ts`](./EX10-058.test.ts) |
| EX10-059 | DarknessBagramon             |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-059.ts`](./EX10-059.ts) · [`EX10-059.test.ts`](./EX10-059.test.ts) |
| EX10-060 | Lucemon: Satan Mode          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-060.ts`](./EX10-060.ts) · [`EX10-060.test.ts`](./EX10-060.test.ts) |
| EX10-061 | Apocalymon                   |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-061.ts`](./EX10-061.ts) · [`EX10-061.test.ts`](./EX10-061.test.ts) |
| EX10-062 | Yujin Ozora                  |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-062.ts`](./EX10-062.ts) · [`EX10-062.test.ts`](./EX10-062.test.ts) |
| EX10-063 | Close                        |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-063.ts`](./EX10-063.ts) · [`EX10-063.test.ts`](./EX10-063.test.ts) |
| EX10-064 | Yuu Amano & Nene Amano       |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-064.ts`](./EX10-064.ts) · [`EX10-064.test.ts`](./EX10-064.test.ts) |
| EX10-065 | Yukio Oikawa                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-065.ts`](./EX10-065.ts) · [`EX10-065.test.ts`](./EX10-065.test.ts) |
| EX10-066 | Akihiro Kurata               |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-066.ts`](./EX10-066.ts) · [`EX10-066.test.ts`](./EX10-066.test.ts) |
| EX10-067 | Ryoma Mogami                 |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-067.ts`](./EX10-067.ts) · [`EX10-067.test.ts`](./EX10-067.test.ts) |
| EX10-068 | Digimon Emperor              |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-068.ts`](./EX10-068.ts) · [`EX10-068.test.ts`](./EX10-068.test.ts) |
| EX10-069 | Unique Emblem: Gravel Hearts |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-069.ts`](./EX10-069.ts) · [`EX10-069.test.ts`](./EX10-069.test.ts) |
| EX10-070 | God Grade Unleashed          |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-070.ts`](./EX10-070.ts) · [`EX10-070.test.ts`](./EX10-070.test.ts) |
| EX10-071 | Paradise Lost                |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-071.ts`](./EX10-071.ts) · [`EX10-071.test.ts`](./EX10-071.test.ts) |
| EX10-072 | Spiral Mountain              |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-072.ts`](./EX10-072.ts) · [`EX10-072.test.ts`](./EX10-072.test.ts) |
| EX10-073 | Deusmon                      |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-073.ts`](./EX10-073.ts) · [`EX10-073.test.ts`](./EX10-073.test.ts) |
| EX10-074 | Beelzemon                    |            2/2 |      2/2 |              2/2 |        2/2 |   2/2 | 10/10 | [`EX10-074.ts`](./EX10-074.ts) · [`EX10-074.test.ts`](./EX10-074.test.ts) |
