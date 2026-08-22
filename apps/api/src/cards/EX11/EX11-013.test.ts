import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-013.js";
import "../index.js";

describe("EX11-013 Sangomon", () => {
  it("draws on play while its controller has seven or fewer cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX11-013", as: "sangomon" }], deck: ["BT1-001"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
