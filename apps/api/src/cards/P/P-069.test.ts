import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-069.js";

describe("P-069 Pulsemon", () => {
  it("suspends an opposing Digimon and adds itself to hand after the security battle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "P-069", as: "pulsemon" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "attacker" },
            { card: "BT1-010", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    const pulsemonId = s.inst("pulsemon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === pulsemonId));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === pulsemonId)).toBe(true);
  });

  it("still adds itself to hand when there is no opposing Digimon to suspend", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-069", as: "pulsemon" }] },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const pulsemonId = s.inst("pulsemon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === pulsemonId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === pulsemonId)).toBe(true);
  });
});
