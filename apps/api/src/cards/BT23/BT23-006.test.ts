import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-006.js";

describe("BT23-006 Sistermon Blanc", () => {
  it("reveals three and adds the two printed card categories", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");

    expect(effect?.actions).toEqual([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Huckmon", "Sistermon"], match: "name" }],
            },
            count: 1,
            to: "hand",
          },
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
            },
            count: 1,
            to: "hand",
          },
        ],
        rest: "deckBottom",
      },
    ]);
  });

  it("keeps the inherited once-per-turn white Digimon trigger", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);

    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["White"] },
        actions: [{ kind: "GainMemory", amount: 1 }],
      },
    ]);
  });
});
