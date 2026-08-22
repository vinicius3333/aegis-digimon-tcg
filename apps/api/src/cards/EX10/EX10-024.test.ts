import { describe, expect, it } from "vitest";
import compiled from "./EX10-024.js";

describe("EX10-024 Kabemon compiled contract", () => {
  it("records linked De-Digivolve, Security play, and both requirements", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "WhenAttacking", isLinked: true, actions: [expect.objectContaining({ kind: "DeDigivolve", amount: 1, cost: { kind: "trash", target: { filter: { controller: "mine", zone: "linked", isSelfRef: true }, count: 1 } })] }),
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }] }),
    ]));
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });
});
