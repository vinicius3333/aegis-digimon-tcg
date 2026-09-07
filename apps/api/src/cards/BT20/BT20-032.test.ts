import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-032.js";
import "./index.js";
import "../BT1/BT1-036.js";

describe("BT20-032 Bulkmon", () => {
  it("may take the top security card at three or more, then mandates Recovery +1 at two or fewer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
        optional: true,
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", op: "lte", value: 2 },
      });
      expect(effect?.actions[1]?.optional).not.toBe(true);
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("takes security at three, then immediately recovers from the deck at two", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-032", as: "bulkmon" }],
          security: [{ card: "BT20-010", as: "returnedSecurity" }, "BT20-011", "BT20-012"],
          deck: [{ card: "BT20-013", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bulkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.security.length === 3 &&
        s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId),
    );
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("returnedSecurity").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("can decline the optional security-to-hand action, preserving three security and skipping recovery", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-032", as: "bulkmon" }],
          security: ["BT20-010", "BT20-011", "BT20-012"],
          deck: [{ card: "BT20-013", as: "untouched" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bulkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-032"));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("untouched").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("untouched").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("recovers at two security when the optional threshold is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-032", as: "bulkmon" }],
          security: ["BT20-010", "BT20-011"],
          deck: [{ card: "BT20-013", as: "recovery" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bulkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(4);
  });

  it("inherits one memory gain when its surviving host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-034", as: "host", under: ["BT20-032"] }] },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 6);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("does not react when another allied Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-034", as: "host", under: ["BT20-032"] },
          { card: "BT20-010", as: "otherAttacker" },
        ],
      },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("does not gain memory when the inherited host and opponent are deleted in the same battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-076", dp: 1000, as: "host", under: ["BT20-032"] }] },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(5);
  });

  it("gains inherited memory once per turn, then again after the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-076", dp: 7000, as: "host", under: ["BT20-032"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }, "BT1-010"],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "firstOpponent" },
            { card: "BT20-010", dp: 1000, suspended: true, as: "secondOpponent" },
            { card: "BT20-010", dp: 3000, suspended: true, as: "thirdOpponent" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstId = s.perm("firstOpponent").topCard.instanceId;
    const secondId = s.perm("secondOpponent").topCard.instanceId;
    const thirdId = s.perm("thirdOpponent").topCard.instanceId;
    s.state.memory = 5;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 1 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 2,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstId);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 2 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondId);
    expect(s.state.memory).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("thirdOpponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 3 &&
        !observe(s.engine).isAttacking() &&
        s.perm("thirdOpponent").isSuspended,
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("thirdOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length >= 4 &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(thirdId);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("reaches Bulkmon from a legal Pulsemon stack and rejects an unrelated level-3 base", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-029", as: "pulsemon" }], hand: [{ card: "BT20-032", as: "bulkmon" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("pulsemon").permanentId,
        instanceId: legal.inst("bulkmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("pulsemon").topCard.cardId === "BT20-032");
    expect(legal.perm("pulsemon").stack.map((card) => card.cardId)).toEqual(["BT20-029"]);
    expect(legal.state.memory).toBe(4);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "unrelated" }], hand: [{ card: "BT20-032", as: "bulkmon" }] },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("unrelated").permanentId,
        instanceId: invalid.inst("bulkmon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(invalid.perm("unrelated").topCard.cardId).toBe("BT20-010");
  });

  it("resolves the security clauses when Bulkmon enters by digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-029", as: "pulsemon" }],
          hand: [{ card: "BT20-032", as: "bulkmon" }],
          security: [{ card: "BT20-010", as: "returnedSecurity" }, "BT20-011", "BT20-012"],
          deck: [
            { card: "BT20-014", as: "drawn" },
            { card: "BT20-013", as: "recovery" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("returnedSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("does not recover when removing one of four security cards leaves three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-032", as: "bulkmon" }],
          security: ["BT20-010", "BT20-011", "BT20-012", "BT20-013"],
          deck: [{ card: "BT20-014", as: "untouched" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bulkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("untouched").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });
});
