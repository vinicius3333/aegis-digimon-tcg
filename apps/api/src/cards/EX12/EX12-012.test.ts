import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-012 Apemon", () => {
  it("trashes an SW card and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-012", as: "source" }, { card: "EX12-006", as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("trashes an SW card and draws two when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "base" }],
          hand: [{ card: "EX12-012", as: "source" }, { card: "EX12-006", as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe("EX12-012");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("does not draw or trash when no SW card is available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-012", as: "source" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("keeps Raid and gives its host +2000 DP on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-012", as: "host", under: ["EX12-012"] }] } });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("encodes the mandatory SW hand cost in both windows and the alternate evolution", () => {
    const compiled = registeredCompiledCards.get("EX12-012")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Shambala"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Draw", amount: 2, cost: { kind: "trash", target: { filter: { zone: "hand", nameOrTrait: [{ match: "trait", tokens: ["SW"] }] }, count: 1 } } }],
      });
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).not.toHaveProperty("optional");
    }
  });
});
