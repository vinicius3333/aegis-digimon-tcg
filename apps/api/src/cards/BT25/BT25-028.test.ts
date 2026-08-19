import { describe, expect, it } from "vitest";
import { compiled as BT25_028 } from "./BT25-028.js";
import "../index.js";

describe("BT25-028 Dianamon", () => {
  it("applies the level-6 cost reduction only while an opponent has a level 6+ Digimon", () => {
    const effect = BT25_028.effects?.find((entry) => entry.trigger === "Static");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { isSelfRef: true } });
    const nested = effect?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(nested?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 5,
      condition: {
        kind: "opponentHas",
        filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
      },
    });
  });

  it("targets the snapshot of low-stack Digimon, then deletes one remaining unsuspended Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_028.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 }, count: "all" },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
      });
    }
  });

  it("triggers the All Turns discard-and-DNA sequence for any Digimon being played or digivolving", () => {
    const effect = BT25_028.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenPlayed", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] } }),
        expect.objectContaining({ event: "whenAnyDigivolves", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] } }),
        expect.objectContaining({
          kind: "DnaDigivolve",
          materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["GraceNovamon"], match: "name" }] },
          payCost: true,
          optional: true,
        }),
      ]),
    );
  });
});
