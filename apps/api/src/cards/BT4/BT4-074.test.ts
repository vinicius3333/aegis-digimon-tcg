import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-074.js";

describe("BT4-074 Darkdramon", () => {
  it("returns up to five [D-Brigade] Digimon from trash to the deck top and gains 2 memory each", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-074", as: "darkdramon" }],
          deck: [{ card: "BT1-009", as: "existingTop" }],
          trash: [
            { card: "BT3-059", as: "commandramon" },
            { card: "BT4-063", as: "commandramonBt4" },
            { card: "BT4-080", as: "unrelated" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const returnedIds = [s.inst("commandramon").instanceId, s.inst("commandramonBt4").instanceId];
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => returnedIds.every((id) => player.deck.some((card) => card.instanceId === id)) && s.state.memory === 4,
    );

    expect(player.trash).toHaveLength(1);
    expect(player.trash[0]?.instanceId).toBe(s.inst("unrelated").instanceId);
    expect(player.deck.slice(0, 2).map((card) => card.instanceId)).toEqual(expect.arrayContaining(returnedIds));
    expect(player.deck[2]?.instanceId).toBe(s.inst("existingTop").instanceId);
    expect(s.state.memory).toBe(4);
    const played = player.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("darkdramon").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });

  it("separates which D-Brigade cards return from their top-to-bottom order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-074", as: "darkdramon" }],
          deck: [{ card: "BT1-009", as: "existing" }],
          trash: [
            { card: "BT3-059", as: "first" },
            { card: "BT4-063", as: "second" },
            { card: "BT3-059", as: "third" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 13;
    const chosenIds = [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId];
    const deckOrder = [chosenIds[2]!, chosenIds[0]!, chosenIds[1]!];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    expect(selection.options).toMatchObject({ min: 0, max: 3 });
    expect(selection.options?.candidateInstanceIds).toEqual(chosenIds);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: chosenIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.sourceCardId).toBe("BT4-074");
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: chosenIds[0]!, cardId: "BT3-059" },
      { instanceId: chosenIds[1]!, cardId: "BT4-063" },
      { instanceId: chosenIds[2]!, cardId: "BT3-059" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: deckOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck[0]?.instanceId === deckOrder[0] && s.state.memory === 6);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      ...deckOrder,
      s.inst("existing").instanceId,
    ]);
    expect(s.state.memory).toBe(6);
  });
});
