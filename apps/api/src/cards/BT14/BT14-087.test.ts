import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-087.js";

describe("BT14-087", () => {
  it("grants memory, Mind Link, and inherited Alliance/Blocker", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura" }, { kind: "Aura" }] });
  });

  it("plays Eiji from its digivolution cards and plays itself from security", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfAllTurns", isInherited: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
});
