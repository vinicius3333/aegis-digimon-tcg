import { describe, expect, it } from "vitest";
import compiled from "./EX10-056.js";

describe("EX10-056 Bagramon compiled contract", () => {
  it("records opponent placement and both watcher events with explicit residuals", () => {
    expect(compiled.coverage).toBe("partial");
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "PlaceUnder", position: "bottom", optional: true })] }),
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlaceUnder" })] }),
      expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn", actions: expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }),
        expect.objectContaining({ kind: "SubTrigger", event: "onAddDigivolutionCards" }),
      ]) }),
    ]));
    expect(compiled.residual).toHaveLength(2);
  });
});
