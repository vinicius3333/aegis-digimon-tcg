import { describe, expect, it } from "vitest";
import { compiled as c049 } from "./BT17-049.js";
import { compiled as c050 } from "./BT17-050.js";
import { compiled as c051 } from "./BT17-051.js";

describe("BT17-049–051 clause audits", () => {
  it("preserves evolution, inherited, and cost boundaries", () => {
    expect(c049.effects?.map((e) => e.trigger)).toEqual(["Static", "WhenDigivolving", "EndOfAttack"]);
    expect(c049.effects?.[2]).toEqual(expect.objectContaining({ isInherited: true, frequency: "OncePerTurn" }));
    expect(c050.effects?.[0]).toEqual(expect.objectContaining({ trigger: "Main", actions: [expect.objectContaining({ kind: "Modal", choose: 1 })] }));
    expect(c051.effects?.map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving"]);
    expect(c051.effects?.every((e) => e.actions.length > 0)).toBe(true);
  });
});
