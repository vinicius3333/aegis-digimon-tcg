import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-019.js";
describe("BT4-019 VictoryGreymon", () => {
  it("Digi-Bursts 2 to delete an 8000 DP or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT4-019", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT3-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").stack).toHaveLength(0);
  });

  it("does not delete an opposing Digimon with more than 8000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT4-019", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT3-017", dp: 9000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 0, 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });
});
