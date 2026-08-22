import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-055.js";

describe("EX11-055 Chitose Horaiji", () => {
  it("trashes a Composite card to draw and gain memory on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-055", as: "chitose" }, "AD1-006"], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chitose").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 2 && s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006"),
      600,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006")).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
