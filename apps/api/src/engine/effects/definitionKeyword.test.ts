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

  it("matches keywords printed outside any timing window, declared at the card root (Discord bug 1555252641649393796)", () => {
    const rootDeclared = [
      ["LM-066", "Blocker"],
      ["LM-066", "Piercing"],
      ["LM-066", "Vortex"],
      ["BT26-043", "Blocker"],
      ["BT26-060", "Blocker"],
      ["BT26-060", "SecurityAttack"],
      ["BT26-085", "Blocker"],
      ["BT26-103", "Blocker"],
      ["BT26-083", "Rush"],
      ["LM-068", "SecurityAttack"],
    ] as const;
    const unmatched = rootDeclared.filter(
      ([cardId, keyword]) => !definitionMatches({ keywords: [keyword] }, getCardDefinition(cardId)!),
    );
    expect(unmatched).toEqual([]);
  });

  it("matches Royal Knights whose printed ＜Blocker＞ is a Static declaration (Discord bug 1555252641649393796)", () => {
    const royalKnights = ["BT13-019", "BT13-077", "BT3-075"];
    const matched = royalKnights.filter((cardId) =>
      definitionMatches({ keywords: ["Blocker"] }, getCardDefinition(cardId)!),
    );
    expect(matched).toEqual(royalKnights);
  });

  it("ignores a keyword that only a link effect grants", () => {
    expect(definitionMatches({ keywords: ["Collision"] }, getCardDefinition("BT25-100")!)).toBe(false);
  });
});
