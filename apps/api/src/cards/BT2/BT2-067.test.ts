import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-067.js";

describe("BT2-067 DemiDevimon", () => {
  it("plays for 2 memory as a 3000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-067", as: "demiDevimon" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demiDevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 3000, currentDP: 3000 });
  });

  it("digivolves from a purple level 2 for 0 memory and draws 1", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT2-007", as: "base" },
        hand: [{ card: "BT2-067", as: "demiDevimon" }],
        deck: [{ card: "BT2-068", as: "drawn" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("demiDevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("demiDevimon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 3000, currentDP: 3000, inBreeding: true });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("cannot use its purple evolution requirement on a red level 2", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redBase" },
        hand: [{ card: "BT2-067", as: "demiDevimon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("demiDevimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
