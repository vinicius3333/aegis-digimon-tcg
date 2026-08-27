import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-048.js";

describe("BT1-048 Patamon", () => {
  it("adds every revealed yellow Tamer to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-048", as: "patamon" }],
          deck: [
            { card: "BT1-087", as: "yellowTamerA" },
            { card: "BT1-088", as: "yellowTamerB" },
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-049", as: "digimon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const expected = [s.inst("yellowTamerA").instanceId, s.inst("yellowTamerB").instanceId];
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => expected.every((id) => player.hand.some((card) => card.instanceId === id)));

    expect(player.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("redTamer").instanceId, s.inst("digimon").instanceId]),
    );
  });

  it("reveals as many cards as possible when fewer than four remain", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-048", as: "patamon" }],
          deck: [
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-049", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yellowTamer").instanceId));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("lets the player order the remaining revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-048", as: "patamon" }],
          deck: [
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-049", as: "first" },
            { card: "BT1-050", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const decision = s.decisions.at(-1)!.req;
    const order = [s.inst("second").instanceId, s.inst("first").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === order.join(","),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(order);
  });
});
