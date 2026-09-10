import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-048.js";

describe("BT1-048 Patamon", () => {
  it("matches the catalog and exact reveal/filter IR contract", () => {
    expect(getCardDefinition("BT1-048")).toMatchObject({
      cardId: "BT1-048",
      set: "BT1",
      nameEn: "Patamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mammal"],
      effectText:
        "[On Play] Reveal 4 cards from the top of your deck. Add all yellow Tamer cards among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-048",
      nameJp: "パタモン",
    });
    expect(getCardDefinition("BT1-048")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-048")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 4,
              add: [{ filter: { kind: ["Tamer"], colors: ["Yellow"] }, count: "all", to: "hand" }],
              rest: "deckBottomAnyOrder",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("adds every revealed yellow Tamer to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-048", as: "patamon" }],
          deck: [
            { card: "BT1-087", as: "yellowTamerA" },
            { card: "BT10-089", as: "yellowTamerB" },
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

  it("does not activate its On Play reveal while digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-006", as: "base" }],
        hand: [{ card: "BT1-048", as: "patamon" }],
        deck: [
          { card: "BT1-010", as: "evolutionDraw" },
          { card: "BT1-087", as: "wouldBeYellowTamer" },
          { card: "BT1-049", as: "remainingA" },
          { card: "BT1-050", as: "remainingB" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("patamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("patamon").instanceId);

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-006"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evolutionDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("wouldBeYellowTamer").instanceId,
      s.inst("remainingA").instanceId,
      s.inst("remainingB").instanceId,
    ]);
  });

  it("rejects evolution from a red level 2 despite matching level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "redBase" }], hand: [{ card: "BT1-048", as: "patamon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("patamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
