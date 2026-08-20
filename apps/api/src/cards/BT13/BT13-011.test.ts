import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-011.js";

describe("BT13-011 Aquilamon", () => {
  it("implements both deletion timings and inherited draw", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Delete" })] }),
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Delete" })] }),
      expect.objectContaining({ trigger: "OnDeletion", isInherited: true, actions: [expect.objectContaining({ kind: "Draw", amount: 1 })] }),
    ]));
  });
});
