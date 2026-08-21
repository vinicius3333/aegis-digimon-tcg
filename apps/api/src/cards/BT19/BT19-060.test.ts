import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-060 Strikedramon", () => {
  it("preserves the one-Tamer Ryo Akiyama play gate and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-060");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [{
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Ryo Akiyama"], match: "name" }] }, count: 1 },
          from: ["hand"],
          payCost: false,
          condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
          optional: true,
        }],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] },
    ]);
  });
});
