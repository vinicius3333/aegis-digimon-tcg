import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-055.js";

describe("BT21-055 Sunarizamon", () => {
  it("reduces eligible digivolution costs and deletes after its stack card is trashed", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const inherited = compiled.effects.find((entry) => entry.isInherited);

    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
    });
    expect(inherited?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        hostFilter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [
            { tokens: ["Mineral"], match: "trait" },
            { tokens: ["Rock"], match: "trait", orPrevious: true },
          ],
        },
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
          },
        ],
      },
    ]);
  });
});
