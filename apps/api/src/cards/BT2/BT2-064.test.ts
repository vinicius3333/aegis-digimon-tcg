import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT2-064 HiAndromon", () => {
  it("plays for 10 memory as a 12000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-064", as: "hiAndromon" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiAndromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 12000, currentDP: 12000 });
  });

  it("digivolves from a black level 5 for 2 memory and draws 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-063", as: "base" }],
        hand: [{ card: "BT2-064", as: "hiAndromon" }],
        deck: [{ card: "BT2-053", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hiAndromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hiAndromon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 12000, currentDP: 12000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("cannot use its black evolution requirement on a red level 5", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "redBase" }],
        hand: [{ card: "BT2-064", as: "hiAndromon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("hiAndromon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
