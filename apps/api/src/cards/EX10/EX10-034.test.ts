import { describe, expect, it } from "vitest";
import compiled from "./EX10-034.js";

describe("EX10-034 Blastmon compiled contract", () => {
  it("preserves keywords, gained attack, exact two-card cost, and DigiXros", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            expect.objectContaining({ keyword: "Collision" }),
            expect.objectContaining({ keyword: "Fragment", amount: 3 }),
            expect.objectContaining({ keyword: "Blocker" }),
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "GainKeyword",
                  keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
                  cost: expect.objectContaining({
                    kind: "trash",
                    target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                  }),
                }),
              ]),
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 },
    ]);
  });
});
