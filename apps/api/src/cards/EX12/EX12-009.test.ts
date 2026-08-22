import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-009 Wankomon", () => {
  it("adds one Shambala card and one TB card from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-009", as: "source" }],
          deck: ["EX12-006", "EX12-011", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-006", "EX12-011"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("does not use one card twice when it is both Shambala and TB", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-009", as: "source" }],
          deck: ["EX12-011", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX12-011");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX12-011", "BT1-009", "BT1-010"]);
  });

  it("adds only the available matching card and bottoms the remaining reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-009", as: "source" }],
          deck: ["EX12-006", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-006");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("gives its host +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-009", as: "host", under: ["EX12-009"] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("encodes both independent trait searches, zero-cost evolution, and inherited DP", () => {
    const compiled = registeredCompiledCards.get("EX12-009")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["Shambala"] }] } },
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["TB"] }] } },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });
});
