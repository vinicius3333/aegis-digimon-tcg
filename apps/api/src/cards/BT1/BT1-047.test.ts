import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-047 Tinkermon", () => {
  it("plays for 3 memory as a 3000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-047", as: "tinkermon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tinkermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 3000, currentDP: 3000 });
  });

  it("digivolves from a yellow level 2 for 0 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-006", as: "base" }],
        hand: [{ card: "BT1-047", as: "tinkermon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tinkermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("tinkermon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 3000, currentDP: 3000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-047", as: "tinkermon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tinkermon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("rejects evolution from a red level 2", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT1-047", as: "tinkermon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tinkermon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
