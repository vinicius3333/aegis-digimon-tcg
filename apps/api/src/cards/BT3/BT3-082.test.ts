import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-082.js";

describe("BT3-082 BlackGatomon", () => {
  it("records the delayed exact-card Security play in direct runtime IR", () => {
    expect(runtimeCompiledCard("BT3-082")?.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
        },
      ],
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
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    const checkIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-082",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    expect(playIndex).toBeGreaterThan(checkIndex);
  });

  it("is still played after winning its Security Digimon battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-082", as: "securityBlackGatomon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
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
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
