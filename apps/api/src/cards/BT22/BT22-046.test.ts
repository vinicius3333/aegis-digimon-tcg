import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-046.js";

describe("BT22-046 Gargomon", () => {
  it("limits the free CS Tamer play to one or fewer Tamers", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
        count: 1,
      },
      condition: { kind: "permanentCount", filter: { controller: "mine", kind: ["Tamer"] }, op: "lte", value: 1 },
    });
  });

  it("retains inherited permanent +1000 DP", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
    });
  });
});
