import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-03 Kyubimon", () => {
  it("reveals three cards, recovers a Renamon-line card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST22-03", as: "kyubimon" }],
          deck: [{ card: "ST22-02", as: "eligible" }, "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kyubimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("eligible").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });
});
