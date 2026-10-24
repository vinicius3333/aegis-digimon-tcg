# Local card scans

These WebP files cover printings that no image origin of
`tools/deploy/card-images.mjs` publishes. Most are official "SAMPLE" scans, so
they carry the watermark. The first batch was downloaded on 2026-09-29,
re-encoded as WebP, and scaled to at most 430 px wide.

The sync copies each file into the gateway mirror as `<id>-Sample.webp` on every
deploy and in the daily cron job. The client already tries that name after
`<id>.webp`. Once an origin publishes the real image, the sync stores it and
deletes the sample. Delete the file here then.

| Files                                                                                                                                                           | Source                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| BT11-023_P1, BT17-059_P1, BT20-014_P1, BT21-009_P2, BT22-004_P1, BT22-063_P2, BT22-099_P1, BT5-090_P2                                                           | Bandai's English card list, `https://world.digimoncard.com/images/cardlist/card/<id>.png` |
| P-147 (the wiki's P-147_P1 scan), BT21-005_P1, BT21-018_P2, BT21-023_P2, BT24-011_P2, BT24-059_P2, BT25-041_P2, BT25-053_P2, EX8-055_P2 (the wiki's EX8-055_P3) | DigimonCardGame Wiki, `https://static.wikia.nocookie.net/digimoncardgame/images/`         |
| LM-063 to LM-068, ST24-11_P2, ST24-11_P3                                                                                                                        | `https://images.digimoncard.io/images/cards/`                                             |

## Official card list gaps, 2026-10-14

A comparison with every product page of Bandai's English card list found 65
printings the upstream set does not list. Their files come from
`https://world.digimoncard.com/images/cardlist/card/<id>.png`, re-encoded as
WebP at the source width of 430 px.

Bandai and upstream number some printings differently. Where Bandai's number
already belongs to another upstream printing of the card, the file takes the
next free number:

| File       | Bandai image | Product                  |
| ---------- | ------------ | ------------------------ |
| BT9-112_P4 | BT9-112_P3   | Special Limited Set      |
| EX1-066_P6 | EX1-066_P4   | BT-21: Limited Card Pack |
| EX5-070_P5 | EX5-070_P3   | Special Event Pack 2025  |

The comparison skipped printings whose image matches another printing of the
same card: the second ST-12 printings of BT3-093, BT3-094, BT4-096, ST1-12,
ST3-12 and ST6-14, and the ST-24 printings of LM-033 to LM-038.

Copyright belongs to Bandai and the credited Digimon rights holders.

## BT27 and EX14 reveals, 2026-10-16

These scans are encoded as WebP at 430 px wide with quality 90. They retain
the source SAMPLE watermark and use the existing local-scan fallback.
The Japanese catalog entries cover all seven BT27/EX14 cards currently in
`cards.json`, plus the four available Japanese BT27 alternate arts.

| File          | Source                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------- |
| BT27-035_P1   | [User-provided English reveal](https://pbs.twimg.com/media/HUQatrhW8AAWhIy?format=jpg&name=large) |
| BT27-103_P1   | [User-provided English reveal](https://pbs.twimg.com/media/HUQbOv4W4AAmpIc?format=jpg&name=large) |
| BT27-035-J    | [Wikimon Japanese scan](https://wikimon.net/images/0/03/Dcg-BT27-035.jpg)                         |
| BT27-100-J    | [Wikimon Japanese scan](https://wikimon.net/images/0/06/Dcg-BT27-100.jpg)                         |
| EX14-054-J    | [Wikimon Japanese scan](https://wikimon.net/images/1/16/Dcg-EX14-054.jpg)                         |
| BT27-084-J    | [Wikimon Japanese scan](https://wikimon.net/images/2/2d/Dcg-BT27-084.jpg)                         |
| BT27-084_P1-J | [Wikimon Japanese scan](https://wikimon.net/images/3/3a/Dcg-BT27-084_2.jpg)                       |
| BT27-103-J    | [Wikimon Japanese scan](https://wikimon.net/images/3/3e/Dcg-BT27-103.jpg)                         |
| EX14-012-J    | [Wikimon Japanese scan](https://wikimon.net/images/5/55/Dcg-EX14-012.jpg)                         |
| BT27-070-J    | [Wikimon Japanese scan](https://wikimon.net/images/6/6c/Dcg-BT27-070.jpg)                         |
| BT27-070_P1-J | [Wikimon Japanese scan](https://wikimon.net/images/6/6c/Dcg-BT27-070_2.jpg)                       |
| BT27-035_P1-J | [Wikimon Japanese scan](https://wikimon.net/images/a/a3/Dcg-BT27-035_2.jpg)                       |
| BT27-103_P1-J | [Wikimon Japanese scan](https://wikimon.net/images/f/f4/Dcg-BT27-103_2.jpg)                       |

The [official Chinese catalog](https://dtcgweb-api.digimoncard.cn/gamecard/gamecardmanager/weblist?page=1&limit=100000)
returned all 7,628 records and no BT27 or EX14 printings on this date. The
[official Korean card list](https://digimoncard.co.kr/index.php?mid=cardlist)
did not list either set; its latest listed booster and extra booster were
BTK-22 and EXK-09. No Chinese or Korean entries were added.

## BT27 Chronicle Ryudamon line, 2026-10-23

These scans are cropped to the card edge (868 x 1213 px, without the white
image margin) and encoded as WebP with quality 90. They retain the source
SAMPLE watermark.

| Files                              | Source                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| BT27-008, BT27-009, BT27-013       | [Official English reveal](https://x.com/digimon_tcg_EN/status/2113510737171587393) |
| BT27-015                           | [Official English reveal](https://x.com/digimon_tcg_EN/status/2113608882606223567) |
| BT27-008-J, BT27-009-J, BT27-013-J | [Official Japanese reveal](https://x.com/digimon_tcg/status/2113510813256593622)   |
| BT27-015-J                         | [Official Japanese reveal](https://x.com/digimon_tcg/status/2113608952378446317)   |

## BT27 Yuji Musya, Keenan Crier and Silver-Winged Yaksha, 2026-10-24

These scans are cropped to the card edge (868 x 1213 px, without the white
image margin) and encoded as WebP with quality 90. They retain the source
SAMPLE watermark. The Japanese scans are also the source of the Japanese card
text.

| Files                              | Source                                     |
| ---------------------------------- | ------------------------------------------ |
| BT27-087, BT27-096, BT27-101       | User-provided official English reveal art  |
| BT27-087-J, BT27-096-J, BT27-101-J | User-provided official Japanese reveal art |
