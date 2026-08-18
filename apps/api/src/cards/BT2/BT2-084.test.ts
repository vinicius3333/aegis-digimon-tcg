import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-084.js";

describe("BT2-084 Sora Takenouchi", () => {
  it("suspends to give an attacking red Digimon +2000 DP when it attacks a player", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-084", as: "sora" }, { card: "BT1-010", as: "attacker" }] } },
      { autoAcceptOptional: true },
    );
    const originalDP = s.perm("attacker").currentDP;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("sora").isSuspended && s.perm("attacker").currentDP === originalDP + 2000);

    expect(s.perm("attacker").currentDP).toBe(originalDP + 2000);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-084", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
