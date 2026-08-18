import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-018.js";
import "./P-068.js";

describe("P-068 Herissmon", () => {
  it("gives an opposing Digimon Security Attack -1 for the turn and adds itself to hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "P-068", as: "herissmon" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "attacker" },
            { card: "BT1-010", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    const herissmonId = s.inst("herissmon").instanceId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === herissmonId));
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("reduces the attacking Digimon's remaining security checks immediately", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "P-068", as: "herissmon" },
            { card: "BT1-001", as: "remainingSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT2-018", as: "attacker", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    const herissmonId = s.inst("herissmon").instanceId;
    const remainingId = s.inst("remainingSecurity").instanceId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === herissmonId) &&
      s.state.players[0]!.security.some((card) => card.instanceId === remainingId)
    );
    // The predicate above becomes true while the first check is still resolving.
    // Flush the attack so the final assertion catches a stale opening Strike that
    // would incorrectly consume the second security card afterward.
    await settle(() => false, 200);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([remainingId]);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });
});
