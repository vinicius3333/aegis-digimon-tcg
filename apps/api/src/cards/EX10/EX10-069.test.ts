import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-069.js";

describe("EX10-069 Unique Emblem: Gravel Hearts", () => {
  it("makes the Main effect's placement of this card mandatory", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main")!;
    expect(main.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("requires both Mineral and LIBERATOR traits for the Delay digivolution", () => {
    const digivolve = compiled.effects.find((entry) => entry.trigger === "YourTurn")!.actions[1]!;
    expect(digivolve).toMatchObject({
      kind: "Digivolve",
      reduceCost: 3,
      from: ["hand"],
      into: { traits: ["Mineral", "LIBERATOR"] },
    });
  });
});
