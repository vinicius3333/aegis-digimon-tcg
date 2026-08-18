import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-042.js";

describe("BT3-042 ClavisAngemon", () => {
  it("gives 1 opposing Digimon -6000 DP for the turn when attacking at 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-042", as: "clavisAngemon" }],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT3-040", as: "target" }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("clavisAngemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 6000, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 6000);
  });
});
