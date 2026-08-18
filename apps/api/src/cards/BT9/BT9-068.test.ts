import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-068.js";

describe("BT9-068 Gaiomon", () => {
  it("de-digivolves an opponent when it has a black digivolution card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT9-068", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target", under: [{ card: "BT1-001", as: "bottom" }] }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
