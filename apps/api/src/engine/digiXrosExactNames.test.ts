import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { materialsSatisfyRecipe } from "./actions/digiXros.js";
import { digiXrosMatches } from "./combat/keywords.js";
import { universalNameAliasesFor } from "./effects/interpreter.js";

describe("exact names in DigiXros recipes", () => {
  it("accepts the printed name but rejects a name-containing variant", () => {
    const greymon = getCardDefinition("BT10-019");
    const greymonX = getCardDefinition("BT9-012");
    expect(greymon).toBeDefined();
    expect(greymonX).toBeDefined();

    const slot = { names: ["Greymon"] };
    expect(materialsSatisfyRecipe([greymon!], [slot])).toBe(true);
    expect(materialsSatisfyRecipe([greymonX!], [slot])).toBe(false);
  });

  it("uses the same exact-name contract for Material Save eligibility", () => {
    expect(digiXrosMatches("BT10-024", "BT10-019")).toBe(true);
    expect(digiXrosMatches("BT10-024", "BT9-012")).toBe(false);
  });

  it("exposes unconditional Rule name aliases while the card is outside the battle area", () => {
    expect(universalNameAliasesFor("BT10-061")).toEqual(["SkullKnightmon", "DeadlyAxemon"]);
  });

  it("matches a token contained within a compound trait", () => {
    const rockDragon = getCardDefinition("EX3-005");
    const dragonkin = getCardDefinition("EX3-008");
    expect(rockDragon).toBeDefined();
    expect(dragonkin).toBeDefined();

    const slot = { traitContains: ["Dragon", "saur", "Ceratopsian"] };
    expect(materialsSatisfyRecipe([rockDragon!], [slot])).toBe(true);
    expect(materialsSatisfyRecipe([dragonkin!], [slot])).toBe(true);
  });

  it("enforces distinct printed names independently of card numbers", () => {
    const vorvomon = getCardDefinition("EX3-005")!;
    const flarerizamon = getCardDefinition("EX3-006")!;
    const slot = { traitContains: ["Dragon"], differentNames: true };

    expect(materialsSatisfyRecipe([vorvomon, flarerizamon], [slot])).toBe(true);
    expect(materialsSatisfyRecipe([vorvomon, vorvomon], [slot])).toBe(false);
  });
});
