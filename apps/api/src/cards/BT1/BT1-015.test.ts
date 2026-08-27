import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-015.js";

describe("BT1-015 Greymon", () => {
  it("gives its Digimon +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-016", as: "host", dp: 5000, under: ["BT1-015"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give its Digimon +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-016", as: "host", dp: 5000, under: ["BT1-015"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("keeps the inherited boost when the host digivolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-016", as: "host", under: [{ card: "BT1-015", as: "greymon" }] }],
        hand: [{ card: "BT1-021", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);
    expect(s.perm("host").currentDP).toBe(9000);
  });
});
