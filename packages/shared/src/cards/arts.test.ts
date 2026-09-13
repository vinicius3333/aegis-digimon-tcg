import { describe, expect, it } from "vitest";
import { getCardArts, resolveCardArt } from "./arts.js";
import { cardImageUrls } from "./images.js";

describe("alternate printing catalog", () => {
  it("keeps original art first and includes source-declared alternate printings", () => {
    const arts = getCardArts("BT1-010");
    expect(arts[0]?.artId).toBe("BT1-010");
    expect(arts.map((art) => art.artId)).toContain("BT1-010_P1");
    expect(new Set(arts.map((art) => art.artId)).size).toBe(arts.length);
  });
  it("resolves artwork separately from canonical card identity", () => {
    expect(resolveCardArt("BT1-010", "BT1-010_P1").imageId).toBe("BT1-010_P1");
    expect(cardImageUrls("BT1-010", "BT1-010_P1")[0]).toContain("/BT1-010_P1.webp");
  });
  it("falls back for missing, unknown, or another card's art and hides concealed cards", () => {
    for (const artId of [undefined, "BT1-010_P999", "BT1-011_P1"]) {
      expect(resolveCardArt("BT1-010", artId).artId).toBe("BT1-010");
    }
    expect(cardImageUrls(undefined, "BT1-010_P1")).toEqual([]);
    expect(getCardArts("TOKEN-UNKNOWN")).toHaveLength(1);
  });
});

it.each(["__proto__", "constructor", "toString"])(
  "handles hostile unknown card ID %s without reading prototypes",
  (cardId) => {
    expect(getCardArts(cardId)).toEqual([{ artId: cardId, imageId: cardId, label: "Original art" }]);
    expect(resolveCardArt(cardId, "BT1-010_P1").artId).toBe(cardId);
  },
);
