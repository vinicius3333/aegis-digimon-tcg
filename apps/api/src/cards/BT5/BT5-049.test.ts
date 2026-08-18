import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-049.js";

describe("BT5-049 Kiwimon", () => {
  it("adds all revealed Digimon with Digisorption to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-049", as: "source" }], deck: [
      { card: "BT5-058", as: "digisorptionA" }, { card: "BT5-058", as: "digisorptionB" },
      { card: "BT5-050", as: "remainder" },
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("digisorptionA").instanceId, s.inst("digisorptionB").instanceId];
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("remainder").instanceId]);
  });
});
