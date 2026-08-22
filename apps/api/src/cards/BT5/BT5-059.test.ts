import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-059.js";

describe("BT5-059 Keramon", () => {
  it("adds an Unidentified Digimon and Arata Sanada from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-059", as: "source" }], deck: [
      { card: "BT5-063", as: "unidentified" }, { card: "BT5-090", as: "arata" },
      "BT5-060", "BT5-061", "BT5-062",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("unidentified").instanceId, s.inst("arata").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("adds the available category when only one eligible category is revealed", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-059", as: "source" }], deck: [
      { card: "BT5-063", as: "unidentified" }, "BT5-060", "BT5-061", "BT5-062", "BT5-064",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("unidentified").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("unidentified").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(4);
  });
});
