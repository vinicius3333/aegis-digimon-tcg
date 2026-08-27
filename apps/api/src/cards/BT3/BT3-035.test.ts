import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-035.js";

describe("BT3-035 Gatomon", () => {
  it("gives 1 opposing Digimon -1000 DP for the turn when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-038", as: "host", under: ["BT3-032", "BT3-035"] }] },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 1000, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 1000);
  });
});
