import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-001.js";

describe("BT8-001 Gurimon", () => {
  it("draws once when its 6000-DP-or-higher host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-001"] }], deck: [{ card: "BT8-033", as: "drawn" }] },
      1: { security: ["BT8-034"] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw when the opponent's Digimon attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-001"] }],
        deck: [{ card: "BT8-033", as: "wouldDraw" }],
        security: ["BT8-034"],
      },
      1: { battleArea: [{ card: "BT8-017", as: "opponentAttacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("opponentAttacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(true);
  });

  it("does not draw when its host has 5999 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-001"] }], deck: [{ card: "BT8-033", as: "wouldDraw" }] },
      1: { security: ["BT8-034"] },
    });
    s.perm("host").currentDP = 5999;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(true);
  });
});
