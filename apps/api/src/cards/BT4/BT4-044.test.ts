import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-044.js";

describe("BT4-044 HippoGryphonmon", () => {
  it("gives an opposing Digimon -3000 DP when attacking at 3 or fewer security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-044", as: "hippo" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hippo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 3000);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 3000);
  });

  it("does not reduce DP while its controller has 4 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-044", as: "hippo" }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
      1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hippo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });
});
