import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-049.js";

describe("BT22-049 Vegiemon", () => {
  it("requires all three face-down Ver.2 trash cards for the end-turn digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      optional: true,
      into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }] },
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        faceDown: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }],
          },
          count: 3,
          from: ["trash"],
        },
      },
    });
  });

  it("retains inherited Piercing", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toMatchObject([{ keyword: "Piercing" }]);
  });
});
