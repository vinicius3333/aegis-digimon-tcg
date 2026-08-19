import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-074.js";

describe("BT22-074 SkullMeramon", () => {
  it("pays 3, deletes up to level 5, conditionally grants Security Attack, then may attack", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "payMemory", memory: 3 },
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
        count: 1,
      },
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
    expect(main?.actions[2]).toMatchObject({
      kind: "Attack",
      optional: true,
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("draws two and trashes one on deletion, with inherited trash play", () => {
    const deletion = compiled.effects.filter((entry) => entry.trigger === "OnDeletion");
    expect(deletion[0]?.actions).toMatchObject([
      { kind: "Draw", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" }],
        },
        count: 1,
      },
    });
  });
});
