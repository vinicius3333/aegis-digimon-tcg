import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-056.js";

describe("BT21-056 Vemmon", () => {
  it("trashes a Vemmon-text card to return a non-Digi-Egg Vemmon-text card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0] as { target?: unknown; cost?: unknown } | undefined;

    expect(action).toMatchObject({ optional: true, abortOnDecline: true });
    expect(action?.target).toEqual({
      filter: {
        controller: "mine",
        kind: ["Digimon", "Option", "Tamer"],
        zone: "trash",
        nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }],
      },
      count: 1,
    });
    expect(action?.cost).toMatchObject({ kind: "trash", target: { count: 1 } });
  });

  it("restricts inherited cost reduction to this Digimon and Vemmon-text Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { isSelfRef: true },
      into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });
});
