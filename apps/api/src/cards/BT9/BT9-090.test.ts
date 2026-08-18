import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-090.js";

describe("BT9-090 Maki Himekawa", () => {
  it("adds Tapirmon and a two-color black card from three revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-090", as: "source" }], deck: [
      { card: "BT9-059", as: "tapirmon" }, { card: "BT9-061", as: "black" }, "BT9-060",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("tapirmon").instanceId, s.inst("black").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
