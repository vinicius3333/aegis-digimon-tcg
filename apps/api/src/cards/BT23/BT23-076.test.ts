import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-076.js";

describe("BT23-076 Sistermon Blanc", () => {
  it("adds the top security card to hand, then performs Recovery +1 from deck", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
      { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 },
    ]);
    expect(effect.keywords).toBeUndefined();
  });

  it("only reacts when this Sistermon Blanc suspends and offers the reduced digivolution", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(watcher.sourceFilter).toEqual({ isSelfRef: true });
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: true,
      reduceCost: 1,
      optional: true,
    });
  });
});
