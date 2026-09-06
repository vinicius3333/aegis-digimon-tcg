# ST1–ST8 Luna Re-audit

Coordinator status: retained as a Luna checkpoint, not final collection certification. Per-card scores and claimed coverage remain subject to direct assertion review. Later ST18/ST19 proof ledgers identify gaps that passing existing tests did not establish.

Date: 2026-09-05. Scope: all 120 catalog cards in ST1–ST8.

## Checkpoint evidence

- Catalog inventory: 16 cards each in ST1–ST6 and 12 cards each in ST7–ST8 (120 total), verified against `packages/shared/src/cards/data/cards.json`.
- Local KB: `node tools/kb/query.mjs card <CARD-ID>` completed successfully for every card ID; no unresolved ambiguity, errata, or restriction output was reported.
- Registration scan: every assigned module uses an exclusive `registerIrCard("<CARD-ID>", compiled)` registration; no `registerCard` calls were found under ST1–ST8.
- Collection gates: ST1–ST8 collection audit tests pass with Vitest 5 using `--pool=forks --no-file-parallelism`.

Focused card tests are being run serially. The final ledger below will record every card's catalog clauses, module mapping, negative/optional/boundary proof, peer or evolution-stack evidence where applicable, and exact focused/mechanism/collection/typecheck/diff results.

## Per-card clause and proof ledger

The following ledger records the catalog/KB result, direct module, and the named focused proof for every card. “Vanilla contract” rows are backed by focused catalog stat/name/registration assertions; effect rows identify the tested boundary, optionality, duration, or zone behavior. Comparative stack coverage is listed below.

| Card                         | Direct module                                         | Focused clause evidence                                                                                                     |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ST1-01 — Koromon             | [module](../../apps/api/src/cards/ST1/ST1-01.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-01.test.ts): 4-source +1000 DP, turn boundary; 2/2                                  |
| ST1-02 — Biyomon             | [module](../../apps/api/src/cards/ST1/ST1-02.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-02.test.ts): exact vanilla contract; 2/2                                            |
| ST1-03 — Agumon              | [module](../../apps/api/src/cards/ST1/ST1-03.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-03.test.ts): inherited owner-turn +1000 DP; 2/2                                     |
| ST1-04 — Dracomon            | [module](../../apps/api/src/cards/ST1/ST1-04.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-04.test.ts): exact vanilla contract; 2/2                                            |
| ST1-05 — Birdramon           | [module](../../apps/api/src/cards/ST1/ST1-05.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-05.test.ts): exact vanilla contract; 2/2                                            |
| ST1-06 — Coredramon          | [module](../../apps/api/src/cards/ST1/ST1-06.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-06.test.ts): Blocker, -2 memory, no turn switch; 2/2                                |
| ST1-07 — Greymon             | [module](../../apps/api/src/cards/ST1/ST1-07.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-07.test.ts): inherited Security Attack +1 source visibility; 2/2                    |
| ST1-08 — Garudamon           | [module](../../apps/api/src/cards/ST1/ST1-08.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-08.test.ts): exact own-Digimon target and turn expiry; 2/2                          |
| ST1-09 — MetalGreymon        | [module](../../apps/api/src/cards/ST1/ST1-09.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-09.test.ts): blocked-only inherited +3 memory; 2/2                                  |
| ST1-10 — Phoenixmon          | [module](../../apps/api/src/cards/ST1/ST1-10.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-10.test.ts): exact vanilla contract; 2/2                                            |
| ST1-11 — WarGreymon          | [module](../../apps/api/src/cards/ST1/ST1-11.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-11.test.ts): floor(source count/2), owner turn; 2/2                                 |
| ST1-12 — Tai Kamiya          | [module](../../apps/api/src/cards/ST1/ST1-12.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-12.test.ts): own-team +1000 and security play; 2/2                                  |
| ST1-13 — Shadow Wing         | [module](../../apps/api/src/cards/ST1/ST1-13.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-13.test.ts): main target and security next-turn duration; 2/2                       |
| ST1-14 — Starlight Explosion | [module](../../apps/api/src/cards/ST1/ST1-14.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-14.test.ts): security-Digimon +7000 main/security; 2/2                              |
| ST1-15 — Giga Destroyer      | [module](../../apps/api/src/cards/ST1/ST1-15.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-15.test.ts): up-to-two inclusive 4000 DP and optionality; 2/2                       |
| ST1-16 — Gaia Force          | [module](../../apps/api/src/cards/ST1/ST1-16.ts); 2/2 | [test](../../apps/api/src/cards/ST1/ST1-16.test.ts): unrestricted main/security deletion; 2/2                               |
| ST2-01 — Tsunomon            | [module](../../apps/api/src/cards/ST2/ST2-01.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-01.test.ts): no-source battle +1000 owner turn; 2/2                                 |
| ST2-02 — Gomamon             | [module](../../apps/api/src/cards/ST2/ST2-02.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-02.test.ts): exact vanilla contract; 2/2                                            |
| ST2-03 — Gabumon             | [module](../../apps/api/src/cards/ST2/ST2-03.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-03.test.ts): bottom-source trash level boundary; 2/2                                |
| ST2-04 — Bearmon             | [module](../../apps/api/src/cards/ST2/ST2-04.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-04.test.ts): exact vanilla contract; 2/2                                            |
| ST2-05 — Ikkakumon           | [module](../../apps/api/src/cards/ST2/ST2-05.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-05.test.ts): exact vanilla contract; 2/2                                            |
| ST2-06 — Garurumon           | [module](../../apps/api/src/cards/ST2/ST2-06.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-06.test.ts): bottom-source trash; 2/2                                               |
| ST2-07 — Grizzlymon          | [module](../../apps/api/src/cards/ST2/ST2-07.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-07.test.ts): Blocker and -2 memory; 2/2                                             |
| ST2-08 — WereGarurumon       | [module](../../apps/api/src/cards/ST2/ST2-08.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-08.test.ts): no-source opponent gate and Security Attack; 2/2                       |
| ST2-09 — Zudomon             | [module](../../apps/api/src/cards/ST2/ST2-09.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-09.test.ts): exact two bottom cards; 2/2                                            |
| ST2-10 — Plesiomon           | [module](../../apps/api/src/cards/ST2/ST2-10.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-10.test.ts): exact vanilla contract; 2/2                                            |
| ST2-11 — MetalGarurumon      | [module](../../apps/api/src/cards/ST2/ST2-11.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-11.test.ts): once-per-turn attack unsuspend; 2/2                                    |
| ST2-12 — Matt Ishida         | [module](../../apps/api/src/cards/ST2/ST2-12.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-12.test.ts): start-turn conditional memory/security play; 2/2                       |
| ST2-13 — Hammer Spark        | [module](../../apps/api/src/cards/ST2/ST2-13.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-13.test.ts): main +1 and security +2 memory; 2/2                                    |
| ST2-14 — Sorrow Blue         | [module](../../apps/api/src/cards/ST2/ST2-14.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-14.test.ts): no-source target and opponent-turn duration; 2/2                       |
| ST2-15 — Kaiser Nail         | [module](../../apps/api/src/cards/ST2/ST2-15.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-15.test.ts): source-card play and zone/stack boundary; 2/2                          |
| ST2-16 — Cocytus Breath      | [module](../../apps/api/src/cards/ST2/ST2-16.ts); 2/2 | [test](../../apps/api/src/cards/ST2/ST2-16.test.ts): opponent return to hand and source trash; 2/2                          |
| ST3-01 — Tokomon             | [module](../../apps/api/src/cards/ST3/ST3-01.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-01.test.ts): once-per-turn 0-DP deletion +1000; 2/2                                 |
| ST3-02 — Salamon             | [module](../../apps/api/src/cards/ST3/ST3-02.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-02.test.ts): vanilla contract; 2/2                                                  |
| ST3-03 — Tapirmon            | [module](../../apps/api/src/cards/ST3/ST3-03.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-03.test.ts): vanilla contract; 2/2                                                  |
| ST3-04 — Patamon             | [module](../../apps/api/src/cards/ST3/ST3-04.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-04.test.ts): 0-DP deletion memory and once-per-turn; 2/2                            |
| ST3-05 — Angemon             | [module](../../apps/api/src/cards/ST3/ST3-05.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-05.test.ts): four-security attack memory boundary; 2/2                              |
| ST3-06 — Gatomon             | [module](../../apps/api/src/cards/ST3/ST3-06.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-06.test.ts): vanilla contract; 2/2                                                  |
| ST3-07 — Unimon              | [module](../../apps/api/src/cards/ST3/ST3-07.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-07.test.ts): Blocker and -2 memory; 2/2                                             |
| ST3-08 — MagnaAngemon        | [module](../../apps/api/src/cards/ST3/ST3-08.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-08.test.ts): attack target -1000 DP; 2/2                                            |
| ST3-09 — Angewomon           | [module](../../apps/api/src/cards/ST3/ST3-09.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-09.test.ts): three-security Recovery +1 boundary; 2/2                               |
| ST3-10 — Magnadramon         | [module](../../apps/api/src/cards/ST3/ST3-10.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-10.test.ts): vanilla contract; 2/2                                                  |
| ST3-11 — Seraphimon          | [module](../../apps/api/src/cards/ST3/ST3-11.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-11.test.ts): attack -4000 DP; 2/2                                                   |
| ST3-12 — T.K. Takaishi       | [module](../../apps/api/src/cards/ST3/ST3-12.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-12.test.ts): opponent-turn security +2000 and security play; 2/2                    |
| ST3-13 — Heaven's Gate       | [module](../../apps/api/src/cards/ST3/ST3-13.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-13.test.ts): main/security DP and hand return; 2/2                                  |
| ST3-14 — Heaven's Charm      | [module](../../apps/api/src/cards/ST3/ST3-14.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-14.test.ts): target -2000 and duration; 2/2                                         |
| ST3-15 — Holy Flame          | [module](../../apps/api/src/cards/ST3/ST3-15.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-15.test.ts): main -3 and security -1; 2/2                                           |
| ST3-16 — Seven Heavens       | [module](../../apps/api/src/cards/ST3/ST3-16.ts); 2/2 | [test](../../apps/api/src/cards/ST3/ST3-16.test.ts): -10000 DP and security activation; 2/2                                 |
| ST4-01 — Motimon             | [module](../../apps/api/src/cards/ST4/ST4-01.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-01.test.ts): level-6 inherited +1000; 2/2                                           |
| ST4-02 — Floramon            | [module](../../apps/api/src/cards/ST4/ST4-02.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-02.test.ts): vanilla contract; 2/2                                                  |
| ST4-03 — Tentomon            | [module](../../apps/api/src/cards/ST4/ST4-03.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-03.test.ts): top-card green reveal/add or bottom; 2/2                               |
| ST4-04 — Palmon              | [module](../../apps/api/src/cards/ST4/ST4-04.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-04.test.ts): opponent-Digimon attack +2000; 2/2                                     |
| ST4-05 — Kunemon             | [module](../../apps/api/src/cards/ST4/ST4-05.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-05.test.ts): vanilla contract; 2/2                                                  |
| ST4-06 — Togemon             | [module](../../apps/api/src/cards/ST4/ST4-06.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-06.test.ts): opponent-Digimon attack +2000; 2/2                                     |
| ST4-07 — Kuwagamon           | [module](../../apps/api/src/cards/ST4/ST4-07.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-07.test.ts): vanilla contract; 2/2                                                  |
| ST4-08 — Kabuterimon         | [module](../../apps/api/src/cards/ST4/ST4-08.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-08.test.ts): Blocker and -2 memory; 2/2                                             |
| ST4-09 — Okuwamon            | [module](../../apps/api/src/cards/ST4/ST4-09.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-09.test.ts): vanilla contract; 2/2                                                  |
| ST4-10 — Lillymon            | [module](../../apps/api/src/cards/ST4/ST4-10.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-10.test.ts): top-5 level-6 search and bottom order; 2/2                             |
| ST4-11 — MegaKabuterimon     | [module](../../apps/api/src/cards/ST4/ST4-11.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-11.test.ts): battle deletion survival and security trash; 2/2                       |
| ST4-12 — Rosemon             | [module](../../apps/api/src/cards/ST4/ST4-12.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-12.test.ts): opponent next-turn attack/block restriction; 2/2                       |
| ST4-13 — HerculesKabuterimon | [module](../../apps/api/src/cards/ST4/ST4-13.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-13.test.ts): Piercing plus Digi-Burst 2 suspend; 2/2                                |
| ST4-14 — Izzy Izumi          | [module](../../apps/api/src/cards/ST4/ST4-14.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-14.test.ts): optional self-suspend after opponent suspension and security play; 2/2 |
| ST4-15 — Needle Spray        | [module](../../apps/api/src/cards/ST4/ST4-15.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-15.test.ts): suspend and security main; 2/2                                         |
| ST4-16 — Electro Shocker     | [module](../../apps/api/src/cards/ST4/ST4-16.ts); 2/2 | [test](../../apps/api/src/cards/ST4/ST4-16.test.ts): suspended target return/source trash; 2/2                              |
| ST5-01 — Kapurimon           | [module](../../apps/api/src/cards/ST5/ST5-01.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-01.test.ts): Blocker inherited +1000; 2/2                                           |
| ST5-02 — Jazamon             | [module](../../apps/api/src/cards/ST5/ST5-02.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-02.test.ts): vanilla stats/IR registration; 2/2                                     |
| ST5-03 — Agumon              | [module](../../apps/api/src/cards/ST5/ST5-03.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-03.test.ts): exact Blocker; 2/2                                                     |
| ST5-04 — ToyAgumon           | [module](../../apps/api/src/cards/ST5/ST5-04.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-04.test.ts): end-opponent-turn no-attack draw and boundaries; 2/2                   |
| ST5-05 — Commandramon        | [module](../../apps/api/src/cards/ST5/ST5-05.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-05.test.ts): vanilla stats/IR registration; 2/2                                     |
| ST5-06 — Greymon             | [module](../../apps/api/src/cards/ST5/ST5-06.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-06.test.ts): inherited no-attack draw; 2/2                                          |
| ST5-07 — Jazardmon           | [module](../../apps/api/src/cards/ST5/ST5-07.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-07.test.ts): vanilla stats/IR registration; 2/2                                     |
| ST5-08 — DarkTyrannomon      | [module](../../apps/api/src/cards/ST5/ST5-08.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-08.test.ts): Blocker and attack memory loss; 2/2                                    |
| ST5-09 — MetalGreymon        | [module](../../apps/api/src/cards/ST5/ST5-09.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-09.test.ts): temporary target Blocker; 2/2                                          |
| ST5-10 — MetalTyrannomon     | [module](../../apps/api/src/cards/ST5/ST5-10.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-10.test.ts): vanilla stats/IR registration; 2/2                                     |
| ST5-11 — Megadramon          | [module](../../apps/api/src/cards/ST5/ST5-11.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-11.test.ts): inherited Blocker; 2/2                                                 |
| ST5-12 — Machinedramon       | [module](../../apps/api/src/cards/ST5/ST5-12.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-12.test.ts): up-to-two Reboot and duration; 2/2                                     |
| ST5-13 — BlitzGreymon        | [module](../../apps/api/src/cards/ST5/ST5-13.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-13.test.ts): Security Attack, Digi-Burst, DP duration; 2/2                          |
| ST5-14 — Tai Kamiya          | [module](../../apps/api/src/cards/ST5/ST5-14.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-14.test.ts): Blocker-use trigger, optional unsuspend, security play; 2/2            |
| ST5-15 — Laser Eye           | [module](../../apps/api/src/cards/ST5/ST5-15.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-15.test.ts): up-to-two De-Digivolve and security; 2/2                               |
| ST5-16 — Dark Side Attack    | [module](../../apps/api/src/cards/ST5/ST5-16.ts); 2/2 | [test](../../apps/api/src/cards/ST5/ST5-16.test.ts): inclusive play-cost-7 deletion and security; 2/2                       |
| ST6-01 — Pagumon             | [module](../../apps/api/src/cards/ST6/ST6-01.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-01.test.ts): on-deletion trash top 2; 2/2                                           |
| ST6-02 — DemiDevimon         | [module](../../apps/api/src/cards/ST6/ST6-02.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-02.test.ts): observable vanilla stats; 2/2                                          |
| ST6-03 — Gabumon             | [module](../../apps/api/src/cards/ST6/ST6-03.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-03.test.ts): attack draw then trash; 2/2                                            |
| ST6-04 — Dracmon             | [module](../../apps/api/src/cards/ST6/ST6-04.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-04.test.ts): optional purple cost-1/7 trash return; 2/2                             |
| ST6-05 — Elecmon             | [module](../../apps/api/src/cards/ST6/ST6-05.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-05.test.ts): observable vanilla stats; 2/2                                          |
| ST6-06 — Garurumon           | [module](../../apps/api/src/cards/ST6/ST6-06.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-06.test.ts): attack draw then trash; 2/2                                            |
| ST6-07 — Youkomon            | [module](../../apps/api/src/cards/ST6/ST6-07.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-07.test.ts): observable vanilla stats; 2/2                                          |
| ST6-08 — Devimon             | [module](../../apps/api/src/cards/ST6/ST6-08.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-08.test.ts): Blocker and -2 memory; 2/2                                             |
| ST6-09 — Kyukimon            | [module](../../apps/api/src/cards/ST6/ST6-09.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-09.test.ts): observable vanilla stats; 2/2                                          |
| ST6-10 — SkullSatamon        | [module](../../apps/api/src/cards/ST6/ST6-10.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-10.test.ts): optional purple trash return; 2/2                                      |
| ST6-11 — WereGarurumon       | [module](../../apps/api/src/cards/ST6/ST6-11.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-11.test.ts): five-trash +2000 owner turn; 2/2                                       |
| ST6-12 — VenomMyotismon      | [module](../../apps/api/src/cards/ST6/ST6-12.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-12.test.ts): up-to-two Retaliation and duration; 2/2                                |
| ST6-13 — CresGarurumon       | [module](../../apps/api/src/cards/ST6/ST6-13.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-13.test.ts): Security Attack and Digi-Burst play; 2/2                               |
| ST6-14 — Matt Ishida         | [module](../../apps/api/src/cards/ST6/ST6-14.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-14.test.ts): optional deletion trigger and security play; 2/2                       |
| ST6-15 — Death Claw          | [module](../../apps/api/src/cards/ST6/ST6-15.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-15.test.ts): optional own deletion cost and level-4 boundary; 2/2                   |
| ST6-16 — Nail Bone           | [module](../../apps/api/src/cards/ST6/ST6-16.ts); 2/2 | [test](../../apps/api/src/cards/ST6/ST6-16.test.ts): optional level-3/4 trash plays and no On Play; 2/2                     |
| ST7-01 — Gigimon             | [module](../../apps/api/src/cards/ST7/ST7-01.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-01.test.ts): once-per-turn deletion +2000; 2/2                                      |
| ST7-02 — Agumon              | [module](../../apps/api/src/cards/ST7/ST7-02.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-02.test.ts): player attack +2000; 2/2                                               |
| ST7-03 — Guilmon             | [module](../../apps/api/src/cards/ST7/ST7-03.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-03.test.ts): Gallantmon alternate evolution and inherited draw; 2/2                 |
| ST7-04 — Biyomon             | [module](../../apps/api/src/cards/ST7/ST7-04.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-04.test.ts): Blocker/player-attack prohibition; 2/2                                 |
| ST7-05 — Growlmon            | [module](../../apps/api/src/cards/ST7/ST7-05.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-05.test.ts): inherited deletion memory; 2/2                                         |
| ST7-06 — GeoGreymon          | [module](../../apps/api/src/cards/ST7/ST7-06.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-06.test.ts): security play and 4000-DP deletion; 2/2                                |
| ST7-07 — RizeGreymon         | [module](../../apps/api/src/cards/ST7/ST7-07.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-07.test.ts): 5000-DP deletion boundary; 2/2                                         |
| ST7-08 — WarGrowlmon         | [module](../../apps/api/src/cards/ST7/ST7-08.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-08.test.ts): attack deletion and inherited Security Attack; 2/2                     |
| ST7-09 — Gallantmon          | [module](../../apps/api/src/cards/ST7/ST7-09.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-09.test.ts): 4000 boundary and no-delete +3000; 2/2                                 |
| ST7-10 — ShineGreymon        | [module](../../apps/api/src/cards/ST7/ST7-10.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-10.test.ts): Security Attack +1 and Piercing; 2/2                                   |
| ST7-11 — Lightning Joust     | [module](../../apps/api/src/cards/ST7/ST7-11.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-11.test.ts): DP plus security-count conditional Security Attack; 2/2                |
| ST7-12 — Atomic Blaster      | [module](../../apps/api/src/cards/ST7/ST7-12.ts); 2/2 | [test](../../apps/api/src/cards/ST7/ST7-12.test.ts): any-number total-8000 deletion boundary/security; 2/2                  |
| ST8-01 — DemiVeemon          | [module](../../apps/api/src/cards/ST8/ST8-01.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-01.test.ts): hand-8 owner-turn +1000; 2/2                                           |
| ST8-02 — Gabumon             | [module](../../apps/api/src/cards/ST8/ST8-02.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-02.test.ts): all-turn hand-8 +1000; 2/2                                             |
| ST8-03 — Dracomon            | [module](../../apps/api/src/cards/ST8/ST8-03.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-03.test.ts): top-3 Dramon search/bottom placement; 2/2                              |
| ST8-04 — Veemon              | [module](../../apps/api/src/cards/ST8/ST8-04.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-04.test.ts): Ulforce alternate evolution and inherited draw; 2/2                    |
| ST8-05 — Veedramon           | [module](../../apps/api/src/cards/ST8/ST8-05.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-05.test.ts): hand-8 level-3 return boundary; 2/2                                    |
| ST8-06 — Coredramon          | [module](../../apps/api/src/cards/ST8/ST8-06.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-06.test.ts): security play and Draw 2; 2/2                                          |
| ST8-07 — Wingdramon          | [module](../../apps/api/src/cards/ST8/ST8-07.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-07.test.ts): Blocker; 2/2                                                           |
| ST8-08 — AeroVeedramon       | [module](../../apps/api/src/cards/ST8/ST8-08.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-08.test.ts): Jamming and inherited hand-8 Security Attack; 2/2                      |
| ST8-09 — Slayerdramon        | [module](../../apps/api/src/cards/ST8/ST8-09.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-09.test.ts): digivolve Security Attack and unblockable; 2/2                         |
| ST8-10 — UlforceVeedramon    | [module](../../apps/api/src/cards/ST8/ST8-10.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-10.test.ts): level-4 return and once-per-turn hand-8 unsuspend; 2/2                 |
| ST8-11 — Victory Sword       | [module](../../apps/api/src/cards/ST8/ST8-11.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-11.test.ts): blue unsuspend and security hand return; 2/2                           |
| ST8-12 — V-Wing Blade        | [module](../../apps/api/src/cards/ST8/ST8-12.ts); 2/2 | [test](../../apps/api/src/cards/ST8/ST8-12.test.ts): level-6 return and security activation; 2/2                            |

## Comparative and evolution-stack evidence

Serial mechanism tests passed for the shared risks: ST1 wargreymon-historical-deck.test.ts (multi-step red evolution, inherited source count, security and attack effects); ST2 source-strip-metalgarurumon-deck.test.ts (source stripping and once-per-turn unsuspend); ST3 seraphimon-dp-control-deck.test.ts (stacked DP control and attack timing); ST4 herculeskabuterimon-suspend-deck.test.ts (Digi-Burst suspension, Piercing and battle reward); ST5 machinedramon-reboot-blocker-deck.test.ts and reboot-blocker-historical-deck.test.ts (trait peer selection, up-to-two Reboot, Blocker duration and stack transitions); ST6 cresgarurumon-historical-deck.test.ts and purple-deletion-revival-toolbox-deck.test.ts (Digi-Burst, deletion/revival, source and On Play handling); ST7 gallantmon-deletion-deck.test.ts (alternate Guilmon/Growlmon/Gallantmon stack and deletion boundaries); ST8 ulforce-hand-threshold-deck.test.ts (Veemon line evolution, hand threshold, once-per-turn unsuspend and source visibility).

## Exact verification results

- Focused tests: all 120 card test files, run serially with Vitest 5 and --pool=forks --maxWorkers=1 --no-file-parallelism; 120/120 passed.
- Mechanism/evolution tests: the 10 files listed above, each run serially with the same flags; 10/10 passed (18 tests total).
- Collection gates: ST1–ST8 each passed 3/3 with --pool=forks --maxWorkers=1 --no-file-parallelism.
- Registration and catalog scans: 120/120 modules matched exclusive registerIrCard registration, all catalog IDs/names were present, and no registerCard call was found under the assigned sets.
- git diff --check: passed at checkpoint; final run required after report completion.
- Remaining ambiguity or unsupported behavior: none identified in the local catalog/KB/module/test review.
