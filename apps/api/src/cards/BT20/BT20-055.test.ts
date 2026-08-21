import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-055.js";

describe("BT20-055 Invisimon", () => {
  it("plays from security at the end of the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({ trigger: "EndOfOpponentsTurn", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });

  it("de-digivolves, flips the next face-down security card, and deletes a Digimon with at most one digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions).toMatchObject([{ kind: "DeDigivolve", amount: 2 }, { kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }, { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 }, count: 1 } }]);
    }
  });

  it("optionally places this Digimon's top card face-up at the bottom after a face-up security check", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenCheckedFaceUpSecurity", optional: true, actions: [{ kind: "SecurityManipulation", op: "addBottom", controller: "mine", faceUp: true, fromDigivolutionTop: true }] }] });
  });
});
