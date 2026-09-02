import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { definitionMatches } from "../../engine/effects/interpreter/matching/definition.js";
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["RB1-005", "EX12-005"]),
    );
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-005");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("Q6729: text matching spans printed effects and inherited effects beyond name and trait", async () => {
    expect(
      definitionMatches({ nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] }, getCardDefinition("BT21-002")!),
    ).toBe(true);
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-007", as: "source" }],
          deck: ["BT15-039", "EX12-005", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT15-039", "EX12-005"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("adds one physical card only once when it satisfies both independent filters", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-007", as: "source" }],
          deck: ["EX12-007", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX12-007")).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("gives its host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-007", as: "host", under: ["EX12-007"] },
          { card: "EX12-007", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(2000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(2000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("encodes both independent text/trait searches and bottom-deck restoration", () => {
    const onPlay = registeredCompiledCards.get("EX12-007")!.effects[0]!;
    expect(onPlay).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "text", tokens: ["Gammamon"] }] } },
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["VB"] }] } },
          ],
        },
      ],
    });
    expect(registeredCompiledCards.get("EX12-007")!.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("uses both standard colors at cost 1 and both printed alternatives at cost 0", async () => {
    expect(digivolutionRequirementsFor("EX12-007")).toEqual([
      { names: ["Gurimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory, expectedMemory] of [
      ["BT1-001", false, 1, 0],
      ["BT12-003", false, 1, 0],
      ["BT21-002", true, 0, 0],
      ["EX12-001", true, 0, 0],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-007", as: "gammamon" }],
        },
      });
      s.state.memory = startingMemory;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gammamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-007");
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("rejects an off-color level-2 card that is neither Gurimon nor VB", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "base" }],
        hand: [{ card: "EX12-007", as: "gammamon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gammamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("reveals only the top three cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-007", as: "source" }],
          deck: ["RB1-005", "EX12-005", "BT1-009", "EX12-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["RB1-005", "EX12-005"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX12-011", "BT1-009"]);
  });
});
