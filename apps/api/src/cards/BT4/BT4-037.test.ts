import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-037.js";

describe("BT4-037 Kudamon", () => {
  it("trashes the top security card to give an opponent Digimon -2000 DP", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-037", as: "source" }], security: [
      { card: "BT4-038", as: "securityTop" }, "BT4-039",
    ] }, 1: { battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(player.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);
    expect(player.security).toHaveLength(1);
  });
});
