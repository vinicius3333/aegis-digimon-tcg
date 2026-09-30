# Unpublished card art

These WebP files cover printings that the upstream image set
(TakaOtaku/Digimon-Card-App) has no English image for. Most are official
"SAMPLE" scans, so they carry the watermark. They were downloaded on 2026-09-29,
re-encoded as WebP, and scaled to at most 430 px wide.

| Files | Source |
|---|---|
| BT11-023_P1, BT17-059_P1, BT20-014_P1, BT21-009_P2, BT22-004_P1, BT22-063_P2, BT22-099_P1, BT5-090_P2 | Bandai's English card list, `https://world.digimoncard.com/images/cardlist/card/<id>.png` |
| P-147 (the wiki's P-147_P1 scan), BT21-005_P1, BT21-018_P2, BT21-023_P2, BT24-011_P2, BT24-059_P2, BT25-041_P2, BT25-053_P2, EX8-055_P2 (the wiki's EX8-055_P3) | DigimonCardGame Wiki, `https://static.wikia.nocookie.net/digimoncardgame/images/` |
| LM-063 to LM-068, ST24-11_P2, ST24-11_P3 | `https://images.digimoncard.io/images/cards/` |

The client tries the upstream image first, so a file here stops being used once
upstream publishes that printing. Delete it then, and drop its id from
`UNPUBLISHED_IMAGE_IDS` in `packages/shared/src/cards/images.ts`.

Copyright belongs to Bandai and the credited Digimon rights holders.
