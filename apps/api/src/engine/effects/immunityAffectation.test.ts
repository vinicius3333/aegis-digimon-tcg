import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

/**
 * "Isn't affected by effects" as an AFFECTATION rule, not a targeting rule
 * (Comprehensive Rules §15-15-5-3; KB Q5325 / Q5327 / Q5329 on BT23-059).
 *
 * The three rulings state one model: an unaffectable Digimon is still a legal choice, it is
 * simply never affected; an effect that is already applying to it ends the moment it becomes
 * unaffectable; and an effect granted to it does not trigger while it is unaffectable.
 *
 * Q5329 is proved on a real granted trigger in `cards/EX12/EX12-016.test.ts` (Q6740, the same
 * rule) — `grantedEffectAffectableGate` in `interpreter/actions/subTrigger.ts` is the gate.
 * The two engine-level facts that have no card-level home are proved here.
 */
describe("immunity is an affectation rule, not a targeting rule", () => {
  /** Apply `delta` DP to `permanentId` as SEAT 1's Digimon effect, the way a resolution does. */
  async function opponentDigimonModifyDp(
    s: ReturnType<typeof setupEngine>,
    permanentId: string,
    delta: number,
  ): Promise<void> {
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      await advance(s.engine).verb.modifyDP(permanentId, delta, EffectDuration.UntilEachTurnEnd);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
  }

  it("Q5325: an unaffectable Digimon stays a candidate and is simply not affected", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-011", as: "immune", dp: 6000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    await s.ready();
    const immuneId = s.perm("immune").permanentId;
    await advance(s.engine).verb.restrict(immuneId, "beAffected", EffectDuration.Permanent, {
      fromSourceKind: ["Digimon"],
    });

    // Chosen by an opponent Digimon's effect while immune: the choice is legal, the DP is not.
    await opponentDigimonModifyDp(s, immuneId, -3000);

    expect(s.perm("immune").currentDP).toBe(6000);
  });

  it("Q5327: gaining immunity ends an opponent Digimon effect already applying", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-011", as: "victim", dp: 6000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    await opponentDigimonModifyDp(s, victimId, -3000);
    expect(s.perm("victim").currentDP).toBe(3000);

    await advance(s.engine).verb.restrict(victimId, "beAffected", EffectDuration.Permanent, {
      fromSourceKind: ["Digimon"],
    });

    expect(s.perm("victim").currentDP).toBe(6000);
  });

  it("Q5328: losing that immunity re-applies the effect it was given", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-011", as: "victim", dp: 6000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    // The DP reduction outlasts the immunity, so the turn end that expires the immunity leaves
    // the reduction in place — the exact board Q5328 describes.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      await advance(s.engine).verb.modifyDP(victimId, -3000, EffectDuration.Permanent);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await advance(s.engine).verb.restrict(victimId, "beAffected", EffectDuration.UntilEachTurnEnd, {
      fromSourceKind: ["Digimon"],
    });
    expect(s.perm("victim").currentDP).toBe(6000);

    // The production turn-end sweep drops the immunity.
    await advance(s.engine).runTurn(0);

    expect(observe(s.engine).isRestrictedByEffect(s.perm("victim"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("victim").currentDP).toBe(3000);
  });

  it("keeps affecting a Digimon that is only immune to a different source kind", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-011", as: "victim", dp: 6000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    await advance(s.engine).verb.restrict(victimId, "beAffected", EffectDuration.Permanent, {
      fromSourceKind: ["Option"],
    });

    await opponentDigimonModifyDp(s, victimId, -3000);
    await settle();

    expect(s.perm("victim").currentDP).toBe(3000);
  });
});
