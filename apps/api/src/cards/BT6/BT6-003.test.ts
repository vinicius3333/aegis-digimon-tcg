import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-003.js";

describe("BT6-003 Bibimon", () => {
  it("gains 1 memory when attacking with exactly 3 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-033", under: ["BT6-003"], as: "host" }], security: 3 },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when security is above or below exactly three", async () => {
    for (const securityCount of [2, 4]) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT6-033", under: ["BT6-003"], as: "host" }], security: securityCount },
        1: { security: ["BT1-010"] },
      });
      s.state.memory = 0;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.memory).toBe(0);
    }
  });
});
