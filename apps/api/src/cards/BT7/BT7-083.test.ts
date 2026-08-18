import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-083.js";

describe("BT7-083 Sistermon Ciel (Awakened)", () => {
  it("places Sistermon Ciel under itself to delete a play-cost-5 Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-083", as: "source" }, { card: "BT6-084", as: "material" }] }, 1: {
      battleArea: [{ card: "BT7-047", as: "target" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0);
    const source = (s.state.players[0] as PlayerState).battleArea.find((p) => p.topCard?.cardId === "BT7-083");
    expect(source?.stack.some((c) => c.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});
