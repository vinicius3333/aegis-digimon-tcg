import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-028.js";

describe("EX5-028 Kudamon", () => {
  it("plays a yellow Tamer when both security stacks total six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
      target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
    });
  });
  it("inherits -2000 DP on attack under the same combined-security condition", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });
});
