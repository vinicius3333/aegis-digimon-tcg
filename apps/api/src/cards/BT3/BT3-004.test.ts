import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "./BT3-004.js";

describe("BT3-004 Minomon", () => {
  it("gives its host +1000 DP when it attacks an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-019", as: "host", under: ["BT3-004"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
    });
    const originalDP = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === originalDP + 1000);

    expect(s.perm("host").currentDP).toBe(originalDP + 1000);
  });

  it("Q1047 does not grant +1000 DP when a declared player attack is blocked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-019", as: "host", under: ["BT3-004"] }] },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
    });
    const originalDP = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    expect(s.perm("host").currentDP).toBe(originalDP);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
