import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-038.js";

describe("EX2-038 Justimon: Blitz Arm", () => {
  it("may choose the +2000 DP mode when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-035", as: "base" }], hand: [{ card: "EX2-038", as: "evolution" }] } }, { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolution").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 13000);
    expect(s.perm("base").currentDP).toBe(13000);
  });
});
