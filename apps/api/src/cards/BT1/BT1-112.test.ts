import { describe, it, expect } from "vitest";
import { EffectDuration, getCardDefinition, getCompiledCard, Phase, type AttackTarget } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-101.js";
import "./BT1-054.js";
import "./BT1-068.js";
import "./BT1-072.js";
import "./BT1-080.js";
import "./BT1-075.js";
import { compiled } from "./BT1-112.js";

describe("BT1-112 Dimension Scissor", () => {
  it("matches official metadata and registers its fully covered IR", () => {
    expect(getCardDefinition("BT1-112")).toMatchObject({
      nameEn: "Dimension Scissor",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      effectText: expect.stringContaining("deletes an opponent's Digimon in battle"),
      securityEffectText: "[Security] Add this card to its owner's hand.",
    });
    expect(compiled).toEqual(getCompiledCard("BT1-112"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("[Security] adds this card to its owner's hand after revealing from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-112", as: "secCard" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    s.state.turnSeat = 1;
    s.state.memory = 0;

    const attacker = s.perm("attacker");
    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    const secCard = s.inst("secCard");
    await settle(() => p0.hand.some((c) => c.instanceId === secCard.instanceId), 600);

    expect(p0.hand.some((c) => c.instanceId === secCard.instanceId)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === secCard.instanceId)).toBe(false);
  });

  it("[Main] installs whenDeletesInBattle sub-trigger that unsuspends the chosen Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-057", dp: 5000, as: "attacker" },
            { card: "BT1-064", dp: 3000 },
          ],
          hand: [{ card: "BT1-112", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 1000, suspended: true, as: "defender" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;

    s.state.memory = 5;

    const option = s.inst("option");
    const playRes = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: option.instanceId,
    });
    expect(playRes).toEqual({ ok: true });

    await settle(() => !p0.hand.some((c) => c.instanceId === option.instanceId), 400);

    s.state.turnSeat = 0;

    const attacker = s.perm("attacker");
    const defender = s.perm("defender");
    const attackRes = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId } satisfies AttackTarget,
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(
      () => !p1.battleArea.some((p) => p.permanentId === defender.permanentId) && !attacker.isSuspended,
      600,
    );

    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(attacker.isSuspended).toBe(false);
  });

  it("keeps the granted watcher through hatch, legal breeding evolutions, and movement to battle", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-007", as: "egg" }],
          hand: [
            { card: "BT1-112", as: "option" },
            { card: "BT1-068", as: "level3" },
            { card: "BT1-072", as: "level4" },
            { card: "BT1-075", as: "level5" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 1000, suspended: true, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT1-007");
    const carrier = s.perm("egg");
    s.state.phase = Phase.Main;
    for (const alias of ["level3", "level4", "level5"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: carrier.permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => carrier.topCard.cardId === s.inst(alias).cardId);
    }
    expect(carrier.stack.map((card) => card.cardId)).toEqual(["BT1-007", "BT1-068", "BT1-072"]);
    expect(carrier.topCard.cardId).toBe("BT1-075");

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: carrier.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === carrier.permanentId));

    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    s.state.memory = 10;
    const actionTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.turnSeat = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-112"));

    const defender = s.perm("defender");
    expect(carrier.isSuspended).toBe(false);
    expect(defender.isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId } satisfies AttackTarget,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === defender.permanentId) && !carrier.isSuspended,
      600,
    );
    expect(carrier.isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await actionTurn;
  });

  it("keeps the granted watcher on the same Digimon through a legal level-5-to-6 evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", dp: 5000, as: "attacker" }, "BT1-064"],
          hand: [
            { card: "BT1-112", as: "option" },
            { card: "BT1-080", as: "evolution" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 1000, suspended: true, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-112"));
    expect(s.state.memory).toBe(2);

    const attacker = s.perm("attacker");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: attacker.permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => attacker.topCard.cardId === "BT1-080");
    expect(s.state.memory).toBe(0);
    expect(attacker.stack.map((card) => card.cardId)).toContain("BT1-075");

    const defender = s.perm("defender");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId } satisfies AttackTarget,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === defender.permanentId) && !attacker.isSuspended,
      600,
    );

    expect(attacker.isSuspended).toBe(false);
  });

  it("Q984 can unsuspend repeatedly after deleting multiple opposing Digimon in separate battles", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "attacker", dp: 5000 }, "BT1-064"],
          hand: [{ card: "BT1-112", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 1000, suspended: true },
            { card: "BT1-009", as: "second", dp: 2000, suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-112"));

    for (const alias of ["first", "second"]) {
      s.state.phase = Phase.Main;
      s.state.turnSeat = 0;
      const defenderId = s.perm(alias).permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId) &&
          !s.perm("attacker").isSuspended &&
          !observe(s.engine).isAttacking(),
      );
    }

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });

  it("Q985 does not unsuspend after surviving a battle with a Security Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "attacker", dp: 5000 }, "BT1-064"],
          hand: [{ card: "BT1-112", as: "option" }],
        },
        1: { security: [{ card: "BT1-010", as: "securityDigimon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-112"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("Q986 unsuspends after surviving and deleting a blocking Digimon in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "attacker", dp: 10000 }, "BT1-064"],
          hand: [{ card: "BT1-112", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-072", as: "blocker", dp: 6000 }],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-112"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("attacker").isSuspended);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });

  it("Q987 does not unsuspend when its effect deletes a different Digimon during the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-054", as: "attacker", dp: 10000 }, "BT1-064"],
          hand: [{ card: "BT1-112", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "effectTarget", dp: 2000 },
            { card: "BT1-016", as: "battleTarget", dp: 5000, suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-112"));
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("battleTarget").permanentId,
      "beDeletedInBattle",
      EffectDuration.Permanent,
    );
    const battleTargetId = s.perm("battleTarget").permanentId;
    const effectTargetId = s.perm("effectTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: battleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === effectTargetId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === battleTargetId)).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("Q1263 does not unsuspend when BT4-101 deletes the attack target before battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "attacker", dp: 10000 }, "BT8-088"],
          hand: [
            { card: "BT1-112", as: "dimensionScissor" },
            { card: "BT4-101", as: "spiralMasquerade" },
          ],
        },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 5000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    for (const alias of ["dimensionScissor", "spiralMasquerade"]) {
      const instanceId = s.inst(alias).instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === instanceId));
    }

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("attacker").isSuspended).toBe(true);
  });
});
