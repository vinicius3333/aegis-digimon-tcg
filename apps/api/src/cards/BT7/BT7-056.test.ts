import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-056.js";

describe("BT7-056 Dorumon", () => {
  it("adds an X-Antibody card and Kota Domoto from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-056", as: "source" }], deck: [
      { card: "BT7-062", as: "xAntibody" }, { card: "BT7-090", as: "kota" }, "BT7-057",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("xAntibody").instanceId, s.inst("kota").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
