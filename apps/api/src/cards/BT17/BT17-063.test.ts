import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-063.js";

describe("BT17-063 Darcmon", () => {
  it("has Retaliation and draws before trashing one card on digivolution", () => {
    expect(compiled.effects.some((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Retaliation"))).toBe(true);
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(actions?.[1]).toMatchObject({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } });
  });

  it("optionally digivolves into Murmukusmon for 2 when HippoGryphonmon is underneath", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2];
    expect(action).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      costOverride: 2,
      from: ["hand"],
      ignoreRequirements: true,
      optional: true,
      condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["HippoGryphonmon"], match: "name" }] } },
      into: { nameOrTrait: [{ tokens: ["Murmukusmon"], match: "name" }] },
    });
  });
});
