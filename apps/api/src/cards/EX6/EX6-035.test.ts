import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-035.js";

describe("EX6-035 Cherubimon", () => {
  it("has Blast Digivolve and Alliance and plays a level 4 or lower yellow/green Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe("BlastDigivolve");
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { colors: ["Yellow", "Green"], levelComparison: { op: "lte", value: 4 } } } });
  });
  it("reduces an opposing Digimon by 4000 per other allied Digimon on play and digivolving", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "ModifyDP", amount: -4000, optional: true, scaling: { per: 1, unit: "cards", filter: { excludeSelf: true } } }));
});
