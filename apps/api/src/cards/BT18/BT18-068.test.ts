import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-068.js";

describe("BT18-068 Wisemon", () => {
  it("returns the five revealed cards to the chosen deck destination and has Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-068", as: "wisemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const topFive = s.state.players[0]!.deck.slice(0, 5).map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wisemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 6);
    await s.ready();

    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.deck.slice(0, 5).map((card) => card.instanceId)).toEqual(topFive);
    const wisemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-068")!;
    expect(observe(s.engine).hasKeyword(wisemon, "Blocker")).toBe(true);
  });
});
