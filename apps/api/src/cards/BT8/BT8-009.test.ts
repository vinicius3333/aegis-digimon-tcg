import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-009.js";
import "./BT8-105.js";

describe("BT8-009 Hawkmon", () => {
  it("adds a revealed two-color red card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-009", as: "source" }],
          deck: [{ card: "BT8-011", as: "multicolor" }, "BT8-010", "BT8-013", "BT8-014"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });

  it("can add a two-color red Option but not a card only treated as red in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-009", as: "source" }],
          deck: [{ card: "BT8-105", as: "redOption" }, { card: "BT6-061", as: "treatedAsRed" }, "BT8-010", "BT8-013"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(player.hand.some((card) => card.instanceId === s.inst("redOption").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("treatedAsRed").instanceId)).toBe(false);
  });

  it("digivolves for 0 from a yellow level-2 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-003", as: "yellowEgg" }],
        hand: [{ card: "BT8-009", as: "hawkmon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowEgg").permanentId,
        instanceId: s.inst("hawkmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("yellowEgg").topCard.instanceId).toBe(s.inst("hawkmon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
