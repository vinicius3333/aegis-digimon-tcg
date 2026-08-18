import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-032.js";

describe("BT11-032 UlforceVeedramon", () => {
  it("plays a blue Tamer from hand without paying its cost when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-029", as: "base" }],
        hand: [
          { card: "BT11-032", as: "ulforce" },
          { card: "BT11-090", as: "tamer" },
        ],
        deck: ["BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("ulforce").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId));

    expect(s.state.memory).toBe(6);
  });

  it("unsuspends when its controller plays a blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }],
        hand: [{ card: "BT11-090", as: "tamer" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("ulforce").isSuspended);

    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  it("returns up to level 3 plus one level for each blue Tamer when it unsuspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-032", as: "ulforce", suspended: true },
          "BT11-090",
          "BT11-112",
        ],
        hand: [{ card: "BT11-090", as: "playedTamer" }],
      },
      1: { battleArea: [{ card: "BT11-028", as: "level5" }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    const targetId = s.perm("level5").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedTamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
  });
});
