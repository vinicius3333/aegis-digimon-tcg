import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-055.js";
describe("BT4-055 Leomon", () => {
  it("suspends an opposing 3000 DP or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT4-055", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-025", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon with more than 3000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT4-055", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-025", dp: 4000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-055", 5000);

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
