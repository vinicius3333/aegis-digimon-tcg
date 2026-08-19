import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-029.js";

describe("BT22-029 Shoemon", () => {
  it("grants Blocker to one Puppet Digimon on play/deletion and reduces an opponent Digimon's DP when attacking", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        duration: "untilOpponentTurnEnd",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
          count: 1,
        },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      });
    }
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });
});
