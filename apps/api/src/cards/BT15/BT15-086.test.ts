import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-086.js";

describe("BT15-086", () => {
  it("plays itself from security, gains memory by trashing a Machine/Cyborg/SoC card, and Mind Links to a matching Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" }, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }] });
  });
  it("grants inherited Jamming/Blocker and can play Marvin Jackson from its stack", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura" }, { kind: "Aura" }] });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "EndOfAllTurns", isInherited: true, actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false, optional: true }] });
  });
});
