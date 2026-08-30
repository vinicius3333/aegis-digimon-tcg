import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-072.js";

describe("BT8-072 DemiDevimon", () => {
  it("adds a revealed Tamer and trashes a revealed purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-072", as: "source" }],
          deck: [
            { card: "BT8-093", as: "tamer" },
            { card: "BT8-080", as: "purple" },
            { card: "BT8-034", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((c) => c.instanceId === s.inst("tamer").instanceId) &&
        player.trash.some((c) => c.instanceId === s.inst("purple").instanceId),
    );
    expect(player.trash.some((card) => card.instanceId === s.inst("remainder").instanceId)).toBe(false);
    expect(player.deck.map((c) => c.instanceId)).toEqual([s.inst("remainder").instanceId]);
  });

  it("digivolves from a purple level-2 Digimon for 0 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-008", as: "base" }], hand: [{ card: "BT8-072", as: "evolving" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-072");

    expect(s.perm("base").topCard.cardId).toBe("BT8-072");
    expect(s.state.memory).toBe(1);
  });
});
