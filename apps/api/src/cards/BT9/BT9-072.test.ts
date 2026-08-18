import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-072.js";

describe("BT9-072 Salamon", () => {
  it("adds a revealed two-color purple card to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-072", as: "source" }], deck: [
      { card: "BT9-074", as: "multicolor" }, "BT9-071", "BT9-073", "BT9-077",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
