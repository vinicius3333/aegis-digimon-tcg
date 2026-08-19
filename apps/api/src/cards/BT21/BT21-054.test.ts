import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-054.js";

describe("BT21-054 Shotmon", () => {
  it("requires trashing an Appmon or Three Musketeers card from a digivolution stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0];

    expect(action).toMatchObject({ kind: "DeDigivolve", amount: 1, optional: true, abortOnDecline: true });
    const typedAction = action as { target?: unknown; cost?: unknown } | undefined;
    expect(typedAction?.target).toEqual({ filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 });
    expect(typedAction?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          nameOrTrait: [
            { tokens: ["Appmon"], match: "trait" },
            { tokens: ["Three Musketeers"], match: "trait", orPrevious: true },
          ],
        },
        count: 1,
      },
    });
  });
});
