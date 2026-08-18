import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-005.js";

describe("BT3-005 Kakkinmon", () => {
  it("gains 1 memory when its level 7 host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT3-005"] }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});
