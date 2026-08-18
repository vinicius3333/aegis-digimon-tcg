import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-091.js";

describe("BT7-091 Koichi Kimura", () => {
  it("draws one card and then trashes one card from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { hand: [{ card: "BT7-091", as: "source" }, { card: "BT7-092", as: "discard" }], deck: [{ card: "BT7-093", as: "drawn" }] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.trash.some((c) => c.instanceId === s.inst("discard").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
