import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-053.js";

describe("BT21-053 Watchmon", () => {
  it("preserves the Appmon evolution and link requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("restricts one opponent Digimon from attacking players until opponent turn end", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");

    expect(effect?.actions).toEqual([
      {
        kind: "Restrict",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });

  it("applies the same restriction when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenLinking");
    expect(effect).toEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
          },
        ],
      }),
    );
  });
});
