import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-053.js";

describe("BT23-053 Strikedramon", () => {
  it("may digivolve from hand into Cyberdramon or a CS Digimon for 2 less when your Option enters the battle area", () => {
    const effect = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(effect).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionPlayed",
      sourceFilter: { controller: "mine", kind: ["Option"] },
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true, kind: ["Digimon"] }, isSelf: true },
          into: {
            nameOrTrait: [
              { tokens: ["Cyberdramon"], match: "name" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          optional: true,
        },
      ],
    });
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
