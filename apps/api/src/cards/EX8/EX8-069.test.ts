import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-069.js";

describe("EX8-069", () => {
  it("waives its color requirement with no face-up security cards and grants all NSp Digimon Alliance", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Alliance" }, target: { count: "all" }, duration: "permanent" });
  });
  it("takes the bottom security card to hand, places itself face-up at the bottom, and plays an NSp Digimon from hand in security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }));
});
