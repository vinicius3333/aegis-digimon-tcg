import { describe, expect, it } from "vitest";
import { effectiveStaticNames } from "./effectiveNames.js";
import { getCardDefinition } from "./registry.js";

describe("effectiveStaticNames", () => {
  it.each([
    ["EX12-041", ["Thundermon", "Mamemon"]],
    ["BT15-012", ["Shoutmon", "Ballistamon"]],
    ["EX5-030", ["Leomon"]],
    ["P-141", ["Mamemon", "Tyrannomon"]],
  ])("parses the bracketed [Rule] Name alias on %s in every zone", (cardId, aliases) => {
    expect(effectiveStaticNames(getCardDefinition(cardId)!)).toEqual(expect.arrayContaining(aliases));
  });

  it("keeps the parenthesised (Rule) Name form", () => {
    const parenthesised = getCardDefinition("BT15-060");
    expect(parenthesised).toBeDefined();
    expect(effectiveStaticNames(parenthesised!)).toEqual([parenthesised!.nameEn]);
  });
});
