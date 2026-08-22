import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-098.js";

describe("BT26-098 compiled fidelity", () => {
  it("encodes the face-down Tamer payment, literal materials, free Rosemon evolution, and Security mode", () => {
    const card = getCompiledCard("BT26-098");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);

    const beforePayCost = card?.effects?.find((effect) => effect.trigger === "BeforePayCost")?.actions ?? [];
    expect(beforePayCost).toMatchObject([
      { kind: "CostModifier", costType: "use", mode: "reduce", amount: 2, handResident: true, cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" }, optional: true, abortOnDecline: true },
    ]);

    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom", bindHostAs: "lalamonHost" });
    expect(main[1]).toMatchObject({ kind: "PlaceUnder", position: "bottom", underSelectionRef: "lalamonHost" });
    expect(main[2]).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, optional: true });
    expect(main[3]).toMatchObject({ kind: "PlaceUnder", position: "top", optional: true, condition: { kind: "ifThisEffectDigivolved" } });

    const security = card?.effects?.find((effect) => effect.trigger === "Security")?.actions ?? [];
    expect(security).toMatchObject([
      { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
      { kind: "AddToHandSelf" },
    ]);
  });
});
