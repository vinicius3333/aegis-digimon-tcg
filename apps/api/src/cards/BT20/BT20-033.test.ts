import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-033.js";
import "./index.js";

describe("BT20-033 LoaderLeomon", () => {
  it("restricts one opposing Digimon's When Digivolving activation and lowers its DP on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Restrict", restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" },
          { kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd", target: { sameTarget: true } },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true, target: { isSelf: true } }],
        },
      ],
    });
  });

  it("applies both the timing lock and -3000 DP through the opponent's turn end duration", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-033", as: "loader" }] },
        1: { battleArea: [{ card: "BT20-030", dp: 6000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").currentDP === 3000 &&
        observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"),
    );
    expect(s.state.memory).toBe(4);
  });

  it("binds the restriction and DP reduction to one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-033", as: "loader" }] },
        1: {
          battleArea: [
            { card: "BT20-030", dp: 6000, as: "firstTarget" },
            { card: "BT20-032", dp: 6000, as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("firstTarget").currentDP === 3000);
    expect(s.perm("secondTarget").currentDP).toBe(6000);
    expect(observe(s.engine).isRestricted(s.perm("firstTarget"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("suppresses a restricted target's When Digivolving effect on a public evolution", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-033", as: "loader" }] },
        1: {
          battleArea: [{ card: "BT20-030", dp: 6000, as: "target" }],
          hand: [{ card: "BT20-031", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT20-031");
    await settle();
    expect(s.perm("loader").currentDP).toBe(6000);
  });

  it("suppresses an opponent evolution during the lock, then allows its When Digivolving effect after expiry", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-033", as: "loader" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-030", dp: 6000, as: "firstTarget" },
            { card: "BT20-030", dp: 6000, as: "secondTarget" },
          ],
          hand: [
            { card: "BT20-031", as: "firstEvolution" },
            { card: "BT20-031", as: "secondEvolution" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("firstTarget"), "cannotActivateWhenDigivolving"));
    expect(s.perm("loader").currentDP).toBe(6000);
    preferred.push(s.perm("firstTarget").permanentId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    // The first evolution occurs during the opponent's turn while the restriction is active.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("firstTarget").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").topCard.cardId === "BT20-031");
    expect(s.perm("loader").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponentTurn;

    // End the intervening own turn so the next opponent turn is after the printed duration.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const interveningOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await interveningOwnTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const secondOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("secondTarget").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondTarget").topCard.cardId === "BT20-031");
    expect(s.perm("loader").currentDP).toBe(3000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondOpponentTurn;
  });

  it("redirects an opposing player attack to the inherited host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-036", dp: 12000, as: "host", under: ["BT20-033"] }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("can refuse the inherited redirect, allowing the opponent's player attack to check security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-036", dp: 12000, as: "host", under: ["BT20-033"] }], security: ["BT1-010"] },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("redirects only once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-036", dp: 12000, as: "host", under: ["BT20-033"] }],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, as: "firstAttacker" },
            { card: "BT20-011", dp: 1000, as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-010"));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("resets inherited attack redirection on a later opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-036", dp: 15000, as: "host", under: ["BT20-033"] }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, as: "firstAttacker" },
            { card: "BT20-010", dp: 1000, as: "secondAttacker" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
  });

  it("reaches LoaderLeomon from a legal ACCEL level-4 stack and rejects an unrelated base", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-031", as: "accelBase" }], hand: [{ card: "BT20-033", as: "loader" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("accelBase").permanentId,
        instanceId: legal.inst("loader").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("accelBase").topCard.cardId === "BT20-033");
    expect(legal.perm("accelBase").stack.map((card) => card.cardId)).toEqual(["BT20-031"]);
    expect(legal.state.memory).toBe(2);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "unrelated" }], hand: [{ card: "BT20-033", as: "loader" }] },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("unrelated").permanentId,
        instanceId: invalid.inst("loader").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(invalid.perm("unrelated").topCard.cardId).toBe("BT20-010");
  });
});
