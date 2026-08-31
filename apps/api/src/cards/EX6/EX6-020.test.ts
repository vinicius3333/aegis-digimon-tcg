import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-020.js";

describe("EX6-020 Gatomon", () => {
  it("reveals three for Angel-family/Fallen Angel and Mirei Mikagura cards on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { count: 1, to: "hand" },
          { count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      });
    }
  });
  it("inherits once-per-turn -2000 DP on attack", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    }));
});
