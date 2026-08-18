import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-051 MoriShellmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-051", as: "moriShellmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("moriShellmon").currentDP).toBe(s.perm("moriShellmon").baseDP);
  });
});
