import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST9-13.js";
import "./ST9-10.js";

describe("ST9-10 Snimon", () => {
  it("suspends an opponent Digimon on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST9-10", as: "snimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("plays after losing its security battle and resolves On Play before the next security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-13", as: "attacker" },
            { card: "ST9-02", as: "suspendTarget" },
          ],
        },
        1: {
          security: ["ST9-02", { card: "ST9-10", as: "snimon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const snimonInstanceId = s.inst("snimon").instanceId;
    preferred.push(s.perm("suspendTarget").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === snimonInstanceId) &&
        s.perm("suspendTarget").isSuspended,
      3000,
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === snimonInstanceId)).toBe(true);
    expect(s.perm("suspendTarget").isSuspended).toBe(true);
  });
});

describe("ST9-10 Snimon — KB Q&A rulings", () => {
  async function checkSnimonInSecurity(attackerDP: number) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: attackerDP },
            { card: "ST9-02", as: "suspendTarget" },
          ],
        },
        1: { security: [{ card: "ST9-10", as: "snimon" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("suspendTarget").permanentId);
    const snimonInstanceId = s.inst("snimon").instanceId;
    const attackerPermanentId = s.perm("attacker").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === snimonInstanceId),
      3000,
    );
    const snimonOnField = s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === snimonInstanceId);
    const attackerOnField = s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerPermanentId);
    const securityCheck = s.events.find((event) => event.kind === "securityChecked");
    const battle = securityCheck?.kind === "securityChecked" ? securityCheck.battle : undefined;
    return { s, snimonOnField, attackerOnField, battle };
  }

  it("plays itself at the end of the battle whether it loses or wins the security battle (Q716)", async () => {
    const lost = await checkSnimonInSecurity(9000);
    expect(lost.battle).toMatchObject({ securityDigimonDeleted: true, attackerDeleted: false });
    expect(lost.attackerOnField).toBe(true);
    expect(lost.snimonOnField).toBe(true);

    const won = await checkSnimonInSecurity(3000);
    expect(won.battle).toMatchObject({ securityDigimonDeleted: false, attackerDeleted: true });
    expect(won.attackerOnField).toBe(false);
    expect(won.snimonOnField).toBe(true);
  });

  it("activates its [On Play] effect when its [Security] effect plays it (Q717)", async () => {
    const { s, snimonOnField } = await checkSnimonInSecurity(9000);
    expect(snimonOnField).toBe(true);
    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(
      s.events.some(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "ST9-10" && event.timing === "OnPlay",
      ),
    ).toBe(true);
  });

  it("is played and resolves [On Play] before the attacker's next security check (Q718)", async () => {
    const preferred: string[] = [];
    let boardAtNextCheck: { snimonOnField: boolean; targetSuspended: boolean } | undefined;
    const s: EngineSetup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-13", as: "attacker" },
            { card: "ST9-02", as: "suspendTarget" },
          ],
        },
        1: {
          security: [
            { card: "ST9-10", as: "snimon" },
            { card: "BT1-009", as: "nextCheck" },
          ],
        },
      },
      {
        autoSelectCards: true,
        preferInstanceIds: preferred,
        onEvent(event) {
          if (event.kind !== "securityRevealed" || event.revealedCardId !== "BT1-009") return;
          boardAtNextCheck = {
            snimonOnField: s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST9-10"),
            targetSuspended: s.perm("suspendTarget").isSuspended,
          };
        },
      },
    );
    await s.ready();
    preferred.push(s.perm("suspendTarget").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking(), 3000);

    expect(boardAtNextCheck).toEqual({ snimonOnField: true, targetSuspended: true });

    const snimonBattle = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "ST9-10" && event.resolution === "battle",
    );
    const snimonPlayed = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "ST9-10");
    const snimonOnPlay = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST9-10" && event.timing === "OnPlay",
    );
    const nextReveal = s.events.findIndex(
      (event) => event.kind === "securityRevealed" && event.revealedCardId === "BT1-009",
    );
    expect(snimonBattle).toBeGreaterThanOrEqual(0);
    expect(snimonPlayed).toBeGreaterThan(snimonBattle);
    expect(snimonOnPlay).toBeGreaterThan(snimonPlayed);
    expect(nextReveal).toBeGreaterThan(snimonOnPlay);
  });
});
