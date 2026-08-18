import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-066.js";

describe("BT9-066 Alphamon", () => {
  it("places an X Antibody card from trash under itself when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT9-066", as: "evolving" }], trash: [{ card: "BT9-068", as: "source" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target", under: ["BT1-001"] }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some(card => card.instanceId === s.inst("source").instanceId));
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("base").stack.some(card => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});
