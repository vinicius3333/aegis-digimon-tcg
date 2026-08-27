import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-080.js";

describe("BT3-080 Saberdramon", () => {
  it("grants Retaliation to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-081", dp: 1000, suspended: true, as: "host", under: ["BT3-080"] }],
      },
      1: { battleArea: [{ card: "BT1-057", dp: 5000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });
});
