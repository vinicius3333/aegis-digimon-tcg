import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-058.js";

describe("BT10-058 Monitamon", () => {
  it("adds two eligible black Twilight cards from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-058", as: "source" }],
          deck: [{ card: "BT10-061", as: "one" }, { card: "BT10-066", as: "two" }, "BT10-062", "BT10-064"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("one").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("two").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });

  it("requires both eligible cards and exposes all four revealed cards to the decision", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-058", as: "source" }],
        deck: [
          { card: "BT10-061", as: "first" },
          { card: "BT10-066", as: "second" },
          { card: "BT5-042", as: "yellowKnightmon" },
          { card: "BT10-064", as: "ineligible" },
        ],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const eligibleIds = [s.inst("first").instanceId, s.inst("second").instanceId];
    expect(request.sourceCardId).toBe("BT10-058");
    expect(request.options).toMatchObject({ min: 2, max: 2 });
    expect(new Set(request.options?.candidateInstanceIds)).toEqual(new Set(eligibleIds));
    expect(new Set(request.options?.visibleInstanceIds)).toEqual(
      new Set([...eligibleIds, s.inst("yellowKnightmon").instanceId, s.inst("ineligible").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: eligibleIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);
    assertNoLoudGap(s);
  });

  it("adds the only eligible card and bottoms the other three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-058", as: "source" }],
          deck: [
            { card: "BT10-066", as: "eligible" },
            { card: "BT5-042", as: "yellowKnightmon" },
            "BT10-062",
            "BT10-064",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId) &&
        s.state.players[0]!.deck.length === 3,
    );

    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
