import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-040.js";

describe("BT23-040 Wormmon", () => {
  it("may digivolve this Digimon into Hudiemon from hand or trash with a two-cost reduction", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Hudiemon"], match: "name" }],
      },
      from: ["hand", "trash"],
      reduceCost: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          filter: { controller: "mine", nameOrTrait: [{ tokens: ["Erika Mishima"], match: "name" }] },
          count: 1,
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
