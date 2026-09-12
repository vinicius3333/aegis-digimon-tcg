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
