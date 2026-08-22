import { describe, expect, it } from "vitest";
import compiled from "./EX10-034.js";

describe("EX10-034 Blastmon compiled contract", () => {
  it("preserves keywords, gained attack, exact two-card cost, and DigiXros", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: expect.arrayContaining([{ keyword: "Collision" }, { keyword: "Fragment", amount: 3 }, { keyword: "Blocker" }]) }),
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" })] }),
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" })] }),
      expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn" }),
    ]));
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 }]);
  });
});
