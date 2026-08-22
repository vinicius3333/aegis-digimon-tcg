import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-007.js";

describe("BT5-007 Agumon", () => {
  it("adds an eligible Greymon and an Omnimon from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-007", as: "source" }], deck: [
      { card: "BT5-010", as: "greymon" }, { card: "BT5-086", as: "omnimon" }, "BT4-013",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("greymon").instanceId, s.inst("omnimon").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT4-013"]);
  });

  it("adds the one eligible family card when the other family is absent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-007", as: "source" }], deck: [
      { card: "BT5-010", as: "greymon" }, "BT4-013", "BT4-014",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("greymon").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT4-013", "BT4-014"]);
  });
});
