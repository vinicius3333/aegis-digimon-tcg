import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-022.js";

describe("BT2-022 Betamon", () => {
  it("plays for 3 memory as a 5000 DP Digimon with no effects", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-022", as: "betamon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("betamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 5000, currentDP: 5000 });
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });

  it("digivolves from a blue level 2 for 1 memory and draws 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-002", as: "base" }],
        hand: [{ card: "BT2-022", as: "betamon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("betamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("betamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 5000, currentDP: 5000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
