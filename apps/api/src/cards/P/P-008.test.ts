import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-008.js";

describe("P-008 WereGarurumon", () => {
  it("unsuspends with exact Garurumon and grants inherited Security Attack +1 at 8 cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-008", as: "exact", under: ["BT1-036"] },
          { card: "BT1-044", as: "inheritedHost", under: ["P-008"] },
        ],
        hand: Array.from({ length: 8 }, () => "BT1-001"),
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("inheritedHost"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("exact").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => !s.perm("exact").isSuspended);
    expect(s.perm("exact").isSuspended).toBe(false);
  });

  it("does not unsuspend with Garurumon (X Antibody)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-008", as: "attacker", under: ["BT9-024"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").isSuspended).toBe(true);
  });
});
