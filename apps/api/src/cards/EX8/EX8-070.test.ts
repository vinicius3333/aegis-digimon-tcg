import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-070.js";

describe("EX8-070", () => {
  it("selects a Mineral/Rock Digimon with digivolution cards and gives it Collision, Piercing, Reboot, +3000 DP, and return protection", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "SelectBind", optional: true, cost: { kind: "trash" } });
    expect(actions.slice(1).map((action) => action.kind)).toEqual([
      "GainKeyword",
      "GainKeyword",
      "GainKeyword",
      "Restrict",
      "ModifyDP",
    ]);
    expect(actions[4]).toMatchObject({
      kind: "Restrict",
      restriction: "cannotReturnToHandOrDeck",
      byOpponentOnly: true,
    });
    expect(actions[5]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" });
  });
  it("contains only the printed main effect", () => expect(compiled.effects).toHaveLength(1));
});
