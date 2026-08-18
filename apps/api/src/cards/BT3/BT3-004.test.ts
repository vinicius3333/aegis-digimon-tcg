import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-004.js";

describe("BT3-004 Minomon", () => {
  it("gives its host +1000 DP when it attacks an opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT3-004"] }] }, 1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] } });
    const originalDP = s.perm("host").currentDP;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === originalDP + 1000);

    expect(s.perm("host").currentDP).toBe(originalDP + 1000);
  });
});
