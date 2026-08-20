import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-057.js";

describe("BT13-057 Rosemon", () => {
  it("suspends only unsuspended opponent permanents for both clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Unsuspend", cost: expect.objectContaining({ kind: "suspend", target: expect.objectContaining({ filter: expect.objectContaining({ unsuspended: true }) }) }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended", actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ filter: expect.objectContaining({ unsuspended: true }) }) })] })] });
  });
});
