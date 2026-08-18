import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-13.js";

describe("ST9-13 GranKuwagamon", () => {
  it("gets +4000 DP when digivolving and has Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-11", as: "base" }], hand: [{ card: "ST9-13", as: "gran" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("gran").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === s.perm("base").baseDP + 4000);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });
});
