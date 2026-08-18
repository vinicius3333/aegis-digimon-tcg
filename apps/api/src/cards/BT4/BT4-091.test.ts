import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-091.js";

describe("BT4-091 Chaosmon: Valdur Arm", () => {
  it("applies the -7000 DP effect twice when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-024", as: "base" }], hand: [{ card: "BT4-091", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", dp: 13000 }] } }, { autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains 3 memory when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-091", as: "chaos" }] } });
    s.state.memory = 0;
    await (s.engine as any).primitives.deletePermanent([s.perm("chaos").permanentId], "byEffect");
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });
});
