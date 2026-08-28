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
