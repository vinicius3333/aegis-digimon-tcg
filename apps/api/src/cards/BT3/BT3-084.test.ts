import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-084.js";

describe("BT3-084 Raremon", () => {
  it("adds one revealed Option to hand and trashes the remaining cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-084", as: "source" }],
          deck: [
            { card: "BT3-097", as: "option" },
            { card: "BT3-085", as: "remainderA" },
            { card: "BT3-086", as: "remainderB" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const optionId = s.inst("option").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === optionId) && player.trash.length === 2);
    expect(player.deck).toHaveLength(0);
  });
});
