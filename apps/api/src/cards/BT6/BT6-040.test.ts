import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-040.js";
import "../BT13/BT13-046.js";

describe("BT6-040 Mistymon", () => {
  it("gives an opposing Digimon -2000 DP when its host removes your security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-046", under: ["BT6-040"], as: "host" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT6-016", as: "target" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("target").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 9000);

    expect(s.perm("target").currentDP).toBe(baseDP - 9000);
  });
});
