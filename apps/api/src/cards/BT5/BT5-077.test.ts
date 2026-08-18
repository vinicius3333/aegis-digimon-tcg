import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-077 Vajramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-077", as: "vajramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("vajramon").currentDP).toBe(s.perm("vajramon").baseDP);
  });
});
