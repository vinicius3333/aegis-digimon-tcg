import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { definitionMatches } from "./interpreter.js";

describe("definition keyword matching", () => {
  it("distinguishes declaring Digi-Burst from referring to another Digimon's Digi-Burst", () => {
    const declaresDigiBurst = getCardDefinition("BT4-054")!;
    const onlyRefersToDigiBurst = getCardDefinition("BT4-052")!;

    expect(definitionMatches({ keywords: ["DigiBurst"] }, declaresDigiBurst)).toBe(true);
    expect(definitionMatches({ keywords: ["DigiBurst"] }, onlyRefersToDigiBurst)).toBe(false);
  });

  it("matches a keyword printed on the main card, not one present only in inherited text", () => {
    const mainBlocker = getCardDefinition("BT20-047")!;
    const inheritedBlockerReference = getCardDefinition("BT1-079")!;

    expect(definitionMatches({ keywords: ["Blocker"] }, mainBlocker)).toBe(true);
    expect(definitionMatches({ keywords: ["Blocker"] }, inheritedBlockerReference)).toBe(false);
  });

  it("matches a printed ＜Blocker＞ compiled as a Static self GainKeyword (Discord bug 1555252641649393796)", () => {
    const matched = ["ST3-07", "BT22-041", "BT23-056", "EX10-029"].filter((cardId) =>
      definitionMatches({ keywords: ["Blocker"] }, getCardDefinition(cardId)!),
    );
    expect(matched).toEqual(["ST3-07", "BT22-041", "BT23-056", "EX10-029"]);
  });

  it("ignores a keyword that only a link effect grants", () => {
    expect(definitionMatches({ keywords: ["Collision"] }, getCardDefinition("BT25-100")!)).toBe(false);
  });
});
