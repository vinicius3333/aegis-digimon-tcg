import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-043.js";
describe("BT1-043 SaberLeomon", () => {
  it("trashes up to four digivolution cards from an opposing Digimon when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT1-043", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-020", under: ["BT1-010","BT1-011","BT1-012","BT1-013"], as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
