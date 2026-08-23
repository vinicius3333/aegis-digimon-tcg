import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-027 Armadillomon", () => {
  it("plays for 2 memory as a 4000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-027", as: "armadillomon" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armadillomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 4000, currentDP: 4000 });
  });

  it("digivolves from a blue level 2 for 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-003", as: "base" }],
        hand: [{ card: "BT1-027", as: "armadillomon" }],
        deck: [{ card: "BT1-028", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("armadillomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 4000, currentDP: 4000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-027", as: "armadillomon" }] } });
    s.state.memory = -10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armadillomon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("rejects evolution from a red level 2", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT1-027", as: "armadillomon" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
