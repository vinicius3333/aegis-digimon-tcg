import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-101.js";

describe("BT15-101", () => {
  it("conditionally digivolves a Gabumon by paying 4 when Matt and an opposing 10000 DP Digimon exist", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Digivolve", from: ["hand"], payCost: true, costOverride: 4, ignoreRequirements: true, optional: true, condition: { kind: "allOf" } }] }));
  it("restricts three opposing Digimon/Tamers from suspending and unsuspends itself once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Restrict", target: { count: 3 }, restriction: "suspend", duration: "untilOpponentTurnEnd" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "Unsuspend", optional: true }] }] });
  });
});
