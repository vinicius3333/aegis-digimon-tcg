import { describe, expect, it } from "vitest";
import { compiled as BT24_073 } from "./BT24-073.js";
import "../index.js";

describe("BT24-073 SkullSatamon", () => {
  it("makes the inherited Security Attack bonus an alternative to milling", () => {
    const inherited = BT24_073.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      condition: { kind: "not", condition: { kind: "zoneCount", zone: "trash", op: "lte", value: 10 } },
    });
    expect(inherited?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      controller: "mine",
      amount: 2,
    });
    expect(inherited?.actions?.[2]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      controller: "opponent",
      amount: 2,
    });
  });
});
