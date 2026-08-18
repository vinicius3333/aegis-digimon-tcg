import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-033.js";

describe("BT8-033 Armadillomon", () => {
  it("adds a revealed two-color yellow card to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT8-033", as: "source" }], deck: [
      { card: "BT8-037", as: "multicolor" }, "BT8-034", "BT8-035", "BT8-036",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
