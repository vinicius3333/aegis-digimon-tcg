import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-028 Jellymon", () => {
  it("preserves Security Attack +1, Blocker, and unsuspend-for-Aqua/Sea Animal cost", () => {
    const card = runtimeCompiledCard("BT19-028");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
          {
            kind: "GainMemory",
            amount: 3,
            optional: false,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
                },
                count: 1,
              },
            },
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }] },
    ]);
  });
});
