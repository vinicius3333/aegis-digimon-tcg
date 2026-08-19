import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-049.js";

describe("BT23-049 Monodramon", () => {
  it("trashes one matching card from hand before drawing and gaining memory", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Dragonkin", "Cyborg", "Device", "CS"], match: "trait" }],
          },
          count: 1,
        },
      },
    });
    expect(actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });

  it("grants the inherited host +1000 DP permanently", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });
});
