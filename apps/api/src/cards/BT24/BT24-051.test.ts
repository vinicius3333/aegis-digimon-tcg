import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_051 } from "./BT24-051.js";
import "../index.js";

describe("BT24-051 Merukimon", () => {
  it("shares the once-per-turn unsuspend between When Digivolving and When Attacking", () => {
    const effects = BT24_051.effects?.filter(
      (entry) =>
        ["WhenDigivolving", "WhenAttacking"].includes(entry.trigger) && entry.actions?.[0]?.kind === "Unsuspend",
    );
    expect(effects).toHaveLength(2);
    expect(effects?.map((entry) => entry.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
    expect(effects?.every((entry) => entry.frequency === "OncePerTurn")).toBe(true);
  });
  it("makes the buffed Digimon attack an opponent's Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_051.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[2]).toMatchObject({
        kind: "Attack",
        optional: false,
      });
      expect(effect?.actions?.[1]).toMatchObject({ optional: true, abortOnDecline: true });
    }
  });

  it("reduces its play cost by 5 while at least three Digimon exist", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-009", "BT1-010"],
        hand: [{ card: "BT24-051", as: "merukimon" }],
      },
      1: { battleArea: ["BT1-011"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-051"));

    expect(s.state.memory).toBe(3);
  });

  it("pays the full play cost when fewer than three Digimon exist", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-009", "BT1-010"],
          hand: [{ card: "BT24-051", as: "merukimon" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("merukimon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(-2);
  });

  it("naturally plays, buffs, and attacks with the Q5641 sequence", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-051", as: "merukimon" }], deck: ["BT1-013", "BT1-014"] },
        1: {
          security: [{ card: "BT1-009", as: "security" }],
          battleArea: [
            { card: "BT1-009", as: "first", dp: 2000 },
            { card: "BT1-009", as: "second", dp: 2000 },
            { card: "BT1-009", as: "third", dp: 2000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("first").permanentId);
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 2 &&
        s.events.some((event) => event.kind === "securityChecked") &&
        s.events.some((event) => event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("merukimon").currentDP).toBe(17000);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("first").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    expect(s.perm("merukimon").currentDP).toBe(12000);
  });

  it("publicly declines the optional buff and attack while still suspending two opponent card types", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-051", as: "merukimon" }],
          battleArea: [{ card: "BT1-009", as: "ownDigimon", dp: 4000 }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon", dp: 2000 },
            { card: "BT24-083", as: "opponentTamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownDp = s.perm("ownDigimon").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("merukimon").instanceId),
    );
    await settle(() => s.perm("opponentDigimon").isSuspended && s.perm("opponentTamer").isSuspended);

    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(s.perm("ownDigimon").currentDP).toBe(ownDp);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["normal green/blue requirement", "BT1-077", false, 4],
    ["alternate Beastkin/TS requirement", "BT24-050", true, 3],
  ])("uses the %s", async (_label, hostCard, useAlternateCost, expectedCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: hostCard, as: "base" }],
          hand: [{ card: "BT24-051", as: "merukimon" }],
          deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("merukimon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("merukimon").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("merukimon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("rejects the alternate route from a non-Beastkin/non-TS level-5 host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-077", as: "base" }],
        hand: [{ card: "BT24-051", as: "merukimon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("merukimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("merukimon").instanceId);
  });

  it("Q5641: choosing the DP bonus makes that Digimon attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-051", as: "merukimon" }] },
        1: {
          security: ["BT1-009"],
          battleArea: [
            { card: "BT1-009", as: "first", dp: 2000 },
            { card: "BT1-010", as: "second", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("merukimon").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("merukimon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("merukimon").currentDP).toBe(17000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    // Its shared When Attacking unsuspend resolves during this combat, making it
    // eligible again; the defeated opposing Digimon is the durable attack proof.
    expect(s.perm("merukimon").isSuspended).toBe(false);
  });

  it("resets the shared When Attacking unsuspend once per owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-051", as: "merukimon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const securityIds = s.state.players[1]!.security.map((card) => card.instanceId);
    const attack = async (expectedChecks: number) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("merukimon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length >= expectedChecks &&
          !observe(s.engine).isAttacking(),
      );
    };
    await attack(1);
    expect(s.perm("merukimon").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityIds[0]);
    await attack(2);
    expect(s.perm("merukimon").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([securityIds[0], securityIds[1]]),
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await attack(3);
    expect(s.perm("merukimon").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(securityIds));
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("shares the once-per-turn counter from When Digivolving into a later attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-050", as: "base", suspended: true }],
          hand: [{ card: "BT24-051", as: "merukimon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("merukimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("merukimon").instanceId);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants Rush and Piercing to Iliad Digimon only during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-051", as: "merukimon" },
          { card: "BT24-046", as: "iliad" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("iliad"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Rush")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("iliad"), "Rush")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("iliad"))).toBe(false);
  });
});
