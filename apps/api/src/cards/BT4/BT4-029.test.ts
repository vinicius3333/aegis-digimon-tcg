import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-029.js";

describe("BT4-029 Gusokumon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-029", as: "gusokumon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("gusokumon").currentDP).toBe(s.perm("gusokumon").baseDP);
  });
});
