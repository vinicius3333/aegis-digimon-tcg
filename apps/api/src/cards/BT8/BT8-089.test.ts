import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-089.js";

describe("BT8-089 Cody Hida", () => {
  it("suspends when a multicolor Digimon attacks to give an opposing Digimon -2000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-089", as: "cody" }, { card: "BT8-015", as: "attacker" }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("cody").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(before - 2000);
  });
});
