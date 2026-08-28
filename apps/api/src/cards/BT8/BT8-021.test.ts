import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-021.js";
import "./BT8-021.js";

describe("BT8-021 Veemon", () => {
  it("requires exactly two colors for the blue card filter", () => {
    const revealAdd = compiled.effects[0]!.actions[0] as any;
    expect(revealAdd.add[0].filter).toMatchObject({
      colors: ["Blue"],
      multicolor: true,
      colorCount: 2,
    });
  });

  it("adds a revealed two-color blue card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-021", as: "source" }],
          deck: [{ card: "BT8-023", as: "multicolor" }, "BT8-020", "BT8-022", "BT8-027"],
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

  it("can add a two-color blue Option but not a card only treated as blue in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-021", as: "source" }],
          deck: [
            { card: "BT17-094", as: "blueOption" },
            { card: "BT3-040", as: "treatedAsBlue" },
            "BT8-020",
            "BT8-022",
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

    expect(player.hand.some((card) => card.instanceId === s.inst("blueOption").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("treatedAsBlue").instanceId)).toBe(false);
  });

  it("does not add a three-color blue card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-021", as: "source" }],
          deck: [{ card: "AD1-006", as: "threeColorBlue" }, "BT8-020", "BT8-022", "BT8-027"],
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

    expect(player.hand.some((card) => card.instanceId === s.inst("threeColorBlue").instanceId)).toBe(false);
    expect(player.deck).toHaveLength(4);
  });

  it("digivolves for 0 from a green level-2 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-004", as: "greenEgg" }],
        hand: [{ card: "BT8-021", as: "veemon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenEgg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("greenEgg").topCard.instanceId).toBe(s.inst("veemon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
