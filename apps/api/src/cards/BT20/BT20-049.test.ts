import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-049.js";

describe("BT20-049 Blimpmon", () => {
  it("prevents one opposing Digimon from attacking players through the opponent's turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] });
    }
  });

  it("has inherited Reboot", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Reboot" }] });
  });
});
