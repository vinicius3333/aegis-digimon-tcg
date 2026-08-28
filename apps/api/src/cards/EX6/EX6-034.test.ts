import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-034.js";

describe("EX6-034 Antylamon", () => {
  it("has Alliance and plays a level 3 yellow or green Digimon on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Yellow", "Green"], levels: [3] } },
    });
  });
  it("inherits once-per-turn Beast revival by returning another suspended Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          cost: { kind: "return", target: { filter: { excludeSelf: true, suspended: true } } },
        },
      ],
    }));
});
