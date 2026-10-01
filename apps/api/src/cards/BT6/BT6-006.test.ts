import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-006.js";
import "../BT13/BT13-080.js";

describe("BT6-006 Tsunomon", () => {
  it("draws once when one of your effects trashes a card in your hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-069", under: ["BT6-006"], as: "host" }],
        hand: [{ card: "BT1-010", as: "discard" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

describe("BT6-006 Tsunomon — KB Q&A rulings", () => {
  async function playProtoGizmon(withTsunomon: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-069", under: withTsunomon ? ["BT6-006"] : [], as: "host" }],
          hand: [
            { card: "BT13-080", as: "protoGizmon" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: [{ card: "BT1-011", as: "drawnByProtoGizmon" }, { card: "BT1-012", as: "drawnByTsunomon" }, "BT1-013"],
        },
      },
      { autoSelectCards: true, declineDigiXros: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("protoGizmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle();
    return s;
  }

  it("draws 1 when a <Draw 1> then trash 1 card in your hand effect trashes the card (Q1401)", async () => {
    const s = await playProtoGizmon(true);
    const hand = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(hand).toContain(s.inst("drawnByTsunomon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);

    const control = await playProtoGizmon(false);
    expect(control.state.players[0]!.trash).toHaveLength(1);
    expect(control.state.players[0]!.deck.map((card) => card.instanceId)).toContain(
      control.inst("drawnByTsunomon").instanceId,
    );
  });
});
