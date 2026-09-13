import { describe, expect, it } from "vitest";
import { cardImageUrls } from "./images.js";

describe("preview card art", () => {
  it("uses same-origin art for EX13 and the P-245 through P-250 wave", () => {
    for (const id of ["EX13-001", "EX13-007", "EX13-071", "P-245", "P-250"]) {
      expect(cardImageUrls(id)[0]).toBe(`/cards/preview/${id}.webp`);
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
      "BT1-010_P1.webp", "BT1-010_P1-Sample.webp", "BT1-010.webp", "BT1-010-Sample.webp",
    ]);
  });
  it("does not duplicate the original fallback for default or invalid choices", () => {
    expect(cardImageUrls("BT1-010", "BT1-010_P999")).toEqual(cardImageUrls("BT1-010"));
  });
});
