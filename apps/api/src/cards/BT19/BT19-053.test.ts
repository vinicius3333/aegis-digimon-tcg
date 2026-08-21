import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-053.js";

describe("BT19-053", () => {
  it("preserves Alliance, security Royal Base play, non-battle leave replacement, and Insectoid", () => {
    const card = runtimeCompiledCard("BT19-053");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Alliance" }] },
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["security"],
            payCost: true,
            reduceCostBy: 8,
            optional: true,
            target: { filter: { zone: "security", faceUp: true, nameOrTrait: [{ tokens: ["Royal Base"] }] } },
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            leaveCause: "otherThanBattle",
            actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", faceUp: true }],
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] },
    ]);
  });
});
