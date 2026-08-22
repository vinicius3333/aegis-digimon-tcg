import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-057.js";

describe("BT20-057 Gankoomon", () => {
  it("reduces its play cost by 4 when an own Huckmon, Jesmon, or Sistermon is present", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions.length > 0)).toMatchObject({ actions: [{ kind: "Replacement", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Replacement", mode: "reduceCost", amount: 4, condition: { kind: "youHave", filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Huckmon", "Jesmon", "Sistermon"], match: "name" }] } } }] }] });
  });

  it("has Reboot and Blocker", () => {
    expect(compiled.effects.filter((effect) => effect.keywords?.some((keyword) => ["Reboot", "Blocker"].includes(keyword.keyword)))).toHaveLength(2);
  });

  it("offers a free hand-or-trash digivolution into a level 6-or-lower named or Royal Knight Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{
          kind: "Digivolve",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          into: {
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [
              { tokens: ["Huckmon", "Jesmon", "Sistermon"], match: "name" },
              { tokens: ["Royal Knight"], match: "trait" },
            ],
          },
        }],
      });
    }
  });
});
