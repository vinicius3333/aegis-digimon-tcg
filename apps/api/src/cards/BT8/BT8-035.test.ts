import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-035.js";

describe("BT8-035 Candlemon", () => {
  it("gains 1 memory when another purple Digimon is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-041", as: "host", under: ["BT8-035"] }],
        hand: [{ card: "BT8-073", as: "played" }],
      },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5 - 3 + 1);
    expect(s.state.memory).toBe(3);
  });

  it("gains memory only once after two purple Digimon are played in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-041", as: "host", under: ["BT8-035"] }],
        hand: [
          { card: "BT8-073", as: "first" },
          { card: "BT8-073", as: "second" },
        ],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.memory).toBe(5);
  });

  it("does not gain memory when the opponent plays a purple Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-041", as: "host", under: ["BT8-035"] }] },
      1: { hand: [{ card: "BT8-073", as: "opponentPlay" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.memory).toBe(2);
  });

  it("digivolves for 0 from a purple level-2 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-006", as: "purpleEgg" }],
        hand: [{ card: "BT8-035", as: "candlemon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleEgg").permanentId,
        instanceId: s.inst("candlemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("purpleEgg").topCard.instanceId).toBe(s.inst("candlemon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
