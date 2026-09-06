import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-032.js";
import "./index.js";

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
          security: ["BT20-010", "BT20-011", "BT20-012"],
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
      0: { battleArea: [{ card: "BT20-010", dp: 1000, as: "host", under: ["BT20-032"] }] },
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
