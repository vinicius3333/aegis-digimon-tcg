import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-065.js";
import "./BT5-069.js";

describe("BT5-065 Shademon", () => {
  it("plays itself after its security battle", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT5-065", as: "shade" },
          { card: "BT1-009", as: "secondCheck" },
        ],
      },
      1: { battleArea: [{ card: "BT5-069", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const shadeId = s.inst("shade").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shadeId) &&
        s.events.some(
          (event) =>
            event.kind === "securityChecked" && "revealedCardId" in event && event.revealedCardId === "BT5-065",
        ),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shadeId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "BT5-065",
        resolution: "battle",
        battle: { securityDigimonDeleted: true, attackerDeleted: false, attackerDP: 12000, securityCardDP: 5000 },
      }),
    );
    const firstCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT5-065",
    );
    const secondCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009",
    );
    const play = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(shadeId) && event.to === "battleArea",
    );
    expect(secondCheck).toBeGreaterThan(firstCheck);
    expect(play).toBeGreaterThan(-1);
    expect(play).toBeGreaterThan(firstCheck);
    expect(play).toBeLessThan(secondCheck);
  });

  it("has Blocker and can't attack on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-065", as: "shade" }] } });
    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("shade"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("shade"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shade").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("can redirect an opponent's attack as a Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-065", as: "shade" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("shade").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "blocked" }));
    expect(s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT5-065")?.isSuspended).toBe(true);
  });
});

describe("BT5-065 Shademon — KB Q&A rulings", () => {
  function setupSecurityCheck(attacker: string) {
    const s = setupEngine({
      0: {
        security: [{ card: "BT5-065", as: "shade" }, { card: "BT1-009", as: "secondCheck" }, "BT1-010"],
      },
      1: {
        battleArea: [
          { card: attacker, as: "attacker" },
          { card: "BT1-009", as: "laterAttacker" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    return s;
  }

  async function attackPlayer(s: ReturnType<typeof setupSecurityCheck>, alias: string) {
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  }

  function shadePermanent(s: ReturnType<typeof setupSecurityCheck>) {
    const shadeId = s.inst("shade").instanceId;
    return s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shadeId);
  }

  it("is a normal Digimon once played from security, so it stays in play and can block (Q1339)", async () => {
    const s = setupSecurityCheck("BT5-069");
    await attackPlayer(s, "attacker");
    await settle(
      () =>
        shadePermanent(s) !== undefined &&
        s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009"),
    );
    await settle(() => !observe(s.engine).isAttacking());
    await s.engine.recomputeContinuousEffects();

    const shade = shadePermanent(s)!;
    expect(shade).toBeDefined();
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-065")).toBe(false);
    expect(observe(s.engine).hasKeyword(shade, "Blocker")).toBe(true);

    const laterAttackerId = s.perm("laterAttacker").permanentId;
    await attackPlayer(s, "laterAttacker");
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const blockWindow = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(blockWindow).toMatchObject({ eligibleBlockerIds: [shade.permanentId] });
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: shade.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === laterAttackerId));
    expect(shadePermanent(s)).toBeDefined();
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("is played at the end of the battle whether it loses or wins that battle (Q1340)", async () => {
    const lost = setupSecurityCheck("BT5-069");
    await attackPlayer(lost, "attacker");
    await settle(() => shadePermanent(lost) !== undefined);
    expect(lost.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "BT5-065",
        battle: expect.objectContaining({ securityDigimonDeleted: true, attackerDeleted: false }),
      }),
    );
    expect(shadePermanent(lost)).toBeDefined();
    expect(lost.state.memory).toBe(3);

    const won = setupSecurityCheck("BT1-010");
    await attackPlayer(won, "attacker");
    await settle(() => shadePermanent(won) !== undefined);
    expect(won.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "BT5-065",
        battle: expect.objectContaining({ securityDigimonDeleted: false, attackerDeleted: true }),
      }),
    );
    expect(shadePermanent(won)).toBeDefined();
    expect(won.state.memory).toBe(3);
  });

  it("is played after its battle ends and before the attacker's next security check (Q1341)", async () => {
    const s = setupSecurityCheck("BT5-069");
    const shadeId = s.inst("shade").instanceId;
    await attackPlayer(s, "attacker");
    await settle(() =>
      s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009"),
    );

    const indexOf = (predicate: (event: (typeof s.events)[number]) => boolean) => s.events.findIndex(predicate);
    const shadeCheck = indexOf((event) => event.kind === "securityChecked" && event.revealedCardId === "BT5-065");
    const shadePlay = indexOf(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(shadeId) && event.to === "battleArea",
    );
    const nextCheck = indexOf((event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009");
    expect(shadeCheck).toBeGreaterThan(-1);
    expect(shadePlay).toBeGreaterThan(shadeCheck);
    expect(nextCheck).toBeGreaterThan(shadePlay);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });
});
