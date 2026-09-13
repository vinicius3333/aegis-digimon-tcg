---
title: Engine mechanism audit inventory
updated: 2026-09-12
---

# Engine mechanism audit inventory

## Status

In progress. Catalog marker inventory is discovery evidence, not keyword or
consumer certification. Counts include printed, referenced, and granted forms;
normalize parameterized markers and reconcile compiled/runtime forms before
freezing the behavioral coverage denominator.

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

| Mechanism                   | Owner document                                          | Status                                                              |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Citation source drift       | `kb-citation-integrity.md`                              | focused and combined gates green; older citations remain unreviewed |
| Activation costs            | `activation-costs.md`                                   | refusal bug reproduced and repaired; audit incomplete               |
| Trigger ordering            | `trigger-ordering.md`                                   | queued                                                              |
| Duration and identity       | `effect-duration-and-identity.md`                       | queued                                                              |
| Replacements                | `replacement-effects.md`                                | queued                                                              |
| Combat and keyword families | existing documents where applicable; split by lifecycle | queued                                                              |
| Targeting and selection     | `targeting-and-selection.md`                            | queued                                                              |
| Zones and visibility        | `zones-and-visibility.md`                               | queued                                                              |
| Evolution and reductions    | existing evolution documents where applicable           | queued                                                              |

## Open items

- Reconcile every discovered marker with canonical IR keyword names and runtime grants.
- Inspect all distinct consumer parameter shapes before claiming keyword coverage.
- Derive complete normative obligation lists from full KB sources.
- Complete every mechanism and affected consumer gate; initial baseline is insufficient.

## History

- 2026-09-12: initial inventory from the working catalog; no completion credit awarded.

## Canonical structured keyword inventory

This inventories the 45 canonical union entries against every recursively located `keyword` object in committed IR. Declaration counts refer to `effects[*].keywords[*]`; other counts include action/grant and reference objects and must be traced to distinguish grants from requests. Printed-only and non-keyword-object grant representations remain separate obligations. Shape counts ignore `raw` prose but retain amounts and trait parameters. No behavioral score follows from these counts.

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

Structured keyword names outside the canonical union: `EndOfAttack`, `OnDeletion`, `Succession`, `Unblockable`.

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
- `Overclock`: `{"keyword":"Overclock","qualifier":"Puppet"}`; `{"keyword":"Overclock"}`.

The `Detach` union comment is stale: seven BT26 cards declare it in committed IR, confirmed against BT26-010’s direct module. The current official manual defines Detach and Succession; neither should remain an invented or source-free provisional mechanic. Zero structured declarations also cannot prove absence of runtime behavior, because printed matching or another action representation may implement the keyword.

## Latest manual alignment

The [official manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf), version 4.2 updated 2026-08-18, adds normative Detach (§16-46) and Succession (§16-47) definitions. The canonical union includes Detach but excludes Succession even though committed IR contains a structured Succession reference. This is an inventory mismatch requiring inspection and correction, not proof of missing runtime behavior.

At baseline, Detach had a concrete runtime scope mismatch: `engine/effects/detach.ts` documented a combat-only deletion reaction and effect deletion never called its seam. The shared departure correction now lives in [detach-lifecycle.md](detach-lifecycle.md); full certification remains open. Current §16-46 covers departure other than the owner’s effects, requiring a matching linked-card payment. Investigate opponent deletion/return/deck/security departure and own-effect exclusions through public intents, then fix the shared replacement seam. Existing Q6964 battle proof covers one case and cannot limit the general keyword contract. This obligation takes priority in the replacement/keyword audit.

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
union now contains 46 names. The outside-union list above remains the historical
structured checkpoint; the canonical mismatch is resolved, while behavioral
certification is separate.
EndOfAttack/OnDeletion are timing or projection tokens and Unblockable is a
restriction encoding; their final semantic classification remains open.
Public path, counterfactual, consumer-shape and unresolved normative evidence belongs
to [succession-lifecycle.md](succession-lifecycle.md). Full keyword certification,
including nested-source shapes beyond the demonstrated Bacchusmon exclusion,
source/face changes and reset, remains open.

## Hidden stack source checkpoint

The copied and inherited live-source face-down boundary is owned by [stack-card-information.md](stack-card-information.md). Three public Giromon placement/evolution/attack sequences distinguish two baseline failures from a neutral hidden control. This adds a bounded contract, not certification of all hidden information; highest visible matching, snapshots, visibility changes, native scans and dynamic references remain open. BT22 historical completion is reopened.

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

| Keyword            | Declarations | References | Shapes |
| ------------------ | -----------: | ---------: | -----: |
| Blocker            |          300 |        461 |      2 |
| Piercing           |           99 |        183 |      2 |
| Rush               |           36 |        105 |      2 |
| Raid               |           73 |         94 |      1 |
| Reboot             |           89 |        141 |      2 |
| Jamming            |           71 |        111 |      2 |
| Retaliation        |           62 |         93 |      1 |
| Barrier            |           61 |         68 |      1 |
| Evade              |           22 |         25 |      1 |
| Save               |           47 |         47 |      1 |
| Delay              |          132 |        135 |      1 |
| Alliance           |           57 |         88 |      1 |
| Fortitude          |           28 |         29 |      1 |
| Blitz              |           14 |         25 |      2 |
| Collision          |           25 |         43 |      1 |
| Vortex             |           15 |         18 |      1 |
| Decoy              |            9 |         12 |      2 |
| Scapegoat          |           12 |         17 |      1 |
| Execute            |            6 |         15 |      2 |
| Progress           |            9 |         10 |      1 |
| IceClad            |           12 |         13 |      1 |
| Training           |           19 |         21 |      1 |
| Armor Purge        |           46 |         46 |      1 |
| Mind Link          |            6 |          6 |      1 |
| Ascension          |            4 |          6 |      1 |
| BlastDigivolve     |           75 |         75 |      1 |
| BlastDNADigivolve  |            7 |          7 |      1 |
| Draw               |            2 |          2 |      1 |
| SecurityAttack     |           93 |        317 |      7 |
| DeDigivolve        |            0 |          0 |      0 |
| Recovery           |           11 |         23 |      1 |
| DigiBurst          |           27 |         28 |      5 |
| Digisorption       |           10 |         10 |      2 |
| MaterialSave       |           12 |         13 |      4 |
| DigiXrosSubstitute |            0 |          1 |      1 |
| Link               |            9 |         11 |      3 |
| LinkMax            |            0 |          1 |      1 |
| Fragment           |           10 |         11 |      2 |
| Partition          |           13 |         13 |      1 |
| Decode             |           27 |         28 |      1 |
| Overclock          |           11 |         11 |      2 |
| UseReq             |            0 |          0 |      0 |
| Engage             |            3 |          5 |      1 |
| Guard              |            4 |          6 |      1 |
| Detach             |            4 |          7 |      1 |
| Succession         |            0 |          4 |      1 |

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
The focused current command is:

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

Result: 7 files / 220 tests passed. Static discovery of the scoped engine
directories finds 9 textual `it.fails`/`test.fails` references (several are
comments or prose describing historical divergences) and 3 skip-style
matches; each must be classified by executing the owning suite before it can
be called an active residual. The full engine suite and all collection suites
were intentionally not run for this inventory.

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
