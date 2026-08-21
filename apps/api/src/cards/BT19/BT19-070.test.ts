import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-070.js";

describe("BT19-070", () => {
  it("preserves the level-by-level deletion sequence, Machinedramon branch, and inherited Security Attack", () => {
    const card = runtimeCompiledCard("BT19-070");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } }, cost: { kind: "deleteOwn" } },
          { kind: "Delete", target: { filter: { controller: "opponent", levels: [4] } } },
          { kind: "Delete", target: { filter: { controller: "opponent", levels: [5] } } },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [
          { kind: "PlayWithoutCost", from: ["trash"], payCost: false, cost: { kind: "deleteOwn" }, optional: true },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
    ]);
  });
});
