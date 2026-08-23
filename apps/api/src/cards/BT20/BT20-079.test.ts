import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-079.js";

describe("BT20-079 Necromon", () => {
  it("has Security Attack +1 and Execute", () => {
    expect(
      compiled.effects
        .filter((effect) => effect.trigger === "Static")
        .flatMap((effect) => effect.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["SecurityAttack", "Execute"]);
  });

  it("deletes one opposing lowest-level Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "Delete");
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          },
        ],
      });
    }
  });

  it("may play one level 5 or lower Ghost Digimon from trash on play and deletion", () => {
    for (const trigger of ["OnPlay", "OnDeletion"] as const) {
      expect(
        compiled.effects.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "PlayWithoutCost"),
      ).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 5 },
                nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });
});
