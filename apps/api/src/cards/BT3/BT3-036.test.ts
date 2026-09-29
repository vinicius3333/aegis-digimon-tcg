import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-036.js";
import "../BT12/BT12-017.js";
import "../ST3/ST3-12.js";

describe("BT3-036 Ankylomon", () => {
  it("is played without cost after battling as a security Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-036", as: "securityAnkylomon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityAnkylomon").instanceId;

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
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-036",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    expect(playIndex).toBeGreaterThan(checkIndex);
  });

  it("is still played after winning its Security Digimon battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-036", as: "securityAnkylomon" }] },
      1: { battleArea: [{ card: "BT1-057", dp: 3000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityAnkylomon").instanceId;

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

describe("BT3-036 Ankylomon — KB Q&A rulings", () => {
  const isOnBattleArea = (s: ReturnType<typeof setupEngine>, instanceId: string): boolean =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId);

  it("is a normal Digimon once played, so Security Digimon DP boosts no longer apply to it (Q1072)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT3-036", as: "securityAnkylomon" }],
        battleArea: [{ card: "ST3-12", as: "takeru" }],
      },
      1: { battleArea: [{ card: "BT1-057", dp: 7000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityAnkylomon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnBattleArea(s, instanceId), 5000);

    const check = s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-036");
    expect(check).toMatchObject({ resolution: "battle", battle: { securityCardDP: 6000 } });

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === instanceId)!;
    expect(s.state.turnSeat).toBe(1);
    expect(played.currentDP).toBe(4000);
  });

  it("is played at the end of the battle even when it loses the battle (Q1073)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-036", as: "securityAnkylomon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityAnkylomon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnBattleArea(s, instanceId), 5000);

    const check = s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-036");
    expect(check).toMatchObject({
      resolution: "battle",
      battle: { attackerDP: 6000, securityCardDP: 4000, securityDigimonDeleted: true, attackerDeleted: false },
    });
    expect(isOnBattleArea(s, instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-057"]);
  });

  it("is played after its battle and before the attacker's next security check (Q1074)", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT3-036", as: "securityAnkylomon" },
          { card: "BT1-009", as: "secondSecurity" },
        ],
      },
      1: { battleArea: [{ card: "BT12-017", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityAnkylomon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        isOnBattleArea(s, instanceId) &&
        s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009"),
      5000,
    );

    const ankylomonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-036",
    );
    const ankylomonPlay = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    const secondReveal = s.events.findIndex(
      (event) => event.kind === "securityRevealed" && event.revealedCardId === "BT1-009",
    );
    expect(ankylomonCheck).toBeGreaterThanOrEqual(0);
    expect(secondReveal).toBeGreaterThanOrEqual(0);
    expect(ankylomonPlay).toBeGreaterThan(ankylomonCheck);
    expect(ankylomonPlay).toBeLessThan(secondReveal);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
