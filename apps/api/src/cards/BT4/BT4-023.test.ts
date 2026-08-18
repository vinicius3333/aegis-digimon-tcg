import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-023.js";

describe("BT4-023 Strabimon", () => {
  it("adds a Hybrid Digimon and blue Tamer from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-023", as: "source" }], deck: [
      { card: "BT4-025", as: "hybrid" }, { card: "BT4-093", as: "tamer" }, "BT4-026",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("hybrid").instanceId, s.inst("tamer").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
