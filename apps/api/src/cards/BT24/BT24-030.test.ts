import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-030.js";

describe("BT24-030 Neptunemon", () => {
  it("reduces its play cost when the opponent has at least two Digimon", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "Static")?.actions?.[0] as any;
    const reduction = replacement.actions[0];

    expect(reduction.event).toBe("wouldBePlayed");
    expect(reduction.mode).toBe("reduceCost");
    expect(reduction.amount).toBe(5);
    expect(reduction.condition).toMatchObject({
      kind: "opponentHas",
      count: 2,
      filter: { kind: ["Digimon"] },
    });
  });

  it("returns all opponent Digimon tied for fewest digivolution cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: { count: "all", filter: { superlative: "fewestDigivolutionCards" } },
      });
    }
  });
});
