import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-084.js";

describe("BT20-084 Sistermon Ciel (Awakened)", () => {
  it("has a trash-only effect that may digivolve a Sistermon Ciel into this card when a Digimon is played", () => {
    expect(compiled.effects.find((effect) => effect.isFromTrash)).toMatchObject({ trigger: "AllTurns", isFromTrash: true, actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"] }, actions: [{ kind: "Digivolve", from: ["trash"], payCost: false, ignoreRequirements: true }] }] });
  });

  it("prevents one opposing Digimon or Tamer from suspending on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } }] });
    }
  });

  it("places this Digimon's top digivolution card on top of security at end of all turns", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({ actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", fromDigivolutionTop: true, toTop: true, source: { isSelf: true } }] });
  });
});
