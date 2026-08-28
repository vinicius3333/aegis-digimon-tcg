#!/usr/bin/env python3
"""Slice the Digimon World card sheets into the avatar portraits the web client
serves from `apps/web/public/avatars/digimon-world-1/`.

The sheets are the PlayStation "Digimon World - Cards" rips by metaldodomon
(The Spriters Resource). Sheet 1 holds the player portrait plus cards 01-32,
sheet 2 holds cards 33-65; card order matches DIGIMON_WORLD_AVATARS in
packages/shared/src/account/avatars.ts, so the roster maps by position.

Each sheet is a 6-column grid: cells start at (11, 9) with a 151x181 pitch. The
card face is the top 158 rows of a cell; the rest is the Japanese name bar,
which we drop.

Usage: python3 tools/extract-dw-card-avatars.py <sheet-01.png> <sheet-02.png>
"""

import re
import sys
from pathlib import Path

from PIL import Image

GRID_ORIGIN = (11, 9)
CELL_PITCH = (151, 181)
CARD_SIZE = (150, 158)
COLUMNS = 6
REPO_ROOT = Path(__file__).resolve().parent.parent
ROSTER = REPO_ROOT / "packages/shared/src/account/avatars.ts"
OUTPUT_DIR = REPO_ROOT / "apps/web/public/avatars/digimon-world-1"


def roster_ids() -> list[str]:
    source = ROSTER.read_text(encoding="utf-8")
    return re.findall(r'\{ id: "([^"]+)"', source)


def card(sheet: Image.Image, index: int) -> Image.Image:
    row, column = divmod(index, COLUMNS)
    left = GRID_ORIGIN[0] + column * CELL_PITCH[0]
    top = GRID_ORIGIN[1] + row * CELL_PITCH[1]
    return sheet.crop((left, top, left + CARD_SIZE[0], top + CARD_SIZE[1]))


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 1

    ids = roster_ids()
    first = Image.open(sys.argv[1]).convert("RGB")
    second = Image.open(sys.argv[2]).convert("RGB")
    # Sheet 1 opens with the human protagonist, who is not part of the roster.
    cards = [card(first, index) for index in range(1, 33)] + [card(second, index) for index in range(33)]

    if len(cards) != len(ids):
        print(f"roster has {len(ids)} avatars but the sheets yield {len(cards)} cards")
        return 1

    for avatar_id, image in zip(ids, cards):
        image.save(OUTPUT_DIR / f"{avatar_id}.png", optimize=True)
    print(f"wrote {len(cards)} portraits to {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
