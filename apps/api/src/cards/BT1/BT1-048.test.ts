import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-048.js";

describe("BT1-048 Patamon", () => {
  it("adds every revealed yellow Tamer to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-048", as: "patamon" }], deck: [
      { card: "BT1-087", as: "yellowTamerA" }, { card: "BT1-088", as: "yellowTamerB" },
      { card: "BT1-085", as: "redTamer" }, { card: "BT1-049", as: "digimon" },
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const expected = [s.inst("yellowTamerA").instanceId, s.inst("yellowTamerB").instanceId];
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({ ok: true });
    await settle(() => expected.every((id) => player.hand.some((card) => card.instanceId === id)));

    expect(player.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("redTamer").instanceId, s.inst("digimon").instanceId]));
  });
});
