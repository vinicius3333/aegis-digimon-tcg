import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-082.js";

describe("BT18-082 Lucemon: Chaos Mode", () => {
  it("covers opponent choice, recovery fallback, and once-per-turn replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", controller: "opponent", optional: true },
        { kind: "SecurityManipulation", op: "addTop", condition: { kind: "ifThisEffectDidNotDelete" } },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", frequency: "OncePerTurn" }],
    });
  });
});
