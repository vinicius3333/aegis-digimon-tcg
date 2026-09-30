/**
 * English printings which the source's English arts (`AAs`) omit: some sit only among its
 * Japanese arts (`JAAs`), others are not listed at all. The source hosts most of their
 * images; the rest are bundled by `packages/shared/src/cards/images.ts`. Mapped to
 * their English product label. Before adding one, view the upstream image and confirm the
 * English product (the wiki the source scrapes, digimoncard.io, or a matching stamp on a
 * listed printing): Japanese labels often name Japan-only products, and the source also
 * keeps stale files that duplicate a listed printing under an old number.
 */
const UNLISTED_ENGLISH_PRINTINGS = new Map([
  ["AD1-010_P1", "Regionals 26-27 Season 1 Promotion Card"],
  ["BT11-027_P3", "Championship Finals 2024 Trophy Cards"],
  ["BT13-030_P2", "Championship Finals 2024 Trophy Cards"],
  ["BT16-003_P1", "Box Promotion Pack: Beginning Observer"],
  ["BT16-028_P3", "Regionals 2024 Finalist Set 3"],
  ["BT16-040_P0", "Pre-Release Pack Beginning Observer"],
  ["BT17-036_P0", "Pre-Release Pack Secret Crisis"],
  ["BT17-087_P1", "BT-17: Booster Secret Crisis"],
  ["BT17-099_P0", "Pre-Release Pack Secret Crisis"],
  ["BT19-014_P1", "BT-19: Booster Xros Evolution"],
  ["BT20-014_P1", "LM-07: LIMITED CARD PACK ANOTHER KNIGHT"],
  ["BT20-055_P1", "BT-20: Booster Over the X"],
  ["BT20-064_P1", "Regionals 26-27 Season 1 Promotion Card"],
  ["BT20-070_P1", "Regionals 26-27 Season 1 Promotion Card"],
  ["BT21-005_P1", "LM-07: LIMITED CARD PACK ANOTHER KNIGHT"],
  ["BT21-009_P2", "Ultimate Cup 26-27 Season 2"],
  ["BT21-018_P2", "Ultimate Cup 26-27 Season 2"],
  ["BT21-023_P2", "Ultimate Cup 26-27 Season 2"],
  ["BT23-024_P1", "BT-23: BOOSTER HACKERS' SLUMBER"],
  ["BT24-011_P2", "Event Pack 10"],
  ["BT24-059_P2", "Event Pack 10"],
  ["BT25-041_P2", "Event Pack 10"],
  ["BT25-053_P2", "Event Pack 10"],
  ["BT26-029_P1", "Box Promotion Pack: TIMELESS BONDS"],
  ["BT26-073_P1", "Box Promotion Pack: TIMELESS BONDS"],
  ["BT3-024_P1", "BT-03: Booster Union Impact"],
  ["BT6-065_P0", "Double Diamond Pre-Release Pack"],
  ["BT7-109_P0", "Next Adventure Pre-Release Pack"],
  ["BT8-094_P2", "Championship 2024 Gold Stamp Card Set"],
  ["BT8-097_P0", "New Awakening Pre-Release Pack"],
  ["BT8-108_P0", "Double Typhoon Pre-Release Pack"],
  ["BT9-028_P1", "2024 Evolution Cup August 2024 Wave 2 (Participation)"],
  ["BT9-028_P2", "2024 Evolution Cup August 2024 Wave 2 (Top 4)"],
  ["EX11-072_P1", "EX-11: EXTRA BOOSTER DAWN OF LIBERATOR"],
  ["EX12-006_P1", "Box Promotion Pack: DIGITAL WORLD SHAMBALA"],
  ["EX2-011_P0", "DC-1 2022 Grand Prix Stamp"],
  ["EX3-010_P2", "2024 Evolution Cup August 2024 Wave 2 (Participation)"],
  ["EX3-010_P3", "2024 Evolution Cup August 2024 Wave 2 (Top 4)"],
  ["EX4-034_P0", "Double Typhoon Pre-Release Pack"],
  ["EX5-007_P2", "Digimon Story: Time Stranger - Collector's Edition"],
  ["EX5-016_P2", "Digimon Story: Time Stranger - Collector's Edition"],
  ["EX5-073_P3", "Digimon Story: Time Stranger - Collector's Edition"],
  ["P-037_P6", "Digimon Story: Time Stranger Tutorial Deck"],
  ["P-041_P0", "DC-1 2022 Grand Prix Stamp"],
  ["P-071_P2", "Championship 2023 Gold Card Set"],
  ["P-117_P1", "Demo Deck: Imperialdramon"],
  ["P-123_P1", "Demo Deck: Imperialdramon"],
  ["P-124_P1", "Demo Deck: Imperialdramon"],
  ["P-130_P1", "Demo Deck: Imperialdramon"],
  ["P-131_P1", "Digimon Liberator Release Commemoration"],
  ["P-134_P1", "Digimon Liberator Release Commemoration"],
  ["P-148_P1", "Store Tournament 2024 Jul.–Sep. Winner Pack"],
  ["P-151_P2", "Legend Pack 2024"],
  ["P-194_P2", "Digimon Story: Time Stranger - Collector's Edition"],
  ["P-245_P1", "Official Store Tournament 2026 Vol.4 (Winner)"],
  ["P-246_P1", "Official Store Tournament 2026 Vol.4 (Winner)"],
  ["P-247_P1", "Official Store Tournament 2026 Vol.4 (Winner)"],
  ["P-248_P1", "Official Store Tournament 2026 Vol.4 (Winner)"],
  ["P-249_P1", "Official Store Tournament 2026 Vol.4 (Winner)"],
  ["P-250_P1", "Official Store Tournament 2026 Vol.4 (Winner)"],
  ["RB1-006_P1", "2024 Evolution Cup August 2024 Wave 2 (Participation)"],
  ["RB1-006_P2", "2024 Evolution Cup August 2024 Wave 2 (Top 4)"],
  ["RB1-032_P4", "AD-01: ADVANCED BOOSTER DIGIMON GENERATION"],
  ["ST13-08_P1", "AD-01: ADVANCED BOOSTER DIGIMON GENERATION"],
  ["ST14-02_P0", "Beelzemon Cup Participation Pack"],
  ["ST20-01_P1", "ST-20 & ST-21: Welcome Tamers Pack"],
  ["ST24-04_P2", "ST-24: STARTER DECK DIGIMON DATA SQUAD"],
  ["ST7-05_P0", "DC-1 2022 Grand Prix Stamp"],
  ["ST7-08_P0", "DC-1 2022 Grand Prix Stamp"],
  ["ST7-11_P0", "DC-1 2022 Grand Prix Stamp"],
  ["ST8-08_P1", "Championship Finals 2024 Trophy Cards"],
]);

function unlistedEnglishPrintings(card) {
  return [...UNLISTED_ENGLISH_PRINTINGS]
    .filter(([id]) => id.startsWith(`${card.cardNumber}_P`))
    .map(([id, note]) => ({ id, note }));
}

/**
 * Source-declared or allowlisted English printing IDs belonging to this canonical card; a
 * source entry wins over an allowlisted one. An errata printing (`_P1-Errata`) keeps its
 * plain art ID and its own image, whose pre-errata image is the client's fallback.
 */
export function sourceCardArts(card) {
  const seen = new Set();
  return [...(Array.isArray(card.AAs) ? card.AAs : []), ...unlistedEnglishPrintings(card)]
    .flatMap((art) => {
      if (typeof art.id !== "string" || !art.id.startsWith(card.cardNumber)) return [];
      const printing = art.id.slice(card.cardNumber.length).match(/^_P(\d+)(?:-Errata)?$/);
      if (!printing) return [];
      const artId = `${card.cardNumber}_P${printing[1]}`;
      if (seen.has(artId)) return [];
      seen.add(artId);
      return [{ artId, imageId: art.id, label: art.note || art.type || "Alternate art" }];
    })
    .sort((a, b) => a.artId.localeCompare(b.artId, "en", { numeric: true }));
}
