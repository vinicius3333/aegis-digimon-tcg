import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-069.js";

describe("BT26-069 Dobermon", () => {
  it("models hand-trash draw, hand-trash deletion cost, and inherited Titan evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 } }] }] }),
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Delete", cost: { kind: "trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } }, target: { filter: { controller: "any", kind: ["Digimon"] } } })] }),
      expect.objectContaining({ trigger: "WhenDigivolving" }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenHandTrashed", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Digivolve", from: ["trash"], payCost: true, costDelta: -1, optional: true })] }] }),
    ]));
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });
});
