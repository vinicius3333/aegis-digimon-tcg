import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-024 MetalTyrannomon", () => {
  it("plays for 7 memory as a 10000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-024", as: "metalTyrannomon" }] } });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalTyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 10000, currentDP: 10000 });
  });

  it("digivolves from a red level 4 for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "BT1-024", as: "metalTyrannomon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("metalTyrannomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 10000, currentDP: 10000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
