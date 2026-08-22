import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-037.js";

describe("EX10-037 Impmon", () => {
  it("proves direct deck-trash deletion, top-deck trash, and inherited trash scaling", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2 }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 1000, scaling: { per: 10, unit: "trash" } }],
    });
  });
});
