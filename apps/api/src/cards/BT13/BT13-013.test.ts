import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-013.js";

describe("BT13-013 BaoHuckmon", () => {
  it("keeps the Sistermon trigger, free digivolution, reduction, and inherited memory", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "YourTurn", actions: expect.arrayContaining([expect.objectContaining({ kind: "SubTrigger", actions: [expect.objectContaining({ kind: "Digivolve", optional: true })] }), expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" })]) }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })] })] }),
    ]));
  });
});
