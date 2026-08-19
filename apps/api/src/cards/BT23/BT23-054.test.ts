import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-054.js";

describe("BT23-054 Magnamon", () => {
  it("declares Blocker and Armor Purge", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Armor Purge"]);
  });

  it("draws 1 and protects one Royal Knight or CS Digimon from opponent bounce on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "Restrict",
        restriction: "beReturned",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Knight", "CS"], match: "trait" }],
          },
          count: 1,
        },
      });
    }
  });
});
