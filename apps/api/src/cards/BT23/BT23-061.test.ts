import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-061.js";

describe("BT23-061 Ghostmon", () => {
  it("gives one of your Ghost Digimon Blocker until the opponent's turn ends on play and deletion", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && !entry.isInherited) as any;
      expect(effect.actions[0]).toMatchObject({
        kind: "GainKeyword",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          count: 1,
        },
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
      });
    }
  });

  it("gains 1 memory as an inherited On Deletion effect", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion" && entry.isInherited) as any;
    expect(effect).toMatchObject({ actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
