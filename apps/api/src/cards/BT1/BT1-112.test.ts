import { describe, it, expect } from "vitest";
import { EffectDuration, getCardDefinition, getCompiledCard, Phase, type AttackTarget } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-101.js";
import "./BT1-054.js";
import "./BT1-072.js";
import { compiled } from "./BT1-112.js";

// A3 for BT1-112 (Dimension Scissor, Green Option).
// [Main] 1 of your Digimon gains: "When this Digimon deletes an opponent's Digimon in
// battle and survives, unsuspend it."
// [Security] Add this card to its owner's hand.
//
// FAILS-WHEN-REVERTED: The hand-written module installs a whenDeletesInBattle sub-trigger
// that unsuspends the chosen Digimon after it wins a battle. The declarative effect has both
// [Main] actions as inert legacy parser fallbacks — the sub-trigger is never installed, so the
// Digimon stays suspended after winning the battle. The test verifies the Digimon is
// unsuspended after battle — this assertion fails with the reverted IR.
//
// Also tests the [Security] add-to-hand (FAILS-WHEN-REVERTED: the IR does implement
// AddToHandSelf, so both tests verify the hand-written module is active).

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
        // Player 1 has an attacker with enough DP to win; player 0 has no battleArea
        // Digimon so the attack goes direct to security.
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    // Switch to player 1's turn to allow them to attack.
    s.state.turnSeat = 1;
    s.state.memory = 0;

    const attacker = s.perm("attacker");
    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    // After security check resolves, BT1-112 should be in player 0's hand.
    const secCard = s.inst("secCard");
    await settle(() => p0.hand.some((c) => c.instanceId === secCard.instanceId), 600);

    expect(p0.hand.some((c) => c.instanceId === secCard.instanceId)).toBe(true);
    // The card should no longer be in security.
    expect(p0.security.some((c) => c.instanceId === secCard.instanceId)).toBe(false);
  });

  it("[Main] installs whenDeletesInBattle sub-trigger that unsuspends the chosen Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          // Player 0 has a Digimon (high DP) that will attack and kill opponent's Digimon.
          battleArea: [
            { card: "BT1-057", dp: 5000, as: "attacker" },
            // §4-21 color-requirement source (Green), added AFTER the attacker so it stays
            // 2nd in candidate order and doesn't steal the "1 of your Digimon" auto-pick
            // (no-bias responder).
            { card: "BT1-064", dp: 3000 },
          ],
          hand: [{ card: "BT1-112", as: "option" }],
        },
        1: {
          // Player 1 has a weaker Digimon, suspended (required to be a legal attack target).
          battleArea: [{ card: "BT1-003", dp: 1000, suspended: true, as: "defender" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;

    // Play BT1-112 Option from hand.
    s.state.memory = 5; // cost is 3 but set memory higher for safety

    const option = s.inst("option");
    const playRes = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: option.instanceId,
    });
    expect(playRes).toEqual({ ok: true });

    // Wait for the [Main] effect to resolve (chooseTargets selects the attacker).
    await settle(() => !p0.hand.some((c) => c.instanceId === option.instanceId), 400);

    // Now attack: player 0's Digimon attacks player 1's Digimon.
    // First suspend the attacker (attacking suspends it).
    // In Aegis, the attack action handles suspension. We need turnSeat=0.
    s.state.turnSeat = 0;

    const attacker = s.perm("attacker");
    const defender = s.perm("defender");
    const attackRes = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId } satisfies AttackTarget,
    });
    expect(attackRes).toEqual({ ok: true });

    // The attacker should win (5000 > 1000), delete the defender, and then be unsuspended.
    await settle(
      () => !p1.battleArea.some((p) => p.permanentId === defender.permanentId) && !attacker.isSuspended,
      600,
    );

    // Defender is deleted.
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    // Attacker was unsuspended by the whenDeletesInBattle trigger (it got suspended by the
    // attack declaration, then the sub-trigger unsuspends it after winning the battle).
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
            { card: "BT1-003", as: "first", dp: 1000, suspended: true },
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
          security: ["BT1-001"],
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
