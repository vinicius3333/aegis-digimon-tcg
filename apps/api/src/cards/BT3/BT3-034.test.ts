import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-034.js";

describe("BT3-034 Lopmon", () => {
  it("may add the top security card to hand, then draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-034", as: "lopmon" }],
          security: [{ card: "BT1-009", as: "securityTop" }],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const player = s.state.players[0] as PlayerState;
    const securityTopId = s.inst("securityTop").instanceId;
    const deckTopId = s.inst("deckTop").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === securityTopId) &&
        player.hand.some((card) => card.instanceId === deckTopId),
    );

    expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([securityTopId, deckTopId]));
    expect(player.security).toHaveLength(0);
    expect(player.deck).toHaveLength(0);
  });
});
