import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-048.js";
import "./index.js";

describe("BT20-048 Dorumon", () => {
  it("reveals three, adds one X Antibody card and one Chronicle Tamer or Option, and bottoms the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] }, count: 1, to: "hand" },
            {
              filter: { kind: ["Tamer", "Option"], nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
          ],
        },
      ],
    });
  });

  it("grants the inherited +2000 DP during the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("adds one X Antibody card and one Chronicle Tamer, then bottoms the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-048", as: "dorumon" }],
          deck: [
            { card: "BT20-010", as: "xAntibody" },
            { card: "BT20-087", as: "chronicleTamer" },
            { card: "BT20-047", as: "nonmatch" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chronicleTamer").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("xAntibody").instanceId, s.inst("chronicleTamer").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("nonmatch").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("adds a Chronicle Option from a mixed reveal pool", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-048", as: "dorumon" }],
          deck: [
            { card: "BT20-010", as: "xAntibody" },
            { card: "BT20-095", as: "chronicleOption" },
            { card: "BT20-047", as: "nonmatch" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chronicleOption").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("xAntibody").instanceId, s.inst("chronicleOption").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("nonmatch").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("returns all revealed cards to the bottom when either requested category is absent", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT20-048", as: "dorumon" }],
        deck: [
          { card: "BT20-047", as: "first" },
          { card: "BT20-047", as: "second" },
          { card: "BT20-047", as: "third" },
        ],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-048") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
  });

  it("uses the 0-cost route only over a black level-2 X Antibody source", async () => {
    for (const [base, expectedMemory] of [
      ["BT13-005", 1],
      ["BT20-005", 0],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: base, as: "base" },
          hand: [{ card: "BT20-048", as: "dorumon" }],
        },
      });
      s.state.memory = 1;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dorumon").instanceId,
          ...(base === "BT13-005" ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-048");
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("grants its inherited host +2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-050", dp: 6000, under: ["BT20-048"], as: "host" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
