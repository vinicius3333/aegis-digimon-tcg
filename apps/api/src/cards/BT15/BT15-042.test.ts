import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-042.js";

describe("BT15-042", () => {
  it("may trash security to give an opposing Digimon -9000 DP on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: -9000, cost: { kind: "trash" }, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "ModifyDP", amount: -9000 }] });
  });
  it("once per turn may place a yellow card from hand as security when security is removed", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"] }] }] }));
});
