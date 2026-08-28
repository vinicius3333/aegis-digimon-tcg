import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-044.js";

describe("BT7-044 Betamon", () => {
  it("adds a green level 4 Digimon from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-044", as: "source" }],
          deck: [{ card: "BT7-047", as: "levelFour" }, "BT7-045", "BT7-046"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("levelFour").instanceId));
    expect(player.deck).toHaveLength(2);
  });
});
