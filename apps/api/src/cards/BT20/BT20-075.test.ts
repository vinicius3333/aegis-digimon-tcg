import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-075.js";

describe("BT20-075 Loudmon", () => {
  it("trashes two hand cards, then gives one bound Digimon +4000 DP, Raid, and Piercing on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } });
      expect(actions[1]).toMatchObject({ kind: "ModifyDP", amount: 4000, duration: "forTheTurn", target: { count: 1, bindAs: "loudmonTarget" } });
      expect(actions[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Raid" }, duration: "forTheTurn", target: { fromSelectionRef: "loudmonTarget" } });
      expect(actions[3]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Piercing" }, duration: "forTheTurn", target: { fromSelectionRef: "loudmonTarget" } });
    }
  });

  it("gives all own Dark Dragon or Evil Dragon Digimon Security Attack +1 with four or fewer hand cards", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Aura", target: { count: "all", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] } }, effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 4 } }] });
  });
});
