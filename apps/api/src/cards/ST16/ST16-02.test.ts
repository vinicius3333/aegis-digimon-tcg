import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-02.js";

const CARD_ID = "ST16-02";

describe("ST16-02 Elecmon", () => {
  it("draws 1, then trashes exactly 1 card from its owner's hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "elecmon" },
            { card: "BT1-001", as: "discard" },
          ],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    const discardId = s.inst("discard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elecmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === discardId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(discardId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("elecmon").instanceId)).toBe(false);
  });

  it("trashes the drawn card when it is the only card in hand after play", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "elecmon" }],
        deck: [{ card: "BT1-002", as: "drawn" }],
      },
    });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elecmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-002"]);
  });
});
