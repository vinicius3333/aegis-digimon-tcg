import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-054.js";

describe("EX5-054 Etemon", () => {
  it("deletes one opposing low-cost Digimon or Tamer with cost scaling from trashed Etemon/Sukamon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: {
          count: 1,
          filter: {
            controller: "opponent",
            kind: ["Digimon", "Tamer"],
            playCostLte: 3,
            playCostLteScaling: {
              per: 1,
              unit: "trash",
              filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] },
            },
          },
        },
      });
    }
  });
  it("can redirect an opponent's attack by placing an Etemon or Sukamon from hand on security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          cost: {
            kind: "place",
            destination: "security",
            position: "top",
            target: {
              from: ["hand"],
              count: 1,
              filter: {
                controller: "mine",
                nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }],
              },
            },
          },
          actions: [{ kind: "RedirectAttack", target: { filter: { isSelfRef: true }, isSelf: true, count: 1 } }],
        },
      ],
    });
  });
});
