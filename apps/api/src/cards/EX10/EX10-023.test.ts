import { describe, expect, it } from "vitest";
import compiled from "./EX10-023.js";

describe("EX10-023 Quartzmon compiled contract", () => {
  it("preserves Blast Digivolve, global suspension, shared deletion, and unsuspend lock", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          frequency: "OncePerTurn",
          sharedUseKey: "EX10-023/suspended-delete",
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          sharedUseKey: "EX10-023/suspended-delete",
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({ kind: "Restrict", restriction: "unsuspend", duration: "untilEachTurnEnd" }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Ryoma Mogami", "Astamon"], cost: 7, isAlternate: true },
    ]);
  });
});
