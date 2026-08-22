import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-029.js";

describe("EX5-029 Reppamon", () => {
  it("can trash the top security card to reduce digivolution cost by two while attacking", () => {
    const action = compiled.effects?.filter((entry) => entry.trigger === "WhenAttacking")[0]?.actions?.[0];
    expect(action).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "digivolve",
      amount: 2,
      optional: false,
      cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
    });
  });
  it("inherits -2000 DP with six or fewer combined security cards", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "WhenAttacking")[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } }],
    });
  });
});
