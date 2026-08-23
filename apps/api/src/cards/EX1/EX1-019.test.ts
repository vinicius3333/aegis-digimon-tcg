import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-019.js";

describe("EX1-019 Paildramon", () => {
  it("unsuspends when digivolving with a Free-trait card in its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-014", as: "base", suspended: true }], hand: [{ card: "EX1-019", as: "evo" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("makes an Imperialdramon host unblockable on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", under: ["EX1-019"] }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("imperialdramon"), "cantBeBlocked")).toBe(true);
  });
});
