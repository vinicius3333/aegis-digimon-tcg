import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-055.js";
describe("BT9-055 GrandisKuwagamon", () => {
  it("suspends an opposing Digimon when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-083", as: "base" }], hand: [{ card: "BT9-055", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
