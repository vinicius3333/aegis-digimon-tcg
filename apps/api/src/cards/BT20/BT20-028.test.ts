import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-028.js";

describe("BT20-028 GigaSeadramon", () => {
  it("once per turn plays a level 5 or lower stack card only with the required name or trait", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", condition: { kind: "youHave", filter: { digivolutionStackNameOrTrait: [{ tokens: ["MetalSeadramon"], match: "name" }, { tokens: ["X Antibody"], match: "trait" }] } }, actions: [{ kind: "PlayWithoutCost", target: { filter: { level: { max: 5 } }, from: ["digivolutionCards"] }, payCost: false, optional: true }] });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true }, actions: [{ kind: "DeDigivolve", amount: 2 }] }] });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(3);
  });
});
