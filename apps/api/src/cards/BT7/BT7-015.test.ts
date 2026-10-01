import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-015.js";

describe("BT7-015 AvengeKidmon", () => {
  it("declares the hand-play reducer in the BeforePayCost IR window", () => {
    const costEffect = runtimeCompiledCard("BT7-015")?.effects.find((effect) => effect.trigger === "BeforePayCost");

    expect(costEffect?.actions[0]).toMatchObject({
      kind: "CostModifier",
      costType: "play",
      handResident: true,
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("Q1517 reduces its play cost for Option cards in both players' trashes", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT7-015", as: "source" }], trash: ["BT7-092"] },
      1: { trash: ["BT7-093"] },
    });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId),
    );

    expect(s.state.memory).toBe(2);
  });

  it("returns seven qualifying trash cards and deletes an eligible opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT7-015", as: "source" }], trash: ["BT6-017", "BT6-065", "BT6-112", "BT7-092"] },
        1: { trash: ["BT7-093", "BT7-094", "BT7-095"], battleArea: [{ card: "BT7-014", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);
    expect((s.state.players[0] as PlayerState).trash).toHaveLength(0);
    expect(opponent.trash.some((c) => c.cardId === "BT7-014")).toBe(true);
  });
});

describe("BT7-015 AvengeKidmon — KB Q&A rulings", () => {
  it("lets the activating player order both players' returned cards at the bottom of each deck (Q1518)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-015", as: "source" }],
          trash: [
            { card: "BT7-092", as: "ownFirst" },
            { card: "BT7-093", as: "ownSecond" },
          ],
          deck: ["BT1-010"],
        },
        1: {
          trash: [
            { card: "BT7-094", as: "opponentFirst" },
            { card: "BT7-095", as: "opponentSecond" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const ordering = s.decisions.find(({ req }) => req.kind === "orderCards")!;
    expect(ordering.seat).toBe(0);
    expect(ordering.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("ownFirst").instanceId,
        s.inst("ownSecond").instanceId,
        s.inst("opponentFirst").instanceId,
        s.inst("opponentSecond").instanceId,
      ]),
    );
    expect(s.decisions.some(({ seat }) => seat === 1)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: {
          kind: "orderCards",
          order: [
            s.inst("opponentSecond").instanceId,
            s.inst("ownSecond").instanceId,
            s.inst("opponentFirst").instanceId,
            s.inst("ownFirst").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 0);

    const deckBottomTwo = (seat: 0 | 1) => s.state.players[seat]!.deck.slice(-2).map((card) => card.instanceId);
    expect(deckBottomTwo(0)).toEqual([s.inst("ownSecond").instanceId, s.inst("ownFirst").instanceId]);
    expect(deckBottomTwo(1)).toEqual([s.inst("opponentSecond").instanceId, s.inst("opponentFirst").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "orderCards")).toHaveLength(1);
    expect(s.decisions.some(({ seat }) => seat === 1)).toBe(false);
  });
});
