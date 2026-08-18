import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-066 WaruMonzaemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-066", as: "waruMonzaemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("waruMonzaemon").currentDP).toBe(s.perm("waruMonzaemon").baseDP);
  });
});
