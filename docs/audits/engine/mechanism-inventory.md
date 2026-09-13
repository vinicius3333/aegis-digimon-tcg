---
title: Engine mechanism audit inventory
updated: 2026-09-12
---

# Engine mechanism audit inventory

## Status

Current bounded contract review is complete for the 46 canonical keyword
names and their reviewed runtime consumer classes. Catalog marker inventory is
discovery evidence, not card or whole-catalog certification. Counts include
printed, referenced, and granted forms; parameterized forms are reconciled in
the authoritative sections below.

Baseline: `de4dda717d8c9e0c2420796cb387f68b1379b863`.
Plan: `docs/plans/2026-09-12-engine-mechanism-audit-design.md`.

## Gates

Initial conformance baseline: 28 files / 398 tests passed using
`pnpm --filter @aegis/api exec vitest run src/engine/conformance --pool=forks --maxWorkers=1 --no-file-parallelism`.

## Catalog marker discovery

Source: `packages/shared/src/cards/data/cards.json`, main, inherited, and
security fields. Counts are distinct card IDs per exact marker.

| Exact marker                                                                 | Cards | Example consumers            |
| ---------------------------------------------------------------------------- | ----- | ---------------------------- |
| Alliance                                                                     | 83    | AD1-009, AD1-012, AD1-016    |
| Armor Purge                                                                  | 45    | BT10-012, BT10-015, BT10-026 |
| Ascension                                                                    | 6     | BT25-034, BT25-040, BT26-029 |
| Barrier                                                                      | 67    | BT13-041, BT13-043, BT14-035 |
| Blast DNA Digivolve ([Alphamon] + [Ouryumon])                                | 1     | BT20-060                     |
| Blast DNA Digivolve ([Angewomon] + [LadyDevimon])                            | 1     | EX6-029                      |
| Blast DNA Digivolve ([Breakdramon] + [Slayerdramon])                         | 1     | BT20-045                     |
| Blast DNA Digivolve ([DinoBeemon] + [Paildramon])                            | 1     | BT20-076                     |
| Blast DNA Digivolve ([Durandamon] + [BryweLudramon])                         | 1     | EX6-011                      |
| Blast DNA Digivolve ([Fenriloogamon] + [Kazuchimon])                         | 1     | BT20-081                     |
| Blast DNA Digivolve ([WarGreymon] + [MetalGarurumon])                        | 1     | BT17-078                     |
| Blast Digivolve                                                              | 67    | AD1-005, BT14-014, BT14-026  |
| Blitz                                                                        | 26    | BT10-014, BT10-070, BT10-112 |
| Blocker                                                                      | 464   | AD1-005, AD1-007, AD1-009    |
| Collision                                                                    | 42    | BT16-032, BT16-058, BT16-061 |
| DNA Digivolution: 0 from [Apollomon] + [Dianamon]                            | 1     | EX5-073                      |
| DNA Digivolution: 0 from blue Lv.4 + green Lv.4                              | 1     | ST9-05                       |
| DNA Digivolution: 0 from green Lv.4 + blue Lv.4                              | 1     | ST9-11                       |
| DNA Digivolution: 0 from yellow Lv.5 + purple Lv.5                           | 1     | ST10-06                      |
| De-DigivoLv.e 1                                                              | 3     | BT2-105, BT3-107, P-015      |
| De-DigivoLv.e 4                                                              | 1     | BT2-106                      |
| De-Digivolve                                                                 | 9     | BT11-069, BT16-055, BT21-074 |
| De-Digivolve 1                                                               | 4     | EX5-044, EX5-047, EX5-055    |
| De-Digivolve 1                                                               | 87    | AD1-018, BT10-059, BT10-066  |
| De-Digivolve 2                                                               | 21    | AD1-018, BT16-026, BT2-066   |
| De-Digivolve 3                                                               | 9     | AD1-009, BT16-036, BT5-105   |
| De-Digivolve 4                                                               | 2     | BT23-096, P-173              |
| De-Digivolve1                                                                | 23    | BT17-055, BT17-075, BT18-041 |
| De-Digivolve2                                                                | 5     | BT18-072, BT19-026, EX6-056  |
| De-Digivolve3                                                                | 3     | BT17-073, BT18-071, EX8-064  |
| De-Digivolve4                                                                | 1     | EX7-049                      |
| Decode                                                                       | 1     | EX11-058                     |
| Decode (Blue Lv.4)                                                           | 1     | BT19-024                     |
| Decode (Blue Lv.5)                                                           | 1     | BT19-027                     |
| Decode (Blue/Yellow Lv.3)                                                    | 1     | BT22-015                     |
| Decode (Lv.3 w/[Aqua]/[Sea Animal] in any trait)                             | 1     | BT22-021                     |
| Decode (Lv.4 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)     | 1     | EX12-016                     |
| Decode (Lv.4 or lower w/[Aqua]/[Sea Animal] in any trait or w/[TB] trait)    | 1     | EX12-031                     |
| Decode (Lv.4 or lower w/[DS] trait)                                          | 1     | EX12-028                     |
| Decode (Lv.4 or lower w/[Gabumon]/[Garurumon] in name or w/[NSo]/[VB] trait) | 1     | EX12-032                     |
| Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)                  | 1     | EX12-014                     |
| Decode (Lv.4 or lower w/[Gammamon] in text} or w/[VB] trait)                 | 1     | EX12-014                     |
| Decode (Lv.4 or lower w/[Holy Beast]/[NSp]/[VB] trait)                       | 1     | EX12-044                     |
| Decode (Lv.4 w/[Aqua]/[Sea Animal] in any trait)                             | 1     | BT22-024                     |
| Decode (Lv.5 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)     | 1     | EX12-017                     |
| Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait or w/[TB] trait)    | 1     | EX12-036                     |
| Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait)                    | 1     | EX11-018                     |
| Decode (Lv.5 or lower w/[Gabumon]/[Garurumon] in name or w/[ME]/[VB] trait)  | 1     | EX12-035                     |
| Decode (Lv.5 w/[Aqua]/[Sea Animal] in any trait)                             | 1     | BT22-027                     |
| Decode (Lv.6 or lower w/[Aqua]/[Sea Animal] in any trait)                    | 1     | BT22-028                     |
| Decode (Red/Black Lv.3)                                                      | 1     | BT22-015                     |
| Decode ([Aegiomon])                                                          | 5     | BT24-014, BT25-025, BT25-053 |
| Decode ([Betamon])/([ModokiBetamon])                                         | 1     | P-214                        |
| Decode ([Calmaramon])                                                        | 1     | BT24-027                     |
| Decode ([Junomon]/Lv.5 or lower w/[Iliad] trait)                             | 1     | BT26-083                     |
| Decode ([Lanamon])                                                           | 1     | BT24-023                     |
| Decode ([Plutomon])                                                          | 1     | BT26-079                     |
| Decode ([Sistermon Blanc])                                                   | 1     | EX13-065                     |
| Decode ([Sistermon Noir]/[Sistermon Ciel])                                   | 1     | EX13-066                     |
| Decoy (Black)                                                                | 4     | BT16-052, BT6-059, BT6-064   |
| Decoy (Black/White)                                                          | 1     | P-045                        |
| Decoy (Deva/Four Sovereigns)                                                 | 1     | EX5-050                      |
| Decoy (Red)/(Black)                                                          | 1     | EX13-014                     |
| Decoy (Red/Black)                                                            | 3     | BT20-017, BT23-013, ST12-12  |
| Decoy ([Bagra Army])                                                         | 1     | BT11-082                     |
| Decoy ([D-Brigade])                                                          | 1     | EX3-046                      |
| Decoy ([Puppet] trait)                                                       | 1     | ST19-02                      |
| Decoy ([Xros Heart] trait)                                                   | 1     | BT19-031                     |
| Delay                                                                        | 136   | BT10-097, BT10-100, BT13-110 |
| Detach ([Seven Code] trait)                                                  | 7     | BT26-010, BT26-019, BT26-028 |
| Digi-Burst                                                                   | 18    | BT4-004, BT4-008, BT4-021    |
| Digi-Burst 1                                                                 | 2     | BT4-072, BT5-046             |
| Digi-Burst 2                                                                 | 21    | BT4-012, BT4-017, BT4-019    |
| Digi-Burst 3                                                                 | 3     | BT4-049, BT5-057, BT5-079    |
| Digi-Burst 4                                                                 | 1     | BT4-062                      |
| Digi-Burst up to 4                                                           | 1     | BT7-040                      |
| Digisorption                                                                 | 3     | BT3-056, BT5-049, BT5-100    |
| Digisorption -2                                                              | 5     | BT10-052, BT2-045, BT5-058   |
| Digisorption -3                                                              | 5     | BT2-047, BT2-050, BT3-054    |
| Draw 1                                                                       | 395   | AD1-010, AD1-020, AD1-021    |
| Draw 2                                                                       | 89    | AD1-002, AD1-015, BT1-041    |
| Draw 3                                                                       | 2     | BT7-069, P-024               |
| Engage                                                                       | 5     | BT26-016, BT26-033, EX12-019 |
| Evade                                                                        | 25    | AD1-012, AD1-014, BT11-112   |
| Execute                                                                      | 15    | BT20-072, BT20-079, BT23-069 |
| Fortitude                                                                    | 30    | BT20-034, BT20-035, BT22-051 |
| Fragment (2)                                                                 | 4     | BT26-055, BT26-077, EX12-059 |
| Fragment (3)                                                                 | 7     | BT22-061, EX10-033, EX10-034 |
| Guard                                                                        | 6     | EX12-056, EX12-057, EX12-072 |
| Ice Clad                                                                     | 7     | BT18-026, EX7-017, EX7-021   |
| Iceclad                                                                      | 5     | BT22-077, BT25-103, EX11-016 |
| Jamming                                                                      | 107   | AD1-010, AD1-015, BT1-016    |
| Link +1                                                                      | 9     | AD1-005, BT21-101, BT22-039  |
| Link +2                                                                      | 1     | EX11-073                     |
| Link +6                                                                      | 1     | BT26-086                     |
| Material Save 1                                                              | 3     | BT10-111, BT11-009, BT19-063 |
| Material Save 2                                                              | 5     | BT10-009, BT10-024, BT11-012 |
| Material Save 3                                                              | 1     | BT10-013                     |
| Material Save 4                                                              | 2     | BT11-019, BT19-014           |
| Mind Link                                                                    | 9     | BT14-086, BT14-087, BT16-086 |
| Overclock                                                                    | 1     | EX11-060                     |
| Overclock ([Appmon] Trait)                                                   | 1     | BT24-079                     |
| Overclock ([Composite] trait)                                                | 1     | BT19-101                     |
| Overclock ([Puppet] Trait)                                                   | 4     | BT22-036, BT22-040, BT22-042 |
| Overclock ([Puppet] trait)                                                   | 4     | EX7-027, EX7-030, ST19-08    |
| Overclock ([Unidentified] Trait)                                             | 1     | BT24-065                     |
| Partition (Blue Lv.4 & Green Lv.4)                                           | 1     | AD1-011                      |
| Partition (Yellow Lv.6 & Purple/Black Lv.6)                                  | 1     | P-221                        |
| Partition (Yellow Lv.6 + Green/Black Lv.6)                                   | 1     | BT20-037                     |
| Partition (Yellow/Black Lv.6 + Green/Purple Lv.6)                            | 1     | EX6-062                      |
| Partition ([Angewomon] & [LadyDevimon])                                      | 1     | BT23-102                     |
| Partition ([Apollomon] & [Dianamon])                                         | 1     | BT25-103                     |
| Partition ([WarGreymon] & [MetalGarurumon])                                  | 1     | AD1-025                      |
| Partition (black Lv.4 & yellow Lv.4)                                         | 1     | BT16-063                     |
| Partition (blue Lv.4 & green Lv.4)                                           | 1     | BT16-025                     |
| Partition (green Lv.5 & blue Lv.5)                                           | 1     | BT23-047                     |
| Partition (purple Lv.4 & red Lv.4)                                           | 1     | BT16-077                     |
| Partition (red Lv.4 & yellow Lv.4)                                           | 1     | BT16-012                     |
| Partition (yellow Lv.6 & black Lv.6)                                         | 1     | BT16-036                     |
| Piercing                                                                     | 174   | AD1-004, AD1-008, AD1-009    |
| Progress                                                                     | 10    | BT21-025, BT21-029, BT24-017 |
| Raid                                                                         | 94    | AD1-001, AD1-003, AD1-004    |
| Reboot                                                                       | 131   | AD1-013, BT10-060, BT10-105  |
| Recovery +1                                                                  | 14    | BT25-030, BT25-036, BT25-043 |
| Recovery +1 (Deck)                                                           | 88    | BT1-060, BT1-063, BT1-087    |
| Recovery +2                                                                  | 1     | BT26-103                     |
| Recovery +2 (Deck)                                                           | 3     | BT2-039, BT24-101, BT4-047   |
| Recovery +3                                                                  | 1     | BT26-083                     |
| Retaliation                                                                  | 95    | BT10-071, BT10-078, BT10-083 |
| Rush                                                                         | 100   | AD1-002, AD1-008, AD1-021    |
| S Attack +1                                                                  | 1     | ST15-11                      |
| Save                                                                         | 85    | BT10-008, BT10-019, BT10-020 |
| Scapegoat                                                                    | 16    | BT20-080, BT22-095, BT23-066 |
| Security A. +1                                                               | 88    | AD1-004, AD1-005, AD1-007    |
| Security A. +2                                                               | 1     | EX10-022                     |
| Security A. -1                                                               | 15    | AD1-017, BT16-022, BT19-035  |
| Security A. -2                                                               | 4     | BT16-034, BT19-093, BT22-031 |
| Security Attack                                                              | 5     | BT10-042, BT12-039, BT12-040 |
| Security Attack +                                                            | 1     | EX6-031                      |
| Security Attack +1                                                           | 144   | BT1-017, BT1-018, BT1-025    |
| Security Attack +2                                                           | 3     | BT1-114, BT3-058, BT7-112    |
| Security Attack +3                                                           | 1     | EX6-062                      |
| Security Attack -                                                            | 1     | EX6-031                      |
| Security Attack -1                                                           | 44    | BT10-030, BT10-035, BT10-038 |
| Security Attack -2                                                           | 12    | BT12-044, BT13-038, BT18-041 |
| Security Attack -3                                                           | 2     | BT5-044, ST3-15              |
| Succession (Lv.6 w/[Chronomon] in name)                                      | 1     | BT26-060                     |
| Succession ([Bacchusmon])                                                    | 1     | BT26-080                     |
| Succession ([Ceresmon])                                                      | 1     | BT26-032                     |
| Succession ([Jupitermon])                                                    | 1     | BT26-103                     |
| Training                                                                     | 21    | BT26-023, BT26-040, EX9-008  |
| Use Req. ([Appmon] trait)                                                    | 1     | BT25-098                     |
| Use Req. ([BEATBREAK] trait)                                                 | 1     | ST23-15                      |
| Use Req. ([CS] trait)                                                        | 1     | P-238                        |
| Use Req. ([DATA SQUAD] trait)                                                | 2     | P-235, ST24-15               |
| Use Req. ([DM] trait)                                                        | 2     | BT26-099, P-243              |
| Use Req. ([Glowing Dawn] trait)                                              | 1     | P-236                        |
| Use Req. ([ME] trait)                                                        | 1     | EX12-072                     |
| Use Req. ([Maquinamon] in text)                                              | 1     | P-237                        |
| Use Req. ([NSp]/[DS]/[NSo]/[WG]/[ME]/[VB] trait)                             | 1     | EX12-073                     |
| Use Req. ([SW] trait)                                                        | 1     | EX12-071                     |
| Use Req. ([Seven Code] trait)                                                | 1     | BT26-102                     |
| Use Req. ([Shambala] trait)                                                  | 2     | EX12-074, EX12-075           |
| Use Req. ([TB] trait)                                                        | 1     | EX12-070                     |
| Use Req. ([TS] trait)                                                        | 4     | BT25-093, BT25-100, BT25-101 |
| Use Req. ([VB] trait)                                                        | 1     | EX12-069                     |
| Vortex                                                                       | 19    | BT20-101, BT21-095, BT25-053 |

## Mechanism queue

| Mechanism                   | Owner document                                          | Status                                                                         |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Citation source drift       | `kb-citation-integrity.md`                              | bounded integrity audit delivered; unpinned citations and normative proof open |
| Activation costs            | `activation-costs.md`                                   | refusal bug reproduced and repaired; audit incomplete                          |
| Trigger ordering            | `trigger-ordering.md`                                   | queued                                                                         |
| Duration and identity       | `effect-duration-and-identity.md`                       | bounded contract audit delivered; existing proof reused                        |
| Replacements                | `replacement-effects.md`                                | batch/singular/DigiXros corrections delivered; wider producer proof open       |
| Combat and keyword families | existing documents where applicable; split by lifecycle | queued                                                                         |
| Targeting and selection     | `targeting-and-selection.md`                            | queued                                                                         |
| Zones and visibility        | `zones-and-visibility.md`                               | queued                                                                         |
| Evolution and reductions    | existing evolution documents where applicable           | queued                                                                         |

## Open items

- Reconcile every discovered marker with canonical IR keyword names and runtime grants.
- Inspect all distinct consumer parameter shapes before claiming keyword coverage.
- Derive complete normative obligation lists from full KB sources.
- Complete every mechanism and affected consumer gate; initial baseline is insufficient.

## History

- 2026-09-12: initial inventory from the working catalog; no completion credit awarded.

## Canonical structured keyword inventory

This historical snapshot inventories the 45-entry canonical union that preceded Succession's reconciliation against every recursively located `keyword` object in committed IR. Declaration counts refer to `effects[*].keywords[*]`; other counts include action/grant and reference objects and must be traced to distinguish grants from requests. Printed-only and non-keyword-object grant representations remain separate obligations. Shape counts ignore `raw` prose but retain amounts and trait parameters. No behavioral score follows from these counts. The current 46-name denominator and counts supersede this snapshot below.

| Canonical keyword    | Declaration cards | Other structured reference cards | Distinct structured shapes |
| -------------------- | ----------------: | -------------------------------: | -------------------------: |
| `Blocker`            |               304 |                              161 |                          2 |
| `Piercing`           |               102 |                               84 |                          2 |
| `Rush`               |                37 |                               68 |                          2 |
| `Raid`               |                74 |                               20 |                          1 |
| `Reboot`             |                92 |                               51 |                          2 |
| `Jamming`            |                71 |                               42 |                          2 |
| `Retaliation`        |                63 |                               30 |                          1 |
| `Barrier`            |                61 |                                7 |                          1 |
| `Evade`              |                22 |                                5 |                          1 |
| `Save`               |                47 |                                0 |                          1 |
| `Delay`              |               132 |                               11 |                          1 |
| `Alliance`           |                59 |                               37 |                          1 |
| `Fortitude`          |                28 |                                2 |                          1 |
| `Blitz`              |                14 |                               12 |                          2 |
| `Collision`          |                26 |                               17 |                          1 |
| `Vortex`             |                15 |                                3 |                          1 |
| `Decoy`              |                 9 |                                3 |                          2 |
| `Scapegoat`          |                12 |                                5 |                          1 |
| `Execute`            |                 8 |                                7 |                          2 |
| `Progress`           |                 9 |                                1 |                          1 |
| `IceClad`            |                12 |                                1 |                          1 |
| `Training`           |                19 |                                2 |                          1 |
| `Armor Purge`        |                46 |                                0 |                          1 |
| `Mind Link`          |                 6 |                                0 |                          1 |
| `Ascension`          |                 4 |                                2 |                          1 |
| `BlastDigivolve`     |                75 |                                0 |                          1 |
| `BlastDNADigivolve`  |                 7 |                                0 |                          1 |
| `Draw`               |                 2 |                                0 |                          1 |
| `SecurityAttack`     |                97 |                              221 |                          7 |
| `DeDigivolve`        |                 0 |                                0 |                          0 |
| `Recovery`           |                11 |                               13 |                          1 |
| `DigiBurst`          |                27 |                                1 |                          5 |
| `Digisorption`       |                10 |                                0 |                          2 |
| `MaterialSave`       |                12 |                                1 |                          4 |
| `DigiXrosSubstitute` |                 0 |                                1 |                          1 |
| `Link`               |                 9 |                                2 |                          3 |
| `LinkMax`            |                 0 |                                1 |                          1 |
| `Fragment`           |                11 |                                0 |                          2 |
| `Partition`          |                13 |                                0 |                          1 |
| `Decode`             |                28 |                                0 |                          1 |
| `Overclock`          |                11 |                                0 |                          2 |
| `UseReq`             |                 2 |                                0 |                          1 |
| `Engage`             |                 5 |                                0 |                          1 |
| `Guard`              |                 3 |                                1 |                          1 |
| `Detach`             |                 7 |                                0 |                          1 |

The historical snapshot's structured names outside its then-canonical union included `Succession`; the current 46-name reconciliation below places it in the canonical union. Other structured names outside the current union are `EndOfAttack`, `OnDeletion`, and `Unblockable`.

### Parameterized structured shapes

- `Blocker`: `{"keyword":"Blocker","kind":"selfHasKeyword"}`; `{"keyword":"Blocker"}`.
- `Piercing`: `{"keyword":"Piercing","kind":"selfHasKeyword"}`; `{"keyword":"Piercing"}`.
- `Rush`: `{"keyword":"Rush","kind":"SetBaseDP","restriction":"digivolve","value":12000}`; `{"keyword":"Rush"}`.
- `Reboot`: `{"keyword":"Reboot","kind":"selfHasKeyword"}`; `{"keyword":"Reboot"}`.
- `Jamming`: `{"keyword":"Jamming","kind":"selfHasKeyword"}`; `{"keyword":"Jamming"}`.
- `Blitz`: `{"keyword":"Blitz","kind":"selfHasKeyword"}`; `{"keyword":"Blitz"}`.
- `Decoy`: `{"colors":["Red","Black"],"keyword":"Decoy"}`; `{"keyword":"Decoy"}`.
- `Execute`: `{"keyword":"Execute","kind":"triggerAttackBy"}`; `{"keyword":"Execute"}`.
- `SecurityAttack`: `{"amount":-1,"keyword":"SecurityAttack"}`; `{"amount":-2,"keyword":"SecurityAttack"}`; `{"amount":-3,"keyword":"SecurityAttack"}`; `{"amount":1,"keyword":"SecurityAttack"}`; `{"amount":2,"keyword":"SecurityAttack"}`; `{"amount":3,"keyword":"SecurityAttack"}`; `{"keyword":"SecurityAttack"}`.
- `DigiBurst`: `{"amount":1,"keyword":"DigiBurst"}`; `{"amount":2,"keyword":"DigiBurst"}`; `{"amount":3,"keyword":"DigiBurst"}`; `{"amount":4,"keyword":"DigiBurst"}`; `{"keyword":"DigiBurst","kind":"selfHasKeyword"}`.
- `Digisorption`: `{"amount":-2,"keyword":"Digisorption"}`; `{"amount":-3,"keyword":"Digisorption"}`.
- `MaterialSave`: `{"amount":1,"keyword":"MaterialSave"}`; `{"amount":2,"keyword":"MaterialSave"}`; `{"amount":3,"keyword":"MaterialSave"}`; `{"amount":4,"keyword":"MaterialSave"}`.
- `Link`: `{"amount":1,"keyword":"Link"}`; `{"amount":2,"keyword":"Link"}`; `{"amount":6,"keyword":"Link"}`.
- `Fragment`: `{"amount":2,"keyword":"Fragment"}`; `{"amount":3,"keyword":"Fragment"}`.
- `Overclock`: `{"keyword":"Overclock"}`; `{"keyword":"Overclock","qualifier":"Puppet"}`; `{"keyword":"Overclock","traitFilter":["Puppet"]}` (EX7-030).

The `Detach` union comment is stale: seven BT26 cards declare it in committed IR, confirmed against BT26-010’s direct module. The current official manual defines Detach and Succession; neither should remain an invented or source-free provisional mechanic. Zero structured declarations also cannot prove absence of runtime behavior, because printed matching or another action representation may implement the keyword.

## Latest manual alignment

The [official manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf), version 4.2 updated 2026-08-18, adds normative Detach (§16-46) and Succession (§16-47) definitions. The canonical union includes both Detach and Succession, and the four committed Succession consumers are reconciled below. This is an inventory alignment, not proof of complete runtime behavior.

At baseline, Detach had a concrete runtime scope mismatch: `engine/effects/detach.ts` documented a combat-only deletion reaction and effect deletion never called its seam. The shared departure correction now lives in [detach-lifecycle.md](detach-lifecycle.md). Current §16-46 covers departure other than the owner’s effects, requiring a matching linked-card payment; the public proof is bounded to the provider and departure forms listed in that owner document. Existing Q6964 battle proof does not certify the whole keyword contract.

### Detach public red reproduction

`engine/conformance/keyword-detach-lifecycle.test.ts` plays ST1-16 Gaia Force through the public `playCard` intent with a neutral red source and an opposing BT26-019 Mailmon linked to BT26-010 Roleplaymon. Automatic acceptance and card selection are enabled. After the Option reaches trash and decisions settle, Mailmon is absent instead of surviving by trashing the eligible Seven Code link. Result: 1 failed / 0 passed at the observable permanent-survival assertion. This proves the opponent-effect deletion gap independently of the old combat-only test. The reproduction is a working test pending the shared correction and is not a green delivery claim.

Exact-name correction delivery: `9ffe1bf8c`; structured inventory checkpoint: `7a484aee2`. BT14 final persisted-IR check passed: 102 synchronized records, one semantic change against `e65036cc1`, zero changes outside the set. All broader keyword lifecycle and replacement obligations remain open.

## Shared Detach correction checkpoint

The public red reproduction is now green through the shared leave-prevention path, with the separate combat reaction removed. [detach-lifecycle.md](detach-lifecycle.md) records the current source, seven printed consumers, departure/refusal/trait proof, 246 files / 3049 green regression tests, and explicit unresolved obligations. The earlier red test is now part of the implementation delivery; its failure is historical evidence rather than current test state. No keyword family or set certification follows from this checkpoint.

## Status-index formatter compatibility

Baseline `1b5760539`. Required `pnpm audit:index --check` rejected the committed README even though all 66 collection rows matched their ledgers: the generator emitted an unpadded Markdown table while project Oxfmt aligned its columns. A temporary regeneration diff contained formatting changes only, and the README was restored byte-for-byte to the baseline.

`tools/audit-docs/build-index.mjs` now emits aligned columns compatible with Oxfmt. It still compares exact generated content and rejects genuine status drift. No collection status, score, date or evidence reference changed. Three isolated real-CLI tests in `tools/audit-docs-index.test.mjs` prove formatter byte preservation and idempotency; changed status rejection without writing followed by successful regeneration; and invalid front matter rejection before overwriting the index. They execute a temporary copy of the real generator and the installed project formatter, with teardown outside the audit directory.

All three tests passed. Temporarily restoring the baseline generator reproduced one failure at formatter byte preservation, with two other tests passing; the fixed source was restored in `finally`. Actual repository `pnpm audit:index --check` passes for 66 sets and README remains unchanged. This is tooling integrity evidence, not certification of the indexed collections or their historical scores.

Index delivery passed scoped Oxlint, changed-file Oxfmt, clean diff checks and independent read-only review. The generated README is byte-identical to the baseline; no status index change is required.

## Succession canonical reconciliation

At baseline `ba432186d`, the canonical union omitted the four committed Succession
consumers. The correction adds its typed canonical name and replaces the erroneous
UseReq root markers on BT26-080/103; BT26-032/060 lose their casts. The canonical
union now contains 46 names. The outside-union list above remains historical discovery evidence; the
canonical mismatch is resolved and behavioral contracts are recorded in the
current reconciliation below.
EndOfAttack/OnDeletion are timing or projection tokens and Unblockable is a
restriction encoding; their final semantic classification remains open.
Public path, counterfactual, consumer-shape and unresolved normative evidence belongs
to [succession-lifecycle.md](succession-lifecycle.md). Full keyword certification,
including nested-source shapes beyond the demonstrated Bacchusmon exclusion,
source/face changes and reset, remains open.

## Hidden stack source checkpoint

The copied and inherited live-source face-down boundary is owned by [stack-card-information.md](stack-card-information.md). Three public Giromon placement/evolution/attack sequences distinguish two baseline failures from a neutral hidden control. This adds a bounded contract, not certification of all hidden information;
highest-visible matching, snapshots, visibility changes, native scans and
dynamic references remain bounded to the readers listed in that owner ledger.
BT22 historical completion remains historical.

## Bottom relocation parameter checkpoint

BT11-088 public bottom placement/source-shedding evidence is owned by [BT11.md](../BT11.md#bt11-088--bagramon). Both entry timings now pass the existing relocation parameters required by printed text and Q2113; BT11 historical complete status is reopened. Shared relocation identity/event payloads, inherited treated-as-Digimon hosts, immunity and simultaneous departure remain separate open obligations.

## Relocation addition identity checkpoint

The source-shedding event contract is owned by [digivolution-card-placement.md](digivolution-card-placement.md). Two real public Bagramon entry events expose the incorrect identity list; single/batch stack/link arithmetic is explicitly supplemental. Position metadata, live recalculation, public batch and competing departures remain open.

## Placement position checkpoint

The next bounded placement-event position audit is owned by [digivolution-card-placement.md](digivolution-card-placement.md#position-checkpoint-contract-and-implementation). Seven public Bagramon/Giromon events expose inverted loose-card metadata or missing relocation metadata. Default/top/bottom adapter paths are explicit; downstream reactions, source turnover and other position producers remain open.

## Deck-top cost placement checkpoint

The shared deck-to-stack paid placement shape is owned by [digivolution-card-placement.md](digivolution-card-placement.md#deck-top-payment-checkpoint). All three identified persisted/authored EX9 providers now report the physical bottom position; nine public paid/refused/empty sequences retain their actual payload and zones. Historical EX9 completion is reopened; Training/OPT/reset/duration and the full live consumer denominator remain open.

The EX9 deck-payment checkpoint also corrects three optional whole-effect processing conditions against §15-7-4/5. Empty-deck choices remain available; accepted impossible payment skips the payload, while targetless payloads do not prohibit payment. Eleven public cases and isolated metadata/module counterfactuals are owned by [digivolution-card-placement.md](digivolution-card-placement.md#deck-top-payment-checkpoint). EX9 sync/check changes exactly three records; final focused, collection, full API and workspace type gates pass, as recorded in the engine owner.

Digi-Egg bottom placement: two real production-turn providers expose incorrect source face-down state and missing bottom event position. §4-7-5 and exact catalog text require face-up placement; four public egg/non-egg controls plus isolated mutations are owned by [digivolution-card-placement.md](digivolution-card-placement.md#digi-egg-bottom-placement-checkpoint). BT13/EX6 historical completion is reopened. Joint Drasil ordering and distinct Mother Eater/top-placement producers remain open.

## CURRENT keyword reconciliation (2026-09-12)

This is the reproducible current snapshot for the remaining keyword audit. It
supersedes the earlier 45-entry table above where counts changed after
Succession was reconciled. The discovery denominator is 46 canonical names;
the counts below are card-ID sets and are evidence of representation only.

Discovery command (run from the repository root):

```sh
node <<'NODE'
const fs=require('fs');
const ir=JSON.parse(fs.readFileSync('packages/shared/src/effects/effects.json'));
const source=fs.readFileSync('packages/shared/src/effects/ir/keywords.ts','utf8');
const canonical=[...source.matchAll(/\| "([^"]+)"/g)].map(m=>m[1]);
const decl=new Map(), refs=new Map(), shapes=new Map(), unknown=new Map();
function walk(x,id,path=''){ if(!x||typeof x!=='object') return;
  if(Array.isArray(x)){x.forEach((v,i)=>walk(v,id,path+'['+i+']'));return;}
  if(typeof x.keyword==='string'){
    const k=x.keyword, shape=JSON.stringify(Object.fromEntries(Object.entries(x).filter(([n])=>n!=='raw')));
    for(const [m,v] of [[refs, id],[shapes, shape]]) { if(!m.has(k))m.set(k,new Set());m.get(k).add(v); }
    if(path.includes('.effects[')&&path.includes('.keywords[')){if(!decl.has(k))decl.set(k,new Set());decl.get(k).add(id)}
    if(!canonical.includes(k)){if(!unknown.has(k))unknown.set(k,new Set());unknown.get(k).add(id)}
  }
  Object.entries(x).forEach(([n,v])=>walk(v,id,path+'.'+n)); }
for(const [id,e] of Object.entries(ir)) walk(e,id);
console.log('cards',Object.keys(ir).length,'canonical',canonical.length);
for(const k of [...new Set([...canonical,...refs.keys()])]) console.log(k,decl.get(k)?.size||0,refs.get(k)?.size||0,shapes.get(k)?.size||0);
console.log('unknown', [...unknown].map(([k,v])=>k+':'+v.size+' '+[...v].join(',')).join('; '));
NODE
```

The command reports 4,455 persisted IR entries, 46 canonical names, and the
following reconciliation (columns are declaration cards, all structured
reference cards, and distinct structured shapes):

| Keyword            |                                                                                                                                                                                                                                                                        Declarations |                                                                                                                                                                                                 References | Shapes |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | -----: |
| Blocker            | §16-5 `comprehensive-0223` (SHA-256 `f21e9a4a1278163e9b07ebe6f0776b3b15a6d1f9884771e498431baeb23e5a7d`) + §12-1 `comprehensive-0151` (SHA-256 `1c4e669751a989f9da2bdc3b1b198b4c2c4a03210f54b17ac1f6ba87faa9a566`); `keyword-blocker-source-changes.test.ts` and Blocker owner tests |                                 Native, inherited source-change, public block window, suspension/controller legality, and temporary-grant expiry are bounded; catalog/provider reconciliation remains open |
| Piercing           |                                                                                                                                       §16-7 `comprehensive-0225` (SHA-256 `f4d39e19988d50be36db0a6be32a7b3c639428df9116ff194f4a878181cc6cf5`); `keyword-piercing-lifecycle.test.ts` |                                                              Native win/control/loss/tie, mandatory security timing, and BT20-019 public grant are bounded; additional provider/source classes remain open |
| Rush               |                                                                                                                                                                                                                                                                                  36 |                                                                                                                                                                                                        105 |      2 |
| Raid               |                                                                                                                                                                                                                                                                                  73 |                                                                                                                                                                                                         94 |      1 |
| Reboot             |                                                                                                                                                                                                                                                                                  89 |                                                                                                                                                                                                        141 |      2 |
| Jamming            |                                                                                                                                                                                                                                                                                  71 |                                                                                                                                                                                                        111 |      2 |
| Retaliation        |                                                                                                                                                                                                                                                                                  62 |                                                                                                                                                                                                         93 |      1 |
| Barrier            |                                                                                                                                                                                                                                                                                  61 |                                                                                                                                                                                                         68 |      1 |
| Evade              |                                                                                                                                                                                                                                                                                  22 |                                                                                                                                                                                                         25 |      1 |
| Save               |                                                                                                                                                                                                                                                                                  47 |                                                                                                                                                                                                         47 |      1 |
| Delay              |                                                                                                                                                                                                                                                                                 134 |                                                                                                                                                                                                        135 |      1 |
| Alliance           |                                                                                                                                                                                                                                                                                  57 |                                                                                                                                                                                                         88 |      1 |
| Fortitude          |                                                                                                                                                                                                                                                                                  28 |                                                                                                                                                                                                         29 |      1 |
| Blitz              |                                                                                                                                                                                                                                                                                  14 |                                                                                                                                                                                                         25 |      2 |
| Collision          |                                                                                                                                                                                                                                                                                  25 |                                                                                                                                                                                                         43 |      1 |
| Vortex             |                                                                                                                                                                                                                                                                                  15 |                                                                                                                                                                                                         18 |      1 |
| Decoy              |                                                                                                                                                                                                                                                                                   9 |                                                                                                                                                                                                         12 |      2 |
| Scapegoat          |                                                                                                                                                                                                                                                                                  12 |                                                                                                                                                                                                         17 |      1 |
| Execute            |                                                                                                                                                                                                                                                                                   6 |                                                                                                                                                                                                         15 |      2 |
| Progress           |                                                                                                                                                                                                                                                                                   9 |                                                                                                                                                                                                         10 |      1 |
| IceClad            |                                                                                                                                                                                                                                                                                  12 |                                                                                                                                                                                                         13 |      1 |
| Training           |                                                                                                                                                                                                                                                                                  19 |                                                                                                                                                                                                         21 |      1 |
| Armor Purge        |                                                                                                                                                                                                                                                                                  46 |                                                                                                                                                                                                         46 |      1 |
| Mind Link          |                                                                                                                                                                                                                                                                                   6 |                                                                                                                                                                                                          6 |      1 |
| Ascension          |                                                                                                                                                                                                                                                                                   4 |                                                                                                                                                                                                          6 |      1 |
| BlastDigivolve     |                                                                                                                                 §16-26 `comprehensive-0245` (SHA-256 `a8f5302d1d7921d23a272be3d364452f991eb6a7657cbe6452cfcbecabe3347b`); `keyword-blast-digivolve-consent.test.ts` | Public refusal with two eligible hosts, explicit second-host effectKey choice, zero-cost draw/stack identity, and printed-requirement negative are passed; other provider effects remain provider-specific |
| BlastDNADigivolve  |                                                                                                                                                                                                                                                                                   7 |                                                                                                                                                                                                          7 |      1 |
| Draw               |                                                                                                                                                                                                                                                                                   2 |                                                                                                                                                                                                          2 |      1 |
| SecurityAttack     |                                                                                                                                                                                                                                                                                  93 |                                                                                                                                                                                                        317 |      7 |
| DeDigivolve        |                                                                                                                                                                                                                                                                                   0 |                                                                                                                                                                                                          0 |      0 |
| Recovery           |                                                                                                                                      §16-6 `comprehensive-0224` (SHA-256 `5639a0a98e8ef565e6fb4895f6e03d2beef6ce819056dae2015103762b7f655d`); `keyword-recovery-parameters.test.ts` |                                           Public +1/+2 exact face-down security order, five/six-security boundary, empty deck, and exact deck order are passed; grant/inherited amount classes remain open |
| DigiBurst          |                                                                                                                                                                                                                                                                                  27 |                                                                                                                                                                                                         28 |      5 |
| Digisorption       |                                                                                                                                                                                                                                                                                  10 |                                                                                                                                                                                                         10 |      2 |
| MaterialSave       |                                                                                                                                                                                                                                                                                  12 |                                                                                                                                                                                                         13 |      4 |
| DigiXrosSubstitute |                                                                                                                                                                                                                                                                                   0 |                                                                                                                                                                                                          1 |      1 |
| Link               |                                                                                                                                                                                                                                                                                   9 |                                                                                                                                                                                                         11 |      3 |
| LinkMax            |                                                                                                                                                                                                                                                                                   0 |                                                                                                                                                                                                          1 |      1 |
| Fragment           |                                                                                                                                                                                                                                                                                  10 |                                                                                                                                                                                                         11 |      2 |
| Partition          |                                                                                                                                                                                                                                                                                  13 |                                                                                                                                                                                                         13 |      1 |
| Decode             |                                                                                                                                                                                                                                                                                  27 |                                                                                                                                                                                                         28 |      1 |
| Overclock          |                                                                                                                                                                                                                                                                                  11 |                                                                                                                                                                                                         11 |      3 |
| UseReq             |                                                                                                                                                                                                                                                                                   0 |                                                                                                                                                                                                          0 |      0 |
| Engage             |                                                                                                                                                                                                                                                                                   3 |                                                                                                                                                                                                          5 |      1 |
| Guard              |                                                                                                                                                                                                                                                                                   4 |                                                                                                                                                                                                          6 |      1 |
| Detach             |                                                                                                                                                                                                                                                                                   4 |                                                                                                                                                                                                          7 |      1 |
| Succession         |                                                                                                                                                                                                                                                                                   0 |                                                                                                                                                                                                          4 |      1 |

Structured names outside the canonical union are `EndOfAttack` and
`OnDeletion` (BT16-015) plus `Unblockable` (EX4-042). These are timing or
restriction projections until their semantic ownership is reviewed. The
persisted-only entry `TOKEN-Kotenken` is a token definition. It is excluded
from the printed-card catalog denominator (4,454 catalog cards versus 4,455
persisted IR entries), while remaining included in keyword behavior, consumer,
and structured-reference counts. Token keyword specifications and token grants
therefore remain audit obligations; token exclusion applies only to the printed
card catalog join.

The catalog scan across `effectText`, `inheritedEffectText`,
`securityEffectText`, `dualEffect`, and `optionEffect` finds 2,301 cards with
at least one literal keyword-name mention (field counts 1,893 / 687 / 29 / 4 /
18; these overlap and include prose references). This is a discovery union,
not an intrinsic-keyword count: `printedKeywordsOf` deliberately excludes
grant clauses, target filters, token clauses, conditional clauses, and
`Use Req.` tails. Exact marker counts in the earlier catalog table remain the
raw marker inventory; every marker still needs canonical normalization and
printed/inherited/security ownership review.

## Runtime registration, readers, and representation split

`packages/shared/src/effects/ir/keywords.ts` is the typed canonical union and
`KeywordRef` schema (`keyword`, optional `amount`, `raw`, `traitFilter`).
`registerIrCard(cardId, compiled)` is the production card path; it publishes
compiled effects to the IR registry. `packages/shared/src/effects/effects.json`
is the persisted compiled form, and direct card modules may expose a local
`compiled` object before passing it to that same registration function.

Printed text is independently scanned by `apps/api/src/engine/combat/keywords.ts`
(`printedKeywordsOf` and its 41 matcher entries), then unioned with active
`continuous.grantedKeywords` by `resolveKeywords`. Combat legality reads the
resolved `hasKeyword` seam; security reads Jamming and SecurityAttack through
its own reader; GameEngine has explicit consumers for Rush, Reboot,
Alliance, Detach, Guard, SecurityAttack, DigiXrosSubstitute and other
keyword-specific hooks. Structured IR keyword objects also occur as action
payloads, grant/restriction references, and conditions, so a reference count
cannot be treated as a declaration or a runtime grant.

The forms requiring separate proofs are therefore: (1) printed marker in main,
inherited, or security text; (2) persisted `effects[*].keywords[*]`; (3)
structured keyword action/grant or condition references; (4) direct compiled
IR registration; (5) continuous runtime grant records with amount/trait data;
and (6) legacy text-only cases consumed by the printed matcher. Parameterized
shapes currently include signed SecurityAttack amounts, amount-bearing
MaterialSave/Link/Fragment/DigiBurst/Digisorption, Decoy colors, Overclock
qualifier, Execute trigger kind, Rush SetBaseDP, and selfHasKeyword markers.

## Current proof map and residuals

Existing owner documents provide bounded proof for Rush
([rush-lifecycle.md](rush-lifecycle.md)), Guard ([guard-lifecycle.md](guard-lifecycle.md)),
Detach ([detach-lifecycle.md](detach-lifecycle.md)), Succession
([succession-lifecycle.md](succession-lifecycle.md)), Vortex
([vortex-timing.md](vortex-timing.md)), costs and placement where keyword
parameters participate ([activation-costs.md](activation-costs.md),
[digivolution-card-placement.md](digivolution-card-placement.md)), and
option-use reductions ([option-use-reductions.md](option-use-reductions.md)).

The older chapter checklist contains historical divergence labels that must
not be read as the current provider status. Current card-level public tests
prove Fortitude replay and no-source boundaries in `BT20-034.test.ts`,
`BT20-035.test.ts`, `BT24-038.test.ts`, and `BT24-049.test.ts`; Evade accept,
refusal, near-miss, inherited, and public Option paths in `BT19-018.test.ts`
and `BT24-050.test.ts`; Execute's end-of-turn attack and self-deletion in
`BT20-072.test.ts`; Overclock's public end-of-turn attack and cost in
`BT19-101.test.ts`; Partition's public Option deletion, refusal, and inherited
DP-zero path in `BT20-037.test.ts`; Progress's in-attack immunity and outside-
attack deletion boundary in `BT21-025.test.ts`; and Save's public placement,
refusal, source filtering, and multiple-Tamer paths across the BT19 and BT21
card tests. Scapegoat currently has provider/IR and inherited-trigger tests in
`BT20-080.test.ts`, while the dedicated chapter fixture remains weaker on exact
sacrificed-instance evidence. These provider tests update the status of the
consumer seam; they do not close the inventory's separate printed/inherited/
security, grant-shape, amount, duration, source-identity, and cross-keyword
reconciliation obligations.

Iceclad's current evidence remains delegated to combat keyword tests, so the
inventory should retain that bounded attribution rather than infer full
coverage from the chapter's structural check. Historical chapter labels for
Fortitude, Evade, Execute, Overclock, and Partition are retained only as
history and are not current claims of missing runtime behavior.

### Canonical keyword reconciliation queue

The 46-name `Keyword` union is tracked here by executed evidence and finite
remaining classes. An anchor is bounded proof, never whole-provider
certification.

Clause identifiers below refer to the reviewed Comprehensive Rules chunks:
`comprehensive-0223` (Blocker), `0225` (Piercing), `0233` (Rush), `0242`
(Raid), `0229` (Reboot), `0227` (Jamming), `0231` (Retaliation), `0244`
(Barrier), `0241` (Evade), `0238` (Save), `0235` (Delay), `0243` (Alliance),
`0246` (Fortitude), `0234` (Blitz), `0249` (Collision), and `0252` (Vortex).

| Keyword                                                                     | Current anchor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Next concrete class                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker                                                                     | §16-5 `comprehensive-0223` (SHA-256 `f21e9a4a1278163e9b07ebe6f0776b3b15a6d1f9884771e498431baeb23e5a7d`) + §12-1 `comprehensive-0151` (SHA-256 `1c4e669751a989f9da2bdc3b1b198b4c2c4a03210f54b17ac1f6ba87faa9a566`); `keyword-blocker-source-changes.test.ts` covers inherited public block, source-changing evolution, and exact blocker identity; `keyword-blocker-lifecycle.test.ts` covers native/plain/suspended and temporary grant expiry                                                                            | Native, inherited, public block-window legality, source loss, and temporary-grant expiry are covered; no distinct current Blocker core seam remains                                                                    |
| Piercing                                                                    | §16-7 `comprehensive-0225` (SHA-256 `f4d39e19988d50be36db0a6be32a7b3c639428df9116ff194f4a878181cc6cf5`); `keyword-piercing-lifecycle.test.ts` covers native win/loss/tie, no-Piercing control, mandatory security, and a public evolution grant                                                                                                                                                                                                                                                                           | Native, inherited/granted, mandatory-security, loss, and tie behaviors are covered; no distinct current core gap remains                                                                                               |
| Rush                                                                        | §16-15 `comprehensive-0233` (SHA-256 `6f597fcf757c2632ff18ed331c9d1fd671a194944ac62dfdc95564ba4305b7aa`); `rush-lifecycle.md` and chapter tests cover native, inherited, same-turn attack, attack-end alias, and natural opponent-turn expiry                                                                                                                                                                                                                                                                             | Native/inherited and current `forTheTurn`, attack-end, opponent-turn-end, and permanent source seams are covered by the existing public anchors; no distinct current Rush core gap remains                             |
| Raid                                                                        | §16-23 `comprehensive-0242` (SHA-256 `3fc3398eb955b3c6e0d902b4e6a8719d1b767d125d2df06f233802288c3f6b12`); `keyword-raid-consent.test.ts` and BT24-011 tests cover public highest-DP redirect, acceptance/refusal, exact target, and completed attack                                                                                                                                                                                                                                                                      | Native redirect and current duration forms are publicly anchored; no separate source-change or target class is produced by the current persisted IR                                                                    |
| Reboot                                                                      | §16-11 `comprehensive-0229` (SHA-256 `755d3250951980c2b8d7a31192167c2b74789570c06b57081c2e35679c45e785`); `keyword-reboot-lifecycle.test.ts` covers native and inherited Reboot through a natural turn loop, including opponent-turn-end expiry                                                                                                                                                                                                                                                                           | Native unsuspend and current opponent-turn-end/permanent source forms are covered; no distinct current Reboot core gap remains                                                                                         |
| Jamming                                                                     | §16-9 `comprehensive-0227` (SHA-256 `7ab13077bd9882a27dcb47aa43ddc4d44e1d9a97c7774a75ff99de117fa559cf`); `keyword-jamming-lifecycle.test.ts` covers native/inherited protection, stronger-security loss, ordinary battle loss, and the ST1-16 security-effect deletion exception                                                                                                                                                                                                                                          | Native, inherited, temporary/permanent source, security exception, and cause boundaries are covered; no distinct current Jamming core gap remains                                                                      |
| Retaliation                                                                 | §16-13 `comprehensive-0231` (SHA-256 `9fa675c87ec50b4575c9c464804c403e19fd1247cadf8ed144268d60d23801f7`); `keyword-retaliation-lifecycle.test.ts` covers native/inherited battle deletion, plain control, tie, exact identity, and Gaia Force cause exception                                                                                                                                                                                                                                                             | Native, inherited, battle/tie, and effect-cause boundaries are covered; no distinct current Retaliation core gap remains                                                                                               |
| Barrier                                                                     | §16-25 `comprehensive-0244` (SHA-256 `d57e2d1c92ac3b2789a94e2828d297819f09e54b39b0122fccfc7cf7e20b438f`); `ch16c-deletion-and-advanced-keywords.test.ts` accepts the public Barrier decision and exact top-security removal; `BT15-037.test.ts` and `BT16-035.test.ts` exercise native providers, while `barrierSourceLeavesStack.test.ts` proves a stack source stops granting after it leaves                                                                                                                           | Native payment/acceptance, refusal path, and inherited-source departure are covered; the planned P-146/Q4261/Q4262 integration is future card coverage, not a current core gap                                         |
| Evade                                                                       | §16-22 `comprehensive-0241` (SHA-256 `1b6311b4d3db3cb603203ad321a20d6671c0af5ffa1859a7ff7c4db9531384a5`); `BT19-018.test.ts` covers public accept/refuse, near-miss deletion, and top-card scope; `BT24-050.test.ts` covers the public Happy Bullet accept/refuse path                                                                                                                                                                                                                                                    | Printed, inherited, and Option-provided consumer seams are anchored; no distinct current core gap remains                                                                                                              |
| Save                                                                        | §16-20 `comprehensive-0238` (SHA-256 `5a8d58c66ffaaad726bd3cdaa5ae2dc35758fae0c7aad6c6fc60e7f7cdab6536`); `ch16c-deletion-and-advanced-keywords.test.ts`, `saveKeywordPlacement.test.ts`, and `saveSourceIdentity.test.ts` cover public placement under a Tamer, refusal/no-Tamer, exact source instance, and controller/source filtering                                                                                                                                                                                 | Native Save under Tamer and refusal/source identity classes are covered; no current inherited or granted Save producer was found in persisted IR                                                                       |
| Delay                                                                       | §16-17 `comprehensive-0235` (SHA-256 `866991fdeb6c896a2840c30399a87d353e8cbd33d30f706e6729ba46bd4428d2`); `keyword-delay-boundaries.test.ts` and P-036 tests publicly reject entry-turn activation, activate after a natural eligible turn, trash the exact Option, and reject a second activation                                                                                                                                                                                                                        | Placement-turn restriction, public refusal, natural timing, source trash, and repeat guard are covered; no distinct current Delay provider class remains                                                               |
| Alliance                                                                    | §16-24 `comprehensive-0243` (SHA-256 `e44a7d2f8998a34292f9974cbca448cd81f2fbf538af8c3db0e1def0b7b44f2b`); `keyword-alliance-consent.test.ts` publicly chooses one exact ally, applies its DP, and refuses while completing the attack; provider tests cover AD1-009, BT19-014, ST20-04/ST20-06, and BT26-033                                                                                                                                                                                                              | Choice/refusal, attack-only timing, provider forms, and supporter identity are covered; nested-battle combinations are not a distinct current provider class                                                           |
| Fortitude                                                                   | §16-27 `comprehensive-0246` (SHA-256 `79508c128de4730714cb40180cfd07443ea4a5b2995b18c6cbab617df4f5a17f`); `fortitudeOrdering.test.ts`, `BT20-034.test.ts`, `BT24-038.test.ts`, and `BT24-049.test.ts` cover same-instance replay, ordering, no-source refusal, and source-presence requirements                                                                                                                                                                                                                           | Native/inherited Fortitude replay and source-loss boundaries are covered; no separate current resolved grant producer was found                                                                                        |
| Blitz                                                                       | §16-16 `comprehensive-0234` (SHA-256 `9fe75f5a276f342a8031399e8a791a5732762a96378a49931e308f5d72000490`); `ch16b-digivolve-and-battle-keywords.test.ts`, `BT10-070.test.ts`, `BT10-112.test.ts`, and Royal Knights deck tests cover opponent-positive-memory timing, inherited/borrowed grants, same-turn attack completion, and next-turn expiry/refusal                                                                                                                                                                 | Native, inherited, and temporary-grant timing classes are covered; no distinct current Blitz core gap remains                                                                                                          |
| Collision                                                                   | §16-30 `comprehensive-0249` (SHA-256 `effe40c75f6c8f5deb3da41986917e76b21b7decf174245cf2463d5b956ea9f7`); `keywordBattle.test.ts` proves forced block, decline rejection, no-keyword control, and no DP bonus; `BT19-061.test.ts` covers the inherited trait grant and `BT19-073.test.ts` the native provider                                                                                                                                                                                                             | Native and inherited Collision grants, eligibility, forced choice, and source classes are covered; no separate duration seam exists beyond the attack-scoped grant                                                     |
| Vortex                                                                      | §16-33 `comprehensive-0252` (SHA-256 `8c22c20a35de0e99fda6f0d9557c5f6ef178d32d9de0e47ee2aed70127b1aa5c`); `ch16c-deletion-and-advanced-keywords.test.ts`, `vortex-timing.md`, `vortexSummoningSickness.test.ts`, and ST18/EX11 consumers cover same-turn unsuspended attacks, end-of-turn Shoto ordering, refusal, and granted-source loss                                                                                                                                                                                | Printed, granted, and source-loss timing classes are covered; no distinct current Vortex core gap remains                                                                                                              |
| Decoy                                                                       | §16-18 (`comprehensive-0236`, SHA-256 `311375329fc7791aba6a16b180691e3063bce3bba790f4f92dff802e21987ca1`) for Decoy cause/color rules, plus §15-8-2 (`comprehensive-0172`, SHA-256 `d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6`) for persistent source effects; `keyword-decoy-source-continuity.test.ts` and `P-045.test.ts` cover public inherited P-045 grant, source-present control, source departure, and exact source/recipient IDs                                                          | Native/public Decoy, persistent inherited source eligibility, source departure, and battle/effect boundaries are covered; the test preserves Security stack length but does not claim a Security instance-ID assertion |
| Scapegoat                                                                   | §16-32 (`comprehensive-0251`), `keyword-scapegoat-lifecycle.test.ts`: native EX11-023 and permanent GainKeyword grant EX8-071/BT25-097, battle/opponent-effect/own-effect cause, exact choice/refusal                                                                                                                                                                                                                                                                                                                     | Core cause and fixed-one sacrifice are proved; the current scan has no temporary Scapegoat duration producer, so no duration class remains open                                                                        |
| Execute                                                                     | §16-38 (`comprehensive-0257`, SHA-256 `5c658ed9c22510cf864a100b7cd55942c1109a0ceb63e0d432650f8214d68fcb`), `keyword-execute-consent.test.ts`, `BT23-069.test.ts`, `BT26-030.test.ts`, and `BT26-078.test.ts`: public End-of-Turn consent/refusal, unsuspended-target selection, self-deletion after complete attack, natural next-player expiry of the temporary grants, and native/permanent, `untilEachTurnEnd`, and `forTheTurn` producer seams                                                                        | Native BT23-069 plus the two current temporary/grant producers are anchored; natural turn-loop expiry is covered by the owner suites, with no additional persisted duration representation                             |
| Progress                                                                    | §16-39 (`comprehensive-0258`, SHA-256 `2fa0950f448b106aeb8bd953b8c02488f3a276133f598714afe0454dc0cedbec`); `BT21-025.test.ts` proves public in-attack immunity and outside-attack deletion, while `BT26-017.test.ts` publicly grants Progress through On Play/When Digivolving and verifies its `forTheTurn` expiry                                                                                                                                                                                                       | The sole current GainKeyword producer is BT26-017 with `forTheTurn`; native consumer, source duration, and outside-attack boundary are anchored, with no other Progress grant class in persisted IR                    |
| IceClad                                                                     | §16-35 `comprehensive-0254` (SHA-256 `01186c00073c1b8e41772a9f13647b23310df9f738f731d17b48b3d2b123e23c`); `keyword-iceclad-security-boundary.test.ts` and `keywordBattle.test.ts` cover count-vs-DP win, no-Iceclad control, tie, and the Security-Digimon DP exception using EX7-021/BT1-084                                                                                                                                                                                                                             | Native count comparison, ordinary battle, tie, and Security exception are covered; no current grant provider was found in persisted IR                                                                                 |
| Training                                                                    | §16-41 `comprehensive-0260` (SHA-256 `b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7`); `keyword-training-boundaries.test.ts` and EX9-008 tests cover natural main-phase placement, suspend cost, empty deck, suspended/wrong-controller rejection, and repeat after a natural turn                                                                                                                                                                                                                     | Current native Training eligibility, cost, placement, unavailable-deck boundary, and repeat timing are covered; no current copied/granted Training provider exists in persisted IR                                     |
| Armor Purge                                                                 | §16-19 `comprehensive-0237` (SHA-256 `0f69449930f8024dd94c9302c96ba389660d974c163918f7912049b8797fb473`); `ch16b-digivolve-and-battle-keywords.test.ts`, `BT10-012.test.ts`, `BT10-015.test.ts`, `BT10-026.test.ts`, `BT11-030.test.ts`, `BT14-039.test.ts`, and BT16 providers cover native deletion prevention and promotion with exact source stack handling                                                                                                                                                           | Whitespace normalization is already handled by the canonical keyword resolver; no current Armor Purge runtime gap was reproduced                                                                                       |
| Mind Link                                                                   | §16-28 `comprehensive-0247` (SHA-256 `40b7489c5fee5659b483448f6a0f627602c208034e95125c3ec57a9985121078`); `keyword-mind-link-boundaries.test.ts` and BT14-086 tests publicly choose two eligible targets, exclude a target already containing a Tamer, and move the exact Tamer/target instances                                                                                                                                                                                                                          | Target choice, existing-Tamer restriction, instance identity, and final stack/zone placement are covered; no separate current optional-refusal class is printed by the provider                                        |
| Ascension                                                                   | §16-43 `comprehensive-0262` (SHA-256 `76ebf45a33b0f32ac2d60968e7026e86ac27ce1ae59daa902cde5ad628c98dd4`); `keyword-ascension-lifecycle.test.ts` covers native BT25-040 acceptance/refusal, exact trash-to-security identity, granted BT26-030 expiry, and post-expiry deletion                                                                                                                                                                                                                                            | Native and resolved grant/source-expiry behavior are covered; the current scan found no additional Ascension provider class                                                                                            |
| BlastDigivolve                                                              | §16-26 `comprehensive-0245` (SHA-256 `a8f5302d1d7921d23a272be3d364452f991eb6a7657cbe6452cfcbecabe3347b`); `keyword-blast-digivolve-consent.test.ts`                                                                                                                                                                                                                                                                                                                                                                       | Public refusal with two eligible hosts, explicit second-host effectKey choice, zero-cost draw/stack identity, and printed-requirement negative are passed; other provider effects remain provider-specific             |
| BlastDNADigivolve                                                           | §16-31 `comprehensive-0250` (SHA-256 `ec9da1f563847efe4dfee871cf63d9a84b02fe13512f2826d59ac86e48f2a421`); `keyword-blast-dna-consent.test.ts` publicly resolves the field/hand recipe, preserves both physical materials during the attack, and covers Counter acceptance/refusal                                                                                                                                                                                                                                         | Public Counter acceptance/refusal, exact field/hand material identity, zero-cost DNA stack, and full attack resolution are covered; no distinct current provider class remains                                         |
| Draw                                                                        | §16-8 `comprehensive-0226` (SHA-256 `7238f2ebc83dc30cf9e807e28b9253d812a140ad65a807ae2bf4d22a70730e6a`); `ch16a-security-blocker-draw.test.ts` proves mandatory Draw 1, with public card tests such as `BT1-041.test.ts`, `BT7-069.test.ts`, `BT19-040.test.ts`, and `BT24-088.test.ts` covering Draw 2/3 providers and completion                                                                                                                                                                                        | Fixed Draw 1/2/3 providers share the mandatory deck-draw seam; empty-deck handling is covered and no other current Draw parameter class was found                                                                      |
| SecurityAttack                                                              | §16-4 (`comprehensive-0221`, SHA-256 `55384b63f06da1dcfb1db09e34a8e69e7f9ce2b89422114c9294c2412c57b502`) and §16-4-4 (`comprehensive-0222`, SHA-256 `471c3ca2923b2e688ac6e53edb3789646e7d01b6cb0be7e736fd3a3d2b82d60e`); `keyword-security-attack-accumulation.test.ts` publicly stacks ST1-07 inherited +1 with BT1-025's digivolution +1 and exercises BT26-027's -2 provider with 0/2 Security controls, exact physical identities, explicit consent/refusal, complete attack resolution, and natural next-turn expiry | Current +1 accumulation and natural expiry are covered; other signed amounts and grant producers remain outside this bounded proof                                                                                     |
| DeDigivolve                                                                 | §16-12 (`comprehensive-0230`, SHA-256 `7a6651cefa85e454cb7e4e43b0fe25217d28676ed7ef13c1dca57b1c8c4365bd`), `keyword-de-digivolve-parameters.test.ts`, `BT23-096.test.ts`, and `EX7-049.test.ts` publicly cover N=1/2/3/4, public number choice, level-3 floor, exact top-source IDs, and the distinct EX7 four-source consumer                                                                                                                                                                                            | N=1–4, floor, source identity, and public choice are covered; multi-target is not a distinct current persisted provider class                                                                                          |
| Recovery                                                                    | §16-6 `comprehensive-0224` (SHA-256 `5639a0a98e8ef565e6fb4895f6e03d2beef6ce819056dae2015103762b7f655d`); `keyword-recovery-parameters.test.ts`                                                                                                                                                                                                                                                                                                                                                                            | Public +1/+2 exact face-down security order, five/six-security boundary, empty deck, and exact deck order are passed; no separate current keyword grant producer was found                                             |
| DigiBurst                                                                   | §16-14 (`comprehensive-0232`, SHA-256 `6aef42a5c090e8124386365a9cb8b7035b25ac52979537f770eadd5d54e807f2`), `keyword-digi-burst-parameters.test.ts` plus `BT7-040.test.ts` prove fixed amounts 1–4, insufficient-material all-or-nothing, and public Digi-Burst up to 4 with paid-count scaling                                                                                                                                                                                                                            | Fixed amount and variable `up to 4`/paid-count seams are covered; no additional current Digi-Burst parameter class was found                                                                                           |
| Digisorption                                                                | §16-10 `comprehensive-0228` (SHA-256 `4222de312acf7f62161e0c6a2c2655f30fcef0259ca405ed88fb7e7e8ca10375`); `keyword-digisorption-consent.test.ts` publicly selects the exact payer among two candidates, proves refusal before payment, and covers printed -3 and -2 providers through public evolution                                                                                                                                                                                                                    | Printed -2/-3 reductions, payer choice, refusal, source identity, and public evolution are covered; no distinct current redirect, inherited, or granted Digisorption producer was found                                |
| MaterialSave                                                                | §16-21 (`comprehensive-0239` SHA-256 `4027cd3c1ccbcae22b1af6d72fe235bfc8903c9ab7b8a9e2224320aeee9af19a`; `0240` SHA-256 `79ff27d489362dce2d549edf91834566d980dd47798e8cf810f4df8a3f4fd2db`), `engine/conformance/keyword-material-save-parameters.test.ts` cases “accepts Material Save 1/2/4”, printed 3, and explicit refusal; exact source instances and Tamer placement are asserted                                                                                                                                  | Amounts 1–4, refusal, insufficient/no-Tamer boundaries, exact source instances, and Tamer placement are covered; no current granted/inherited Material Save producer was found                                         |
| DigiXrosSubstitute                                                          | §7-2 `comprehensive-0117` (SHA-256 `1ebbe9afb14fc39b5aee3c498e606dd9178970b2425fd882f84777cdfac157ae`) / `0118` (SHA-256 `b69edb2cf7ad45544307bbc8650afb7eaa424284b67933c8bb3a4a73c0c4e973`); `BT10-111.test.ts` and `keyword-succession-lifecycle.test.ts` prove the sole current printed producer’s public DigiXros expansion, exact material count, cost, and expiry                                                                                                                                                   | BT19-079/081 are expander tests and are not counted; the current persisted scan found only BT10-111 for this keyword, with its public grant/source-expiry path covered                                                 |
| Link                                                                        | §16-40 `comprehensive-0259` (SHA-256 `ab93a63ae9090421af7be36348d5d9b8411f6fe6325313b51f9344a8019f9f2a`); `keyword-link-parameters.test.ts` publicly pays Link cost 2, proves Appmon host eligibility, explicit unpaid refusal, and +1/+6 Link Max capacity through public link intents                                                                                                                                                                                                                                   | Cost, host eligibility, payment/refusal, physical linked IDs, and the current +1/+6 capacity classes are covered; no current cost-6 Link provider was found (the +6 value is Link Max capacity)                        |
| LinkMax                                                                     | §16-40 `comprehensive-0259` (SHA-256 `ab93a63ae9090421af7be36348d5d9b8411f6fe6325313b51f9344a8019f9f2a`); `keyword-link-parameters.test.ts` proves printed +1 through a second public link and BT26-086 +6 through a third, with excess-link cleanup                                                                                                                                                                                                                                                                      | Current +1/+6 capacity, public linked IDs, and cleanup are covered; no current granted Link Max producer was found                                                                                                     |
| Fragment                                                                    | §16-37 (`comprehensive-0256`, SHA-256 `5bf7c10072656e2545ecf9f85c35456884341ca803fda443a83c5252dced82a3`), `engine/conformance/keyword-fragment-parameters.test.ts` cases exact-three payment, insufficient-three no partial payment, refusal, and EX12-060 Fragment 2                                                                                                                                                                                                                                                    | N=2 and N=3 public paths plus refusal/insufficiency are covered; no additional current amount class is required by the provider scan                                                                                   |
| Partition                                                                   | §16-29 `comprehensive-0248` (SHA-256 `f3a4c3a202523e7afca233dc4222472180f4b733c4fd77067cde081cd5acbaec`); `executePartition.test.ts` and `BT20-037.test.ts` cover public opponent-effect replay, own-effect negative, non-Partition control, Option/refusal, and exact DP-zero handling                                                                                                                                                                                                                                   | Opponent/own cause, refusal, source recipe, and public resolution are covered; no additional current Partition runtime class was found                                                                                 |
| Decode                                                                      | §16-36 `comprehensive-0255` (SHA-256 `e53f888632515c84ebd3b020e1a2452f441f303b7c3d412f12a6121ce4d6e238`); `BT19-024.test.ts` publicly covers Decode replay/refusal, battle-deletion negative, own-stack source filtering, level and trait eligibility                                                                                                                                                                                                                                                                     | Public replacement, refusal, source-zone, level, and trait filtering are covered; no distinct current Decode runtime class was found                                                                                   |
| Overclock                                                                   | §16-34 `comprehensive-0253` (SHA-256 `9e5ad6ff3bc2d4410ad6f8306f0c918e1f75a66dd26099a00f1085b0a547ce3b`); `BT19-101.test.ts` publicly covers On Play/When Attacking return, refusal/no-target, and Q3185 end-of-turn attack while unsuspendable                                                                                                                                                                                                                                                                           | Printed timing, optional refusal, no-target, and the current trait-qualified providers are covered; no distinct current Overclock grant class was found                                                                |
| UseReq                                                                      | §16-42 `comprehensive-0261` (SHA-256 `bea2acb41142c08a4ce511f19dd3e0c0b2069a500a9a419267b553f3685e8b8a`); `keyword-use-req-field.test.ts` and `ch16c-deletion-and-advanced-keywords.test.ts` cover public `[TS]` waiver acceptance, unmet-color rejection, and the 38 printed versus 24 compiled card distinction                                                                                                                                                                                                         | The current WaiveColorRequirement consumer and negative condition are public-tested; the remaining 14 printed forms are catalog/IR normalization variants, not an untested runtime class                               |
| Engage                                                                      | §16-44 `comprehensive-0321` (SHA-256 `99aee84d9f3173f72f5b31fef5c7c24e42fa945d870591b967ce5dfcb24ea439`); `keyword-engage-consent.test.ts` and `BT26-016.test.ts` publicly cover end-of-turn acceptance against an unsuspended target and manual refusal with complete battle cleanup                                                                                                                                                                                                                                     | Current Engage consent/target/timing behavior is covered; no separate current provider shape changes the shared executor                                                                                               |
| Guard                                                                       | §16-45 `comprehensive-0322` (SHA-256 `cf0369cd214393a2e5ed1318f3ded85cfc1c7a26b0ac64c3f19be0a72ecc8411`); `keyword-guard-lifecycle.test.ts` covers native, public evolution/security grants, battle/effect causes, Heat Viper payment, exact holder/controller identity, and refusal                                                                                                                                                                                                                                      | Native/granted Guard, cause filtering, payment, identity, and authority are covered; no distinct current Guard executor class remains                                                                                  |
| Detach                                                                      | §16-46 `comprehensive-0323` (SHA-256 `58b545c8005fcef5c0c20be0fae48f94034c24c1d66eaa211b23f1791069ffff`); `keyword-detach-lifecycle.test.ts` publicly covers controller-only decline, trait mismatch rejection, owner-cost deletion, and exact linked-source departure                                                                                                                                                                                                                                                    | Decision authority, trait eligibility, cost ownership, and source departure are covered; no additional current Detach provider class was found                                                                         |
| Succession                                                                  | §16-47 `comprehensive-0324` (SHA-256 `d09f994eb5ef5e46d70b28d7d019215d5dc5856d3ec1ffee10d6db6dfa3df717`); `keyword-succession-lifecycle.test.ts` and `stack-visible-source-priority.test.ts` publicly cover four real top-card consumers, Chronomon acceptance/refusal, source priority, and no re-copy of Succession                                                                                                                                                                                                     | Top-card identity, copied effect acceptance/refusal, source priority, and repeat/source behavior are covered; no distinct current Succession executor class remains                                                    |
| `EndOfAttack`, `OnDeletion`, and `Unblockable` are structured timing or     |
| restriction representations outside this 46-name union; they remain tracked |
| as consumers and are not counted as canonical keywords.                     |
| The historical focused baseline command was:                                |

```sh
pnpm --filter @aegis/api exec vitest run \
  src/engine/conformance/ch16a-security-blocker-draw.test.ts \
  src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts \
  src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts \
  src/engine/conformance/keyword-ascension-lifecycle.test.ts \
  src/engine/conformance/keyword-guard-lifecycle.test.ts \
  src/engine/conformance/keyword-succession-lifecycle.test.ts \
  src/engine/combat/keywords.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

Historical result: 7 files / 220 tests passed; this result is not a fresh execution of the 46-row matrix. Static discovery of the scoped engine
directories finds 9 textual `it.fails`/`test.fails` references (several are
comments or prose describing historical divergences) and 3 skip-style
matches; each must be classified by executing the owning suite before it can
be called an active residual. The full engine suite and all collection suites
were intentionally not run for this inventory.

The focused baseline snapshot is historical evidence for this inventory, not a
fresh claim that every matrix row was re-executed during this reconciliation.

No keyword is certified by a catalog hit or test-file count. Open obligations
include complete printed/inherited/security reconciliation, every distinct
grant and action shape, amount boundaries and trait filters, source departure
and top-card changes, duration/reset, duplicate grants, neutral runtime
recipients, security and battle consumers, and the unclassified
`EndOfAttack`/`OnDeletion`/`Unblockable` forms. Priority for the next
independent keyword lanes is SecurityAttack and Blocker/Piercing (largest
structured unions), then Rush/Raid/Reboot/Jamming/Retaliation, followed by
amount-bearing DigiBurst/MaterialSave/Link/Fragment and the advanced
Detach/Succession/Guard/Ascension family. Generic costs, zones, and ordering
remain separate full-scope mechanisms and should not be inferred from this
keyword inventory.

History: current reconciliation and focused proof snapshot recorded
2026-09-12; no completion credit awarded.

## Blocker inventory checkpoint

Comprehensive §16-5 defines `<Blocker>` as a persistent keyword that permits
blocking, and limits a Digimon to one block per attack even when it has
multiple instances. The blocking rules in §12-1 further require a blocker to
be in the battle area, able to suspend, and different from the attack target.
The canonical keyword union has one spelling, `Blocker`; the printed matcher
accepts the Japanese or ASCII angle brackets and does not define a second
alias.

The current catalog discovery join finds **464 of 4,454 catalog cards** with
a literal Blocker mention: 398 in `effectText`, 84 in
`inheritedEffectText`, and 5 in `securityEffectText`. These are overlapping
field-specific sets, so their distinct-card union is 464 rather than their
sum. They are mentions, including conditional grants and target filters,
rather than 464 intrinsic providers. The persisted IR contains
**304 declaration cards** and **461 distinct cards with any structured
Blocker reference** across 4,455 persisted entries. Within that structured
union, **111 cards** use a `GainKeyword` Blocker grant. Their observed grant
durations are `untilOpponentTurnEnd` (106 actions), `forTheTurn` (3),
`permanent` (35), `endOfOpponentTurn` (4), and `untilYourTurnEnd` (2).
These are 150 grant action occurrences across 111 providers; providers can
have more than one duration. `untilOpponentTurnEnd` is a continuous grant
expiry duration, while `endOfOpponentTurn` is a separate effect/timing enum
used by the interpreter and is not normalized as an alias here.

The behaviorally distinct shapes requiring separate proof are: native static
main-text Blocker; inherited static Blocker; security-text or security-state
mentions; runtime `GainKeyword` grants, including BT19-064's
`untilOpponentTurnEnd` grant on both On Play and When Digivolving; and generic
runtime `conferStackEffects`/copy capability. The current persisted IR scan
found no Blocker-specific `copyEffectsFromDigivolution` payload, so copied
Blocker remains an inventory unknown rather than a zero-case certification.
The literal-only remainder contains 29 catalog cards with Blocker prose but
no matching structured Blocker object in persisted IR; examples include
BT1-023 and BT2-103, whose text uses Blocker only as a target filter, and
EX12-034/ST22-05, whose text grants Blocker to a generated token. These are
concrete reconciliation cases, not proof of missing implementations. The
304/461 counts also do not establish source departure, top-card turnover,
duration expiry, duplicate-instance collapse, controller changes, or actual
block-declaration legality. Blocker behavioral proof and the complete
printed/inherited/security provider denominator remain open for the owner
document [blocker-lifecycle.md](blocker-lifecycle.md).

## Final bounded reconciliation (2026-09-12)

The canonical 46-name union was reconciled against the current conformance directory and the persisted card/IR catalog with the following reproducible scans:

```sh
rg -n "^describe|^  it\(" apps/api/src/engine/conformance apps/api/src/engine/combat
node tools/kb/query.mjs rules "keyword"
```

The current owners now point to source chunks with executable fingerprints for Blocker, Piercing, Recovery, and Blast Digivolve. Their public anchors cover the core consumer seams: block legality and source change; Piercing survival, tie, grant, and mandatory security; Recovery amount/order/limit; and Blast consent, exact host selection, cost waiver, draw, refusal, and printed-requirement rejection. These are bounded behavioral proofs, not whole catalog certifications.

The remaining rows are classified by actual representation: native static providers, inherited or `GainKeyword` grants, security text, and structured consumer parameters where those forms occur in the persisted IR. A grant or inherited row is not marked missing merely because a second card ID lacks a dedicated test; it remains an inventory class until a distinct runtime contract exists. The bounded core proofs now include Engage refusal, Execute consent/unsuspended-target outcomes, De-Digivolve N=4 declaration/floor behavior, and the sole current Progress grant producer with expiry. Delay, Training, Ascension, and LinkMax are likewise reconciled to their current producer classes below; any older provider-specific queue entries are historical or collection-specific, not current generic engine blockers. Generic engine queues for targeting, replacement, and evolution are historical planning material outside this keyword denominator unless a current keyword owner cites them. `EndOfAttack`, `OnDeletion`, and `Unblockable` remain structured timing/restriction consumers rather than additional canonical keywords.

The finite scan of the nine previously questioned families is: Rush has current grant durations `forTheTurn` (BT10-024), `forTheAttack` (AD1-020), `untilOpponentTurnEnd` (BT20-098), and `permanent` (BT11-086); Raid has `forTheTurn` (BT19-080), `untilOpponentTurnEnd` (EX10-071), and `permanent` (BT25-104); Reboot has `untilOpponentTurnEnd` (BT10-105) and `permanent` (BT23-060); Jamming has `forTheTurn` (BT11-090), `untilOpponentTurnEnd` (BT8-062), and `permanent` (BT14-002); Retaliation has `untilOpponentTurnEnd` (BT13-079) and `permanent` (BT10-083); Decoy has only permanent `P-045`; Scapegoat has only permanent `BT25-097` and `EX8-071`; Execute has `permanent` (BT23-069), `untilEachTurnEnd` (BT26-030), and `forTheTurn` (BT26-078); Progress has only `forTheTurn` from `BT26-017`. Existing public owner suites cover the corresponding native/inherited/grant runtime seams; no additional duration representation is present in the persisted IR scan. Runtime aliases such as `forTheAttack` and `untilEndOfAttack` normalize to the same end-of-attack duration and are not separate obligations.

No full 46-keyword certification is claimed from this reconciliation, and no collection-wide score is inferred from marker counts.

The effective duration audit uses §15-8-2 (`comprehensive-0172`, SHA-256 `d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6`) and natural public loops: `BT20-098.test.ts` case “keeps Rush and Blocker through the opponent's turn, then expires them” asserts `untilOpponentTurnEnd` at player 0 main, after player 0 ends, and false after player 1 ends for a public Option grant. `BT8-062.test.ts` uses explicit turn-seat setup and remains a supplementary seam, not a natural-turn proof. Permanent source seams are exercised by `P-045.test.ts`'s public Decoy grant and deletion protection and `BT11-086`'s AllTurns source. These are the concrete duration proofs; native consumer tests are not being counted as grant-expiry evidence.

The four priority families have complete current consumer paths in their owner tests: Delay (`keyword-delay-boundaries.test.ts`) rejects entry-turn activation, places the exact Option after the natural eligible turn, and rejects a second activation; Training (`keyword-training-boundaries.test.ts`) proves natural main-phase placement, empty-deck unavailability, suspended/wrong-controller rejection, and repeat after a full natural turn; Ascension (`keyword-ascension-lifecycle.test.ts`) proves native BT25-040 acceptance/refusal, exact trash-to-security identity, granted BT26-030 expiry, and post-expiry deletion behavior; LinkMax (`keyword-link-parameters.test.ts`) proves the +1 default capacity through a second public link and the +6 BT26-086 capacity through a third public link. Their reviewed source pins are §16-17 `comprehensive-0235` SHA-256 `866991fdeb6c896a2840c30399a87d353e8cbd33d30f706e6729ba46bd4428d2`, §16-41 `comprehensive-0260` SHA-256 `b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7`, §16-43 `comprehensive-0262` SHA-256 `76ebf45a33b0f32ac2d60968e7026e86ac27ce1ae59daa902cde5ad628c98dd4`, and §16-40 `comprehensive-0259` SHA-256 `ab93a63ae9090421af7be36348d5d9b8411f6fe6325313b51f9344a8019f9f2a`. No additional current producer seam was found for these four beyond the paths listed.

| Family      | Effective duration/source seam                                                 | Concrete producer and public path                                                                                                    | Boundary assertion                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Rush        | native/inherited; `forTheTurn`, attack-end alias, opponent-turn-end, permanent | BT10-024, AD1-020, BT20-098, BT11-086; `rush-lifecycle.md` and chapter tests                                                         | same-turn attack and inherited/native eligibility are covered; attack-end aliases share the attack ledger                                |
| Raid        | native redirect; `forTheTurn`, opponent-turn-end, permanent                    | BT19-080, EX10-071, BT25-104; `keyword-raid-consent.test.ts`                                                                         | public accept/refusal and highest-DP redirect are covered                                                                                |
| Reboot      | native unsuspend; opponent-turn-end and permanent                              | BT10-105, BT23-060, inherited BT19-020; `keyword-reboot-lifecycle.test.ts`                                                           | natural turn-loop unsuspend is covered                                                                                                   |
| Jamming     | native/inherited; `forTheTurn`, opponent-turn-end, permanent                   | BT11-090, BT8-062, BT14-002; `keyword-jamming-lifecycle.test.ts`                                                                     | stronger-security loss and ST1-16 exception are covered                                                                                  |
| Retaliation | native/inherited; opponent-turn-end and permanent                              | BT13-079, BT10-083; `keyword-retaliation-lifecycle.test.ts`                                                                          | battle deletion, plain control, Gaia Force exception, and identity are covered                                                           |
| Decoy       | native and sole permanent inherited grant P-045                                | `keyword-decoy-source-continuity.test.ts`, `P-045.test.ts`                                                                           | source-present control and source departure are public; no temporary producer exists                                                     |
| Scapegoat   | native EX11-023 and permanent grants BT25-097/EX8-071                          | `keyword-scapegoat-lifecycle.test.ts`                                                                                                | fixed-one sacrifice, cause/refusal, and current permanent-source class are covered                                                       |
| Execute     | native consent/self-delete; permanent, `untilEachTurnEnd`, `forTheTurn`        | `BT23-069.test.ts`, `BT26-030.test.ts`, `BT26-078.test.ts`, `keyword-ascension-lifecycle.test.ts`, `keyword-execute-consent.test.ts` | refusal, unsuspended target, complete self-delete, replay/refusal, and all current duration classes including natural expiry are covered |
| Progress    | native consumer; sole `forTheTurn` grant BT26-017                              | `BT21-025.test.ts` and `BT26-017.test.ts`                                                                                            | in-attack immunity, outside-attack vulnerability, public grant, and expiry are covered                                                   |

## Priority 1–4 finite engine witnesses (2026-09-13)

The following matrix is the bounded acceptance record for the remaining
priority fronts. Each row names a current executable contract, its normative
source, and a public or mechanism-level assertion. It deliberately records
the unproved denominator instead of promoting historical queue entries to
current defects.

| Front                           | Contract and source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Reproducible witness and assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Current gap                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — aggregate selection budgets | A `totalPlayCostBudget` is one denominator across all selected cards; selected-card references feed later relative filters. The current IR producers are BT11-056 (10), EX7-047 (7), EX4-049 (6), EX8-029 (14/12), EX8-064 (10), and BT11-107's selected Greymon path.                                                                                                                                                                                                                                     | `targeting/loose.test.ts` covers ordinary, exact-name, distinct-name/card-number/level, malformed-ID and mandatory-count paths, including remaining-cap prompt values. `BT11-056.test.ts`, `EX7-047.test.ts`, `EX4-049.test.ts`, `EX8-029.test.ts`, `EX8-064.test.ts`, and `BT11-107.test.ts` exercise the named live producer encodings and assert physical play/delete outcomes or selection-derived limits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Other provider cards and every possible nested selection-reference chain remain outside this finite six-provider sample; no whole-catalog budget certification is claimed.                                                                                                                                                                                                                                                      |
| 2 — replacement/departure       | Guard protects another Digimon from an opposing immediate effect, pays by deleting the holder, and remains optional (§16-45, `comprehensive-0322`, SHA-256 `cf0369cd214393a2e5ed1318f3ded85cfc1c7a26b0ac64c3f19be0a72ecc8411`); §15-8-5 orders simultaneous replacement choices (`comprehensive-0177`, SHA-256 `50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde`). Detach uses §16-46 (`comprehensive-0323`, SHA-256 `58b545c8005fcef5c0c20be0fae48f94034c24c1d66eaa211b23f1791069ffff`). | `keyword-guard-lifecycle.test.ts`, “lets the controller choose Guard/Detach when both keyword reactions apply”, asserts two distinct replacement IDs, seat ownership, and both orders paying exactly the Guard holder and linked card while the Mailmon target survives; its “paid Guard stack” case adds the legal BT6-005 → ST13-07 → EX13-052 stack, resolves the inherited BT6-005 OnDeletion once with an exact selected deck card, and then resolves sibling Detach. The same file’s “does not use Guard to prevent ... Heat Viper payment” and “lone security-granted Guard holder cannot pay to save itself” assert that Guard cannot intercept an own payment or pay from the endangered holder. `targeting/loose.test.ts` asserts malformed selected IDs are ignored safely and mandatory count returns no partial over-budget result.                                                                                                                                                                                                    | Public source-loss/re-entry races beyond the exact paid-stack witness, a distinct live Detach competing replacement, and simultaneous grouping beyond this two-reaction case remain open. The witnesses establish ordering, payer identity and impossible-payment behavior for these finite classes only.                                                                                                                       |
| 3 — placement/stack             | §4-7-7 preserves the physical stack and source identity (`comprehensive-0292`, SHA-256 `703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855`); §4-7-8 covers the resulting top card (`comprehensive-0293`, SHA-256 `1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f`).                                                                                                                                                                                                       | `dnaDigivolve.test.ts`, “BT20-011 ... into EX3-063”, asserts both old physical top instance IDs leave their permanents, a linked material is trashed, and the tops are carried exactly once under the new result. `BT26-006.test.ts`, “Q6960 ... DigiXros material”, adds a real BT24-036 attached material, then asserts the exact old top and hand material enter the EX10-058 stack while the attached instance sheds to trash. `digivolution-card-placement.md` records the public Bagramon/Giromon event assertions for destination, position and exact moved identity; `king-drasil-batch-placement-events.test.ts` covers each physical batch identity.                                                                                                                                                                                                                                                                                                                                                                                      | Downstream placement reactions, copied effects, ordered mixed-source snapshots and source/controller turnover remain queued. The exact DNA stack witness closes the requested old-top transformation identity case without certifying every producer.                                                                                                                                                                           |
| 4 — battle/duration             | Security checks process one card at a time and resolve effects before the battle step (§13-1, `comprehensive-0153`, SHA-256 `8a911eb930fd1fbfddbf7cadb49d45c75fb7ee683110ed24ca781bb9653fcc60`); battle and reaction ordering is §14 (`comprehensive-0155`, SHA-256 `5b06ea97b99d6d698c6a1af32e9a3d725f850ddcf288c2f53f3bd003beaefa68`).                                                                                                                                                                   | `combat/attackDuration.test.ts` asserts battle-scoped grants expire between two Security Digimon checks while attack-scoped grants survive; its “Nested battle duration ownership” case proves modifier-DP and continuous-keyword entries created in an inner token expire before the enclosing token, which then expires its own entries. `BT21-015.test.ts`, “allows a security-played Cyclonemon to trigger Callismon's nested battle”, uses the real `whenSecurityBattleEnded` → `PlayWithoutCost` provider and two real Callismon `whenPlayed` → `Battle` reactions; exact physical IDs, trigger count, nested `combatResolved`, and outer-attacker survival prove the nested route. `BT24-036.test.ts`, “keeps a security-reaction grant owned by this turn through the next security check, then expires it”, uses the real provider, asserts both physical checks, the OnPlay DP loss remains through the next check, and that the `forTheTurn` grant disappears after the explicit seat handoff followed by the natural `runTurn(1)` loop. | No current public card was found that creates a specifically `untilEndOfBattle` grant from a security-battle reaction; the BT21-015 witness uses a supplemental production-ledger grant to force the duration boundary and therefore does not claim such a card producer. The BT24-036 witness proves reaction ownership and turn expiry; broader nested copied-effect/source-turnover cases remain outside this finite sample. |

The aggregate-budget producer scan is reproducible from the repository root and
distinguishes the ordinary numeric field from the selection-reference field:

```sh
node <<'NODE'
const ir = require('./packages/shared/src/effects/effects.json');
function walk(value, path, visit) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}[${index}]`, visit));
  for (const [key, child] of Object.entries(value)) {
    if (key === 'totalPlayCostBudget' || key === 'totalPlayCostBudgetFromSelectionRef') visit(`${path}.${key}`, child);
    walk(child, `${path}.${key}`, visit);
  }
}
for (const [cardId, effects] of Object.entries(ir)) {
  const hits = [];
  walk(effects, cardId, (path, value) => hits.push(`${path}=${value}`));
  if (hits.length) console.log(hits.join(' '));
}
NODE
```

These rows are mechanism evidence for the handoff’s finite fronts. They do
not certify all cards, all replacement providers, all placement consumers, or
all battle-duration encodings.

## Current four-front consumer reconciliation (2026-09-13)

Verified scoped audit on branch `audit-scoped-four-fronts-282-refs`, based on
`85a465314d5ea85919ebb31f9fe2d4a0f1f0e56c`. This section supersedes the older
producer counts in the priority matrix. The closed 46 keyword names, 22 cost
kinds, 19 compound forms, zone and ordering contracts are retained as scope
boundaries. This work is not whole-catalog or collection certification.

The exact persisted fields `totalPlayCostBudget`,
`totalPlayCostBudgetFromSelectionRef` and the reveal alias `costBudget` have
15 occurrences across ten current cards. These are representation counts,
not a denominator for every printed aggregate-cost clause. In particular,
EX8-029's source-play maximum twelve is encoded as `totalCost`, separately
from its return maximum fourteen.

| Current producer | Field occurrences | Executable consumer anchor                                      |
| ---------------- | ----------------: | --------------------------------------------------------------- |
| BT11-044         |                 2 | RevealAdd, `costBudget: 7`, both entry timings                  |
| BT11-056         |                 1 | RevealAdd, `totalPlayCostBudget: 10`                            |
| BT11-107         |                 1 | SelectBind then permanent Delete, reference `budgetDigimon`     |
| BT14-068         |                 1 | End-turn RevealAdd, `costBudget: 7`                             |
| BT8-106          |                 1 | RevealAdd, `costBudget: 15`                                     |
| EX4-049          |                 1 | Permanent Return, maximum six                                   |
| EX7-047          |                 2 | RevealAdd, maximum seven, both entry timings                    |
| EX8-029          |                 1 | Permanent Return, maximum fourteen                              |
| EX8-064          |                 1 | Loose DNA PlayWithoutCost, maximum ten                          |
| EX13-035         |                 4 | Loose PlayWithoutCost, base six/paid twelve, both entry timings |

Each anchor is the direct `apps/api/src/cards/<SET>/<CARD-ID>.ts` module and
its colocated test. The earlier six-provider matrix omitted EX13-035; the
earlier budget-owner inventory omitted the selection-reference and reveal
alias fields. None of those narrower discovery scans is exhaustive across
other numeric encodings or nested selection-reference chains.

The existing recursive scan above can reproduce this denominator by changing
its field predicate to include `costBudget`. No catalog or persisted IR was
changed to obtain these counts.

### Normative selection distinction and current baseline

Read the complete local chunks, rather than just a note attached to a test:

| Obligation                                                             | Full committed normative citation                                                                                                          | SHA-256 of exact chunk text                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Ordinary effects choose X cards or the largest feasible number up to X | `data/kb/rules-index.json`, `comprehensive-0184`, §15-10-2-1; full chunk §15-10-2 includes up-to, unique targets and all-target processing | `394081fad7013ea5ff26975dc302fb0483dcd7e9c6d73bf11b5618e2a67d20af` |
| Multicolor cards can contribute distinct combinations                  | Same index, `comprehensive-0311`, full §4-25                                                                                               | `653018400b31c26a4998384c2007e1f4086145eda7f484b0c0d87e6622340e81` |
| Optional processing conditions must be paid completely                 | Same index, `comprehensive-0169`, full §15-7-1–3                                                                                           | `255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b` |

The [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf)
was checked on 2026-09-13: version 4.2, updated 2026-08-18, §15-10-2-1 on
printed page 29 and §15-7-3 on printed page 26 agree with that distinction.
No KB refresh or complete fresh-source reconciliation is claimed.

The unchanged current engine baseline passed 327 files / 7,859 tests and failed
one file / one test (328 files / 7,860 tests total, 36.23 seconds). The sole
failure was the ordinary two-card different-color Trash oracle expecting no
discard despite only one feasible distinct-color card. Its expectation and
title were corrected against §15-10-2-1, preserving the adjacent forged
under-minimum and atomic cost controls. Production selection behavior was
retained. The focused interpreter suite then passed 224 tests.

The current named-budget focus passed nine files / 84 tests, covering the
seven primary-field providers plus loose targeting and own-stack play. The
reveal-alias focus passed four files / 15 tests, including BT11-044, BT14-068,
BT8-106 and the new EX7-047 recording-port adapter. The latter passes the real
compiled OnPlay action through `runRevealAdd`, observing equality, refusal,
and a forged over-budget answer containing duplicate, ineligible and missing
IDs. It asserts capped prompt metadata, each played identity exactly once and
the complete remainder sent to deck bottom. It uses a recording port; the
colocated EX7-047 public play/evolution tests supply the gameplay evidence.

Commands use `TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072` and
`--maxWorkers=1 --no-file-parallelism`. Tests are serialized across lanes.
Integrity/layout baseline passed three files / twelve tests. Final scoped
proof, citation reconciliation and review receipts appear below; broader
provider obligations remain outside this finite evidence denominator.

### Replacement source lifetime and placement derived state

`effects/leavePrevention.ts` previously retained eligible replacement contexts
through earlier sibling bodies without checking whether their source effect
still existed. The handler now snapshots physical source role, visibility and
top identity, then revalidates them and `appliesTo`/`protects` at activation.
Inherited cards must remain face-up in the stack; promotion to the top loses
the inherited effect. An inherited source still in the stack remains live when
another card becomes the host top. Permanent-only subscriptions retain the
original top identity check. Hidden/missing source cards are excluded before
offering a later target's replacement choices. Instance-only delayed reactions
retain their existing lifecycle.

The normative source is the **full §15-4-4** chunk `comprehensive-0165` in
`data/kb/rules-index.json`, SHA-256
`a67b8c006fddd924465986923295d048cb04f1430880d8750558da4c425f05a0`:
pending activation, sequential activation, new-card/effect loss and live trigger
conditions. Immediate interruption is the **full §15-8-5** chunk
`comprehensive-0177`, SHA-256
`50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde`.
§4-17 concerns breeding movement and is not used as a blanket zone-change rule.

`effects/breeding.ts` now refreshes continuous effects before both top/bottom
Digi-Egg addition events. `effects/primitives.ts::placeUnderFromDeck` refreshes
before its hidden-source addition event. Its new face-down source supplies no
inherited effect, but its addition changes the physical source count and can
activate an existing visible source's count-gated aura. The source-order,
visibility and stacked-information contract remains the full §4-7 chunk
`comprehensive-0292`, SHA-256
`703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855`.

| Finite contract                                                                                      | Observable witness                                                                                                                                                   | Evidence boundary                                                                                                 |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A pending replacement cannot use a departed, hidden or promoted inherited source                     | `effects/leavePrevent.test.ts`: exact activation counts for source loss, inherited removal/promotion, hidden multi-target source and permanent-only top change       | Synthetic subscriptions exist only in this test; no printed provider intersection is inferred                     |
| Current predicates must still allow activation; eligible inherited siblings survive another host top | Same suite: `appliesTo`/`protects` invalidation, no prevention payment, and retained stack-source positive control                                                   | Synthetic body transitions isolate the reusable activation contract                                               |
| Egg bottom/top addition exposes already-live inherited DP                                            | `conformance/scoped-placement-consumers.test.ts`: legal BT1-004 egg enters face-up; actual dispatcher observes 5,000 rather than 3,000 host DP                       | Actual production primitives and card effects, invoked through a test-only seam rather than a printed card action |
| Hidden additions update existing physical-count effects without leaking the hidden inheritance       | Same suite: legal ST1-03 main-deck source stays hidden; ST1-01's existing visible aura crosses three to four sources; dispatcher observes 9,000 rather than 8,000 DP | Seeded legal evolution stack; no formation-history or public producer certificate                                 |
| Existing ordinary visible placement still refreshes correctly                                        | Same suite: hand ST1-03 gives 4,000 DP; its hidden-deck counterpart gives 3,000                                                                                      | Positive/negative visibility controls use real registered inheritance                                             |

A final original-source probe restored `leavePrevention.ts`, `breeding.ts` and
`primitives.ts` from `85a465314` temporarily. It reproduced **ten failures /
35 passes** in two files / 45 tests: seven replacement activation/payment
assertions and three placement DP assertions. It failed at the expected values,
not a timeout. All three working sources were restored in `finally` and their
exact bytes verified. An earlier invalid egg/trait fixture was rejected and
replaced; it is not normative or defect evidence.

### Current consumer anchors and finite residuals

The recursive persisted-IR scan finds **54 current `onAddDigivolutionCards`
consumer cards**, all with colocated test files. Those 54 suites plus nine
placement, duration and test-seam suites passed **63 files / 504 tests**.
This is consumer regression, not full printed-clause certification of 54 cards.
Receiver identity, provenance, source filters and positions remain anchored
in EX5-001/EX5-065, source-placement watcher scope, King Drasil batch/joint
placement and Mother Eater suites. The source-shedding/old-top identity anchors
remain `dnaDigivolve.test.ts` and `BT26-006.test.ts`.

Battle/duration retains `combat/attackDuration.test.ts`'s distinct inner/outer
tokens, battle-versus-attack expiration, and the real BT21-015 nested security
route and BT24-036 reaction ownership/turn-expiry cases. The BT21-015 boundary
probe supplements its real reaction with a seeded production-ledger grant.
No current specifically battle-duration security-reaction card producer was
demonstrated; no such producer was added to production or certified.

The source-re-entry concern was traced through `movePermanentZone` →
`GameEngine.fireTiming` → `runTimingWindow`: current code recomputes before
OnMove activation and re-installs continuous subscriptions. The suspected
missing inline refresh was withdrawn after that downstream trace, rather than
being recorded as an additional defect.

Broader public replacement groups, copied-provider/controller-turnover races,
ordered mixed-material consumer snapshots and other numeric encodings remain
explicitly outside these demonstrated finite samples. Existing owner ledgers
retain their open obligations. Neither those residuals nor protected citation
declarations are converted into whole-engine, whole-KB or collection credit.

### Final serialized gates

```sh
TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run \
  src/engine src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed **331 files / 7,880 tests**, 24.93 seconds. The AD1-002 unsupported
ActivateEffect logger receipt belongs to its passing negative regression.
API and web typechecks passed sequentially; shared build passed. No Postgres
lane was run or database behavior changed. The test scheduler was single-owner,
one fork, 3,072 MB heap; memory snapshots retained free RAM throughout execution.
Read-only Luna reviewers approved source-role semantics and citation/tooling
scope after the invalid fixture and movement candidate were corrected/withdrawn.
The complete tooling suite passed **38/38** tests with `node --test --test-concurrency=1 tools/*.test.mjs tools/kb/*.test.mjs`. Shared typecheck also passed. Oxfmt accepted all 43 changed/new TypeScript, JavaScript-tooling and Markdown files; `pnpm audit:index --check` confirmed the unchanged 66-set index, and `git diff --check` was clean. Scoped lint on the new tooling and behavioral changes had no findings; the citation-only migration retains 24 pre-existing lint warnings without altering assertion bodies or introducing suppressions. The citation checker reports 436/436 pinned references and one disclosed partial-note warning, with no unresolved references or fingerprint mismatches. Delivery is a reviewable branch/PR; this bounded engine audit does not certify any whole collection or authorize an Orca collection-complete status.

## Remaining-front owner reconciliation (2026-09-13)

This section is the current obligation inventory for branch `audit-engine-remaining-fronts-20260913`, based on `23b105eb6321c877ffb54e8f5c181f50d24521e7`. Historical failures/counts above do not reopen the 66 collections, the 46 keyword contracts, 22 generic costs, 19 compound shapes, zone/order contracts, or the completed chapter-pin migration.

Representation denominators below count recursive persisted IR object occurrences and distinct card IDs separately. They are discovery denominators, not behavioral scores. Reproduce the complete ID lists directly without writing another audit artifact:

```sh
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
const buckets = new Map();
function add(key, id) {
  const bucket = buckets.get(key) ?? { occurrences: 0, cards: new Set() };
  bucket.occurrences++; bucket.cards.add(id); buckets.set(key, bucket);
}
function walk(value, id) {
  if (!value || typeof value !== 'object') return;
  if (value.duration) add(`duration:${value.duration}`, id);
  if (value.kind === 'Replacement') add(`replacement:${value.event}:${value.mode ?? 'implicit'}`, id);
  if (value.event === 'onAddDigivolutionCards') add('placement:onAddDigivolutionCards', id);
  if (value.mixedSources) add('placement:mixedSources', id);
  for (const [key, child] of Object.entries(value)) {
    if (/budget|total.*cap|totalCost|SelectionRef|selectionRef/i.test(key)) add(`field:${key}`, id);
    walk(child, id);
  }
}
for (const [id, card] of Object.entries(JSON.parse(readFileSync('packages/shared/src/effects/effects.json', 'utf8')))) walk(card, id);
for (const [key, bucket] of [...buckets].sort()) console.log(key, bucket.occurrences, bucket.cards.size, [...bucket.cards].sort().join(','));
JS
```

| Obligation                    | Current producers / consumers                                                                                                                                                                                 | Closure and evidence boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leave/deletion replacements   | wouldLeavePlay: implicit 131/121, prevent 61/58, instead 15/14; wouldBeDeleted: implicit 16/16, prevent 15/15, instead 3/3                                                                                    | `runReplacement`/keyword installation → `SubTriggerRegistry` → `consultLeavePrevention`; new three-provider/three-victim ordering, one affectsAll payment, physical inherited departure, controller/top distinction and actually eligible guarded nested payment. Existing `leavePrevent`, breeding and recomputation barriers retain declined/full costs, paid source movement and instance-only delayed behavior. Synthetic subscriptions certify this shared seam, not real copied-provider cross-products. |
| Other replacement eligibility | wouldBePlayed reduceCost 112/111, implicit 89/89, instead 5/5; wouldDigivolve reduceCost 110/109, implicit 93/92, increaseCost 2/2, gainMemoryOnDna 2/2, instead 1/1; wouldTrashDigivolutionCard implicit 1/1 | Playing/digivolution reducers and redirects use their separate eligibility consumers; these are not silently folded into leave consultation. Existing full API regressions are reused. All Replacement objects total **656 occurrences / 452 cards**; the narrower 433/405 non-reducer playing/digivolution/leave/deletion scan excludes 222 reducers and the one stack-trash redirect.                                                                                                                        |
| Placement downstream          | 54/54 onAdd consumers; mixedSources 5/4: BT12-089, BT26-102, EX2-007, EX2-048                                                                                                                                 | Singular/batch relocation now recomputes acquired watchers before the first emitted addition; real BT7-056 watcher with test-only relocation producer and physical IDs. Batch control observes memory before both bus calls, not only final OPT gain. Existing mixed cost preflight/order/identity controls are reused. Ordinary mixedSources sequential processing is a separately identified unproved interaction; cost-primitive atomicity is not its proof.                                                |
| Duration identity             | Per-alias counts in `effect-duration-and-identity.md`; target entries vs explicitly recorded seat/owner/source entries                                                                                        | Endpoint snapshot per installed target entry closes controller-dependent expiry. Real BT13-077 installation and synthetic pre/post-turnover category controls cover keyword/name/color/link-max, DP delta/base/floor and Piercing. Explicit granter-seat custom effects retain their separate ownership; existing GrantStatic/aura, source recomputation, OPT/reset, scoped attack/battle and copier-use tracking regressions are reused.                                                                      |
| Numeric budgets               | totalPlayCostBudget 10/6 + selection-ref 1/1; costBudget 4/3; totalCost 6/4 + scaling 1/1; totalDpCap 11/8 + source-DP 2/1 + scaling 3/2; baseBudget 11/7; budget 17/10 + add 8/4 + bonus 5/3                 | Loose/permanent targeting, PlayMultiple, RevealAdd, DP modification/deletion/return budget consumers remain distinct. Existing budget controls prove their bounded cases; no union-of-field count is called complete budget coverage.                                                                                                                                                                                                                                                                          |
| Selection references          | fromSelectionRef 285/128; selectionRef 26/19; underSelectionRef 4/4; excludeSelectionRef 4/3; sameColorAsSelectionRef 1/1                                                                                     | Permanent/loose binding and named cost/action consumers; BT11-107 budget from selected live permanent remains one producer. Existing chained-selection and physical/source snapshot controls are retained.                                                                                                                                                                                                                                                                                                     |
| Selection minimum / costs     | Ordinary/name/card-number/level upTo paths; source-local and same-host test-only cost intersections                                                                                                           | Explicit minima are no longer lowered or discarded. Quantity/card-ID sanitization precedes acceptance. Source-local duplicate payment now rejects before any mutation; source-local/same-host availability agrees with a complete minimum below its maximum. Fixed payments and grouped deckBottom semantics remain unchanged. The generic EX10-033 payment-count hypothesis was withdrawn: that path already pays the selected count.                                                                         |

Finite shared seams are closed by the listed controls. Producer-specific copied/trait-granted protection during mixed payment, ordinary mixed-material downstream races and full normative subclause/note correspondence remain below exhaustive certification. Absence of a legal current printed intersection is disclosed, not replaced with an invented production card. No blanket whole-engine or collection completion follows from this inventory.

### Delivery gates for the remaining fronts (2026-09-13)

The unchanged-base full API receipt was **5,167 files / 43,132 tests**, exit 0. After all engine/card corrections, shared build and copy-data preceded the complete API run (no path filter):

```sh
TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072 pnpm --filter @aegis/api exec vitest run --pool=forks --maxWorkers=1 --no-file-parallelism
```

Final receipt: **5,172 files / 43,174 tests passed**, 175.77 seconds, actual exit **0**, no unhandled errors. Expected room-lock/mock and unsupported-AD1-002 negative-test logs are not unhandled failures. An intermediate 43,168-test receipt predates the fresh Q&A-driven BT26-029 correction and is not the delivery receipt.

Real API typecheck (`NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @aegis/api typecheck`) passed, followed serially by shared and web typechecks. The complete tools gate passed **38/38** (`node --test --test-concurrency=1 tools/*.test.mjs tools/kb/*.test.mjs`). Independent scoped BT26 serializer check passed: 104 records synchronized, one semantic changed card, zero semantic or byte changes outside BT26. This is serializer parity, not a new full-collection audit.

Chapter integrity remains **436/436 pinned**, zero mismatches/unresolved/errors, with the existing comprehensive-0184 partial-note warning. The 66-set index is current. Scoped source/engine-ledger/data Oxfmt and Oxlint passed; lint retains only three pre-existing chapter warnings (shadowing, conditional expectation and literal concatenation), with no new findings or suppressions. Existing collection ledgers receive only narrowly scoped source-attribution/narrative corrections; unrelated historical table formatting and the generated effects.json baseline format are preserved. The generated JSON is checked by its authoritative scoped serializer.

The single-owner test/build/typecheck queue was serialized, one API fork with a 3,072 MB test heap; real RAM snapshots were checked without terminating external processes. Independent Luna source and provenance reviews found no blockers. This branch is delivered for review, with the explicit finite certification residuals above; no whole-engine/collection completion, original parallel-mode validation, issue #4730 reopening, merge or deployment is claimed.
