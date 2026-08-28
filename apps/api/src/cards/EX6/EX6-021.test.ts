import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-021.js";

describe("EX6-021 ArkhaiAngemon", () => {
  it("gates the -4000 DP and Angel-family security placement behind adding security to hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "securityToHand", position: "topOrBottom" },
      actions: [
        { kind: "ModifyDP", amount: -4000 },
        { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false },
      ],
    });
  });
  it("grants the Angel trait and inherits Blocker for Angel-family Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Angel"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { count: "all" } }],
    });
  });
});
