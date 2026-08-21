import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-046 Chamblemon", () => {
  it("suspends one opposing Digimon, then restricts one opposing Data Digimon", () => {
    const card = runtimeCompiledCard("BT19-046");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = card?.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toMatchObject([
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], trait: ["Data"] },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ]);
    }
  });
});
