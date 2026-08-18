import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-080.js";

describe("BT7-080 Neemon", () => {
  it("plays a Tamer with an inherited effect from hand for free", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-080", as: "source" }, { card: "BT7-085", as: "tamer" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId));
    expect(s.state.memory).toBe(0);
  });
});
