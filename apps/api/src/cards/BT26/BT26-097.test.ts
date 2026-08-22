import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-097.js";

describe("BT26-097 compiled fidelity", () => {
  it("encodes the live security surcharge, permanent placement cost, authorized free evolution, and gated tail", () => {
    const card = getCompiledCard("BT26-097");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Static")?.actions).toMatchObject([
      { kind: "CostModifier", costType: "use", handResident: true, amount: 1, scaling: { unit: "security", per: 1 } },
    ]);
    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({ kind: "PlaceUnder", targetIsPermanent: true, position: "bottom" });
    expect(main[1]).toMatchObject({ kind: "Digivolve", from: ["hand", "trash"], payCost: false, ignoreRequirements: true, optional: true });
    expect(main[2]).toMatchObject({ kind: "PlaceUnder", position: "top", optional: true, condition: { kind: "ifThisEffectDigivolved" } });
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true },
      { kind: "AddToHandSelf" },
    ]);
  });
});
