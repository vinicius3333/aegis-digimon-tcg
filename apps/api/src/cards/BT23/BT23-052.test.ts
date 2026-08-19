import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-052.js";

describe("BT23-052 Consulmon", () => {
  it("plays itself without cost at the end of the battle when revealed from security", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security") as any;
    expect(effect).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
    });
  });

  it("restricts one opposing Digimon from attacking players until the opponent's turn ends", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
});
