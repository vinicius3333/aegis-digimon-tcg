import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-02.js";

describe("ST7-02 Agumon", () => {
  it("gives its host +2000 DP when it declares an attack on a player", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-10", as: "host", under: ["ST7-02"] }] }, 1: { security: ["ST7-01"] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 14000, 5000);
    expect(s.perm("host").currentDP).toBe(14000);
  });
});
