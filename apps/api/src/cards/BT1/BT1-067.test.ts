import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-067.js";

describe("BT1-067 Palmon", () => {
  it("matches the catalog and exact On Play reveal IR contract", () => {
    expect(getCardDefinition("BT1-067")).toMatchObject({
      cardId: "BT1-067",
      nameEn: "Palmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Vegetation"],
      effectText:
        "[On Play] Reveal 3 cards from the top of your deck. Add 1 level 4 Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [{ filter: { kind: ["Digimon"], levels: [4] }, count: 1, to: "hand" }],
              rest: "deckBottomAnyOrder",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("adds one revealed level 4 Digimon to hand, including a non-green card (Q922)", async () => {
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

    expect(getCardDefinition("BT1-016")?.colors).toEqual(["Red"]);
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

  it("digivolves legally from a green level 2 for 0 memory and draws", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "base" },
        hand: [{ card: "BT1-067", as: "palmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("palmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("palmon").instanceId);

    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("rejects evolution from a non-green level 2", () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "redBase" }, hand: [{ card: "BT1-067", as: "palmon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("palmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
