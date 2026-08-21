import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-049 Gargomon", () => {
  it("plays only Henry Wong at one or fewer Tamers and inherits the correct suspension", () => {
    const card = runtimeCompiledCard("BT19-049");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Henry Wong"], match: "name" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
          optional: true,
        }],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        }],
      },
    ]);
  });
});
