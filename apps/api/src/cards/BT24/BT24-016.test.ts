import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-016.js";

describe("BT24-016 Lamiamon", () => {
  it("uses the Dimetromon placement cost to digivolve an Elizamon host", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main")?.actions?.[0] as any;
    expect(main).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
    });
    expect(main.cost).toMatchObject({ kind: "place", bindHostAs: "bt24_016_elizamon", position: "bottom" });
    expect(main.cost.target.filter.nameOrTrait).toEqual([{ tokens: ["Dimetromon"], match: "name" }]);
    expect(main.target.fromSelectionRef).toBe("bt24_016_elizamon");
  });

  it("shares the once-per-turn opponent security manipulation", () => {
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving") as any;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking") as any;
    expect(digivolving.sharedUseKey).toBe(attacking.sharedUseKey);
    expect(digivolving.frequency).toBe("OncePerTurn");
    expect(digivolving.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "addBottom", controller: "opponent", source: "hand" },
      { kind: "SecurityManipulation", op: "trashTop", controller: "opponent" },
    ]);
  });
});
