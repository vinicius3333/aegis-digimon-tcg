import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-071.js";

describe("BT9-071 Dracmon", () => {
  it("adds one eligible card and trashes another from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-071", as: "source" }], deck: [
      { card: "BT9-073", as: "added" }, { card: "BT9-077", as: "trashed" }, "BT9-070",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("added").instanceId) && player.trash.some((c) => c.instanceId === s.inst("trashed").instanceId));
    expect(player.deck).toHaveLength(1);
  });
});
