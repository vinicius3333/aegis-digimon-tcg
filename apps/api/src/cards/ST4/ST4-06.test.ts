import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST4-06.js";

describe("ST4-06 Togemon", () => {
  it("gives its host +2000 DP when attacking an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-10", under: ["ST4-06"], as: "host" }] },
      1: { battleArea: [{ card: "ST4-03", as: "target", suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 9000);
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("does not activate when the declared target is the opposing player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-10", under: ["ST4-06"], as: "host" }] },
      1: { security: ["ST4-03"] },
    });
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("host").currentDP).toBe(baseDp);
  });
});
