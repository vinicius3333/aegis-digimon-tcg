import { getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-082.js";

describe("BT3-082 BlackGatomon", () => {
  it("records the Security source zone on its self-play action", () => {
    expect(getCompiledCard("BT3-082")?.effects[0]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["security"],
      payCost: false,
    });
  });

  it("is played without cost after battling as a security Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-082", as: "securityBlackGatomon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityBlackGatomon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);
  });
});
