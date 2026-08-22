import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-016.js";

describe("BT20-016 Paildramon", () => {
  it("gives one Digimon Piercing and +4000 before optionally attacking on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Piercing" }, duration: "forTheTurn" },
          { kind: "ModifyDP", amount: 4000, duration: "forTheTurn" },
          { kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true }, optional: true },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "Replacement", event: "wouldBeDeleted", sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "name" }] }, actions: [{ kind: "DnaDigivolve", materials: { count: 2 }, into: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }] }, payCost: true, optional: true }] }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }]);
  });
});
