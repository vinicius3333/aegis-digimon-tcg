import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-040.js";

describe("EX10-040 DemiDevimon", () => {
  it("proves conditional mill-then-memory sequencing and inherited once-per-turn mill", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashTopDeck", controller: "both", amount: 1 }],
    });
  });
});
