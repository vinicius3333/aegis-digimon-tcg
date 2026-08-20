import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-074.js";

describe("EX7-074", () => {
  it("waives its color requirement if you have a LIBERATOR Digimon or Tamer", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", optional: true, condition: { kind: "youHave" } }));
  it("reveals 3 for a LIBERATOR card and may digivolve from hand with cost reduced by 4", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 3 }, { kind: "Digivolve", from: ["hand"], reduceCost: 4, optional: true }]));
  it("plays a low-cost LIBERATOR card from security and adds itself to hand", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([{ kind: "PlayWithoutCost", payCost: false }, { kind: "AddToHandSelf" }]));
});
