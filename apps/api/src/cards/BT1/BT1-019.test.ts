import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-019 DarkTyrannomon", () => {
  it("plays for 6 memory as a 6000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-019", as: "darkTyrannomon" }] } });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkTyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
  });

  it("digivolves from a red level 3 for 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT1-019", as: "darkTyrannomon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("darkTyrannomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
