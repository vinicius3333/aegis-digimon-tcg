import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-118.js";

describe("P-118 Wormmon", () => {
  it("adds both matching reveal classes and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-118", as: "wormmon" }],
          deck: [
            { card: "BT16-017", as: "multicolor" },
            { card: "P-125", as: "ken" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ken").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ken").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });
});
