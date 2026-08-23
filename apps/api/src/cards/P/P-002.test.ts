import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-002.js";

describe("P-002 Biyomon", () => {
  it("draws when its host deletes an opposing Digimon in battle and survives", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker", under: ["P-002"], dp: 5000 }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
    });
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
  });

  it("does not draw when its host loses the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker", under: ["P-002"], dp: 1000 }],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 5000 }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
