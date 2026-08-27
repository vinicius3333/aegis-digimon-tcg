import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-010.js";

describe("BT1-010 Agumon", () => {
  it("adds a non-red revealed Tamer to hand and returns the other cards to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-010", as: "agumon" }],
          deck: [{ card: "BT1-086", as: "tamer" }, "BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const tamerId = s.inst("tamer").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === tamerId));

    expect(player.deck).toHaveLength(4);
    expect(player.hand.some((card) => card.instanceId === tamerId)).toBe(true);
  });

  it("reveals as many cards as possible when fewer than five remain", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-010", as: "agumon" }],
          deck: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("places all revealed cards at the bottom when no Tamer is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-010", as: "agumon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-010"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-012",
      "BT1-013",
      "BT1-014",
      "BT1-015",
    ]);
  });

  it("digivolves from a red level 2 without firing its On Play effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [{ card: "BT1-010", as: "agumon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-086"],
      },
    });

    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("agumon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-086"]);
  });

  it("lets the player order the remaining revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-010", as: "agumon" }],
          deck: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-012", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
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
