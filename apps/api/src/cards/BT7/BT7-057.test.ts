import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-057.js";

describe("BT7-057 Monitamon", () => {
  it("adds a revealed Knightmon-named card to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-057", as: "source" }], deck: [
      { card: "BT7-058", as: "knightmon" }, "BT7-056", "BT7-060",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("knightmon").instanceId));
    expect(player.deck).toHaveLength(2);
  });
});
