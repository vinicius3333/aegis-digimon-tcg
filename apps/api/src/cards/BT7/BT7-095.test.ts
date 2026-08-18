import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-095.js";

describe("BT7-095 Blue Hawaii Death", () => {
  it("gives the same Digimon +3000 DP and permission to attack a source-less unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-018", as: "attacker" }], hand: [{ card: "BT7-095", as: "option" }] },
      1: { battleArea: [{ card: "BT7-019", as: "bare" }, { card: "BT7-019", under: ["BT7-017"], as: "stacked" }] },
    }, { autoSelectCards: true });
    const startingDp = s.perm("attacker").currentDP;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.perm("attacker").currentDP === startingDp + 3000 &&
      observe(s.engine).canAttackUnsuspended(s.perm("attacker")),
    );
    expect(observe(s.engine).canAttackUnsuspended(s.perm("attacker"))).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("bare").permanentId },
    })).toEqual({ ok: true });
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT7-095", as: "security", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });
});
