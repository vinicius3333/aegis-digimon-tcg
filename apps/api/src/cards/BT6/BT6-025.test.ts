import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-025.js";

describe("BT6-025 Panjyamon", () => {
  it("gains 1 memory when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT6-025"], as: "host" }] },
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
