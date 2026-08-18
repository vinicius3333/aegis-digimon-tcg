import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-012.js";

describe("BT8-012 Flamedramon", () => {
  it("gets +3000 DP for the turn when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-012", as: "flamedramon" }] }, 1: { security: ["BT8-034"] } });
    const before = s.perm("flamedramon").currentDP;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("flamedramon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("flamedramon").currentDP > before);
    expect(s.perm("flamedramon").currentDP).toBe(before + 3000);
  });
});
