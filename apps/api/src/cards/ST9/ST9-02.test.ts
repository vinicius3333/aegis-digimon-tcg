import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-02.js";

describe("ST9-02 Veemon", () => {
  it("adds a Free card from the top 3 and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST9-02", as: "veemon" }],
          deck: [
            { card: "BT1-009", as: "miss1" },
            { card: "ST9-05", as: "free" },
            { card: "BT1-010", as: "miss2" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 2 &&
        s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("free").instanceId),
    );
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("free").instanceId);
  });

  it("bottoms all three cards when none has the Free trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST9-02", as: "veemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3 && s.state.players[0]!.hand.length === 0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });
});

describe("ST9-02 Veemon — KB Q&A rulings", () => {
  function revealedByVeemon(events: { kind?: string; sourceCardId?: string }[]): number {
    return events.filter((event) => event.kind === "cardRevealed" && event.sourceCardId === "ST9-02").length;
  }

  it("must reveal 3 cards, or as many as the deck holds when it has fewer than 3 (Q706)", async () => {
    const fullDeck = setupEngine(
      {
        0: {
          hand: [{ card: "ST9-02", as: "veemon" }],
          deck: ["BT1-009", "BT1-010", "ST9-05", { card: "BT1-011", as: "fourth" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    fullDeck.state.memory = 3;
    expect(
      fullDeck.engine.applyIntent(0, { type: "playCard", instanceId: fullDeck.inst("veemon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => fullDeck.state.players[0]!.hand.some((card) => card.cardId === "ST9-05"));
    expect(revealedByVeemon(fullDeck.events as { kind?: string }[])).toBe(3);
    expect(fullDeck.state.players[0]!.deck[0]!.instanceId).toBe(fullDeck.inst("fourth").instanceId);
    expect(fullDeck.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);

    const shortDeck = setupEngine(
      { 0: { hand: [{ card: "ST9-02", as: "veemon" }], deck: ["BT1-009", { card: "ST9-05", as: "free" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    shortDeck.state.memory = 3;
    expect(
      shortDeck.engine.applyIntent(0, { type: "playCard", instanceId: shortDeck.inst("veemon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => shortDeck.state.players[0]!.hand.some((card) => card.cardId === "ST9-05"));
    expect(revealedByVeemon(shortDeck.events as { kind?: string }[])).toBe(2);
    expect(shortDeck.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      shortDeck.inst("free").instanceId,
    ]);
    expect(shortDeck.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("must add a revealed [Free] card to hand and cannot choose to add nothing (Q707)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST9-02", as: "veemon" }],
          deck: ["BT1-009", { card: "ST9-05", as: "free" }, "BT1-010"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;

    expect(selection.options?.min).toBe(1);
    expect(selection.options?.candidateInstanceIds).toEqual([s.inst("free").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(selection.decisionId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("free").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("free").instanceId]);
  });
});
