import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-030.js";

describe("EX11-030 ForgeBeemon", () => {
  it("preserves standard and Royal Base evolution, security, and inherited effects", () => {
    const compiled = runtimeCompiledCard("EX11-030")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, cost: 3, colors: ["Green", "Black"], isAlternate: true },
      { level: 3, traits: ["Royal Base"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OpponentsTurn", isSecurity: true }));
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(expect.objectContaining({
        trigger,
        actions: [
          expect.objectContaining({ kind: "SecurityManipulation", op: "toHand", amount: 1, toTop: true, faceDownOnly: true }),
          expect.objectContaining({ kind: "SecurityManipulation", op: "placeAsSecurity", faceUp: true, toTop: false, optional: true }),
        ],
      }));
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000 })] }));
  });
});
