import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-043.js";

describe("EX10-043 Sakusimon", () => {
  it("proves level-3 deletion and host-scoped link-trash memory", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 } }],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenLinkTrashed",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
    });
  });
});
