import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-070.js";

describe("BT17-070 Gulfmon", () => {
  it("uses the place-as-cost effect for both On Play and When Digivolving", () => {
    const effects = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: {
          filter: expect.objectContaining({ controller: "opponent", levelComparison: { op: "lte", value: 5 } }),
          count: 1,
        },
      });
      expect(effect.actions[0]!.cost).toMatchObject({
        kind: "place",
        target: expect.objectContaining({
          filter: expect.objectContaining({
            controller: "mine",
            levels: [5],
            nameOrTrait: [{ tokens: ["Dark Masters"], match: "text" }],
          }),
          from: ["hand", "trash"],
        }),
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      });
    }
  });

  it("returns exactly seven cards from the opponent's trash before unsuspending", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0];
    expect(action).toMatchObject({
      kind: "Unsuspend",
      cost: { kind: "return", target: { filter: { zone: "trash", controller: "opponent" }, count: 7 } },
    });
  });
});
