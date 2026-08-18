import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-038.js";

describe("BT8-038 Magnamon", () => {
  it("unsuspends and gains +2000 DP per Armor Form in trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-027", as: "base", suspended: true }], hand: [{ card: "BT8-038", as: "evolving" }], trash: ["BT8-023", "BT8-048"] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);
    expect(s.perm("base").isSuspended).toBe(false);
  });
});
