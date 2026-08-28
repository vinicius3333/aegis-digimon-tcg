import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-032.js";

describe("BT7-032 Pulsemon", () => {
  it("gains 2 memory when attacking with exactly 3 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-034", under: ["BT1-005", "BT7-032"], as: "host" }], security: 3 },
      1: { security: ["BT1-101"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory with 4 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-034", under: ["BT1-005", "BT7-032"], as: "host" }], security: 4 },
      1: { security: ["BT1-101"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.memory).toBe(0);
  });
});
