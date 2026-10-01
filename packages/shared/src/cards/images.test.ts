import { describe, expect, it } from "vitest";
import { cardImageUrls } from "./images.js";
import { tokenDefinitions } from "./tokens.js";

const GITHUB_BASE = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";

describe("preview card art", () => {
  it("uses published art for EX13 and the P-245 through P-250 wave", () => {
    const ids = [
      ...Array.from({ length: 77 }, (_, index) => `EX13-${String(index + 1).padStart(3, "0")}`),
      ...Array.from({ length: 6 }, (_, index) => `P-${245 + index}`),
    ];
    for (const id of ids) {
      expect(cardImageUrls(id)[0]).toBe(`${GITHUB_BASE}/${id}.webp`);
    }
  });

  it("keeps the external providers for cards outside the staged preview wave", () => {
    expect(cardImageUrls("EX12-001")[0]).toContain("raw.githubusercontent.com");
    expect(cardImageUrls("EX13-072")[0]).toContain("raw.githubusercontent.com");
  });
});

describe("alternate art provider fallback", () => {
  it("tries selected art providers before the original printing providers", () => {
    const urls = cardImageUrls("BT1-010", "BT1-010_P1");
    expect(urls.map((url) => url.split("/").at(-1))).toEqual([
      "BT1-010_P1.webp",
      "BT1-010_P1-Sample.webp",
      "BT1-010.webp",
      "BT1-010-Sample.webp",
    ]);
  });
  it("does not duplicate the original fallback for default or invalid choices", () => {
    expect(cardImageUrls("BT1-010", "BT1-010_P999")).toEqual(cardImageUrls("BT1-010"));
  });
});

describe("unpublished printings", () => {
  it("falls back to the bundled scan after the upstream image", () => {
    const urls = cardImageUrls("BT22-063", "BT22-063_P2");
    expect(urls.slice(0, 3)).toEqual([
      `${GITHUB_BASE}/BT22-063_P2.webp`,
      "/cards/unpublished/BT22-063_P2.webp",
      `${GITHUB_BASE}/BT22-063_P2-Sample.webp`,
    ]);
  });

  it("covers a base printing the upstream set lacks", () => {
    expect(cardImageUrls("P-147")).toContain("/cards/unpublished/P-147.webp");
  });
});

describe("errata printings", () => {
  it("tries the errata art before the pre-errata art", () => {
    const urls = cardImageUrls("BT16-077");
    expect(urls.map((url) => url.split("/").at(-1))).toEqual([
      "BT16-077-Errata.webp",
      "BT16-077-Errata-Sample.webp",
      "BT16-077.webp",
      "BT16-077-Sample.webp",
    ]);
  });
});

describe("token art", () => {
  it("serves the bundled official art instead of the upstream card set", () => {
    expect(cardImageUrls("TOKEN-Fujitsumon-Token")).toEqual(["/cards/tokens/TOKEN-Fujitsumon-Token.webp"]);
  });

  it("folds accents and ampersands out of the file name", () => {
    expect(cardImageUrls("TOKEN-Volée-&-Zerdrücken")).toEqual(["/cards/tokens/TOKEN-Volee-Zerdrucken.webp"]);
  });

  it("points every token at the bundled token folder", () => {
    for (const token of tokenDefinitions) {
      expect(cardImageUrls(token.cardId)).toEqual([expect.stringMatching(/^\/cards\/tokens\/TOKEN-[\w-]+\.webp$/)]);
    }
  });
});
