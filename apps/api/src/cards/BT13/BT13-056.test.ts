import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-056.js";

describe("BT13-056 Leopardmon", () => {
  it("shares the once-per-turn play effect across both timings and grants Blocker dynamically", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const first = compiled.effects[0]!;
    const second = compiled.effects[1]!;
    expect(first).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: expect.arrayContaining([expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], payCost: true })]) });
    expect(second).toMatchObject({ trigger: "Main", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed" })] });
  });
});
