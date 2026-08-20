import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-034.js";

describe("BT15-034", () => {
  it("moves one security card to hand or places a yellow Vaccine Digimon from hand as security", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", amount: 1, condition: { kind: "securityAtLeast", value: 3 }, optional: true });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], condition: { kind: "securityAtMost", value: 2 }, optional: true });
  });
  it("once per turn gives an opposing Digimon -2000 DP when security is removed", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "ModifyDP", amount: -2000 }] }] }));
});
