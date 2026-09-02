import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-011");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-006");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("bottoms all revealed cards in order when neither trait is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-009", as: "source" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("gives only its host +2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-009", as: "host", under: ["EX12-009"] },
          { card: "EX12-009", as: "other" },
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

  it("encodes both independent trait searches, zero-cost evolution, and inherited DP", () => {
    const compiled = registeredCompiledCards.get("EX12-009")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Shambala"], cost: 0, isAlternate: true }]);
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

  it("digivolves for 0 by the standard red route or the level-2 Shambala alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-009")).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["BT1-001", false],
      ["EX12-004", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-009", as: "wankomon" }],
        },
      });
      s.state.memory = 0;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("wankomon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-009");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects alternate evolution over an off-color level-2 card without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "base" }],
        hand: [{ card: "EX12-009", as: "wankomon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wankomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("reveals only the top three cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-009", as: "source" }],
          deck: ["EX12-006", "BT1-009", "BT1-010", "EX12-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX12-006"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX12-011", "BT1-009", "BT1-010"]);
  });
});
