import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-100.js";

describe("BT26-100 compiled fidelity", () => {
  it("encodes the no-face-up waiver, face-up security grants, security recycle, and two free-play modes", () => {
    const card = getCompiledCard("BT26-100");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "securityAtMost", value: 0 } }] });
    expect(card?.effects?.[1]).toMatchObject({ trigger: "Static", isSecurity: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" } }, { kind: "ModifyDP", amount: 3000 }] });
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "toHand", toTop: false }, { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true }, { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }]);
    expect(card?.effects?.[3]?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }]);
  });
});
