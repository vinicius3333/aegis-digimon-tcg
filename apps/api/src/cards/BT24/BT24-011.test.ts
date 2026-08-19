import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-011.js";

describe("BT24-011 Cyclonemon", () => {
  it("grants Rush and Raid as printed", () => {
    const staticKeywords = compiled.effects
      .filter((effect) => !effect.isInherited)
      .flatMap((effect) => effect.keywords ?? []);
    expect(staticKeywords.map((keyword) => keyword.keyword)).toEqual(["Rush", "Raid"]);
  });

  it("grants inherited Raid and keeps the TS level-3 alternate requirement", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
    expect(compiled.digivolutionRequirement ?? []).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
  });
});
