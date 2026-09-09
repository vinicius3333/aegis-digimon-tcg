import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-007.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-007", () => {
  it("encodes the printed play effect and alternate zero-cost DM evolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          count: 1,
          to: "hand",
          filter: { nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
        },
        {
          count: 1,
          to: "placeUnder",
          faceDown: true,
          filter: { nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }] },
          underFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
        },
      ],
      rest: "deckBottom",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]);
  });

  it("inherits +2000 DP during its controller's turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { isSelf: true } }],
    }));

  it("reveals 3, adds a DM card, places a Ver.1 face-down under a DM Digimon, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-007", as: "source" }],
          battleArea: [{ card: "EX9-050", as: "target" }],
          deck: ["BT22-049", "EX9-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "EX9-009")),
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT22-049");
    expect(s.perm("target").stack).toContainEqual(expect.objectContaining({ cardId: "EX9-009", faceUp: false }));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("follows Q4750: a sole DM/Ver.1 reveal is added to hand before placement is considered", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-007", as: "source" }],
          battleArea: [{ card: "EX9-050", as: "target" }],
          deck: ["EX9-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX9-009"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX9-009");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not place a revealed DM card when no revealed card has the Ver.1 trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-007", as: "source" }],
          battleArea: [{ card: "EX9-050", as: "target" }],
          deck: ["BT22-049", "EX9-014", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-007"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT22-049");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX9-014");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX9-014", "BT1-010"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not use a non-DM card as the hand or placement candidate", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-007", as: "source" }],
          battleArea: [{ card: "EX9-050", as: "target" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-007"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-012"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies inherited +2000 DP through a legal evolution stack and only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-007", as: "base" }],
        hand: [{ card: "BT1-015", as: "stage4" }],
        deck: ["BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("stage4").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-015");

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-007"]);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("base").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves for the alternate zero cost from a level-2 DM host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-003", as: "base" }],
        hand: [{ card: "EX9-007", as: "evo" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-007");

    expect(s.perm("base").topCard.cardId).toBe("EX9-007");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-003"]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").currentDP).toBe(1000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
