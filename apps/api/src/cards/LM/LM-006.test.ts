import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-006.js";

describe("LM-006 Cthyllamon", () => {
  it.each(["OnPlay", "WhenDigivolving"] as const)("trashes the bottom 3 cards then restricts every empty-stack opponent Digimon on %s", (trigger) => {
    const effect = runtimeCompiledCard("LM-006")!.effects.find((entry) => entry.trigger === trigger)!;
    expect(effect.actions).toEqual([
      expect.objectContaining({ kind: "TrashDigivolution", amount: 3, fromTop: false }),
      expect.objectContaining({ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: expect.objectContaining({ count: "all", filter: expect.objectContaining({ digivolutionCards: "none", controller: "opponent" }) }) }),
    ]);
  });
});
