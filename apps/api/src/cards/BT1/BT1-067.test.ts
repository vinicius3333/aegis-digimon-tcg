import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-067.js";

describe("BT1-067 Palmon", () => {
  it("adds one revealed level 4 Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-067", as: "palmon" }],
          deck: [
            { card: "BT1-016", as: "levelFour" },
            { card: "BT1-068", as: "levelThree" },
            { card: "BT1-074", as: "levelFive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const levelFourId = s.inst("levelFour").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === levelFourId));

    expect(player.deck).toHaveLength(2);
  });

  it("lets the player order the remaining revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-067", as: "palmon" }],
          deck: [
            { card: "BT1-016", as: "levelFour" },
            { card: "BT1-068", as: "first" },
            { card: "BT1-074", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({
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

  it("reveals as many cards as possible when fewer than three remain", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-067", as: "palmon" }],
          deck: [
            { card: "BT1-016", as: "levelFour" },
            { card: "BT1-068", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levelFour").instanceId));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });
});
