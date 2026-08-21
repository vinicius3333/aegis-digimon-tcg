import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-041.js";

describe("BT17-041 ShineGreymon: Burst Mode", () => {
  it("has Blast Digivolve and plays a Tamer before reducing an opponent's DP per Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Counter")?.keywords).toEqual([{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 } });
      expect(actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: -5000, duration: "forTheTurn", scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Tamer"] } } });
    }
  });

  it("gains Security Attack +1 per yellow Tamer suspended by the attack cost", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, cost: { kind: "suspend", target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 2, upTo: true } }, scaling: { per: 1, usePaidCount: true } });
  });
});
