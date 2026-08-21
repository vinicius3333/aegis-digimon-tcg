import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-061.js";

describe("EX8-061", () => {
  it("has Scapegoat and once-per-turn attacks may play a level 4 or lower DS/Mollusk/Crustacean Digimon from trash with at least 1 memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Scapegoat",
      raw: "＜Scapegoat＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtLeast", value: 1 },
        },
      ],
    });
  });
  it("inherits an optional On Deletion play from trash with the same level and trait limits", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    }));
});
