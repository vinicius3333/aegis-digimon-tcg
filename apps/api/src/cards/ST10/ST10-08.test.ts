import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-08.js";

describe("ST10-08 Tsukaimon", () => {
  it("adds an Angel-trait card from the revealed top 3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-08", as: "tsukaimon" }],
          deck: [
            { card: "ST10-05", as: "angel" },
            { card: "ST10-07", as: "rest1" },
            { card: "ST10-11", as: "rest2" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukaimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("angel").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("rest1").instanceId,
      s.inst("rest2").instanceId,
    ]);
  });

  it("bottoms all three revealed cards when none has an eligible trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-08", as: "tsukaimon" }],
          deck: [
            { card: "ST10-07", as: "first" },
            { card: "ST10-11", as: "second" },
            { card: "ST10-02", as: "third" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukaimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["ST10-07", "ST10-11", "ST10-02"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
