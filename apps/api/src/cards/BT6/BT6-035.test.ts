import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-035.js";

describe("BT6-035 Baluchimon", () => {
  it("draws two cards when its owner has three or fewer security cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-035", as: "source" }], security: 3, deck: [
      { card: "BT6-036", as: "drawA" }, { card: "BT6-037", as: "drawB" },
    ] } });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);
    expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("drawA").instanceId, s.inst("drawB").instanceId]));
  });
});
