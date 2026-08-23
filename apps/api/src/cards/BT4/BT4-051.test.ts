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
  });
});
