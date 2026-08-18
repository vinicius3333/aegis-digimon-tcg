import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-046.js";

describe("BT8-046 Terriermon", () => {
  it("may add a revealed Rapidmon card to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT8-046", as: "source" }], deck: [
      { card: "BT8-039", as: "rapidmon" }, "BT8-047", "BT8-048", "BT8-049", "BT8-050",
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("rapidmon").instanceId));
    expect(player.deck).toHaveLength(4);
  });
});
