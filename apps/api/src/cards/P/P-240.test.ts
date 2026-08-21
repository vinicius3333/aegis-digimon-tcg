import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-240.js";

describe("P-240 Arcturusmon", () => {
  it("has Collision, Piercing, Reboot, and Blocker", () => {
    const keywords = runtimeCompiledCard("P-240")!
      .effects.filter((effect) => effect.trigger === "Static")
      .flatMap((effect) => effect.keywords ?? []);
    expect(keywords.map((keyword) => keyword.keyword)).toEqual(["Collision", "Piercing", "Reboot", "Blocker"]);
  });

  it("de-digivolves on play and when digivolving, then uses two qualifying trash cards", () => {
    const effects = runtimeCompiledCard("P-240")!.effects;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({ kind: "DeDigivolve", amount: 3 }),
            expect.objectContaining({
              kind: "GrantStatic",
              duration: "untilOpponentTurnEnd",
              tokens: ["GRANTEFFECT23TOKEN"],
              cost: expect.objectContaining({
                kind: "place",
                destination: "digivolutionStack",
                position: "bottom",
                target: expect.objectContaining({ count: 2 }),
              }),
            }),
          ],
        }),
      );
    }
  });

  it("plays Proximamon from hand or trash on deletion and redirects one attack once per turn", () => {
    const effects = runtimeCompiledCard("P-240")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            actions: [expect.objectContaining({ kind: "RedirectAttack", optional: true })],
          }),
        ],
      }),
    );
  });
});
