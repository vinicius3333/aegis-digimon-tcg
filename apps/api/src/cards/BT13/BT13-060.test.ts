import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-060.js";

describe("BT13-060 Rosemon: Burst Mode", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: expect.arrayContaining([expect.objectContaining({ kind: "Suspend" }), expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" })]) });
    expect(compiled.effects[0]?.actions.some((action) => action.kind === "Unsuspend")).toBe(false);
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "SecurityManipulation", op: "trashTop" })] });
  });

});
