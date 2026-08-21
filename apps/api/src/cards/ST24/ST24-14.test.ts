import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-14 Yoshino & Keenan", () => {
  it("on play places the deck top face down under the Tamer and gains memory for an opposing Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST24-14", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST24-14");
    expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
    expect(s.state.memory).toBe(-3);
  });

  it("does not gain memory from an opponent's Tamer alone", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST24-14", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] }, 1: { battleArea: [{ card: "ST24-13", as: "opponentTamer" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory < 0);
    expect(s.state.memory).toBe(-4);
  });
});
