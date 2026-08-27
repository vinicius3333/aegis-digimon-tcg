import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-003.js";

describe("BT6-003 Bibimon", () => {
  it("gains 1 memory when attacking with exactly 3 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-034", under: ["BT6-003"], as: "host" }], security: 3 },
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
});
