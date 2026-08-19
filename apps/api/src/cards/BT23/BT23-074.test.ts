import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-074.js";

describe("BT23-074 Eater Legion", () => {
  it("requires Mother Eater in the breeding area for both play windows", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "PlayMultiple",
        totalCost: 6,
        from: "hand",
        optional: true,
        condition: { kind: "youHave", filter: { zone: "breeding", kind: ["Digimon"] } },
      });
      expect(action.filter.nameOrTrait).toEqual([{ tokens: ["Eater"], match: "trait" }]);
    }
  });

  it("keeps Alliance and Reboot as continuous static keywords", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((k) => k.keyword)),
    ).toEqual(["Alliance", "Reboot"]);
  });
});
