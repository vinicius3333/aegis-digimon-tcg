import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-030.js";

describe("EX2-030 Monodramon", () => {
  it("adds every black Tamer among the top four cards on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-030", as: "monodramon" }],
          deck: [
            { card: "EX2-062", as: "ryo" },
            { card: "EX2-063", as: "kazu" },
            "EX2-014",
            "EX2-015",
            "EX2-031",
            "EX2-032",
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-031,EX2-032,EX2-014,EX2-015",
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("ryo").instanceId, s.inst("kazu").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-031", "EX2-032", "EX2-014", "EX2-015"]);
  });

  it("does not add a non-black Tamer among the top four", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-030", as: "monodramon" }],
          deck: [{ card: "EX2-062", as: "black" }, "EX2-061", "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-061",
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-062")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-061")).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "EX2-061")).toBe(true);
  });
});
