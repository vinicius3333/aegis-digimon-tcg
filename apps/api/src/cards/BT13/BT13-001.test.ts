import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-001.js";

describe("BT13-001 Pinamon", () => {
  it("deletes an opposing Digimon with exactly 2000 DP when its evolved stack is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "host", dp: 1000, suspended: true, under: ["BT13-001"] }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "attacker", dp: 12000 },
          { card: "BT1-010", as: "effectTarget", dp: 2000 },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("attacker").permanentId,
    ]);
  });

  it("does not delete an opposing Digimon above 2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "host", dp: 1000, suspended: true, under: ["BT13-001"] }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "attacker", dp: 12000 },
          { card: "BT1-010", as: "ineligibleTarget", dp: 3000 },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("ineligibleTarget").permanentId,
      ),
    ).toBe(true);
  });
});
