import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-051.js";

describe("BT3-051 Dokugumon", () => {
  it("adds one level 5 and one level 6 Digimon, then trashes the rest", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-051", as: "source" }], deck: [
      { card: "BT3-052", as: "levelFive" }, { card: "BT3-057", as: "levelSix" },
      { card: "BT3-050", as: "remainder" },
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("levelFive").instanceId, s.inst("levelSix").instanceId];
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)) && player.trash.length === 1);
    expect(player.trash[0]?.instanceId).toBe(s.inst("remainder").instanceId);
    expect(player.deck).toHaveLength(0);
  });
});
