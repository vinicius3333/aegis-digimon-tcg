import { describe, it, expect } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for RB1-033 (Kiyoshiro Higashimitarai, RB1) — [All Turns] When one of your Digimon with
// [Jellymon] in its text or an opponent's level 5+ Digimon attacks, if you have ≤ 7 cards in hand,
// by suspending this Tamer, ＜Draw 1＞.
// source: documented behavior (two rule implementation blocks unified here).
//
// FAILS-WHEN-REVERTED: without the OnAllyAttack handler, the Tamer is never suspended and hand
// size does not increase when a Jellymon-text Digimon attacks.
//
// Test strategy: BT9-086 (Kiyoshiro, the BT9 variant) has "Jellymon" in effectText (per card data).
// We place a "Kiyoshiro Higashimitarai" (BT9-086) Digimon as the attacker — its text contains
// "Jellymon" — and verify that: (a) the RB1-033 Tamer suspends itself, and (b) the owner draws 1.

// RB1-033 Kiyoshiro — Blue Tamer, playCost 3. Used as a placed Tamer on the battle area.
// BT9-021 Jellymon — Blue Lv.3 Digimon with nameEn="Jellymon" → nameEn.includes("Jellymon")==true.
// Opponent Digimon: BT1-020 Groundramon — Lv.5, Red, for the opponent-attack clause.
const RB1033 = "RB1-033";
const JELLYMON_TEXT_DIGIMON = "BT9-021"; // Jellymon Digimon — nameEn includes "Jellymon"
const OPP_LV5 = "BT1-020"; // Red Lv.5

const HAND_FODDER = Array.from({ length: 3 }, () => "BT1-009");
const DECK_FODDER = Array.from({ length: 5 }, () => "BT1-009");
const OPTS = { autoAcceptOptional: true, autoSelectCards: true };

describe("RB1-033 [All Turns] suspend self + Draw 1 when Jellymon-text own Digimon attacks", () => {
  it("suspends RB1-033 and draws 1 when own Jellymon-text Digimon attacks and hand ≤ 7", async () => {
    const s = setupEngine(
      {
        0: {
          // Place the RB1-033 Tamer (unsuspended) and a Jellymon-text Digimon on seat-0.
          battleArea: [
            { card: RB1033, dp: 0, as: "tamer" },
            { card: JELLYMON_TEXT_DIGIMON, dp: 4000, as: "attacker" },
          ],
          // Owner's hand size: 3 cards (≤ 7 → trigger fires).
          hand: HAND_FODDER,
          // Cards in deck for the draw.
          deck: DECK_FODDER,
        },
        // Opponent must have a security card for the attack target.
        1: { security: [{ card: "BT1-009" }] },
      },
      OPTS,
    );
    const p0 = s.state.players[0]!;
    const attacker = s.perm("attacker");
    const handBefore = p0.hand.length;
    s.state.phase = Phase.Main;
    await s.ready();

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });

    // Settle until hand grows by 1 (draw completes after suspend).
    await settle(() => p0.hand.length > handBefore, 400);

    expect(s.perm("tamer").isSuspended).toBe(true);
    // Hand grew by 1 (Draw 1).
    expect(p0.hand.length).toBe(handBefore + 1);
  });

  it("does NOT suspend when hand size > 7", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RB1033, dp: 0, as: "tamer" },
            { card: JELLYMON_TEXT_DIGIMON, dp: 4000, as: "attacker" },
          ],
          // Hand has 8 cards — gate > 7 → should NOT activate.
          hand: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      OPTS,
    );
    const attacker = s.perm("attacker");
    s.state.phase = Phase.Main;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });

    await settle(() => false, 200);

    expect(s.perm("tamer").isSuspended).toBe(false);
  });
});

describe("RB1-033 [All Turns] suspend self + Draw 1 when opponent's Lv.5+ Digimon attacks", () => {
  it("suspends RB1-033 and draws 1 when an opponent Lv.5 Digimon attacks and hand ≤ 7", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RB1033, dp: 0, as: "tamer" }],
          hand: HAND_FODDER,
          deck: DECK_FODDER,
          security: [{ card: "BT1-009" }],
        },
        // Opponent's Lv.5 Digimon as the attacker.
        1: { battleArea: [{ card: OPP_LV5, dp: 6000, as: "oppAttacker" }] },
      },
      OPTS,
    );
    // Opponent (seat-1) attacks this turn.
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    const p0 = s.state.players[0]!;
    const oppAttacker = s.perm("oppAttacker");
    const handBefore = p0.hand.length;
    await s.ready();

    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: oppAttacker.permanentId,
      target: { kind: "player" },
    });

    await settle(() => p0.hand.length > handBefore, 400);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(p0.hand.length).toBe(handBefore + 1);
  });

  it("fires at the exact 7-card boundary and only once while the Tamer is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RB1033, dp: 0, as: "tamer" }],
          hand: Array.from({ length: 7 }, () => "BT1-009"),
          deck: ["BT1-009", "BT1-009"],
          security: [{ card: "BT1-009" }],
        },
        1: { battleArea: [{ card: OPP_LV5, dp: 6000, as: "oppAttacker" }] },
      },
      OPTS,
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    const p0 = s.state.players[0]!;
    await s.ready();
    const before = p0.hand.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("oppAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended, 400);
    expect(p0.hand.length).toBe(before + 1);
  });

  it("allows declining the optional draw at the exact 7-card boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RB1033, dp: 0, as: "tamer" }],
          hand: Array.from({ length: 7 }, () => "BT1-009"),
          deck: ["BT1-009"],
          security: [{ card: "BT1-009" }],
        },
        1: { battleArea: [{ card: OPP_LV5, dp: 6000, as: "oppAttacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    const p0 = s.state.players[0]!;
    await s.ready();
    const before = p0.hand.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("oppAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 200);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(p0.hand.length).toBe(before);
  });

  it("does not trigger for an opposing level 4 Digimon even with 7 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RB1033, dp: 0, as: "tamer" }],
          hand: Array.from({ length: 7 }, () => "BT1-009"),
          deck: ["BT1-009"],
          security: [{ card: "BT1-009" }],
        },
        1: { battleArea: [{ card: "BT1-014", dp: 4000, as: "oppAttacker" }] },
      },
      OPTS,
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("oppAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 200);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });
});

describe("RB1-033 [Your Turn] unsuspend memory", () => {
  it("gains 1 memory when this Tamer becomes unsuspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: RB1033, as: "tamer", suspended: true }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when the Tamer becomes unsuspended during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: RB1033, as: "tamer", suspended: true }] } });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    expect(s.state.memory).toBe(0);
  });
});

describe("RB1-033 [Security]", () => {
  it("plays itself from Security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: RB1033, as: "securityKiyoshiro" }] }, 1: {} }, OPTS);
    await s.ready();
    const securityCard = s.inst("securityKiyoshiro");
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, securityCard);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId));
    expect(s.state.players[0]!.security.some((c) => c.instanceId === securityCard.instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId)).toBe(true);
  });
});
