import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-079.js";

describe("BT4-079 Labramon", () => {
  it("draws one card and then trashes one card from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT4-079", as: "source" },
            { card: "BT4-080", as: "discard" },
          ],
          deck: [{ card: "BT4-081", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(0);
  });
});
