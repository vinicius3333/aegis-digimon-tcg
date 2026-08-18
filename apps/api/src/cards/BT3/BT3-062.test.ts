import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-062.js";

describe("BT3-062 Ludomon", () => {
  it("adds RagnaLoardmon and a revealed Legend-Arms Digimon to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-062", as: "source" }], deck: [
      { card: "BT3-019", as: "ragna" }, { card: "BT3-064", as: "legendArms" },
      "BT3-068", "BT3-070", "BT3-071",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("ragna").instanceId, s.inst("legendArms").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });
});
