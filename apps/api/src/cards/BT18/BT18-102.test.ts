import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-102.js";

describe("BT18-102 Susanoomon", () => {
  it("covers Blast Digivolve, both deletion timings, and the Hybrid stack rule", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 10000 } }, count: 1 } }, { kind: "CostModifier", costType: "dpDeletion", amount: 2000 }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete" }, { kind: "CostModifier", costType: "dpDeletion", amount: 2000 }] });
    expect(compiled.effects[4]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Hybrid"] }] });
  });

  it("places only Tamer sources into bottom security and trashes one opponent card per placement", () => {
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, source: { filter: { kind: ["Tamer"], zone: "digivolutionCards" }, count: 5, upTo: true } },
        { kind: "trashSecurityTop", scalingSource: "prevActionCount" },
      ],
    });
  });

  it("requires ten Hybrid cards and cannot use that path for Blast Digivolve", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      expect.objectContaining({ names: ["Takuya Kanbara", "Koji Minamoto"], cost: 6, requiredDigivolutionCardCount: { trait: "Hybrid", min: 10 }, incompatibleWithBlastDigivolve: true }),
    ]);
  });
});
