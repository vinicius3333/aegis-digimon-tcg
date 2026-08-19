import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-039.js";

describe("BT23-039 Perorimon", () => {
  it("reveals three cards and adds one Appmon plus one Game/Invincible App Name card", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Game", "Invincible (App Name)"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
      ],
    });
  });
});
