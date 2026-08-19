import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-044.js";

describe("BT22-044 Palmon", () => {
  it("gains memory when effects add a CS Digimon card to this stack", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("retains the once-per-turn inherited draw placement cost", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({ kind: "Draw", amount: 1, optional: true });
  });
});
