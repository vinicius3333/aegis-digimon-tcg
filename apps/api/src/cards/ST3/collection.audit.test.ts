import { describeLegacyStCollection } from "../legacy-st-collection-gate.js";
import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./index.js";

describeLegacyStCollection({
  set: "ST3",
  cards: [
    { cardId: "ST3-01", nameEn: "Tokomon" },
    { cardId: "ST3-02", nameEn: "Salamon" },
    { cardId: "ST3-03", nameEn: "Tapirmon" },
    { cardId: "ST3-04", nameEn: "Patamon" },
    { cardId: "ST3-05", nameEn: "Angemon" },
    { cardId: "ST3-06", nameEn: "Gatomon" },
    { cardId: "ST3-07", nameEn: "Unimon" },
    { cardId: "ST3-08", nameEn: "MagnaAngemon" },
    { cardId: "ST3-09", nameEn: "Angewomon" },
    { cardId: "ST3-10", nameEn: "Magnadramon" },
    { cardId: "ST3-11", nameEn: "Seraphimon" },
    { cardId: "ST3-12", nameEn: "T.K. Takaishi" },
    { cardId: "ST3-13", nameEn: "Heaven's Gate" },
    { cardId: "ST3-14", nameEn: "Heaven's Charm" },
    { cardId: "ST3-15", nameEn: "Holy Flame" },
    { cardId: "ST3-16", nameEn: "Seven Heavens" },
  ],
});

describe("ST3 catalog contract", () => {
  it("matches the printed stats and evolution requirements for every card", () => {
    const expected = [
      ["ST3-01", ["Yellow"], 2, -1, 0, []],
      ["ST3-02", ["Yellow"], 3, 2, 3000, [{ color: "Yellow", level: 2, memoryCost: 0 }]],
      ["ST3-03", ["Yellow"], 3, 3, 4000, [{ color: "Yellow", level: 2, memoryCost: 0 }]],
      ["ST3-04", ["Yellow"], 3, 3, 1000, [{ color: "Yellow", level: 2, memoryCost: 0 }]],
      ["ST3-05", ["Yellow"], 4, 5, 4000, [{ color: "Yellow", level: 3, memoryCost: 2 }]],
      ["ST3-06", ["Yellow"], 4, 4, 5000, [{ color: "Yellow", level: 3, memoryCost: 2 }]],
      ["ST3-07", ["Yellow"], 4, 5, 6000, [{ color: "Yellow", level: 3, memoryCost: 2 }]],
      ["ST3-08", ["Yellow"], 5, 7, 7000, [{ color: "Yellow", level: 4, memoryCost: 3 }]],
      ["ST3-09", ["Yellow"], 5, 6, 7000, [{ color: "Yellow", level: 4, memoryCost: 3 }]],
      ["ST3-10", ["Yellow"], 6, 10, 12000, [{ color: "Yellow", level: 5, memoryCost: 2 }]],
      ["ST3-11", ["Yellow"], 6, 12, 10000, [{ color: "Yellow", level: 5, memoryCost: 4 }]],
      ["ST3-12", ["Yellow"], undefined, 2, 0, []],
      ["ST3-13", ["Yellow"], undefined, 1, 0, []],
      ["ST3-14", ["Yellow"], undefined, 2, 0, []],
      ["ST3-15", ["Yellow"], undefined, 2, 0, []],
      ["ST3-16", ["Yellow"], undefined, 7, 0, []],
    ] as const;
    for (const [cardId, colors, level, playCost, dp, evoCosts] of expected) {
      const definition = getCardDefinition(cardId)!;
      expect(definition).toMatchObject({ cardId, colors, playCost, dp, evoCosts });
      expect(definition.level).toBe(level);
    }
  });
});
