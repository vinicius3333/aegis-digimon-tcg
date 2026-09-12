import { describe, expect, it } from "vitest";
import { effectiveStaticNames, nameIncludesToken } from "./effectiveNames.js";
import { allCards, getCardDefinition } from "./registry.js";

describe("effectiveStaticNames", () => {
  it("includes Crossroad Witch's printed Shuu Yulin identity (Q5674)", () => {
    expect(effectiveStaticNames(getCardDefinition("BT24-086")!)).toEqual(["The Crossroad Witch", "Shuu Yulin"]);
  });

  it.each([
    ["EX12-041", ["Thundermon", "Mamemon"]],
    ["BT15-012", ["Shoutmon", "Ballistamon"]],
    ["EX5-030", ["Leomon"]],
    ["P-141", ["Mamemon", "Tyrannomon"]],
  ])("parses the bracketed [Rule] Name alias on %s in every zone", (cardId, aliases) => {
    expect(effectiveStaticNames(getCardDefinition(cardId)!)).toEqual(expect.arrayContaining(aliases));
  });

  it.each(["BT21-021", "BT21-027", "BT19-012"])(
    "excludes DigiXros-only names from ordinary identity gates on %s",
    (cardId) => {
      const definition = getCardDefinition(cardId)!;
      expect(effectiveStaticNames(definition)).toEqual([definition.nameEn]);
    },
  );

  it("keeps the parenthesised (Rule) Name form", () => {
    const parenthesised = getCardDefinition("BT15-060");
    expect(parenthesised).toBeDefined();
    expect(effectiveStaticNames(parenthesised!)).toEqual([parenthesised!.nameEn]);
  });
});

describe("standardized English name substrings", () => {
  const exclusions = [
    ["Pagumon", "Agumon"],
    ["DemiVeemon", "Vee"],
    ["DemiVeemon", "Veemon"],
    ["KendoGarurumon", "Garurumon"],
    ["BurningGreymon", "Greymon"],
    ["DoruGreymon", "Greymon"],
    ["DexDoruGreymon", "Greymon"],
    ["Indramon", "Dramon"],
    ["BeelStarmon", "Starmon"],
    ["BeelStarmon (X Antibody)", "Starmon"],
    ["Blimpmon", "Impmon"],
    ["MasterBlimpmon", "Impmon"],
  ];
  it.each(exclusions)("excludes %s from the %s gate for every committed printing", (name, token) => {
    const printings = allCards().filter((card) => card.nameEn === name);
    expect(printings.length).toBeGreaterThan(0);
    expect(printings.map((card) => nameIncludesToken(card.nameEn, token))).toEqual(printings.map(() => false));
    expect(printings.map((card) => nameIncludesToken(card.nameEn, card.nameEn))).toEqual(printings.map(() => true));
  });
  it.each(["Agumon", "Vee", "Veemon", "Garurumon", "Greymon", "Dramon", "Starmon", "Impmon"])(
    "retains ordinary matching for %s",
    (token) => {
      expect(nameIncludesToken(token, token)).toBe(true);
      expect(nameIncludesToken(`Mega${token}`, token)).toBe(true);
    },
  );
  it("normalizes case and punctuation without dropping full identity", () => {
    expect(nameIncludesToken("BEELSTARMON (X ANTIBODY)", "STARmon")).toBe(false);
    expect(nameIncludesToken("Beelstarmon X Antibody", "BeelStarmon (X Antibody)")).toBe(true);
    expect(nameIncludesToken("DemiVeemon", " ")).toBe(false);
  });
});
