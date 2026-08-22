import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-035.js";

describe("BT26-035 Morphomon", () => {
  it("models both suspend windows and the inherited battle-win evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [{ kind: "Suspend", optional: true, target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } }] }),
      expect.objectContaining({ trigger: "WhenMoving" }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", payCost: true, costDelta: -1, from: ["hand"], optional: true }] }] }),
    ]));
  });
});
