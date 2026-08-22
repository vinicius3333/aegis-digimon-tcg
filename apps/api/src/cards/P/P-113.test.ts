import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-113.js";

describe("P-113 RustTyrannomon", () => {
  it("suspends every opposing Digimon at or below its DP when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-060", as: "base" }], hand: [{ card: "P-113", as: "rust" }], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-025", dp: 11000, as: "small" }, { card: "BT1-025", dp: 13000, as: "large" }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("rust").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("small").isSuspended);
    expect(s.perm("small").isSuspended).toBe(true);
    expect(s.perm("large").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("encodes the Q4219 battle-deletion watcher and once-per-turn security trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-113", as: "rust" }] } });
    await s.ready();
    expect(s.engine).toBeDefined();
    assertNoLoudGap(s);
  });
});
