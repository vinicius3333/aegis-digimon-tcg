import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-029.js";

describe("BT26-029 compiled fidelity", () => {
  it("encodes Decode/Ascension, security-paid protection, both removal watchers, Angel rule trait, and inherited De-Digivolve", () => {
    const card = getCompiledCard("BT26-029");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["Decode", "Ascension"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "trashTop" }, { kind: "SelectBind" }, { kind: "Restrict", restriction: "dpImmune" }, { kind: "StackTrashLock" }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }] }]);
    expect(card?.effects?.[4]?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenSecurityRemoved" }, { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity" }]);
  });
});
