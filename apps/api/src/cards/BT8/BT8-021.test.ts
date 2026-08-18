import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-021.js";

describe("BT8-021 Veemon", () => {
  it("adds a revealed two-color blue card to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT8-021", as: "source" }], deck: [
      { card: "BT8-023", as: "multicolor" }, "BT8-020", "BT8-022", "BT8-027",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
