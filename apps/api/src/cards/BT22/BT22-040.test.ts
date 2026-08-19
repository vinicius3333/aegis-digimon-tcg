import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-040.js";

describe("BT22-040 Cendrillmon", () => {
  it("keeps Overclock, optional Familiar Token plays, and the once-per-turn deleted-Digimon reactivation", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Overclock", qualifier: "Puppet", raw: "＜Overclock ([Puppet] Trait)＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        optional: true,
        actions: [{ kind: "PlayToken", tokens: ["Familiar Token"], count: 1, payCost: false }],
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "ReactivateEffect", fromTrigger: "WhenDigivolving", count: 1 }],
        },
      ],
    });
  });
});
