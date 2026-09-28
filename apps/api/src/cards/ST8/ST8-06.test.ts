import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST8-05.js";
import "./ST8-06.js";
import "./ST8-08.js";
import "./ST8-09.js";

describe("ST8-06 Coredramon", () => {
  it("draws 2 on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST8-06", as: "core" }], deck: ["ST8-01", "ST8-02"] } });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("core").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
  });

  it("waits for the end of the battle instead of playing itself when its [Security] effect activates", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST8-06", as: "core", faceUp: true }], deck: ["ST8-01", "ST8-02"] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("core"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("plays after its security battle, then fires its On Play Draw 2 before the attack ends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST8-09", as: "attacker" }] },
      1: {
        security: [{ card: "ST8-06", as: "core" }],
        deck: ["ST8-01", "ST8-02"],
      },
    });
    await s.ready();
    const coreInstanceId = s.inst("core").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === coreInstanceId) &&
        s.state.players[1]!.hand.length === 2,
      3000,
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === coreInstanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("attacker").permanentId)).toBe(true);
  });
});

describe("ST8-06 Coredramon — KB Q&A rulings", () => {
  const playerAttacks = (s: ReturnType<typeof setupEngine>) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });

  it("is played at the end of the battle even when it loses the security battle (Q699)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST8-09", as: "attacker" }] },
      1: { security: [{ card: "ST8-06", as: "core" }], deck: ["ST8-01", "ST8-02"] },
    });
    await s.ready();
    const coreInstanceId = s.inst("core").instanceId;

    expect(playerAttacks(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0, 3000);

    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "ST8-06",
        resolution: "battle",
        battle: expect.objectContaining({ securityDigimonDeleted: true, attackerDeleted: false }),
      }),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("attacker").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === coreInstanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === coreInstanceId)).toBe(false);

    const control = setupEngine({
      0: { battleArea: [{ card: "ST8-09", as: "attacker" }] },
      1: { security: [{ card: "ST8-05", as: "plain" }] },
    });
    await control.ready();
    expect(playerAttacks(control)).toEqual({ ok: true });
    await settle(() => !observe(control.engine).isAttacking() && control.state.players[1]!.security.length === 0, 3000);
    expect(control.state.players[1]!.battleArea).toHaveLength(0);
    expect(control.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([control.inst("plain").instanceId]);
  });

  it("activates its [On Play] <Draw 2> when played by its [Security] effect (Q700)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST8-09", as: "attacker" }] },
      1: {
        security: [{ card: "ST8-06", as: "core" }],
        deck: [
          { card: "ST8-01", as: "firstDraw" },
          { card: "ST8-02", as: "secondDraw" },
          { card: "ST8-03", as: "undrawn" },
        ],
      },
    });
    await s.ready();

    expect(playerAttacks(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.hand.length === 2, 3000);

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("core").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("firstDraw").instanceId, s.inst("secondDraw").instanceId].sort(),
    );
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("undrawn").instanceId]);
  });

  it("is played and resolves its [On Play] before the attacker's next security check (Q701)", async () => {
    let boardAtSecondReveal: { corePlayed: boolean; defenderHand: number } | undefined;
    const s = setupEngine(
      {
        0: {
          hand: Array(8).fill("ST8-02"),
          battleArea: [{ card: "ST8-09", as: "attacker", under: ["ST8-08"] }],
        },
        1: {
          security: [
            { card: "ST8-06", as: "core" },
            { card: "ST8-05", as: "secondCheck" },
          ],
          deck: ["ST8-01", "ST8-02"],
        },
      },
      {
        onEvent(event) {
          if (event.kind !== "securityRevealed" || event.revealedCardId !== "ST8-05") return;
          const defender = s.state.players[1]!;
          boardAtSecondReveal = {
            corePlayed: defender.battleArea.some((p) => p.topCard.instanceId === s.inst("core").instanceId),
            defenderHand: defender.hand.length,
          };
        },
      },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    expect(playerAttacks(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0, 3000);

    expect(boardAtSecondReveal).toEqual({ corePlayed: true, defenderHand: 2 });
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secondCheck").instanceId]);
  });
});
