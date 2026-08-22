import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-11.js";

describe("ST2-11 MetalGarurumon", () => {
  it("unsuspends after attacking and may attack again", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST2-11", as: "metalGarurumon" }] }, 1: { security: ["BT1-001", "BT1-002"] } });
    const attackerId = s.perm("metalGarurumon").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
      s.state.phase === Phase.Main &&
      !s.perm("metalGarurumon").isSuspended &&
      s.state.players[1]!.security.length === 1 &&
      !observe(s.engine).isAttacking(),
    );
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
      s.state.phase === Phase.Main &&
      s.state.players[1]!.security.length === 0 &&
      s.perm("metalGarurumon").isSuspended,
    );
    expect(s.perm("metalGarurumon").isSuspended).toBe(true);
  });
});
