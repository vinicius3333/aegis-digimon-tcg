import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-102.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and complete Security clause while exposing the mixed placement seam", () => {
    const card = getCompiledCard("BT26-102");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "PlaceUnder", mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true }, trackCount: "sevenCodeMaterials" }, { kind: "Digivolve", ignoreRequirements: true, payCost: false, condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 } }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false }, { kind: "AddToHandSelf" }]);
  });
});
