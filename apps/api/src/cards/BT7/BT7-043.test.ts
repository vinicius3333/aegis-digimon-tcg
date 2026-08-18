import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-043.js";

describe("BT7-043 Gotsumon", () => {
  it("may reveal a green Digimon from hand and place it on top of the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-043", as: "gotsumon" },
            { card: "BT1-064", as: "greenDigimon" },
          ],
          deck: [{ card: "BT1-009", as: "oldTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const greenDigimonId = s.inst("greenDigimon").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck[0]?.instanceId === greenDigimonId);

    expect(player.deck.map((card) => card.instanceId)).toEqual([greenDigimonId, s.inst("oldTop").instanceId]);
    expect(player.deck[0]?.faceUp).toBe(false);
  });
});
