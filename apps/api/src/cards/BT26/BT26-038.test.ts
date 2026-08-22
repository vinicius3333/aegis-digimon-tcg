import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-038.js";
import "../index.js";
describe("BT26-038 Kuwagamon", () => {
  it("compiles the three suspend-and-buff windows", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 3).map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving", "OnMove"]);
    expect(compiled.effects[0]?.actions).toMatchObject([{ kind: "Suspend", optional: true }, { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }]);
  });
  it("preserves the inherited once-per-turn battle-won discounted digivolution", () => {
    expect(compiled.effects[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", payCost: true, costDelta: 1, optional: true }] }] });
  });
});
