import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-051.js";

describe("BT8-051 Digmon", () => {
  it("gives an opposing suspended Digimon -3000 DP when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-051", as: "digmon" }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target", suspended: true }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("digmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("target").currentDP).toBe(before - 3000);
  });
});
