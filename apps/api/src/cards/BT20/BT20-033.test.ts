import { describe, expect, it } from "vitest";
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

  it("redirects an opposing player attack to the inherited host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-036", dp: 12000, as: "host", under: ["BT20-033"] }],
          security: ["BT20-001"],
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
        0: { battleArea: [{ card: "BT20-036", dp: 12000, as: "host", under: ["BT20-033"] }], security: ["BT20-001"] },
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
          security: ["BT20-001", "BT20-002"],
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
