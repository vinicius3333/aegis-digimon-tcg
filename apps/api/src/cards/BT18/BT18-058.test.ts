import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-058.js";

describe("BT18-058 Kotemon", () => {
  it("trashes a Knightmon-text card from hand to draw two", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } },
          },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT18-099", as: "knightmonText" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-011"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("knightmonText").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-010", "BT1-011"]));
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("may refuse the hand-trash cost and then draws nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT18-099", as: "candidate" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT18-099"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("is unavailable with no Knightmon-text card and does not trash an ineligible hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT1-030", as: "ineligible" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-030"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("grants inherited +1000 DP only to its host during both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-058"] },
          { card: "BT1-078", dp: 5000, as: "other" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
