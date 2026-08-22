import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-031.js";

describe("BT26-031 compiled fidelity", () => {
  it("encodes recovery, suspension restriction, and the attacking recovery window", () => {
    const card = getCompiledCard("BT26-031");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "RecoverByTrashingMostSecurity", recover: false },
      { kind: "SelectBind", condition: { kind: "ifThisEffectActed" } },
      { kind: "Restrict", restriction: "suspend", condition: { kind: "ifThisEffectActed" } },
      { kind: "trashBottomFaceDownUnderTamer" },
      { kind: "Recover", amount: 1, condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(card?.effects?.[1]?.actions).toMatchObject([
      { kind: "trashBottomFaceDownUnderTamer" },
      { kind: "Recover", amount: 1 },
    ]);
  });
});
