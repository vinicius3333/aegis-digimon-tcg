import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-099.js";

describe("BT20-099 Singularity of Chaos", () => {
  it("encodes the ACCEL play reduction directly", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 4, optional: true },
        { kind: "PlaceUnder", position: "bottom", underFilter: { controller: "mine", kind: ["Digimon"] } },
      ],
    });
    expect(main?.actions.some((action) => action.kind === "Replacement")).toBe(false);
    expect(main?.actions[1]?.optional).not.toBe(true);
  });

  it("keeps the color waiver scoped to Chaosmon or ACCEL", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: {
              nameOrTrait: [
                { tokens: ["Chaosmon"], match: "name" },
                { tokens: ["ACCEL"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
  });

  it("marks the printed Security memory-and-hand effect as Security-resident", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "GainMemory", amount: 1 }, { kind: "AddToHandSelf" }],
    });
  });
});
