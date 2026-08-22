import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-051.js";

describe("EX10-051 Mummymon", () => {
  it("proves hand-trash De-Digivolve and restricted Myotismon-text Tamer play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } }, optional: true, abortOnDecline: true }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }], excludeSameNameAsOwnTamers: true }, count: 1 } }],
    });
  });
});
