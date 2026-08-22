import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-017.js";

describe("EX11-017 Skadimon", () => {
  it("shares one once-per-turn play effect across all three timings", () => {
    const compiled = runtimeCompiledCard("EX11-017")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
      });
    }
  });

  it("reacts to any other Digimon play or digivolution and restricts only a source-less opponent", () => {
    const compiled = runtimeCompiledCard("EX11-017")!;
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.frequency).toBe("OncePerTurn");
    expect(allTurns.actions).toEqual([
      expect.objectContaining({
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
        actions: [
          expect.objectContaining({ kind: "TrashDigivolution", amount: 3 }),
          expect.objectContaining({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd", target: expect.objectContaining({ filter: expect.objectContaining({ controller: "opponent", digivolutionCards: "none" }) }) }),
        ],
      }),
      expect.objectContaining({
        kind: "SubTrigger",
        event: "whenAnyDigivolves",
        sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
        actions: [
          expect.objectContaining({ kind: "TrashDigivolution", amount: 3 }),
          expect.objectContaining({ kind: "Restrict", restriction: "suspend" }),
        ],
      }),
    ]);
  });
});
