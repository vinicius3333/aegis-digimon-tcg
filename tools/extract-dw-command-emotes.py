#!/usr/bin/env python3
"""Slice the Digimon World battle command icons into the chat emote icons the web
client serves from `apps/web/public/emotes/digimon-world-1/`.

The sheet is the PlayStation "Digimon World - Battle Commands" rip by Romsstar
(The Spriters Resource, asset 32086). Its first row is a 16x16 grid of command
icons drawn on an opaque (230, 230, 230) backdrop, which becomes transparent here.

The game shows the yellow smiley for "Your Call" and the cyan runner for "Run".
The game has no battle icons for Praise and Scold, so they borrow the yellow
smiley and its startled frame.

The live site sits behind a bot check, so the sheet comes from the Internet Archive:
https://web.archive.org/web/20230608145334id_/https://www.spriters-resource.com/resources/sheets/29/32086.png?updated=1460956357

Usage: python3 tools/extract-dw-command-emotes.py <battle-commands.png>
"""

import sys
from pathlib import Path

from PIL import Image

CELL_SIZE = 16
BACKDROP = (230, 230, 230)
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "apps/web/public/emotes/digimon-world-1"

# Keys match MATCH_EMOTES in packages/shared/src/protocol/chat.ts.
CELL_BY_EMOTE = {
    "offense": 2,
    "moderate": 6,
    "stayAway": 8,
    "defense": 10,
    "changeTarget": 12,
    "runAway": 0,
    "praise": 4,
    "scold": 5,
}


def icon(sheet: Image.Image, cell: int) -> Image.Image:
    left = cell * CELL_SIZE
    image = sheet.crop((left, 0, left + CELL_SIZE, CELL_SIZE))
    pixels = image.load()
    for y in range(CELL_SIZE):
        for x in range(CELL_SIZE):
            if pixels[x, y][:3] == BACKDROP:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1

    sheet = Image.open(sys.argv[1]).convert("RGBA")
    if sheet.size != (256, 90):
        print(f"expected the 256x90 Battle Commands sheet, got {sheet.size[0]}x{sheet.size[1]}")
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for emote, cell in CELL_BY_EMOTE.items():
        icon(sheet, cell).save(OUTPUT_DIR / f"{emote}.png", optimize=True)
    print(f"wrote {len(CELL_BY_EMOTE)} emote icons to {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
