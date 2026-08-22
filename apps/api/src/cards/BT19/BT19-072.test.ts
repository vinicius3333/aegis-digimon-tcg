import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-072.js";

describe("BT19-072", () => {
  it("preserves trash play on both evolution timings and once-per-turn Royal Knight redirect", () => {
    const card = runtimeCompiledCard("BT19-072");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
      })),
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [
          { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
        ],
      },
    ]);
  });
});
