import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-017.js";

describe("EX1-017 WereGarurumon", () => {
  it("draws 1 when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-014", as: "base" }], hand: [{ card: "EX1-017", as: "evo" }], deck: ["BT1-029", "BT1-030"] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("gains 1 memory on attack with 8 or more cards in hand", async () => {
    const hand = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-021", as: "host", under: ["EX1-017"] }], hand }, 1: { security: ["BT1-001", "BT1-001"] } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });
});
