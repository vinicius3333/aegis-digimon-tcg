import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-031 Starmons", () => {
  it("places each available Starmons and Pickmons from trash under the played ShootingStarmon", () => {
    const compiled = runtimeCompiledCard("BT19-031");
    const deletion = compiled?.effects.find((effect) => effect.trigger === "OnDeletion");
    const placements = deletion?.actions.filter((action) => action.kind === "PlaceUnder");

    expect(placements).toHaveLength(2);
    expect(placements?.map((action) => action.target.filter?.zone)).toEqual(["trash", "trash"]);
    expect(placements?.map((action) => action.target.filter?.nameOrTrait?.[0]?.tokens)).toEqual([
      ["Starmons"],
      ["Pickmons"],
    ]);
    expect(placements?.every((action) => action.position === "bottom")).toBe(true);
  });
});
