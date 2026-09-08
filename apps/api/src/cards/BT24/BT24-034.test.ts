import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_034 } from "./BT24-034.js";
import "../index.js";

describe("BT24-034 Aegiomon", () => {
  it("uses the executable top-security-to-hand cost for all three entry timings", () => {
    for (const trigger of ["WhenMoving", "OnPlay", "WhenDigivolving"]) {
      const action = BT24_034.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "CostGatedBlock",
        optional: true,
        cost: { kind: "securityToHand" },
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { excludeSameNameAsOwnTamers: true } },
          },
        ],
      });
    }
  });
  it("keeps Barrier as both normal and inherited keyword", () => {
    expect(BT24_034.effects?.filter((entry) => entry.keywords?.[0]?.keyword === "Barrier")).toHaveLength(2);
  });

  it("uses an exact Elecmon evolution route", () => {
    expect(BT24_034.digivolutionRequirement).toContainEqual({ namesExact: ["Elecmon"], cost: 2, isAlternate: true });
  });

  it("may pay the security cost and decline the Tamer play (Q5613)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-083", as: "tamer" },
          ],
          security: [{ card: "BT1-009", as: "cost" }],
        },
      },
      { autoSelectCards: false },
    );

    s.state.memory = 10;
    await s.ready();
    const costId = s.inst("cost").instanceId;
    const aegiomonId = s.inst("aegiomon").instanceId;
    const tamerId = s.inst("tamer").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: aegiomonId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const payPrompt = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: payPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const playPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([costId, tamerId]));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(aegiomonId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("plays a differently named TS Tamer but excludes an exact duplicate", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-083", as: "existing" },
          ],
          security: [{ card: "BT1-009", as: "cost" }],
          hand: [
            { card: "BT24-083", as: "duplicate" },
            { card: "BT24-085", as: "different" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("different").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("aegiomon"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT24-085");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-083");
  });

  it("resolves the security cost and TS Tamer play through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-083", as: "tamer" },
          ],
          security: [{ card: "BT1-009", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const costInstanceId = s.inst("cost").instanceId;
    const tamerInstanceId = s.inst("tamer").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aegiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([costInstanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(tamerInstanceId);
  });

  it("allows Dan Yuki beside Dan Yuki & Kanan Yuki because the names differ (Q6713)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-085", as: "combined" }],
          security: [{ card: "BT1-009", as: "cost" }],
          hand: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT25-086", as: "dan" },
            { card: "BT25-086", as: "duplicate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    const costId = s.inst("cost").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aegiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("dan").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("dan").instanceId,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("duplicate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(costId);
    expect(s.state.memory).toBe(5);
  });

  it("exposes both printed and inherited Barrier", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-034", as: "aegiomon" },
          { card: "BT1-057", as: "host", under: ["BT24-034"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("aegiomon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("pays security and plays a TS Tamer in the When Moving window", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-034", as: "aegiomon" },
          security: [{ card: "BT1-009", as: "cost" }],
          hand: [{ card: "BT24-083", as: "tamer" }],
          deck: Array.from({ length: 12 }, () => "BT1-091"),
        },
        1: { deck: Array.from({ length: 12 }, () => "BT1-091") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const ownerTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === "Breeding");
    const movingMemory = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("aegiomon").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("aegiomon").instanceId,
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(movingMemory);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tamer").instanceId, s.inst("aegiomon").instanceId]),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it.each([
    ["exact Elecmon", "BT1-028", 0],
    ["level 3 TS", "BT24-009", 1],
  ])("digivolves from %s for cost 2", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-034", as: "aegiomon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("resolves the public When Digivolving security-to-Tamer effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "base" }],
          hand: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-083", as: "tamer" },
          ],
          security: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;
    const costId = s.inst("cost").instanceId;
    const drawId = s.inst("evolutionDraw").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([costId, drawId]));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("tamer").instanceId,
    );
  });

  it("uses the normal blue level-3 evolution route for cost 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "base" }], hand: [{ card: "BT24-034", as: "aegiomon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aegiomon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("rejects a normal evolution from a non-blue level-3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT24-034", as: "aegiomon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("aegiomon").instanceId);
  });

  it("accepts Barrier in a public losing battle by trashing the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon", suspended: true }],
          security: [{ card: "BT1-009", as: "barrierCost" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("aegiomon").permanentId;
    const costId = s.inst("barrierCost").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(costId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses Barrier in a public losing battle and deletes the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon", suspended: true }],
          security: [{ card: "BT1-009", as: "barrierCost" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("aegiomon").permanentId;
    const costId = s.inst("barrierCost").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("aegiomon").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([costId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
