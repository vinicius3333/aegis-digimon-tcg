import { describe, expect, it } from "vitest";
import { compiled as BT24_052 } from "./BT24-052.js";

describe("BT24-052 Keramon (X Antibody)", () => {
  it("plays a Diaboromon Token on both printed timings", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      expect(BT24_052.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "PlayToken",
        tokens: ["Diaboromon"],
        count: 1,
        payCost: false,
        optional: true,
      });
    }
  });
  it("makes the other-Diaboromon replacement cost mandatory", () => {
    const inherited = BT24_052.effects?.find((entry) => entry.isInherited);
    const replacement = inherited?.actions?.[0] as any;
    const prevent = replacement.actions?.[0];
    expect(prevent.cost).toMatchObject({ kind: "deleteOwn", raw: "by deleting 1 of your other [Diaboromon]" });
    expect(prevent.optional).toBeUndefined();
    expect(prevent.abortOnDecline).toBeUndefined();
  });
});
