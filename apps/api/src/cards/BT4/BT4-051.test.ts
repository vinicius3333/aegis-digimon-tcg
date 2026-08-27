import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-051.js";

describe("BT4-051 DoKunemon", () => {
  it("adds a revealed Digimon with Digi-Burst to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-051", as: "source" }],
          deck: [{ card: "BT4-054", as: "digiBurst" }, "BT4-052", "BT4-053"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const addedId = s.inst("digiBurst").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === addedId));
    expect(player.deck).toHaveLength(2);
    expect(player.deck.map((card) => card.cardId).sort()).toEqual(["BT4-052", "BT4-053"].sort());
  });

  it("places all revealed cards at the bottom when no Digi-Burst Digimon is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-051", as: "source" }],
          deck: ["BT4-052", "BT4-053", "BT4-055"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck.length === 3);

    expect(player.hand.some((card) => card.cardId === "BT4-052")).toBe(false);
    expect(player.deck.map((card) => card.cardId).sort()).toEqual(["BT4-052", "BT4-053", "BT4-055"].sort());
  });

  it("does not trigger its On Play effect when it is digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT4-004", as: "base" },
          hand: [{ card: "BT4-051", as: "evolving" }],
          deck: ["BT4-053", "BT4-054"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-051");

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT4-054"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-053")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-054")).toBe(false);
  });
});
