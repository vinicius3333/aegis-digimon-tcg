import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-009.js";

describe("BT6-009 Huckmon", () => {
  it("offers every unchosen revealed card for explicit deck-bottom ordering", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT6-009", as: "source" }],
        deck: [
          { card: "BT6-011", as: "huckmon" },
          { card: "BT6-082", as: "sistermon" },
          { card: "BT6-012", as: "restOne" },
          { card: "BT6-013", as: "restTwo" },
          { card: "BT6-014", as: "restThree" },
        ],
      },
    }, { autoSelectCards: false, autoOrderCards: false });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const search = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: search.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [s.inst("huckmon").instanceId, s.inst("sistermon").instanceId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.state.pendingDecision!;
    const offered = [
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
      s.inst("restThree").instanceId,
    ];
    const requestedOrder = [...offered].reverse();
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT6-009");
    expect(JSON.parse(ordering.payloadJson)).toMatchObject({
      candidateInstanceIds: offered,
      visibleInstanceIds: offered,
      visibleCards: [
        { instanceId: offered[0], cardId: "BT6-012" },
        { instanceId: offered[1], cardId: "BT6-013" },
        { instanceId: offered[2], cardId: "BT6-014" },
      ],
      min: 3,
      max: 3,
    });

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: requestedOrder },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined &&
      s.state.players[0]!.deck[0]?.instanceId === requestedOrder[0]);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(requestedOrder);
  });

  it("adds up to two Huckmon, Jesmon or Sistermon Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-009", as: "source" }], deck: [
      { card: "BT6-011", as: "huckmon" }, { card: "BT6-082", as: "sistermon" },
      "BT6-012", "BT6-013", "BT6-014",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("huckmon").instanceId, s.inst("sistermon").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("may decline every eligible revealed Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-009", as: "source" }], deck: [
      { card: "BT6-011", as: "huckmon" }, { card: "BT6-082", as: "sistermon" },
      "BT6-012", "BT6-013", "BT6-014",
    ] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(JSON.parse(choice.payloadJson)).toMatchObject({ min: 0, max: 2 });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 5);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("huckmon").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sistermon").instanceId)).toBe(false);
  });
});
