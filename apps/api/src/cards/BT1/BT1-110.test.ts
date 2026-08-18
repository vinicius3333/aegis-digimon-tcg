import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-110.js";

describe("BT1-110 Flower Cannon", () => {
  it("suspends one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-110", as: "option" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("suspends every opposing non-Blocker but leaves Blockers unsuspended from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-110", as: "securityOption", faceUp: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "nonBlocker" },
          { card: "BT1-023", as: "blocker" },
        ],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("nonBlocker").isSuspended).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("does not suspend a Digimon that gained Blocker from another effect (Q981)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-110", as: "securityOption", faceUp: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "grantedBlocker" },
          { card: "BT1-011", as: "ordinary" },
        ],
      },
    });
    advance(s.engine).ledgers.continuous.addKeywordGrant(
      s.perm("grantedBlocker").permanentId,
      "Blocker",
      EffectDuration.Permanent,
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("grantedBlocker").isSuspended).toBe(false);
    expect(s.perm("ordinary").isSuspended).toBe(true);
  });

  it("can use Main on an already suspended opposing Digimon and resolves as a no-op", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-110", as: "option" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const option = s.inst("option");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === option.instanceId));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
