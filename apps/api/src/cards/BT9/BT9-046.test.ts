import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-046.js";

describe("BT9-046 Kokuwamon (X Antibody)", () => {
  it("adds an Insectoid card and X Antibody Option from three revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-046", as: "source" }], deck: [
      { card: "BT9-049", as: "insectoid" }, { card: "BT9-109", as: "xAntibody" }, "BT9-047",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("insectoid").instanceId, s.inst("xAntibody").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
