import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-028.js";

describe("BT23-028 Coordemon", () => {
  it("plays itself at the end of the battle when revealed from security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security") as any;
    expect(security).toMatchObject({
      timing: "endOfBattle",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("reduces one opposing Digimon by 3000 on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -3000,
        duration: "forTheTurn",
      });
    }
  });
});
