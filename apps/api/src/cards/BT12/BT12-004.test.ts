import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-004.js";

describe("BT12-004 TorikaraBallmon", () => {
  it("gives its host +2000 DP when a green Digimon is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-047", as: "host", under: ["BT12-004"] }],
        hand: [{ card: "BT12-047", as: "played" }],
      },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("host").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === before + 2000);
    expect(s.perm("host").currentDP).toBe(before + 2000);
  });

  it("does not trigger for a non-green Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-047", as: "host", under: ["BT12-004"] }],
        hand: [{ card: "BT1-009", as: "played" }],
      },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("host").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-009"));
    expect(s.perm("host").currentDP).toBe(before);
  });

  it("does not trigger when the opponent plays a green Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-047", as: "host", under: ["BT12-004"] }] },
      1: { hand: [{ card: "BT12-047", as: "played" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("host").currentDP;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-047"));
    expect(s.perm("host").currentDP).toBe(before);
  });

  it("applies the host bonus only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-047", as: "host", under: ["BT12-004"] }],
        hand: [
          { card: "BT12-047", as: "first" },
          { card: "BT12-047", as: "second" },
        ],
      },
    });
    s.state.memory = 20;
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("host").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === before + 2000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.perm("host").currentDP).toBe(before + 2000);
  });
});
