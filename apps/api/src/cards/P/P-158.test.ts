import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-158.js";

describe("P-158 Jeri (Fake)", () => {
  it("adds the selected D-Reaper card to hand and bottoms the other revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-158", as: "jeri" }],
          deck: [
            { card: "BT1-001", as: "nonMatch1" },
            { card: "EX2-046", as: "searcher" },
            { card: "BT1-002", as: "nonMatch2" },
            { card: "BT1-003", as: "nonMatch3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("jeri").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("searcher").instanceId,
    ));

    expect(s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("searcher").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatch1").instanceId,
      s.inst("nonMatch2").instanceId,
      s.inst("nonMatch3").instanceId,
    ]);
    assertNoLoudGap(s);
  });
});
