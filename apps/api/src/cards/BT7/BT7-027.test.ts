import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-027.js";

describe("BT7-027 Whamon", () => {
  it("plays a level 3 from a digivolution stack for free, then may place a blue Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-027", as: "whamon" },
            { card: "BT1-027", as: "blueFromHand" },
          ],
          battleArea: [{ card: "BT1-020", as: "host", suspended: true, under: [{ card: "BT1-027", as: "stackLv3" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const stackLv3Id = s.inst("stackLv3").instanceId;
    const blueFromHandId = s.inst("blueFromHand").instanceId;
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.battleArea.some((permanent) => permanent.topCard?.instanceId === stackLv3Id) &&
        s.perm("host").stack.some((card) => card.instanceId === blueFromHandId),
    );

    expect(player.battleArea.find((permanent) => permanent.topCard?.instanceId === stackLv3Id)?.isSuspended).toBe(
      false,
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([blueFromHandId]);
    expect(s.state.memory).toBe(0);
  });
});
