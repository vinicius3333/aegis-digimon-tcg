import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-081.js";

describe("BT7-081 Bokomon", () => {
  it("adds one Hybrid card and one Tamer from the top five cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-081", as: "bokomon" }],
          deck: [
            { card: "BT7-011", as: "hybrid" },
            { card: "BT7-085", as: "tamer" },
            "BT7-008",
            "BT7-009",
            "BT7-010",
            "BT7-012",
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const hybridId = s.inst("hybrid").instanceId;
    const tamerId = s.inst("tamer").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => [hybridId, tamerId].every((id) => player.hand.some((card) => card.instanceId === id)));

    expect(player.hand.some((card) => card.instanceId === hybridId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === tamerId)).toBe(true);
    expect(player.deck).toHaveLength(4);
    expect(player.deck.every((card) => card.instanceId !== hybridId && card.instanceId !== tamerId)).toBe(true);
  });

  it("presents both reveal picks as visible loose-card decisions", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-081", as: "bokomon" }],
          deck: [
            { card: "BT7-011", as: "hybrid" },
            { card: "BT7-085", as: "tamer" },
            { card: "BT7-008", as: "otherOne" },
            { card: "BT7-009", as: "otherTwo" },
            { card: "BT7-010", as: "otherThree" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;
    const visibleIds = [
      s.inst("hybrid").instanceId,
      s.inst("tamer").instanceId,
      s.inst("otherOne").instanceId,
      s.inst("otherTwo").instanceId,
      s.inst("otherThree").instanceId,
    ];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bokomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" &&
        latest.sourceCardId === "BT7-081"
      );
    });

    const hybridDecision = s.decisions.at(-1)!.req;
    expect(hybridDecision.options?.candidateInstanceIds).toEqual([
      s.inst("hybrid").instanceId,
      s.inst("otherOne").instanceId,
    ]);
    expect(hybridDecision.options?.visibleInstanceIds).toEqual(visibleIds);
    expect(hybridDecision.options?.visibleCards).toEqual([
      { instanceId: s.inst("hybrid").instanceId, cardId: "BT7-011" },
      { instanceId: s.inst("tamer").instanceId, cardId: "BT7-085" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT7-008" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT7-009" },
      { instanceId: s.inst("otherThree").instanceId, cardId: "BT7-010" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hybridDecision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("hybrid").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" &&
        latest.decisionId !== hybridDecision.decisionId
      );
    });

    const tamerDecision = s.decisions.at(-1)!.req;
    expect(tamerDecision.sourceCardId).toBe("BT7-081");
    expect(tamerDecision.options?.candidateInstanceIds).toEqual([s.inst("tamer").instanceId]);
    expect(tamerDecision.options?.visibleInstanceIds).toEqual(visibleIds);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: tamerDecision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("tamer").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("otherThree").instanceId, s.inst("otherOne").instanceId, s.inst("otherTwo").instanceId];
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT7-008" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT7-009" },
      { instanceId: s.inst("otherThree").instanceId, cardId: "BT7-010" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: bottomOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision === undefined && s.state.players[0]!.deck[0]?.instanceId === bottomOrder[0],
    );

    expect(s.decisions.every(({ req }) => req.kind !== "chooseTargets")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
  });

  it("gains 2 memory when one of its Tamers digivolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-081", as: "bokomon" },
          { card: "BT7-085", as: "takuya" },
        ],
        hand: [{ card: "BT7-011", as: "hybrid" }],
        deck: ["BT7-008"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("hybrid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT7-011" && s.state.memory === 3);

    expect(s.state.memory).toBe(3);
    expect(s.perm("takuya").stack.some((card) => card.cardId === "BT7-085")).toBe(true);
  });

  it("gains memory only once when multiple Tamers digivolve in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-081", as: "bokomon" },
          { card: "BT7-085", as: "firstTamer" },
          { card: "BT7-085", as: "secondTamer" },
        ],
        hand: [
          { card: "BT7-011", as: "firstHybrid" },
          { card: "BT7-011", as: "secondHybrid" },
        ],
        deck: ["BT7-008", "BT7-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstTamer").permanentId,
        instanceId: s.inst("firstHybrid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("firstTamer").topCard.instanceId === s.inst("firstHybrid").instanceId && s.state.memory === 5,
    );
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondTamer").permanentId,
        instanceId: s.inst("secondHybrid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("secondTamer").topCard.instanceId === s.inst("secondHybrid").instanceId && s.state.memory === 3,
    );

    expect(s.state.memory).toBe(3);
  });
});
