import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-059.js";

describe("BT13-059 Examon", () => {
  it("keeps DNA materials, same-target unsuspend restriction, and the once-per-turn modal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.dnaDigivolveRequirement).toContainEqual(expect.objectContaining({ cost: 4, materials: [{ names: ["Slayerdramon"] }, { names: ["Breakdramon"] }] }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: expect.arrayContaining([expect.objectContaining({ kind: "Suspend" })]) });
    const restriction = compiled.effects[0]?.actions.find(action => action.kind === "Restrict");
    expect(restriction).toMatchObject({ kind: "Restrict", restriction: "unsuspend", target: expect.objectContaining({ sameTarget: true }) });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended", actions: [expect.objectContaining({ kind: "Modal", choose: 1, optional: true })] })] });
  });
});
