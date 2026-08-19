import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-026.js";

describe("BT23-026 Lopmon", () => {
  it("during your turn may digivolve this Digimon into Antylamon for 3 with Makiko Date", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Antylamon"], match: "name" }] },
      payCost: true,
      from: ["hand"],
      costOverride: 3,
      ignoreRequirements: true,
      condition: {
        kind: "youHave",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Makiko Date"], match: "name" }] },
      },
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
