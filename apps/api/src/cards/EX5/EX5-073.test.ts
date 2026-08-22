import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-073.js";

describe("EX5-073 Fanglongmon", () => {
  it("trashes up to eight evolution cards on DNA digivolving and deletes an opposing Digimon with no more cards than this Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "TrashDigivolution",
        amount: 8,
        condition: { kind: "isDnaDigivolving" },
        target: { count: "any", filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" } },
      },
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      condition: { kind: "isDnaDigivolving" },
      target: {
        count: 1,
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
      },
    });
  });
  it("prevents leaving play by trashing two same-level evolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      actions: [
        {
          kind: "Prevent",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "trash", target: { count: 2, filter: { zone: "digivolutionCards", sameLevelPair: true } } },
        },
      ],
    });
  });
});
