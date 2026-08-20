import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-062.js";

describe("EX8-062", () => {
  it("has Blast Digivolve and gives four opposing Digimon -2000 DP on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toHaveLength(4);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" });
  });
  it("has the all-turns deletion response that may play an NSo Digimon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ sourceFilter: { controllerDefault: "both", excludeSelf: true }, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] });
  });
});
