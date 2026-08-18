import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-067.js";

describe("P-067 Bulucomon", () => {
  it("draws 2 at the end of its security battle and adds itself to hand", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "BT1-001", as: "first" }, { card: "BT1-002", as: "second" }],
        security: [{ card: "P-067", as: "bulucomon" }],
      },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const expected = [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("bulucomon").instanceId];
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining(expected));
  });

  it("draws as many as possible from a one-card deck, then still adds itself to hand", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "BT1-001", as: "onlyDraw" }],
        security: [{ card: "P-067", as: "bulucomon" }],
      },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const expected = [s.inst("onlyDraw").instanceId, s.inst("bulucomon").instanceId];
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining(expected));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
