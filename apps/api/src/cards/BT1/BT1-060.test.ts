import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-060.js";

describe("BT1-060 MagnaAngemon", () => {
  it("places the top deck card on top of security", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-060", as: "magnaAngemon" }],
        deck: [
          { card: "BT1-049", as: "recovered" },
          { card: "BT1-051", as: "leftInDeck" },
        ],
        security: [{ card: "BT1-050", as: "existing" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    const recoveredId = s.inst("recovered").instanceId;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnaAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.security.some((card) => card.instanceId === recoveredId));

    expect(player.security).toHaveLength(2);
    expect(player.security[0]?.instanceId).toBe(recoveredId);
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("leftInDeck").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gives its host +1000 DP for every 3 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-061", under: ["BT1-060"], as: "host", dp: 6000 }],
        security: ["BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049"],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("grants no inherited DP with 2 security cards (Q919)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-061", under: ["BT1-060"], as: "host", dp: 6000 }],
        security: ["BT1-049", "BT1-049"],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("counts only complete groups of 3 security and applies only during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-061", under: ["BT1-060"], as: "host", dp: 6000 }],
        security: ["BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049"],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(6000);
  });
});
