import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-042.js";
describe("P-042 Gabumon", () => {
  it("shows all 5 cards but enables only Tamers for the On Play choice", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-042", as: "source" }],
          deck: [
            { card: "BT1-089", as: "tamer" },
            { card: "BT1-009", as: "digimon-a" },
            { card: "BT1-010", as: "digimon-b" },
            { card: "BT1-011", as: "digimon-c" },
            { card: "BT1-012", as: "digimon-d" },
          ],
        },
      },
      { autoSelectCards: false, autoOrderCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.visibleInstanceIds).toHaveLength(5);
    expect(decision.options?.candidateInstanceIds).toEqual([s.inst("tamer").instanceId]);
  });

  it("adds 1 Tamer from the top 5 and puts the other revealed cards at deck bottom", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-042", as: "source" }], deck: [{ card: "BT1-089", as: "tamer" }, { card: "BT1-009", as: "rest-a" }, { card: "BT1-010", as: "rest-b" }, { card: "BT1-011", as: "rest-c" }, { card: "BT1-012", as: "rest-d" }, { card: "BT1-013", as: "unrevealed" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("tamer").instanceId));
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("unrevealed").instanceId);
    expect(s.state.players[0]!.deck.slice(1).map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("rest-a").instanceId,
        s.inst("rest-b").instanceId,
        s.inst("rest-c").instanceId,
        s.inst("rest-d").instanceId,
      ]),
    );
  });

  it("returns all 5 revealed cards to deck bottom when none is a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-042", as: "source" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", { card: "BT1-014", as: "unrevealed" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("unrevealed").instanceId);
  });
});
