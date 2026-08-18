import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-057.js";

describe("BT4-057 GrapLeomon", () => {
  it("gains 1 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-057", as: "grap" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("grap").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
