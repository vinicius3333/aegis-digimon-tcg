import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-039.js";

describe("EX10-039 ChuuChuumon", () => {
  it("proves bottom placement to Bagra Army Digimon or Tamers, Save, and inherited Draw 1", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{
        kind: "PlaceUnder",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
          count: 1,
          from: ["hand", "trash"],
        },
        underFilter: {
          controller: "mine",
          or: [
            { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
            { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
          ],
        },
        position: "bottom",
        optional: true,
      }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", actions: [{ kind: "Draw", amount: 1 }] }],
    });
  });
});
