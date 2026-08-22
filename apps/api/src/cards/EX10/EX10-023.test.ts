import { describe, expect, it } from "vitest";
import compiled from "./EX10-023.js";

describe("EX10-023 Quartzmon compiled contract", () => {
  it("preserves Blast Digivolve, global suspension, shared deletion, and unsuspend lock", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] }),
      expect.objectContaining({ trigger: "OnPlay", actions: [{ kind: "Suspend", target: { count: "all" } }] }),
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend", target: { count: "all" } }] }),
      expect.objectContaining({ trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "EX10-023/suspended-delete" }),
      expect.objectContaining({ trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "EX10-023/suspended-delete" }),
      expect.objectContaining({ trigger: "AllTurns", actions: [{ kind: "Restrict", restriction: "unsuspend", duration: "untilEachTurnEnd" }] }),
    ]));
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Ryoma Mogami", "Astamon"], cost: 7, isAlternate: true }]);
  });
});
