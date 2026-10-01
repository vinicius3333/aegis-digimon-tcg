import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-065.js";
import "../BT2/BT2-018.js";
import "../BT4/BT4-045.js";

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

describe("BT3-065 Gururumon — KB Q&A rulings", () => {
  const isOnField = (s: ReturnType<typeof setupEngine>, instanceId: string) =>
    s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId);

  it("is a normal Digimon once played from security, not a Security Digimon (Q1092)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-045", as: "securityBooster" }],
        security: [{ card: "BT3-065", as: "securityGururumon" }],
      },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const instanceId = s.inst("securityGururumon").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => isOnField(s, instanceId), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === instanceId)!;
    expect(played.currentDP).toBe(4000);
  });

  it("is played at the end of the battle even when it loses the battle (Q1093)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-065", as: "securityGururumon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGururumon").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => isOnField(s, instanceId), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(true);
    expect(isOnField(s, instanceId)).toBe(true);
  });

  it("is played after its battle and before the attacker's next security check (Q1094)", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT3-065", as: "securityGururumon" },
          { card: "BT1-010", as: "secondCheck" },
        ],
      },
      1: { battleArea: [{ card: "BT2-018", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGururumon").instanceId;
    const secondCheckId = s.inst("secondCheck").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondCheckId), 5000);

    const gururumonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-065",
    );
    const gururumonPlay = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    const secondCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-010",
    );
    expect(gururumonCheck).toBeGreaterThanOrEqual(0);
    expect(secondCheck).toBeGreaterThan(gururumonCheck);
    expect(gururumonPlay).toBeGreaterThan(gururumonCheck);
    expect(gururumonPlay).toBeLessThan(secondCheck);
    expect(isOnField(s, instanceId)).toBe(true);
  });
});
