import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST3/ST3-12.js";
import "../ST9/ST9-13.js";
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

describe("BT3-082 BlackGatomon — KB Q&A rulings", () => {
  const isOnField = (s: ReturnType<typeof setupEngine>, instanceId: string) =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId);

  const attackWithSecurityAttack = async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT3-082", as: "securityBlackGatomon" },
          { card: "BT1-010", as: "securityAgumon" },
        ],
      },
      1: { battleArea: [{ card: "ST9-13", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0, 5000);
    await settle(() => isOnField(s, s.inst("securityBlackGatomon").instanceId), 5000);
    return s;
  };

  it("is a normal Digimon, not a Security Digimon, once played to the battle area (Q1099)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-12", as: "takeru" }],
        security: [{ card: "BT3-082", as: "securityBlackGatomon" }],
      },
      1: { battleArea: [{ card: "BT1-057", as: "attacker", dp: 7000 }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityBlackGatomon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnField(s, instanceId), 5000);

    const check = s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-082");
    expect(check).toMatchObject({ battle: { securityCardDP: 6000 } });

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === instanceId)!;
    expect(played.currentDP).toBe(4000);
  });

  it("is played at the end of the battle even when it loses the battle against the attacker (Q1100)", async () => {
    const s = await attackWithSecurityAttack();

    const check = s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-082");
    expect(check).toMatchObject({ battle: { securityDigimonDeleted: true, attackerDeleted: false } });
    expect(isOnField(s, s.inst("securityBlackGatomon").instanceId)).toBe(true);

    const agumonId = s.inst("securityAgumon").instanceId;
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === agumonId)).toBe(true);
    expect(isOnField(s, agumonId)).toBe(false);
  });

  it("is played after its battle and before the attacker's next security check (Q1101)", async () => {
    const s = await attackWithSecurityAttack();
    const instanceId = s.inst("securityBlackGatomon").instanceId;

    const blackGatomonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-082",
    );
    const blackGatomonPlay = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    const agumonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-010",
    );

    expect(blackGatomonCheck).toBeGreaterThanOrEqual(0);
    expect(agumonCheck).toBeGreaterThanOrEqual(0);
    expect(blackGatomonPlay).toBeGreaterThan(blackGatomonCheck);
    expect(blackGatomonPlay).toBeLessThan(agumonCheck);
  });
});
