import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-036.js";

describe("BT4-036 Falcomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-036", as: "falcomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("falcomon").currentDP).toBe(s.perm("falcomon").baseDP);
  });
});
