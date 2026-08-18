import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-086.js";

describe("BT8-086 Hiro Amanokawa", () => {
  it("suspends when a level 5 or higher Digimon attacks to give one of your Digimon +2000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-086", as: "hiro" }, { card: "BT8-078", as: "attacker" }] },
      1: { security: ["BT8-034"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const before = s.perm("attacker").currentDP;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").currentDP > before);
    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(before + 2000);
  });
});
