import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-047.js";

describe("BT17-047 Parrotmon", () => {
  it("plays itself from security at battle end only when you have no Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true }, isSelf: true }, condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] } } });
  });

  it("suspends one opposing Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
  });

  it("once per turn unsuspends after deleting an opponent's Digimon in battle", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ event: "whenDeletesInBattle", actions: [{ kind: "Unsuspend", target: { isSelf: true } }] }] });
  });
});
