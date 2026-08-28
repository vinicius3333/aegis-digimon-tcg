import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-092.js";

describe("BT6-092 Menoa Bellucci", () => {
  it("may suspend after playing Eosmon to reveal 3, add an eligible card, and bottom-deck the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-092", as: "menoa" }],
          hand: [{ card: "BT6-085", as: "playedEosmon" }],
          deck: [
            { card: "BT6-083", as: "added" },
            { card: "BT6-087", as: "secondEligible" },
            { card: "BT6-074", as: "bottomOne" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("added").instanceId));

    expect(s.perm("menoa").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("added").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondEligible").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("secondEligible").instanceId,
      s.inst("bottomOne").instanceId,
    ]);
  });

  it("publishes every revealed card identity to the Menoa selection UI", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-092", as: "menoa" }],
          hand: [{ card: "BT6-085", as: "playedEosmon" }],
          deck: [
            { card: "BT6-083", as: "eligible" },
            { card: "BT6-074", as: "otherOne" },
            { card: "BT6-076", as: "otherTwo" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("playedEosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "optional" &&
        latest.sourceCardId === "BT6-092"
      );
    });
    const optional = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" &&
        latest.sourceCardId === "BT6-092"
      );
    });

    const selection = s.decisions.at(-1)!.req;
    expect(selection.options?.candidateInstanceIds).toEqual([s.inst("eligible").instanceId]);
    expect(selection.options?.visibleCards).toEqual([
      { instanceId: s.inst("eligible").instanceId, cardId: "BT6-083" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT6-074" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT6-076" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("eligible").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("otherTwo").instanceId, s.inst("otherOne").instanceId];
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT6-074" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT6-076" },
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

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
  });

  it("prevents opposing Tamers from unsuspending while Eosmon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-092", as: "menoa" },
          { card: "BT6-085", as: "eosmon" },
        ],
      },
      1: { battleArea: [{ card: "BT6-087", as: "opponentTamer", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-092", as: "security", faceUp: true }] } });
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-092")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("sets memory to 3 at turn start only when it is 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT6-092", as: "menoa" }] } });
    low.state.memory = 2;
    await advance(low.engine).fire(EffectTiming.OnStartTurn, low.perm("menoa"));
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT6-092", as: "menoa" }] } });
    high.state.memory = 4;
    await advance(high.engine).fire(EffectTiming.OnStartTurn, high.perm("menoa"));
    expect(high.state.memory).toBe(4);
  });
});
