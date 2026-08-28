import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-096.js";

describe("BT4-096 Izzy Izumi", () => {
  it("sets memory to 3 at the start of the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-096", as: "izzy" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("izzy"));
    expect(s.state.memory).toBe(3);
  });

  it("does not reset memory when the gauge is already above 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-096", as: "izzy" }] } });
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("izzy"));
    expect(s.state.memory).toBe(3);
  });

  it("gains 1 memory when all three revealed cards are black and returns them to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-096", as: "izzy" }],
          deck: [
            { card: "BT2-052", as: "hagurumon" },
            { card: "BT2-053", as: "keramon" },
            { card: "BT2-054", as: "gotsumon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const revealedIds = ["hagurumon", "keramon", "gotsumon"].map((alias) => s.inst(alias).instanceId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("izzy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && player.deck.every((card) => card.faceUp === false));

    expect(s.state.memory).toBe(1);
    expect(player.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining(revealedIds));
    expect(player.deck).toHaveLength(3);
  });

  it("does not gain memory when any revealed card is not black", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-096", as: "izzy" }],
          deck: ["BT2-052", "BT4-016", "BT2-054"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("izzy").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("izzy").instanceId),
    );

    expect(s.state.memory).toBe(6);
  });

  it("uses an order decision with visible identities for the three revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-096", as: "izzy" }],
          deck: [
            { card: "BT2-052", as: "first" },
            { card: "BT2-053", as: "second" },
            { card: "BT2-054", as: "third" },
            { card: "BT1-009", as: "sentinel" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;
    const orderedIds = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
    const sentinelId = s.inst("sentinel").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("izzy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "orderCards" &&
        latest.sourceCardId === "BT4-096"
      );
    });

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.visibleCards).toEqual([
      { instanceId: s.inst("first").instanceId, cardId: "BT2-052" },
      { instanceId: s.inst("second").instanceId, cardId: "BT2-053" },
      { instanceId: s.inst("third").instanceId, cardId: "BT2-054" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order: orderedIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck[0]?.instanceId === orderedIds[0]);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([...orderedIds, sentinelId]);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-096", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
