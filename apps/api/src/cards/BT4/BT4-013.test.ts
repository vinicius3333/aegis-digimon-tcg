import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-013.js";

describe("BT4-013 BurningGreymon", () => {
  it("digivolves onto a red Tamer for 3 memory and has +3000 DP on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("burning").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").currentDP === 9000);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-013");
    expect(s.perm("tamer").currentDP).toBe(9000);
  });

  it("cannot use a non-red Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("burning").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-086");
  });

  it("does not get its Your Turn DP bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-013", as: "burning" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("burning").currentDP).toBe(s.perm("burning").baseDP);
  });
});
