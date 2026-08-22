import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-020.js";

describe("BT5-020 Gabumon", () => {
  it("adds a Garurumon and an Omnimon from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-020", as: "source" }], deck: [
      { card: "BT5-024", as: "garurumon" }, { card: "BT5-086", as: "omnimon" }, "BT5-021",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("garurumon").instanceId, s.inst("omnimon").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });

  it("adds the one Garurumon match when no Omnimon is revealed", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-020", as: "source" }], deck: [
      { card: "BT5-024", as: "garurumon" }, "BT5-021", "BT5-022",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("garurumon").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT5-021", "BT5-022"]);
  });
});
