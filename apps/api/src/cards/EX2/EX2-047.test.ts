import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-047.js";

describe("EX2-047 ADR-03 Pendulum Feet", () => {
  it("adds a D-Reaper and ADR-02 Searcher from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-047", as: "pendulum" }],
          deck: [{ card: "EX2-050", as: "dreaper" }, { card: "EX2-046", as: "searcher" }, "BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("dreaper").instanceId, s.inst("searcher").instanceId]),
    );
  });

  it("lets the player order the non-selected revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-047", as: "pendulum" }],
          deck: [
            { card: "EX2-050", as: "dreaper" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.kind).toBe("orderCards");
    expect(ordering.options?.candidateInstanceIds).toEqual([s.inst("first").instanceId, s.inst("second").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: [s.inst("second").instanceId, s.inst("first").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dreaper").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("second").instanceId,
      s.inst("first").instanceId,
    ]);
  });

  it("does not add cards when the reveal has neither required category", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX2-047", as: "pendulum" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
