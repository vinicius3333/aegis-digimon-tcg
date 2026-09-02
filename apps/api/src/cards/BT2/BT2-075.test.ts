import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-075.js";

describe("BT2-075 Myotismon", () => {
  it("plays for 6 memory as a 7000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-075", as: "myotismon" }] } });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 7000, currentDP: 7000 });
  });

  it("digivolves from a purple level 4 for 2 memory and draws 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-074", as: "base" }],
        hand: [{ card: "BT2-075", as: "myotismon" }],
        deck: [{ card: "BT2-068", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("myotismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("myotismon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 7000, currentDP: 7000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("cannot use its purple evolution requirement on a red level 4", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "redBase" }],
        hand: [{ card: "BT2-075", as: "myotismon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("myotismon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
