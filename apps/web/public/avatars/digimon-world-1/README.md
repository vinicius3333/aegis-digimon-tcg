# Digimon World profile avatars

These 65 PNG files are crops of the collectible-card images from the original
PlayStation `Digimon World`. The source files are archived in the
[Wikimon Digimon World gallery](https://wikimon.net/Gallery:Digimon_World).

The files are downloaded and regenerated with:

```bash
pnpm --filter @aegis/shared build
node tools/download-digimon-world-avatars.mjs
```

The tool removes only the bottom card label by taking the upper 150 by 150
pixels. It does not resample, redraw, or otherwise alter the original artwork.
Digimon and the source artwork are property of their respective rights holders.
