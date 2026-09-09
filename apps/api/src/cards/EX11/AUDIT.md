# EX11 Card Audit Ledger

Overall completion: **74/74 cards (100%) at 10/10**.

Fresh re-audit completed 2026-09-09 in `audit-ex11-luna-20260908`, from main `6d54ea4d7`. Current per-card evidence is recorded in [the re-audit ledger](../../../../../docs/audits/EX11-REAUDIT-LEDGER.md).

## Scoring rubric

Two points each: catalog/rules, exclusive compiled IR trace, public-intent behavioral proof, peer/evolution-stack proof, and delivery gates. Every row has reproducible card evidence plus green collection and mechanism gates on the pushed branch.

## Exceptions

None.

## Reproducible collection evidence

The closing run passed effects synchronization and scope checks for all 74 EX11 records, workspace typecheck, 208 focused/mechanism files with 2,759 tests, changed-file Oxlint and Oxfmt, and `git diff --check`. Commands and results are recorded in [RUN.md](../../../../../docs/audits/EX11-reaudit/RUN.md).

## Card scores

| Card     | Name                           | Contract/rules | IR trace | Behavioral proof | Peer/stack | Gates | Score | Evidence                                                                  |
| -------- | ------------------------------ | -------------- | -------- | ---------------- | ---------- | ----- | ----- | ------------------------------------------------------------------------- |
| EX11-001 | Koromon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-001.ts`](./EX11-001.ts) · [`EX11-001.test.ts`](./EX11-001.test.ts) |
| EX11-002 | Hiyarimon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-002.ts`](./EX11-002.ts) · [`EX11-002.test.ts`](./EX11-002.test.ts) |
| EX11-003 | Puroromon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-003.ts`](./EX11-003.ts) · [`EX11-003.test.ts`](./EX11-003.test.ts) |
| EX11-004 | Kapurimon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-004.ts`](./EX11-004.ts) · [`EX11-004.test.ts`](./EX11-004.test.ts) |
| EX11-005 | Yaamon                         | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-005.ts`](./EX11-005.ts) · [`EX11-005.test.ts`](./EX11-005.test.ts) |
| EX11-006 | Flickmon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-006.ts`](./EX11-006.ts) · [`EX11-006.test.ts`](./EX11-006.test.ts) |
| EX11-007 | Agumon                         | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-007.ts`](./EX11-007.ts) · [`EX11-007.test.ts`](./EX11-007.test.ts) |
| EX11-008 | Elizamon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-008.ts`](./EX11-008.ts) · [`EX11-008.test.ts`](./EX11-008.test.ts) |
| EX11-009 | Tyrannomon                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-009.ts`](./EX11-009.ts) · [`EX11-009.test.ts`](./EX11-009.test.ts) |
| EX11-010 | MasterTyrannomon               | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-010.ts`](./EX11-010.ts) · [`EX11-010.test.ts`](./EX11-010.test.ts) |
| EX11-011 | Dinomon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-011.ts`](./EX11-011.ts) · [`EX11-011.test.ts`](./EX11-011.test.ts) |
| EX11-012 | Medusamon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-012.ts`](./EX11-012.ts) · [`EX11-012.test.ts`](./EX11-012.test.ts) |
| EX11-013 | Sangomon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-013.ts`](./EX11-013.ts) · [`EX11-013.test.ts`](./EX11-013.test.ts) |
| EX11-014 | Penguinmon                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-014.ts`](./EX11-014.ts) · [`EX11-014.test.ts`](./EX11-014.test.ts) |
| EX11-015 | Frigimon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-015.ts`](./EX11-015.ts) · [`EX11-015.test.ts`](./EX11-015.test.ts) |
| EX11-016 | PolarBearmon                   | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-016.ts`](./EX11-016.ts) · [`EX11-016.test.ts`](./EX11-016.test.ts) |
| EX11-017 | Skadimon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-017.ts`](./EX11-017.ts) · [`EX11-017.test.ts`](./EX11-017.test.ts) |
| EX11-018 | Ryugumon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-018.ts`](./EX11-018.ts) · [`EX11-018.test.ts`](./EX11-018.test.ts) |
| EX11-019 | Shoemon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-019.ts`](./EX11-019.ts) · [`EX11-019.test.ts`](./EX11-019.test.ts) |
| EX11-020 | Hanimon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-020.ts`](./EX11-020.ts) · [`EX11-020.test.ts`](./EX11-020.test.ts) |
| EX11-021 | Kokeshimon                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-021.ts`](./EX11-021.ts) · [`EX11-021.test.ts`](./EX11-021.test.ts) |
| EX11-022 | Karakurumon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-022.ts`](./EX11-022.ts) · [`EX11-022.test.ts`](./EX11-022.test.ts) |
| EX11-023 | Kaguyamon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-023.ts`](./EX11-023.ts) · [`EX11-023.test.ts`](./EX11-023.test.ts) |
| EX11-024 | Cendrillmon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-024.ts`](./EX11-024.ts) · [`EX11-024.test.ts`](./EX11-024.test.ts) |
| EX11-025 | FunBeemon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-025.ts`](./EX11-025.ts) · [`EX11-025.test.ts`](./EX11-025.test.ts) |
| EX11-026 | Pteromon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-026.ts`](./EX11-026.ts) · [`EX11-026.test.ts`](./EX11-026.test.ts) |
| EX11-027 | Maquinamon                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-027.ts`](./EX11-027.ts) · [`EX11-027.test.ts`](./EX11-027.test.ts) |
| EX11-028 | Galemon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-028.ts`](./EX11-028.ts) · [`EX11-028.test.ts`](./EX11-028.test.ts) |
| EX11-029 | Turbomon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-029.ts`](./EX11-029.ts) · [`EX11-029.test.ts`](./EX11-029.test.ts) |
| EX11-030 | ForgeBeemon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-030.ts`](./EX11-030.ts) · [`EX11-030.test.ts`](./EX11-030.test.ts) |
| EX11-031 | Vespamon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-031.ts`](./EX11-031.ts) · [`EX11-031.test.ts`](./EX11-031.test.ts) |
| EX11-032 | GrandGalemon                   | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-032.ts`](./EX11-032.ts) · [`EX11-032.test.ts`](./EX11-032.test.ts) |
| EX11-033 | Maneuvermon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-033.ts`](./EX11-033.ts) · [`EX11-033.test.ts`](./EX11-033.test.ts) |
| EX11-034 | QueenBeemon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-034.ts`](./EX11-034.ts) · [`EX11-034.test.ts`](./EX11-034.test.ts) |
| EX11-035 | Zephagamon                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-035.ts`](./EX11-035.ts) · [`EX11-035.test.ts`](./EX11-035.test.ts) |
| EX11-036 | Dalphomon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-036.ts`](./EX11-036.ts) · [`EX11-036.test.ts`](./EX11-036.test.ts) |
| EX11-037 | Espimon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-037.ts`](./EX11-037.ts) · [`EX11-037.test.ts`](./EX11-037.test.ts) |
| EX11-038 | Sunarizamon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-038.ts`](./EX11-038.ts) · [`EX11-038.test.ts`](./EX11-038.test.ts) |
| EX11-039 | HoverEspimon                   | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-039.ts`](./EX11-039.ts) · [`EX11-039.test.ts`](./EX11-039.test.ts) |
| EX11-040 | Mulemon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-040.ts`](./EX11-040.ts) · [`EX11-040.test.ts`](./EX11-040.test.ts) |
| EX11-041 | Oblivimon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-041.ts`](./EX11-041.ts) · [`EX11-041.test.ts`](./EX11-041.test.ts) |
| EX11-042 | MockingBirdmon                 | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-042.ts`](./EX11-042.ts) · [`EX11-042.test.ts`](./EX11-042.test.ts) |
| EX11-043 | Invisimon                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-043.ts`](./EX11-043.ts) · [`EX11-043.test.ts`](./EX11-043.test.ts) |
| EX11-044 | Pyramidimon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-044.ts`](./EX11-044.ts) · [`EX11-044.test.ts`](./EX11-044.test.ts) |
| EX11-045 | Metatromon                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-045.ts`](./EX11-045.ts) · [`EX11-045.test.ts`](./EX11-045.test.ts) |
| EX11-046 | Galacticmon                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-046.ts`](./EX11-046.ts) · [`EX11-046.test.ts`](./EX11-046.test.ts) |
| EX11-047 | Impmon                         | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-047.ts`](./EX11-047.ts) · [`EX11-047.test.ts`](./EX11-047.test.ts) |
| EX11-048 | Ghostmon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-048.ts`](./EX11-048.ts) · [`EX11-048.test.ts`](./EX11-048.test.ts) |
| EX11-049 | Punkmon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-049.ts`](./EX11-049.ts) · [`EX11-049.test.ts`](./EX11-049.test.ts) |
| EX11-050 | Loudmon                        | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-050.ts`](./EX11-050.ts) · [`EX11-050.test.ts`](./EX11-050.test.ts) |
| EX11-051 | Necromon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-051.ts`](./EX11-051.ts) · [`EX11-051.test.ts`](./EX11-051.test.ts) |
| EX11-052 | HeavyMetaldramon               | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-052.ts`](./EX11-052.ts) · [`EX11-052.test.ts`](./EX11-052.test.ts) |
| EX11-053 | Omekamon                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-053.ts`](./EX11-053.ts) · [`EX11-053.test.ts`](./EX11-053.test.ts) |
| EX11-054 | Owen Dreadnought               | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-054.ts`](./EX11-054.ts) · [`EX11-054.test.ts`](./EX11-054.test.ts) |
| EX11-055 | Chitose Horaiji                | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-055.ts`](./EX11-055.ts) · [`EX11-055.test.ts`](./EX11-055.test.ts) |
| EX11-056 | Ryutaro Williams               | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-056.ts`](./EX11-056.ts) · [`EX11-056.test.ts`](./EX11-056.test.ts) |
| EX11-057 | Suzune Kazuki                  | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-057.ts`](./EX11-057.ts) · [`EX11-057.test.ts`](./EX11-057.test.ts) |
| EX11-058 | Yao Qinglan                    | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-058.ts`](./EX11-058.ts) · [`EX11-058.test.ts`](./EX11-058.test.ts) |
| EX11-059 | Reina Oumi                     | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-059.ts`](./EX11-059.ts) · [`EX11-059.test.ts`](./EX11-059.test.ts) |
| EX11-060 | Arisa Kinosaki                 | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-060.ts`](./EX11-060.ts) · [`EX11-060.test.ts`](./EX11-060.test.ts) |
| EX11-061 | Mirai Kinosaki                 | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-061.ts`](./EX11-061.ts) · [`EX11-061.test.ts`](./EX11-061.test.ts) |
| EX11-062 | Shoto Kazama                   | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-062.ts`](./EX11-062.ts) · [`EX11-062.test.ts`](./EX11-062.test.ts) |
| EX11-063 | Winr                           | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-063.ts`](./EX11-063.ts) · [`EX11-063.test.ts`](./EX11-063.test.ts) |
| EX11-064 | Altea                          | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-064.ts`](./EX11-064.ts) · [`EX11-064.test.ts`](./EX11-064.test.ts) |
| EX11-065 | Close                          | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-065.ts`](./EX11-065.ts) · [`EX11-065.test.ts`](./EX11-065.test.ts) |
| EX11-066 | Xeno                           | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-066.ts`](./EX11-066.ts) · [`EX11-066.test.ts`](./EX11-066.test.ts) |
| EX11-067 | Dokuson Aruba                  | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-067.ts`](./EX11-067.ts) · [`EX11-067.test.ts`](./EX11-067.test.ts) |
| EX11-068 | Violet Inboots                 | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-068.ts`](./EX11-068.ts) · [`EX11-068.test.ts`](./EX11-068.test.ts) |
| EX11-069 | Yuuki                          | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-069.ts`](./EX11-069.ts) · [`EX11-069.test.ts`](./EX11-069.test.ts) |
| EX11-070 | Unchained                      | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-070.ts`](./EX11-070.ts) · [`EX11-070.test.ts`](./EX11-070.test.ts) |
| EX11-071 | Cool Boy                       | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-071.ts`](./EX11-071.ts) · [`EX11-071.test.ts`](./EX11-071.test.ts) |
| EX11-072 | Unique Emblem: Guardian Vortex | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-072.ts`](./EX11-072.ts) · [`EX11-072.test.ts`](./EX11-072.test.ts) |
| EX11-073 | ExMaquinamon                   | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-073.ts`](./EX11-073.ts) · [`EX11-073.test.ts`](./EX11-073.test.ts) |
| EX11-074 | Vortexdramon                   | 2/2            | 2/2      | 2/2              | 2/2        | 2/2   | 10/10 | [`EX11-074.ts`](./EX11-074.ts) · [`EX11-074.test.ts`](./EX11-074.test.ts) |
