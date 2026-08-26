import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-087.js";

describe("BT15-087", () => {
  it("uses compiled IR for its security, memory, and Mind Link clauses", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Security", isSecurity: true });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }] });
  });
  it("gives qualifying inherited hosts Teamwork and Reboot, then can play Shuu Yulin", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura" }, { kind: "Aura" }] });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "EndOfAllTurns", isInherited: true, actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }] });
  });
});
