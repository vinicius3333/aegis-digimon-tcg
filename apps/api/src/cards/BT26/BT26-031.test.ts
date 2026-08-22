import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-031.js";

describe("BT26-031 compiled fidelity", () => {
  it("encodes the Glowing Dawn waiver, recovery, Option DP sequence, and explicit most-security selector seam", () => {
    const card = getCompiledCard("BT26-031");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "RecoverByTrashingMostSecurity", recover: false }, { kind: "SelectBind", condition: { kind: "ifThisEffectActed" } }, { kind: "Restrict", restriction: "suspend", condition: { kind: "ifThisEffectActed" } }]);
    expect(card?.effects?.[3]?.actions).toMatchObject([{ kind: "SelectBind" }, { kind: "ModifyDP", amount: -8000 }, { kind: "SecurityManipulation", op: "trashTop" }, { kind: "ModifyDP", amount: -5000 }]);
  });
});
