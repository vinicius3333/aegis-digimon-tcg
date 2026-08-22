import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-031.js";

describe("BT26-031 compiled fidelity", () => {
  it("encodes the Glowing Dawn waiver, recovery, Option DP sequence, and explicit most-security selector seam", () => {
    const card = getCompiledCard("BT26-031");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["The follow-up suspend lock still needs a proven payment/result seam after the most-security player choice; the executable most-security selector itself is now represented."]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "RecoverByTrashingMostSecurity", recover: false }, { kind: "SelectBind" }, { kind: "Restrict", restriction: "suspend" }]);
    expect(card?.effects?.[3]?.actions).toMatchObject([{ kind: "SelectBind" }, { kind: "ModifyDP", amount: -8000 }, { kind: "SecurityManipulation", op: "trashTop" }, { kind: "ModifyDP", amount: -5000 }]);
  });
});
