import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-013.js";

describe("BT2-013 Growlmon", () => {
  it("deletes exactly 1 opposing Digimon at the 2000 DP boundary when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "attacker", under: ["BT1-009", "BT2-013"] }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 2000 },
            { card: "BT1-011", as: "other", dp: 2000 },
          ],
          security: ["BT1-012"],
        },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-010")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("other").permanentId);
  });

  it("does not delete an opposing 3000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "attacker", under: ["BT1-009", "BT2-013"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }], security: ["BT1-011"] },
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
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("allows the attack to resolve when there is no deletion target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "attacker", under: ["BT1-009", "BT2-013"] }],
        },
        1: { security: ["BT1-011"] },
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
    await settle(() => s.state.players[1]!.security.length === 0);
    assertNoLoudGap(s);
  });
});
