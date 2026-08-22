import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-069.js";

describe("BT20-069 Punkmon", () => {
  it("trashes one hand card, then gives the same own Digimon Blocker and Retaliation", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } });
      expect(actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd", target: { count: 1 } });
      expect(actions[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Retaliation" }, duration: "untilOpponentTurnEnd", target: { count: 1, sameTarget: true } });
    }
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
