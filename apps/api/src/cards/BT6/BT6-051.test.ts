import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-051.js";

describe("BT6-051 Toropiamon", () => {
  it("suspends an opposing 5000 DP Digimon when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-080", under: ["BT6-051"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-010", dp: 5000, as: "target" }], security: ["BT1-010"] },
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
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
