import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-010.js";

describe("BT1-010 Agumon", () => {
  it("adds one revealed Tamer to hand and returns the other cards to the deck", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-010", as: "agumon" }], deck: [
      { card: "BT1-085", as: "tamer" }, "BT1-009", "BT1-012", "BT1-013", "BT1-014",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const tamerId = s.inst("tamer").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === tamerId));

    expect(player.deck).toHaveLength(4);
    expect(player.hand.some((card) => card.instanceId === tamerId)).toBe(true);
  });
});
