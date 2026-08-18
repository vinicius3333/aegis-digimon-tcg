import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-009.js";

describe("BT8-009 Hawkmon", () => {
  it("adds a revealed two-color red card to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT8-009", as: "source" }], deck: [
      { card: "BT8-011", as: "multicolor" }, "BT8-010", "BT8-013", "BT8-014",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
