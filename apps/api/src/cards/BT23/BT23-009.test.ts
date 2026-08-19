import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-009.js";

describe("BT23-009 Coachmon", () => {
  it("once per turn boosts one of your Digimon only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 4000,
          duration: "forTheTurn",
        },
      ],
    });
  });
});
