import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-05.js";

describe("ST3-05 Angemon", () => {
  it("gains 1 memory when its host attacks with at least 4 security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-09", under: ["ST3-05"], as: "host" }], security: 8 }, 1: { security: ["ST3-02"] } });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory with fewer than 4 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST3-09", under: ["ST3-05"], as: "host" }], security: 3 },
      1: { security: ["ST3-02"] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(1);
  });
});
