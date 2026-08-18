import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-066.js";

describe("P-066 Huckmon", () => {
  it("deletes a 4000 DP-or-less Digimon and always adds itself to hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "P-066", as: "huckmon" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "attacker" },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    const huckmonId = s.inst("huckmon").instanceId;
    const victimId = s.perm("victim").permanentId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === huckmonId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === huckmonId)).toBe(true);
  });

  it("draws 1 when nothing is deleted, then still adds itself to hand", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "BT1-001", as: "drawn" }],
        security: [{ card: "P-066", as: "huckmon" }],
      },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const huckmonId = s.inst("huckmon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([huckmonId, drawnId]),
    );
  });
});
