import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-033.js";

describe("BT8-033 Armadillomon", () => {
  it("adds a revealed two-color yellow card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-033", as: "source" }],
          deck: [{ card: "BT8-037", as: "multicolor" }, "BT8-034", "BT8-035", "BT8-036"],
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

  it("can add a two-color yellow Option but not a card only treated as yellow in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-033", as: "source" }],
          deck: [
            { card: "BT12-104", as: "yellowOption" },
            { card: "BT3-014", as: "treatedAsYellow" },
            "BT8-034",
            "BT8-035",
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
    await settle();

    expect(player.hand.some((card) => card.instanceId === s.inst("yellowOption").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("treatedAsYellow").instanceId)).toBe(false);
  });

  it("digivolves for 0 from a blue level-2 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-002", as: "blueEgg" }],
        hand: [{ card: "BT8-033", as: "armadillomon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("blueEgg").topCard.instanceId).toBe(s.inst("armadillomon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
