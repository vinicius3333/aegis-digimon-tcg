import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-060.js";

describe("BT22-060 Datamon", () => {
  it("protects itself and gains DP from face-down digivolution cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "cantBeDeDigivolved",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, isSelf: true },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 1000,
        duration: "untilOpponentTurnEnd",
        scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
      });
    }
  });

  it("lets the opponent choose an attacker at end of their turn", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          optional: true,
          drainTimingWindowDuringAttack: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, chooser: "opponent" },
        },
      ],
    });
  });
});
