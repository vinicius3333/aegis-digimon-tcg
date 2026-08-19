import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-100.js";

describe("BT22-100 Cyberspace EDEN", () => {
  it("waives its color requirement only while there are no face-up security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHaveNone",
        filter: { zone: "security", faceUp: true },
      },
    });
  });

  it("adds the bottom security card to hand, then places itself face up at the bottom", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
    ]);
  });

  it("grants the CS DP boost from Security and allows a free CS play", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
  });
});
