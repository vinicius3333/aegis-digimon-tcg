import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT6-048 Parasaurmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-048", as: "parasaurmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("parasaurmon").currentDP).toBe(s.perm("parasaurmon").baseDP);
  });
});
