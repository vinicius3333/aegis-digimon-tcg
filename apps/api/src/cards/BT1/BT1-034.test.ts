import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-034.js";

describe("BT1-034 Ikkakumon", () => {
  it("cannot be blocked by a Digimon with no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "attacker", dp: 20000, under: ["BT1-034"] }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-010"] },
      },
    );
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("can still be blocked by a Digimon with a digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "attacker", dp: 20000, under: ["BT1-034"] }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker", under: ["BT1-066"] }], security: ["BT1-010"] },
      },
    );
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
