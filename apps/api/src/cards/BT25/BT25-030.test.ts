import { describe, expect, it } from "vitest";
import { compiled as BT25_030 } from "./BT25-030.js";
import "../index.js";

describe("BT25-030 Elecmon", () => {
  it("makes the Start of Your Main Phase memory gain payable by adding top security", () => {
    const effect = BT25_030.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "securityToHand", controller: "mine", amount: 1 },
    });
  });

  it("only grants inherited Recovery +1 when the security stack is empty", () => {
    const effect = BT25_030.effects?.find((entry) => entry.isInherited);
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      controller: "mine",
      amount: 1,
      toTop: true,
      optional: true,
    });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Recovery", amount: 1 },
      condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 0 },
    });
  });
});
