import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-077.js";

describe("BT22-077 Dianamon", () => {
  it("conditionally trashes four opponent stack cards, then unconditionally returns a low-stack Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 4,
      condition: { kind: "stackHasSameLevelCards", minCount: 2 },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsLte: 1 }, count: 1 },
    });
  });

  it("keeps separate once-per-turn unsuspend effects for the main and inherited text", () => {
    const endEffects = compiled.effects.filter((entry) => entry.trigger === "EndOfYourTurn");
    expect(endEffects).toHaveLength(2);
    expect(endEffects.map((entry) => entry.isInherited ?? false)).toEqual([false, true]);
    for (const effect of endEffects)
      expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", optional: true }] });
  });
});
