import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-007 Gammamon", () => {
  it("adds one Gammamon-text card and one VB card from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-007", as: "source" }],
          deck: ["RB1-005", "EX12-005", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["RB1-005", "EX12-005"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("takes only the available matching cards and returns the rest to the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-007", as: "source" }],
          deck: ["BT1-009", "EX12-005", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-005");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("gives its host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-007", as: "host", under: ["EX12-007"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("encodes both independent text/trait searches and bottom-deck restoration", () => {
    const onPlay = registeredCompiledCards.get("EX12-007")!.effects[0]!;
    expect(onPlay).toMatchObject({
      trigger: "OnPlay",
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "text", tokens: ["Gammamon"] }] } },
          { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["VB"] }] } },
        ],
      }],
    });
    expect(registeredCompiledCards.get("EX12-007")!.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });
});
