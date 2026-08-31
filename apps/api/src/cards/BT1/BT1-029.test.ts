import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-029.js";

describe("BT1-029 Gabumon", () => {
  it("draws one card on play", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-029", as: "gabumon" }],
        deck: [
          { card: "BT1-030", as: "drawn" },
          { card: "BT1-031", as: "remaining" },
        ],
      },
    });
    const player = s.state.players[0] as PlayerState;
    const drawnId = s.inst("drawn").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === drawnId));

    expect(player.deck).toHaveLength(1);
    expect(player.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
  });

  it("does not activate its On Play effect when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-003", as: "base" }],
        hand: [{ card: "BT1-029", as: "gabumon" }],
        deck: [{ card: "BT1-030", as: "drawn" }, { card: "BT1-031", as: "remaining" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gabumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gabumon").instanceId);

    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
  });
});
