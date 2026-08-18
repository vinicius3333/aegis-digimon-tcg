import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-038.js";

describe("BT9-038 Pegasusmon", () => {
  it("gives an opposing Digimon Security Attack -1 when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-045", as: "base" }], hand: [{ card: "BT9-038", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  });
});
