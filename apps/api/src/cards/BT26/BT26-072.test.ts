import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-072.js";

describe("BT26-072 Peckmon", () => {
  it("models both printed alternate costs and opponent-selected inherited discard", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [{ kind: "Modal", choose: 1, options: expect.arrayContaining([
        [expect.objectContaining({ kind: "Delete", cost: { kind: "trash" } })],
        [expect.objectContaining({ kind: "Delete", cost: { kind: "place", faceDown: true, position: "bottom", underFilter: { nameOrTrait: [{ tokens: ["Keenan Crier"], match: "name" }] } } })],
      ]) }] }),
      expect.objectContaining({ trigger: "WhenDigivolving" }),
      expect.objectContaining({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "Trash", chooser: "opponent" }] }),
    ]));
  });
});
