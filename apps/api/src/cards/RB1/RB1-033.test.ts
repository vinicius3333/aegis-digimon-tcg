import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const RB1033 = "RB1-033";
const JELLYMON_TEXT_DIGIMON = "BT9-021";
const OPP_LV5 = "BT1-020";

const HAND_FODDER = Array.from({ length: 3 }, () => "BT1-009");
const DECK_FODDER = Array.from({ length: 5 }, () => "BT1-009");
const OPTS = { autoAcceptOptional: true, autoSelectCards: true };

describe("RB1-033 [All Turns] suspend self + Draw 1 when Jellymon-text own Digimon attacks", () => {
  it("suspends RB1-033 and draws 1 when own Jellymon-text Digimon attacks and hand ≤ 7", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: RB1033, dp: 0, as: "tamer" },
            { card: JELLYMON_TEXT_DIGIMON, dp: 4000, as: "attacker" },
          ],
          hand: HAND_FODDER,
          deck: DECK_FODDER,
        },
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

    await settle(() => p0.hand.length > handBefore, 400);

    expect(s.perm("tamer").isSuspended).toBe(true);
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
        1: { battleArea: [{ card: OPP_LV5, dp: 6000, as: "oppAttacker" }] },
      },
      OPTS,
    );
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
    const s = setupEngine(
      {
        0: { security: [{ card: RB1033, as: "securityKiyoshiro" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      OPTS,
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const securityCard = s.inst("securityKiyoshiro");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId));
    expect(s.state.players[0]!.security.some((c) => c.instanceId === securityCard.instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId)).toBe(true);
  });
});
