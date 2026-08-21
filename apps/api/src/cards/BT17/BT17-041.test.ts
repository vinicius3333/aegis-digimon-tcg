import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-041.js";

// A3 audit proof for ShineGreymon: Burst Mode.  The capability regression in
// cardCapabilities.test.ts proves usePaidCount; this test keeps every printed
// clause tied to the card's compiled definition.
describe("BT17-041 ShineGreymon: Burst Mode", () => {
  it("models Blast Digivolve, both play triggers, and paid Tamer scaling", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["ShineGreymon"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: expect.arrayContaining([
            expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], optional: true }),
            expect.objectContaining({
              kind: "ModifyDP",
              amount: -5000,
              scaling: expect.objectContaining({ per: 1, unit: "cards" }),
            }),
          ]),
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          actions: [
            expect.objectContaining({
              kind: "GainKeyword",
              cost: expect.objectContaining({ kind: "suspend", target: expect.objectContaining({ count: 2, upTo: true }) }),
              scaling: expect.objectContaining({ usePaidCount: true }),
            }),
          ],
        }),
      ]),
    );
  });
});
