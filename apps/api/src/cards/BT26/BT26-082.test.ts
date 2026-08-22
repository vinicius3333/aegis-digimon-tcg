import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-082.js";

describe("BT26-082 compiled behavior", () => {
  it("proves security timing, both alternate evolutions, indivisible alternate costs, deletion, and Birdkin rule trait", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Crowmon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false }] }),
      expect.objectContaining({ trigger: "EndOfOpponentsTurn", isSecurity: true }),
      expect.objectContaining({ trigger: "Static", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Birdkin"] }] }),
    ]));
    for (const trigger of ["WhenDigivolving", "EndOfAttack"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Modal", choose: 1, options: [
        [{ kind: "Delete", target: { filter: { superlative: "highestDP" } }, cost: { kind: "deleteOwn" } }],
        [{ kind: "Delete", target: { filter: { superlative: "highestDP" } }, cost: { kind: "trash", target: { count: 2, filter: { zone: "digivolutionCards", faceDown: true, position: "bottom" } } } }],
      ] });
    }
  });

  it("trashes from the opponent's hand before the optional face-up bottom-security placement", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")?.actions).toEqual([
      expect.objectContaining({ kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } }),
      expect.objectContaining({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["trash"], toTop: false, faceUp: true, optional: true, condition: { kind: "handAtMost", controller: "opponent", value: 7 } }),
    ]);
  });
});
