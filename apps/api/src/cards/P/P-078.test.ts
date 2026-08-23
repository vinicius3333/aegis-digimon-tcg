import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-078.js";

describe("P-078 Espimon", () => {
  it("draws for a revealed Digimon and returns it face down", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-078", as: "source" }], deck: [{ card: "BT1-009", as: "drawn" }] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    const securityId = s.state.players[1]!.security[0]!.instanceId;
    await settle(
      () =>
        s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId) &&
        s.state.players[1]!.security[0]?.faceUp === false,
    );
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(securityId);
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(false);
  });

  it("does not draw when the revealed security card isn't a Digimon and returns it face down", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-078", as: "source" }],
          deck: [{ card: "BT1-009", as: "stays-in-deck" }],
        },
        1: { security: [{ card: "BT1-107", as: "option" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security[0]?.faceUp === false);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(optionId);
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(false);
  });
});
