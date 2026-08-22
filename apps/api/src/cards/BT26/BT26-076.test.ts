import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-076.js";

describe("BT26-076 Crowmon", () => {
  it("models the delete-plus-Tamer cost, both once-per-turn reactions, and inherited play", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [
        expect.objectContaining({ kind: "Delete", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }),
        expect.objectContaining({ kind: "Trash", chooser: "opponent", cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" } }),
      ] }),
      expect.objectContaining({ trigger: "YourTurn", actions: expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "whenHandTrashed", frequency: "OncePerTurn" }),
        expect.objectContaining({ kind: "SubTrigger", event: "whenDigivolutionTrashed", frequency: "OncePerTurn" }),
      ]) }),
      expect.objectContaining({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] }),
    ]));
  });
});
