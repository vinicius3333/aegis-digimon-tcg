import { describe, expect, it } from "vitest";
import compiled from "./EX10-013.js";

describe("EX10-013 Lucemon compiled contract", () => {
  it("preserves Blocker, breeding move, exact five-card cost, and legal optional Chaos Mode digivolve", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [expect.objectContaining({ keyword: "Blocker" })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          isBreeding: true,
          actions: [expect.objectContaining({ kind: "MovePermanent", direction: "toBattle", optional: true })],
        }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          actions: [
            expect.objectContaining({
              kind: "Digivolve",
              from: ["trash"],
              payCost: false,
              optional: true,
              cost: expect.objectContaining({
                kind: "return",
                target: { filter: { controller: "mine", zone: "trash", textContains: "Lucemon" }, count: 5 },
                to: "deckBottom",
              }),
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Cupimon"], cost: 5, level: 2, isAlternate: true }]);
  });
});
