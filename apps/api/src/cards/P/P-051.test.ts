import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-051.js";

describe("P-051 MetalGarurumon", () => {
  it("draws two additional cards when a Tamer is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-011", as: "base" }, { card: "BT1-089", as: "tamer" }], hand: [{ card: "P-051", as: "source" }], deck: [{ card: "BT1-009", as: "normalDraw" }, { card: "BT1-010", as: "effectDraw1" }, { card: "BT1-011", as: "effectDraw2" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("effectDraw2").instanceId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(expect.arrayContaining([s.inst("normalDraw").instanceId, s.inst("effectDraw1").instanceId, s.inst("effectDraw2").instanceId]));
  });

  it("only performs the normal digivolution draw without a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "P-051", as: "source" }], deck: [{ card: "BT1-009", as: "normalDraw" }, { card: "BT1-010", as: "staysInDeck" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("normalDraw").instanceId));
    expect(s.state.players[0]!.deck.some((c) => c.instanceId === s.inst("staysInDeck").instanceId)).toBe(true);
  });

  it("can't be attacked during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-051", as: "target", suspended: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("attacker").isSuspended).toBe(false);
  });
});
