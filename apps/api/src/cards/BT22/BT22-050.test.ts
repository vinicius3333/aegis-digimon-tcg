import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-050.js";

describe("BT22-050 Roamon", () => {
  it("plays itself at the end of the battle when revealed from security", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
    });
  });

  it("suspends one opposing Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
});
