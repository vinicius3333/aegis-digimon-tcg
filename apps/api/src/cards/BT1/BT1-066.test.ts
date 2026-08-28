import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-066.js";

describe("BT1-066 Tentomon", () => {
  it("suspends an opposing Digimon with 3000 DP or less when its Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-070", as: "attacker", under: ["BT1-066"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 3000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon with 4000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-070", as: "attacker", under: ["BT1-066"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", dp: 4000 }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not activate from Tentomon as the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-066", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", dp: 3000 }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
