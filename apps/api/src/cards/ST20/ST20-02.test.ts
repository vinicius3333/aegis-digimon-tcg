import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-02.js";

describe("ST20-02 Biyomon", () => {
  it("reveals three, adds one Adventure Digimon and one Adventure Tamer, and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST20-02", as: "biyomon" }],
          deck: [
            { card: "ST20-02", as: "adventureDigimon" },
            { card: "ST20-12", as: "adventureTamer" },
            { card: "BT1-009", as: "nearMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("adventureTamer").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("adventureDigimon").instanceId, s.inst("adventureTamer").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("nearMatch").instanceId]);
  });

  it("does not treat a non-Adventure Tamer as the second search result", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST20-02", as: "biyomon" }],
          deck: [
            { card: "ST20-02", as: "adventureDigimon" },
            { card: "BT1-085", as: "nonAdventureTamer" },
            { card: "BT1-009", as: "nearMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("biyomon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonAdventureTamer").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nonAdventureTamer").instanceId, s.inst("nearMatch").instanceId]),
    );
  });
});
