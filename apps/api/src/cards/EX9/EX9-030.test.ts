import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-030.js";

describe("EX9-030", () => {
  it("reduces its play cost by 2 by trashing a Cyborg or Ver.3 card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "Replacement", actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2, cost: { kind: "trash" } }] }] });
  });
  it("on play or digivolution gives an opposing Digimon -3000 DP and loses 2000 DP per digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -3000, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }, { kind: "ModifyDP", amount: -2000, scaling: { unit: "digivolutionCards", per: 1 } }] });
    }
  });
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
