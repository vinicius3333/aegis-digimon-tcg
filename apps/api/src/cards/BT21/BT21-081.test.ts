import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-081.js";

describe("BT21-081 Owen Dreadnought", () => {
  it("suspends this Tamer, grants Piercing to a Reptile/Dragonkin, and makes that same Digimon attack", () => {
    const endOfTurn = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endOfTurn?.actions[0]).toMatchObject({
      kind: "SelectBind",
      target: {
        bindAs: "piercingTarget",
        filter: { nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }] },
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(endOfTurn?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      target: { fromSelectionRef: "piercingTarget" },
      keyword: { keyword: "Piercing" },
      duration: "forTheTurn",
    });
    expect(endOfTurn?.actions[2]).toMatchObject({ kind: "Attack", target: { fromSelectionRef: "piercingTarget" } });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
  });
});
