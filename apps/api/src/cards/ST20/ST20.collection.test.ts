import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const pending = [
  "ST20-01", "ST20-02", "ST20-03", "ST20-04", "ST20-05", "ST20-06", "ST20-07",
  "ST20-09", "ST20-10", "ST20-11", "ST20-12", "ST20-13", "ST20-14", "ST20-15",
] as const;

function effects(cardId: string) {
  const card = runtimeCompiledCard(cardId);
  expect(card, `${cardId} must be registered`).toBeDefined();
  expect(card?.coverage, `${cardId} must have complete IR coverage`).toBe("full");
  expect(card?.residual, `${cardId} must have no parser residual`).toEqual([]);
  return card!.effects;
}

describe("ST20 collection audit proof", () => {
  it.each(pending)("%s has complete executable coverage", (cardId) => {
    expect(effects(cardId).length).toBeGreaterThan(0);
  });

  it("ST20-02 searches only Adventure Tamers or Options in its second slot", () => {
    const reveal = effects("ST20-02").find((effect) => effect.trigger === "OnPlay")!.actions[0];
    expect(reveal).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [{ count: 1, to: "hand" }, { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] } }],
    });
  });

  it("ST20-05 defers its security replay until the battle ends", () => {
    expect(effects("ST20-05").find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("ST20-03 evaluates the three-color Adventure Tamer gate structurally", () => {
    const cardEffects = effects("ST20-03");
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(cardEffects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Digivolve",
        condition: {
          kind: "zoneColorCount",
          cardType: "Tamer",
          op: "gte",
          value: 3,
          filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
        },
      });
    }
  });

  it.each(["ST20-04", "ST20-06", "ST20-09"])("%s keeps the Alliance watcher once-per-turn", (cardId) => {
    expect(effects(cardId).find((effect) => effect.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn" });
  });
});
