import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-071.js";

describe("BT23-071 Dullahamon", () => {
  it("declares Piercing, Security Attack +1, and Execute", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((k) => k.keyword)),
    ).toEqual(["Piercing", "SecurityAttack", "Execute"]);
  });

  it("deletes the opponent's highest-level Digimon, otherwise gives itself +5000", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestLevel" } },
    });
    expect(actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 5000,
      duration: "forTheTurn",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });

  it("may play a level 6 or lower Ghost Digimon from trash on deletion", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
        },
      },
    });
  });
});
