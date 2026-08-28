import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-061.js";

describe("EX2-061 Henry Wong", () => {
  it("may suspend to suspend an opponent when Gargomon or Rapidmon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-027", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("henry").isSuspended && s.perm("target").isSuspended);
    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
