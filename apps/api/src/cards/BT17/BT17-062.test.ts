import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-062.js";

describe("BT17-062 Dorumon", () => {
  it("requires Kosuke underneath and an opposing level-6-or-higher Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costOverride: 4,
      ignoreRequirements: true,
      condition: {
        kind: "allOf",
        conditions: [
          { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] } },
          { kind: "opponentHas", filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } } },
        ],
      },
      into: { nameOrTrait: [{ tokens: ["Dorugoramon"], match: "name" }] },
    });
  });

  it("retains Reboot as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Reboot", raw: "＜Reboot＞" }]);
  });
});
