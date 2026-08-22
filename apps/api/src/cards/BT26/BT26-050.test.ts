import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-050.js";

describe("BT26-050 Rosemon: Burst Mode", () => {
  it("encodes DATA SQUAD color waiver, Q7052/Q7053 independent suspend/lock targets, security cost, and Option Main restrictions", () => {
    expect(compiled.effects?.[0]?.actions).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "WaiveColorRequirement" })]));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Return", to: "deckBottom" }, { kind: "SecurityManipulation", op: "trashTop" }] });
    expect(compiled.effects?.[3]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Restrict", restriction: "digivolve" }), expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" }),
    ]));
  });
});
