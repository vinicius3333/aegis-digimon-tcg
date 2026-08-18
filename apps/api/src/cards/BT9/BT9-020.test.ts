import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-020.js";

describe("BT9-020 Gabumon (X Antibody)", () => {
  it("adds a Garurumon and X Antibody Option from three revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-020", as: "source" }], deck: [
      { card: "BT9-024", as: "garurumon" }, { card: "BT9-109", as: "xAntibody" }, "BT9-021",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("garurumon").instanceId, s.inst("xAntibody").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
