import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-056.js";

describe("BT2-056 Numemon", () => {
  it("plays for 3 memory as a 3000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-056", as: "numemon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("numemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 3000, currentDP: 3000 });
  });

  it("digivolves from a black level 3 for 1 memory and draws 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-052", as: "base" }],
        hand: [{ card: "BT2-056", as: "numemon" }],
        deck: [{ card: "BT2-053", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("numemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("numemon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 3000, currentDP: 3000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("cannot use its black evolution requirement on a red level 3", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redBase" }],
        hand: [{ card: "BT2-056", as: "numemon" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("numemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
