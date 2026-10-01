import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-045.js";
import "./BT3-011.js";
import "./BT3-019.js";

describe("BT3-011 Greymon", () => {
  it("is played without cost after its security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-011", as: "securityGreymon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGreymon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);

    const checkIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-011",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    expect(playIndex).toBeGreaterThan(checkIndex);
  });

  it("is still played after winning its Security Digimon battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-011", as: "securityGreymon" }] },
      1: { battleArea: [{ card: "BT1-057", dp: 3000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGreymon").instanceId;

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

describe("BT3-011 Greymon — KB Q&A rulings", () => {
  it("is a normal Digimon once played, so Security Digimon DP boosts stop applying to it (Q1051)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-045", as: "maycrackmon" }],
        security: [{ card: "BT3-011", as: "securityGreymon" }],
      },
      1: { battleArea: [{ card: "BT1-057", dp: 6000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const instanceId = s.inst("securityGreymon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);
    await settle(() => !observe(s.engine).isAttacking());

    // As a Security Digimon it battled at 4000 + 4000 DP and beat the 6000 DP attacker.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === instanceId)!;
    expect(played.controllerSeat).toBe(0);
    expect(played.currentDP).toBe(4000);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("is played at the end of the battle even when it loses to the attacker (Q1052)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-011", as: "securityGreymon" }] },
      1: { battleArea: [{ card: "BT1-057", dp: 7000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGreymon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("attacker").topCard.cardId).toBe("BT1-057");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(false);
  });

  it("is played after its battle and before the attacker's next security check (Q1053)", async () => {
    let greymonInPlayAtSecondCheck: boolean | undefined;
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT3-011", as: "securityGreymon" },
            { card: "BT1-009", as: "secondSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT3-019", as: "attacker" }] },
      },
      {
        onEvent(event: ServerEvent) {
          if (event.kind === "securityChecked" && event.revealedCardId === "BT1-009") {
            greymonInPlayAtSecondCheck = s.state.players[0]!.battleArea.some(
              (p) => p.topCard.instanceId === s.inst("securityGreymon").instanceId,
            );
          }
        },
      },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const instanceId = s.inst("securityGreymon").instanceId;
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    const greymonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-011",
    );
    const greymonPlayed = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    const secondCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009",
    );
    expect(greymonCheck).toBeGreaterThanOrEqual(0);
    expect(secondCheck).toBeGreaterThan(greymonCheck);
    expect(greymonPlayed).toBeGreaterThan(greymonCheck);
    expect(greymonPlayed).toBeLessThan(secondCheck);
    expect(greymonInPlayAtSecondCheck).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
