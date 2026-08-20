import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-062.js";

describe("BT13-062 Chuumon", () => {
  it("charges the hand trash cost and plays inherited Chuumon suspended", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Return", cost: expect.objectContaining({ kind: "trash" }), abortOnDecline: true })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], suspended: true, optional: true })] });
  });
});
