import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-057.js";
describe("BT3-057 MegaGargomon", () => {
  it("suspends an opponent, prevents it from unsuspending, and gains Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT3-057", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });
});
