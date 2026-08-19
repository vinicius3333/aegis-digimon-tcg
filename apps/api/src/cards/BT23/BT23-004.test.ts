import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-004.js";

describe("BT23-004 DemiMeramon", () => {
  it("grants Blocker and Retaliation to one Ghost Digimon until opponent's turn ends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion");

    expect(effect).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(effect?.actions).toHaveLength(2);
    expect(effect?.actions).toEqual([
      {
        kind: "GainKeyword",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
          },
          count: 1,
        },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "GainKeyword",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
          },
          count: 1,
        },
        keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" },
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });
});
