import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type CardSpec } from "../../engine/testkit/harness.js";
import "./BT4-023.js";

describe("BT4-023 Strabimon", () => {
  it("adds a Hybrid Digimon and blue Tamer from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-023", as: "source" }],
          deck: [{ card: "BT4-025", as: "hybrid" }, { card: "BT4-093", as: "tamer" }, "BT4-026"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("hybrid").instanceId, s.inst("tamer").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });

  it("adds a qualifying Hybrid even when no blue Tamer was revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-023", as: "source" }],
          deck: [{ card: "BT4-025", as: "hybrid" }, "BT4-026", "BT4-012"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId));

    expect(player.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });
});

describe("BT4-023 Strabimon — KB Q&A rulings", () => {
  const playStrabimonRevealing = async (deck: CardSpec[]) => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-023", as: "strabimon" }], deck } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length < deck.length && s.state.pendingDecision === undefined);
    return { s, handCardIds: s.state.players[0]!.hand.map((card) => card.cardId).sort() };
  };

  it("adds at most 1 Hybrid Digimon card and 1 blue Tamer card from the revealed cards (Q1179)", async () => {
    const { s, handCardIds } = await playStrabimonRevealing(["BT4-025", "BT4-009", "BT4-093"]);
    const hybridIds = ["BT4-009", "BT4-025"];

    expect(handCardIds).toHaveLength(2);
    expect(handCardIds).toContain("BT4-093");
    expect(handCardIds.filter((cardId) => hybridIds.includes(cardId))).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      hybridIds.filter((cardId) => !handCardIds.includes(cardId)),
    );

    const nonBlueTamer = await playStrabimonRevealing(["BT4-025", "BT1-085", "BT4-026"]);
    expect(nonBlueTamer.handCardIds).toEqual(["BT4-025"]);
  });

  it("adds the blue Tamer card even when no Hybrid Digimon card was revealed (Q1180)", async () => {
    const { s, handCardIds } = await playStrabimonRevealing(["BT4-093", "BT4-026", "BT1-085"]);

    expect(handCardIds).toEqual(["BT4-093"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-085", "BT4-026"]);
  });
});
