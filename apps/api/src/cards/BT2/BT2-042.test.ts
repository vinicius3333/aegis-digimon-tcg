import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT2-042 Argomon", () => {
  it("plays for 2 memory as a 3000 DP Digimon with no effects", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-042", as: "argomon" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("argomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 3000, currentDP: 3000 });
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });

  it("digivolves from a green level 2 in breeding for 0 memory and draws 1", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT2-004", as: "base" },
        hand: [{ card: "BT2-042", as: "argomon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("argomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("argomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 3000, currentDP: 3000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
