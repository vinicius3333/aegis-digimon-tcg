import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-065.js";

describe("BT3-065 Gururumon", () => {
  it("is played without cost after battling as a security Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-065", as: "securityGururumon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGururumon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);
    const checkIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-065",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    expect(playIndex).toBeGreaterThan(checkIndex);
  });
});
