import { describe, expect, it } from "vitest";
import { compiled as BT25_011 } from "./BT25-011.js";
import "../index.js";

describe("BT25-011 Aquilamon", () => {
  it("suspends one opponent Digimon, then conditionally offers Silphymon DNA", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_011.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "DnaDigivolve",
        optional: true,
        payCost: true,
        condition: { kind: "isYourTurn" },
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Silphymon"], match: "name" }] },
      });
    }
  });

  it("preserves Raid and inherited +2000 DP", () => {
    expect(BT25_011.effects?.some((entry) => entry.keywords?.[0]?.keyword === "Raid")).toBe(true);
    expect(BT25_011.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
