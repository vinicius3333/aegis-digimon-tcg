import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-060.js";

describe("BT13-060 Rosemon: Burst Mode", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        expect.objectContaining({ kind: "Digivolve", into: { name: "Rosemon" }, payCost: false }),
        expect.objectContaining({
          kind: "Return",
          to: "hand",
          target: {
            filter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Yoshino Fujieda"] }] },
            count: 1,
          },
        }),
        expect.objectContaining({ kind: "TrashDigivolution", amount: 1, position: "top" }),
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { count: "all" },
        }),
      ],
    });
    expect(compiled.effects[0]?.actions.some((action) => action.kind === "Unsuspend")).toBe(false);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: {
            per: 2,
            unit: "cards",
            filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    });
  });
});
