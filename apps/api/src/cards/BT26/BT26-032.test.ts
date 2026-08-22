import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-032.js";

describe("BT26-032 compiled fidelity", () => {
  it("encodes Alliance/Succession, suspended-Digimon DP reduction, suspend-paid play/use, Option mode, and the explicit turn-gate seam", () => {
    const card = getCompiledCard("BT26-032");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["Alliance", "Succession"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "ModifyDP", amount: -5000 }, { kind: "Suspend" }, { kind: "Modal", choose: 1, condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "isYourTurn" }] } }]);
    expect(card?.effects).toHaveLength(2);
    expect(card?.effects?.[1]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Vegetation"] }),
      expect.objectContaining({ kind: "WaiveColorRequirement" }),
    ]));
  });
});
