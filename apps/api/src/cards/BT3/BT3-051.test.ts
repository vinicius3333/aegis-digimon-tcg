import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-051.js";

describe("BT3-051 Dokugumon", () => {
  it("adds one level 5 and one level 6 Digimon, then trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-051", as: "source" }],
          deck: [
            { card: "BT3-052", as: "levelFive" },
            { card: "BT3-057", as: "levelSix" },
            { card: "BT3-050", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("levelFive").instanceId, s.inst("levelSix").instanceId];
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => added.every((id) => player.hand.some((card) => card.instanceId === id)) && player.trash.length === 1,
    );
    expect(player.trash[0]?.instanceId).toBe(s.inst("remainder").instanceId);
    expect(player.deck).toHaveLength(0);
  });

  it("adds whichever eligible level is revealed when the other is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-051", as: "source" }],
          deck: [
            { card: "BT3-052", as: "levelFive" },
            { card: "BT3-050", as: "remainderOne" },
            { card: "BT3-050", as: "remainderTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => player.hand.some((card) => card.instanceId === s.inst("levelFive").instanceId) && player.trash.length === 2,
    );
    expect(player.hand.some((card) => card.cardId === "BT3-057")).toBe(false);
    expect(player.trash).toHaveLength(2);
  });

  it("can add two BT17-068 copies because each revealed copy counts as level 5 and level 6", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-051", as: "source" }],
          deck: [
            { card: "BT17-068", as: "first" },
            { card: "BT17-068", as: "second" },
            { card: "BT3-050", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.length === 2 && player.trash.length === 1);

    expect(player.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(player.trash[0]?.instanceId).toBe(s.inst("remainder").instanceId);
  });
});

describe("BT3-051 Dokugumon — KB Q&A rulings", () => {
  const playDokugumonRevealing = async (deck: { card: string; as: string }[]) => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-051", as: "source" }], deck } }, { autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    const player = s.state.players[0] as PlayerState;
    await settle(() => player.deck.length === 0 && player.hand.length + player.trash.length === 3);
    return { s, player };
  };

  it("adds a revealed level 6 Digimon even when no level 5 Digimon is revealed (Q1085)", async () => {
    const { s, player } = await playDokugumonRevealing([
      { card: "BT3-050", as: "levelFour" },
      { card: "BT3-057", as: "levelSix" },
      { card: "BT3-050", as: "otherLevelFour" },
    ]);

    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("levelSix").instanceId]);
    expect(player.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("levelFour").instanceId, s.inst("otherLevelFour").instanceId].sort(),
    );
  });

  it("adds two revealed Mephistomon because each counts as both level 5 and level 6 (Q2827)", async () => {
    const control = await playDokugumonRevealing([
      { card: "BT3-052", as: "firstRapidmon" },
      { card: "BT3-052", as: "secondRapidmon" },
      { card: "BT3-050", as: "remainder" },
    ]);
    expect(control.player.hand).toHaveLength(1);
    expect(control.player.trash).toHaveLength(2);

    const { s, player } = await playDokugumonRevealing([
      { card: "BT17-068", as: "firstMephistomon" },
      { card: "BT17-068", as: "secondMephistomon" },
      { card: "BT3-050", as: "remainder" },
    ]);

    expect(player.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("firstMephistomon").instanceId, s.inst("secondMephistomon").instanceId].sort(),
    );
    expect(player.trash.map((card) => card.instanceId)).toEqual([s.inst("remainder").instanceId]);
  });
});
