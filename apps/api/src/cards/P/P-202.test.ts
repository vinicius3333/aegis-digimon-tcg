import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-202.js";
import "../BT1/BT1-076.js";
import "../EX9/EX9-001.js";
import "../EX8/EX8-065.js";
import "../EX9/EX9-070.js";
import "../BT22/BT22-038.js";
import type { CardSpec, EngineSetup } from "../../engine/testkit/harness.js";

describe("P-202 Tyrannomon", () => {
  it("requires a level 3 DM Digimon and has Training", () => {
    const card = runtimeCompiledCard("P-202")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]);
    expect(card.effects.find((effect) => !effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Training", raw: "＜Training＞" }],
    });
  });

  it("reduces one suspended own digivolution by 1 for Tyrannomon, Dinosaur, or Ver.1 targets", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", suspended: true, kind: ["Digimon"] },
          into: {
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur", "Ver.1"], match: "trait" },
            ],
          },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("preserves inherited Piercing", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    });
  });

  it("exposes Training on the live Tyrannomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-202", as: "tyranno" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tyranno"), "Training")).toBe(true);
  });

  it("carries inherited Piercing into a real battle from a legal Green stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-076", as: "host", under: [{ card: "P-202", as: "source" }] }],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }],
          deck: Array(20).fill("BT1-009"),
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("discounts the first suspended evolution, charges full cost after de-digivolve, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-016", as: "evolver1" },
            { card: "BT1-016", as: "evolver2" },
            { card: "BT1-016", as: "evolver3" },
          ],
          battleArea: [
            { card: "P-202", as: "tyranno" },
            { card: "BT1-009", suspended: true, as: "base" },
          ],
          deck: Array(20).fill("BT1-009"),
        },
        1: { hand: ["BT1-009"], deck: Array(20).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const basePermanentId = s.perm("base").permanentId;
    const baseInstanceId = s.inst("base").instanceId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([basePermanentId]);
    const tyrannoPermanentId = s.perm("tyranno").permanentId;
    const tyrannoInstanceId = s.perm("tyranno").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("evolver1").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolver1").instanceId);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 9, reason: "digivolve" });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("tyranno").permanentId).toBe(tyrannoPermanentId);
    expect(s.perm("tyranno").topCard.instanceId).toBe(tyrannoInstanceId);

    await (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, n: number) => Promise<void> } }
    ).primitives.deDigivolve(basePermanentId, 1);
    await settle(() => s.perm("base").topCard.instanceId === baseInstanceId);
    await advance(s.engine).verb.suspend([basePermanentId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("evolver2").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolver2").instanceId);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 9, to: 7, reason: "digivolve" });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("tyranno").permanentId).toBe(tyrannoPermanentId);
    expect(s.perm("tyranno").topCard.instanceId).toBe(tyrannoInstanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    await (
      s.engine as unknown as { primitives: { deDigivolve: (id: string, n: number) => Promise<void> } }
    ).primitives.deDigivolve(basePermanentId, 1);
    await settle(() => s.perm("base").topCard.instanceId === baseInstanceId);
    await advance(s.engine).verb.suspend([basePermanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("evolver3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolver3").instanceId);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 3, to: 2, reason: "digivolve" });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").permanentId).toBe(basePermanentId);
    expect(s.perm("tyranno").permanentId).toBe(tyrannoPermanentId);
    expect(s.perm("tyranno").topCard.instanceId).toBe(tyrannoInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-202 Tyrannomon — KB Q&A rulings", () => {
  const deck = Array(20).fill("BT1-009");

  async function attackAndDigivolve(options: { under?: CardSpec[]; tamer?: string; evolution: string }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-202", as: "tyranno", under: options.under ?? [] },
            ...(options.tamer === undefined ? [] : [{ card: options.tamer, as: "tamer" }]),
          ],
          hand: [{ card: options.evolution, as: "evolution" }],
          deck,
        },
        1: { deck, security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tyranno").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("tyranno").topCard.instanceId === s.inst("evolution").instanceId &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    const finish = async () => {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, spent: memoryBefore - s.state.memory, finish };
  }

  it("stacks with Koromon's inherited digivolution for a total reduction of 2 (Q5193)", async () => {
    const { spent, finish } = await attackAndDigivolve({
      under: ["EX9-001", { card: "BT1-010", faceUp: false }],
      evolution: "EX9-011",
    });
    expect(spent).toBe(1);
    await finish();
  });

  it("stacks with Ryutaro Williams's digivolution for a total reduction of 2 (Q5194)", async () => {
    const { s, spent, finish } = await attackAndDigivolve({ tamer: "EX8-065", evolution: "BT11-055" });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(spent).toBe(2);
    await finish();
  });

  async function digivolveSuspended(
    setup: (s: EngineSetup) => Promise<void>,
    board: { battleArea: { card: string; as: string; suspended?: boolean; under?: CardSpec[] }[]; hand: CardSpec[] },
  ) {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { ...board, deck } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        autoChooseOption: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(...board.hand.map((_card, index) => s.state.players[0]!.hand[index]!.instanceId));
    await setup(s);
    await settle(
      () =>
        s.perm("tyranno").topCard.instanceId === s.inst("evolution").instanceId &&
        s.state.pendingDecision === undefined,
    );
    return { s, spent: 10 - s.state.memory };
  }

  it("stacks with Meat's Delay digivolution for a total reduction of 3 (Q5195)", async () => {
    const { s, spent } = await digivolveSuspended(
      async (setup) => {
        const effect = observe(setup.engine)
          .activatableEffects(setup.perm("meat"))
          .find((entry) => /Delay/i.test(entry.description ?? ""))!;
        expect(effect).toBeDefined();
        expect(
          setup.engine.applyIntent(0, {
            type: "activateEffect",
            sourceInstanceId: setup.perm("meat").topCard.instanceId,
            effectKey: effect.effectKey,
          }),
        ).toEqual({ ok: true });
      },
      {
        battleArea: [
          { card: "EX9-070", as: "meat" },
          { card: "P-202", as: "tyranno", suspended: true },
        ],
        hand: [
          { card: "BT1-010", as: "faceDown" },
          { card: "EX9-041", as: "evolution" },
        ],
      },
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("faceDown").instanceId);
    expect(spent).toBe(1);
  });

  it("stacks with Monzaemon's face-down reduction for a total reduction of 2 (Q5196)", async () => {
    const { spent } = await digivolveSuspended(
      async (setup) => {
        expect(
          setup.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: setup.perm("tyranno").permanentId,
            instanceId: setup.inst("evolution").instanceId,
            useAlternateCost: true,
            alternateRequirementIndex: 1,
          }),
        ).toEqual({ ok: true });
      },
      {
        battleArea: [{ card: "P-202", as: "tyranno", suspended: true, under: [{ card: "BT1-010", faceUp: false }] }],
        hand: [{ card: "BT22-038", as: "evolution" }],
      },
    );
    expect(spent).toBe(2);
  });
});
