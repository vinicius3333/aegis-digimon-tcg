import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-017.js";

describe("BT23-017 Betamon", () => {
  it("trashes a hand card before optionally returning a non-Digi-Egg CS card from trash", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Return",
      target: {
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon", "Tamer", "Option"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
        count: 1,
      },
      to: "hand",
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
