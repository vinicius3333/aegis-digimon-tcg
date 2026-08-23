import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-028.js";

describe("BT8-028 CaptainHookmon", () => {
  it("draws and gains memory when the opponent plays a level 5 or higher Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-028", as: "captain" }], deck: [{ card: "BT8-033", as: "drawn" }] },
      1: { battleArea: ["BT8-073"], hand: [{ card: "BT8-078", as: "played" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("does not trigger when the opponent digivolves into level 5", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-028", as: "captain" }], deck: [{ card: "BT8-033", as: "wouldDraw" }] },
      1: {
        battleArea: [{ card: "BT8-026", as: "base" }],
        hand: [{ card: "BT8-028", as: "evolving" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("does not trigger when a level-5 Digimon moves from breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-028", as: "captain" }], deck: [{ card: "BT8-033", as: "wouldDraw" }] },
      1: { breeding: { card: "BT8-028", as: "mover" } },
    });
    s.state.turnSeat = 1;
    s.state.phase = Phase.Breeding;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
