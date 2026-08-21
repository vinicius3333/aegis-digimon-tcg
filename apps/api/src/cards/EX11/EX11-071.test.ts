import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-071.js";

describe("EX11-071 Cool Boy", () => {
  it("reveals three cards and adds an Omekamon and Royal Knight", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-071", as: "cool" }], deck: ["EX11-053", "AD1-008", "BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cool").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX11-053") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "AD1-008"),
      600,
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-053")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-008")).toBe(true);
  });
});
