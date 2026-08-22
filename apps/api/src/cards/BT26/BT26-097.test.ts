import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-097.js";
import "../index.js";

describe("BT26-097 compiled fidelity", () => {
  it("encodes the live security surcharge, permanent placement cost, authorized free evolution, and gated tail", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: { kind: ["Digimon", "Tamer"], playCostLte: 5, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Static")?.actions).toMatchObject([
      { kind: "CostModifier", costType: "use", handResident: true, amount: 1, scaling: { unit: "security", per: 1 } },
    ]);
    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({ kind: "PlaceUnder", targetIsPermanent: true, position: "bottom" });
    expect(main[1]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: false,
      ignoreRequirements: true,
      optional: true,
    });
    expect(main[2]).toMatchObject({
      kind: "PlaceUnder",
      position: "top",
      optional: true,
      condition: { kind: "ifThisEffectDigivolved" },
    });
    expect(card.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      scaling: { unit: "security", per: 1 },
    });
  });
});
