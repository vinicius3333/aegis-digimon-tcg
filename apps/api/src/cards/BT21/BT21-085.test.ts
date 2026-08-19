import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-085.js";

describe("BT21-085 Davis Motomiya", () => {
  it("draws and gains memory only after the Tamer suspension and Armor Form top-card costs", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    const draw = main?.actions[0];
    expect(draw).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      additionalCost: {
        kind: "trash",
        target: {
          filter: {
            zone: "digivolutionCards",
            position: "top",
            hostFilter: { nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
          },
        },
      },
    });
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
  });
});
